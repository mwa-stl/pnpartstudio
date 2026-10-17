// src/controllers/product.controller.js (or wherever your controllers are)
import { Product } from '../models/Product.js';
import { withSalePrices, salePriceMap, effectivePrice } from '../services/sales.js';

/**
 * The admin console asks for the catalogue exactly as stored (?raw=1) so that
 * editing a product never writes a temporary sale price into it. Everyone
 * else — the storefront — gets only published products, with any live
 * announcement price already applied.
 */
const wantsRaw = (req) => req.query.raw === '1' && req.user?.role === 'admin';

// Helpers
function slugify(s = '') {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}
function normalizeImages(b = {}) {
  if (Array.isArray(b.images)) return Array.from(new Set(b.images.filter(Boolean).map(String)));
  if (typeof b.images === 'string' && b.images.trim()) return [b.images.trim()];
  if (Array.isArray(b.image)) return Array.from(new Set(b.image.filter(Boolean).map(String)));
  if (typeof b.image === 'string' && b.image.trim()) return [b.image.trim()];
  return [];
}
function toCapitalWords(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\b(\w)/g, (s) => s.toUpperCase());
}

/**
 * The admin form sends a full root-leaf categoryPath (the category tree can
 * now nest arbitrarily deep); category/subcategory/subsubcategory are
 * derived from its first 3 segments so every other consumer of those three
 * fields keeps working unchanged, however deep the chosen path actually
 * goes. Falls back to reading the three fields directly if no categoryPath
 * is present (defensive only nothing in this codebase sends that shape
 * anymore once the admin form is updated).
 */
function deriveCategoryFields(b = {}) {
  if (Array.isArray(b.categoryPath)) {
    const path = b.categoryPath.map((s) => String(s).trim()).filter(Boolean);
    return { category: path[0] || '', subcategory: path[1] || '', subsubcategory: path[2] || '', categoryPath: path };
  }
  return { category: b.category, subcategory: b.subcategory, subsubcategory: b.subsubcategory, categoryPath: undefined };
}

function validate(b = {}) {
  const errors = {};

  // Category/subcategory required categories themselves are admin-managed
  // (see /api/categories), so this only checks presence, not membership.
  if (!b.category || !String(b.category).trim()) errors.category = 'Category is required';
  if (!b.subcategory || !String(b.subcategory).trim()) errors.subcategory = 'Subcategory is required';

  if (!b.title || !String(b.title).trim()) errors.title = 'Title is required';
  const price = Number(b.price);
  if (!b.donated && !b.contactForPrice && (!Number.isFinite(price) || price <= 0)) errors.price = 'Price must be a positive number';
  if (b.salePrice !== undefined && b.salePrice !== null && b.salePrice !== '') {
    const sp = Number(b.salePrice);
    if (!Number.isFinite(sp) || sp < 0) errors.salePrice = 'Sale price must be a non-negative number';
    else if (Number.isFinite(price) && sp > price) errors.salePrice = 'Sale price cannot exceed price';
  }
  return errors;
}

// --- CONTROLLERS ---

export async function listProducts(req, res, next) {
  try {
    if (wantsRaw(req)) {
      const items = await Product.find().sort({ createdAt: -1 });
      return res.json({ items });
    }
    const items = await Product.find({ published: true }).sort({ createdAt: -1 });
    return res.json({ items: await withSalePrices(items) });
  } catch (e) { return next(e); }
}

/**
 * Storefront reads these two so it doesn't have to pull the whole catalogue
 * and split it in the browser. Both are public and only ever return
 * published products.
 *
 * `?limit=` caps the result (default 12, hard ceiling 60).
 * `?featured=true` narrows to featured pieces only.
 */
function readListOptions(req) {
  const rawLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 60) : 12;
  const featuredOnly = String(req.query.featured || '').toLowerCase() === 'true';
  return { limit, featuredOnly };
}

// Products a customer can put straight in the cart.
export async function listPurchasableProducts(req, res, next) {
  try {
    const { limit, featuredOnly } = readListOptions(req);
    const filter = {
      published: true,
      contactForPrice: { $ne: true },
      donated: { $ne: true },
    };
    if (featuredOnly) filter.featured = true;

    const items = await Product.find(filter)
      .sort({ featured: -1, createdAt: -1 })
      .limit(limit);

    return res.json({ items: await withSalePrices(items), count: items.length });
  } catch (e) { return next(e); }
}

// Products quoted individually these start an enquiry, not a checkout.
export async function listEnquiryProducts(req, res, next) {
  try {
    const { limit, featuredOnly } = readListOptions(req);
    const filter = {
      published: true,
      contactForPrice: true,
      donated: { $ne: true },
    };
    if (featuredOnly) filter.featured = true;

    const items = await Product.find(filter)
      .sort({ featured: -1, createdAt: -1 })
      .limit(limit);

    return res.json({ items, count: items.length });
  } catch (e) { return next(e); }
}

export async function getProduct(req, res, next) {
  try {
    const doc = await Product.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (wantsRaw(req)) return res.json(doc);
    if (doc.published === false) return res.status(404).json({ message: 'Not found' });
    const [out] = await withSalePrices([doc]);
    return res.json(out);
  } catch (e) { return next(e); }
}

/**
 * GET /api/products/prices?ids=a,b,c — current price and availability for the
 * given products, live sale prices included. The cart uses it to refresh the
 * prices it saved in the browser, so a sale that has started or ended is
 * reflected before checkout rather than discovered at it.
 */
export async function currentPrices(req, res, next) {
  try {
    const ids = String(req.query.ids || '').split(',').map((x) => x.trim()).filter((x) => /^[a-f0-9]{24}$/i.test(x)).slice(0, 60);
    if (!ids.length) return res.json({ items: {} });
    const [docs, map] = await Promise.all([Product.find({ _id: { $in: ids } }).lean(), salePriceMap()]);
    const items = {};
    for (const d of docs) {
      const { salePrice, sale } = effectivePrice(d, map);
      items[String(d._id)] = { price: d.price, salePrice, sale, inStock: d.inStock !== false && d.published !== false };
    }
    return res.json({ items });
  } catch (e) { return next(e); }
}

export async function createProduct(req, res, next) {
  try {
    const b = req.body || {};
    const cat = deriveCategoryFields(b);
    const errs = validate({ ...b, category: cat.category, subcategory: cat.subcategory });
    if (Object.keys(errs).length) return res.status(400).json({ message: 'Validation failed', details: errs });

    const payload = {
      title: String(b.title).trim(),
      slug: slugify(b.title),
      category: cat.category,
      subcategory: cat.subcategory,
      subsubcategory: cat.subsubcategory || '',
      categoryPath: cat.categoryPath || [],
      price: Number(b.price),
      salePrice:
        b.salePrice !== undefined && b.salePrice !== null && b.salePrice !== ''
          ? Number(b.salePrice)
          : null,
      stock: Number(b.stock || 0),
      images: normalizeImages(b), // array of strings
      description: b.description || '',
      storyBehindArt: b.storyBehindArt || '',
      published: !!b.published,
      dimensions: b.dimensions || '',
      color: toCapitalWords(b.color || ''),
      inStock: typeof b.inStock === 'boolean' ? b.inStock : (Number(b.stock || 0) > 0),
      featured: !!b.featured,
      donated: !!b.donated,
      contactForPrice: !!b.contactForPrice,
    };

    const doc = await Product.create(payload);
    return res.status(201).json(doc);
  } catch (e) { return next(e); }
}

export async function updateProduct(req, res, next) {
  try {
    const b = req.body || {};
    const cat = deriveCategoryFields(b);
    const catProvided = Array.isArray(b.categoryPath) || b.category !== undefined || b.subcategory !== undefined || b.subsubcategory !== undefined;

    const errs = validate({ ...b, title: b.title || 'x', price: b.price ?? 0, category: cat.category, subcategory: cat.subcategory });
    const filtered = Object.fromEntries(
      Object.entries(errs).filter(([k]) => (k === 'category' || k === 'subcategory' ? catProvided : b[k] !== undefined))
    );
    if (Object.keys(filtered).length) return res.status(400).json({ message: 'Validation failed', details: filtered });

    const patch = {
      ...(b.title !== undefined && { title: String(b.title).trim(), slug: slugify(b.title) }),
      ...(catProvided && {
        category: cat.category,
        subcategory: cat.subcategory,
        subsubcategory: cat.subsubcategory || '',
      }),
      ...(Array.isArray(b.categoryPath) && { categoryPath: cat.categoryPath }),
      ...(b.price !== undefined && { price: Number(b.price) }),
      ...(b.salePrice !== undefined && { salePrice: b.salePrice !== null && b.salePrice !== '' ? Number(b.salePrice) : null }),
      ...(b.stock !== undefined && { stock: Number(b.stock || 0) }),
      ...((b.images !== undefined || b.image !== undefined) && { images: normalizeImages(b) }),
      ...(b.description !== undefined && { description: b.description || '' }),
      ...(b.storyBehindArt !== undefined && { storyBehindArt: b.storyBehindArt || '' }),
      ...(b.published !== undefined && { published: !!b.published }),
      ...(b.dimensions !== undefined && { dimensions: b.dimensions || '' }),
      ...(b.color !== undefined && { color: toCapitalWords(b.color || '') }),
      ...(b.inStock !== undefined && { inStock: !!b.inStock }),
      ...(b.featured !== undefined && { featured: !!b.featured }),
      ...(b.donated !== undefined && { donated: !!b.donated }),
      ...(b.contactForPrice !== undefined && { contactForPrice: !!b.contactForPrice }),
    };

    const doc = await Product.findByIdAndUpdate(req.params.id, patch, { returnDocument: 'after', runValidators: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    return res.json(doc);
  } catch (e) { return next(e); }
}

export async function deleteProduct(req, res, next) {
  try {
    const doc = await Product.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    return res.json({ ok: true });
  } catch (e) { return next(e); }
}
