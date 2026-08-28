from pathlib import Path
import json, re

root=Path('_read_123_zip_20260821_180410')

def read(name):
    return (root/name).read_text(encoding='utf-8')

def write(name,text):
    (root/name).write_text(text,encoding='utf-8')

def replace_once(text,old,new,label):
    if old not in text:
        raise SystemExit(f'missing pattern: {label}')
    if text.count(old)!=1:
        raise SystemExit(f'pattern not unique ({text.count(old)}): {label}')
    return text.replace(old,new,1)

# 1) Shared adapter contract: canonicalize model modality and heal legacy discovery rows
# that were incorrectly defaulted to text when /v1/models did not expose a type.
name='provider-adapter-contract.js'
s=read(name)
old="""function modelHint(model={}){\n  return `${model.id||''} ${model.name||''}`.trim().toLowerCase();\n}\nfunction inferAdapterKey(provider={},model={}){"""
new="""function modelHint(model={}){\n  return `${model.id||''} ${model.name||''}`.trim().toLowerCase();\n}\nfunction normalizeModelModality(value,model={}){\n  const raw=String(value||'').trim().toLowerCase().replace(/\\s+/g,'-');\n  const aliases={\n    text:'text',script:'text',chat:'text',llm:'text',language:'text',completion:'text',completions:'text',response:'text',responses:'text',\n    image:'image',images:'image',img:'image',picture:'image','text-to-image':'image','image-to-image':'image','image-generation':'image',image_generation:'image',t2i:'image',i2i:'image',\n    video:'video',videos:'video','text-to-video':'video','image-to-video':'video','video-generation':'video',video_generation:'video',t2v:'video',i2v:'video',\n    audio:'audio',speech:'audio',voice:'audio',tts:'audio',sound:'audio',music:'audio'\n  };\n  const canonical=aliases[raw]||(['text','image','video','audio'].includes(raw)?raw:'');\n  if(model?.modalitySource==='user'&&canonical)return canonical;\n  const adapter=String(model?.adapterKey||model?.adapterResolved?.key||'').toLowerCase();\n  const route=String(model?.createPath||model?.operationRoutes?.generate?.createPath||'').toLowerCase();\n  if(adapter==='openai-image'||/\\/images?(?:\\/|$)|image[-_/]?generation/.test(route))return'image';\n  if(adapter==='standard-video-async-v1'||/\\/videos?(?:\\/|$)|video[-_/]?generation/.test(route))return'video';\n  if(adapter==='openai-audio-speech'||/\\/audio(?:\\/|$)|\\/speech(?:\\/|$)/.test(route))return'audio';\n  if(['openai-chat','openai-responses'].includes(adapter)||/\\/chat\\/completions|\\/responses(?:\\/|$)/.test(route))return'text';\n  if(canonical&&canonical!=='text')return canonical;\n  const hint=modelHint(model);\n  if(/gpt[-_. ]?image|dall[-_. ]?e|(?:^|[-_. ])flux(?:[-_. ]|$)|imagen|ideogram|stable[-_. ]?diffusion|sdxl|(?:^|[-_. ])image(?:[-_. ]|$)/.test(hint))return'image';\n  if(/sora|seedance|veo(?:[-_. ]|$)|kling|hailuo|vidu|hunyuan[-_. ]?video|(?:^|[-_. ])video(?:[-_. ]|$)|(?:^|[-_. ])t2v(?:[-_. ]|$)|(?:^|[-_. ])i2v(?:[-_. ]|$)/.test(hint))return'video';\n  if(/(?:^|[-_. ])tts(?:[-_. ]|$)|speech|voice|whisper/.test(hint))return'audio';\n  return canonical||'text';\n}\nfunction inferAdapterKey(provider={},model={}){"""
s=replace_once(s,old,new,'insert normalizeModelModality')
s=replace_once(s,"const mod=String(model.modality||'image').toLowerCase();","const mod=normalizeModelModality(model.modality,model);",'inferAdapterKey modality')
s=replace_once(s,"const next=clone(model||{}), type=String(nodeType||next.modality||'text').toLowerCase();","const next=clone(model||{}); next.modality=normalizeModelModality(next.modality,next); const type=normalizeModelModality(nodeType||next.modality,next);",'finalizeModel modality')
s=replace_once(s,"globalThis.CanvasProviderAdapters=Object.freeze({SUCCESS,FAILURE,normalizeReferenceTransport,providerLooksOpenAIStyle,inferAdapterKey,adapterDefaults,resolveRoute,finalizeModel,finalizeProvider,detectModelListProtocol});","globalThis.CanvasProviderAdapters=Object.freeze({SUCCESS,FAILURE,normalizeReferenceTransport,normalizeModelModality,providerLooksOpenAIStyle,inferAdapterKey,adapterDefaults,resolveRoute,finalizeModel,finalizeProvider,detectModelListProtocol});",'export normalizeModelModality')
write(name,s)

# 2) Browser runtime: infer modality during discovery, honor detected protocol,
# synchronously commit provider/model saves before reporting success, and heal IndexedDB rows on load.
name='browser-runtime.js'
s=read(name)
s=replace_once(s,
"function saveProviders(list){cache.providers=clone(Array.isArray(list)?list:[]);enqueuePersist(persistProvidersNow);return cache.providers}",
"function normalizeProviderRecord(provider){try{return Adapters?.finalizeProvider?Adapters.finalizeProvider(provider||{}):clone(provider||{})}catch{return clone(provider||{})}}\nfunction saveProviders(list){cache.providers=clone(Array.isArray(list)?list:[]).map(normalizeProviderRecord);enqueuePersist(persistProvidersNow);return cache.providers}\nasync function saveProvidersCommitted(list){cache.providers=clone(Array.isArray(list)?list:[]).map(normalizeProviderRecord);await persistProvidersNow();return cache.providers}",
'committed provider persistence')

old_discover=re.compile(r"async function discover\(provider\)\{.*?throw new Error\(last\|\|'没有发现可用的模型列表接口'\);\n\}",re.S)
match=old_discover.search(s)
if not match:
    raise SystemExit('missing discover function')
new_discover="""async function discover(provider){
  const endpoints=['/v1/models','/models','/api/v1/models','/api/models'];let last='';
  for(const path of endpoints){
    const url=joinUrl(provider.baseUrl,path);
    try{
      const parsed=await providerJson(provider,url,{method:'GET',headers:{accept:'application/json'}});if(parsed.kind!=='json')continue;
      const data=parsed.value,list=Array.isArray(data?.data)?data.data:Array.isArray(data?.models)?data.models:Array.isArray(data)?data:null;if(!list)continue;
      const detected=Adapters?.detectModelListProtocol?.(data,url)||{},currentProtocol=String(provider.protocol||'auto');
      const suggestedProtocol=detected.protocol||'';
      const resolvedProtocol=((!currentProtocol||currentProtocol==='auto'||currentProtocol==='generic-rest')&&suggestedProtocol)?suggestedProtocol:(currentProtocol||'auto');
      const models=list.map(x=>{
        const raw=typeof x==='string'?{id:x,name:x}:x||{},id=String(raw.id||raw.name||''),name=String(raw.name||raw.id||'');if(!id)return null;
        const rawModality=String(raw.modality||raw.type||raw.mode||'').trim();
        const candidate={id,name,modality:rawModality,adapterKey:'auto',createPath:String(raw.createPath||'')};
        const modality=Adapters?.normalizeModelModality?Adapters.normalizeModelModality(rawModality,candidate):String(rawModality||'text').toLowerCase();
        return{id,name,modality,modalitySource:rawModality?'provider':'inferred',enabled:true,adapterKey:'auto',...(raw.owned_by?{ownedBy:String(raw.owned_by)}:{})};
      }).filter(Boolean);
      const merged={...provider,protocol:resolvedProtocol,models};
      const finalized=Adapters?.finalizeProvider?Adapters.finalizeProvider(merged):merged;
      return{provider:finalized,endpoint:url,models:finalized.models||models,suggestedProtocol};
    }catch(e){last=e.message}
  }
  throw new Error(last||'没有发现可用的模型列表接口');
}"""
s=s[:match.start()]+new_discover+s[match.end():]

# Heal decrypted provider rows immediately after IndexedDB hydration.
old="""if(!providerRows.length){const legacy=legacyRead(LEGACY_KEYS.providers,[]);const fallback=legacy.length?legacy:legacyRead('canvas-studio-providers-v1',[]);cache.providers=Array.isArray(fallback)?fallback:[];if(cache.providers.length)await persistProvidersNow()}else cache.providers=await Promise.all(providerRows.map(providerFromRecord));\n  if(!projectRows.length)"""
new="""if(!providerRows.length){const legacy=legacyRead(LEGACY_KEYS.providers,[]);const fallback=legacy.length?legacy:legacyRead('canvas-studio-providers-v1',[]);cache.providers=Array.isArray(fallback)?fallback:[];if(cache.providers.length)await persistProvidersNow()}else cache.providers=await Promise.all(providerRows.map(providerFromRecord));\n  const providerSnapshot=JSON.stringify(cache.providers.map(p=>{const x=clone(p);delete x.apiKey;return x}));\n  cache.providers=cache.providers.map(normalizeProviderRecord);\n  const providerHealed=JSON.stringify(cache.providers.map(p=>{const x=clone(p);delete x.apiKey;return x}))!==providerSnapshot;\n  if(providerHealed&&cache.providers.length)await persistProvidersNow();\n  if(!projectRows.length)"""
s=replace_once(s,old,new,'heal provider rows')

s=replace_once(s,
"function normalizeMod(v){v=String(v||'text').toLowerCase();return v==='script'?'text':v}",
"function normalizeMod(v,model={}){return Adapters?.normalizeModelModality?Adapters.normalizeModelModality(v,model):(String(v||'text').toLowerCase()==='script'?'text':String(v||'text').toLowerCase())}",
'runtime normalizeMod')

old="""    const list=providers(),old=list.find(p=>p.id===body.id),merged={...old,...clone(body),id:body.id||old?.id||uid('provider_'),updatedAt:now(),createdAt:old?.createdAt||now()};if(!String(body.apiKey||'').trim()&&old?.apiKey)merged.apiKey=old.apiKey;const final=Adapters?.finalizeProvider?Adapters.finalizeProvider(merged):merged;const i=list.findIndex(p=>p.id===final.id);if(i>=0)list[i]=final;else list.push(final);saveProviders(list);return json({provider:safeProvider(final)});"""
new="""    const list=providers(),old=list.find(p=>p.id===body.id),merged={...old,...clone(body),id:body.id||old?.id||uid('provider_'),updatedAt:now(),createdAt:old?.createdAt||now()};if(!String(body.apiKey||'').trim()&&old?.apiKey)merged.apiKey=old.apiKey;const final=normalizeProviderRecord(merged),i=list.findIndex(p=>p.id===final.id);if(i>=0)list[i]=final;else list.push(final);await saveProvidersCommitted(list);return json({provider:safeProvider(final)});"""
s=replace_once(s,old,new,'provider POST commit')

old="""if(path.startsWith('/api/providers/')&&method==='DELETE'&&!['test-config','test-auth','diagnose','discover-models'].some(x=>path.endsWith('/'+x))){const id=decodeURIComponent(path.slice('/api/providers/'.length)),list=providers().filter(p=>p.id!==id);saveProviders(list);return json({ok:true});}"""
new="""if(path.startsWith('/api/providers/')&&method==='DELETE'&&!['test-config','test-auth','diagnose','discover-models'].some(x=>path.endsWith('/'+x))){const id=decodeURIComponent(path.slice('/api/providers/'.length)),list=providers().filter(p=>p.id!==id);await saveProvidersCommitted(list);return json({ok:true});}"""
s=replace_once(s,old,new,'provider DELETE commit')

old="""try{const found=await discover(provider);if(path==='/api/providers/discover-models')return json({ok:true,endpoint:found.endpoint,models:found.models,provider:safeProvider(found.provider),modelCount:found.models.length,protocol:found.provider.protocol||'auto'});return json({ok:true,endpoint:found.endpoint,modelCount:found.models.length,protocol:found.provider.protocol||'auto',warning:''});}catch(e){return json({error:String(e.message||e)},400)}"""
new="""try{const found=await discover(provider);if(path==='/api/providers/discover-models')return json({ok:true,endpoint:found.endpoint,models:found.models,provider:safeProvider(found.provider),modelCount:found.models.length,protocol:found.provider.protocol||'auto',suggestedProtocol:found.suggestedProtocol||''});return json({ok:true,endpoint:found.endpoint,modelCount:found.models.length,protocol:found.provider.protocol||'auto',suggestedProtocol:found.suggestedProtocol||'',warning:''});}catch(e){return json({error:String(e.message||e)},400)}"""
s=replace_once(s,old,new,'discover protocol response')
write(name,s)

# 3) Mark explicit UI modality choices so future auto-healing never overrides them.
name='app.js'
s=read(name)
s=replace_once(s,"      route.modality=modality;\n      route.enabled=true;","      route.modality=modality;\n      route.modalitySource='user';\n      route.enabled=true;",'canvas imported model user modality')
write(name,s)

name='models.js'
s=read(name)
s=replace_once(s,"m.modality=val('modality')||m.modality;m.adapterKey=val('adapterKey')||m.adapterKey||'auto';","m.modality=val('modality')||m.modality;m.modalitySource='user';m.adapterKey=val('adapterKey')||m.adapterKey||'auto';",'model manager user modality')
write(name,s)

# Keep dist copy aligned if present.
name='dist/models.js'
if (root/name).exists():
    s=read(name)
    if "m.modality=val('modality')||m.modality;m.adapterKey=val('adapterKey')||m.adapterKey||'auto';" in s:
        s=s.replace("m.modality=val('modality')||m.modality;m.adapterKey=val('adapterKey')||m.adapterKey||'auto';","m.modality=val('modality')||m.modality;m.modalitySource='user';m.adapterKey=val('adapterKey')||m.adapterKey||'auto';",1)
        write(name,s)

# 4) Regression tests.
test_path=root/'tests'/'provider-model-visibility.test.mjs'
test_path.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../provider-adapter-contract.js';

const Contract=globalThis.CanvasProviderAdapters;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');

test('model modality inference repairs legacy /v1/models text defaults',()=>{
  assert.equal(Contract.normalizeModelModality('text',{id:'gpt-image-2',name:'gpt-image-2'}),'image');
  assert.equal(Contract.normalizeModelModality('',{id:'flux-1.1-pro',name:'flux-1.1-pro'}),'image');
  assert.equal(Contract.normalizeModelModality('text',{id:'sora-2',name:'sora-2'}),'video');
  assert.equal(Contract.normalizeModelModality('',{id:'tts-1-hd',name:'tts-1-hd'}),'audio');
  assert.equal(Contract.normalizeModelModality('',{id:'gpt-5.6',name:'gpt-5.6'}),'text');
});

test('explicit user modality always wins over model-name inference',()=>{
  assert.equal(Contract.normalizeModelModality('text',{id:'gpt-image-2',modalitySource:'user'}),'text');
  assert.equal(Contract.normalizeModelModality('image',{id:'sora-2',modalitySource:'user'}),'image');
});

test('legacy wrongly-typed image model becomes an executable image-node model',()=>{
  const p=Contract.finalizeProvider({baseUrl:'https://api.example.com/v1',protocol:'auto',models:[{id:'gpt-image-2',name:'gpt-image-2',modality:'text',enabled:true,adapterKey:'auto'}]});
  assert.equal(p.models[0].modality,'image');
  assert.equal(p.models[0].adapterKey,'openai-image');
  assert.equal(p.models[0].adapterResolved.ready,true);
});

test('browser discovery does not default every untyped model to text and returns protocol suggestion',()=>{
  const src=read('browser-runtime.js');
  assert.match(src,/normalizeModelModality\?Adapters\.normalizeModelModality/);
  assert.match(src,/modalitySource:rawModality\?'provider':'inferred'/);
  assert.match(src,/suggestedProtocol/);
  assert.doesNotMatch(src,/modality:String\(x\?\.modality\|\|x\?\.type\|\|'text'\)/);
});

test('provider save is durably committed before API success is returned',()=>{
  const src=read('browser-runtime.js');
  assert.match(src,/async function saveProvidersCommitted/);
  assert.match(src,/await persistProvidersNow\(\)/);
  assert.match(src,/await saveProvidersCommitted\(list\);return json\(\{provider:/);
});

test('manual model type selections are marked as user-owned',()=>{
  assert.match(read('app.js'),/route\.modalitySource='user'/);
  assert.match(read('models.js'),/m\.modalitySource='user'/);
});
''',encoding='utf-8')

pkg_path=root/'package.json'
pkg=json.loads(pkg_path.read_text(encoding='utf-8'))
pkg['version']='4.7.1'
pkg_path.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
