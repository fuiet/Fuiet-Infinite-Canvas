import test from 'node:test';
import assert from 'node:assert/strict';
await import('../video-request-parameters.js');
await import('../video-protocol-registry.js');
await import('../provider-runtime-core.js');
await import('../provider-adapter-contract.js');
const A=globalThis.CanvasProviderAdapters;

const stale={id:'MiniMax-H3',name:'MiniMax H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3',routeOrigin:'auto',adapterResolved:{auto:true,key:'standard-video-async-v1'}};

test('auto-injected XOGPU models cannot leak into a different provider',()=>{
  const p=A.finalizeProvider({id:'image-only',name:'Image API',baseUrl:'https://api.jxq.cc/v1',models:[{id:'image-model',name:'Image',modality:'image',modalitySource:'user'},stale]});
  assert.ok(p.models.some(m=>m.id==='image-model'));
  assert.ok(!p.models.some(m=>m.id==='MiniMax-H3'));
});

test('real XOGPU provider keeps MiniMax-H3',()=>{
  const p=A.finalizeProvider({id:'xogpu',name:'XOGPU',baseUrl:'https://xogpu.com/v1',models:[]});
  const m=p.models.find(x=>x.id==='MiniMax-H3');
  assert.ok(m);
  assert.equal(m.videoProtocolFamily,'xogpu-minimax-h3');
});

test('user-owned video model on another provider is preserved',()=>{
  const p=A.finalizeProvider({id:'custom',baseUrl:'https://example.com/v1',models:[{...stale,modalitySource:'user',routeOrigin:'user',adapterResolved:{auto:false,key:'standard-video-async-v1'}}]});
  assert.ok(p.models.some(m=>m.id==='MiniMax-H3'));
});
