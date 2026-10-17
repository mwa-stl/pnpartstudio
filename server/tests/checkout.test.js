import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './helpers/harness.js';

let h;
let prints; let unique; let enquiry;
before(async () => {
  h = await startHarness();
  const { Product, Coupon } = h.models;
  unique = await Product.create({ title: 'Unique Piece', category: 'Art', price: 200, salePrice: 150, stock: 1, inStock: true, published: true, images: ['a.webp'] });
  prints = await Product.create({ title: 'Print', category: 'Art', price: 20, stock: 10, inStock: true, published: true });
  enquiry = await Product.create({ title: 'Commission', category: 'Art', price: 0, contactForPrice: true, published: true });
  await Coupon.create({ code: 'ONCE20', percent: 20, maxUses: 1 });
});
after(() => h.stop());

const line = (p, qty = 1, extra = {}) => ({ productId: String(p._id), qty, ...extra });

test('prices come from the database, never from the browser', async () => {
  const r = await h.call('POST', '/api/paypal/create-order', {
    items: [line(prints, 2, { price: 0.01, total: 0.02 })],
    totals: { grandTotal: 0.01, subtotal: 0.01 },
    customer: h.customer, shippingAddress: h.address,
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal(r.json.totals.grandTotal, 55, 'two prints (40) + 15 shipping, whatever the client claimed');
  assert.equal(h.paypal.orders.get(r.json.id).purchase_units[0].amount.value, '55.00');
  assert.match(r.json.referenceId, /^ORD-[A-HJ-NP-Z2-9]{10}$/);
  const order = await h.models.Order.findOne({ referenceId: r.json.referenceId });
  assert.equal(order.status, 'awaiting_payment');
});

test('an unpaid checkout is invisible to the public and to the admin list', async () => {
  // created but never captured
  const created = await h.call('POST', '/api/paypal/create-order', { items: [line(prints)], customer: h.customer, shippingAddress: h.address });
  assert.equal((await h.call('GET', `/api/orders/ref/${created.json.referenceId}`)).status, 404);
  const list = await h.call('GET', '/api/orders', null, h.adminHeaders);
  assert.ok(!list.json.items.some((o) => o.referenceId === created.json.referenceId));
});

test('capture marks the order paid, is idempotent, and leaks nothing from PayPal', async () => {
  const { created, captured } = await h.pay([line(prints, 2)]);
  assert.equal(captured.status, 200);
  assert.equal(captured.json.status, 'paid');
  assert.equal(captured.json.referenceId, created.json.referenceId);
  assert.ok(!('purchase_units' in captured.json));

  const again = await h.call('POST', '/api/paypal/capture-order', { orderId: created.json.id });
  assert.equal(again.json.status, 'paid');

  const unknown = await h.call('POST', '/api/paypal/capture-order', { orderId: 'PP-unknown' });
  assert.equal(unknown.status, 404);

  const pub = await h.call('GET', `/api/orders/ref/${created.json.referenceId}`);
  assert.equal(pub.status, 200);
  for (const k of ['paypalCaptureResponse', 'captures', 'paypalOrderId', 'webhooks', 'couponCode']) {
    assert.ok(!(k in pub.json.order), `${k} must not be public`);
  }
});

test('a capture for the wrong amount is not accepted as paid', async () => {
  const created = await h.call('POST', '/api/paypal/create-order', { items: [line(prints)], customer: h.customer, shippingAddress: h.address });
  h.paypal.captureAmountOverride = '1.00';
  const r = await h.call('POST', '/api/paypal/capture-order', { orderId: created.json.id });
  h.paypal.captureAmountOverride = null;
  assert.equal(r.status, 402);
  assert.equal((await h.models.Order.findOne({ referenceId: created.json.referenceId })).status, 'payment_mismatch');
});

test('old-style references need the checkout email; new ones do not', async () => {
  await h.models.Order.create({
    customer: h.customer, items: [], shippingAddress: h.address, totals: { grandTotal: 10 }, status: 'paid', referenceId: 'ORD-123456',
  });
  let r = await h.call('GET', '/api/orders/ref/ORD-123456');
  assert.equal(r.status, 403);
  assert.equal(r.json.needEmail, true);
  r = await h.call('GET', '/api/orders/ref/ORD-999999');
  assert.equal(r.status, 403, 'a reference that does not exist answers the same way (no enumeration)');
  assert.equal((await h.call('GET', '/api/orders/ref/ORD-123456?email=wrong@example.com')).status, 404);
  assert.equal((await h.call('GET', '/api/orders/ref/ORD-123456?email=ASHA@example.com')).status, 200);
});

test('a coupon applies server-side and is spent exactly once', async () => {
  const { created, captured } = await h.pay([line(unique)], { couponCode: 'once20' });
  assert.equal(created.json.totals.discount, 30);
  assert.equal(created.json.totals.grandTotal, 120, '150 less 20%, free shipping over 100');
  assert.equal(captured.json.status, 'paid');
  assert.equal((await h.models.Coupon.findOne({ code: 'ONCE20' })).uses, 1);

  const reuse = await h.call('POST', '/api/paypal/create-order', { items: [line(prints)], couponCode: 'ONCE20', customer: h.customer, shippingAddress: h.address });
  assert.equal(reuse.status, 400);
  assert.match(reuse.json.error, /usage limit/);
});

test('products that cannot be bought online are rejected', async () => {
  assert.equal((await h.call('POST', '/api/paypal/create-order', { items: [line(enquiry)], customer: h.customer, shippingAddress: h.address })).status, 400);
  // the unique piece sold out in the previous test
  assert.equal((await h.call('POST', '/api/paypal/create-order', { items: [line(unique)], customer: h.customer, shippingAddress: h.address })).status, 400);
  assert.equal((await h.call('POST', '/api/paypal/create-order', { items: [{ productId: { $ne: null }, qty: 1 }], customer: h.customer, shippingAddress: h.address })).status, 400);
  assert.equal((await h.call('POST', '/api/paypal/create-order', { items: [line(prints)], customer: { ...h.customer, email: 'nope' }, shippingAddress: h.address })).status, 400);
});

test('there is no public way to create an order or mark one paid', async () => {
  assert.ok([401, 404].includes((await h.call('POST', '/api/orders', { totals: { grandTotal: 0.01 }, status: 'paid' })).status));
  assert.ok([401, 404].includes((await h.call('PATCH', '/api/orders/paypal/PP1/capture', { captureResponse: {} })).status));
  assert.equal((await h.call('GET', '/api/orders')).status, 401);
});

test('store pickup is priced server-side with no shipping', async () => {
  const r = await h.call('POST', '/api/store-pickup-orders', {
    fullName: 'Asha', phone: '5551234567', email: 'asha@example.com', items: [line(prints, 3, { price: 0.01 })], total: 0.03,
  });
  assert.equal(r.status, 201);
  assert.equal(r.json.order.total, 60);
  const bad = await h.call('PATCH', '/api/store-pickup-orders/x', { total: 1 }, h.adminHeaders);
  assert.equal(bad.status, 400, 'only a valid status can be edited');
});
