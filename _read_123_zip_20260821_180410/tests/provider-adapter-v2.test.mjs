import test from 'node:test';
import assert from 'node:assert/strict';
import '../provider-adapter-contract.js';
import worker from '../dist/server/final-entry.js';

const Contract=globalThis.CanvasProviderAdapters;
const ENV={PROVIDER_SECRET_KEY:'provider-v2-test-secret'};

function context(){
  const jobs=[];
  return {ctx:{waitUntil(p){jobs.push(Promise.resolve(p))}},flush:async()=>{while(jobs.length)await jobs.shift()}};
}
async function call(path,{method='GET',body}={}){
  const c=context();
  const response=await worker.fetch(new Request(`https://canvas.test${path}`,{method,headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined}),ENV,c.ctx);
  const data=await response.json().catch(()=>({}));
  await c.flush();
  return {response,data};
}

test('shared contract does not classify a generic models array as OpenAI',()=>{
  assert.equal(Contract.detectModelListProtocol({models:[{id:'vendor-model'}]},'/models').protocol,'');
  assert.equal(Contract.detectModelListProtocol({data:[{id:'vendor-model'}]},'/v1/models').protocol,'');
  assert.equal(Contract.detectModelListProtocol({object:'list',data:[{id:'gpt-test',object:'model'}]},'/v1/models').protocol,'openai-compatible');
});

test('shared contract canonicalizes cloud reference transport and adapter selection',()=>{
  assert.equal(Contract.normalizeReferenceTransport('auto',{cloud:true}),'data-url');
  assert.equal(Contract.normalizeReferenceTransport('base64',{cloud:true}),'data-url');
  assert.equal(Contract.normalizeReferenceTransport('upload-endpoint',{cloud:true}),'upload');
  assert.equal(Contract.inferAdapterKey({protocol:'auto'},{modality:'video',adapterKey:'auto'}),'auto');
  assert.equal(Contract.inferAdapterKey({protocol:'openai-compatible'},{modality:'image',adapterKey:'auto'}),'openai-image');
  assert.equal(Contract.inferAdapterKey({protocol:'auto'},{modality:'video',adapterKey:'generic-async',createPath:'/jobs'}),'generic-async');
});

test('worker separates connection, auth and model discovery; generic list is not auto-OpenAI', {concurrency:false}, async()=>{
  const realFetch=globalThis.fetch;
  globalThis.__canvasWorkerState={booted:true,supabase:null,providers:[],projects:[],tasks:[],bridgeToken:'x',bridgeState:{},sessions:new Map(),media:new Map()};
  globalThis.__canvasProviderMigrationPromise=null;
  globalThis.fetch=async(input,init={})=>{
    const u=new URL(typeof input==='string'?input:input.url);
    if(u.hostname==='generic.vendor.test'){
      if(u.pathname==='/v1/models')return new Response('not found',{status:404});
      if(u.pathname==='/models')return Response.json({models:[{id:'vendor-video',type:'video'}]});
      return new Response('root missing',{status:404});
    }
    if(u.hostname==='nomodel.vendor.test')return new Response('not found',{status:404});
    return realFetch(input,init);
  };
  try{
    const connection=await call('/api/providers/test-config',{method:'POST',body:{baseUrl:'https://generic.vendor.test',apiKey:'k',protocol:'auto'}});
    assert.equal(connection.response.status,200);assert.equal(connection.data.reachable,true);assert.equal(connection.data.httpStatus,404);
    const discovered=await call('/api/providers/discover-models',{method:'POST',body:{baseUrl:'https://generic.vendor.test',apiKey:'k',protocol:'auto'}});
    assert.equal(discovered.response.status,200);assert.equal(discovered.data.suggestedProtocol,'');assert.equal(discovered.data.models[0].id,'vendor-video');
    const auth=await call('/api/providers/test-auth',{method:'POST',body:{baseUrl:'https://nomodel.vendor.test',apiKey:'k',protocol:'auto'}});
    assert.equal(auth.response.status,200);assert.equal(auth.data.verified,false);
    const saved=await call('/api/providers',{method:'POST',body:{id:'no-model-provider',baseUrl:'https://nomodel.vendor.test',apiKey:'k',protocol:'auto',referenceTransport:'auto',models:[]}});
    assert.equal(saved.response.status,200);assert.equal(saved.data.provider.referenceTransport,'data-url');assert.equal(saved.data.provider.models.length,0);assert.match(saved.data.warning,/已保存/);
  }finally{globalThis.fetch=realFetch}
});

test('worker generic async video supports POST polling with JSON body', {concurrency:false}, async()=>{
  const realFetch=globalThis.fetch;let pollSeen=null;
  globalThis.__canvasWorkerState={booted:true,supabase:null,providers:[],projects:[],tasks:[],bridgeToken:'x',bridgeState:{},sessions:new Map(),media:new Map()};
  globalThis.__canvasProviderMigrationPromise=null;
  globalThis.fetch=async(input,init={})=>{
    const u=new URL(typeof input==='string'?input:input.url);
    if(u.hostname==='video.vendor.test'&&u.pathname==='/create')return Response.json({job:{id:'job-1'}});
    if(u.hostname==='video.vendor.test'&&u.pathname==='/status/job-1'){
      pollSeen={method:String(init.method||'GET').toUpperCase(),body:init.body?JSON.parse(String(init.body)):null};
      return Response.json({state:'done',result:{url:'https://cdn.vendor.test/final.mp4'}});
    }
    return realFetch(input,init);
  };
  try{
    const provider=await call('/api/providers',{method:'POST',body:{id:'video-provider',baseUrl:'https://video.vendor.test',apiKey:'k',protocol:'auto',downloadOutputs:false,models:[{id:'video-model',name:'video',modality:'video',adapterKey:'generic-async',createPath:'/create',method:'POST',responseMode:'async',taskIdPath:'job.id',pollPath:'/status/{{taskId}}',pollMethod:'POST',pollBodyTemplate:{job:'{{taskId}}'},statusPath:'state',outputPath:'result.url',successValues:['done'],failureValues:['failed'],pollIntervalMs:500}]}});
    assert.equal(provider.response.status,200);
    const createCtx=context();
    const createRes=await worker.fetch(new Request('https://canvas.test/api/tasks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({providerId:'video-provider',modelId:'video-model',nodeType:'video',prompt:'test',parameters:{duration:5}})}),ENV,createCtx.ctx);
    const created=await createRes.json();await createCtx.flush();
    const taskId=created.task.id;
    const polled=await call('/api/tasks/poll',{method:'POST',body:{taskId}});
    assert.equal(polled.data.task.status,'succeeded');
    assert.deepEqual(pollSeen,{method:'POST',body:{job:'job-1'}});
    assert.equal(polled.data.task.output.value,'https://cdn.vendor.test/final.mp4');
  }finally{globalThis.fetch=realFetch}
});
