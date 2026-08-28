import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/pages-entry.js';

const BASE = 'https://canvas.example.test';
const OWNER = '11111111-1111-4111-8111-111111111111';
const ENV = {
  CANVAS_SINGLE_USER_NO_AUTH: '1',
  // Deliberately stale settings: hosted single-user mode must ignore them.
  CANVAS_ADMIN_PASSWORD: 'stale-password-that-must-not-be-required',
  CANVAS_ENFORCE_OWNER: '1',
  CANVAS_OWNER_ID: OWNER,
  CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '0',
  PROVIDER_SECRET_KEY: 'hosted-single-user-provider-secret-for-tests'
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

test('hosted single-user mode disables login even when stale admin settings exist', { concurrency: false }, async () => {
  const result = await call('/api/auth/status');
  assert.equal(result.response.status, 200);
  assert.equal(result.data.enabled, false);
  assert.equal(result.data.authenticated, true);
  assert.equal(result.data.mode, 'hosted-single-user-no-auth');
});

test('hosted single-user mode saves provider without login or owner isolation', { concurrency: false }, async () => {
  await call('/api/health');
  if (globalThis.__canvasWorkerState?.providers) globalThis.__canvasWorkerState.providers = [];
  globalThis.__canvasProviderMigrationPromise = null;

  const saved = await call('/api/providers', {
    method: 'POST',
    body: {
      id: 'hosted-direct-provider',
      name: 'Hosted Direct Provider',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'secret-key',
      models: [{ id: 'image-model', name: 'Image Model', modality: 'image' }]
    }
  });

  assert.equal(saved.response.status, 200);
  assert.equal(saved.data.provider.id, 'hosted-direct-provider');
  assert.equal(saved.data.provider.ownerId, undefined);
  assert.equal(saved.data.provider.hasApiKey, true);
  assert.equal(saved.data.provider.apiKey, undefined);
  assert.equal(saved.data.provider.apiKeyEncrypted, undefined);

  const stored = globalThis.__canvasWorkerState.providers.find(item => item.id === 'hosted-direct-provider');
  assert.ok(stored);
  assert.equal(stored.ownerId, undefined);
  assert.equal(stored.apiKey, undefined);
  assert.match(String(stored.apiKeyEncrypted || ''), /^v1\./);
});
