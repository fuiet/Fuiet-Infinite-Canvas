import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('image and video results remain real media below 34 percent canvas zoom',()=>{
  assert.doesNotMatch(app,/state\.viewport\.zoom<\.34&&n\.id!==selectedId&&n\.id!==expandedNodeId/);
  assert.doesNotMatch(app,/node-low-detail \$\{n\.type\}/);
  assert.match(app,/const media=n\.outputUrl\?`<div class="media-clip image-node-stage"/);
  assert.match(app,/const media=n\.outputUrl\?`<div class="media-clip video-node-stage"><video class="node-media-video"/);
});

test('virtualization remains enabled while low-zoom media stays visible',()=>{
  assert.match(app,/function refreshVirtualizedContent\(/);
  assert.match(app,/function scheduleVirtualizationRefresh\(/);
});

test('browser cache key advances for low zoom media visibility fix',()=>{
  assert.match(boot,/20260831-xogpu-content-probe-1/);
});
