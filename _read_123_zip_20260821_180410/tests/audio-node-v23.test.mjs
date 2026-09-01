import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('audio node stylesheet is loaded as a dedicated component layer', () => {
  assert.match(read('index.html'), /styles\/audio-node\.css/);
});

test('audio node follows the universal four-state rendering contract', () => {
  const app = read('app.js');
  assert.match(app, /const emptyAudio=contentState==='empty'/);
  assert.match(app, /audio-node-shell/);
  assert.match(app, /data-audio-quick="music"/);
  assert.match(app, /data-audio-quick="voice"/);
  assert.match(app, /data-audio-node-upload/);
  assert.match(app, /applyLocalAudioToNode/);
  assert.match(app, /audio-file-drop-target/);
});

test('audio result toolbar exposes only existing transform paths plus download', () => {
  const app = read('app.js');
  assert.match(app, /label:'截取'.*audio-trim/);
  assert.match(app, /label:'变速'.*audio-speed/);
  assert.match(app, /label:'切分'.*audio-split/);
  assert.match(app, /label:'下载'.*audio-download/);
  assert.doesNotMatch(app, /if\(n\.type==='audio'\)return\[[^\n]*改提示词/);
});

test('audio composer is fixed in screen space and uses real shared generation controls', () => {
  const app = read('app.js');
  const css = read('styles/audio-node.css');
  assert.match(app, /generator\.classList\.toggle\('audio-generator',isAudio\)/);
  assert.match(app, /isAudio\?660:594/);
  assert.match(app, /isAudio\?210:226/);
  assert.match(app, /audio-generator-main/);
  assert.match(app, /id="audioReferenceBtn"/);
  assert.match(app, /id="audioContextBtn"/);
  assert.match(css, /generator-panel\.audio-generator/);
  assert.match(css, /width:660px!important/);
  assert.match(css, /height:210px!important/);
});

test('audio result is media-first and progress remains on the node', () => {
  const css = read('styles/audio-node.css');
  assert.match(css, /node\.node-audio\[data-content-state="result"\]/);
  assert.match(css, /audio-result-stage/);
  assert.match(css, /ui-v23-result-progress/);
  assert.match(css, /node-toolbar\.node-toolbar-audio/);
});
