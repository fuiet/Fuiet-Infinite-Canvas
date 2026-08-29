import test from 'node:test';
import assert from 'node:assert/strict';
await import('../video-protocol-registry.js');
await import('../provider-adapter-contract.js');
await import('../provider-runtime-core.js');
const R=globalThis.CanvasVideoProtocolRegistry;
const A=globalThis.CanvasProviderAdapters;
const C=globalThis.CanvasProviderRuntimeCore;
const agnes={baseUrl:'https://apihub.agnes-ai.com/v1',protocol:'openai-compatible'};
const agnesModel={id:'agnes-video-2.5-flash',modality:'video'};

test('video registry exposes Agnes as the only executable video family',()=>{
  assert.equal(R.detectFamily(agnes,agnesModel),'agnes-video');
  assert.equal(R.detectFamily({baseUrl:'https://gateway.example.com'},{id:'kling-v2.1-master'}),'unsupported-video');
  assert.equal(R.detectFamily({baseUrl:'https://gateway.example.com'},{id:'seedance-2.0-pro'}),'unsupported-video');
  assert.deepEqual(R.publicProfiles(),['agnes-video']);
});

test('Agnes resolves to one fixed create route and one fixed polling route',()=>{
  const route=A.resolveVideoRoute(agnes,agnesModel,{parameters:{operation:'generate'}},[]);
  assert.equal(route.protocolFamily,'agnes-video');
  assert.equal(route.protocolProfile,'agnes:agnes-video-2.5-flash');
  assert.equal(route.createPath,'/v1/videos');
  assert.deepEqual(route.createCandidates,['/v1/videos']);
  assert.equal(route.strictPollPath,true);
  assert.equal(route.pollPathCandidates.length,1);
  assert.match(route.pollPath,/\/agnesapi\?video_id=\{\{taskId\}\}&model_name=agnes-video-2\.5-flash$/);
  assert.equal(route.taskIdPaths[0],'video_id');
  assert.equal(route.outputPaths[0],'metadata.url');
});

test('non-Agnes video discovery is non-fatal but remains non-executable',()=>{
  const provider={baseUrl:'https://gateway.example.com',protocol:'openai-compatible'};
  const model={id:'sora-2',name:'Sora 2',modality:'video',adapterKey:'auto'};
  const route=A.resolveVideoRoute(provider,model,{parameters:{}},[]);
  assert.equal(route.protocolFamily,'unsupported-video');
  assert.equal(route.createPath,'');
  assert.deepEqual(route.createCandidates,[]);
  const finalized=A.finalizeModel(provider,model,'video');
  assert.equal(finalized.adapterResolved.ready,false);
  assert.equal(finalized.videoProtocolFamily,'unsupported-video');
  assert.equal(finalized.createPath||'','');
});

test('unsupported video mapping throws before any upstream request body can be used',()=>{
  const provider={baseUrl:'https://gateway.example.com',protocol:'openai-compatible'};
  const model={id:'kling-v2.1',modality:'video'};
  const route=R.resolve(provider,model,'text-to-video');
  assert.equal(route.unsupported,true);
  assert.throws(()=>R.mapRequest(provider,model,{prompt:'x',parameters:{}},route,[]),/仅支持 agnes-video-2\.5-flash/);
});

test('generic generate and t2v i2v aliases still normalize for the Agnes request mapper',()=>{
  assert.equal(R.detectOperation({parameters:{operation:'t2v'}}),'text-to-video');
  assert.equal(R.detectOperation({parameters:{operation:'i2v'}}),'image-to-video');
  assert.equal(R.detectOperation({parameters:{operation:'generate'},references:[{type:'image',url:'https://cdn.example.com/x.png'}]}),'image-to-video');
  const route=A.resolveVideoRoute(agnes,agnesModel,{parameters:{operation:'generate'}},[{type:'image',url:'https://cdn.example.com/x.png'}]);
  const mapped=A.mapVideoRequest(agnes,agnesModel,{prompt:'move',parameters:{operation:'generate'}},route,[{type:'image',url:'https://cdn.example.com/x.png'}]);
  assert.equal(mapped.family,'agnes-video');
  assert.equal(mapped.operation,'image-to-video');
  assert.equal(mapped.body.mode,'keyframe');
});

test('runtime core consumes ordered Agnes task status and output paths',()=>{
  const route=R.resolve(agnes,agnesModel,'text-to-video');
  const raw={video_id:'abc',status:'completed',progress:100,metadata:{url:'https://cdn.example.com/a.mp4'}};
  assert.equal(C.extractTaskId(raw,route),'abc');
  const result=C.classifyAsyncPoll(raw,route,'video');
  assert.equal(result.state,'success');
  assert.equal(result.output,'https://cdn.example.com/a.mp4');
});
