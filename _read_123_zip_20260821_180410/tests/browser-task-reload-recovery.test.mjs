import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const runtime=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ROUTER_BUILD='20260902-desktop-runtime-router-1';
const PREVIEW_SW_BUILD='20260901-video-wait-progress-1';

test('browser reload resumes only already-persisted upstream active tasks',()=>{
  assert.match(runtime,/\['provider_succeeded','result_pending','running','polling','fallback','retrying'\]\.includes\(t\.status\)&&t\.upstreamTaskId/);
  assert.match(runtime,/t\.status='queued'/);
  assert.match(runtime,/\['running','polling','fallback'\]\.includes\(t\.status\)&&!t\.upstreamTaskId/);
  assert.match(runtime,/为避免重复生成和重复扣费不会自动重新提交/);
});

test('polling tasks are not left visually alive while executor is stopped after reload',()=>{
  const ready=runtime.slice(runtime.indexOf('runtime.ready.then(()=>'),runtime.indexOf('window.fetch=async function'));
  assert.match(ready,/running','polling'/);
  assert.match(ready,/saveTasks\(list\);pump\(\)/);
  assert.doesNotMatch(ready,/if\(\['running','polling','retrying'\]\.includes\(t\.status\)\)\{/);
});

test('Agnes task alias pollution is healed instead of reused as a video id',()=>{
  assert.match(runtime,/const ambiguousTaskAlias=Boolean\(videoId&&taskId&&videoId===taskId&&\/\^task\[_-\]\/i\.test\(videoId\)\)/);
  assert.match(runtime,/if\(ambiguousTaskAlias\)videoId=''/);
  assert.match(runtime,/healedAmbiguousTaskAlias:true/);
  assert.match(server,/const ambiguousTaskAlias=Boolean\(videoId&&taskId&&videoId===taskId&&\/\^task\[_-\]\/i\.test\(videoId\)\)/);
});

test('fresh runtime router is deployed while preview media keeps its internal worker revision',()=>{
  assert.ok(index.includes(`browser-runtime.js?v=${ROUTER_BUILD}`));
  assert.ok(runtime.includes(`browser-media-sw.js?v=${PREVIEW_SW_BUILD}`));
});
