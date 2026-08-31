import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('image and video nodes share one canvas presentation width',()=>{
  assert.match(app,/const MEDIA_NODE_DISPLAY_WIDTH=620/);
  assert.match(app,/w:\(type==='image'\|\|type==='video'\)\?MEDIA_NODE_DISPLAY_WIDTH/);
});

test('legacy small video nodes migrate to the shared media width',()=>{
  assert.match(app,/x\.type==='video'&&mediaW<=520/);
  assert.match(app,/x\.w=MEDIA_NODE_DISPLAY_WIDTH/);
  assert.match(app,/x\.mediaDisplayScaleVersion=1/);
});

test('browser cache key is bumped for unified media sizing',()=>{
  assert.match(boot,/20260831-context-toolbar-clear-1/);
});
