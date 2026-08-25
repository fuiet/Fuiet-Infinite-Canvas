import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/secure-index.js';

const BASE = 'https://canvas.example.test';
const env = { PROVIDER_SECRET_KEY: 'test-only-secret-key', CANVAS_TASK_CONCURRENCY: '1' };

function makeCtx() {
  const pending = [];
  return {
    pending,
    waitUntil(promise) { pending.push(Promise.resolve(promise)); },
    async flush() { await Promise.allSettled(pending.splice(0)); }
  };
}

async function call(path, { method = 'GET', body, headers = {} } = {}, ctx = makeCtx()) {
  const request = new Request(`${BASE}${path}`, {
    method,
    headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const response = await worker.fetch(request, env, ctx);
  return { response, data: await response.json().catch(() => null), ctx };
}

async function resetState() {
  await call('/api/health');
  const state = globalThis.__canvasWorkerState;
  state.providers = [];
  state.tasks = [];
  state.__secureQueue = { running: 0, active: new Set() };
  return state;
}

test('provider public response never exposes API key or auth headers', { concurrency: false }, async () => {
  await resetState();
  const created = await call('/api/providers', {
    method: 'POST',
    body: {
      name: 'Test Provider',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'super-secret-key',
      defaultHeaders: { Authorization: 'Bearer header-secret', 'X-Trace': 'ok' },
      models: [{ id: 'gpt-image-test', name: 'Image', modality: 'image', extraHeaders: { 'x-api-key': 'model-secret', 'X-Model': 'ok' } }]
    }
  });
  assert.equal(created.response.status, 200);
  const listed = await call('/api/providers');
  const text = JSON.stringify(listed.data);
  assert.equal(text.includes('super-secret-key'), false);
  assert.equal(text.includes('header-secret'), false);
  assert.equal(text.includes('model-secret'), false);
  assert.equal(listed.data.providers[0].hasApiKey, true);
});

test('/api/tasks/poll accepts only { taskId }', { concurrency: false }, async () => {
  await resetState();
  const bad = await call('/api/tasks/poll', { method: 'POST', body: { task: { id: 'x', payload: { _upstream: { pollPath: 'http://127.0.0.1/' } } } } });
  assert.equal(bad.response.status, 400);
  assert.match(bad.data.error, /只接受 \{ taskId \}/);
});

test('SSRF guard blocks private provider base URL', { concurrency: false }, async () => {
  await resetState();
  const result = await call('/api/providers', {
    method: 'POST',
    body: { baseUrl: 'http://127.0.0.1:8080/v1', apiKey: 'x', models: [{ id: 'm', modality: 'text' }] }
  });
  assert.equal(result.response.status, 500);
  assert.match(result.data.error, /私有|保留|本机/);
});

test('Cloudflare media process endpoint cannot return fake success', { concurrency: false }, async () => {
  await resetState();
  const result = await call('/api/media/process', { method: 'POST', body: { sourceUrl: '/media/test.mp4', operation: 'media-probe' } });
  assert.equal(result.response.status, 501);
  assert.equal(result.data.ok, false);
});

test('video creation uses provider videoProtocolConfig and POSTs only once', { concurrency: false }, async () => {
  const state = await resetState();
  state.providers.push({
    id: 'provider_video',
    name: 'Video Provider',
    baseUrl: 'https://video.example.com/v1',
    apiKey: 'legacy-runtime-key',
    authHeader: 'Authorization',
    authScheme: 'Bearer',
    downloadOutputs: false,
    videoProtocolConfig: {
      createPath: '/v1/custom/videos',
      pollPath: '/v1/custom/videos/{{taskId}}',
      statusPath: 'status',
      outputPath: 'result.url'
    },
    models: [{ id: 'video-model', name: 'Video', modality: 'video' }]
  });

  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET' });
    if (String(url).includes('/v1/custom/videos')) {
      return new Response(JSON.stringify({ id: 'upstream-123' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`unexpected fetch ${url}`);
  };

  try {
    const ctx = makeCtx();
    const created = await call('/api/tasks', {
      method: 'POST',
      body: { providerId: 'provider_video', modelId: 'video-model', nodeType: 'video', prompt: 'test', parameters: { duration: 5, ratio: '16:9' }, maxRetries: 0 }
    }, ctx);
    assert.equal(created.response.status, 202);
    await ctx.flush();
    const upstreamPosts = calls.filter(item => item.method === 'POST');
    assert.equal(upstreamPosts.length, 1);
    assert.match(upstreamPosts[0].url, /\/v1\/custom\/videos$/);
    assert.equal(calls.some(item => item.url.includes('/v1/tasks/')), false);
    const task = globalThis.__canvasWorkerState.tasks.find(item => item.id === created.data.task.id);
    assert.equal(task.status, 'polling');
    assert.equal(task.payload._upstream.taskId, 'upstream-123');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
