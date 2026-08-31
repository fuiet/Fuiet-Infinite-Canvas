import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../ui-v2.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/video-node.css',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('video result nodes do not render the generic resize handle',()=>{
  assert.match(app,/contentState==='result'&&n\.type!=='video'/);
});

test('canvas video results do not receive the expand lightbox trigger',()=>{
  assert.match(ui,/const canvasVideoResult=media\.tagName==='VIDEO'/);
  assert.match(ui,/if\(canvasVideoResult\)\{if\(trigger\)trigger\.remove\(\);return\}/);
});

test('video result CSS hard-hides stale expand and resize controls',()=>{
  assert.match(css,/\.node\.node-video\[data-content-state="result"\] \.ui-media-preview-trigger/);
  assert.match(css,/\.node\.node-video\[data-content-state="result"\] \.node-resize-handle/);
  assert.match(css,/display:none!important/);
});

test('production browser build is cache-busted for video control cleanup',()=>{
  assert.match(boot,/20260831-media-canvas-scale-350-1/);
});
