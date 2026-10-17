import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './helpers/harness.js';
import { escapeHtml, headerSafe } from '../src/lib/escape.js';

let h; let express; let cookieParser; let guardApp; let guardBase; let guardServer;

before(async () => {
  h = await startHarness();
  ({ default: express } = await import('express'));
  ({ default: cookieParser } = await import('cookie-parser'));
  const { sanitizeBody, csrfOriginGuard } = await import('../src/middleware/security.js');
  const { authenticateJWT } = await import('../src/middleware/auth.js');

  guardApp = express();
  guardApp.use(express.json(), cookieParser(), sanitizeBody, csrfOriginGuard(['https://admin.example']));
  guardApp.post('/echo', (req, res) => res.json(req.body));
  guardApp.post('/secure', authenticateJWT, (_req, res) => res.json({ ok: true }));
  guardServer = guardApp.listen(0);
  guardBase = `http://127.0.0.1:${guardServer.address().port}`;
});
after(async () => { guardServer.close(); await h.stop(); });

const post = async (path, body, headers = {}) => {
  const r = await fetch(guardBase + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};

test('Mongo operator keys are stripped from request bodies, however deep', async () => {
  const r = await post('/echo', { email: { $ne: null }, a: { 'b.c': 1, ok: 2 } });
  assert.deepEqual(r.json, { email: {}, a: { ok: 2 } });
});

test('only a valid admin JWT passes: HS256, admin role', async () => {
  const bearer = (t) => ({ authorization: `Bearer ${t}` });
  assert.equal((await post('/secure', {}, bearer(h.sign('admin')))).status, 200);
  assert.equal((await post('/secure', {}, bearer(h.sign('user')))).status, 403);
  const unsigned = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from('{"role":"admin"}').toString('base64url')}.`;
  assert.equal((await post('/secure', {}, bearer(unsigned))).status, 401, 'alg:none must be refused');
  assert.equal((await post('/secure', {})).status, 401);
});

test('a cookie-authenticated write must come from an allowed origin (CSRF)', async () => {
  const cookie = `token=${h.sign('admin')}`;
  assert.equal((await post('/secure', {}, { cookie })).status, 403);
  assert.equal((await post('/secure', {}, { cookie, origin: 'https://evil.example' })).status, 403);
  assert.equal((await post('/secure', {}, { cookie, origin: 'https://admin.example' })).status, 200);
});

test('HTML and header injection helpers neutralise hostile input', () => {
  assert.equal(escapeHtml('<img src=x onerror=1>&"'), '&lt;img src=x onerror=1&gt;&amp;&quot;');
  assert.equal(headerSafe('a\r\nBcc: x@y.z'), 'a Bcc: x@y.z');
});

test('server errors do not leak internals in production', async () => {
  const { errorHandler } = await import('../src/middleware/error.js');
  const respond = (status, message) => {
    let out;
    errorHandler({ status, message }, {}, { status: (s) => ({ json: (b) => { out = { s, b }; } }) });
    return out;
  };
  const before = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    assert.equal(respond(500, 'E11000 duplicate key collection: pnp.users').b.message, 'Server error');
    assert.equal(respond(400, 'Please fix the form').b.message, 'Please fix the form');
  } finally {
    process.env.NODE_ENV = before;
  }
});
