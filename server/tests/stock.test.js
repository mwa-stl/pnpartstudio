import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './helpers/harness.js';

let h;
before(async () => { h = await startHarness(); });
after(() => h.stop());

const make = (title, stock, extra = {}) =>
  h.models.Product.create({ title, category: 'Art', price: 20, stock, inStock: true, published: true, ...extra });
const stockOf = async (p) => (await h.models.Product.findById(p._id)).toObject();
const line = (p, qty = 1) => ({ productId: String(p._id), qty });
const setStatus = (order, status) =>
  h.call('PATCH', `/api/orders/${order._id}`, { status }, h.adminHeaders);

test('paying takes stock; the last piece flips the product to sold out', async () => {
  const p = await make('Last piece', 1);
  const { captured } = await h.pay([line(p)]);
  assert.equal(captured.json.status, 'paid');
  const after = await stockOf(p);
  assert.equal(after.stock, 0);
  assert.equal(after.inStock, false);
});

test('a buyer who paid while someone else took the last piece is flagged', async () => {
  const p = await make('Contested', 1);
  const a = await h.call('POST', '/api/paypal/create-order', { items: [line(p)], customer: h.customer, shippingAddress: h.address });
  const b = await h.call('POST', '/api/paypal/create-order', { items: [line(p)], customer: h.customer, shippingAddress: h.address });
  await h.call('POST', '/api/paypal/capture-order', { orderId: a.json.id });
  await h.call('POST', '/api/paypal/capture-order', { orderId: b.json.id });
  const second = await h.models.Order.findOne({ referenceId: b.json.referenceId });
  assert.match(second.stockIssue, /Contested/);
  assert.equal((await stockOf(p)).stock, 0, 'stock never goes negative');
});

test('cancelling a paid order puts its stock back, exactly once', async () => {
  const p = await make('Cancellable', 5);
  const { created } = await h.pay([line(p, 2)]);
  assert.equal((await stockOf(p)).stock, 3);
  const order = await h.models.Order.findOne({ referenceId: created.json.referenceId });

  assert.equal((await setStatus(order, 'cancelled')).status, 200);
  assert.equal((await stockOf(p)).stock, 5);
  assert.equal((await h.models.Order.findById(order._id)).stockRestored, true);

  // cancelling again, or moving to another releasing status, must not return it twice
  await setStatus(order, 'cancelled');
  await setStatus(order, 'refunded');
  assert.equal((await stockOf(p)).stock, 5);
});

test('a sold-out piece is available again after its order is cancelled', async () => {
  const p = await make('Back on sale', 1);
  const { created } = await h.pay([line(p)]);
  assert.equal((await stockOf(p)).inStock, false);
  const order = await h.models.Order.findOne({ referenceId: created.json.referenceId });
  await setStatus(order, 'cancelled');
  const back = await stockOf(p);
  assert.equal(back.stock, 1);
  assert.equal(back.inStock, true);
});

test('reinstating a cancelled order takes the stock again', async () => {
  const p = await make('Reinstated', 4);
  const { created } = await h.pay([line(p, 3)]);
  const order = await h.models.Order.findOne({ referenceId: created.json.referenceId });
  await setStatus(order, 'cancelled');
  assert.equal((await stockOf(p)).stock, 4);
  await setStatus(order, 'confirmed');
  assert.equal((await stockOf(p)).stock, 1);
  assert.equal((await h.models.Order.findById(order._id)).stockRestored, false);
});

test('reinstating is refused stock it no longer has and the order is flagged', async () => {
  const p = await make('Sold meanwhile', 1);
  const first = await h.pay([line(p)]);
  const order = await h.models.Order.findOne({ referenceId: first.created.json.referenceId });
  await setStatus(order, 'cancelled');
  await h.pay([line(p)]); // someone else buys it
  assert.equal((await stockOf(p)).stock, 0);
  await setStatus(order, 'confirmed');
  assert.equal((await stockOf(p)).stock, 0, 'never driven negative');
  assert.match((await h.models.Order.findById(order._id)).stockIssue, /Sold out while the order was cancelled/);
});

test('products that do not track stock are left alone', async () => {
  const p = await make('Untracked', 0);
  const { created } = await h.pay([line(p, 2)]);
  const order = await h.models.Order.findOne({ referenceId: created.json.referenceId });
  assert.deepEqual(order.stockTaken.toObject(), []);
  await setStatus(order, 'cancelled');
  const after = await stockOf(p);
  assert.equal(after.stock, 0);
  assert.equal(after.inStock, true);
});

test('a PayPal refund webhook restocks the order', async () => {
  const p = await make('Refundable', 3);
  const { created } = await h.pay([line(p)]);
  const order = await h.models.Order.findOne({ referenceId: created.json.referenceId });
  assert.equal((await stockOf(p)).stock, 2);

  const event = {
    id: 'WH-EVT-1',
    event_type: 'PAYMENT.CAPTURE.REFUNDED',
    resource: { supplementary_data: { related_ids: { order_id: order.paypalOrderId } } },
  };
  const r = await h.call('POST', '/api/paypal/webhook', event);
  assert.equal(r.status, 200);
  assert.equal((await h.models.Order.findById(order._id)).status, 'refunded');
  assert.equal((await stockOf(p)).stock, 3);

  // the same delivery arriving twice must not restock twice
  await h.call('POST', '/api/paypal/webhook', event);
  assert.equal((await stockOf(p)).stock, 3);
});

test('a webhook with a bad signature is rejected and changes nothing', async () => {
  const p = await make('Guarded', 3);
  const { created } = await h.pay([line(p)]);
  const order = await h.models.Order.findOne({ referenceId: created.json.referenceId });
  h.paypal.webhookValid = false;
  const r = await h.call('POST', '/api/paypal/webhook', {
    event_type: 'PAYMENT.CAPTURE.REFUNDED',
    resource: { supplementary_data: { related_ids: { order_id: order.paypalOrderId } } },
  });
  h.paypal.webhookValid = true;
  assert.equal(r.status, 400);
  assert.equal((await h.models.Order.findById(order._id)).status, 'paid');
  assert.equal((await stockOf(p)).stock, 2);
});

test('store pickup reserves stock and a cancellation gives it back', async () => {
  const p = await make('Pickup piece', 5);
  const placed = await h.call('POST', '/api/store-pickup-orders', {
    fullName: 'Asha', phone: '5551234567', email: 'asha@example.com', items: [line(p, 2)],
  });
  assert.equal(placed.status, 201);
  assert.equal((await stockOf(p)).stock, 3);

  const id = placed.json.order._id;
  assert.equal((await h.call('PATCH', `/api/store-pickup-orders/${id}`, { status: 'Cancelled' }, h.adminHeaders)).status, 200);
  assert.equal((await stockOf(p)).stock, 5);
  await h.call('PATCH', `/api/store-pickup-orders/${id}`, { status: 'Cancelled' }, h.adminHeaders);
  assert.equal((await stockOf(p)).stock, 5, 'not twice');

  await h.call('PATCH', `/api/store-pickup-orders/${id}`, { status: 'Pending' }, h.adminHeaders);
  assert.equal((await stockOf(p)).stock, 3, 'reinstated');
});

test('deleting an uncollected pickup order releases its stock; a fulfilled one does not', async () => {
  const p = await make('Pickup delete', 6);
  const mk = async (qty) => (await h.call('POST', '/api/store-pickup-orders', {
    fullName: 'Asha', phone: '5551234567', email: 'asha@example.com', items: [line(p, qty)],
  })).json.order._id;

  const uncollected = await mk(2);
  assert.equal((await stockOf(p)).stock, 4);
  await h.call('DELETE', `/api/store-pickup-orders/${uncollected}`, null, h.adminHeaders);
  assert.equal((await stockOf(p)).stock, 6);

  const collected = await mk(2);
  await h.call('PATCH', `/api/store-pickup-orders/${collected}`, { status: 'Fulfilled' }, h.adminHeaders);
  await h.call('DELETE', `/api/store-pickup-orders/${collected}`, null, h.adminHeaders);
  assert.equal((await stockOf(p)).stock, 4, 'the goods left the studio');
});
