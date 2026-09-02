from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / '_read_123_zip_20260821_180410'
ADAPTER = APP / 'provider-adapter-contract.js'
INDEX = APP / 'index.html'
TEST = APP / 'tests' / 'stale-xogpu-family-heal.test.mjs'
VERSION = '20260902-stale-xogpu-family-heal-1'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    out, count = re.subn(pattern, replacement, text, count=1)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, got {count}')
    return out

adapter = ADAPTER.read_text(encoding='utf-8')
old = "function finalizeModel(provider={},model={},nodeType=''){\n  const next=clone(model||{}); next.modality=normalizeModelModality(next.modality,next); const type=normalizeModelModality(nodeType||next.modality,next);"
new = "function finalizeModel(provider={},model={},nodeType=''){\n  const next=clone(model||{}),autoRoute=next.routeOrigin==='auto'||next.adapterResolved?.auto===true;\n  if(autoRoute&&!isXogpuProvider(provider)&&String(next.videoProtocolFamily||'').trim().toLowerCase()==='xogpu-minimax-h3'){delete next.videoProtocolFamily;delete next.videoProtocolProfile}\n  next.modality=normalizeModelModality(next.modality,next); const type=normalizeModelModality(nodeType||next.modality,next);"
adapter = replace_once(adapter, old, new, 'heal stale XOGPU family')
ADAPTER.write_text(adapter, encoding='utf-8')

index = INDEX.read_text(encoding='utf-8')
index = regex_once(index, r"provider-adapter-contract\.js\?v=[^\"]+", f'provider-adapter-contract.js?v={VERSION}', 'bump adapter cache')
INDEX.write_text(index, encoding='utf-8')

TEST.write_text("""import test from 'node:test';
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
""", encoding='utf-8')

print('patched stale XOGPU family healing')
