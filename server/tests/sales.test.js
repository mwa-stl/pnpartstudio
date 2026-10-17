import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './helpers/harness.js';

let h; let art; let art2; let hidden; let prints; let annId;
const inHours = (n) => new Date(Date.now() + n * 3600e3).toISOString();
const item = (p, salePrice) => ({ product: String(p._id), salePrice });

before(async () => {
  h = await startHarness();
  const { Product } = h.models;
  hidden = await Product.create({ title: 'Draft', category: 'Art', price: 50, stock: 3, inStock: true, published: false });
  art = await Product.create({ title: 'Festival Art', category: 'Art', price: 100, stock: 5, inStock: true, published: true });
  art2 = await Product.create({ title: 'Other Art', category: 'Art', price: 80, salePrice: 70, stock: 5, inStock: true, published: true });
  prints = await Product.create({ title: 'Print', category: 'Art', price: 20, stock: 10, inStock: true, published: true });
});
after(() => h.stop());

test('only an admin can manage announcements', async () => {
  assert.equal((await h.call('POST', '/api/announcements', { title: 'Nope' })).status, 401);
  assert.equal((await h.call('GET', '/api/announcements')).status, 401);
});

test('invalid announcements are rejected', async () => {
  const post = (body) => h.call('POST', '/api/announcements', body, h.adminHeaders);
  const above = await post({ title: 'X', items: [item(art, 120)] });
  assert.equal(above.status, 400);
  assert.match(JSON.stringify(above.json), /lower/);
  assert.equal((await post({ title: 'X', startsAt: inHours(5), endsAt: inHours(1) })).status, 400);
  assert.equal((await post({ title: '', items: [] })).status, 400);
});

test('status reflects the schedule: live, scheduled, ended, draft', async () => {
  const post = (body) => h.call('POST', '/api/announcements', body, h.adminHeaders);
  const live = await post({
    title: 'Diwali Sale', kind: 'festival', message: 'Diwali offers', badgeText: 'Up to 40% off',
    items: [item(art, 60), item(art2, 50)], endsAt: inHours(24),
  });
  assert.equal(live.status, 201);
  assert.equal(live.json.status, 'live');
  assert.equal(live.json.slug, 'diwali-sale');
  annId = live.json._id;

  assert.equal((await post({ title: 'Future', startsAt: inHours(48), items: [item(prints, 5)] })).json.status, 'scheduled');
  assert.equal((await post({ title: 'Old', startsAt: inHours(-72), endsAt: inHours(-48), items: [item(prints, 5)] })).json.status, 'ended');
  assert.equal((await post({ title: 'Draft Sale', published: false, items: [item(prints, 5)] })).json.status, 'draft');
});

test('the public sees only what is live, with sale prices applied', async () => {
  const active = await h.call('GET', '/api/announcements/active');
  assert.deepEqual(active.json.items.map((a) => a.slug), ['diwali-sale']);
  const products = active.json.items[0].products;
  const festival = products.find((p) => p.title === 'Festival Art');
  assert.equal(festival.salePrice, 60);
  assert.equal(festival.price, 100);
  assert.equal(festival.sale.slug, 'diwali-sale');
  assert.equal(products.find((p) => p.title === 'Other Art').salePrice, 50, 'the lower of its own sale price (70) and the announcement (50)');
});

test('the catalogue hides drafts and shows live prices; admin ?raw=1 sees it as stored', async () => {
  const pub = (await h.call('GET', '/api/products')).json.items;
  assert.ok(!pub.some((p) => p.title === 'Draft'));
  assert.equal(pub.find((p) => p.title === 'Festival Art').salePrice, 60);
  assert.equal(pub.find((p) => p.title === 'Print').salePrice, null, 'scheduled / ended / draft sales change nothing');

  const raw = (await h.call('GET', '/api/products?raw=1', null, h.adminHeaders)).json.items;
  assert.equal(raw.find((p) => p.title === 'Festival Art').salePrice, null);
  assert.ok(raw.some((p) => p.title === 'Draft'));

  const anonymousRaw = (await h.call('GET', '/api/products?raw=1')).json.items;
  assert.equal(anonymousRaw.find((p) => p.title === 'Festival Art').salePrice, 60, '?raw=1 is ignored without an admin token');

  assert.equal((await h.call('GET', `/api/products/${hidden._id}`)).status, 404);
  assert.equal((await h.call('GET', `/api/products/${art._id}`)).json.salePrice, 60);
});

test('the price-refresh endpoint reports live prices for saved carts', async () => {
  const r = await h.call('GET', `/api/products/prices?ids=${art._id},${prints._id}`);
  assert.equal(r.json.items[String(art._id)].salePrice, 60);
  assert.equal(r.json.items[String(prints._id)].salePrice, null);
});

test('checkout charges the sale price, and the regular price once the sale is off', async () => {
  const on = await h.call('POST', '/api/paypal/create-order', {
    items: [{ productId: String(art._id), qty: 1, price: 100 }], customer: h.customer, shippingAddress: h.address,
  });
  assert.equal(on.json.totals.subtotal, 60);
  assert.equal(on.json.totals.grandTotal, 75, '60 + 15 shipping');

  const off = await h.call('PUT', `/api/announcements/${annId}`, { title: 'Diwali Sale', published: false, items: [item(art, 60)] }, h.adminHeaders);
  assert.equal(off.json.status, 'draft');
  assert.equal((await h.call('GET', `/api/products/${art._id}`)).json.salePrice, null, 'reverts at once, not after a cache expires');

  const back = await h.call('POST', '/api/paypal/create-order', {
    items: [{ productId: String(art._id), qty: 1 }], customer: h.customer, shippingAddress: h.address,
  });
  assert.equal(back.json.totals.grandTotal, 100);

  assert.equal((await h.call('DELETE', `/api/announcements/${annId}`, null, h.adminHeaders)).status, 200);
});
