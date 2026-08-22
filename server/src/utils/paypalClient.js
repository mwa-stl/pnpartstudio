// server/src/utils/paypalClient.js
import paypal from '@paypal/checkout-server-sdk';

function env() {
  const live = String(process.env.PAYPAL_MODE || '').toLowerCase() === 'live';
  return live
    ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
}

export function paypalClient() {
  return new paypal.core.PayPalHttpClient(env());
}

export async function createOrder(total, currency = 'USD') {
  const req = new paypal.orders.OrdersCreateRequest();
  req.prefer('return=representation');
  req.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{ amount: { currency_code: currency, value: total.toFixed(2) } }],
  });
  const client = paypalClient();
  const res = await client.execute(req);
  return res.result;
}

export async function captureOrder(orderId) {
  const req = new paypal.orders.OrdersCaptureRequest(orderId);
  req.requestBody({});
  const client = paypalClient();
  const res = await client.execute(req);
  return res.result;
}
