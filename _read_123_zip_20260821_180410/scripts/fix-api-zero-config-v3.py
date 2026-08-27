from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / 'server.js'
APP = ROOT / 'app.js'
MODELS = ROOT / 'models.js'
TEST = ROOT / 'tests' / 'provider-save-auto-discovery.test.mjs'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)

server = SERVER.read_text(encoding='utf-8')

server = replace_once(
    server,
    "function providerHeaders(provider, extra={}) {\n  const headers = { 'Content-Type': 'application/json', ...sanitizeHeaderObject(provider.defaultHeaders || {}), ...sanitizeHeaderObject(extra) };",
    "function providerHeaders(provider, extra={}, authOverride=null) {\n  const headers = { 'Content-Type': 'application/json', ...sanitizeHeaderObject(provider.defaultHeaders || {}), ...sanitizeHeaderObject(extra) };",
    'providerHeaders signature'
)
server = replace_once(
    server,
    """  if (key) {
    const headerName = provider.authHeader || 'Authorization';
    const scheme = String(provider.authScheme || '').trim();
    key = normalizeApiKeyValue(key, scheme, headerName);
    // Never emit `Bearer Bearer xxx` even for legacy data.
    headers[headerName] = scheme ? `${scheme} ${key}` : key;
  }
  return headers;
}""",
    """  if (key) {
    const headerName = authOverride?.header || provider.authHeader || 'Authorization';
    const scheme = String(authOverride ? (authOverride.scheme ?? '') : (provider.authScheme || '')).trim();
    key = normalizeApiKeyValue(key, scheme, headerName);
    // Never emit `Bearer Bearer xxx` even for legacy data.
    headers[headerName] = scheme ? `${scheme} ${key}` : key;
  }
  return headers;
}
function providerAuthCandidates(provider){
  const raw=[
    {header:String(provider?.authHeader||'Authorization'),scheme:String(provider?.authScheme??'Bearer').trim()},
    {header:'Authorization',scheme:'Bearer'},
    {header:'x-api-key',scheme:''},
    {header:'api-key',scheme:''}
  ];
  const seen=new Set();
  return raw.filter(item=>{const key=`${item.header.toLowerCase()}|${item.scheme.toLowerCase()}`;if(seen.has(key))return false;seen.add(key);return true;});
}""",
    'provider auth candidates'
)

server = replace_once(
    server,
    """  if (/\\/v1$/i.test(base)) return ['/models'];
  return ['/v1/models', '/models'];
}""",
    """  if (/\\/v1$/i.test(base)) return ['/models'];
  return ['/v1/models', '/models', '/api/v1/models', '/api/models'];
}""",
    'model endpoint candidates'
)

old_fetch = """async function fetchModelsFromProvider(provider) {
  if (!provider.baseUrl) throw new Error('Base URL 不能为空');
  const errors = [];
  for (const route of modelEndpointCandidates(provider)) {
    const url = joinUrl(provider.baseUrl, route);
    try {
      const data = await fetchJson(url, { method:'GET', headers:providerHeaders(provider), timeoutMs:15000, provider });
      const models = normalizeDiscoveredModels(data);
      if (models.length) return { models, endpoint:route, preview:JSON.stringify(data).slice(0,500), suggestedProtocol:detectModelListProtocol(data,route) };
      errors.push(`${route}: 已连接，但没有识别到模型列表`);
    } catch (err) {
      errors.push(`${route}: ${err.message}`);
    }
  }
  throw new Error(`连接成功性无法确认或未找到模型列表。${errors.join('；')}`);
}"""
new_fetch = """async function fetchModelsFromProvider(provider) {
  if (!provider.baseUrl) throw new Error('Base URL 不能为空');
  const errors = [];
  const authCandidates=providerAuthCandidates(provider);
  for (const route of modelEndpointCandidates(provider)) {
    const url = joinUrl(provider.baseUrl, route);
    for(const auth of authCandidates){
      try {
        const data = await fetchJson(url, { method:'GET', headers:providerHeaders(provider,{},auth), timeoutMs:15000, provider });
        const models = normalizeDiscoveredModels(data);
        if (models.length) return { models, endpoint:route, auth, preview:JSON.stringify(data).slice(0,500), suggestedProtocol:detectModelListProtocol(data,route) };
        errors.push(`${route} [${auth.header}]: 已连接，但没有识别到模型列表`);
        break;
      } catch (err) {
        errors.push(`${route} [${auth.header}]: ${err.message}`);
        if(err?.status===401||err?.status===403)continue;
        break;
      }
    }
  }
  throw new Error(`连接成功性无法确认或未找到模型列表。${errors.join('；')}`);
}"""
server = replace_once(server, old_fetch, new_fetch, 'fetchModelsFromProvider')

server = replace_once(
    server,
    "return {ok:true,verified:true,endpoint:discovered.endpoint,modelCount:discovered.models.length,mode:'model-list'};",
    "return {ok:true,verified:true,endpoint:discovered.endpoint,modelCount:discovered.models.length,mode:'model-list',authHeader:discovered.auth?.header||provider.authHeader,authScheme:discovered.auth?.scheme??provider.authScheme};",
    'test auth detected mode'
)

server = replace_once(
    server,
    "return { ok:true, endpoint:discovered.endpoint, count:discovered.models.length, models:discovered.models, suggestedProtocol:discovered.suggestedProtocol||'' };",
    "return { ok:true, endpoint:discovered.endpoint, count:discovered.models.length, modelCount:discovered.models.length, models:discovered.models, suggestedProtocol:discovered.suggestedProtocol||'', authHeader:discovered.auth?.header||provider.authHeader, authScheme:discovered.auth?.scheme??provider.authScheme };",
    'discover response auth metadata'
)

old_post = """    if(pathname==='/api/providers'&&req.method==='POST'){
      const body=await readJson(req),list=loadProvidersRaw(),index=body.id?list.findIndex(p=>p.id===body.id):-1,saved=normalizeProvider(body,index>=0?list[index]:null);
      if(!saved.baseUrl)return json(res,400,{error:'Base URL 不能为空'});try{await validateOutboundUrl(saved.baseUrl,saved)}catch(err){return json(res,400,{error:err.message})}
      if(saved.models.some(m=>!m.id||!m.modality))return json(res,400,{error:'模型 ID 和类型不能为空'});if(index>=0)list[index]=saved;else list.push(saved);saveProvidersRaw(list);return json(res,200,{provider:publicProvider(saved)});
    }"""
new_post = """    if(pathname==='/api/providers'&&req.method==='POST'){
      const body=await readJson(req),list=loadProvidersRaw(),index=body.id?list.findIndex(p=>p.id===body.id):-1,saved=normalizeProvider(body,index>=0?list[index]:null);
      if(!saved.baseUrl)return json(res,400,{error:'Base URL 不能为空'});try{await validateOutboundUrl(saved.baseUrl,saved)}catch(err){return json(res,400,{error:err.message})}
      if(saved.models.some(m=>!m.id||!m.modality))return json(res,400,{error:'模型 ID 和类型不能为空'});
      let warning='',autoConfigured=false,discoveredEndpoint='';
      if(!saved.models.length){
        try{
          const discovered=await fetchModelsFromProvider(saved);
          saved.models=discovered.models.map(normalizeModel);
          saved.authHeader=discovered.auth?.header||saved.authHeader;
          saved.authScheme=discovered.auth?.scheme??saved.authScheme;
          if(saved.protocol==='auto'&&discovered.suggestedProtocol)saved.protocol=discovered.suggestedProtocol;
          const finalized=ProviderAdapterContract.finalizeProvider(saved);
          saved.models=finalized.models||saved.models;
          autoConfigured=true;discoveredEndpoint=discovered.endpoint||'';
        }catch(error){warning=`供应商已保存，但没有发现模型列表：${String(error?.message||error)}`;}
      }else{
        const finalized=ProviderAdapterContract.finalizeProvider(saved);
        saved.models=finalized.models||saved.models;
      }
      if(index>=0)list[index]=saved;else list.push(saved);saveProvidersRaw(list);
      return json(res,200,{provider:publicProvider(saved),modelCount:saved.models.length,autoConfigured,discoveredEndpoint,warning});
    }"""
server = replace_once(server, old_post, new_post, 'provider POST auto-discovery')

SERVER.write_text(server, encoding='utf-8')

app = APP.read_text(encoding='utf-8')
app = replace_once(
    app,
    "videoProtocolConfig:{pollPath:'/v1/video/generations/{{taskId}}',taskIdPath:'',statusPath:'',progressPath:'',outputPath:'',successValues:['succeeded','completed','success','done','finished']",
    "videoProtocolConfig:{createPath:'/v1/videos',pollPath:'/v1/videos/{{taskId}}',contentPath:'/v1/videos/{{taskId}}/content',taskIdPath:'',statusPath:'',progressPath:'',outputPath:'',successValues:['succeeded','completed','success','done','finished']",
    'empty provider current video contract'
)
app = replace_once(
    app,
    "if(d.protocol==='generic-rest'&&out.suggestedProtocol==='openai-compatible')",
    "if((d.protocol==='auto'||d.protocol==='generic-rest')&&out.suggestedProtocol==='openai-compatible')",
    'browser protocol auto detection'
)
app = replace_once(
    app,
    "<div class=\"provider-field full\"><label>创建接口</label><input value=\"POST /v1/video/generations\" disabled>",
    "<div class=\"provider-field full\"><label>创建接口</label><input value=\"POST /v1/videos\" disabled>",
    'hidden video protocol label'
)
APP.write_text(app, encoding='utf-8')

models = MODELS.read_text(encoding='utf-8')
start = models.find('  function resolvedAdapter(p,m){')
end = models.find('\n\nconst defaultModel=', start)
if start < 0 or end < 0:
    raise SystemExit('models resolvedAdapter block not found')
replacement = """  function resolvedAdapter(p,m){
    const r=m.adapterResolved||{};if(r.key)return r;
    const Contract=globalThis.CanvasProviderAdapters;
    if(Contract?.resolveRoute){
      try{
        const route=Contract.resolveRoute(p,m,m.modality||'text','generate');
        const k=route.adapterKey||Contract.inferAdapterKey?.(p,m)||'auto';
        const ready=Boolean(m.id)&&k!=='auto'&&Boolean(route.createPath);
        return{key:k,label:adapterLabels[k]||'自动适配',ready,createPath:route.createPath||'',responseMode:route.responseMode||''};
      }catch{}
    }
    let k=String(m.adapterKey||'auto');
    if(k==='auto'){
      if(p.protocol==='comfyui')k='comfyui-workflow';
      else if(p.protocol==='openai-compatible')k=m.modality==='text'?'openai-chat':m.modality==='image'?'openai-image':m.modality==='audio'?'openai-audio-speech':m.modality==='video'?'standard-video-async-v1':'auto';
    }
    return{key:k,label:adapterLabels[k]||'自动适配',ready:Boolean(m.id)&&k!=='auto'};
  }"""
models = models[:start] + replacement + models[end:]
MODELS.write_text(models, encoding='utf-8')

TEST.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');
function listen(server){return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve(server.address().port));});}
function close(server){return new Promise(resolve=>server.close(()=>resolve()));}
async function freePort(){const s=net.createServer();const p=await listen(s);await close(s);return p;}
async function waitHealth(port,child){const end=Date.now()+10000;while(Date.now()<end){if(child.exitCode!=null)throw new Error(`server exited ${child.exitCode}`);try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,60));}throw new Error('health timeout');}
async function stop(child){if(child.exitCode!=null)return;child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,2500))]);if(child.exitCode==null)child.kill('SIGKILL');}
async function call(port,pathName,body){const res=await fetch(`http://127.0.0.1:${port}${pathName}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return{res,data:await res.json()};}
async function fixture(){const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'canvas-api-zero-config-'));for(const n of ['server.js','store.js','provider-adapter-contract.js','provider-runtime-core.js'])fs.copyFileSync(path.join(ROOT,n),path.join(tmp,n));const port=await freePort();const child=spawn(process.execPath,['server.js'],{cwd:tmp,env:{...process.env,NODE_NO_WARNINGS:'1',HOST:'127.0.0.1',PORT:String(port),CANVAS_ADMIN_PASSWORD:''},stdio:['ignore','pipe','pipe']});await waitHealth(port,child);return{tmp,port,child};}

test('saving only Base URL + API Key auto-discovers models, auth style and executable adapters',{concurrency:false},async()=>{
  let authSeen='';let xApiKeySeen='';
  const upstream=http.createServer((req,res)=>{
    authSeen=String(req.headers.authorization||'');xApiKeySeen=String(req.headers['x-api-key']||'');
    if(req.url==='/v1/models'){
      if(xApiKeySeen!=='key-123'){res.writeHead(401,{'content-type':'application/json'});return res.end('{"error":{"message":"bad auth"}}');}
      res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({object:'list',data:[{id:'gpt-5',object:'model'},{id:'gpt-image-1',object:'model'},{id:'sora-2',object:'model'}]}));
    }
    res.writeHead(404,{'content-type':'application/json'});res.end('{}');
  });
  const upstreamPort=await listen(upstream);const fx=await fixture();
  try{
    const {res,data}=await call(fx.port,'/api/providers',{baseUrl:`http://127.0.0.1:${upstreamPort}`,apiKey:'key-123',allowPrivateHosts:true});
    assert.equal(res.status,200,JSON.stringify(data));
    assert.equal(data.modelCount,3);
    assert.equal(data.autoConfigured,true);
    assert.equal(data.provider.protocol,'openai-compatible');
    assert.equal(data.provider.authHeader,'x-api-key');
    assert.equal(data.provider.authScheme,'');
    assert.equal(JSON.stringify(data).includes('key-123'),false);
    const byId=Object.fromEntries(data.provider.models.map(m=>[m.id,m]));
    assert.equal(byId['gpt-5'].createPath,'/v1/chat/completions');
    assert.equal(byId['gpt-image-1'].createPath,'/v1/images/generations');
    assert.equal(byId['sora-2'].createPath,'/v1/videos');
    assert.equal(byId['sora-2'].pollPath,'/v1/videos/{{taskId}}');
    assert.equal(byId['sora-2'].contentPath,'/v1/videos/{{taskId}}/content');
    assert.equal(authSeen.startsWith('Bearer '),true,'Bearer is tried before x-api-key');
    assert.equal(xApiKeySeen,'key-123');
  } finally {await stop(fx.child);fs.rmSync(fx.tmp,{recursive:true,force:true});await close(upstream);}
});

test('provider is still saved when model discovery is unavailable',{concurrency:false},async()=>{
  const upstream=http.createServer((req,res)=>{res.writeHead(req.url==='/'?200:404,{'content-type':'application/json'});res.end(req.url==='/'?'{}':'{"error":"not found"}');});
  const upstreamPort=await listen(upstream);const fx=await fixture();
  try{
    const {res,data}=await call(fx.port,'/api/providers',{baseUrl:`http://127.0.0.1:${upstreamPort}`,apiKey:'abc',allowPrivateHosts:true});
    assert.equal(res.status,200,JSON.stringify(data));
    assert.equal(data.modelCount,0);
    assert.equal(data.autoConfigured,false);
    assert.match(String(data.warning||''),/已保存|没有发现模型/);
    const listed=await fetch(`http://127.0.0.1:${fx.port}/api/providers`).then(r=>r.json());
    assert.equal(listed.providers.length,1);
    assert.equal(listed.providers[0].hasApiKey,true);
  } finally {await stop(fx.child);fs.rmSync(fx.tmp,{recursive:true,force:true});await close(upstream);}
});
''',encoding='utf-8')

print('Applied focused Base URL + API Key zero-config repair.')
