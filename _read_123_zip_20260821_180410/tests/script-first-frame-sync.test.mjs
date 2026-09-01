import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('changing selected Shot image rewires selected video first frame',()=>{
  assert.match(app,/function syncSelectedShotFirstFrame\(scriptNode,shot,\{markStale=true\}=\{\}\)/);
  assert.match(app,/state\.edges=state\.edges\.filter\(e=>!\(e\.target===video\.id&&\(e\.role==='first_frame'/);
  assert.match(app,/createEdge\(image\.id,video\.id,\{type:'asset',role:'first_frame',silent:true\}\)/);
  assert.match(app,/video\.toolParams\.firstFrame=image\.id/);
});
test('old video result becomes stale instead of silently pretending current',()=>{
  assert.match(app,/video\.inputStale=true/);
  assert.match(app,/当前采用分镜图已变更，需要重新生成视频/);
  assert.match(app,/if\(node\.inputStale\)return\{key:'stale',label:'待重跑'\}/);
  assert.match(app,/视频输入已变更/);
});
test('explicit rerun clears stale state and resyncs first frame without auto charging',()=>{
  assert.match(app,/node\.inputStale=false;node\.inputStaleReason=''/);
  assert.match(app,/syncSelectedShotFirstFrame\(scriptNode,shot,\{markStale:false\}\)/);
});
