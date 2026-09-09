from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / '_read_123_zip_20260821_180410'
BROWSER = APP / 'browser-runtime-preview.js'
PROXY = APP / 'functions' / 'api' / '[[path]].js'
TEST = APP / 'tests' / 'media-transport-hardening-v1.test.mjs'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def patch_browser() -> None:
    text = BROWSER.read_text(encoding='utf-8')

    if "const PROXY_FORM_META='__canvas_proxy_meta_v2';" not in text:
        old = """async function blobToBase64(blob){const bytes=new Uint8Array(await blob.arrayBuffer());let out='';const step=0x8000;for(let i=0;i<bytes.length;i+=step)out+=String.fromCharCode(...bytes.subarray(i,i+step));return btoa(out)}
async function serializeProxyBody(body){if(body==null)return{bodyType:'none',body:null};if(typeof body==='string')return{bodyType:'text',body};if(body instanceof FormData){const entries=[];for(const [name,value] of body.entries()){if(value instanceof Blob){if(value.size>25*1024*1024)throw new Error('在线预览的单个代理文件不能超过 25MB');entries.push({name,kind:'file',filename:value.name||'upload.bin',type:value.type||'application/octet-stream',base64:await blobToBase64(value)})}else entries.push({name,kind:'text',value:String(value)})}return{bodyType:'form-data',formData:entries}}throw new Error('在线代理不支持此请求体类型')}
async function proxyFetch(url,init={}){
  const headers=cleanHeaders(init.headers||{}),packed=await serializeProxyBody(init.body);
  if(packed.bodyType==='form-data'){delete headers['content-type'];delete headers['Content-Type']}
  const res=await rawFetch('/api/proxy',{method:'POST',headers:{'content-type':'application/json','x-canvas-proxy':'1'},body:JSON.stringify({url,method:String(init.method||'GET').toUpperCase(),headers,...packed})});
  // Do not throw on upstream HTTP errors here. The proxy intentionally mirrors the
  // upstream status/body; providerJson must receive that status so protocol fallback
  // can react to 400/404/405/415/422 instead of losing it inside a generic Error.
  return res;
}"""
        new = """const PROXY_FORM_META='__canvas_proxy_meta_v2';
async function serializeProxyBody(body){if(body==null)return{bodyType:'none',body:null};if(typeof body==='string')return{bodyType:'text',body};throw new Error('在线代理不支持此请求体类型')}
function proxyMultipartBody(url,method,headers,body){
  const form=new FormData();
  form.append(PROXY_FORM_META,JSON.stringify({url,method,headers}));
  for(const [name,value] of body.entries()){
    if(name===PROXY_FORM_META)throw new Error('multipart 字段名与代理保留字段冲突');
    if(value instanceof Blob)form.append(name,value,value.name||'upload.bin');else form.append(name,String(value));
  }
  return form;
}
async function proxyFetch(url,init={}){
  const headers=cleanHeaders(init.headers||{}),method=String(init.method||'GET').toUpperCase();
  if(init.body instanceof FormData){
    delete headers['content-type'];delete headers['Content-Type'];delete headers['content-length'];delete headers['Content-Length'];
    const body=proxyMultipartBody(url,method,headers,init.body);
    return rawFetch('/api/proxy',{method:'POST',headers:{'x-canvas-proxy':'1','x-canvas-proxy-mode':'form-data-v2'},body});
  }
  const packed=await serializeProxyBody(init.body);
  const res=await rawFetch('/api/proxy',{method:'POST',headers:{'content-type':'application/json','x-canvas-proxy':'1'},body:JSON.stringify({url,method,headers,...packed})});
  // Do not throw on upstream HTTP errors here. The proxy intentionally mirrors the
  // upstream status/body; providerJson must receive that status so protocol fallback
  // can react to 400/404/405/415/422 instead of losing it inside a generic Error.
  return res;
}"""
        text = replace_once(text, old, new, 'browser raw multipart proxy')

    if 'async function materializeGeneratedImageOutput(value,provider)' not in text:
        old = """async function normalizeGeneratedOutput(value,modality,provider){
  if(value==null)return value;
  let text=typeof value==='string'?value.trim():value;
  if(modality==='image'&&typeof text==='string'&&/^data:image\\//i.test(text)){
    try{const blob=await (await rawFetch(text)).blob(),stored=await storeMediaBlob(blob,{name:'generated-image'});return stored.url}catch{}
  }
  if(typeof text==='string'&&text.startsWith('/')&&!text.startsWith('/__browser_media/')&&!text.startsWith('/media/')){
    try{return joinUrl(provider?.baseUrl||location.origin,text)}catch{}
  }
  return text;
}"""
        new = """async function typedGeneratedImageBlob(blob,url,res){
  if(!(blob instanceof Blob)||!blob.size)return blob;
  const current=String(blob.type||res?.headers?.get?.('content-type')||'').split(';')[0].trim().toLowerCase();
  if(current.startsWith('image/'))return blob;
  const hint=`${String(url||'')} ${String(res?.headers?.get?.('content-disposition')||'')}`.toLowerCase();
  let mime='';
  if(/\\.png(?:[?#]|$)/i.test(hint))mime='image/png';
  else if(/\\.(jpe?g)(?:[?#]|$)/i.test(hint))mime='image/jpeg';
  else if(/\\.webp(?:[?#]|$)/i.test(hint))mime='image/webp';
  else if(/\\.(heic|heif)(?:[?#]|$)/i.test(hint))mime='image/heic';
  if(!mime){
    try{
      const head=new Uint8Array(await blob.slice(0,16).arrayBuffer());
      const ascii=String.fromCharCode(...head);
      if(head.length>=8&&head[0]===0x89&&ascii.slice(1,4)==='PNG')mime='image/png';
      else if(head.length>=3&&head[0]===0xff&&head[1]===0xd8&&head[2]===0xff)mime='image/jpeg';
      else if(head.length>=12&&ascii.slice(0,4)==='RIFF'&&ascii.slice(8,12)==='WEBP')mime='image/webp';
    }catch{}
  }
  return mime?new Blob([blob],{type:mime}):blob;
}
async function materializeGeneratedImageOutput(value,provider){
  const text=String(value||'').trim();
  if(!text||text.startsWith('/__browser_media/')||text.startsWith('/media/')||text.startsWith('data:')||text.startsWith('blob:'))return text;
  if(!/^(https?:\\/\\/|\\/\\/)/i.test(text))return text;
  const url=text.startsWith('//')?`${location.protocol}${text}`:text;
  const res=await fetchProviderResource(provider,url,{method:'GET',headers:{accept:'image/*,application/octet-stream;q=0.9,*/*;q=0.1'}});
  if(!res.ok)throw new Error(`图片结果下载失败 ${res.status}`);
  const ct=String(res.headers.get('content-type')||'').toLowerCase();
  if(ct.includes('application/json')||ct.includes('+json')||ct.startsWith('text/')){
    let payload=null;try{payload=await res.json()}catch{throw new Error('图片结果地址没有返回图片文件')}
    const candidate=Core?.firstPath?Core.firstPath(payload,['url','image_url','imageUrl','download_url','downloadUrl','content.url','data.url','data.image_url','data.imageUrl','result.url','result.image_url']):undefined;
    if(candidate&&String(candidate)!==url)return materializeGeneratedImageOutput(candidate,provider);
    throw new Error('图片结果地址没有返回可用图片文件');
  }
  const blob=await res.blob();if(!blob.size)throw new Error('图片结果下载为空文件');
  const typed=await typedGeneratedImageBlob(blob,url,res);
  if(!String(typed.type||'').toLowerCase().startsWith('image/'))throw new Error('图片结果下载后无法识别文件格式');
  const stored=await storeMediaBlob(typed,{name:'generated-image'});
  if(!stored?.url)throw new Error('图片结果下载后未能保存到浏览器本地媒体库');
  return stored.url;
}
async function normalizeGeneratedOutput(value,modality,provider){
  if(value==null)return value;
  let text=typeof value==='string'?value.trim():value;
  if(modality==='image'&&typeof text==='string'&&/^data:image\\//i.test(text)){
    const blob=await (await rawFetch(text)).blob(),stored=await storeMediaBlob(blob,{name:'generated-image'});if(!stored?.url)throw new Error('图片结果未能保存到浏览器本地媒体库');return stored.url;
  }
  if(typeof text==='string'&&text.startsWith('/')&&!text.startsWith('/__browser_media/')&&!text.startsWith('/media/')){
    try{text=joinUrl(provider?.baseUrl||location.origin,text)}catch{}
  }
  if(modality==='image'&&typeof text==='string'&&/^(https?:\\/\\/|\\/\\/)/i.test(text))return materializeGeneratedImageOutput(text,provider);
  return text;
}"""
        text = replace_once(text, old, new, 'browser image output persistence')

    old = "async function generatedImageBlob(value){\n  const text=String(value||'').trim();if(!text)throw new Error('生成图片地址为空，无法校验尺寸');\n  let res;\n  if(/^https?:\\/\\//i.test(text)||text.startsWith('//')){const url=text.startsWith('//')?`${location.protocol}${text}`:text;res=await providerFetch(url,{method:'GET',headers:{accept:'image/*'}})}\n  else res=await rawFetch(text,{method:'GET',headers:{accept:'image/*'}});\n  if(!res?.ok)throw new Error(`无法读取生成图片以校验尺寸${res?.status?`（HTTP ${res.status}）`:''}`);\n  const blob=await res.blob();if(!String(blob.type||'').toLowerCase().startsWith('image/'))throw new Error('生成结果不是可校验的图片文件');return blob;\n}"
    if 'async function generatedImageBlob(value,provider)' not in text:
        new = "async function generatedImageBlob(value,provider){\n  const text=String(value||'').trim();if(!text)throw new Error('生成图片地址为空，无法校验尺寸');\n  let res;\n  if(/^https?:\\/\\//i.test(text)||text.startsWith('//')){const url=text.startsWith('//')?`${location.protocol}${text}`:text;res=await fetchProviderResource(provider,url,{method:'GET',headers:{accept:'image/*,application/octet-stream;q=0.9'}})}\n  else res=await rawFetch(text,{method:'GET',headers:{accept:'image/*'}});\n  if(!res?.ok)throw new Error(`无法读取生成图片以校验尺寸${res?.status?`（HTTP ${res.status}）`:''}`);\n  const blob=await typedGeneratedImageBlob(await res.blob(),text,res);if(!String(blob.type||'').toLowerCase().startsWith('image/'))throw new Error('生成结果不是可校验的图片文件');return blob;\n}"
        text = replace_once(text, old, new, 'auth-aware image dimension fetch')
        text = replace_once(text, 'const targetSize=target.size,blob=await generatedImageBlob(value),decoded=await decodeGeneratedImage(blob),sourceSize=`${decoded.width}x${decoded.height}`;', 'const targetSize=target.size,blob=await generatedImageBlob(value,provider),decoded=await decodeGeneratedImage(blob),sourceSize=`${decoded.width}x${decoded.height}`;', 'image dimension provider pass-through')

    if 'async function xogpuValidateReferenceDuration(entry,blob)' not in text:
        old = """function xogpuFilename(kind,index,blob){const map={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif','video/mp4':'mp4','video/quicktime':'mov','audio/mpeg':'mp3','audio/wav':'wav','audio/x-wav':'wav'};return`${kind}-${index+1}.${map[String(blob?.type||'').toLowerCase()]||(kind==='image'?'png':kind==='video'?'mp4':'wav')}`}
async function appendXogpuPart(form,field,entry,limits,total){const blob=await referenceBlob(entry.url);if(!blob)throw new Error(`参考${entry.type==='image'?'图片':entry.type==='video'?'视频':'音频'}无法读取，已阻止无参考素材提交`);const max=entry.type==='image'?10*1024*1024:entry.type==='video'?48*1024*1024:20*1024*1024;if(blob.size>max)throw new Error(`XOGPU ${entry.type==='image'?'图片':entry.type==='video'?'视频':'音频'}单文件超过限制`);total.bytes+=blob.size;if(total.bytes>120*1024*1024)throw new Error('XOGPU 参考媒体总大小超过 120 MiB');form.append(field,blob,xogpuFilename(entry.type,entry.index,blob));total.files+=1;if(total.files>12)throw new Error('XOGPU 参考媒体合计最多 12 个文件')}"""
        new = """function xogpuFilename(kind,index,blob){const map={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif','video/mp4':'mp4','video/quicktime':'mov','audio/mpeg':'mp3','audio/wav':'wav','audio/x-wav':'wav'};return`${kind}-${index+1}.${map[String(blob?.type||'').toLowerCase()]||(kind==='image'?'png':kind==='video'?'mp4':'wav')}`}
function xogpuDurationHint(entry){const ref=entry?.ref||{},meta=ref?.metadata||{};for(const value of [ref.duration,ref.durationSec,ref.durationSeconds,ref.seconds,meta.duration,meta.durationSec,meta.durationSeconds]){const n=Number(value);if(Number.isFinite(n)&&n>0)return n}return 0}
async function xogpuMediaDurationSeconds(entry,blob){
  const hinted=xogpuDurationHint(entry);if(hinted>0)return hinted;
  if(typeof document==='undefined'||typeof URL==='undefined'||typeof URL.createObjectURL!=='function')throw new Error('当前浏览器无法读取参考媒体时长');
  const tag=entry.type==='audio'?'audio':'video',objectUrl=URL.createObjectURL(blob),el=document.createElement(tag);el.preload='metadata';
  return await new Promise((resolve,reject)=>{let done=false;const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);try{el.removeAttribute('src');el.load?.()}catch{}URL.revokeObjectURL(objectUrl);if(error)reject(error);else resolve(value)};const timer=setTimeout(()=>finish(new Error(`参考${entry.type==='audio'?'音频':'视频'}时长读取超时`)),8000);el.addEventListener('loadedmetadata',()=>{const seconds=Number(el.duration);if(!Number.isFinite(seconds)||seconds<=0)finish(new Error(`无法读取参考${entry.type==='audio'?'音频':'视频'}时长`));else finish(null,seconds)},{once:true});el.addEventListener('error',()=>finish(new Error(`无法解析参考${entry.type==='audio'?'音频':'视频'}时长`)),{once:true});el.src=objectUrl;try{el.load?.()}catch{}});
}
async function xogpuValidateReferenceDuration(entry,blob){if(entry.type!=='video'&&entry.type!=='audio')return 0;const seconds=await xogpuMediaDurationSeconds(entry,blob);if(seconds<2||seconds>15)throw new Error(`XOGPU 参考${entry.type==='audio'?'音频':'视频'}时长为 ${seconds.toFixed(2)} 秒，仅支持 2–15 秒`);return seconds}
async function xogpuImageDimensions(blob){const decoded=await decodeGeneratedImage(blob);try{return{width:Number(decoded.width||0),height:Number(decoded.height||0)}}finally{decoded.close?.()}}
async function xogpuValidateFrameAspectRatio(firstBlob,lastBlob){const first=await xogpuImageDimensions(firstBlob),last=await xogpuImageDimensions(lastBlob);if(!first.width||!first.height||!last.width||!last.height)throw new Error('无法读取首尾帧尺寸，已阻止提交');const a=first.width/first.height,b=last.width/last.height,delta=Math.abs(a-b)/Math.max(a,b);if(delta>0.01)throw new Error(`首尾帧宽高比不一致（${first.width}x${first.height} vs ${last.width}x${last.height}），已在提交前阻止`);return{first,last}}
async function xogpuReferenceBlob(entry){const blob=await referenceBlob(entry.url);if(!blob)throw new Error(`参考${entry.type==='image'?'图片':entry.type==='video'?'视频':'音频'}无法读取，已阻止无参考素材提交`);return blob}
async function appendXogpuPart(form,field,entry,limits,total,preparedBlob=null){const blob=preparedBlob||await xogpuReferenceBlob(entry);const max=entry.type==='image'?10*1024*1024:entry.type==='video'?48*1024*1024:20*1024*1024;if(blob.size>max)throw new Error(`XOGPU ${entry.type==='image'?'图片':entry.type==='video'?'视频':'音频'}单文件超过限制`);await xogpuValidateReferenceDuration(entry,blob);total.bytes+=blob.size;if(total.bytes>120*1024*1024)throw new Error('XOGPU 参考媒体总大小超过 120 MiB');form.append(field,blob,xogpuFilename(entry.type,entry.index,blob));total.files+=1;if(total.files>12)throw new Error('XOGPU 参考媒体合计最多 12 个文件')}"""
        text = replace_once(text, old, new, 'XOGPU duration preflight helpers')

        old_frames = "else if(mode==='frames'){const first=images.find(x=>/first/.test(x.role))||images[0],last=images.find(x=>/last/.test(x.role))||images.find(x=>x!==first);await appendXogpuPart(form,'input_reference',first,null,total);await appendXogpuPart(form,'end_reference',last,null,total)}else{"
        new_frames = "else if(mode==='frames'){const first=images.find(x=>/first/.test(x.role))||images[0],last=images.find(x=>/last/.test(x.role))||images.find(x=>x!==first),firstBlob=await xogpuReferenceBlob(first),lastBlob=await xogpuReferenceBlob(last);await xogpuValidateFrameAspectRatio(firstBlob,lastBlob);await appendXogpuPart(form,'input_reference',first,null,total,firstBlob);await appendXogpuPart(form,'end_reference',last,null,total,lastBlob)}else{"
        text = replace_once(text, old_frames, new_frames, 'XOGPU first-last aspect preflight')

    BROWSER.write_text(text, encoding='utf-8')


def patch_proxy() -> None:
    text = PROXY.read_text(encoding='utf-8')
    if "const PROXY_FORM_META='__canvas_proxy_meta_v2';" not in text:
        text = text.replace("const HOP_BY_HOP = new Set([", "const PROXY_FORM_META='__canvas_proxy_meta_v2';\nconst HOP_BY_HOP = new Set([", 1)

        old = """  let body;try{body=await request.json()}catch{return json({error:'代理请求必须是 JSON'},400)}
  let current;try{current=validateTarget(body?.url)}catch(e){return json({error:e.message},400)}
  const method=String(body?.method||'GET').toUpperCase();
  if(!['GET','POST','PUT','PATCH','DELETE','HEAD'].includes(method))return json({error:'不支持的上游请求方法'},405);
  const headers=sanitizeHeaders(body?.headers||{});
  let payload=body?.body;
  const bodyType=String(body?.bodyType||'text');
  if(bodyType==='form-data'){
    const form=new FormData();
    for(const item of Array.isArray(body?.formData)?body.formData:[]){
      if(item?.kind==='file'){
        try{
          const bytes=Uint8Array.from(atob(String(item.base64||'')),c=>c.charCodeAt(0));
          form.append(String(item.name||'file'),new Blob([bytes],{type:String(item.type||'application/octet-stream')}),String(item.filename||'upload.bin'));
        }catch{return json({error:'代理 multipart 文件编码无效'},400)}
      }else form.append(String(item?.name||'field'),String(item?.value||''));
    }
    headers.delete('content-type');
    headers.delete('content-length');
    payload=form;
  }else if(payload!==null&&payload!==undefined&&typeof payload!=='string')return json({error:'代理请求体必须是文本、JSON 字符串或 multipart'},400);
  if(['GET','HEAD'].includes(method))payload=undefined;
"""
        new = """  const rawMultipart=request.headers.get('x-canvas-proxy-mode')==='form-data-v2';
  let body,payload;
  if(rawMultipart){
    let incoming;try{incoming=await request.formData()}catch{return json({error:'代理 multipart 请求无法解析'},400)}
    const meta=String(incoming.get(PROXY_FORM_META)||'');
    if(!meta||meta.length>65536)return json({error:'代理 multipart 元数据无效'},400);
    try{body=JSON.parse(meta)}catch{return json({error:'代理 multipart 元数据不是有效 JSON'},400)}
    const form=new FormData();
    for(const [name,value] of incoming.entries()){
      if(name===PROXY_FORM_META)continue;
      if(typeof value==='string')form.append(name,value);else form.append(name,value,String(value?.name||'upload.bin'));
    }
    payload=form;
  }else{
    try{body=await request.json()}catch{return json({error:'代理请求必须是 JSON 或 multipart'},400)}
    payload=body?.body;
  }
  let current;try{current=validateTarget(body?.url)}catch(e){return json({error:e.message},400)}
  const method=String(body?.method||'GET').toUpperCase();
  if(!['GET','POST','PUT','PATCH','DELETE','HEAD'].includes(method))return json({error:'不支持的上游请求方法'},405);
  const headers=sanitizeHeaders(body?.headers||{});
  const bodyType=rawMultipart?'form-data-v2':String(body?.bodyType||'text');
  if(rawMultipart){
    headers.delete('content-type');headers.delete('content-length');
  }else if(bodyType==='form-data'){
    const form=new FormData();
    for(const item of Array.isArray(body?.formData)?body.formData:[]){
      if(item?.kind==='file'){
        try{
          const bytes=Uint8Array.from(atob(String(item.base64||'')),c=>c.charCodeAt(0));
          form.append(String(item.name||'file'),new Blob([bytes],{type:String(item.type||'application/octet-stream')}),String(item.filename||'upload.bin'));
        }catch{return json({error:'代理 multipart 文件编码无效'},400)}
      }else form.append(String(item?.name||'field'),String(item?.value||''));
    }
    headers.delete('content-type');headers.delete('content-length');payload=form;
  }else if(payload!==null&&payload!==undefined&&typeof payload!=='string')return json({error:'代理请求体必须是文本、JSON 字符串或 multipart'},400);
  if(['GET','HEAD'].includes(method))payload=undefined;
"""
        text = replace_once(text, old, new, 'Pages multipart proxy')
    PROXY.write_text(text, encoding='utf-8')


def write_test() -> None:
    TEST.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
const proxy=fs.readFileSync(new URL('../functions/api/[[path]].js',import.meta.url),'utf8');

test('browser proxy streams multipart without the legacy 25MB base64 gate',()=>{
  assert.match(browser,/PROXY_FORM_META='__canvas_proxy_meta_v2'/);
  assert.match(browser,/x-canvas-proxy-mode':'form-data-v2'/);
  assert.doesNotMatch(browser,/在线预览的单个代理文件不能超过 25MB/);
  assert.doesNotMatch(browser,/base64:await blobToBase64\(value\)/);
  assert.match(proxy,/request\.formData\(\)/);
  assert.match(proxy,/name===PROXY_FORM_META/);
});

test('remote generated images are auth-aware and must persist locally',()=>{
  assert.match(browser,/async function materializeGeneratedImageOutput\(value,provider\)/);
  const start=browser.indexOf('async function materializeGeneratedImageOutput(value,provider)');
  const end=browser.indexOf('async function normalizeGeneratedOutput',start);
  const fn=browser.slice(start,end);
  assert.match(fn,/fetchProviderResource\(provider,url/);
  assert.match(fn,/storeMediaBlob\(typed,\{name:'generated-image'\}\)/);
  assert.match(browser,/async function generatedImageBlob\(value,provider\)/);
});

test('XOGPU video and audio references are preflighted to 2-15 seconds',()=>{
  assert.match(browser,/async function xogpuValidateReferenceDuration\(entry,blob\)/);
  assert.match(browser,/seconds<2\|\|seconds>15/);
  assert.match(browser,/await xogpuValidateReferenceDuration\(entry,blob\)/);
});

test('XOGPU first and last frames are checked for aspect-ratio mismatch before upload',()=>{
  assert.match(browser,/async function xogpuValidateFrameAspectRatio\(firstBlob,lastBlob\)/);
  assert.match(browser,/delta>0\.01/);
  const frameBranch=browser.match(/else if\(mode==='frames'\)\{[^\n]+/s)?.[0]||'';
  assert.ok(frameBranch.indexOf('xogpuValidateFrameAspectRatio')>=0);
  assert.ok(frameBranch.indexOf("appendXogpuPart(form,'input_reference'")>frameBranch.indexOf('xogpuValidateFrameAspectRatio'));
});
""", encoding='utf-8')


patch_browser()
patch_proxy()
write_test()
print('media transport hardening v1 applied')
