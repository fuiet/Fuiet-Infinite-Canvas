import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('text node stylesheet remains a dedicated UI 2.3 component layer', () => {
  const html = read('index.html');
  assert.match(html, /styles\/text-node\.css/);
});

test('text node empty state exposes exactly three quick actions', () => {
  const app = read('app.js');
  assert.match(app, /n\.textEditing/);
  assert.match(app, /text-node-shell has-text/);
  assert.match(app, /text-node-shell is-empty/);
  assert.match(app, /data-text-quick="manual"/);
  assert.match(app, /data-text-quick="video"/);
  assert.match(app, /data-text-quick="image"/);
  assert.doesNotMatch(app, /data-text-quick="audio"/);
});

test('manual writing switches to a rich text editor with the reference toolbar', () => {
  const app = read('app.js');
  const css = read('styles/text-node.css');
  assert.match(app, /contenteditable=\"true\"/);
  assert.match(app, /function renderManualTextToolbar/);
  assert.match(app, /data-text-format=\"h1\"/);
  assert.match(app, /data-text-format=\"bold\"/);
  assert.match(app, /data-text-format=\"bullet\"/);
  assert.match(app, /data-text-format=\"copy\"/);
  assert.match(app, /n\?\.type==='text'&&n\.textInputMode==='manual'&&n\.textEditing/);
  assert.match(css, /node-toolbar-text-editor/);
  assert.match(css, /text-node-editing/);
});

test('selected text results expose text-specific creator transforms', () => {
  const app = read('app.js');
  assert.match(app, /if\(n\.type==='text'\)return\[\{label:'改写'.*text-rewrite/);
  assert.match(app, /label:'扩写'.*text-expand/);
  assert.match(app, /label:'精简'.*text-simplify/);
  assert.match(app, /label:'翻译'.*text-translate/);
  assert.match(app, /label:'文生图'.*text-image/);
  assert.match(app, /label:'文生视频'.*text-video/);
  assert.doesNotMatch(app, /if\(n\.type==='text'\)return\[\{label:'复制'/);
});

test('text result transforms branch to new nodes instead of mutating the result in place', () => {
  const app = read('app.js');
  assert.match(app, /function branchTextResult/);
  assert.match(app, /const next=addNode\(targetType/);
  assert.match(app, /sourceNodeId:n\.id/);
  assert.match(app, /expandedNodeId=next\.id/);
  assert.match(app, /operation:'text_rewrite'/);
  assert.match(app, /operation:'text_expand'/);
  assert.match(app, /operation:'text_simplify'/);
  assert.match(app, /operation:'text_to_image'/);
  assert.match(app, /operation:'text_to_video'/);
});

test('translation asks for a target language before branching', () => {
  const app = read('app.js');
  assert.match(app, /function openTextTranslateMenu/);
  assert.match(app, /\['中文','zh'\]/);
  assert.match(app, /\['英文','en'\]/);
  assert.match(app, /\['日文','ja'\]/);
  assert.match(app, /\['韩文','ko'\]/);
  assert.match(app, /data-text-translate/);
});

test('text composer stays fixed in screen space and text styling is desktop-only', () => {
  const app = read('app.js');
  const css = read('styles/text-node.css');
  assert.match(app, /generator\.classList\.toggle\('text-generator',isText\)/);
  assert.match(css, /generator-panel\.text-generator/);
  assert.match(css, /width:594px!important/);
  assert.match(css, /height:142px!important/);
  assert.match(css, /var\(--ui-selected\)/);
  assert.doesNotMatch(css, /@media\s*\(max-width:/);
});

test('composer and contextual result toolbar remain mutually exclusive by default', () => {
  const app = read('app.js');
  assert.match(app, /contentState!=='result'\|\|expandedNodeId===n\.id/);
  assert.match(app, /if\(!expandedNodeId\)\{generator\.classList\.add\('hidden'\);return\}/);
});


test('text nodes remain stable across creation, selection, manual mode and deletion', () => {
  const app = read('app.js');
  const css = read('styles/text-node.css');
  assert.match(app, /n\.textInputMode='ai';n\.textEditing=false;n\.textEditorExpanded=false/);
  assert.match(app, /\['image','video','audio','script'\]\.includes\(created\.type\)/);
  assert.match(app, /else if\(created\?\.type==='text'\)expandedNodeId=null/);
  assert.match(app, /if\(n\.type==='text'&&n\.textInputMode!=='manual'\)n\.textEditing=false/);
  assert.match(app, /function selectManualTextNode/);
  assert.match(app, /pointerdown',e=>\{e\.stopPropagation\(\);selectManualTextNode\(n,el\)\}/);
  assert.match(app, /e\.currentTarget\.blur\(\)/);
  assert.match(app, /active\?\.matches\?\.\('\[data-text-manual\]'\)\)active\.blur\(\)/);
  assert.match(app, /n\.w=560/);
  assert.match(app, /n\.h=320/);
  assert.match(css, /\.node\.node-text\.text-node-editing\{\s*min-height:320px/);
});


test('manual text mode shows an empty prompt and enters editing only on double click', () => {
  const app = read('app.js');
  const css = read('styles/text-node.css');
  assert.match(app, /请编写内容，开始你的创作。/);
  assert.match(app, /text-manual-empty-lines/);
  assert.match(app, /n\.textInputMode==='manual'&&!n\.textEditing/);
  assert.match(app, /addEventListener\('dblclick'/);
  assert.match(app, /startManualTextEditing\(n\)/);
  assert.match(app, /n\.textEditing=false/);
  assert.match(css, /\.node\.node-text\.text-node-manual/);
  assert.match(css, /\.text-node-shell\.is-manual-empty/);
});
