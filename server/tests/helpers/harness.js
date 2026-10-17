import http from 'node:http';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Shared test rig: an in-memory MongoDB, a fake PayPal, and the real Express
 * routes and middleware mounted exactly as server.js mounts them. Tests talk
 * to it over HTTP, so they exercise routing, auth, validation and the
 * database together.
 *
 * Environment is set BEFORE any application module is imported — several
 * read it at load time.
 */
export async function startHarness({ cors = 'https://www.pnpartstudio.com' } = {}) {
  // ---- fake PayPal ------------------------------------------------------
  const paypal = { orders: new Map(), captureAmountOverride: null, webhookValid: true };
  const fake = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (req.url === '/v1/oauth2/token') return send(200, { access_token: 'tok', expires_in: 3600 });
      if (req.url === '/v1/notifications/verify-webhook-signature') {
        return send(200, { verification_status: paypal.webhookValid ? 'SUCCESS' : 'FAILURE' });
      }
      if (req.url === '/v2/checkout/orders' && req.method === 'POST') {
        const order = JSON.parse(body);
        const id = `PP${paypal.orders.size + 1}`;
        paypal.orders.set(id, order);
        return send(201, { id, status: 'CREATED', links: [{ rel: 'approve', href: `https://paypal.test/approve/${id}` }] });
      }
      const m = req.url.match(/^\/v2\/checkout\/orders\/([^/]+)\/capture$/);
      if (m) {
        const order = paypal.orders.get(m[1]);
        if (!order) return send(404, { name: 'RESOURCE_NOT_FOUND' });
        const amt = order.purchase_units[0].amount;
        return send(201, {
          id: m[1],
          status: 'COMPLETED',
          purchase_units: [{
            payments: {
              captures: [{
                status: 'COMPLETED',
                amount: { currency_code: amt.currency_code, value: paypal.captureAmountOverride ?? amt.value },
              }],
            },
          }],
        });
      }
      return send(404, {});
    });
  });
  await new Promise((resolve) => fake.listen(0, resolve));

  const mongo = await MongoMemoryServer.create();
  Object.assign(process.env, {
    NODE_ENV: 'test',
    JWT_SECRET: 'x'.repeat(48),
    PAYPAL_CLIENT_ID: 'id',
    PAYPAL_CLIENT_SECRET: 'secret',
    PAYPAL_MODE: 'sandbox',
    PAYPAL_WEBHOOK_ID: 'WH-TEST',
    PAYPAL_API_OVERRIDE: `http://127.0.0.1:${fake.address().port}`,
    CORS_ORIGINS: cors,
    GCP_BUCKET_NAME: 'testbucket',
  });

  // ---- app --------------------------------------------------------------
  const { default: mongoose } = await import('mongoose');
  await mongoose.connect(mongo.getUri(), { dbName: 'test' });
  const { default: express } = await import('express');
  const { default: cookieParser } = await import('cookie-parser');
  const { default: jwt } = await import('jsonwebtoken');
  const { default: routes } = await import('../../src/routes/index.js');
  const { sanitizeBody, csrfOriginGuard } = await import('../../src/middleware/security.js');
  const { corsOrigins } = await import('../../src/config/origins.js');
  const { notFound, errorHandler } = await import('../../src/middleware/error.js');

  const app = express();
  app.use(express.json(), cookieParser(), sanitizeBody);
  app.use('/api', csrfOriginGuard(corsOrigins));
  app.use('/api', routes);
  app.use(notFound, errorHandler);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  const call = async (method, path, body, headers = {}) => {
    const r = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: r.status, json };
  };

  const sign = (role) => jwt.sign({ role, id: 'tester' }, process.env.JWT_SECRET, { algorithm: 'HS256' });
  const adminHeaders = { authorization: `Bearer ${sign('admin')}` };

  const models = {
    Product: (await import('../../src/models/Product.js')).Product,
    Order: (await import('../../src/models/Order.js')).default,
    Coupon: (await import('../../src/models/Coupon.js')).default,
    StorePickupOrder: (await import('../../src/models/StorePickupOrder.js')).default,
    Announcement: (await import('../../src/models/Announcement.js')).default,
    GalleryItem: (await import('../../src/models/GalleryItem.js')).default,
    HeroSlider: (await import('../../src/models/HeroSlider.js')).default,
    Testimonial: (await import('../../src/models/Testimonial.js')).default,
    ClassModel: (await import('../../src/models/Class.js')).ClassModel,
  };

  const customer = { firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com' };
  const address = {
    fullName: 'Asha Rao', line1: '1 Main St', city: 'Ballwin', state: 'MO',
    postalCode: '63021', countryCode: 'US', email: 'asha@example.com',
  };

  return {
    call, models, mongoose, paypal, jwt, sign, adminHeaders, customer, address, base,
    /** create-order + capture-order for the given items; returns both responses. */
    async pay(items, extra = {}) {
      const created = await call('POST', '/api/paypal/create-order', { items, customer, shippingAddress: address, ...extra });
      const captured = created.status === 201
        ? await call('POST', '/api/paypal/capture-order', { orderId: created.json.id })
        : null;
      return { created, captured };
    },
    async stop() {
      server.close();
      fake.close();
      await mongoose.disconnect();
      await mongo.stop();
    },
  };
}
