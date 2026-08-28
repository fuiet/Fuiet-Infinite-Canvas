import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const DIR=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(DIR,'..');
const picker=fs.readFileSync(path.join(ROOT,'image-ratio-picker-v1.js'),'utf8');
const bootstrap=fs.readFileSync(path.join(ROOT,'browser-bootstrap.js'),'utf8');

test('image ratio picker exposes the complete visual ratio set',()=>{
  for(const ratio of ['1:1','1:2','2:1','9:16','16:9','3:4','4:3','3:2','2:3','5:4','4:5','21:9','9:21']){
    assert.ok(picker.includes(`'${ratio}'`),`missing ${ratio}`);
  }
});

test('ratio icons derive width and height from the actual ratio instead of a fixed square',()=>{
  assert.match(picker,/Math\.min\(20\/rw,16\/rh\)/);
  assert.match(picker,/--ratio-w:/);
  assert.match(picker,/--ratio-h:/);
  assert.match(picker,/button::before\{display:none!important/);
});

test('image ratio picker loads after the image generator enhancement',()=>{
  const generator=bootstrap.indexOf('./image-generator-v2.js');
  const pickerIndex=bootstrap.indexOf('./image-ratio-picker-v1.js');
  assert.ok(generator>=0);
  assert.ok(pickerIndex>generator);
});
