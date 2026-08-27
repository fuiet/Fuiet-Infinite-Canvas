from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SERVER=ROOT/'server.js'
WORKER=ROOT/'dist/server/secure-index.js'
PACKAGE=ROOT/'package.json'
PARITY=ROOT/'tests/provider-runtime-parity.test.mjs'
CORE_TEST=ROOT/'tests/provider-runtime-core.test.mjs'


def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old,new,1)


def replace_function(text,marker,new_code):
    start=text.find(marker)
    if start<0: raise SystemExit(f'missing function {marker}')
    paren=text.find('(',start)
    if paren<0: raise SystemExit(f'missing function params {marker}')
    i=paren; depth=0; state='normal'; quote=''; signature_end=-1
    while i<len(text):
        c=text[i]; n=text[i+1] if i+1<len(text) else ''
        if state=='line':
            if c=='\n': state='normal'
        elif state=='block':
            if c=='*' and n=='/': state='normal'; i+=1
        elif state=='string':
            if c=='\\': i+=1
            elif c==quote: state='normal'; quote=''
        else:
            if c in "'\"`": state='string'; quote=c
            elif c=='/' and n=='/': state='line'; i+=1
            elif c=='/' and n=='*': state='block'; i+=1
            elif c=='(': depth+=1
            elif c==')':
                depth-=1
                if depth==0: signature_end=i; break
        i+=1
    if signature_end<0: raise SystemExit(f'unclosed signature {marker}')
    brace=text.find('{',signature_end+1)
    if brace<0: raise SystemExit(f'missing brace {marker}')
    i=brace; depth=0; state='normal'; quote=''
    while i<len(text):
        c=text[i]; n=text[i+1] if i+1<len(text) else ''
        if state=='line':
            if c=='\n': state='normal'
        elif state=='block':
            if c=='*' and n=='/': state='normal'; i+=1
        elif state=='string':
            if c=='\\': i+=1
            elif c==quote: state='normal'; quote=''
        else:
            if c in "'\"`": state='string'; quote=c
            elif c=='/' and n=='/': state='line'; i+=1
            elif c=='/' and n=='*': state='block'; i+=1
            elif c=='{': depth+=1
            elif c=='}':
                depth-=1
                if depth==0: return text[:start]+new_code+text[i+1:]
        i+=1
    raise SystemExit(f'unclosed function {marker}')

server=SERVER.read_text(encoding='utf-8')
server=replace_once(
    server,
    "require('./provider-adapter-contract.js');\nconst ProviderAdapterContract = globalThis.CanvasProviderAdapters;",
    "require('./provider-adapter-contract.js');\nrequire('./provider-runtime-core.js');\nconst ProviderAdapterContract = globalThis.CanvasProviderAdapters;\nconst ProviderRuntimeCore = globalThis.CanvasProviderRuntimeCore;",
    'Node shared runtime import'
)
server=replace_function(server,'function standardVideoTaskId(',"function standardVideoTaskId(created,config={}){return ProviderRuntimeCore.extractTaskId(created,config);}")
server=replace_function(server,'function standardVideoStatus(',"function standardVideoStatus(polled,config={}){return ProviderRuntimeCore.extractStatus(polled,config);}")
server=replace_function(server,'function standardVideoProgress(',"function standardVideoProgress(polled,config={}){return ProviderRuntimeCore.extractProgress(polled,config);}")
server=replace_function(server,'function standardVideoOutput(',"function standardVideoOutput(polled,config={}){return ProviderRuntimeCore.extractOutput(polled,config,'video');}")
server=replace_once(
    server,
    "const taskIdPath=opConfig.taskIdPath||model.taskIdPath||'id';upstreamTaskId = deepGet(created, taskIdPath);",
    "const taskIdPath=opConfig.taskIdPath||model.taskIdPath||'';upstreamTaskId = ProviderRuntimeCore.extractTaskId(created,{taskIdPath});",
    'Node generic async task id parsing'
)
server=replace_once(
    server,
    """const statusRaw=standardVideoStatus(polled,config),status=String(statusRaw??'').toLowerCase();
    const progressRaw=Number(standardVideoProgress(polled,config));
    updateTask(task,{status:'polling',progress:Number.isFinite(progressRaw)?Math.max(20,Math.min(96,progressRaw)):Math.min(94,20+checks*4)});
    if(failure.includes(status))throw new Error(`上游视频任务失败：${status||'unknown'}`);
    const output=standardVideoOutput(polled,config);
    if(success.includes(status)||(config.allowOutputWithoutTerminalStatus===true&&!status&&output!=null)){""",
    """const assessment=ProviderRuntimeCore.classifyAsyncPoll(polled,config,'video');
    const status=assessment.status,progressRaw=assessment.progress;
    updateTask(task,{status:'polling',progress:Number.isFinite(progressRaw)?Math.max(20,Math.min(96,progressRaw)):Math.min(94,20+checks*4)});
    if(assessment.state==='failure')throw new Error(ProviderRuntimeCore.formatFailure(assessment,'上游视频任务失败'));
    const output=assessment.output;
    if(assessment.state==='success'){""",
    'Node video poll classification'
)
SERVER.write_text(server,encoding='utf-8')

worker=WORKER.read_text(encoding='utf-8')
worker=replace_once(
    worker,
    "import '../../provider-adapter-contract.js';\nconst ProviderAdapterContract = globalThis.CanvasProviderAdapters;",
    "import '../../provider-adapter-contract.js';\nimport '../../provider-runtime-core.js';\nconst ProviderAdapterContract = globalThis.CanvasProviderAdapters;\nconst ProviderRuntimeCore = globalThis.CanvasProviderRuntimeCore;",
    'Worker shared runtime import'
)
worker=replace_once(
    worker,
    "const taskId = route.taskIdPath ? getPath(parsed, route.taskIdPath) : firstPath(parsed, ['id', 'task_id', 'taskId', 'request_id', 'job_id', 'data.id', 'data.task_id', 'data.taskId', 'task.id', 'result.id']);",
    "const taskId = ProviderRuntimeCore.extractTaskId(parsed, route);",
    'Worker async task id parsing'
)
worker=replace_once(
    worker,
    """const statusRaw = firstPath(parsed, [route.statusPath, 'status', 'data.status', 'state', 'data.state', 'task.status', 'result.status']);
  const status = String(statusRaw || '').toLowerCase();
  const progressRaw = firstPath(parsed, [route.progressPath, 'progress', 'data.progress', 'percent', 'data.percent', 'task.progress']);
  const progress = Number(progressRaw);
  const success = new Set(route.successValues.map(v => String(v).toLowerCase()));
  const failure = new Set(route.failureValues.map(v => String(v).toLowerCase()));
  if (failure.has(status)) {
    const detail = firstPath(parsed, ['error.message', 'message', 'error', 'data.error.message', 'data.error', 'task.error', 'result.error']);
    throw new Error(`上游任务失败（${status || 'unknown'}）${detail ? `：${typeof detail === 'object' ? JSON.stringify(detail).slice(0, 500) : String(detail).slice(0, 500)}` : ''}`);
  }
  if (success.has(status)) {""",
    """const assessment = ProviderRuntimeCore.classifyAsyncPoll(parsed, route, task.nodeType);
  const status = assessment.status;
  const progress = assessment.progress;
  if (assessment.state === 'failure') {
    throw new Error(ProviderRuntimeCore.formatFailure(assessment, '上游任务失败'));
  }
  if (assessment.state === 'success') {""",
    'Worker poll classification'
)
worker=replace_once(
    worker,
    "const delay = Math.min(30000, Math.round(baseDelay * Math.pow(1.7, Math.min(attempt, 8))));",
    "const delay = ProviderRuntimeCore.nextPollDelay(baseDelay, attempt);",
    'Worker polling backoff'
)
WORKER.write_text(worker,encoding='utf-8')

package=PACKAGE.read_text(encoding='utf-8')
package=replace_once(
    package,
    'node --check app.js && node --check provider-adapter-contract.js && node --check server.js',
    'node --check app.js && node --check provider-adapter-contract.js && node --check provider-runtime-core.js && node --check server.js',
    'package syntax check'
)
PACKAGE.write_text(package,encoding='utf-8')

PARITY.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const node=readFileSync(new URL('../server.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../dist/server/secure-index.js',import.meta.url),'utf8');
const compat=readFileSync(new URL('../dist/server/provider-compat-entry.js',import.meta.url),'utf8');

test('Node and Worker share provider adapter and runtime state cores',()=>{
  assert.match(node,/ProviderAdapterContract\\.inferAdapterKey/);
  assert.match(worker,/ProviderAdapterContract\\.resolveRoute/);
  assert.match(node,/ProviderRuntimeCore\\.extractTaskId/);
  assert.match(node,/ProviderRuntimeCore\\.classifyAsyncPoll/);
  assert.match(worker,/ProviderRuntimeCore\\.extractTaskId/);
  assert.match(worker,/ProviderRuntimeCore\\.classifyAsyncPoll/);
  assert.match(worker,/ProviderRuntimeCore\\.nextPollDelay/);
  assert.match(compat,/body\\.referenceTransport === 'auto'/);
});
""",encoding='utf-8')

CORE_TEST.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import '../provider-runtime-core.js';
const Core=globalThis.CanvasProviderRuntimeCore;

test('shared runtime core parses common async task shapes',()=>{
  assert.equal(Core.extractTaskId({data:{taskId:'abc'}}), 'abc');
  assert.equal(Core.extractTaskId({job:{id:'job-7'}}, {taskIdPath:'job.id'}), 'job-7');
  assert.equal(Core.extractStatus({data:{state:'processing'}}), 'processing');
  assert.equal(Core.extractProgress({task:{progress:42}}), 42);
});

test('shared runtime core classifies success, failure and pending consistently',()=>{
  const route={successValues:['done'],failureValues:['failed'],outputPath:'result.url'};
  const success=Core.classifyAsyncPoll({status:'done',result:{url:'https://cdn.test/v.mp4'}},route,'video');
  assert.equal(success.state,'success');assert.equal(success.output,'https://cdn.test/v.mp4');
  const failure=Core.classifyAsyncPoll({status:'failed',error:{message:'bad input'}},route,'video');
  assert.equal(failure.state,'failure');assert.equal(failure.detail,'bad input');
  const pending=Core.classifyAsyncPoll({status:'processing',progress:33},route,'video');
  assert.equal(pending.state,'pending');assert.equal(pending.progress,33);
});

test('output-without-status requires an explicit opt-in and polling delay is bounded',()=>{
  assert.equal(Core.classifyAsyncPoll({result:{url:'https://cdn.test/a.mp4'}},{outputPath:'result.url'},'video').state,'pending');
  assert.equal(Core.classifyAsyncPoll({result:{url:'https://cdn.test/a.mp4'}},{outputPath:'result.url',allowOutputWithoutTerminalStatus:true},'video').state,'success');
  assert.equal(Core.nextPollDelay(1500,0),1500);
  assert.ok(Core.nextPollDelay(1500,50)<=30000);
});
""",encoding='utf-8')

print('Integrated shared provider runtime state core into Node and Worker.')
