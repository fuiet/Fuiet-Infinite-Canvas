from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / 'server.js'
TEST = ROOT / 'tests' / 'node-provider-security.test.mjs'
source = SERVER.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    source = source.replace(old, new, 1)


replace_once(
    "if(!['http:','https:'].includes(u.protocol))throw new Error('仅允许 HTTP/HTTPS 供应商');\n  const host=u.hostname.toLowerCase();",
    "if(!['http:','https:'].includes(u.protocol))throw new Error('仅允许 HTTP/HTTPS 供应商');\n  if(u.username||u.password)throw new Error('上游 URL 不允许包含用户名或密码');\n  const host=u.hostname.toLowerCase();",
    'reject URL userinfo',
)

replace_once(
    """async function fetchSafe(url,options={},provider={}){
  let current=await validateOutboundUrl(url,provider);
  for(let i=0;i<4;i++){
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),options.timeoutMs||60000);
    try{
      const res=await fetch(current,{...options,signal:controller.signal,redirect:'manual',timeoutMs:undefined});
      if([301,302,303,307,308].includes(res.status)&&res.headers.get('location')){
        const next=new URL(res.headers.get('location'),current).toString();current=await validateOutboundUrl(next,provider);continue;
      }
      return res;
    }finally{clearTimeout(timeout)}
  }
  throw new Error('上游重定向次数过多');
}""",
    """async function fetchSafe(url,options={},provider={},policy={}){
  const sameOrigin=policy.sameOrigin!==false&&Boolean(provider?.baseUrl);
  let baseOrigin='';
  if(sameOrigin){
    const base=await validateOutboundUrl(provider.baseUrl,provider);baseOrigin=new URL(base).origin;
  }
  let current=await validateOutboundUrl(url,provider);
  if(sameOrigin&&new URL(current).origin!==baseOrigin)throw new Error('上游请求必须与 API Base URL 同源');
  for(let i=0;i<4;i++){
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),options.timeoutMs||60000);
    try{
      const res=await fetch(current,{...options,signal:controller.signal,redirect:'manual',timeoutMs:undefined});
      if([301,302,303,307,308].includes(res.status)&&res.headers.get('location')){
        const next=new URL(res.headers.get('location'),current).toString();const validated=await validateOutboundUrl(next,provider);
        if(sameOrigin&&new URL(validated).origin!==baseOrigin)throw new Error('上游重定向到不同域名，已阻止以避免认证信息泄露');
        current=validated;continue;
      }
      return res;
    }finally{clearTimeout(timeout)}
  }
  throw new Error('上游重定向次数过多');
}""",
    'same-origin provider fetch',
)

old_public = """function publicProvider(p) {
  const { apiKeyEncrypted, ...rest } = p;
  const decrypted = apiKeyEncrypted ? decryptSecret(apiKeyEncrypted) : '';
  return {
    ...rest,
    hasApiKey: Boolean(apiKeyEncrypted),
    apiKeyReadable: Boolean(!apiKeyEncrypted || decrypted),
    apiKeyHint: decrypted ? `••••${decrypted.slice(-4)}` : ''
  };
}"""
new_public = """const SENSITIVE_HEADER_NAMES = new Set([
  'authorization','proxy-authorization','x-api-key','api-key','apikey','cookie','set-cookie',
  'x-auth-token','x-access-token','x-secret-key','cf-access-client-secret'
]);
function isSensitiveHeaderName(name){
  const key=String(name||'').trim().toLowerCase();
  return SENSITIVE_HEADER_NAMES.has(key)||/(^|[-_])(authorization|secret|token)([-_]|$)/i.test(key);
}
function sanitizeHeaderObject(headers){
  const out={};
  if(!headers||typeof headers!=='object'||Array.isArray(headers))return out;
  for(const [key,value] of Object.entries(headers))if(!isSensitiveHeaderName(key))out[key]=value;
  return out;
}
function publicProvider(p) {
  const { apiKeyEncrypted, apiKey, ...rest } = p;
  const decrypted = apiKeyEncrypted ? decryptSecret(apiKeyEncrypted) : '';
  const models=Array.isArray(rest.models)?rest.models.map(m=>({...m,extraHeaders:sanitizeHeaderObject(m?.extraHeaders)})):rest.models;
  return {
    ...rest,
    defaultHeaders:sanitizeHeaderObject(rest.defaultHeaders),
    models,
    hasApiKey: Boolean(apiKeyEncrypted),
    apiKeyReadable: Boolean(!apiKeyEncrypted || decrypted),
    apiKeyHint: decrypted ? `••••${decrypted.slice(-4)}` : ''
  };
}"""
replace_once(old_public, new_public, 'sanitize public provider headers')

replace_once(
    "defaultHeaders: typeof input.defaultHeaders === 'object' && input.defaultHeaders ? input.defaultHeaders : (existing?.defaultHeaders || {}),",
    "defaultHeaders: sanitizeHeaderObject(typeof input.defaultHeaders === 'object' && input.defaultHeaders ? input.defaultHeaders : (existing?.defaultHeaders || {})),",
    'sanitize provider storage headers',
)

replace_once(
    "const headers = { 'Content-Type': 'application/json', ...(provider.defaultHeaders || {}), ...extra };",
    "const headers = { 'Content-Type': 'application/json', ...sanitizeHeaderObject(provider.defaultHeaders || {}), ...sanitizeHeaderObject(extra) };",
    'sanitize provider request headers',
)

replace_once(
    "const res=await fetchSafe(value,{method:'GET',headers:{},timeoutMs:120000},provider);if(!res.ok)return output;",
    "const res=await fetchSafe(value,{method:'GET',headers:{},timeoutMs:120000},provider,{sameOrigin:false});if(!res.ok)return output;",
    'allow credential-free result CDN fetches',
)

SERVER.write_text(source, encoding='utf-8')

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
async function freePort(){const s=net.createServer();const port=await listen(s);await close(s);return port;}
async function waitHealth(port,child){
  const deadline=Date.now()+10000;
  while(Date.now()<deadline){
    if(child.exitCode!=null)throw new Error(`canvas server exited early with code ${child.exitCode}`);
    try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,80));
  }
  throw new Error('canvas server did not become healthy');
}
async function stopChild(child){
  if(child.exitCode!=null)return;
  child.kill('SIGTERM');
  await Promise.race([new Promise(resolve=>child.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,3000))]);
  if(child.exitCode==null)child.kill('SIGKILL');
}
async function jsonCall(port,url,init={}){
  const res=await fetch(`http://127.0.0.1:${port}${url}`,init);
  const data=await res.json().catch(()=>null);
  return {res,data};
}

test('Node provider gateway redacts auth headers and blocks credentialed cross-origin redirects',{concurrency:false},async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'canvas-node-provider-security-'));
  for(const name of ['server.js','store.js','provider-adapter-contract.js'])fs.copyFileSync(path.join(ROOT,name),path.join(tmp,name));
  const canvasPort=await freePort();
  const child=spawn(process.execPath,['server.js'],{cwd:tmp,env:{...process.env,HOST:'127.0.0.1',PORT:String(canvasPort),CANVAS_ADMIN_PASSWORD:''},stdio:['ignore','pipe','pipe']});
  let childErr='';child.stderr.on('data',d=>{childErr+=String(d)});
  let sinkHits=0,sinkAuthorization='';
  const sink=http.createServer((req,res)=>{sinkHits++;sinkAuthorization=String(req.headers.authorization||'');res.writeHead(200,{'content-type':'application/json'});res.end('{"ok":true}');});
  const sinkPort=await listen(sink);
  const redirector=http.createServer((req,res)=>{res.writeHead(302,{location:`http://127.0.0.1:${sinkPort}/steal`});res.end();});
  const redirectPort=await listen(redirector);
  try{
    await waitHealth(canvasPort,child);
    const created=await jsonCall(canvasPort,'/api/providers',{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
        name:'Header Redaction',baseUrl:`http://127.0.0.1:${redirectPort}`,allowPrivateHosts:true,
        apiKey:'super-secret-key',defaultHeaders:{Authorization:'Bearer header-secret','X-Trace':'keep-me'},
        models:[{id:'gpt-test',name:'GPT test',modality:'text'}]
      })
    });
    assert.equal(created.res.status,200,JSON.stringify(created.data));
    const listed=await jsonCall(canvasPort,'/api/providers');
    const text=JSON.stringify(listed.data);
    assert.equal(text.includes('super-secret-key'),false);
    assert.equal(text.includes('header-secret'),false);
    assert.equal(listed.data.providers[0].defaultHeaders.Authorization,undefined);
    assert.equal(listed.data.providers[0].defaultHeaders['X-Trace'],'keep-me');
    const stored=JSON.parse(fs.readFileSync(path.join(tmp,'.data','providers.json'),'utf8'))[0];
    assert.equal(stored.defaultHeaders.Authorization,undefined);
    assert.equal(stored.defaultHeaders['X-Trace'],'keep-me');
    assert.ok(stored.apiKeyEncrypted);
    assert.equal(JSON.stringify(stored).includes('super-secret-key'),false);

    const redirected=await jsonCall(canvasPort,'/api/providers/test-config',{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
        baseUrl:`http://127.0.0.1:${redirectPort}`,allowPrivateHosts:true,apiKey:'redirect-secret'
      })
    });
    assert.equal(redirected.res.status,502,JSON.stringify(redirected.data));
    assert.match(String(redirected.data?.error||''),/不同域名|同源|认证信息/);
    assert.equal(sinkHits,0,'cross-origin redirect target must never receive the request');
    assert.equal(sinkAuthorization,'');
  } finally {
    await close(redirector).catch(()=>{});await close(sink).catch(()=>{});await stopChild(child);fs.rmSync(tmp,{recursive:true,force:true});
  }
  assert.equal(childErr,'',childErr);
});
''', encoding='utf-8')

print('Hardened Node provider gateway and wrote regression test.')
