from pathlib import Path
import re

root=Path('_read_123_zip_20260821_180410')
contract=root/'provider-adapter-contract.js'
app=root/'app.js'
index=root/'index.html'

def replace_once(path, old, new, label):
    text=path.read_text(encoding='utf-8')
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    path.write_text(text.replace(old,new,1),encoding='utf-8')

replace_once(contract,"""  if(!xogpuProvider){
    models=models.filter(model=>{
      const family=String(model?.videoProtocolFamily||model?.protocolFamily||'').trim().toLowerCase();
      const auto=model?.routeOrigin==='auto'||model?.adapterResolved?.auto===true;
      const userOwned=String(model?.modalitySource||'').trim().toLowerCase()==='user';
      return !(auto&&!userOwned&&family==='xogpu-minimax-h3');
    });
  }
""","""  if(!xogpuProvider){
    models=models.filter(model=>String(model?.videoProtocolFamily||model?.protocolFamily||'').trim().toLowerCase()!=='xogpu-minimax-h3');
  }
""",'strict XOGPU ownership')

replace_once(app,"""  function modelForNode(n){const p=providerById(n.providerId);return p?.models?.find(m=>m.id===n.modelId&&normalizeClientModality(m.modality)===n.type)||null}
""","""  function providerOwnsModel(p,m){
    if(!p||!m)return false;
    const family=String(m.videoProtocolFamily||m.protocolFamily||'').trim().toLowerCase();
    if(family!=='xogpu-minimax-h3')return true;
    try{const h=new URL(String(p.baseUrl||'')).hostname.toLowerCase();return h==='xogpu.com'||h.endsWith('.xogpu.com')}catch{return false}
  }
  function modelForNode(n){const p=providerById(n.providerId);return p?.models?.find(m=>m.id===n.modelId&&normalizeClientModality(m.modality)===n.type&&providerOwnsModel(p,m))||null}
""",'node model ownership guard')

replace_once(app,"""  function allModelsForType(type){
    const wanted=normalizeClientModality(type);
    return providers.flatMap(p=>(p.models||[]).filter(m=>m.enabled!==false&&normalizeClientModality(m.modality)===wanted).map(m=>({...m,modality:wanted,providerId:p.id,providerName:p.name||'API',runtimeReady:modelRuntimeReady(p,m)})));
  }
""","""  function allModelsForType(type){
    const wanted=normalizeClientModality(type);
    return providers.flatMap(p=>(p.models||[]).filter(m=>m.enabled!==false&&normalizeClientModality(m.modality)===wanted&&providerOwnsModel(p,m)).map(m=>({...m,modality:wanted,providerId:p.id,providerName:p.name||'API',runtimeReady:modelRuntimeReady(p,m)})));
  }
""",'model picker ownership guard')

replace_once(app,"""if(provider&&model&&modelRuntimeReady(provider,model))out.push({provider,model,providerId:provider.id,modelId:model.id,modelName:model.name||model.id,primary:Boolean(ref.primary)})""","""if(provider&&model&&providerOwnsModel(provider,model)&&modelRuntimeReady(provider,model))out.push({provider,model,providerId:provider.id,modelId:model.id,modelName:model.name||model.id,primary:Boolean(ref.primary)})""",'fallback ownership guard')

text=index.read_text(encoding='utf-8')
text,n=re.subn(r'provider-adapter-contract\.js\?v=[^\"]+', 'provider-adapter-contract.js?v=20260902-provider-model-ownership-2', text, count=1)
if n!=1: raise SystemExit(f'provider adapter cache: expected 1 match, got {n}')
text,n=re.subn(r'app\.js\?v=[^\"]+', 'app.js?v=20260902-provider-binding-guard-1', text, count=1)
if n!=1: raise SystemExit(f'app cache: expected 1 match, got {n}')
index.write_text(text,encoding='utf-8')

(root/'tests/provider-binding-guard.test.mjs').write_text(r'''import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const contractSrc=fs.readFileSync(new URL('provider-adapter-contract.js',root),'utf8');
const ctx={globalThis:{}};
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
assert.equal(xogpu.models.some(m=>m.id==='MiniMax-H3'&&m.videoProtocolFamily==='xogpu-minimax-h3'),true,'real XOGPU provider must retain MiniMax-H3');

const appSrc=fs.readFileSync(new URL('app.js',root),'utf8');
assert.match(appSrc,/function providerOwnsModel\(p,m\)/);
assert.match(appSrc,/normalizeClientModality\(m\.modality\)===wanted&&providerOwnsModel\(p,m\)/);
assert.match(appSrc,/provider&&model&&providerOwnsModel\(provider,model\)&&modelRuntimeReady/);

const indexSrc=fs.readFileSync(new URL('index.html',root),'utf8');
assert.match(indexSrc,/provider-adapter-contract\.js\?v=20260902-provider-model-ownership-2/);
assert.match(indexSrc,/app\.js\?v=20260902-provider-binding-guard-1/);
console.log('provider binding guard ok');
''',encoding='utf-8')
