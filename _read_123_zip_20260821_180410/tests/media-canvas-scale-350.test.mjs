import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('100 percent canvas media scale matches the compact reference proportion',()=>{
  assert.match(app,/const MEDIA_NODE_DISPLAY_WIDTH=350/);
  assert.doesNotMatch(app,/const MEDIA_NODE_DISPLAY_WIDTH=620/);
});

test('legacy image and video nodes migrate once to compact media scale',()=>{
  assert.match(app,/scaleVersion=Number\(x\.mediaDisplayScaleVersion\|\|0\)/);
  assert.match(app,/scaleVersion<2/);
  assert.match(app,/x\.mediaDisplayScaleVersion=2/);
});

test('canvas cache key advances for compact media scale',()=>{
  assert.match(boot,/20260831-low-zoom-media-visible-1/);
});
