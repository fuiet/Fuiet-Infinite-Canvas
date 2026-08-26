import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('canvas loads only the UI 2.3 visual stack after the legacy scaffold', () => {
  const html = read('index.html');
  assert.match(html, /styles\/tokens\.css/);
  assert.match(html, /styles\/nodes\.css/);
  assert.match(html, /styles\/asset-manager\.css/);
  assert.match(html, /ui-v23\.js/);
  assert.doesNotMatch(html, /canvas-ui-v1\.css/);
  assert.doesNotMatch(html, /canvas-ui-v2\.css/);
  assert.doesNotMatch(html, /workspace-canvas-v3\.css/);
  assert.doesNotMatch(html, /ui-type-v2\.css/);
});

test('UI 2.3 keeps assets in the bottom-left status area instead of a permanent sidebar tool', () => {
  const html = read('index.html');
  const css = read('styles/desktop.css');
  assert.match(html, /id="assetManagerBtn"/);
  assert.match(html, /aria-controls="drawer"/);
  assert.match(css, /data-dock-action="asset"/);
  assert.match(css, /display:none/);
});

test('universal node runtime exposes the four-state content and interaction model', () => {
  const runtime = read('ui-v23.js');
  assert.match(runtime, /data-content-state/);
  assert.match(runtime, /data-interaction-state/);
  assert.match(runtime, /data-task-state/);
  assert.match(runtime, /nodeHasResult/);
  assert.match(runtime, /empty/);
  assert.match(runtime, /result/);
  assert.match(runtime, /selected/);
});

test('asset manager implements canvas and asset tabs', () => {
  const runtime = read('ui-v23.js');
  assert.match(runtime, /data-asset-tab="canvas"/);
  assert.match(runtime, /data-asset-tab="assets"/);
  assert.match(runtime, /buildCanvasPanel/);
  assert.match(runtime, /decorateAssetDrawer/);
});

test('generated progress remains visible on the node while task infrastructure is hidden', () => {
  const nodes = read('styles/nodes.css');
  const desktop = read('styles/desktop.css');
  assert.match(nodes, /node-task-progress/);
  assert.match(nodes, /--ui-running/);
  assert.match(desktop, /wf-hud-meta/);
  assert.match(desktop, /wf-hud-actions/);
  assert.match(desktop, /display:none!important/);
});
