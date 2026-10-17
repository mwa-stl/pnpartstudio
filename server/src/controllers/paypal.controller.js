// controllers/paypal.controller.js
import crypto from 'node:crypto';
import Order from '../models/Order.js';
import { createPayPalOrder, capturePayPalOrder } from '../config/paypal.js';
import { safeReturnUrl } from '../config/origins.js';
import { priceCart, PricingError } from '../services/pricing.js';
import { onOrderPaid } from '../services/inventory.js';

const clip = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY_RE = /^[A-Za-z]{2}$/;

/** Unguessable, human-friendly reference: ORD-7K2QH9XM4T. */
function newReferenceId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 10; i += 1) out += alphabet[crypto.randomInt(alphabet.length)];
  return `ORD-${out}`;
}

/** Whitelists and trims an address; returns null if a required part is missing. */
function readAddress(a, { requireContact = false } = {}) {
  if (!a || typeof a !== 'object') return null;
  const out = {
    fullName: clip(a.fullName, 120),
    line1: clip(a.line1, 200),
    line2: clip(a.line2, 200),
    city: clip(a.city, 100),
    state: clip(a.state, 100),
    postalCode: clip(a.postalCode, 20),
    countryCode: clip(a.countryCode, 2).toUpperCase(),
    phone: clip(a.phone, 30),
    email: clip(a.email, 254).toLowerCase(),
  };
  if (!out.fullName || !out.line1 || !out.city || !out.state || !out.postalCode) return null;
  if (!COUNTRY_RE.test(out.countryCode)) return null;
  if (requireContact && !EMAIL_RE.test(out.email)) return null;
  return out;
}

// POST /api/paypal/create-order
export async function paypalCreateOrderController(req, res, next) {
  try {
    const body = req.body || {};

    const customer = {
      firstName: clip(body.customer?.firstName, 80),
      lastName: clip(body.customer?.lastName, 80),
      email: clip(body.customer?.email, 254).toLowerCase(),
    };
    if (!customer.firstName || !customer.lastName || !EMAIL_RE.test(customer.email)) {
      return res.status(400).json({ error: 'Please provide your name and a valid email.' });
    }
    const shippingAddress = readAddress(body.shippingAddress, { requireContact: true });
    if (!shippingAddress) return res.status(400).json({ error: 'Please provide a complete shipping address.' });
    const billingAddress = readAddress(body.billingAddress) || { ...shippingAddress };

    // Prices, shipping, discount and total are ALL decided here, from the database.
    const { items, totals, couponCode } = await priceCart(body.items, body.couponCode);

    const referenceId = newReferenceId();
    const paypalOrder = await createPayPalOrder({
      items,
      totals,
      customer,
      shippingAddress,
      referenceId,
      returnUrl: safeReturnUrl(body.returnUrl, '/order/success'),
      cancelUrl: safeReturnUrl(body.cancelUrl, '/cart'),
    });

    await Order.create({
      customer,
      items,
      shippingAddress,
      billingAddress,
      totals,
      couponCode,
      paymentMethod: 'paypal',
      paypalOrderId: paypalOrder.id,
      status: 'awaiting_payment',
      referenceId,
    });

    const approvalLink = Array.isArray(paypalOrder.links)
      ? (paypalOrder.links.find((l) => l.rel === 'approve')?.href || null)
      : null;

    return res.status(201).json({
      id: paypalOrder.id,
      approvalLink,
      status: paypalOrder.status,
      referenceId,
      totals,
    });
  } catch (err) {
    if (err instanceof PricingError) return res.status(err.status).json({ error: err.message });
    console.error('[PayPal createOrder error]', err?.response?.data || err.message || err);
    return next(Object.assign(new Error('Could not start the payment. Please try again.'), { status: 502 }));
  }
}

/**
 * POST /api/paypal/capture-order
 *
 * Only an order this server created can be captured, and it is marked paid
 * only when PayPal confirms a COMPLETED capture for exactly the amount the
 * server priced. The browser is told nothing beyond the reference.
 */
export async function paypalCaptureOrderController(req, res, next) {
  try {
    const paypalOrderId = clip(req.body?.orderId, 64);
    if (!paypalOrderId) return res.status(400).json({ error: 'Missing orderId' });

    const order = await Order.findOne({ paypalOrderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'paid') return res.json({ success: true, referenceId: order.referenceId, status: 'paid' });
    if (order.status !== 'awaiting_payment') return res.status(409).json({ error: 'This order can no longer be paid.' });

    const capture = await capturePayPalOrder(paypalOrderId);
    const unit = capture?.purchase_units?.[0];
    const done = unit?.payments?.captures?.find((c) => c.status === 'COMPLETED');

    const expected = Number(order.totals.grandTotal).toFixed(2);
    const paidOk =
      capture?.status === 'COMPLETED' &&
      done &&
      Number(done.amount?.value).toFixed(2) === expected &&
      done.amount?.currency_code === order.totals.currency;

    if (!paidOk) {
      await Order.updateOne({ _id: order._id }, { $set: { status: 'payment_mismatch', paypalCaptureResponse: capture } });
      console.error(`[PayPal capture mismatch] ${order.referenceId} expected ${expected}`, JSON.stringify(unit?.payments));
      return res.status(402).json({ error: 'We could not confirm your payment. Please contact us with your PayPal receipt.' });
    }

    const flipped = await Order.updateOne(
      { _id: order._id, status: 'awaiting_payment' },
      { $set: { status: 'paid', paypalCaptureResponse: capture }, $push: { captures: capture } }
    );
    // The webhook may have marked it paid first; do the follow-up only once.
    if (flipped.modifiedCount) await onOrderPaid(order);

    return res.json({ success: true, referenceId: order.referenceId, status: 'paid' });
  } catch (err) {
    console.error('[PayPal captureOrder error]', err?.response?.data || err.message || err);
    return next(Object.assign(new Error('Could not complete the payment. Please try again.'), { status: 502 }));
  }
}
