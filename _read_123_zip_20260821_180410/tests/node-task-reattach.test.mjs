import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const BUILD='20260831-video-hover-player-1';

test('canvas startup reattaches monitors for persisted active node tasks',()=>{
  assert.match(app,/function resumePersistedNodeTaskMonitors\(\)/);
  assert.match(app,/resumePersistedNodeTaskMonitors\(\);const open=/);
  assert.match(app,/apiJson\('\/api\/tasks\/'\+encodeURIComponent\(taskId\)\)/);
  assert.match(app,/monitorNodeTask\(n,taskId,attempt,info\)/);
});

test('reattach path never creates a replacement provider task',()=>{
  const start=app.indexOf('async function resumePersistedNodeTask(n)');
  const end=app.indexOf("window.addEventListener('pagehide'",start);
  const section=app.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.doesNotMatch(section,/apiJson\('\/api\/tasks',\{method:'POST'/);
  assert.match(section,/请勿重新生成/);
});

test('already completed tasks restore output directly into the node',()=>{
  assert.match(app,/function applyRecoveredTaskSuccess\(n,info,attempt\)/);
  assert.match(app,/resolveGeneratedOutputUrl\(out\.value\?\?out\)/);
  assert.match(app,/n\.taskStatus='succeeded';n\.taskProgress=100/);
  assert.match(app,/recordNodeResultVersion/);
});

test('fresh app build is forced through bootstrap and production index',()=>{
  assert.ok(bootstrap.includes(`const v='${BUILD}'`));
  assert.ok(index.includes(`browser-bootstrap.js?v=${BUILD}`));
  assert.ok(index.includes(`browser-runtime.js?v=${BUILD}`));
});
