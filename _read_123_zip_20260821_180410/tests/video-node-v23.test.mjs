import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('video node stylesheet is loaded as a dedicated component layer', () => {
  const html = read('index.html');
  assert.match(html, /styles\/video-node\.css/);
});

test('video node follows the universal four-state rendering contract', () => {
  const app = read('app.js');
  assert.match(app, /const emptyVideo=contentState==='empty'/);
  assert.match(app, /video-node-shell/);
  assert.match(app, /data-video-quick="text"/);
  assert.match(app, /data-video-quick="image"/);
  assert.match(app, /data-video-quick="frame"/);
  assert.match(app, /data-video-node-upload/);
  assert.match(app, /applyLocalVideoToNode/);
  assert.match(app, /video-file-drop-target/);
});

test('selected video results expose creator-facing contextual transforms only', () => {
  const app = read('app.js');
  assert.match(app, /label:'高清'.*video-hd/);
  assert.match(app, /label:'片段重拍'.*video-reshoot/);
  assert.match(app, /label:'提帧'.*video-frames/);
  assert.match(app, /label:'剪辑'.*video-trim/);
  assert.match(app, /label:'音频分离'.*video-audio/);
  assert.match(app, /label:'续写'.*video-extend/);
  assert.match(app, /video-download/);
  assert.match(app, /video-fullscreen/);
  assert.doesNotMatch(app, /if\(n\.type==='video'\)return\[\{label:'编辑视频'/);
});

test('video composer is fixed in screen space and keeps core generation controls local to the node', () => {
  const app = read('app.js');
  const css = read('styles/video-node.css');
  assert.match(app, /generator\.classList\.toggle\('video-generator',isVideo\)/);
  assert.match(app, /width=isImage\|\|isVideo\?820/);
  assert.match(app, /height=isImage\?246:isVideo\?258/);
  assert.match(app, /video-generator-main/);
  assert.match(app, /id="videoReferenceBtn"/);
  assert.match(app, /id="videoFramesBtn"/);
  assert.match(app, /id="videoMotionBtn"/);
  assert.match(app, /id="videoModeSelect"/);
  assert.match(app, /id="durationSelect"/);
  assert.match(app, /id="resolutionSelect"/);
  assert.match(css, /generator-panel\.video-generator/);
  assert.match(css, /width:820px!important/);
  assert.match(css, /height:258px!important/);
});

test('video result stays media-first and progress stays on the node', () => {
  const css = read('styles/video-node.css');
  assert.match(css, /node\.node-video\[data-content-state="result"\]/);
  assert.match(css, /node-media-video/);
  assert.match(css, /ui-v23-result-progress/);
  assert.match(css, /node-toolbar\.node-toolbar-video/);
});