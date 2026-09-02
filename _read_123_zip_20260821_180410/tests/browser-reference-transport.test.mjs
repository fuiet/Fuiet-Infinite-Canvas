import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sw = fs.readFileSync(new URL('../browser-media-sw.js', import.meta.url), 'utf8');
const controller = fs.readFileSync(new URL('../browser-media-controller-v2.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../browser-bootstrap.js', import.meta.url), 'utf8');

test('service worker rewrites browser-local media inside provider proxy JSON', () => {
  assert.match(sw, /function browserMediaId\(value\)/);
  assert.match(sw, /async function portableReference\(value\)/);
  assert.match(sw, /async function rewriteProxyRequest\(request\)/);
  assert.match(sw, /bodyType!=='text'/);
  assert.match(sw, /BROWSER_REFERENCE_TRANSPORT_FAILED/);
});

test('service worker never needs to send __browser_media paths to upstream JSON requests', () => {
  assert.match(sw, /async function rewriteJsonRequest\(request\)/);
  assert.match(sw, /const rewritten=await mapNestedStrings\(body\)/);
  assert.match(sw, /MAX_INLINE_REFERENCE_BYTES=20\*1024\*1024/);
});

test('browser bootstrap forces the new media worker revision', () => {
  assert.match(controller, /20260902-reference-transport-3/);
  assert.match(bootstrap, /20260902-reference-transport-3/);
});
