import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const BUILD='20260831-agnes-provider-throttle-1';

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

test('fresh browser build is deployed for task recovery healing',()=>{
  assert.ok(index.includes(`browser-runtime.js?v=${BUILD}`));
  assert.ok(runtime.includes(`browser-media-sw.js?v=${BUILD}`));
});
