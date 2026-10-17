import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './helpers/harness.js';

/**
 * Bucket housekeeping, against a fake bucket (a Map of path -> metadata) so no
 * Google Cloud access is needed.
 */
let h; let storage; let cleanup;
const files = new Map();
const old = new Date(Date.now() - 3 * 86400e3).toISOString();
const fresh = () => new Date().toISOString();
const put = (path, size = 1000, created = old) => { files.set(path, { size, created }); return storage.publicUrl(path); };
const has = (path) => files.has(path);

before(async () => {
  h = await startHarness();
  storage = await import('../src/services/storage.js');
  cleanup = await import('../src/services/mediaCleanup.js');
  storage._setBucketForTests({
    file: (path) => ({
      delete: async () => {
        if (!files.has(path)) throw Object.assign(new Error('not found'), { code: 404 });
        files.delete(path);
      },
    }),
    getFiles: async () => [[...files].map(([name, m]) => ({ name, metadata: { size: String(m.size), timeCreated: m.created } }))],
  });
});
after(() => h.stop());

test('removing one image from a product deletes just that file', async () => {
  const [a, b, c] = ['a', 'b', 'c'].map((n) => put(`products/2026-10/${n}.webp`));
  const p = await h.models.Product.create({ title: 'P', category: 'Art', subcategory: 'x', price: 10, images: [a, b, c] });
  await h.models.Product.findByIdAndUpdate(p._id, { images: [a, c] });
  assert.ok(!has('products/2026-10/b.webp'));
  assert.ok(has('products/2026-10/a.webp') && has('products/2026-10/c.webp'));
});

test('replacing an image deletes the old file and keeps the new one', async () => {
  const p = await h.models.Product.findOne({ title: 'P' });
  const d = put('products/2026-10/d.webp');
  await h.models.Product.findByIdAndUpdate(p._id, { images: [storage.publicUrl('products/2026-10/a.webp'), d] });
  assert.ok(!has('products/2026-10/c.webp'));
  assert.ok(has('products/2026-10/d.webp'));
});

test('deleting a product deletes all of its files', async () => {
  const p = await h.models.Product.findOne({ title: 'P' });
  await h.models.Product.findByIdAndDelete(p._id);
  assert.ok(!has('products/2026-10/a.webp') && !has('products/2026-10/d.webp'));
});

test('a file shared by two records survives until the last one is gone', async () => {
  const shared = put('hero/2026-10/shared.webp');
  const make = () => h.models.HeroSlider.create({ image: shared, alt: 'a', heading: 'h', ctaLabel: 'c', ctaHref: '/' });
  const [s1, s2] = [await make(), await make()];
  await h.models.HeroSlider.findByIdAndDelete(s1._id);
  assert.ok(has('hero/2026-10/shared.webp'));
  await h.models.HeroSlider.findByIdAndDelete(s2._id);
  assert.ok(!has('hero/2026-10/shared.webp'));
});

test('replacing a slider image removes the old one', async () => {
  const h1 = put('hero/2026-10/h1.webp'); const h2 = put('hero/2026-10/h2.webp');
  const s = await h.models.HeroSlider.create({ image: h1, alt: 'a', heading: 'h', ctaLabel: 'c', ctaHref: '/' });
  await h.models.HeroSlider.findByIdAndUpdate(s._id, { image: h2 });
  assert.ok(!has('hero/2026-10/h1.webp') && has('hero/2026-10/h2.webp'));
});

test('a gallery video takes its poster with it', async () => {
  const v = put('gallery/2026-10/v.mp4'); const vp = put('gallery/posters/2026-10/vp.webp');
  const g = await h.models.GalleryItem.create({ title: 'V', type: 'video', src: v, poster: vp });
  await h.models.GalleryItem.deleteOne({ _id: g._id });
  assert.ok(!has('gallery/2026-10/v.mp4') && !has('gallery/posters/2026-10/vp.webp'));
});

test('testimonial photos and class galleries are cleaned up too', async () => {
  const t1 = put('testimonials/2026-10/t1.webp');
  const t = await h.models.Testimonial.create({ name: 'n', city: 'c', rating: 5, review: 'r', imageUrl: t1 });
  await h.models.Testimonial.findByIdAndDelete(t._id);
  assert.ok(!has('testimonials/2026-10/t1.webp'));

  const c1 = put('classes/2026-10/c1.webp'); const c2 = put('classes/2026-10/c2.webp');
  const cl = await h.models.ClassModel.create({ title: 'Cl', cover: c1, gallery: [c2] });
  await h.models.ClassModel.findByIdAndUpdate(cl._id, { gallery: [] });
  assert.ok(!has('classes/2026-10/c2.webp') && has('classes/2026-10/c1.webp'));
});

test('external image URLs are never touched', async () => {
  const t = await h.models.Testimonial.create({ name: 'n', city: 'c', rating: 5, review: 'r', imageUrl: 'https://api.dicebear.com/9.x/x/svg?seed=a' });
  await assert.doesNotReject(h.models.Testimonial.findByIdAndDelete(t._id));
});

test('the sweep finds only old, unreferenced files and spares the rest', async () => {
  files.clear();
  const keep = put('products/2026-10/keep.webp');
  await h.models.Product.create({ title: 'K', category: 'Art', subcategory: 'x', price: 5, images: [keep] });
  put('products/2026-09/abandoned.webp', 4000);
  put('products/2026-10/in-progress.webp', 4000, fresh());
  put('enquiries/2026-09/ref.webp', 4000);

  const scan = await cleanup.scanStorage();
  assert.equal(scan.totalFiles, 4);
  assert.equal(scan.orphanFiles, 1);
  assert.equal(scan.orphans[0].path, 'products/2026-09/abandoned.webp');

  const res = await cleanup.cleanOrphans();
  assert.deepEqual({ removed: res.removed, freed: res.freedBytes }, { removed: 1, freed: 4000 });
  assert.ok(has('products/2026-10/keep.webp') && has('products/2026-10/in-progress.webp') && has('enquiries/2026-09/ref.webp'));
  assert.ok(!has('products/2026-09/abandoned.webp'));
});
