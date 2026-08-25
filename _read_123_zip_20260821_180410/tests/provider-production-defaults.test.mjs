import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/final-entry.js';

const OWNER = '77777777-7777-4777-8777-777777777777';
const ENV = {
  PROVIDER_SECRET_KEY: 'provider-defaults-test-key',
  CANVAS_ENFORCE_OWNER: '1',
  CANVAS_OWNER_ID: OWNER,
  CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '1'
};

async function call(body) {
  const response = await worker.fetch(new Request('https://canvas.example.test/api/providers', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }), ENV, { waitUntil() {} });
  return { response, data: await response.json() };
}

test('new production providers default to data-url references and cannot enable private hosts', { concurrency: false }, async () => {
  await worker.fetch(new Request('https://canvas.example.test/api/health'), ENV, { waitUntil() {} });
  globalThis.__canvasWorkerState.providers = [];
  globalThis.__canvasProviderMigrationPromise = null;

  const result = await call({
    id: 'safe-default-provider',
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'secret',
    allowPrivateHosts: true,
    models: [{ id: 'm', name: 'm', modality: 'image' }]
  });

  assert.equal(result.response.status, 200);
  const stored = globalThis.__canvasWorkerState.providers.find(x => x.id === 'safe-default-provider');
  assert.equal(stored.referenceTransport, 'data-url');
  assert.equal(stored.allowPrivateHosts, false);
  assert.equal(result.data.provider.ownerId, undefined);
});
