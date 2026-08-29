import test from 'node:test';
import assert from 'node:assert/strict';
await import('../video-protocol-registry.js');
await import('../provider-adapter-contract.js');
await import('../provider-runtime-core.js');
const R=globalThis.CanvasVideoProtocolRegistry,A=globalThis.CanvasProviderAdapters,C=globalThis.CanvasProviderRuntimeCore;

test('video registry detects major model families including artsdance as seedance gateway',()=>{
  assert.equal(R.detectFamily({}, {id:'kling-v2.1-master'}),'kling');
  assert.equal(R.detectFamily({}, {id:'seedance-2.0-pro'}),'seedance');
  assert.equal(R.detectFamily({}, {id:'artsdance2.0-pro-260801'}),'seedance');
  assert.equal(R.detectFamily({}, {id:'minimax-h3'}),'minimax-hailuo');
  assert.equal(R.detectFamily({}, {id:'vidu-q2'}),'vidu');
  assert.equal(R.detectFamily({}, {id:'veo-3.1'}),'veo');
  assert.equal(R.detectFamily({}, {id:'wan2.2-i2v'}),'wan');
});

test('Kling and Seedance resolve to distinct model-family profiles instead of one blind standard route',()=>{
  const p={baseUrl:'https://gateway.example.com',protocol:'openai-compatible',videoProtocol:'auto'};
  const kling=A.resolveVideoRoute(p,{id:'kling-v2.1',modality:'video',adapterKey:'auto'},{parameters:{}},[]);
  const seed=A.resolveVideoRoute(p,{id:'artsdance2.0-pro-260801',modality:'video',adapterKey:'auto'},{parameters:{}},[]);
  assert.equal(kling.protocolFamily,'kling');
  assert.equal(seed.protocolFamily,'seedance');
  assert.ok(kling.createCandidates.includes('/v1/video/generations'));
  assert.ok(seed.pollPathCandidates.includes('/v1/video/generations/{{taskId}}'));
  assert.notEqual(kling.protocolProfile,seed.protocolProfile);
});

test('model-level video protocol override wins over family and provider defaults',()=>{
  const p={baseUrl:'https://gateway.example.com',videoProtocol:'auto',videoProtocolConfig:{createPath:'/v1/videos'}};
  const m={id:'seedance-2.0',modality:'video',videoProtocolConfig:{createPath:'/custom/seedance/create',pollPath:'/custom/tasks/{{taskId}}',outputPaths:['data.final.url']}};
  const route=A.resolveVideoRoute(p,m,{parameters:{}},[]);
  assert.equal(route.createPath,'/custom/seedance/create');
  assert.equal(route.pollPath,'/custom/tasks/{{taskId}}');
  assert.ok(route.outputPaths.includes('data.final.url'));
});

test('runtime core consumes ordered plural task/status/output paths',()=>{
  const cfg={taskIdPaths:['meta.task'],'statusPaths:['meta.state'],outputPaths:['meta.video.url'],successValues:['ready']};
  const raw={meta:{task:'abc',state:'ready',video:{url:'https://cdn.example.com/a.mp4'}}};
  assert.equal(C.extractTaskId(raw,cfg),'abc');
  const a=C.classifyAsyncPoll(raw,cfg,'video');
  assert.equal(a.state,'success');
  assert.equal(a.output,'https://cdn.example.com/a.mp4');
});

test('DataEyes Kling chooses text or image operation route',()=>{
  const p={baseUrl:'https://platform.dataeyes.ai'};
  const m={id:'kling-v2.1',modality:'video'};
  const text=A.resolveVideoRoute(p,m,{parameters:{}},[]);
  const image=A.resolveVideoRoute(p,m,{parameters:{}},[{type:'image',url:'x'}]);
  assert.equal(text.createPath,'/kling/v1/videos/text2video');
  assert.equal(image.createPath,'/kling/v1/videos/image2video');
});
