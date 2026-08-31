import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('structured task errors never collapse to object Object',()=>{
  assert.match(app,/function errorText\(value,depth=0\)/);
  assert.match(app,/taskFailureText\(info\)/);
  assert.match(app,/taskFailureText\(created\.task\)/);
  assert.match(app,/text==='\[object Object\]'\?'':text/);
});

test('proxy preserves upstream HTTP status for adaptive video fallback',()=>{
  assert.match(runtime,/Do not throw on upstream HTTP errors here/);
  assert.doesNotMatch(runtime,/if\(!res\.ok\)\{let d=\{\}/);
  assert.match(runtime,/err\.status=res\.status/);
  assert.match(runtime,/runtimeErrorText\(parsed\.value\)/);
});

test('task failure persistence keeps status and detail',()=>{
  assert.match(runtime,/errorStatus:Number\(error\.status\)/);
  assert.match(runtime,/errorDetail:detail/);
});

test('adaptive video protocol assets pin changed registry components to fresh versions',()=>{
  for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js']){
    assert.ok(index.includes(`${file}?v=20260831-xogpu-content-probe-1`),file);
  }
  assert.ok(index.includes('browser-bootstrap.js?v=20260831-xogpu-content-probe-1'),'browser-bootstrap.js');
  assert.ok(index.includes('video-request-parameters.js?v=20260831-xogpu-content-probe-1'));
});
