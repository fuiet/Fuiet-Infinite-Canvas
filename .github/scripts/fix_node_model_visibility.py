from pathlib import Path
import re

ROOT = Path('_read_123_zip_20260821_180410')


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'pattern not found in {path}: {old[:120]!r}')
    text = text.replace(old, new, 1)
    p.write_text(text, encoding='utf-8')


# 1) Bootstrap must wait for both IndexedDB layers before app.js/models.js start.
replace_once(
    ROOT / 'browser-bootstrap.js',
    "async function start(){await manager.ready;const list=document.querySelector('#canvasViewport')?canvasScripts:document.querySelector('#modelList')?modelScripts:[];for(const script of list)await loadScript(script);document.documentElement.dataset.browserStorageReady='1'}",
    "async function start(){await Promise.all([manager.ready,globalThis.CanvasBrowserRuntime?.ready||Promise.resolve()]);const list=document.querySelector('#canvasViewport')?canvasScripts:document.querySelector('#modelList')?modelScripts:[];for(const script of list)await loadScript(script);document.documentElement.dataset.browserStorageReady='1'}"
)

# 2) Browser Runtime: normalize stale provider records and infer discovered model modality.
runtime_path = ROOT / 'browser-runtime.js'
runtime = runtime_path.read_text(encoding='utf-8')
needle = "function normalizeMod(v){v=String(v||'text').toLowerCase();return v==='script'?'text':v}\n"
insert = needle + r"""function inferDiscoveredModality(value=''){
  const hint=String(value||'').toLowerCase();
  if(/sora|seedance|veo|kling|hailuo|minimax|vidu|wan|hunyuan|video|movie/.test(hint))return 'video';
  if(/gpt[-_. ]?image|dall[-_. ]?e|flux|imagen|ideogram|stable[-_. ]?diffusion|sdxl|image|img/.test(hint))return 'image';
  if(/tts|speech|voice|audio|music|sound/.test(hint))return 'audio';
  return 'text';
}
function normalizeDiscoveredModality(value,model={}){
  const v=String(value||'').trim().toLowerCase();
  if(['text','chat','llm','language','script'].includes(v))return 'text';
  if(['image','images','img','picture','vision-image'].includes(v))return 'image';
  if(['video','videos','movie'].includes(v))return 'video';
  if(['audio','speech','tts','music','voice'].includes(v))return 'audio';
  return inferDiscoveredModality(`${model?.id||''} ${model?.name||''}`);
}
function finalizeRuntimeProvider(provider){
  const base=clone(provider||{});
  base.models=Array.isArray(base.models)?base.models.map(m=>({...m,modality:normalizeDiscoveredModality(m?.modality,m)})):[];
  try{return Adapters?.finalizeProvider?Adapters.finalizeProvider(base):base}catch{return base}
}
"""
if needle not in runtime:
    raise SystemExit('normalizeMod insertion point missing')
runtime = runtime.replace(needle, insert, 1)

old_init = "if(!providerRows.length){const legacy=legacyRead(LEGACY_KEYS.providers,[]);const fallback=legacy.length?legacy:legacyRead('canvas-studio-providers-v1',[]);cache.providers=Array.isArray(fallback)?fallback:[];if(cache.providers.length)await persistProvidersNow()}else cache.providers=await Promise.all(providerRows.map(providerFromRecord));"
new_init = "if(!providerRows.length){const legacy=legacyRead(LEGACY_KEYS.providers,[]);const fallback=legacy.length?legacy:legacyRead('canvas-studio-providers-v1',[]);cache.providers=Array.isArray(fallback)?fallback:[]}else cache.providers=await Promise.all(providerRows.map(providerFromRecord));cache.providers=cache.providers.map(finalizeRuntimeProvider);if(cache.providers.length)await persistProvidersNow();"
if old_init not in runtime:
    raise SystemExit('provider initialization pattern missing')
runtime = runtime.replace(old_init, new_init, 1)

old_discover = "try{const parsed=await providerJson(provider,url,{method:'GET',headers:{accept:'application/json'}});if(parsed.kind!=='json')continue;const data=parsed.value;const list=Array.isArray(data?.data)?data.data:Array.isArray(data?.models)?data.models:Array.isArray(data)?data:null;if(!list)continue;const detected=Adapters?.detectModelListProtocol?.(data,url)||{};const models=list.map(x=>typeof x==='string'?{id:x,name:x}:{id:String(x?.id||x?.name||''),name:String(x?.name||x?.id||''),modality:String(x?.modality||x?.type||'text').toLowerCase(),enabled:true,adapterKey:'auto'}).filter(x=>x.id);const merged={...provider,protocol:provider.protocol||detected.protocol||'auto',models};return{provider:Adapters?.finalizeProvider?Adapters.finalizeProvider(merged):merged,endpoint:url,models}}catch(e){last=e.message}"
new_discover = "try{const parsed=await providerJson(provider,url,{method:'GET',headers:{accept:'application/json'}});if(parsed.kind!=='json')continue;const data=parsed.value;const list=Array.isArray(data?.data)?data.data:Array.isArray(data?.models)?data.models:Array.isArray(data)?data:null;if(!list)continue;const detected=Adapters?.detectModelListProtocol?.(data,url)||{};const models=list.map(x=>typeof x==='string'?{id:x,name:x,modality:inferDiscoveredModality(x),enabled:true,adapterKey:'auto'}:{id:String(x?.id||x?.name||''),name:String(x?.name||x?.id||''),modality:normalizeDiscoveredModality(x?.modality||x?.type,x),enabled:true,adapterKey:'auto'}).filter(x=>x.id);const currentProtocol=String(provider.protocol||'auto');const protocol=(currentProtocol==='auto'||currentProtocol==='generic-rest')?(detected.protocol||currentProtocol):currentProtocol;const finalized=finalizeRuntimeProvider({...provider,protocol,models});return{provider:finalized,endpoint:url,models:finalized.models||models,suggestedProtocol:detected.protocol||''}}catch(e){last=e.message}"
if old_discover not in runtime:
    raise SystemExit('discover pattern missing')
runtime = runtime.replace(old_discover, new_discover, 1)

runtime = runtime.replace("if(path==='/api/providers'&&method==='GET')return json({providers:providers().map(safeProvider)});", "if(path==='/api/providers'&&method==='GET')return json({providers:providers().map(p=>safeProvider(finalizeRuntimeProvider(p)))});", 1)
runtime = runtime.replace("const final=Adapters?.finalizeProvider?Adapters.finalizeProvider(merged):merged;", "const final=finalizeRuntimeProvider(merged);", 1)
old_discover_response = "if(path==='/api/providers/discover-models')return json({ok:true,endpoint:found.endpoint,models:found.models,provider:safeProvider(found.provider),modelCount:found.models.length,protocol:found.provider.protocol||'auto'});"
new_discover_response = "if(path==='/api/providers/discover-models')return json({ok:true,endpoint:found.endpoint,models:found.models,provider:safeProvider(found.provider),modelCount:found.models.length,protocol:found.provider.protocol||'auto',suggestedProtocol:found.suggestedProtocol||''});"
if old_discover_response not in runtime:
    raise SystemExit('discover response pattern missing')
runtime = runtime.replace(old_discover_response, new_discover_response, 1)
runtime_path.write_text(runtime, encoding='utf-8')

# 3) Canvas: resolve executability live instead of letting stale adapterResolved.ready=false veto a model forever.
app_path = ROOT / 'app.js'
app = app_path.read_text(encoding='utf-8')
old_ready = """  function modelRuntimeReady(p,m){
    if(!m||m.enabled===false)return false;
    if(m.adapterResolved&&m.adapterResolved.ready===false)return false;
    if(m.adapterResolved&&m.adapterResolved.ready===true)return true;
    if(p?.protocol==='comfyui')return true;
    if(p?.protocol==='openai-compatible'&&['text','image','audio'].includes(normalizeClientModality(m.modality)))return true;
    if(normalizeClientModality(m.modality)==='video'&&p?.protocol!=='comfyui'&&(p?.videoProtocol==='standard-video-async-v1'||providerHasApiKey(p)))return true;
    return Boolean(String(m.createPath||'').trim()) || normalizeClientModality(m.modality)==='text';
  }
"""
new_ready = """  function modelRuntimeReady(p,m){
    if(!m||m.enabled===false||!String(m.id||'').trim())return false;
    const modality=normalizeClientModality(m.modality);
    try{
      const Contract=globalThis.CanvasProviderAdapters;
      if(Contract?.resolveRoute){
        const route=Contract.resolveRoute(p||{},m,modality,'generate');
        if(route?.adapterKey&&route.adapterKey!=='auto'&&String(route.createPath||'').trim())return true;
      }
    }catch{}
    // adapterResolved is a cache/diagnostic hint only. An old ready=false value must
    // never override a route that the current Provider Core can resolve now.
    if(m.adapterResolved?.ready===true)return true;
    if(p?.protocol==='comfyui')return true;
    if(p?.protocol==='openai-compatible'&&['text','image','audio'].includes(modality))return true;
    if(modality==='video'&&p?.protocol!=='comfyui'&&(p?.videoProtocol==='standard-video-async-v1'||providerHasApiKey(p)))return true;
    return Boolean(String(m.createPath||'').trim()) || modality==='text';
  }
"""
if old_ready not in app:
    raise SystemExit('modelRuntimeReady pattern missing')
app = app.replace(old_ready, new_ready, 1)
app = app.replace("m.enabled!==false&&m.modality===modality&&modelRuntimeReady(p,m)", "m.enabled!==false&&normalizeClientModality(m.modality)===normalizeClientModality(modality)&&modelRuntimeReady(p,m)")
app_path.write_text(app, encoding='utf-8')

# 4) Regression test: provider data may exist with stale ready=false, but nodes must
# still accept it when the current adapter contract resolves a real create route.
test = r"""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('bootstrap waits for Browser Runtime provider hydration before app startup', () => {
  const src = read('browser-bootstrap.js');
  assert.match(src, /Promise\.all\(\[manager\.ready,globalThis\.CanvasBrowserRuntime\?\.ready/);
});

test('browser runtime heals providers and does not blindly classify discovered models as text', () => {
  const src = read('browser-runtime.js');
  assert.match(src, /cache\.providers=cache\.providers\.map\(finalizeRuntimeProvider\)/);
  assert.match(src, /normalizeDiscoveredModality/);
  assert.doesNotMatch(src, /x\?\.modality\|\|x\?\.type\|\|'text'/);
  assert.match(src, /suggestedProtocol:found\.suggestedProtocol/);
});

test('node availability resolves the current adapter route instead of trusting stale ready=false', () => {
  const src = read('app.js');
  assert.match(src, /Contract\.resolveRoute\(p\|\|\{\},m,modality,'generate'\)/);
  assert.doesNotMatch(src, /m\.adapterResolved&&m\.adapterResolved\.ready===false\)return false/);
});

test('auto image/video/text models resolve to executable routes', () => {
  const sandbox = { console, URL };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read('provider-adapter-contract.js'), sandbox);
  const A = sandbox.CanvasProviderAdapters;
  const provider = { baseUrl: 'https://example.com/v1', protocol: 'auto' };
  for (const [modality, id] of [['image','flux-1'],['video','seedance-2'],['text','gpt-5']]) {
    const finalized = A.finalizeProvider({...provider, models:[{id,name:id,modality,enabled:true,adapterKey:'auto'}]});
    const model = finalized.models[0];
    assert.equal(model.adapterResolved.ready, true, `${modality} should be ready`);
    assert.ok(model.createPath, `${modality} should have createPath`);
  }
});
"""
(ROOT / 'tests' / 'node-model-visibility.test.mjs').write_text(test, encoding='utf-8')

print('patched browser bootstrap/runtime/app and added node model visibility regression tests')
