// src/controllers/product.controller.js (or wherever your controllers are)
import { Product, PRODUCT_CONSTANTS } from '../models/Product.js';

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

function validate(b = {}) {
  const errors = {};

  // Category required
  if (!b.category || !PRODUCT_CONSTANTS.MAIN_CATEGORIES.includes(b.category))
    errors.category = 'Invalid category';

  // Subcategory/subsubcategory as needed
  if (b.category === 'All Products') {
    if (!b.subcategory || !PRODUCT_CONSTANTS.ALL_PRODUCTS_SUBCATEGORIES.includes(b.subcategory))
      errors.subcategory = 'Subcategory required for All Products';
  }
  if (b.category === 'Indian Products') {
    if (!b.subcategory || !PRODUCT_CONSTANTS.INDIAN_PRODUCTS_SUBCATEGORIES.includes(b.subcategory))
      errors.subcategory = 'Subcategory required for Indian Products';

    if (b.subcategory === 'Return gifts') {
      if (!b.subsubcategory || !PRODUCT_CONSTANTS.RETURN_GIFTS_SUBCATEGORIES.includes(b.subsubcategory))
        errors.subsubcategory = 'Return gift required';
    }
  }

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
    const items = await Product.find().sort({ createdAt: -1 });
    return res.json({ items });
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

    return res.json({ items, count: items.length });
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
    return res.json(doc);
  } catch (e) { return next(e); }
}

export async function createProduct(req, res, next) {
  try {
    const b = req.body || {};
    const errs = validate(b);
    if (Object.keys(errs).length) return res.status(400).json({ message: 'Validation failed', details: errs });

    const payload = {
      title: String(b.title).trim(),
      slug: slugify(b.title),
      category: b.category,
      subcategory: b.subcategory,
      subsubcategory: b.subsubcategory || '',
      price: Number(b.price),
      salePrice:
        b.salePrice !== undefined && b.salePrice !== null && b.salePrice !== ''
          ? Number(b.salePrice)
          : null,
      stock: Number(b.stock || 0),
      images: normalizeImages(b), // array of strings
      description: b.description || '',
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
    const errs = validate({ ...b, title: b.title || 'x', price: b.price ?? 0 });
    const filtered = Object.fromEntries(Object.entries(errs).filter(([k]) => b[k] !== undefined));
    if (Object.keys(filtered).length) return res.status(400).json({ message: 'Validation failed', details: filtered });

    const patch = {
      ...(b.title !== undefined && { title: String(b.title).trim(), slug: slugify(b.title) }),
      ...(b.category !== undefined && { category: b.category }),
      ...(b.subcategory !== undefined && { subcategory: b.subcategory }),
      ...(b.subsubcategory !== undefined && { subsubcategory: b.subsubcategory }),
      ...(b.price !== undefined && { price: Number(b.price) }),
      ...(b.salePrice !== undefined && { salePrice: b.salePrice !== null && b.salePrice !== '' ? Number(b.salePrice) : null }),
      ...(b.stock !== undefined && { stock: Number(b.stock || 0) }),
      ...((b.images !== undefined || b.image !== undefined) && { images: normalizeImages(b) }),
      ...(b.description !== undefined && { description: b.description || '' }),
      ...(b.published !== undefined && { published: !!b.published }),
      ...(b.dimensions !== undefined && { dimensions: b.dimensions || '' }),
      ...(b.color !== undefined && { color: toCapitalWords(b.color || '') }),
      ...(b.inStock !== undefined && { inStock: !!b.inStock }),
      ...(b.featured !== undefined && { featured: !!b.featured }),
      ...(b.donated !== undefined && { donated: !!b.donated }),
      ...(b.contactForPrice !== undefined && { contactForPrice: !!b.contactForPrice }),
    };

    const doc = await Product.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
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
