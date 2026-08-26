import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/pages-entry.js';

const BASE = 'https://canvas.example.test';
const OWNER = '44444444-4444-4444-8444-444444444444';
const env = {
  PROVIDER_SECRET_KEY: 'stateless-session-test-key',
  CANVAS_ADMIN_PASSWORD: 'correct-password',
  CANVAS_OWNER_ID: OWNER,
  CANVAS_ENFORCE_OWNER: '1',
  CANVAS_CLAIM_UNOWNED: '0'
};

function ctx() { return { waitUntil() {} }; }

async function call(path, { method = 'GET', body, headers = {} } = {}, currentEnv = env) {
  const requestHeaders = new Headers(headers);
  let requestBody;
  if (body !== undefined) {
    requestHeaders.set('content-type', 'application/json');
    requestBody = JSON.stringify(body);
  }
  const response = await worker.fetch(new Request(`${BASE}${path}`, {
    method,
    headers: requestHeaders,
    body: requestBody
  }), currentEnv, ctx());
  const data = await response.clone().json().catch(() => null);
  return { response, data };
}

function cookiePair(setCookie) {
  return String(setCookie || '').split(';')[0];
}

test('admin session is signed, secure, and survives legacy in-memory session reset', { concurrency: false }, async () => {
  const login = await call('/api/auth/login', {
    method: 'POST',
    body: { password: 'correct-password' },
    headers: { 'cf-connecting-ip': '203.0.113.20', origin: BASE }
  });
  assert.equal(login.response.status, 200);
  const setCookie = login.response.headers.get('set-cookie') || '';
  assert.match(setCookie, /canvas_admin_session_v2=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
  assert.match(setCookie, /Secure/i);

  if (globalThis.__canvasWorkerState?.sessions) globalThis.__canvasWorkerState.sessions = new Map();
  const cookie = cookiePair(setCookie);
  const status = await call('/api/auth/status', { headers: { cookie } });
  assert.equal(status.data.enabled, true);
  assert.equal(status.data.authenticated, true);

  const providers = await call('/api/providers', { headers: { cookie } });
  assert.equal(providers.response.status, 200);
});

test('protected API rejects requests without admin session or bearer user', { concurrency: false }, async () => {
  const result = await call('/api/providers');
  assert.equal(result.response.status, 401);
  assert.match(result.data.error, /登录|用户身份/);
});

test('signed admin session blocks cross-origin state-changing requests', { concurrency: false }, async () => {
  const login = await call('/api/auth/login', {
    method: 'POST',
    body: { password: 'correct-password' },
    headers: { 'cf-connecting-ip': '203.0.113.21', origin: BASE }
  });
  const cookie = cookiePair(login.response.headers.get('set-cookie'));
  const result = await call('/api/providers', {
    method: 'POST',
    headers: { cookie, origin: 'https://evil.example' },
    body: { baseUrl: 'https://api.example.com/v1', apiKey: 'secret', models: [{ id: 'm', modality: 'text' }] }
  });
  assert.equal(result.response.status, 403);
  assert.match(result.data.error, /跨站/);
});

test('logout invalidates browser session cookie', { concurrency: false }, async () => {
  const login = await call('/api/auth/login', {
    method: 'POST',
    body: { password: 'correct-password' },
    headers: { 'cf-connecting-ip': '203.0.113.22' }
  });
  const cookie = cookiePair(login.response.headers.get('set-cookie'));
  const logout = await call('/api/auth/logout', { method: 'POST', headers: { cookie, origin: BASE } });
  assert.equal(logout.response.status, 200);
  assert.match(logout.response.headers.get('set-cookie') || '', /Max-Age=0/);
});

test('Blender token can be read through the signed admin session, while push remains bridge-token based', { concurrency: false }, async () => {
  const login = await call('/api/auth/login', {
    method: 'POST',
    body: { password: 'correct-password' },
    headers: { 'cf-connecting-ip': '203.0.113.23' }
  });
  const cookie = cookiePair(login.response.headers.get('set-cookie'));
  const token = await call('/api/blender/bridge/token', { headers: { cookie } });
  assert.equal(token.response.status, 200);
  assert.ok(token.data.token);

  const push = await call('/api/blender/bridge/push', {
    method: 'POST',
    headers: { 'x-canvas-bridge-token': 'wrong-token' },
    body: { direction: 'canvas_to_blender', scene: {} }
  });
  assert.equal(push.response.status, 401);
  assert.match(push.data.error, /Blender Bridge Token/);
});
