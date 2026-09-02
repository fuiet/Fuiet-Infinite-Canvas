import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  effectiveTransport,
  createReferenceAwareFetch
} = require('../desktop-reference-media-transport.cjs');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fuiet-ref-transport-'));
  const mediaDir = path.join(root, 'media');
  fs.mkdirSync(mediaDir, { recursive: true });
  fs.writeFileSync(path.join(mediaDir, 'media_test.png'), Buffer.from([0x89,0x50,0x4e,0x47,1,2,3,4]));
  return { root, mediaDir };
}

const xogpuProvider = {
  id: 'xogpu',
  name: 'XOGPU',
  baseUrl: 'https://xogpu.com/v1',
  referenceTransport: 'auto',
  models: [{
    id: 'MiniMax-H3',
    name: 'MiniMax H3',
    referenceTransport: 'url'
  }]
};

test('model reference transport overrides provider auto transport', () => {
  assert.equal(effectiveTransport(xogpuProvider, xogpuProvider.models[0]), 'url');
});

test('url-only model never leaks local /media path to provider', async () => {
  const { root } = fixture();
  let delegated = false;
  const fakeFetch = async () => { delegated = true; return new Response('{}', { status: 200 }); };
  const wrapped = createReferenceAwareFetch({
    dataDir: root,
    fetchImpl: fakeFetch,
    loadProviders: () => [xogpuProvider],
    logger: { info() {} }
  });

  await assert.rejects(
    wrapped('https://xogpu.com/v1/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer secret' },
      body: JSON.stringify({ model: 'MiniMax-H3', content: [{ type: 'image_url', image_url: { url: '/media/media_test.png' } }] })
    }),
    /要求公网 URL 参考素材/
  );
  assert.equal(delegated, false);
});

test('data-url model converts local media before provider request', async () => {
  const { root } = fixture();
  const provider = {
    id: 'data-provider',
    baseUrl: 'https://example.com/v1',
    models: [{ id: 'video-data', referenceTransport: 'data-url' }]
  };
  let sentBody = null;
  const wrapped = createReferenceAwareFetch({
    dataDir: root,
    loadProviders: () => [provider],
    logger: { info() {} },
    fetchImpl: async (_url, init) => {
      sentBody = JSON.parse(init.body);
      return new Response('{}', { status: 200 });
    }
  });

  await wrapped('https://example.com/v1/videos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'video-data', image: '/media/media_test.png' })
  });

  assert.match(sentBody.image, /^data:image\/png;base64,/);
  assert.equal(sentBody.image.includes('/media/'), false);
});

test('url-only model uploads local media when provider upload endpoint is configured', async () => {
  const { root } = fixture();
  const provider = {
    ...xogpuProvider,
    uploadPath: '/v1/files',
    uploadFileField: 'file',
    uploadOutputPath: 'data.url'
  };
  const calls = [];
  const wrapped = createReferenceAwareFetch({
    dataDir: root,
    loadProviders: () => [provider],
    logger: { info() {} },
    fetchImpl: async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/v1/files')) {
        return new Response(JSON.stringify({ data: { url: 'https://cdn.example.com/reference.png' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }
      return new Response('{}', { status: 200 });
    }
  });

  await wrapped('https://xogpu.com/v1/videos', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer secret' },
    body: JSON.stringify({ model: 'MiniMax-H3', content: [{ type: 'image_url', image_url: { url: '/media/media_test.png' } }] })
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://xogpu.com/v1/files');
  const finalBody = JSON.parse(calls[1].init.body);
  assert.equal(finalBody.content[0].image_url.url, 'https://cdn.example.com/reference.png');
});
