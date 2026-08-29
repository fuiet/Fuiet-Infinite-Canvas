from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')
runtime_path = ROOT / 'browser-runtime.js'
proxy_path = ROOT / 'functions/api/[[path]].js'
test_path = ROOT / 'tests/browser-video-result-persistence.test.mjs'

runtime = runtime_path.read_text(encoding='utf-8')
proxy = proxy_path.read_text(encoding='utf-8')

anchor = """async function normalizeGeneratedOutput(value,modality,provider){
  if(value==null)return value;
  let text=typeof value==='string'?value.trim():value;
  if(modality==='image'&&typeof text==='string'&&/^data:image\\//i.test(text)){
    try{const blob=await (await rawFetch(text)).blob(),stored=await storeMediaBlob(blob,{name:'generated-image'});return stored.url}catch{}
  }
  if(typeof text==='string'&&text.startsWith('/')&&!text.startsWith('/__browser_media/')&&!text.startsWith('/media/')){
    try{return joinUrl(provider?.baseUrl||location.origin,text)}catch{}
  }
  return text;
}
"""
insert = anchor + """async function materializeGeneratedVideoOutput(value,provider){
  const text=String(value||'').trim();
  if(!text||text.startsWith('/__browser_media/')||text.startsWith('/media/')||text.startsWith('data:')||text.startsWith('blob:'))return text;
  if(!/^(https?:\\/\\/|\\/\\/)/i.test(text))return text;
  const url=text.startsWith('//')?`${location.protocol}${text}`:text;
  const res=await fetchProviderResource(provider,url,{method:'GET',headers:{accept:'video/*,application/octet-stream;q=0.9,*/*;q=0.1'}});
  if(!res.ok)throw new Error(`视频结果下载失败 ${res.status}`);
  const ct=String(res.headers.get('content-type')||'').toLowerCase();
  if(ct.includes('application/json')||ct.includes('+json')||ct.startsWith('text/')){
    const parsed=await readResponse(res);
    if(parsed.kind==='json'){
      const nested=Core?.extractOutput?Core.extractOutput(parsed.value,{},'video'):undefined;
      const candidate=nested!==undefined?nested:(Core?.firstPath?Core.firstPath(parsed.value,['url','video_url','videoUrl','download_url','downloadUrl','content.url','data.url','data.video_url','data.videoUrl','result.url','result.video_url']):undefined);
      if(candidate&&String(candidate)!==url)return materializeGeneratedVideoOutput(candidate,provider);
    }
    throw new Error('视频结果地址没有返回可播放的视频文件');
  }
  const parsed=await readResponse(res);
  if(parsed.kind!=='blob'||!parsed.value)throw new Error('视频结果下载后未能保存到浏览器本地媒体库');
  return parsed.value;
}
"""
if 'async function materializeGeneratedVideoOutput(value,provider)' not in runtime:
    if anchor not in runtime:
        raise SystemExit('normalizeGeneratedOutput anchor not found')
    runtime = runtime.replace(anchor, insert, 1)

old = """      value=await normalizeGeneratedOutput(value,modality,provider);
      if(modality==='image'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到图片结果字段');
"""
new = """      value=await normalizeGeneratedOutput(value,modality,provider);
      if(modality==='video')value=await materializeGeneratedVideoOutput(value,provider);
      if(modality==='image'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到图片结果字段');
      if(modality==='video'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到视频结果字段');
"""
if old in runtime:
    runtime = runtime.replace(old, new, 1)
elif "if(modality==='video')value=await materializeGeneratedVideoOutput(value,provider);" not in runtime:
    raise SystemExit('sync output normalization anchor not found')

old = """    if(modality==='video'&&immediateOutput&&!taskId){
      const value=await normalizeGeneratedOutput(immediateOutput,'video',provider);
      return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,'video'),providerOutput:clone(created.value),videoProtocolDiagnostics:{createPath:usedCreatePath,mode:'immediate-output'}});
    }
"""
new = """    if(modality==='video'&&immediateOutput&&!taskId){
      let value=await normalizeGeneratedOutput(immediateOutput,'video',provider);
      value=await materializeGeneratedVideoOutput(value,provider);
      return updateTask(task.id,{status:'succeeded',providerStatus:'succeeded',resultStatus:'saved',progress:100,output:outputObject(value,'video'),providerOutput:clone(created.value),providerResultUrl:String(value||''),resultSavedAt:now(),videoProtocolDiagnostics:{createPath:usedCreatePath,mode:'immediate-output'}});
    }
"""
if old in runtime:
    runtime = runtime.replace(old, new, 1)
elif "value=await materializeGeneratedVideoOutput(value,provider);\n      return updateTask(task.id,{status:'succeeded',providerStatus:'succeeded'" not in runtime:
    raise SystemExit('immediate video output anchor not found')

old = """      output=await normalizeGeneratedOutput(output,modality,provider);
      if(modality==='image'&&!validMediaOutput(output))throw new Error('上游任务已成功，但未识别到图片结果字段');
"""
new = """      output=await normalizeGeneratedOutput(output,modality,provider);
      if(modality==='video'){
        try{output=await materializeGeneratedVideoOutput(output,provider)}
        catch(error){updateTask(task.id,{status:'result_pending',providerStatus:'succeeded',resultStatus:'pending',providerResultUrl:String(output||''),lastError:runtimeErrorText(error)||'上游已成功，但视频结果保存到浏览器本地失败，将继续重试',error:null,progress:99});attempt++;continue}
      }
      if(modality==='image'&&!validMediaOutput(output))throw new Error('上游任务已成功，但未识别到图片结果字段');
"""
if old in runtime:
    runtime = runtime.replace(old, new, 1)
elif "try{output=await materializeGeneratedVideoOutput(output,provider)}" not in runtime:
    raise SystemExit('async video output anchor not found')

runtime_path.write_text(runtime, encoding='utf-8')

old = """function sanitizeHeaders(input){
  const out=new Headers();
  for(const [k,v] of Object.entries(input||{})){
    const n=String(k).toLowerCase();
    if(HOP_BY_HOP.has(n)||n.startsWith('cf-')||n.startsWith('x-forwarded-'))continue;
    out.set(k,String(v));
  }
  return out;
}
"""
new = old + """function stripCredentialHeaders(headers){
  for(const name of [...headers.keys()]){
    const n=String(name).toLowerCase();
    if(n==='authorization'||n==='proxy-authorization'||n==='x-api-key'||n==='api-key'||/(^|[-_])(token|secret|api[-_]?key)([-_]|$)/i.test(n))headers.delete(name);
  }
  return headers;
}
"""
if 'function stripCredentialHeaders(headers)' not in proxy:
    if old not in proxy:
        raise SystemExit('proxy sanitizeHeaders anchor not found')
    proxy = proxy.replace(old, new, 1)

old = """  const originalOrigin=current.origin;
  for(let redirects=0;redirects<4;redirects++){
    const upstream=await fetch(current.toString(),{method,headers,body:payload,redirect:'manual'});
    if([301,302,303,307,308].includes(upstream.status)&&upstream.headers.get('location')){
      let next;try{next=validateTarget(new URL(upstream.headers.get('location'),current).toString())}catch(e){return json({error:e.message},502)}
      if(next.origin!==originalOrigin)return json({error:'已阻止携带供应商认证信息跨域重定向'},502);
      current=next;
      continue;
    }
"""
new = """  for(let redirects=0;redirects<4;redirects++){
    const upstream=await fetch(current.toString(),{method,headers,body:payload,redirect:'manual'});
    if([301,302,303,307,308].includes(upstream.status)&&upstream.headers.get('location')){
      let next;try{next=validateTarget(new URL(upstream.headers.get('location'),current).toString())}catch(e){return json({error:e.message},502)}
      if(next.origin!==current.origin){
        if(!['GET','HEAD'].includes(method))return json({error:'已阻止非读取请求跨域重定向'},502);
        stripCredentialHeaders(headers);
        payload=undefined;
      }
      current=next;
      continue;
    }
"""
if old in proxy:
    proxy = proxy.replace(old, new, 1)
elif "stripCredentialHeaders(headers);\n        payload=undefined;" not in proxy:
    raise SystemExit('proxy redirect anchor not found')

proxy_path.write_text(proxy, encoding='utf-8')

test_path.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=fs.readFileSync(path.join(ROOT,'browser-runtime.js'),'utf8');
const proxy=fs.readFileSync(path.join(ROOT,'functions/api/[[path]].js'),'utf8');

function sliceBetween(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0,`missing ${start}`);assert.ok(b>a,`missing ${end}`);return source.slice(a,b);
}

test('browser video URLs are materialized before a task is marked saved',()=>{
  const helper=sliceBetween(runtime,'async function materializeGeneratedVideoOutput(value,provider)','function imageTargetSelection');
  assert.match(helper,/fetchProviderResource\(provider,url/);
  assert.match(helper,/readResponse\(res\)/);
  assert.match(helper,/parsed\.kind!==['\"]blob['\"]/);
  const completion=sliceBetween(runtime,"if(assessment.state==='success')",'const current=findTask(task.id);');
  assert.match(completion,/materializeGeneratedVideoOutput\(output,provider\)/);
  assert.ok(completion.indexOf('materializeGeneratedVideoOutput(output,provider)')<completion.indexOf("status:'succeeded'"));
});

test('immediate and synchronous browser video outputs are also persisted',()=>{
  assert.match(runtime,/if\(modality==='video'\)value=await materializeGeneratedVideoOutput\(value,provider\)/);
  const immediate=sliceBetween(runtime,"if(modality==='video'&&immediateOutput&&!taskId)","if(!taskId)");
  assert.match(immediate,/materializeGeneratedVideoOutput\(value,provider\)/);
  assert.match(immediate,/resultStatus:'saved'/);
});

test('Pages proxy strips credentials and follows cross-origin GET result redirects',()=>{
  assert.match(proxy,/function stripCredentialHeaders\(headers\)/);
  const redirect=sliceBetween(proxy,'for(let redirects=0;redirects<4;redirects++)','return json({error:\'上游重定向次数过多\'}');
  assert.match(redirect,/if\(next\.origin!==current\.origin\)/);
  assert.match(redirect,/if\(!\['GET','HEAD'\]\.includes\(method\)\)return json\(\{error:'已阻止非读取请求跨域重定向'\},502\)/);
  assert.match(redirect,/stripCredentialHeaders\(headers\)/);
  assert.match(redirect,/payload=undefined/);
  assert.doesNotMatch(redirect,/已阻止携带供应商认证信息跨域重定向/);
});

test('credential stripping protects common provider secrets on CDN redirects',()=>{
  const helper=sliceBetween(proxy,'function stripCredentialHeaders(headers)','function responseHeaders');
  for(const name of ['authorization','proxy-authorization','x-api-key','api-key'])assert.ok(helper.includes(name),`missing ${name}`);
  assert.match(helper,/token\|secret\|api\[-_\]\?key/);
});
""", encoding='utf-8')

print('patched browser video output persistence and safe CDN redirects')
