import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const coreSrc=fs.readFileSync(new URL('../provider-runtime-core.js',import.meta.url),'utf8');
const sandbox={};sandbox.globalThis=sandbox;vm.runInNewContext(coreSrc,sandbox,{filename:'provider-runtime-core.js'});
const Core=sandbox.CanvasProviderRuntimeCore;

test('extracts XOGPU task id from nested uncommon create response shapes',()=>{
  assert.equal(Core.extractTaskId({data:{job:{taskId:'task_nested_1'}}}), 'task_nested_1');
  assert.equal(Core.extractTaskId({payload:{generation_id:'task_generation_2'}}), 'task_generation_2');
  assert.equal(Core.extractTaskId([{id:'task_array_3'}]), 'task_array_3');
  assert.equal(Core.extractTaskId({ok:true,job:{uuid:'task_uuid_4'}}), 'task_uuid_4');
  assert.equal(Core.extractTaskId({ok:true,envelope:{anything:'task_prefixed_5'}}), 'task_prefixed_5');
});

test('does not mistake unrelated nested user id for a task id',()=>{
  assert.equal(Core.extractTaskId({user:{id:'user_123'},ok:true}), '');
});

const preview=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
test('missing task id error includes a sanitized create response preview for diagnostics',()=>{
  assert.match(preview,/创建响应/);
  assert.match(preview,/\[redacted\]/);
});

const router=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
test('router loads the new preview runtime version',()=>{
  assert.match(router,/browser-runtime-preview\.js\?v=20260909-xogpu-create-response-3/);
});

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('browser cache keys are bumped for XOGPU create-response parser',()=>{
  assert.match(html,/provider-runtime-core\.js\?v=20260909-xogpu-create-response-3/);
  assert.match(html,/browser-runtime\.js\?v=20260909-xogpu-create-response-3/);
});
