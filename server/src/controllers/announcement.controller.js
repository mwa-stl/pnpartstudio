import mongoose from 'mongoose';
import Announcement, { ANNOUNCEMENT_KINDS } from '../models/Announcement.js';
import { Product } from '../models/Product.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { liveFilter, withSalePrices, invalidateSalesCache } from '../services/sales.js';

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const HEX = /^#[0-9a-f]{6}$/i;

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 60) || 'sale';

async function uniqueSlug(base, ignoreId) {
  let slug = base;
  for (let n = 2; await Announcement.exists({ slug, ...(ignoreId && { _id: { $ne: ignoreId } }) }); n += 1) {
    slug = `${base}-${n}`;
  }
  return slug;
}

const parseDate = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** 'draft' | 'scheduled' | 'live' | 'ended' — what the admin list shows. */
const statusOf = (a, now = new Date()) => {
  if (!a.published) return 'draft';
  if (a.startsAt && new Date(a.startsAt) > now) return 'scheduled';
  if (a.endsAt && new Date(a.endsAt) < now) return 'ended';
  return 'live';
};

/**
 * Validates the editable fields. Every item must be a real product and its
 * special price must be a number above zero and below the regular price —
 * a "sale" price that is not lower would silently do nothing, or worse.
 */
async function readBody(body = {}) {
  const errors = {};
  const title = str(body.title, 120);
  if (!title) errors.title = 'A title is required';

  const kind = ANNOUNCEMENT_KINDS.includes(body.kind) ? body.kind : 'festival';
  const accent = HEX.test(str(body.accent, 7)) ? str(body.accent, 7) : '#E8340C';

  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);
  if (startsAt === undefined) errors.startsAt = 'Invalid start date';
  if (endsAt === undefined) errors.endsAt = 'Invalid end date';
  if (startsAt && endsAt && endsAt <= startsAt) errors.endsAt = 'The end must be after the start';

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const seen = new Set();
  const wanted = [];
  for (const it of rawItems) {
    const id = String(it?.product?._id ?? it?.product ?? it?.productId ?? '');
    if (!mongoose.isValidObjectId(id) || seen.has(id)) continue;
    seen.add(id);
    wanted.push({ id, salePrice: Number(it.salePrice) });
  }
  if (wanted.length > 300) errors.items = 'Too many products (max 300)';

  const products = wanted.length
    ? await Product.find({ _id: { $in: wanted.map((w) => w.id) } }).select('title price').lean()
    : [];
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const items = [];
  const itemErrors = [];
  for (const w of wanted) {
    const p = byId.get(w.id);
    if (!p) { itemErrors.push('A selected product no longer exists'); continue; }
    if (!Number.isFinite(w.salePrice) || w.salePrice <= 0) { itemErrors.push(`"${p.title}": enter a sale price above 0`); continue; }
    if (w.salePrice >= p.price) { itemErrors.push(`"${p.title}": the sale price must be lower than its regular price`); continue; }
    items.push({ product: w.id, salePrice: Math.round(w.salePrice * 100) / 100 });
  }
  if (itemErrors.length) errors.items = itemErrors.slice(0, 5).join('; ');

  const data = {
    title,
    kind,
    message: str(body.message, 200),
    badgeText: str(body.badgeText, 60),
    description: str(body.description, 1500),
    bannerImage: str(body.bannerImage, 600),
    accent,
    ctaLabel: str(body.ctaLabel, 40) || 'Shop the sale',
    navLabel: str(body.navLabel, 20) || 'Sale',
    showInNav: body.showInNav !== false,
    showBar: body.showBar !== false,
    showBanner: body.showBanner !== false,
    published: body.published !== false,
    startsAt: startsAt ?? null,
    endsAt: endsAt ?? null,
    items,
  };
  return { data, errors };
}

/** What the storefront needs for one announcement, with product cards ready to render. */
async function publicShape(a) {
  const ids = (a.items || []).map((i) => i.product);
  const products = ids.length
    ? await Product.find({ _id: { $in: ids }, published: true, donated: { $ne: true }, contactForPrice: { $ne: true } })
    : [];
  const order = new Map(ids.map((id, i) => [String(id), i]));
  products.sort((x, y) => order.get(String(x._id)) - order.get(String(y._id)));
  const priced = await withSalePrices(products);
  return {
    _id: a._id,
    slug: a.slug,
    title: a.title,
    kind: a.kind,
    message: a.message,
    badgeText: a.badgeText,
    description: a.description,
    bannerImage: a.bannerImage,
    accent: a.accent,
    ctaLabel: a.ctaLabel,
    navLabel: a.navLabel,
    showInNav: a.showInNav,
    showBar: a.showBar,
    showBanner: a.showBanner,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    products: priced,
  };
}

/* ── Public ─────────────────────────────────────────────────────────── */

/** GET /api/announcements/active */
export const listActive = asyncHandler(async (_req, res) => {
  const docs = await Announcement.find(liveFilter()).sort({ createdAt: -1 }).lean();
  const items = await Promise.all(docs.map(publicShape));
  res.set('Cache-Control', 'no-cache'); // always revalidate (cheap 304): a sale that ends must vanish at once
  res.json({ items });
});

/** GET /api/announcements/active/:slug */
export const getActiveBySlug = asyncHandler(async (req, res) => {
  const doc = await Announcement.findOne({ slug: str(req.params.slug, 80).toLowerCase(), ...liveFilter() }).lean();
  if (!doc) return res.status(404).json({ message: 'This offer is not running right now.' });
  res.set('Cache-Control', 'no-cache'); // always revalidate (cheap 304): a sale that ends must vanish at once
  res.json(await publicShape(doc));
});

/* ── Admin ──────────────────────────────────────────────────────────── */

const adminShape = (a, productById) => ({
  ...a,
  status: statusOf(a),
  items: (a.items || []).map((i) => {
    const p = productById.get(String(i.product));
    return {
      product: String(i.product),
      salePrice: i.salePrice,
      title: p?.title || '(deleted product)',
      price: p?.price ?? 0,
      image: p?.images?.[0] || '',
    };
  }),
});

async function productLookup(docs) {
  const ids = [...new Set(docs.flatMap((d) => (d.items || []).map((i) => String(i.product))))];
  const products = ids.length ? await Product.find({ _id: { $in: ids } }).select('title price images').lean() : [];
  return new Map(products.map((p) => [String(p._id), p]));
}

/** GET /api/announcements */
export const listAll = asyncHandler(async (_req, res) => {
  const docs = await Announcement.find().sort({ createdAt: -1 }).lean();
  const lookup = await productLookup(docs);
  res.json({ items: docs.map((d) => adminShape(d, lookup)) });
});

/** POST /api/announcements */
export const create = asyncHandler(async (req, res) => {
  const { data, errors } = await readBody(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Please fix the highlighted fields', details: errors });
  const doc = await Announcement.create({ ...data, slug: await uniqueSlug(slugify(data.title)) });
  invalidateSalesCache();
  const lookup = await productLookup([doc]);
  res.status(201).json(adminShape(doc.toObject(), lookup));
});

/** PUT /api/announcements/:id */
export const update = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Not found' });
  const { data, errors } = await readBody(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Please fix the highlighted fields', details: errors });
  // The slug (the public URL) is set once at creation and never changes, so a shared link keeps working after a rename.
  const doc = await Announcement.findByIdAndUpdate(req.params.id, { $set: data }, { returnDocument: 'after', runValidators: true }).lean();
  if (!doc) return res.status(404).json({ message: 'Not found' });
  invalidateSalesCache();
  const lookup = await productLookup([doc]);
  res.json(adminShape(doc, lookup));
});

/** DELETE /api/announcements/:id */
export const remove = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Not found' });
  const doc = await Announcement.findByIdAndDelete(req.params.id).lean();
  if (!doc) return res.status(404).json({ message: 'Not found' });
  invalidateSalesCache();
  res.json({ ok: true });
});
