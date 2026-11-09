import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './helpers/harness.js';

const ORIGIN = 'https://www.pnpartstudio.com'; // an allowed origin in the harness
let h;
before(async () => { h = await startHarness(); });
after(() => h.stop());

/** fetch helper; `token` is sent as a Bearer header, the way the console does. */
const raw = async (method, path, body, { token, origin = ORIGIN } = {}) => {
  const r = await fetch(h.base + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(origin && { origin }),
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.json().catch(() => ({})), setCookie: r.headers.getSetCookie(), headers: r.headers };
};

const CREDS = { name: 'Admin', email: 'admin@example.com', password: 'correct-horse-battery' };

test('the first admin registers and receives a Bearer token; no cookie is set', async () => {
  const r = await raw('POST', '/api/auth/admin/register', CREDS);
  assert.equal(r.status, 201);
  assert.match(r.json.token, /^eyJ/);
  assert.equal(r.setCookie.length, 0, 'the API sets no cookies');
});

test('login returns a token that alone authenticates', async () => {
  const login = await raw('POST', '/api/auth/login', { email: CREDS.email, password: CREDS.password });
  assert.equal(login.status, 200);
  assert.equal(login.setCookie.length, 0);

  const me = await raw('GET', '/api/auth/me', null, { token: login.json.token });
  assert.equal(me.status, 200);
  assert.equal(me.json.user.email, CREDS.email);

  assert.equal((await raw('GET', '/api/auth/me')).status, 401, 'no token, no session');
  assert.equal((await raw('GET', '/api/auth/me', null, { token: 'garbage' })).status, 401);
});

test('wrong credentials give one generic message', async () => {
  const wrongPw = await raw('POST', '/api/auth/login', { email: CREDS.email, password: 'wrong-password-123' });
  const unknown = await raw('POST', '/api/auth/login', { email: 'nobody@example.com', password: 'wrong-password-123' });
  assert.equal(wrongPw.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrongPw.json.message, unknown.json.message);
});

test('admin writes work with the token and are refused without it', async () => {
  const login = await raw('POST', '/api/auth/login', { email: CREDS.email, password: CREDS.password });
  const body = { title: 'Sale', items: [] };
  assert.equal((await raw('POST', '/api/announcements', body)).status, 401);
  assert.equal((await raw('POST', '/api/announcements', body, { token: login.json.token })).status, 201);
});

test('logout succeeds', async () => {
  const r = await raw('POST', '/api/auth/logout', {});
  assert.equal(r.status, 200);
});

test('a second admin cannot self-register without an admin session', async () => {
  const r = await raw('POST', '/api/auth/admin/register', { ...CREDS, email: 'second@example.com' });
  assert.equal(r.status, 403);
});
