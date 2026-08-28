import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/pages-entry.js';

const BASE = 'https://canvas.example.test';

function ctx() { return { waitUntil() {} }; }

function cloudflareLikeEnv() {
  const env = {
    CANVAS_SINGLE_USER_NO_AUTH: '1',
    CANVAS_ADMIN_PASSWORD: 'stale-password',
    CANVAS_ENFORCE_OWNER: '1',
    CANVAS_OWNER_ID: '11111111-1111-4111-8111-111111111111',
    CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '0'
  };
  Object.defineProperty(env, 'PROVIDER_SECRET_KEY', {
    value: 'non-enumerable-cloudflare-provider-secret',
    enumerable: false,
    configurable: true
  });
  return env;
}

async function call(env, path, { method = 'GET', body } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set('content-type', 'application/json');
  const response = await worker.fetch(new Request(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  }), env, ctx());
  return { response, data: await response.clone().json().catch(() => null) };
}

test('runtime diagnostic sees a non-enumerable Cloudflare provider secret binding', { concurrency: false }, async () => {
  const result = await call(cloudflareLikeEnv(), '/api/runtime/env-status');
  assert.equal(result.response.status, 200);
  assert.equal(result.data.mode, 'hosted-single-user-no-auth');
  assert.equal(result.data.providerSecretConfigured, true);
  assert.equal(result.data.encryptionSecretConfigured, true);
});

test('hosted single-user env preserves a non-enumerable provider secret through downstream layers', { concurrency: false }, async () => {
  const env = cloudflareLikeEnv();
  await call(env, '/api/health');
  if (globalThis.__canvasWorkerState?.providers) globalThis.__canvasWorkerState.providers = [];
  globalThis.__canvasProviderMigrationPromise = null;

  const saved = await call(env, '/api/providers', {
    method: 'POST',
    body: {
      id: 'cloudflare-secret-env-provider',
      name: 'Cloudflare Secret Env Provider',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'supplier-secret-key',
      models: [{ id: 'image-model', name: 'Image Model', modality: 'image' }]
    }
  });

  assert.equal(saved.response.status, 200, JSON.stringify(saved.data));
  assert.equal(saved.data.provider.id, 'cloudflare-secret-env-provider');
  assert.equal(saved.data.provider.hasApiKey, true);
  const stored = globalThis.__canvasWorkerState.providers.find(item => item.id === 'cloudflare-secret-env-provider');
  assert.ok(stored);
  assert.equal(stored.apiKey, undefined);
  assert.match(String(stored.apiKeyEncrypted || ''), /^v1\./);
});
