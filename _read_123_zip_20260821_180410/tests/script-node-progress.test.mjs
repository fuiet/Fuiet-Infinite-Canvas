import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-node-progress-v1.css',import.meta.url),'utf8');

test('script breakdown mirrors task progress into the script node',()=>{
  assert.match(app,/waitTask\(taskId,loops=420,onProgress=null\)/);
  assert.match(app,/beginScriptTaskNode\(n,created\.task\)/);
  assert.match(app,/waitTask\(created\.task\.id,420,info=>updateScriptTaskNode\(n,info\)\)/);
  assert.match(app,/scriptTaskProgressMeta/);
});

test('script node renders skeleton progress and cancel action while generating',()=>{
  assert.match(app,/script-node-generating/);
  assert.ok(app.includes("new Array(18).fill('<i></i>')"));
  assert.match(app,/data-script-cancel/);
  assert.match(app,/cancelScriptNodeTask/);
  assert.match(css,/script-node-progress-pill/);
  assert.match(css,/script-node-shimmer/);
});
