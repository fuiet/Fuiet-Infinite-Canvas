import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('canvas loads the UI 2.3 visual stack after a quarantined legacy scaffold', () => {
  const html = read('index.html');
  const legacyLayer = read('styles/legacy-layer.css');
  assert.match(html, /styles\/legacy-layer\.css/);
  assert.doesNotMatch(html, /href="\.\/styles\.css"/);
  assert.match(legacyLayer, /styles\.css/);
  assert.match(legacyLayer, /layer\(legacy-scaffold\)/);
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

test('result nodes use context toolbar by default and composer only by explicit user action', () => {
  const runtime = read('ui-v23.js');
  assert.match(runtime, /composerOverride/);
  assert.match(runtime, /openResultComposer/);
  assert.match(runtime, /uiV23EditPrompt/);
  assert.match(runtime, /uiV23Rerun/);
  assert.match(runtime, /改提示词/);
  assert.match(runtime, /重新生成/);
  assert.match(runtime, /generator\?\.classList\.add\('hidden'\)/);
  assert.match(runtime, /toolbar\.classList\.remove\('hidden'\)/);
});

test('result context toolbar is pruned by media type instead of exposing one generic action set', () => {
  const runtime = read('ui-v23.js');
  const css = read('styles/context-toolbar.css');
  assert.match(runtime, /RESULT_TOOLBAR_CONFIG/);
  assert.match(runtime, /keep: \['编辑', '转视频', '高清', '更多'\]/);
  assert.match(runtime, /keep: \['视频工作台', '续写', '合成', '更多'\]/);
  assert.match(runtime, /keep: \['截取', '变速', '切分', '更多'\]/);
  assert.match(runtime, /keep: \['脚本', '看板', '批量生成', '更多'\]/);
  assert.match(runtime, /keep: \['导演台', '截图', '更多'\]/);
  assert.match(runtime, /button\.remove\(\)/);
  assert.match(runtime, /node-toolbar-\$\{candidate\}/);
  assert.match(css, /node-toolbar-image/);
  assert.match(css, /node-toolbar-video/);
  assert.match(css, /node-toolbar-audio/);
  assert.match(css, /node-toolbar-script/);
  assert.match(css, /node-toolbar-director/);
});

test('result selection does not use forced CSS resizing', () => {
  const nodes = read('styles/nodes.css');
  assert.doesNotMatch(nodes, /width:420px!important/);
  assert.doesNotMatch(nodes, /height:auto!important/);
  assert.doesNotMatch(nodes, /!important/);
  assert.match(read('ui-v23.js'), /resultSizeCache/);
});

test('asset manager implements canvas and asset tabs', () => {
  const runtime = read('ui-v23.js');
  assert.match(runtime, /data-asset-tab="canvas"/);
  assert.match(runtime, /data-asset-tab="assets"/);
  assert.match(runtime, /buildCanvasPanel/);
  assert.match(runtime, /decorateAssetDrawer/);
});

test('bottom dock exposes a dedicated connect mode and reuses port drag mechanics', () => {
  const html = read('index.html');
  const runtime = read('ui-connect-v23.js');
  const css = read('styles/connections.css');
  assert.match(html, /data-dock-action="connect"/);
  assert.match(html, /ui-connect-v23\.js/);
  assert.doesNotMatch(html, /data-dock-action="workflow"/);
  assert.match(runtime, /setConnectMode/);
  assert.match(runtime, /node-port\.out/);
  assert.match(runtime, /拖动节点右侧/);
  assert.match(css, /ui-connect-mode/);
});

test('generated progress remains visible on the node while task infrastructure is hidden', () => {
  const nodes = read('styles/nodes.css');
  const desktop = read('styles/desktop.css');
  assert.match(nodes, /node-task-progress/);
  assert.match(nodes, /--ui-running/);
  assert.match(desktop, /wf-hud-meta/);
  assert.match(desktop, /wf-hud-actions/);
  assert.match(desktop, /display:none/);
});

test('result-first shell makes media the node and keeps task internals out of the visible result state', () => {
  const bootstrap = read('ui-connect-v23.js');
  const runtime = read('ui-result-v23.js');
  const css = read('styles/result-shell.css');
  assert.match(bootstrap, /result-shell\.css/);
  assert.match(bootstrap, /ui-result-v23\.js/);
  assert.match(runtime, /ui-v23-media-result/);
  assert.match(runtime, /node-content-video/);
  assert.match(runtime, /actualProgress/);
  assert.match(runtime, /percent == null/);
  assert.match(runtime, /生成失败/);
  assert.match(runtime, /重新生成/);
  assert.match(runtime, /data-ui-v23-result-meta/);
  assert.match(runtime, /versionCount/);
  assert.match(css, /ui-v23-result-progress\.indeterminate/);
  assert.match(css, /ui-v23-version-nav/);
  assert.match(css, /ui-v23-resize-handle/);
  assert.match(css, /node\.ui-v23-media-result/);
});
