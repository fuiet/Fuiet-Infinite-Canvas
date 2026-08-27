from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKER = ROOT / 'dist/server/secure-index.js'
TEST = ROOT / 'tests/worker-task-recovery.test.mjs'


def replace_function(text: str, marker: str, new_code: str) -> str:
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f'function marker not found: {marker}')
    paren = text.find('(', start)
    if paren < 0:
        raise SystemExit(f'function parameters not found: {marker}')
    depth = 0
    state = 'normal'
    quote = ''
    i = paren
    signature_end = -1
    while i < len(text):
        c = text[i]
        n = text[i + 1] if i + 1 < len(text) else ''
        if state == 'line':
            if c == '\n': state = 'normal'
        elif state == 'block':
            if c == '*' and n == '/': state = 'normal'; i += 1
        elif state == 'string':
            if c == '\\': i += 1
            elif c == quote: state = 'normal'; quote = ''
        else:
            if c in "'\"`": state = 'string'; quote = c
            elif c == '/' and n == '/': state = 'line'; i += 1
            elif c == '/' and n == '*': state = 'block'; i += 1
            elif c == '(': depth += 1
            elif c == ')':
                depth -= 1
                if depth == 0:
                    signature_end = i
                    break
        i += 1
    if signature_end < 0:
        raise SystemExit(f'function signature not closed: {marker}')
    brace = text.find('{', signature_end + 1)
    if brace < 0:
        raise SystemExit(f'opening brace not found: {marker}')
    depth = 0
    state = 'normal'
    quote = ''
    i = brace
    while i < len(text):
        c = text[i]
        n = text[i + 1] if i + 1 < len(text) else ''
        if state == 'line':
            if c == '\n': state = 'normal'
        elif state == 'block':
            if c == '*' and n == '/': state = 'normal'; i += 1
        elif state == 'string':
            if c == '\\': i += 1
            elif c == quote: state = 'normal'; quote = ''
        else:
            if c in "'\"`": state = 'string'; quote = c
            elif c == '/' and n == '/': state = 'line'; i += 1
            elif c == '/' and n == '*': state = 'block'; i += 1
            elif c == '{': depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    return text[:start] + new_code + text[i + 1:]
        i += 1
    raise SystemExit(f'unclosed function: {marker}')


worker = WORKER.read_text(encoding='utf-8')

bootstrap_code = r'''async function recoverPersistedTasks(env) {
  const state = globalThis.__canvasWorkerState;
  if (!state || state.__secureRecoveryDone) return;
  for (const task of state.tasks || []) {
    if (!task || ['succeeded', 'failed', 'canceled', 'cancelled'].includes(String(task.status || '').toLowerCase())) continue;
    const upstream = task.payload?._upstream && typeof task.payload._upstream === 'object' ? task.payload._upstream : null;
    const upstreamId = upstream?.taskId || upstream?.id || '';
    let changed = false;
    let note = '';

    if (upstream && upstreamId && !upstream.taskId) {
      upstream.taskId = String(upstreamId);
      task.payload = { ...(task.payload || {}), _upstream: upstream };
      changed = true;
    }

    if (task.cancelRequested || task.status === 'cancelling') {
      task.status = 'canceled';
      task.error = null;
      note = 'Worker 重启后完成取消状态恢复';
      changed = true;
    } else if (task.status === 'running') {
      if (upstreamId) {
        task.status = 'polling';
        task.progress = Math.max(20, Number(task.progress || 0));
        note = 'Worker 重启后恢复已提交的上游任务轮询';
      } else {
        // A running task without a persisted upstream id may have crossed the POST
        // boundary before the isolate died. Never resubmit automatically: that can
        // duplicate a paid generation. Require an explicit manual retry instead.
        task.status = 'failed';
        task.error = 'Worker 在任务执行中重启，且没有安全持久化上游 taskId。为避免重复提交和重复扣费，已停止自动重试；请确认上游状态后手动重试。';
        note = 'Worker 重启：缺少上游 taskId，按防重复扣费策略停止自动重提';
      }
      changed = true;
    } else if (task.status === 'polling' && !upstreamId) {
      task.status = 'failed';
      task.error = '持久化轮询任务缺少上游 taskId，无法安全恢复；为避免重新创建付费任务，已停止自动执行。';
      note = 'Worker 重启：轮询任务缺少 taskId，已安全终止';
      changed = true;
    }

    if (!changed) continue;
    task.updatedAt = nowIso();
    if (note) task.logs = [...(task.logs || []), { time: task.updatedAt, level: task.status === 'failed' ? 'error' : 'info', message: note }].slice(-100);
    try { await persistTask(task, env); }
    catch (error) { console.warn('[canvas-secure] failed to persist recovered task', task.id, error); }
  }
  state.__secureRecoveryDone = true;
}

async function bootstrap(request, env, ctx) {
  if (!globalThis.__canvasWorkerState?.booted) {
    const url = new URL(request.url);
    url.pathname = '/api/health'; url.search = '';
    await legacyWorker.fetch(new Request(url.toString(), { method: 'GET', headers: request.headers }), env, ctx);
  }
  await recoverPersistedTasks(env);
  return globalThis.__canvasWorkerState;
}'''
worker = replace_function(worker, 'async function bootstrap(', bootstrap_code)

poll_failure_helper = r'''async function handlePollingFailure(task, error, env) {
  const message = String(error?.message || error);
  const upstream = task.payload?._upstream && typeof task.payload._upstream === 'object' ? task.payload._upstream : null;
  if (task.cancelRequested) {
    task.status = 'canceled'; task.error = null; task.updatedAt = nowIso();
    task.logs = [...(task.logs || []), { time: task.updatedAt, level: 'warn', message: '轮询期间收到取消请求' }].slice(-100);
    await persistTask(task, env);
    return 0;
  }
  if (!upstream?.taskId) {
    task.status = 'failed'; task.output = null; task.error = message; task.updatedAt = nowIso();
    task.logs = [...(task.logs || []), { time: task.updatedAt, level: 'error', message }].slice(-100);
    await persistTask(task, env);
    return 0;
  }
  const count = Number(upstream.pollErrorCount || 0) + 1;
  const maxErrors = clamp(env?.CANVAS_POLL_ERROR_RETRIES, 0, 20, 5);
  if (count > maxErrors) {
    task.status = 'failed'; task.output = null;
    task.error = `上游轮询连续失败 ${count} 次：${message}`;
    task.updatedAt = nowIso();
    task.logs = [...(task.logs || []), { time: task.updatedAt, level: 'error', message: task.error }].slice(-100);
    await persistTask(task, env);
    return 0;
  }
  const delay = Math.min(60000, Math.round(1000 * Math.pow(2, Math.min(count - 1, 6))));
  upstream.pollErrorCount = count;
  upstream.nextPollAt = Date.now() + delay;
  task.payload = { ...(task.payload || {}), _upstream: upstream };
  task.status = 'polling'; task.error = message; task.updatedAt = nowIso();
  task.logs = [...(task.logs || []), { time: task.updatedAt, level: 'warn', message: `上游轮询失败，${Math.ceil(delay / 1000)} 秒后重试（${count}/${maxErrors}）：${message}` }].slice(-100);
  await persistTask(task, env);
  return delay;
}

async function drainQueue(request, env, ctx) {
  const state = globalThis.__canvasWorkerState;
  const queueState = state.__secureQueue || (state.__secureQueue = { running: 0, active: new Set() });
  const concurrency = clamp(env?.CANVAS_TASK_CONCURRENCY, 1, 8, 2);
  const now = Date.now();
  const candidates = (state.tasks || []).filter(task => {
    if (!task || task.cancelRequested) return false;
    if (task.status === 'queued') return true;
    if (task.status !== 'polling') return false;
    const upstream = task.payload?._upstream;
    return Boolean(upstream?.taskId) && Number(upstream.nextPollAt || 0) <= now;
  }).sort((a, b) => {
    if (a.status === 'polling' && b.status !== 'polling') return -1;
    if (b.status === 'polling' && a.status !== 'polling') return 1;
    if (a.status === 'polling' && b.status === 'polling') return Number(a.payload?._upstream?.nextPollAt || 0) - Number(b.payload?._upstream?.nextPollAt || 0);
    const priority = Number(b.priority || 50) - Number(a.priority || 50);
    return priority || String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  });
  while (queueState.running < concurrency && candidates.length) {
    const task = candidates.shift(); if (!task || queueState.active.has(task.id)) continue;
    queueState.running++; queueState.active.add(task.id);
    try {
      if (task.status === 'polling') {
        try {
          await pollTask(task, request, env);
          const upstream = task.payload?._upstream;
          if (task.status === 'polling' && upstream?.pollErrorCount) {
            upstream.pollErrorCount = 0;
            task.payload = { ...(task.payload || {}), _upstream: upstream };
            await persistTask(task, env);
          }
        } catch (error) {
          await handlePollingFailure(task, error, env);
        }
      } else {
        await runTask(task, request, env, ctx);
      }
    } finally {
      queueState.running--; queueState.active.delete(task.id);
    }
  }
}'''
worker = replace_function(worker, 'async function drainQueue(', poll_failure_helper)

WORKER.write_text(worker, encoding='utf-8')

TEST.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/final-entry.js';

const ENV={PROVIDER_SECRET_KEY:'worker-recovery-test-secret',CANVAS_TASK_CONCURRENCY:'2',CANVAS_POLL_ERROR_RETRIES:'3'};

function ctx(){
  const jobs=[];
  return {jobs,waitUntil(p){jobs.push(Promise.resolve(p));},async flush(){while(jobs.length)await jobs.shift();}};
}
async function call(path,{method='GET',body}={}){
  const c=ctx();
  const res=await worker.fetch(new Request(`https://canvas.test${path}`,{method,headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined}),ENV,c);
  const data=await res.clone().json().catch(()=>({}));
  await c.flush();
  return {res,data};
}
function baseState(tasks,providers=[]){
  globalThis.__canvasWorkerState={booted:true,supabase:null,providers,projects:[],tasks,bridgeToken:'x',bridgeState:{},sessions:new Map(),media:new Map()};
  globalThis.__canvasProviderMigrationPromise=null;
}
function provider(){
  return {id:'p1',name:'Video Provider',baseUrl:'https://video.vendor.test/v1',apiKey:'k',authHeader:'Authorization',authScheme:'Bearer',downloadOutputs:false,models:[{id:'m1',name:'Video',modality:'video',adapterKey:'generic-async',createPath:'/jobs',method:'POST',responseMode:'async',taskIdPath:'id',pollPath:'/jobs/{{taskId}}',pollMethod:'GET',statusPath:'status',outputPath:'result.url',successValues:['done'],failureValues:['failed'],pollIntervalMs:500,timeoutMs:60000}]};
}
function task(status='polling'){
  const now=new Date().toISOString();
  return {id:'t1',status,progress:35,providerId:'p1',modelId:'m1',nodeType:'video',payload:{prompt:'resume me',parameters:{duration:5},_upstream:{taskId:'up-1',startedAt:Date.now()-1000,nextPollAt:0,pollAttempt:0}},output:null,error:null,createdAt:now,updatedAt:now,attempt:0,maxRetries:1,priority:50,cancelRequested:false,logs:[]};
}

test('persisted polling task resumes from server taskId without a second create POST',{concurrency:false},async()=>{
  const realFetch=globalThis.fetch;let createPosts=0,polls=0;
  baseState([task('polling')],[provider()]);
  globalThis.fetch=async(input,init={})=>{
    const u=new URL(typeof input==='string'?input:input.url);
    if(u.hostname==='video.vendor.test'){
      if(String(init.method||'GET').toUpperCase()==='POST'){createPosts++;throw new Error('creation must not be called during resume');}
      if(u.pathname==='/v1/jobs/up-1'){polls++;return Response.json({status:'done',result:{url:'https://cdn.vendor.test/final.mp4'}});}
    }
    return realFetch(input,init);
  };
  try{
    await call('/api/tasks');
    const current=globalThis.__canvasWorkerState.tasks.find(x=>x.id==='t1');
    assert.equal(createPosts,0);
    assert.equal(polls,1);
    assert.equal(current.status,'succeeded');
    assert.equal(current.output.value,'https://cdn.vendor.test/final.mp4');
  }finally{globalThis.fetch=realFetch;}
});

test('running task with persisted upstream id recovers to polling and completes',{concurrency:false},async()=>{
  const realFetch=globalThis.fetch;let posts=0,polls=0;
  baseState([task('running')],[provider()]);
  globalThis.fetch=async(input,init={})=>{
    const u=new URL(typeof input==='string'?input:input.url);
    if(u.hostname==='video.vendor.test'){
      if(String(init.method||'GET').toUpperCase()==='POST'){posts++;throw new Error('must not recreate recovered task');}
      if(u.pathname==='/v1/jobs/up-1'){polls++;return Response.json({status:'done',result:{url:'https://cdn.vendor.test/recovered.mp4'}});}
    }
    return realFetch(input,init);
  };
  try{
    await call('/api/tasks');
    const current=globalThis.__canvasWorkerState.tasks.find(x=>x.id==='t1');
    assert.equal(posts,0);assert.equal(polls,1);assert.equal(current.status,'succeeded');
    assert.match(current.logs.map(x=>x.message).join('\n'),/恢复已提交的上游任务轮询/);
  }finally{globalThis.fetch=realFetch;}
});

test('interrupted running task without upstream id fails closed instead of auto-resubmitting',{concurrency:false},async()=>{
  const t=task('running');delete t.payload._upstream;
  baseState([t],[provider()]);
  const realFetch=globalThis.fetch;let upstreamCalls=0;
  globalThis.fetch=async(input,init={})=>{const u=new URL(typeof input==='string'?input:input.url);if(u.hostname==='video.vendor.test')upstreamCalls++;return realFetch(input,init);};
  try{
    await call('/api/tasks');
    const current=globalThis.__canvasWorkerState.tasks.find(x=>x.id==='t1');
    assert.equal(upstreamCalls,0);assert.equal(current.status,'failed');assert.match(current.error,/避免重复提交|重复扣费/);
  }finally{globalThis.fetch=realFetch;}
});

test('transient polling failures stay polling and back off without recreating task',{concurrency:false},async()=>{
  const realFetch=globalThis.fetch;let posts=0,polls=0;
  baseState([task('polling')],[provider()]);
  globalThis.fetch=async(input,init={})=>{
    const u=new URL(typeof input==='string'?input:input.url);
    if(u.hostname==='video.vendor.test'){
      if(String(init.method||'GET').toUpperCase()==='POST')posts++;
      if(u.pathname==='/v1/jobs/up-1'){polls++;throw new Error('temporary upstream outage');}
    }
    return realFetch(input,init);
  };
  try{
    await call('/api/tasks');
    const current=globalThis.__canvasWorkerState.tasks.find(x=>x.id==='t1');
    assert.equal(posts,0);assert.equal(polls,1);assert.equal(current.status,'polling');
    assert.equal(current.payload._upstream.pollErrorCount,1);
    assert.ok(Number(current.payload._upstream.nextPollAt)>Date.now());
    assert.match(current.error,/temporary upstream outage/);
  }finally{globalThis.fetch=realFetch;}
});
''',encoding='utf-8')

print('Hardened Worker persisted-task recovery and polling resume.')
