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

test('app renderNode natively owns the universal four-state node model', () => {
  const app = read('app.js');
  const runtime = read('ui-v23.js');
  assert.match(app, /function uiV23NodeContentState/);
  assert.match(app, /function uiV23TaskState/);
  assert.match(app, /el\.dataset\.contentState=contentState/);
  assert.match(app, /el\.dataset\.interactionState=interactionState/);
  assert.match(app, /el\.dataset\.taskState=taskState/);
  assert.match(app, /el\.dataset\.uiV23Native='true'/);
  assert.match(app, /ui-v23-result-shell/);
  assert.match(app, /ui-v23-media-result/);
  assert.doesNotMatch(runtime, /syncNodeState|nodeHasResult|data-task-state/);
});

test('result nodes use context toolbar by default and composer only by explicit user action', () => {
  const app = read('app.js');
  const runtime = read('ui-v23.js');
  assert.match(app, /uiV23NodeContentState\(clicked\)==='empty'\?finished\.id:null/);
  assert.match(app, /function openNativeResultComposer/);
  assert.match(app, /action:'edit-prompt'/);
  assert.match(app, /action:'rerun'/);
  assert.match(app, /contentState!=='result'\|\|expandedNodeId===n\.id/);
  assert.match(app, /expandedNodeId=null;generator\.classList\.add\('hidden'\);renderToolbar\(\);generateForNode/);
  assert.match(app, /e\.key==='Escape'&&expandedNodeId/);
  assert.doesNotMatch(runtime, /composerOverride|openResultComposer|RESULT_TOOLBAR_CONFIG|syncInteractionSurfaces/);
});

test('result context toolbar is generated natively by media type', () => {
  const app = read('app.js');
  const runtime = read('ui-v23.js');
  const css = read('styles/context-toolbar.css');
  assert.match(app, /function nodeTopBarActions/);
  assert.match(app, /label:'人像后期调节'/);
  assert.match(app, /label:'全景'/);
  assert.match(app, /label:'多角度'/);
  assert.match(app, /label:'打光'/);
  assert.match(app, /label:'九宫格'/);
  assert.match(app, /label:'高清'/);
  assert.match(app, /label:'编辑视频'/);
  assert.match(app, /label:'截取'/);
  assert.match(app, /label:'编辑脚本'/);
  assert.match(app, /label:'打开导演台'/);
  assert.ok(app.includes("$$('[data-top-action]',toolbar).forEach"));
  assert.doesNotMatch(runtime, /decorateContextToolbar|createContextAction/);
  assert.match(css, /node-toolbar-image/);
  assert.match(css, /node-toolbar-video/);
  assert.match(css, /node-toolbar-audio/);
  assert.match(css, /node-toolbar-script/);
  assert.match(css, /node-toolbar-director/);
});

test('result selection no longer forces image nodes to 640px', () => {
  const app = read('app.js');
  const nodes = read('styles/nodes.css');
  assert.doesNotMatch(app, /bigImage\?640/);
  assert.match(app, /el\.style\.width=\(n\.w\|\|320\)/);
  assert.doesNotMatch(nodes, /width:420px!important/);
  assert.doesNotMatch(nodes, /height:auto!important/);
  assert.doesNotMatch(nodes, /!important/);
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

test('generation progress is native, visible, and never fabricates a minimum percentage', () => {
  const app = read('app.js');
  const css = read('styles/result-shell.css');
  const desktop = read('styles/desktop.css');
  assert.match(app, /function uiV23ProgressHtml/);
  assert.match(app, /hasRealProgress/);
  assert.match(app, /indeterminate/);
  assert.doesNotMatch(app, /Math\.max\(visualStatus==='pending'\?4:8/);
  assert.match(css, /ui-v23-result-progress\.indeterminate/);
  assert.match(desktop, /wf-hud-meta/);
  assert.match(desktop, /wf-hud-actions/);
  assert.match(desktop, /display:none/);
});

test('result-first shell and media metadata are emitted by app.js', () => {
  const app = read('app.js');
  const html = read('index.html');
  const connect = read('ui-connect-v23.js');
  const css = read('styles/result-shell.css');
  assert.ok(html.includes('styles/result-shell.css'));
  assert.doesNotMatch(connect, /ui-result-v23.js/);
  assert.match(app, /ui-v23-media-result/);
  assert.match(app, /ui-v23-version-nav/);
  assert.match(app, /data-version-count/);
  assert.match(app, /function uiV23BindMediaMetadata/);
  assert.match(app, /data-node-result-meta/);
  assert.match(app, /videoWidth/);
  assert.match(app, /naturalWidth/);
  assert.match(app, /loadedmetadata/);
  assert.match(css, /ui-v23-version-nav/);
  assert.match(css, /ui-v23-resize-handle/);
  assert.match(css, /node.ui-v23-media-result/);
});

test('ui-v23 is limited to asset manager enhancement', () => {
  const runtime = read('ui-v23.js');
  const connect = read('ui-connect-v23.js');
  assert.match(runtime, /assetManagerBtn/);
  assert.match(runtime, /buildCanvasPanel/);
  assert.match(runtime, /decorateAssetDrawer/);
  assert.doesNotMatch(runtime, /composerOverride|syncNodeState|syncInteractionSurfaces|RESULT_TOOLBAR_CONFIG|openResultComposer/);
  assert.doesNotMatch(connect, /ui-result-v23.js/);
});

test('native result toolbar binds every generated action', () => {
  const app = read('app.js');
  assert.ok(app.includes("$$('[data-multi-top]',toolbar).forEach"));
  assert.ok(app.includes("$$('[data-top-action]',toolbar).forEach"));
});


test('legacy scaffold no longer owns core node, toolbar or composer visuals', () => {
  const legacy = read('styles.css');
  assert.doesNotMatch(legacy, /\.node\{position:absolute;width:320px;min-height:180px;background:#1b1d21/);
  assert.doesNotMatch(legacy, /\.node-toolbar\{position:absolute;z-index:90/);
  assert.doesNotMatch(legacy, /\.generator-panel\{position:absolute;z-index:89;width:420px/);
  assert.doesNotMatch(legacy, /\.node\{background:#252628/);
  assert.doesNotMatch(legacy, /\.node-footer\{display:none!important/);
  assert.doesNotMatch(legacy, /@media \(max-width:900px\)\{\.bottom-center-hint/);
  assert.match(read('styles/nodes.css'), /Universal Four-State Node Model/);
  assert.match(read('styles/composer.css'), /\.generator-panel\{position:absolute/);
  assert.match(read('styles/context-toolbar.css'), /\.node-toolbar\{position:absolute/);
});
