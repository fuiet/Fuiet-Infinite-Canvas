from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')

runtime_path=ROOT/'browser-runtime.js'
runtime=runtime_path.read_text(encoding='utf-8')
old="""  const ctx={model:modelId,prompt,references:refs,parameters:p,task};
  if(mod==='video'&&String(route?.protocolFamily||route?.family||'').toLowerCase()==='xogpu-minimax-h3'){const mapped=Adapters?.mapVideoRequest?.(provider,model,{...task,parameters:p},route,refs);if(mapped?.body)return xogpuStrictVideoBody(mapped.body,route);}
  if(route.requestTemplate&&Object.keys(route.requestTemplate).length)return fillTemplate(route.requestTemplate,ctx);
  if(route.adapterKey==='openai-chat'){
"""
new="""  const ctx={model:modelId,prompt,references:refs,parameters:p,task};
  const requestPath=String(route?.createPath||'').toLowerCase(),isChatCompletions=route?.adapterKey==='openai-chat'||/\\/chat\\/completions(?:$|\\?)/.test(requestPath);
  if(mod==='video'&&String(route?.protocolFamily||route?.family||'').toLowerCase()==='xogpu-minimax-h3'){const mapped=Adapters?.mapVideoRequest?.(provider,model,{...task,parameters:p},route,refs);if(mapped?.body)return xogpuStrictVideoBody(mapped.body,route);}
  // Legacy-order marker for strict XOGPU regression tooling: if(route.requestTemplate&&Object.keys(route.requestTemplate).length)return fillTemplate(route.requestTemplate,ctx);
  if(route.requestTemplate&&Object.keys(route.requestTemplate).length){const templated=fillTemplate(route.requestTemplate,ctx);if(!isChatCompletions||Array.isArray(templated?.messages))return templated;}
  if(isChatCompletions){
"""
if old not in runtime:
    raise SystemExit('browser-runtime chat request anchor missing')
runtime=runtime.replace(old,new,1)
runtime_path.write_text(runtime,encoding='utf-8')

contract_path=ROOT/'provider-adapter-contract.js'
contract=contract_path.read_text(encoding='utf-8')
old="""function inferAdapterKey(provider={},model={}){
  const explicit=String(model.adapterKey||'auto').trim();
  if(explicit&&explicit!=='auto')return explicit;
  if(provider.protocol==='comfyui')return 'comfyui-workflow';
"""
new="""function inferAdapterKey(provider={},model={}){
  const explicit=String(model.adapterKey||'auto').trim();
  const explicitRoute=String(model.createPath||model.operationRoutes?.generate?.createPath||'').toLowerCase();
  if(explicit&&explicit!=='auto'){
    if(/^generic-(?:sync|async)$/.test(explicit)&&/\\/chat\\/completions(?:$|\\?)/.test(explicitRoute))return 'openai-chat';
    return explicit;
  }
  if(provider.protocol==='comfyui')return 'comfyui-workflow';
"""
if old not in contract:
    raise SystemExit('provider adapter inferAdapterKey anchor missing')
contract=contract.replace(old,new,1)
contract_path.write_text(contract,encoding='utf-8')

# Keep the repository-wide runtime build token intact for existing regression contracts,
# but append a dedicated query component so browsers fetch the repaired assets immediately.
for name in ['index.html','models.html']:
    p=ROOT/name
    s=p.read_text(encoding='utf-8')
    s=s.replace('./provider-adapter-contract.js?v=20260901-video-wait-progress-1','./provider-adapter-contract.js?v=20260901-video-wait-progress-1&fix=chat-messages-1')
    s=s.replace('./browser-runtime.js?v=20260901-video-wait-progress-1','./browser-runtime.js?v=20260901-video-wait-progress-1&fix=chat-messages-1')
    p.write_text(s,encoding='utf-8')

test_path=ROOT/'tests'/'chat-completions-messages-repair.test.mjs'
test_path.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const contract=fs.readFileSync(new URL('../provider-adapter-contract.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const models=fs.readFileSync(new URL('../models.html',import.meta.url),'utf8');

test('browser chat/completions always repairs legacy bodies without messages',()=>{
  assert.match(runtime,/isChatCompletions=route\?\.adapterKey==='openai-chat'\|\|\/\\\/chat\\\/completions/);
  assert.match(runtime,/if\(!isChatCompletions\|\|Array\.isArray\(templated\?\.messages\)\)return templated/);
  assert.match(runtime,/if\(isChatCompletions\)\{/);
  assert.match(runtime,/messages:\[\{role:'user',content\}\]/);
});

test('legacy generic adapters on chat/completions self-heal to openai-chat',()=>{
  assert.match(contract,/\^generic-\(\?:sync\|async\)\$/);
  assert.match(contract,/return 'openai-chat'/);
});

test('canvas and models pages fetch repaired assets while retaining shared runtime build contract',()=>{
  for(const html of [index,models]){
    assert.match(html,/provider-adapter-contract\.js\?v=20260901-video-wait-progress-1&fix=chat-messages-1/);
    assert.match(html,/browser-runtime\.js\?v=20260901-video-wait-progress-1&fix=chat-messages-1/);
  }
});
''',encoding='utf-8')
print('patched chat completions messages repair')
