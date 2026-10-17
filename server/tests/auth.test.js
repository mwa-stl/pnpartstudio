import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './helpers/harness.js';

const ORIGIN = 'https://www.pnpartstudio.com'; // an allowed origin in the harness
let h;
before(async () => { h = await startHarness(); });
after(() => h.stop());

/** fetch that keeps cookies, so a "browser session" can be simulated. */
const raw = async (method, path, body, { cookie, origin = ORIGIN } = {}) => {
  const r = await fetch(h.base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(origin && { origin }), ...(cookie && { cookie }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = r.headers.getSetCookie();
  return { status: r.status, json: await r.json().catch(() => ({})), setCookie, headers: r.headers };
};
const tokenCookie = (setCookie) => setCookie.find((c) => c.startsWith('token='));

const CREDS = { name: 'Admin', email: 'admin@example.com', password: 'correct-horse-battery' };

test('the first admin registers; the session is an httpOnly cookie and no token is in the body', async () => {
  const r = await raw('POST', '/api/auth/admin/register', CREDS);
  assert.equal(r.status, 201);
  assert.ok(!('accessToken' in r.json), 'the token must never be in a response body');
  assert.ok(!JSON.stringify(r.json).includes('eyJ'), 'no JWT anywhere in the body');
  const cookie = tokenCookie(r.setCookie);
  assert.ok(cookie, 'a session cookie is set');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Path=\//i);
});

test('login sets the same kind of cookie, and the cookie alone authenticates', async () => {
  const login = await raw('POST', '/api/auth/login', { email: CREDS.email, password: CREDS.password });
  assert.equal(login.status, 200);
  assert.ok(!('accessToken' in login.json));
  const cookie = tokenCookie(login.setCookie);
  assert.match(cookie, /HttpOnly/i);
  const session = cookie.split(';')[0];

  const me = await raw('GET', '/api/auth/me', null, { cookie: session });
  assert.equal(me.status, 200);
  assert.equal(me.json.user.email, CREDS.email);

  assert.equal((await raw('GET', '/api/auth/me')).status, 401, 'no cookie, no session');
});

test('wrong credentials give one generic message', async () => {
  const wrongPw = await raw('POST', '/api/auth/login', { email: CREDS.email, password: 'wrong-password-123' });
  const unknown = await raw('POST', '/api/auth/login', { email: 'nobody@example.com', password: 'wrong-password-123' });
  assert.equal(wrongPw.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrongPw.json.message, unknown.json.message);
});

test('writes made with the session cookie must come from an allowed origin', async () => {
  const login = await raw('POST', '/api/auth/login', { email: CREDS.email, password: CREDS.password });
  const session = tokenCookie(login.setCookie).split(';')[0];
  const body = { title: 'Sale', items: [] };

  const evil = await raw('POST', '/api/announcements', body, { cookie: session, origin: 'https://evil.example' });
  assert.equal(evil.status, 403, 'a cross-site page cannot ride the cookie');
  const none = await raw('POST', '/api/announcements', body, { cookie: session, origin: null });
  assert.equal(none.status, 403);
  const ok = await raw('POST', '/api/announcements', body, { cookie: session });
  assert.equal(ok.status, 201);
});

test('logout clears the cookie', async () => {
  const r = await raw('POST', '/api/auth/logout', {});
  assert.equal(r.status, 200);
  const cleared = tokenCookie(r.setCookie);
  assert.ok(cleared, 'the cookie is explicitly expired');
  assert.match(cleared, /Expires=Thu, 01 Jan 1970|Max-Age=0/i);
});

test('a second admin cannot self-register without an admin session', async () => {
  const r = await raw('POST', '/api/auth/admin/register', { ...CREDS, email: 'second@example.com' });
  assert.equal(r.status, 403);
});
