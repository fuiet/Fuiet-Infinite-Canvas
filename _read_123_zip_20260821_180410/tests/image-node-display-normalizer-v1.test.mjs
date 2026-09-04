import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const normalizer=fs.readFileSync(new URL('../image-node-display-normalizer-v1.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('image result display normalizer parses as JavaScript',()=>{
  assert.doesNotThrow(()=>new Function(normalizer));
});

test('standalone image results are canonicalized to one canvas display width',()=>{
  assert.match(normalizer,/const DISPLAY_WIDTH=350/);
  assert.match(normalizer,/n\.w=DISPLAY_WIDTH/);
  assert.match(normalizer,/n\.h=null/);
  assert.match(normalizer,/mediaDisplayScaleVersion=3/);
});

test('storyboard frames keep their intentionally compact custom dimensions',()=>{
  assert.match(normalizer,/function isStoryboardImage/);
  assert.match(normalizer,/storyboardFrame/);
  assert.match(normalizer,/storyboardGroupId/);
  assert.match(normalizer,/startsWith\('storyboard_'\)/);
});

test('server-loaded and saved project data are normalized too',()=>{
  assert.ok(normalizer.includes('api\\/projects'));
  assert.match(normalizer,/method==='GET'/);
  assert.match(normalizer,/method==='POST'\|\|method==='PUT'/);
  assert.match(normalizer,/body\.project\.data=normalized\.data/);
});

test('normalizer loads before app render',()=>{
  assert.match(bootstrap,/image-node-display-normalizer-v1\.js\?v=\$\{v\}[\s\S]*app\.js\?v=\$\{v\}/);
  assert.match(bootstrap,/const v='20260904-image-display-normalizer-1'/);
});
