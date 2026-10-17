// controllers/orders.controller.js
import Order from '../models/Order.js';
import { streamInvoicePdf, buildInvoiceDocxBuffer } from '../lib/invoiceDocs.js';
import { syncStockForStatus } from '../services/inventory.js';

/** The shape the admin console (and the invoice generator) expects, out of the raw Order doc. */
function shapeOrder(order) {
  return {
    _id: order._id,
    orderNo: order.referenceId,
    referenceId: order.referenceId,
    customer: {
      name: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(),
      email: order.customer?.email,
      phone: order.shippingAddress?.phone
    },
    customerName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(),
    items: order.items.map(item => ({
      title: item.name,
      name: item.name,
      qty: item.qty,
      price: item.price,
      total: item.total,
      variant: item.variant,
      description: item.description,
      image: item.image,
      category: item.category,
      sku: item.sku,
      brand: item.brand
    })),
    subTotal: order.totals?.subtotal || 0,
    shipping: { amount: order.totals?.shipping || 0 },
    tax: order.totals?.tax || 0,
    total: order.totals?.grandTotal || 0,
    discounts: order.totals?.discount ? [{ amount: order.totals.discount }] : [],
    status: order.status?.toLowerCase() || 'pending',
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    totals: order.totals,
    paymentMethod: order.paymentMethod,
    notes: order.referenceId,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

export async function getOrders(req, res) {
  try {
    const { status } = req.query;
    // Checkouts that were started but never paid are not orders yet.
    const filter = status ? { status: String(status) } : { status: { $ne: 'awaiting_payment' } };
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, items: orders.map(shapeOrder) });
  } catch (e) {
    console.error('Get orders error:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
}

/** GET /api/orders/:id/invoice.pdf — admin only. */
export async function downloadInvoicePdf(req, res) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    streamInvoicePdf(shapeOrder(order), res);
  } catch (e) {
    console.error('Invoice PDF generation failed:', e);
    res.status(500).json({ success: false, error: 'Failed to generate invoice' });
  }
}

/** GET /api/orders/:id/invoice.docx — admin only. */
export async function downloadInvoiceDocx(req, res) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    const buffer = await buildInvoiceDocxBuffer(shapeOrder(order));
    const ref = order.referenceId || String(order._id).slice(-8);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${ref}.docx"`);
    res.send(buffer);
  } catch (e) {
    console.error('Invoice Word generation failed:', e);
    res.status(500).json({ success: false, error: 'Failed to generate invoice' });
  }
}

export async function getOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    let { status } = req.body;

    // Accept human-friendly status (from UI) and convert to backend codes
    const STATUS_MAP = {
      "Placed": "pending",
      "Confirmed": "confirmed",
      "Shipped": "shipped",
      "Out for delivery": "out_for_delivery",
      "Delivered": "delivered",
      "cancelled": "cancelled",
      "refunded": "refunded",
      "failed": "failed",
      // System codes passthrough
      "pending": "pending",
      "confirmed": "confirmed",
      "shipped": "shipped",
      "out_for_delivery": "out_for_delivery",
      "delivered": "delivered"
    };
    status = STATUS_MAP[status] || status;

    const validStatuses = [
      'pending', 'paid', 'fulfilled', 'unfulfilled', 'cancelled', 'refunded', 'failed',
      'CREATED', 'SAVED', 'APPROVED', 'VOIDED', 'COMPLETED', 'PAYER_ACTION_REQUIRED',
      'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'payment_mismatch'
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const order = await Order.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { returnDocument: 'after' }
    );
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    // Cancelled / refunded / failed puts the stock back; reinstating the order takes it again.
    await syncStockForStatus(Order, order._id, order.status);
    res.json({ success: true, status: order.status, order });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
}

// Payment-processor payloads and internals never leave the server.
const PUBLIC_EXCLUDE = '-paypalCaptureResponse -captures -webhooks -paypalOrderId -couponCode';

/**
 * References issued before the switch to random ids look like ORD-123456 and
 * can be enumerated, so for those the lookup also needs the email on the
 * order. New references (ORD- + 10 random characters) are not guessable and
 * work on their own, exactly as before.
 */
const CURRENT_REF = /^ORD-[A-HJ-NP-Z2-9]{10}$/;
const isLegacyRef = (ref) => !CURRENT_REF.test(String(ref));

const emailMatches = (order, email) => {
  const given = String(email || '').trim().toLowerCase();
  if (!given) return false;
  return [order.customer?.email, order.shippingAddress?.email, order.billingAddress?.email]
    .filter(Boolean)
    .some((e) => String(e).trim().toLowerCase() === given);
};

/** Answers before any database lookup, so it reveals nothing about which references exist. */
const needsEmail = (req, res) => {
  if (isLegacyRef(req.params.referenceId) && !String(req.query.email || '').trim()) {
    res.status(403).json({
      success: false,
      needEmail: true,
      error: 'For this older order, please also enter the email address used at checkout.',
    });
    return true;
  }
  return false;
};

// Get an order by referenceId
export async function getOrderByReferenceId(req, res) {
  try {
    const { referenceId } = req.params;
    if (needsEmail(req, res)) return;
    const order = await Order.findOne({ referenceId: String(referenceId), status: { $ne: 'awaiting_payment' } })
      .select(PUBLIC_EXCLUDE)
      .lean();
    if (!order || (isLegacyRef(referenceId) && !emailMatches(order, req.query.email))) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (e) {
    console.error('Order lookup failed:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
}

/**
 * GET /api/orders/ref/:referenceId/invoice.pdf — public.
 *
 * A customer can already look up their own order by its reference (same
 * trust model as `getOrderByReferenceId` above — the reference is the
 * lookup secret, same as the confirmation email link), so this reuses that.
 * PDF only, not Word — the two-format choice is an admin tool for their own
 * records, not something a shopper needs. Delivered-only is enforced here,
 * not just hidden in the UI, since this route has no auth to fall back on.
 */
export async function downloadPublicInvoicePdf(req, res) {
  try {
    const { referenceId } = req.params;
    if (needsEmail(req, res)) return;
    const order = await Order.findOne({ referenceId: String(referenceId), status: { $ne: 'awaiting_payment' } });
    if (!order || (isLegacyRef(referenceId) && !emailMatches(order, req.query.email))) return res.status(404).json({ success: false, error: 'Order not found' });
    if ((order.status || '').toLowerCase() !== 'delivered') {
      return res.status(403).json({ success: false, error: 'The invoice is available once the order is delivered.' });
    }
    streamInvoicePdf(shapeOrder(order), res);
  } catch (e) {
    console.error('Public invoice PDF generation failed:', e);
    res.status(500).json({ success: false, error: 'Failed to generate invoice' });
  }
}
