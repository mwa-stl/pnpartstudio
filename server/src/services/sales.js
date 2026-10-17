import Announcement from '../models/Announcement.js';

/**
 * Live sale prices.
 *
 * An announcement is "live" when it is published and now falls inside its
 * start/end window (either end may be open). The price a customer pays for a
 * product is the lowest of its regular price, its own sale price, and the
 * price set by any live announcement it belongs to. Everything that shows or
 * charges a price goes through here, so the storefront and checkout can
 * never disagree.
 */

const TTL_MS = 10_000;
let cache = { at: 0, list: null };

export const invalidateSalesCache = () => { cache = { at: 0, list: null }; };

export const liveFilter = (now = new Date()) => ({
  published: true,
  $and: [
    { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
    { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
  ],
});

/** Live announcements, newest first. Cached for a few seconds. */
export async function liveAnnouncements() {
  if (cache.list && Date.now() - cache.at < TTL_MS) return cache.list;
  const list = await Announcement.find(liveFilter()).sort({ createdAt: -1 }).lean();
  cache = { at: Date.now(), list };
  return list;
}

/** productId -> { salePrice, title, slug, endsAt } using the lowest live price per product. */
export async function salePriceMap() {
  const map = new Map();
  for (const a of await liveAnnouncements()) {
    for (const it of a.items || []) {
      const id = String(it.product);
      const cur = map.get(id);
      if (!cur || it.salePrice < cur.salePrice) {
        map.set(id, { salePrice: it.salePrice, title: a.title, slug: a.slug, endsAt: a.endsAt || null });
      }
    }
  }
  return map;
}

/**
 * The unit price for a product given the live sale map. `product` needs
 * price, salePrice and _id. Returns { unit, salePrice, sale } where `salePrice`
 * is what to show as the discounted price (null when not discounted).
 */
export function effectivePrice(product, map) {
  const regular = Number(product.price) || 0;
  const own = typeof product.salePrice === 'number' && product.salePrice >= 0 && product.salePrice < regular ? product.salePrice : null;
  const promo = map.get(String(product._id));
  const promoPrice = promo && promo.salePrice >= 0 && promo.salePrice < regular ? promo.salePrice : null;

  let salePrice = own;
  let sale = null;
  if (promoPrice !== null && (own === null || promoPrice < own)) {
    salePrice = promoPrice;
    sale = { title: promo.title, slug: promo.slug, endsAt: promo.endsAt };
  }
  return { unit: salePrice ?? regular, salePrice, sale };
}

/** Plain objects with live sale prices applied, for public product responses. */
export async function withSalePrices(products) {
  const map = await salePriceMap();
  return products.map((p) => {
    const obj = typeof p.toJSON === 'function' ? p.toJSON() : { ...p };
    const { salePrice, sale } = effectivePrice(obj, map);
    obj.salePrice = salePrice;
    obj.sale = sale;
    return obj;
  });
}
