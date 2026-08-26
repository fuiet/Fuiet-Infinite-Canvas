import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('blank-canvas double click opens the shared quick-add menu', () => {
  const app = read('app.js');
  assert.match(app, /viewport\.addEventListener\('dblclick'/);
  assert.match(app, /isCanvasBlankTarget\(e\.target\)/);
  assert.match(app, /showQuickAdd\(e\.clientX,e\.clientY,p\)/);
});

test('add-node menu includes the complete reference feature set', () => {
  const app = read('app.js');
  const runtime = read('ui-v23.js');
  assert.match(app, /type:'text'.*label:'文本'/);
  assert.match(app, /type:'image'.*label:'图片'/);
  assert.match(app, /type:'video'.*label:'视频'/);
  assert.match(app, /type:'smart-edit'.*label:'视频编辑'.*badge:'Beta'/);
  assert.match(app, /type:'director'.*label:'导演台'.*badge:'NEW'/);
  assert.match(app, /type:'frame-analysis'.*label:'逐帧拉片'.*badge:'SD 2\.5'/);
  assert.match(app, /type:'audio'.*label:'音频'/);
  assert.match(app, /type:'script'.*label:'脚本'/);
  assert.match(app, /type:'asset-library'.*label:'素材库'/);
  assert.match(runtime, /ADD_NODE_ORDER = \['text','image','video','smart-edit','director','frame-analysis','audio','script','asset-library'\]/);
  assert.match(runtime, /ADD_RESOURCE_ORDER = \['upload','history'\]/);
  assert.match(runtime, /history:'从生成历史选择'/);
  assert.match(runtime, /rows\.get\('asset'\)\?\.remove\(\)/);
});

test('bottom dock plus falls back to the same blank-canvas quick-add event', () => {
  const html = read('index.html');
  const runtime = read('ui-v23.js');
  assert.match(html, /data-dock-action="add"/);
  assert.match(runtime, /#bottomDock \[data-dock-action="add"\]/);
  assert.match(runtime, /alreadyOpen = contextMenu\?\.classList\.contains\('libtv-add-menu'\)/);
  assert.match(runtime, /viewport\.dispatchEvent\(new MouseEvent\('dblclick'/);
});

test('add-node popup visual system matches the compact dark reference', () => {
  const runtime = read('ui-v23.js');
  const css = read('styles/add-node-menu.css');
  assert.match(runtime, /styles\/add-node-menu\.css/);
  assert.match(runtime, /ui-v23-add-menu/);
  assert.match(css, /width:196px/);
  assert.match(css, /border-radius:15px/);
  assert.match(css, /background:#252624/);
  assert.match(css, /min-height:36px/);
  assert.match(css, /font:500 13px\/18px/);
  assert.match(css, /data-id="director"/);
  assert.match(css, /data-id="frame-analysis"/);
  assert.match(css, /content:'◆'/);
  assert.match(css, /add-node-chevron/);
});

test('canvas accepts direct image video and audio file drops', () => {
  const app = read('app.js');
  assert.match(app, /viewport\.addEventListener\('dragover'/);
  assert.match(app, /viewport\.addEventListener\('drop',async e=>/);
  assert.match(app, /\^\(image\|video\|audio\)/);
  assert.match(app, /input\.accept='image\/\*,video\/\*,audio\/\*'/);
});
