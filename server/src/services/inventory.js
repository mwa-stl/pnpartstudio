import { Product } from '../models/Product.js';
import Order from '../models/Order.js';
import { consumeCoupon } from './pricing.js';

/**
 * Stock bookkeeping for orders.
 *
 * Stock is taken once an order is paid (or a pickup order is placed) and
 * given back if that order is cancelled, refunded or failed. Only products
 * that track stock (stock > 0) are touched — a stock of 0 with the in-stock
 * flag on means "not counted" in this catalogue. Each order records exactly
 * which lines it took (`stockTaken`) and whether they went back
 * (`stockRestored`), so a return is precise, can never happen twice, and can
 * be undone if the order is reinstated.
 */

/** Statuses that mean the goods are no longer sold. */
const RELEASED = new Set(['cancelled', 'refunded', 'failed']);
export const releasesStock = (status) => RELEASED.has(String(status || '').toLowerCase());

/**
 * Atomically takes each line's quantity off stock. The decrement refuses to
 * go below zero and flips a product to sold out when its last unit goes, so
 * two buyers can never both take the final piece.
 *
 * Returns { taken, short }: the lines actually taken (to be recorded on the
 * order) and the names of lines that could not be covered because someone
 * else bought the last piece first.
 */
export async function applyStockForOrder(order) {
  const taken = [];
  const short = [];
  for (const line of order.items || []) {
    const qty = Math.floor(Number(line.qty) || 0);
    if (!line.productId || qty < 1) continue;

    const res = await Product.updateOne(
      { _id: line.productId, stock: { $gt: 0, $gte: qty } },
      [{
        $set: {
          stock: { $subtract: ['$stock', qty] },
          inStock: { $gt: [{ $subtract: ['$stock', qty] }, 0] },
        },
      }],
      { updatePipeline: true },
    );
    if (res.matchedCount > 0) {
      taken.push({ productId: String(line.productId), qty, name: line.name });
      continue;
    }
    const p = await Product.findById(line.productId).select('stock inStock').lean();
    // Untracked (stock 0, still in stock) is fine; tracked but short is not.
    if (p && (p.stock > 0 || (p.stock === 0 && p.inStock === false))) short.push(line.name);
  }
  return { taken, short };
}

/**
 * Puts back what `Model`'s order took. Safe to call any number of times:
 * the first call claims the order with an atomic flag flip, later calls find
 * it already claimed and do nothing. Returns how many lines went back.
 */
export async function restockOrder(Model, id) {
  const claimed = await Model.findOneAndUpdate(
    { _id: id, stockRestored: { $ne: true }, 'stockTaken.0': { $exists: true } },
    { $set: { stockRestored: true } },
    { returnDocument: 'before' },
  ).lean();
  if (!claimed) return 0;

  for (const line of claimed.stockTaken) {
    await Product.updateOne({ _id: line.productId }, { $inc: { stock: line.qty }, $set: { inStock: true } });
  }
  return claimed.stockTaken.length;
}

/**
 * The reverse: an order that was cancelled and has been reinstated takes its
 * stock again — unless the pieces were sold in the meantime, in which case
 * the order is flagged for a human rather than driving stock negative.
 */
export async function retakeStock(Model, id) {
  const claimed = await Model.findOneAndUpdate(
    { _id: id, stockRestored: true },
    { $set: { stockRestored: false } },
    { returnDocument: 'before' },
  ).lean();
  if (!claimed) return 0;

  const wanted = claimed.stockTaken.map((l) => ({ productId: l.productId, qty: l.qty, name: l.name }));
  const { taken, short } = await applyStockForOrder({ items: wanted });
  const update = { stockTaken: taken };
  if (short.length) update.stockIssue = `Sold out while the order was cancelled: ${short.join(', ')}`;
  await Model.updateOne({ _id: id }, { $set: update });
  return taken.length;
}

/** Call after any status change: gives stock back or takes it again as the new status requires. */
export async function syncStockForStatus(Model, id, status) {
  return releasesStock(status) ? restockOrder(Model, id) : retakeStock(Model, id);
}

/**
 * Everything that must happen exactly once when an order becomes paid: spend
 * the coupon and take the stock. Callers invoke it only after winning the
 * awaiting_payment -> paid transition, so it never runs twice for one order.
 */
export async function onOrderPaid(order) {
  if (order.couponCode) await consumeCoupon(order.couponCode);
  const { taken, short } = await applyStockForOrder(order);
  const update = { stockTaken: taken };
  if (short.length) {
    update.stockIssue = `Sold out while awaiting payment: ${short.join(', ')}`;
    console.warn(`[inventory] ${order.referenceId}: ${update.stockIssue}`);
  }
  await Order.updateOne({ _id: order._id }, { $set: update });
}
