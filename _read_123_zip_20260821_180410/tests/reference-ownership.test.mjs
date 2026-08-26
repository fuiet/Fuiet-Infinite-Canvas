import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/final-entry.js';

const BASE = 'https://canvas.example.test';
const OWNER_A = '55555555-5555-4555-8555-555555555555';
const OWNER_B = '66666666-6666-4666-8666-666666666666';

function env(owner) {
  return {
    PROVIDER_SECRET_KEY: 'reference-owner-test-key',
    CANVAS_ENFORCE_OWNER: '1',
    CANVAS_OWNER_ID: owner,
    CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '1',
    CANVAS_CLAIM_UNOWNED: '0'
  };
}

async function call(currentEnv, path, { method = 'GET', body, headers = {} } = {}) {
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
  }), currentEnv, { waitUntil() {} });
  return { response, data: await response.clone().json().catch(() => null) };
}

async function reset() {
  await call(env(OWNER_A), '/api/health');
  const state = globalThis.__canvasWorkerState;
  state.providers = [{
    id: 'provider-a',
    ownerId: OWNER_A,
    name: 'Provider A',
    baseUrl: 'https://api.example.com/v1',
    apiKeyEncrypted: 'v1.invalid.invalid',
    models: [{ id: 'image-model', modality: 'image' }]
  }];
  state.tasks = [];
  state.projects = [];
  state.media = new Map();
  globalThis.__canvasMediaOwners = new Map([
    ['owner-a.png', OWNER_A],
    ['owner-b.png', OWNER_B]
  ]);
}

test('task cannot reference another owner local media path', { concurrency: false }, async () => {
  await reset();
  const result = await call(env(OWNER_A), '/api/tasks', {
    method: 'POST',
    body: {
      providerId: 'provider-a',
      modelId: 'image-model',
      nodeType: 'image',
      prompt: 'test',
      references: [{ type: 'image', url: '/media/owner-b.png' }]
    }
  });
  assert.equal(result.response.status, 404);
  assert.match(result.data.error, /参考媒体不存在|当前用户/);
  assert.equal(globalThis.__canvasWorkerState.tasks.length, 0);
});

test('nested local media parameters are ownership checked too', { concurrency: false }, async () => {
  await reset();
  const result = await call(env(OWNER_A), '/api/tasks', {
    method: 'POST',
    body: {
      providerId: 'provider-a',
      modelId: 'image-model',
      nodeType: 'image',
      prompt: 'test',
      parameters: { firstFrameUrl: '/media/owner-b.png' }
    }
  });
  assert.equal(result.response.status, 404);
  assert.match(result.data.error, /参考媒体不存在|当前用户/);
});
