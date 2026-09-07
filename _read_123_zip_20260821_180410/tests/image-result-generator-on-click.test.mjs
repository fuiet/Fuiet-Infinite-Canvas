import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root='_read_123_zip_20260821_180410';
const app=fs.readFileSync(`${root}/app.js`,'utf8');
const boot=fs.readFileSync(`${root}/browser-bootstrap.js`,'utf8');

test('clicking a generated image result opens its generator',()=>{
  assert.match(app,/clicked\.type==='image'&&clickedState==='result'/);
  assert.match(app,/expandedNodeId=openGenerator\?finished\.id:null/);
});

test('result opening remains click-only and does not open after drag or shift multi-select',()=>{
  assert.match(app,/if\(moved\)\{saveState\(\);expandedNodeId=null;\}else if\(finished\.additive\)/);
  assert.match(app,/finished\.additive[\s\S]{0,220}expandedNodeId=null/);
});

test('video and audio result nodes keep their existing click behavior',()=>{
  const finish=app.slice(app.indexOf('function finishNodeDrag()'),app.indexOf('function ensureGuideLayer'));
  assert.doesNotMatch(finish,/clicked\.type==='video'&&clickedState==='result'/);
  assert.doesNotMatch(finish,/clicked\.type==='audio'&&clickedState==='result'/);
});

test('image result generator uses the same canonical node parameters',()=>{
  assert.match(app,/function renderGenerator\(\)/);
  assert.match(app,/const n=state\.nodes\.find\(x=>x\.id===expandedNodeId\)/);
  assert.match(app,/if\(n\.type==='image'/);
  assert.match(app,/input\?\.addEventListener\('input',e=>\{n\.prompt=e\.target\.value;saveState\(\)\}\)/);
  assert.match(app,/openModelPickerForNode\(n,e\.currentTarget\)/);
});

test('browser cache key forces the updated app click behavior to load',()=>{
  assert.match(boot,/resultimagegen=1/);
});
