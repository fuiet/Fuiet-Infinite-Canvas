import test from 'node:test';
import assert from 'node:assert/strict';
await import('../video-protocol-registry.js');
await import('../provider-adapter-contract.js');
const A=globalThis.CanvasProviderAdapters;

test('auto-generated XOGPU family is healed when provider base URL is no longer XOGPU',()=>{
  const provider={
    id:'legacy-provider',
    baseUrl:'https://api.jxq.cc/v1',
    protocol:'openai-compatible',
    models:[{
      id:'MiniMax-H3',name:'MiniMax H3',modality:'video',
      adapterKey:'standard-video-async-v1',createPath:'/v1/videos',responseMode:'async',
      videoProtocolFamily:'xogpu-minimax-h3',videoProtocolProfile:'xogpu:minimax-h3',
      routeOrigin:'auto',adapterResolved:{auto:true,key:'standard-video-async-v1'}
    }]
  };
  const finalized=A.finalizeProvider(provider),model=finalized.models[0];
  assert.equal(model.videoProtocolFamily,'minimax-hailuo');
  assert.notEqual(model.videoProtocolProfile,'xogpu:minimax-h3');
  assert.equal(model.createPath,'/v1/video/generations');
  assert.equal(model.routeOrigin,'auto');
  const route=A.resolveVideoRoute(finalized,model,{parameters:{operation:'text2video'}},[]);
  assert.equal(route.protocolFamily,'minimax-hailuo');
  assert.equal(route.createPath,'/v1/video/generations');
  assert.ok(route.createCandidates.includes('/v1/videos'));
  assert.ok(route.createCandidates.includes('/v1/videos/generations'));
});

test('real XOGPU provider keeps its dedicated MiniMax-H3 protocol',()=>{
  const provider=A.finalizeProvider({id:'xogpu',baseUrl:'https://xogpu.com/v1',protocol:'auto',models:[]});
  const model=provider.models.find(item=>item.id==='MiniMax-H3');
  assert.ok(model);
  assert.equal(model.videoProtocolFamily,'xogpu-minimax-h3');
  assert.equal(model.createPath,'/v1/videos');
});
