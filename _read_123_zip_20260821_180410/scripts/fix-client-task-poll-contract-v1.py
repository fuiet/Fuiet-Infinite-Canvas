from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'app.js'
TEST=ROOT/'tests/task-poll-client-contract.test.mjs'

app=APP.read_text(encoding='utf-8')
old="""      if(info?.status==='polling'&&info?.payload?._upstream?.taskId){
        info=(await apiJson('/api/tasks/poll',{method:'POST',body:JSON.stringify({task:info})})).task;
      }else{
        info=(await apiJson('/api/tasks/'+encodeURIComponent(taskId))).task;
      }"""
new="""      // The browser never supplies upstream polling routes or task snapshots.
      // GETing the server-owned task is cross-runtime: Node keeps its own worker loop,
      // while Cloudflare GET triggers the persisted server queue/poller via kickQueue.
      info=(await apiJson('/api/tasks/'+encodeURIComponent(taskId))).task;"""
count=app.count(old)
if count!=1:
    raise SystemExit(f'expected one legacy client polling block, found {count}')
app=app.replace(old,new,1)
APP.write_text(app,encoding='utf-8')

TEST.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');

test('browser task monitor never sends task snapshots or upstream polling data back to the server',()=>{
  const start=app.indexOf('async function monitorNodeTask');
  assert.ok(start>=0,'monitorNodeTask must exist');
  const end=app.indexOf('\\n  }',start);
  const body=app.slice(start,end>start?end:start+2500);
  assert.match(body,/apiJson\('\/api\/tasks\/'\+encodeURIComponent\(taskId\)\)/);
  assert.doesNotMatch(body,/\/api\/tasks\/poll/);
  assert.doesNotMatch(body,/JSON\.stringify\(\{task:info\}\)/);
});

// The server endpoint remains intentionally narrow for non-browser callers.
test('Worker poll API remains taskId-only',()=>{
  const worker=fs.readFileSync(path.join(ROOT,'dist/server/secure-index.js'),'utf8');
  assert.match(worker,/\/api\/tasks\/poll/);
  assert.match(worker,/只接受 \\{ taskId \\}/);
});
""",encoding='utf-8')

print('Updated browser task monitoring to server-owned polling only.')
