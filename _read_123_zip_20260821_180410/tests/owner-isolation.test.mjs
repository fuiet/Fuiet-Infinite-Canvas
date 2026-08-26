import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/final-entry.js';

const BASE = 'https://canvas.example.test';
const OWNER_A = '11111111-1111-4111-8111-111111111111';
const OWNER_B = '22222222-2222-4222-8222-222222222222';

function envFor(owner, extra = {}) {
  return {
    PROVIDER_SECRET_KEY: 'owner-isolation-test-key',
    CANVAS_ENFORCE_OWNER: '1',
    CANVAS_OWNER_ID: owner,
    CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '1',
    CANVAS_CLAIM_UNOWNED: '0',
    CANVAS_TASK_CONCURRENCY: '1',
    ...extra
  };
}

function makeCtx() {
  const pending = [];
  return {
    pending,
    waitUntil(promise) { pending.push(Promise.resolve(promise)); },
    async flush() { await Promise.allSettled(pending.splice(0)); }
  };
}

async function call(env, path, { method = 'GET', body, rawBody, headers = {} } = {}, ctx = makeCtx()) {
  let requestBody;
  const requestHeaders = new Headers(headers);
  if (body !== undefined) {
    requestHeaders.set('content-type', 'application/json');
    requestBody = JSON.stringify(body);
  } else if (rawBody !== undefined) {
    requestBody = rawBody;
  }
  const request = new Request(`${BASE}${path}`, {
    method,
    headers: requestHeaders,
    body: requestBody
  });
  const response = await worker.fetch(request, env, ctx);
  const contentType = String(response.headers.get('content-type') || '');
  const data = contentType.includes('json') ? await response.clone().json().catch(() => null) : null;
  return { response, data, ctx };
}

async function resetState() {
  await call(envFor(OWNER_A), '/api/health');
  const state = globalThis.__canvasWorkerState;
  state.providers = [];
  state.projects = [];
  state.tasks = [];
  state.media = new Map();
  state.__secureQueue = { running: 0, active: new Set() };
  globalThis.__canvasMediaOwners = new Map();
  globalThis.__canvasProviderMigrationPromise = null;
  return state;
}

async function createProvider(env, id, modelId = 'text-model') {
  const result = await call(env, '/api/providers', {
    method: 'POST',
    body: {
      id,
      name: id,
      baseUrl: 'https://api.example.com/v1',
      apiKey: `${id}-secret`,
      models: [{ id: modelId, name: modelId, modality: 'text' }]
    }
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.data.provider.ownerId, undefined);
  return result.data.provider;
}

test('providers are isolated by owner in the same worker state', { concurrency: false }, async () => {
  await resetState();
  await createProvider(envFor(OWNER_A), 'provider-a');
  await createProvider(envFor(OWNER_B), 'provider-b');

  const listA = await call(envFor(OWNER_A), '/api/providers');
  const listB = await call(envFor(OWNER_B), '/api/providers');

  assert.deepEqual(listA.data.providers.map(x => x.id), ['provider-a']);
  assert.deepEqual(listB.data.providers.map(x => x.id), ['provider-b']);
  assert.equal(JSON.stringify(listA.data).includes('provider-b-secret'), false);
});

test('one owner cannot create a task with another owner provider', { concurrency: false }, async () => {
  await resetState();
  await createProvider(envFor(OWNER_A), 'provider-a');

  const denied = await call(envFor(OWNER_B), '/api/tasks', {
    method: 'POST',
    body: {
      providerId: 'provider-a',
      modelId: 'text-model',
      nodeType: 'text',
      prompt: 'should not run'
    }
  });

  assert.equal(denied.response.status, 404);
  assert.match(denied.data.error, /供应商不存在/);
});

test('task reads are owner checked before reaching the inner worker', { concurrency: false }, async () => {
  const state = await resetState();
  state.tasks.push({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    status: 'queued',
    progress: 0,
    providerId: 'provider-a',
    modelId: 'm',
    nodeType: 'text',
    payload: { ownerId: OWNER_A },
    output: null,
    error: null
  });

  const own = await call(envFor(OWNER_A), '/api/tasks/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  const other = await call(envFor(OWNER_B), '/api/tasks/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

  assert.equal(own.response.status, 200);
  assert.equal(other.response.status, 404);
  assert.equal(own.data.task.payload.ownerId, undefined);
});

test('projects use single-row owner-aware persistence semantics', { concurrency: false }, async () => {
  await resetState();
  const createdA = await call(envFor(OWNER_A), '/api/projects', {
    method: 'POST', body: { name: 'A project', data: { nodes: [1] } }
  });
  const createdB = await call(envFor(OWNER_B), '/api/projects', {
    method: 'POST', body: { name: 'B project', data: { nodes: [2] } }
  });
  assert.equal(createdA.response.status, 201);
  assert.equal(createdB.response.status, 201);

  const listA = await call(envFor(OWNER_A), '/api/projects');
  const listB = await call(envFor(OWNER_B), '/api/projects');
  assert.deepEqual(listA.data.projects.map(x => x.name), ['A project']);
  assert.deepEqual(listB.data.projects.map(x => x.name), ['B project']);

  const denied = await call(envFor(OWNER_B), `/api/projects/${encodeURIComponent(createdA.data.project.id)}`);
  assert.equal(denied.response.status, 404);
});

test('uploaded media is private to its owner and no longer publicly cacheable', { concurrency: false }, async () => {
  await resetState();
  const uploaded = await call(envFor(OWNER_A), '/api/upload?name=test.png', {
    method: 'POST',
    rawBody: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    headers: { 'content-type': 'image/png', 'content-length': '8' }
  });
  assert.equal(uploaded.response.status, 201);
  const url = uploaded.data.url;

  const own = await call(envFor(OWNER_A), url);
  const other = await call(envFor(OWNER_B), url);
  assert.equal(own.response.status, 200);
  assert.equal(other.response.status, 404);
  assert.match(own.response.headers.get('cache-control') || '', /private/i);
});

test('owner enforcement refuses unsafe legacy plaintext keys without encryption key', { concurrency: false }, async () => {
  const state = await resetState();
  state.providers.push({
    id: 'legacy-plain',
    ownerId: OWNER_A,
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'plaintext-secret',
    models: [{ id: 'm', modality: 'text' }]
  });
  globalThis.__canvasProviderMigrationPromise = null;

  const unsafeEnv = envFor(OWNER_A);
  delete unsafeEnv.PROVIDER_SECRET_KEY;
  const result = await call(unsafeEnv, '/api/providers');
  assert.equal(result.response.status, 503);
  assert.match(result.data.error, /PROVIDER_SECRET_KEY|明文/);
});
