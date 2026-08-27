import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');

test('browser task monitor never sends task snapshots or upstream polling data back to the server',()=>{
  const start=app.indexOf('async function monitorNodeTask');
  assert.ok(start>=0,'monitorNodeTask must exist');
  const end=app.indexOf('\n  }',start);
  const body=app.slice(start,end>start?end:start+2500);
  assert.match(body,/apiJson\('\/api\/tasks\/'\+encodeURIComponent\(taskId\)\)/);
  assert.doesNotMatch(body,/\/api\/tasks\/poll/);
  assert.doesNotMatch(body,/JSON\.stringify\(\{task:info\}\)/);
});

// The server endpoint remains intentionally narrow for non-browser callers.
test('Worker poll API remains taskId-only',()=>{
  const worker=fs.readFileSync(path.join(ROOT,'dist/server/secure-index.js'),'utf8');
  assert.match(worker,/\/api\/tasks\/poll/);
  assert.match(worker,/只接受 \{ taskId \}/);
});
