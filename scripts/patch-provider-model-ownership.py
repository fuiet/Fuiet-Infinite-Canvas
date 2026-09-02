from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'_read_123_zip_20260821_180410'
CONTRACT=APP/'provider-adapter-contract.js'
INDEX=APP/'index.html'
TEST=APP/'tests'/'provider-model-ownership.test.mjs'
VERSION='20260902-provider-model-ownership-1'

def once(text,old,new,label):
    c=text.count(old)
    if c!=1:
        raise RuntimeError(f'{label}: expected 1 match, got {c}')
    return text.replace(old,new,1)

contract=CONTRACT.read_text(encoding='utf-8')
old="""function finalizeProvider(provider={}){\n  const next=clone(provider||{});\n  let models=Array.isArray(next.models)?next.models:[];\n  if(isAgnesProvider(next)){"""
new="""function finalizeProvider(provider={}){\n  const next=clone(provider||{});\n  let models=Array.isArray(next.models)?next.models:[];\n  const xogpuProvider=isXogpuProvider(next);\n  if(!xogpuProvider){\n    models=models.filter(model=>{\n      const family=String(model?.videoProtocolFamily||model?.protocolFamily||'').trim().toLowerCase();\n      const auto=model?.routeOrigin==='auto'||model?.adapterResolved?.auto===true;\n      const userOwned=String(model?.modalitySource||'').trim().toLowerCase()==='user';\n      return !(auto&&!userOwned&&family==='xogpu-minimax-h3');\n    });\n  }\n  if(isAgnesProvider(next)){"""
contract=once(contract,old,new,'add provider model ownership filter')
contract=contract.replace("  if(isXogpuProvider(next)){","  if(xogpuProvider){",1)
# Remove the previous weaker repair that kept the foreign XOGPU model as a generic video model.
old2="""  const next=clone(model||{}),autoRoute=next.routeOrigin==='auto'||next.adapterResolved?.auto===true;\n  if(autoRoute&&!isXogpuProvider(provider)&&String(next.videoProtocolFamily||'').trim().toLowerCase()==='xogpu-minimax-h3'){delete next.videoProtocolFamily;delete next.videoProtocolProfile}\n  next.modality=normalizeModelModality(next.modality,next); const type=normalizeModelModality(nodeType||next.modality,next);"""
new2="""  const next=clone(model||{});\n  next.modality=normalizeModelModality(next.modality,next); const type=normalizeModelModality(nodeType||next.modality,next);"""
contract=once(contract,old2,new2,'remove weaker stale family conversion')
CONTRACT.write_text(contract,encoding='utf-8')

index=INDEX.read_text(encoding='utf-8')
index,n=re.subn(r'provider-adapter-contract\.js\?v=[^\"]+',f'provider-adapter-contract.js?v={VERSION}',index,count=1)
if n!=1: raise RuntimeError(f'bump contract cache: expected 1 match, got {n}')
INDEX.write_text(index,encoding='utf-8')

TEST.write_text("""import test from 'node:test';
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
""",encoding='utf-8')
print('patched provider model ownership')
