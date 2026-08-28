import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=fs.readFileSync(path.join(ROOT,'browser-runtime.js'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');

function section(start,end){
  const a=runtime.indexOf(start),b=runtime.indexOf(end,a+start.length);
  assert.ok(a>=0,`missing ${start}`);assert.ok(b>a,`missing ${end}`);
  return runtime.slice(a,b);
}

test('browser video task persists upstream identity and resumes instead of resubmitting',()=>{
  const exec=section('async function executeTask(task){','async function runTask(task){');
  assert.match(exec,/existingUpstreamTaskId/);
  assert.match(exec,/resumingUpstream/);
  assert.match(exec,/upstreamTaskId:String\(taskId\)/);
  assert.match(exec,/upstreamCreatePath:usedCreatePath/);
  assert.match(exec,/providerCreateResponse/);
  assert.match(exec,/if\(!resumingUpstream\)/);
});

test('provider success is persisted before result fetching and missing result becomes result_pending',()=>{
  const exec=section('async function executeTask(task){','async function runTask(task){');
  const success=exec.indexOf("status:'provider_succeeded'");
  const fetch=exec.indexOf('fetchVideoContent(provider,polled.value');
  assert.ok(success>=0&&fetch>success,'provider success must be persisted before result retrieval');
  assert.match(exec,/status:'result_pending'/);
  assert.match(exec,/上游已生成成功，正在等待视频结果地址/);
  assert.match(exec,/providerResultUrl/);
  assert.match(exec,/resultSavedAt/);
});

test('provider success is monotonic and local result failures cannot overwrite it with failed',()=>{
  const update=section('function updateTask(id,patch){','function scheduleTaskResume');
  assert.match(update,/providerSucceeded/);
  assert.match(update,/providerSucceeded&&next\.status==='failed'/);
  assert.match(update,/next\.status=current\.output\?'succeeded':'result_pending'/);
  const run=section('async function runTask(task){','async function pump()');
  assert.match(run,/current\.providerStatus==='succeeded'/);
  assert.match(run,/status:'result_pending'/);
});

test('result_pending auto-retries the same upstream task without regenerating',()=>{
  assert.match(runtime,/function scheduleTaskResume\(id,delay=3000\)/);
  assert.match(runtime,/\['provider_succeeded','result_pending'\]\.includes\(current\.status\)/);
  assert.match(runtime,/updateTask\(id,\{status:'queued',error:null\}\);pump\(\)/);
});

test('browser reload resumes tasks with upstream ids instead of marking them failed',()=>{
  const init=section('runtime.ready=initializePersistence();','window.fetch=async function canvasBrowserRuntimeFetch');
  assert.match(init,/\['provider_succeeded','result_pending'\]/);
  assert.match(init,/if\(t\.upstreamTaskId\)\{t\.status='queued'/);
  assert.match(init,/为避免重复生成和重复扣费/);
  assert.doesNotMatch(init,/页面刷新中断了浏览器本地任务，请重新生成/);
});

test('canvas monitor keeps provider-success result synchronization alive',()=>{
  assert.match(app,/\['provider_succeeded','result_pending'\]\.includes\(info\.status\)/);
  assert.match(app,/上游已生成，正在同步视频结果…/);
  assert.match(app,/\['queued','running','polling','retrying','provider_succeeded','result_pending'\]\.includes\(n\.taskStatus\)/);
});
