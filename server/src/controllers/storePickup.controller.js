import StorePickupOrder from '../models/StorePickupOrder.js';
import { priceCart, consumeCoupon, PricingError } from '../services/pricing.js';
import { applyStockForOrder, syncStockForStatus } from '../services/inventory.js';

const clip = (v, max) => String(v ?? '').trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Statuses the admin console offers for a pickup order. */
const PICKUP_STATUSES = ['Pending', 'Fulfilled', 'Cancelled', 'pending', 'fulfilled', 'cancelled'];

export async function createStorePickupOrder(req, res) {
  try {
    const fullName = clip(req.body?.fullName, 120);
    const phone = clip(req.body?.phone, 30);
    const email = clip(req.body?.email, 254).toLowerCase();
    if (!fullName || !phone || !EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, error: 'Name, phone and a valid email are required' });
    }

    // Items and total are priced from the database; pickup has no shipping.
    const { items, totals, couponCode } = await priceCart(req.body?.items, req.body?.couponCode, { shipping: false });

    const order = await StorePickupOrder.create({
      fullName,
      phone,
      email,
      items,
      total: totals.grandTotal,
    });
    if (couponCode) await consumeCoupon(couponCode);
    // Reserved for the customer from the moment they place it; a cancellation gives it back.
    const { taken, short } = await applyStockForOrder({ items });
    const update = { stockTaken: taken };
    if (short.length) update.stockIssue = `Sold out before this order was placed: ${short.join(', ')}`;
    await StorePickupOrder.updateOne({ _id: order._id }, { $set: update });

    res.status(201).json({ success: true, order: { _id: order._id, total: order.total } });
  } catch (e) {
    if (e instanceof PricingError) return res.status(e.status).json({ success: false, error: e.message });
    console.error('Store pickup order failed:', e);
    res.status(500).json({ success: false, error: 'Failed to create store pickup order' });
  }
}

export async function getStorePickupOrders(req, res) {
  try {
    const orders = await StorePickupOrder.find().sort({ createdAt: -1 });
    res.json({ success: true, items: orders });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
}

export async function getStorePickupOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await StorePickupOrder.findById(id);
    if (!order)
      return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
}

/** Admin: the only editable field is the status. */
export async function updateStorePickupOrder(req, res) {
  try {
    const { id } = req.params;
    const status = String(req.body?.status ?? '');
    if (!PICKUP_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const order = await StorePickupOrder.findByIdAndUpdate(id, { $set: { status } }, { returnDocument: 'after' });
    if (!order)
      return res.status(404).json({ success: false, error: 'Order not found' });
    await syncStockForStatus(StorePickupOrder, order._id, order.status);
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update order' });
  }
}

export async function deleteStorePickupOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await StorePickupOrder.findById(id);
    // Deleting an order that was never collected releases its reserved stock; a fulfilled one has left the studio.
    if (order && String(order.status).toLowerCase() !== 'fulfilled') await syncStockForStatus(StorePickupOrder, order._id, 'cancelled');
    await StorePickupOrder.deleteOne({ _id: id });
    if (!order)
      return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, message: 'Order deleted' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to delete order' });
  }
}
