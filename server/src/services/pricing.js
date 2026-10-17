import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import Coupon, { normalizeCouponCode } from '../models/Coupon.js';
import { salePriceMap, effectivePrice } from './sales.js';

/**
 * Server-side pricing. The browser only says WHICH products and HOW MANY, and
 * optionally which coupon code; every amount here is read from the database.
 * Nothing a client sends as a price, total, discount or shipping figure is
 * ever used.
 */

const SHIPPING_THRESHOLD = Number(process.env.SHIPPING_FREE_THRESHOLD ?? 100);
const SHIPPING_FEE = Number(process.env.SHIPPING_FEE ?? 15);
const CURRENCY = process.env.CURRENCY || 'USD';
const MAX_LINES = 50;
const MAX_QTY = 99;

const cents = (n) => Math.round(n * 100);
const fromCents = (c) => c / 100;

export class PricingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const coverOf = (product) => (Array.isArray(product.images) ? product.images.find(Boolean) : '') || '';

/** The coupon that applies, or null. Throws PricingError for a code that was supplied but is unusable. */
async function findUsableCoupon(rawCode) {
  const code = normalizeCouponCode(rawCode);
  if (!code) return null;
  const doc = await Coupon.findOne({ code, active: true }).lean();
  if (!doc) throw new PricingError('That coupon code is not valid.');
  if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) throw new PricingError('That coupon code has expired.');
  if (doc.maxUses > 0 && (doc.uses || 0) >= doc.maxUses) throw new PricingError('That coupon code has reached its usage limit.');
  return doc;
}

/**
 * Atomically spends one use of a coupon. Returns false when it ran out in the
 * meantime. Called once payment is confirmed, never before.
 */
export async function consumeCoupon(code) {
  const norm = normalizeCouponCode(code);
  if (!norm) return true;
  const res = await Coupon.findOneAndUpdate(
    {
      code: norm,
      active: true,
      $or: [{ maxUses: 0 }, { $expr: { $lt: ['$uses', '$maxUses'] } }],
    },
    { $inc: { uses: 1 } },
  );
  return Boolean(res);
}

/**
 * @param {Array<{productId: string, qty?: number, quantity?: number}>} lines
 * @param {string} [couponCode]
 * @param {{shipping?: boolean}} [options] shipping: false for store pickup
 * @returns {Promise<{items: object[], totals: object, couponCode: string}>}
 */
export async function priceCart(lines, couponCode = '', { shipping = true } = {}) {
  if (!Array.isArray(lines) || lines.length === 0) throw new PricingError('Your cart is empty.');
  if (lines.length > MAX_LINES) throw new PricingError('Too many items in the cart.');

  // Merge duplicate lines so stock and quantity limits apply to the product.
  const wanted = new Map();
  for (const line of lines) {
    const id = String(line?.productId ?? line?.id ?? '');
    if (!mongoose.isValidObjectId(id)) throw new PricingError('One of the items in your cart is no longer available.');
    const qty = Math.floor(Number(line?.qty ?? line?.quantity ?? 1));
    if (!Number.isFinite(qty) || qty < 1) throw new PricingError('Invalid quantity.');
    wanted.set(id, Math.min((wanted.get(id) || 0) + qty, MAX_QTY));
  }

  const [products, saleMap] = await Promise.all([
    Product.find({ _id: { $in: [...wanted.keys()] } }).lean(),
    salePriceMap(),
  ]);
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items = [];
  let subtotalCents = 0;
  for (const [id, qty] of wanted) {
    const p = byId.get(id);
    if (!p || p.published === false) throw new PricingError('One of the items in your cart is no longer available.');
    if (p.donated || p.contactForPrice) throw new PricingError(`"${p.title}" is available by enquiry only.`);
    if (p.inStock === false) throw new PricingError(`"${p.title}" is out of stock.`);
    if (typeof p.stock === 'number' && p.stock > 0 && qty > p.stock) {
      throw new PricingError(`Only ${p.stock} of "${p.title}" left in stock.`);
    }

    // Regular price, the product's own sale price, or a live announcement price — whichever is lowest.
    const { unit } = effectivePrice(p, saleMap);
    if (!Number.isFinite(unit) || unit <= 0) throw new PricingError(`"${p.title}" cannot be purchased online.`);

    const lineCents = cents(unit) * qty;
    subtotalCents += lineCents;
    items.push({
      productId: id,
      name: p.title,
      qty,
      price: fromCents(cents(unit)),
      total: fromCents(lineCents),
      description: (p.description || '').slice(0, 120),
      image: coverOf(p),
      category: p.category || '',
    });
  }

  const coupon = await findUsableCoupon(couponCode);
  const discountCents = coupon ? Math.round(subtotalCents * (coupon.percent / 100)) : 0;
  const shippingCents = shipping && subtotalCents > 0 && subtotalCents < cents(SHIPPING_THRESHOLD) ? cents(SHIPPING_FEE) : 0;
  const grandCents = Math.max(0, subtotalCents + shippingCents - discountCents);
  if (grandCents <= 0) throw new PricingError('The order total must be greater than zero.');

  return {
    items,
    couponCode: coupon?.code || '',
    totals: {
      subtotal: fromCents(subtotalCents),
      shipping: fromCents(shippingCents),
      tax: 0,
      discount: fromCents(discountCents),
      grandTotal: fromCents(grandCents),
      currency: CURRENCY,
    },
  };
}
