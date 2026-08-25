import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/final-entry.js';

const BASE = 'https://canvas.example.test';
const OWNER = '33333333-3333-4333-8333-333333333333';

function env(extra = {}) {
  return {
    PROVIDER_SECRET_KEY: 'final-entry-test-key',
    CANVAS_ENFORCE_OWNER: '1',
    CANVAS_OWNER_ID: OWNER,
    CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '0',
    ...extra
  };
}

async function call(path, { method = 'GET', body, headers = {} } = {}, currentEnv = env()) {
  const request = new Request(`${BASE}${path}`, {
    method,
    headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const response = await worker.fetch(request, currentEnv, { waitUntil() {} });
  return { response, data: await response.clone().json().catch(() => null) };
}

test('Blender push/poll keep dedicated bridge-token authentication instead of owner login', { concurrency: false }, async () => {
  const result = await call('/api/blender/bridge/push', {
    method: 'POST',
    headers: { 'x-canvas-bridge-token': 'wrong-token' },
    body: { direction: 'canvas_to_blender', scene: {} }
  });
  assert.equal(result.response.status, 401);
  assert.match(result.data.error, /Blender Bridge Token/);
});

test('Blender token itself is still unavailable without configured admin authentication', { concurrency: false }, async () => {
  const currentEnv = env({ CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '1' });
  const result = await call('/api/blender/bridge/token', {}, currentEnv);
  assert.equal(result.response.status, 503);
  assert.match(result.data.error, /CANVAS_ADMIN_PASSWORD/);
});
