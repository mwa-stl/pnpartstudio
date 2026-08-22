// controllers/paypal.controller.js
import { createPayPalOrder, capturePayPalOrder } from '../config/paypal.js';

// POST /api/paypal/create-order
export async function paypalCreateOrderController(req, res, next) {
  try {
    // Accept all important fields
    const { items, customer, shippingAddress, totals, returnUrl, cancelUrl } = req.body;

    // Defensive: accept both {qty}/{quantity} for compatibility
    const normalizedItems = (items || []).map(item => ({
      ...item,
      quantity: item.qty || item.quantity || 1,
      name: item.name || item.title || item.productId || 'Product',
      price: Number(item.price),
      description: item.description || '',
    }));

    if (!Array.isArray(normalizedItems) || normalizedItems.length === 0)
      return res.status(400).json({ error: "No cart items" });

    const order = await createPayPalOrder({
      items: normalizedItems,
      customer,
      shippingAddress,
      totals,
      returnUrl,
      cancelUrl,
    });

    // Find approval link for frontend redirect
    const approvalLink = Array.isArray(order.links)
      ? (order.links.find(l => l.rel === 'approve')?.href || null)
      : null;

    res.status(201).json({
      id: order.id,
      links: order.links,
      approvalLink,
      status: order.status,
      paypalRes: order
    });
  } catch (err) {
    // Print error details for debugging
    console.error('[PayPal createOrder error]', err?.response?.data || err.message || err);
    res.status(500).json({
      error: typeof err === 'string' ? err : (err?.message || 'Unknown Paypal error'),
      details: err?.response?.data || undefined,
    });
  }
}

// POST /api/paypal/capture-order
export async function paypalCaptureOrderController(req, res, next) {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "Missing orderId" });

    const capture = await capturePayPalOrder(orderId);
    res.status(200).json(capture);
  } catch (err) {
    console.error('[PayPal captureOrder error]', err?.response?.data || err.message || err);
    res.status(500).json({
      error: typeof err === 'string' ? err : (err?.message || 'Unknown Paypal error'),
      details: err?.response?.data || undefined,
    });
  }
}
