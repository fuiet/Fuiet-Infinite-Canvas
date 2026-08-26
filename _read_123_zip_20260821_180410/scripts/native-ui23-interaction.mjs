import { readFileSync, writeFileSync } from 'node:fs';

const appPath = new URL('../app.js', import.meta.url);
const runtimePath = new URL('../ui-v23.js', import.meta.url);
const testPath = new URL('../tests/ui-design-system.test.mjs', import.meta.url);
let app = readFileSync(appPath, 'utf8');
let runtime = readFileSync(runtimePath, 'utf8');
let tests = readFileSync(testPath, 'utf8');

function replaceOnce(source, from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, got ${count}`);
  return source.replace(from, to);
}

// A real click opens Composer only for an empty node. Results stay selected and expose Context Toolbar.
app = replaceOnce(
  app,
  "    }else{expandedNodeId=finished.id;selectedId=finished.id;state.selectedIds=[finished.id];state.nodes.forEach(n=>n.selected=n.id===finished.id);}\n    render();",
  "    }else{const clicked=state.nodes.find(n=>n.id===finished.id);expandedNodeId=clicked&&uiV23NodeContentState(clicked)==='empty'?finished.id:null;selectedId=finished.id;state.selectedIds=[finished.id];state.nodes.forEach(n=>n.selected=n.id===finished.id);}\n    render();",
  'finishNodeDrag four-state routing'
);

// Starting generation closes Composer immediately. Empty nodes remain selected; result nodes return to Context Toolbar.
app = replaceOnce(
  app,
  "    $('#generateBtn').onclick=()=>generateForNode(n);$('#generationCostBtn')?.addEventListener('click',()=>openCostDetails([n.id]));",
  "    $('#generateBtn').onclick=()=>{expandedNodeId=null;generator.classList.add('hidden');renderToolbar();generateForNode(n).catch(()=>{})};$('#generationCostBtn')?.addEventListener('click',()=>openCostDetails([n.id]));",
  'generate button closes composer'
);
app = replaceOnce(
  app,
  "saveState();aiBreakdownScript(n)});",
  "saveState();expandedNodeId=null;generator.classList.add('hidden');renderToolbar();aiBreakdownScript(n)});",
  'script generation closes composer'
);

// Escape closes the active Node Composer without clearing the node selection.
app = replaceOnce(
  app,
  "    if(e.key==='Escape'&&marquee){e.preventDefault();cancelMarquee();return}\n    if(!isTypingTarget()&&!e.metaKey&&!e.ctrlKey&&!e.altKey){",
  "    if(e.key==='Escape'&&marquee){e.preventDefault();cancelMarquee();return}\n    if(e.key==='Escape'&&expandedNodeId){e.preventDefault();expandedNodeId=null;generator.classList.add('hidden');renderToolbar();return}\n    if(!isTypingTarget()&&!e.metaKey&&!e.ctrlKey&&!e.altKey){",
  'escape closes composer'
);

// ui-v23.js becomes an Asset Manager enhancement only. Node state, Composer, and Context Toolbar are app.js responsibilities.
const tailMarker = "  const setOpen = (open) => {";
const tailIndex = runtime.indexOf(tailMarker);
if (tailIndex < 0) throw new Error('asset manager tail marker not found');
let tail = runtime.slice(tailIndex);
tail = tail.replace(
  "    const state = node.getAttribute('data-content-state') || (nodeHasResult(node, type) ? 'result' : 'empty');",
  "    const state = node.getAttribute('data-content-state') || 'empty';"
);
const runtimeHeader = `(() => {
  const assetManagerBtn = document.getElementById('assetManagerBtn');
  const drawer = document.getElementById('drawer');
  const viewport = document.getElementById('canvasViewport');
  const nodeLayer = document.getElementById('nodeLayer');
  const contextMenu = document.getElementById('contextMenu');
  const legacyAssetAction = document.querySelector('#bottomDock [data-dock-action="asset"]');

  if (!drawer || !viewport || !nodeLayer) return;

  const NODE_TYPES = ['text', 'image', 'video', 'audio', 'script', 'director'];
  const TYPE_LABELS = { text:'文本', image:'图片', video:'视频', audio:'音频', script:'脚本', director:'导演台' };
  const TYPE_ICONS = { text:'▤', image:'▣', video:'▶', audio:'♫', script:'☰', director:'◇' };
  const nodeType = (node) => node.getAttribute('data-node-type') || NODE_TYPES.find((type) => node.classList.contains(\`node-\${type}\`)) || 'node';

`;
runtime = runtimeHeader + tail;

for (const forbidden of ['composerOverride','openResultComposer','RESULT_TOOLBAR_CONFIG','syncInteractionSurfaces','syncNodeState','nodeHasResult','generatorBelongsTo']) {
  if (runtime.includes(forbidden)) throw new Error(`legacy UI core remains in ui-v23.js: ${forbidden}`);
}

function replaceTest(name, body) {
  const start = tests.indexOf(`test('${name}'`);
  if (start < 0) throw new Error(`test not found: ${name}`);
  const next = tests.indexOf("\ntest('", start + 8);
  const end = next >= 0 ? next + 1 : tests.length;
  tests = tests.slice(0, start) + body.trimEnd() + '\n\n' + tests.slice(end);
}

replaceTest('app renderNode natively owns the universal four-state node model', `test('app renderNode natively owns the universal four-state node model', () => {
  const app = read('app.js');
  const runtime = read('ui-v23.js');
  assert.match(app, /function uiV23NodeContentState/);
  assert.match(app, /function uiV23TaskState/);
  assert.match(app, /el\\.dataset\\.contentState=contentState/);
  assert.match(app, /el\\.dataset\\.interactionState=interactionState/);
  assert.match(app, /el\\.dataset\\.taskState=taskState/);
  assert.match(app, /el\\.dataset\\.uiV23Native='true'/);
  assert.match(app, /ui-v23-result-shell/);
  assert.match(app, /ui-v23-media-result/);
  assert.doesNotMatch(runtime, /syncNodeState|nodeHasResult|data-task-state/);
});`);

replaceTest('result nodes use context toolbar by default and composer only by explicit user action', `test('result nodes use context toolbar by default and composer only by explicit user action', () => {
  const app = read('app.js');
  const runtime = read('ui-v23.js');
  assert.match(app, /uiV23NodeContentState\\(clicked\\)===\x27empty\x27\\?finished\\.id:null/);
  assert.match(app, /function openNativeResultComposer/);
  assert.match(app, /action:'edit-prompt'/);
  assert.match(app, /action:'rerun'/);
  assert.match(app, /contentState!==\x27result\x27\\|\\|expandedNodeId===n\\.id/);
  assert.match(app, /expandedNodeId=null;generator\\.classList\\.add\\(\x27hidden\x27\\);renderToolbar\\(\\);generateForNode/);
  assert.match(app, /e\\.key===\x27Escape\x27&&expandedNodeId/);
  assert.doesNotMatch(runtime, /composerOverride|openResultComposer|RESULT_TOOLBAR_CONFIG|syncInteractionSurfaces/);
});`);

replaceTest('result context toolbar is generated natively by media type', `test('result context toolbar is generated natively by media type', () => {
  const app = read('app.js');
  const runtime = read('ui-v23.js');
  const css = read('styles/context-toolbar.css');
  assert.match(app, /function nodeTopBarActions/);
  assert.match(app, /label:'编辑图片'/);
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
});`);

replaceTest('native nodes bypass legacy state decoration and no result decorator runtime remains', `test('ui-v23 is limited to asset manager enhancement', () => {
  const runtime = read('ui-v23.js');
  const connect = read('ui-connect-v23.js');
  assert.match(runtime, /assetManagerBtn/);
  assert.match(runtime, /buildCanvasPanel/);
  assert.match(runtime, /decorateAssetDrawer/);
  assert.doesNotMatch(runtime, /composerOverride|syncNodeState|syncInteractionSurfaces|RESULT_TOOLBAR_CONFIG|openResultComposer/);
  assert.doesNotMatch(connect, /ui-result-v23.js/);
});`);

writeFileSync(appPath, app, 'utf8');
writeFileSync(runtimePath, runtime, 'utf8');
writeFileSync(testPath, tests, 'utf8');
console.log('Native UI 2.3 interaction ownership migration applied');
