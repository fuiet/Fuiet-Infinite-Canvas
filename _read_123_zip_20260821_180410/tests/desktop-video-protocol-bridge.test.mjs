import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  mapDesktopXogpuRequest,
  operationFromReferences
} = require('../desktop-video-protocol-bridge.cjs');

test('desktop XOGPU mapper preserves local reference for transport layer', () => {
  const body = mapDesktopXogpuRequest(
    { id: 'MiniMax-H3', name: 'MiniMax H3' },
    { prompt: '让角色向前走', parameters: { duration: 5, aspectRatio: '16:9' } },
    [{ type: 'image', role: 'first_frame', url: '/media/media_test.png' }],
    'image-to-video'
  );

  assert.equal(body.model, 'MiniMax-H3');
  assert.equal(body.duration, 5);
  assert.equal(body.content[1].type, 'image_url');
  assert.equal(body.content[1].role, 'first_frame');
  assert.equal(body.content[1].image_url.url, '/media/media_test.png');
});

test('desktop XOGPU mapper also accepts prepared data URL references', () => {
  const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
  const body = mapDesktopXogpuRequest(
    { id: 'MiniMax-H3' },
    { prompt: '镜头缓慢推进', parameters: { duration: 6 } },
    [{ type: 'image', role: 'image_reference', url: dataUrl }],
    'image-to-video'
  );
  assert.equal(body.content[1].image_url.url, dataUrl);
});

test('operation detection still distinguishes first-last frame mode', () => {
  const operation = operationFromReferences([
    { type: 'image', role: 'first_frame', url: '/media/a.png' },
    { type: 'image', role: 'last_frame', url: '/media/b.png' }
  ], {});
  assert.equal(operation, 'first-last-frame');
});
