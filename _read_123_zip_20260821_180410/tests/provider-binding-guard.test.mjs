import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const contractSrc=fs.readFileSync(new URL('provider-adapter-contract.js',root),'utf8');
const ctx={globalThis:{},URL};
vm.createContext(ctx);
vm.runInContext(contractSrc,ctx);
const A=ctx.globalThis.CanvasProviderAdapters;

const dirty=A.finalizeProvider({
  id:'image-only',baseUrl:'https://api.jxq.cc/v1',protocol:'openai-compatible',models:[
    {id:'MiniMax-H3',name:'MiniMax H3',modality:'video',modalitySource:'user',videoProtocolFamily:'xogpu-minimax-h3',routeOrigin:'auto',adapterResolved:{auto:true}},
    {id:'image-model',name:'Image',modality:'image',modalitySource:'user',adapterKey:'openai-image'}
  ]
});
assert.equal(dirty.models.some(m=>m.id==='MiniMax-H3'),false,'non-XOGPU provider must drop XOGPU-only model records even if marked user-owned');
assert.equal(dirty.models.some(m=>m.id==='image-model'),true,'image provider models must remain');

const manualGeneric=A.finalizeProvider({
  id:'other-video',baseUrl:'https://example.com/v1',protocol:'openai-compatible',models:[
    {id:'MiniMax-H3',name:'MiniMax H3',modality:'video',modalitySource:'user',videoProtocolFamily:'minimax-hailuo'}
  ]
});
assert.equal(manualGeneric.models.some(m=>m.id==='MiniMax-H3'),true,'non-XOGPU MiniMax model without XOGPU-only family must remain');

const xogpu=A.finalizeProvider({id:'xogpu',baseUrl:'https://xogpu.com/v1',protocol:'openai-compatible',models:[]});
assert.equal(xogpu.models.some(m=>m.id==='MiniMax-H3'),true,'real XOGPU provider must retain MiniMax-H3');

const appSrc=fs.readFileSync(new URL('app.js',root),'utf8');
assert.match(appSrc,/function providerOwnsModel\(p,m\)/);
assert.match(appSrc,/normalizeClientModality\(m\.modality\)===wanted&&providerOwnsModel\(p,m\)/);
assert.match(appSrc,/provider&&model&&providerOwnsModel\(provider,model\)&&modelRuntimeReady/);

const bootstrapSrc=fs.readFileSync(new URL('browser-bootstrap.js',root),'utf8');
assert.match(bootstrapSrc,/const v='20260902-provider-binding-guard-1'/);
assert.match(bootstrapSrc,/\.\/app\.js\?v=\$\{v\}/);

const indexSrc=fs.readFileSync(new URL('index.html',root),'utf8');
assert.match(indexSrc,/provider-adapter-contract\.js\?v=20260902-provider-model-ownership-2/);
assert.match(indexSrc,/browser-bootstrap\.js\?v=20260902-provider-binding-guard-1/);
console.log('provider binding guard ok');
