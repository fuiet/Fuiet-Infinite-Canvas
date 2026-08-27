import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/pages-entry.js';

const BASE = 'https://canvas.example.test';
const ENV = {
  PROVIDER_SECRET_KEY: 'desktop-provider-test-key',
  CANVAS_DESKTOP_SINGLE_USER: '1',
  // Deliberately stale cloud settings: desktop mode must override them.
  CANVAS_ADMIN_PASSWORD: 'must-not-be-required',
  CANVAS_ENFORCE_OWNER: '1',
  CANVAS_OWNER_ID: '',
  CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '0'
};

function ctx() { return { waitUntil() {} }; }

async function call(path, { method = 'GET', body } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set('content-type', 'application/json');
  const response = await worker.fetch(new Request(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  }), ENV, ctx());
  return { response, data: await response.clone().json().catch(() => null) };
}

test('desktop single-user mode reports authentication disabled', { concurrency: false }, async () => {
  const result = await call('/api/auth/status');
  assert.equal(result.response.status, 200);
  assert.equal(result.data.enabled, false);
  assert.equal(result.data.authenticated, true);
  assert.equal(result.data.mode, 'desktop-single-user');
});

test('desktop single-user mode can list and save providers without login, bearer or owner id', { concurrency: false }, async () => {
  await call('/api/health');
  if (globalThis.__canvasWorkerState?.providers) globalThis.__canvasWorkerState.providers = [];
  globalThis.__canvasProviderMigrationPromise = null;

  const list = await call('/api/providers');
  assert.equal(list.response.status, 200);
  assert.ok(Array.isArray(list.data.providers));

  const saved = await call('/api/providers', {
    method: 'POST',
    body: {
      id: 'desktop-direct-provider',
      name: 'Desktop Direct Provider',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'secret-key',
      models: [{ id: 'image-model', name: 'Image Model', modality: 'image' }]
    }
  });

  assert.equal(saved.response.status, 200);
  assert.equal(saved.data.provider.id, 'desktop-direct-provider');
  assert.equal(saved.data.provider.ownerId, undefined);
  assert.equal(saved.data.provider.hasApiKey, true);
});
