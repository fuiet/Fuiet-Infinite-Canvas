import test from 'node:test';
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
