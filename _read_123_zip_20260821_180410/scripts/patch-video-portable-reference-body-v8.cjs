const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const write=(f,s)=>fs.writeFileSync(path.join(root,f),s);
const replaceOnce=(s,before,after,label)=>{if(!s.includes(before))throw new Error(`missing ${label}`);return s.replace(before,after)};
const OLD='20260829-video-task-reconcile-1';
const VERSION='20260829-portable-video-refs-1';

// Shared recursive JSON string mapper used by browser and desktop runtimes.
{
  let s=read('provider-runtime-core.js');
  const anchor=`function classifyAsyncPoll(response,config={},modality='video'){`;
  const helper=`async function mapNestedStrings(value,mapper,depth=0){\n  if(typeof mapper!=='function'||depth>20)return value;\n  if(typeof value==='string')return await mapper(value);\n  if(Array.isArray(value)){const out=[];for(const item of value)out.push(await mapNestedStrings(item,mapper,depth+1));return out}\n  if(value&&typeof value==='object'){\n    const proto=Object.getPrototypeOf(value);if(proto!==Object.prototype&&proto!==null)return value;\n    const out={};for(const [key,item] of Object.entries(value))out[key]=await mapNestedStrings(item,mapper,depth+1);return out;\n  }\n  return value;\n}\nfunction classifyAsyncPoll(response,config={},modality='video'){`;
  s=replaceOnce(s,anchor,helper,'shared nested string mapper');
  s=replaceOnce(s,`  classifyAsyncPoll,nextPollDelay,formatFailure,providerErrorText,isRetryableProviderFailure\n});`,`  classifyAsyncPoll,nextPollDelay,formatFailure,providerErrorText,isRetryableProviderFailure,mapNestedStrings\n});`,'core mapper export');
  write('provider-runtime-core.js',s);
}

// Browser: no /__browser_media or blob: address may escape into an upstream JSON request.
{
  let s=read('browser-runtime.js');
  const anchor=`async function makePortableReferences(refs=[]){const out=[];for(const r of refsForRequest(refs)){let url=r.url;if(url&&(url.startsWith('blob:')||url.startsWith('/__browser_media/'))){try{const blob=await referenceBlob(url);if(blob&&blob.size<=20*1024*1024)url=await blobToDataUrl(blob)}catch{}}out.push({...r,url})}return out}\n`;
  const helper=`async function makePortableReferences(refs=[]){const out=[];for(const r of refsForRequest(refs)){let url=r.url;if(url&&(url.startsWith('blob:')||url.startsWith('/__browser_media/'))){try{const blob=await referenceBlob(url);if(blob&&blob.size<=20*1024*1024)url=await blobToDataUrl(blob)}catch{}}out.push({...r,url})}return out}\nfunction browserLocalMediaReference(value){\n  const text=String(value||'').trim();if(!text)return'';if(text.startsWith('blob:')||text.startsWith('/__browser_media/'))return text;\n  try{const u=new URL(text,location.href);if(u.origin===location.origin&&u.pathname.startsWith('/__browser_media/'))return u.pathname+u.search}catch{}\n  return'';\n}\nasync function portableizeVideoJsonBody(body,route={}){\n  if(!Core?.mapNestedStrings)return body;\n  const transport=Adapters?.normalizeReferenceTransport?Adapters.normalizeReferenceTransport(route.referenceTransport||'auto',{cloud:true}):'data-url';\n  return await Core.mapNestedStrings(body,async value=>{\n    const local=browserLocalMediaReference(value);if(!local)return value;\n    if(transport==='url')throw new Error('当前视频协议要求公共 URL，但参考媒体仅存在浏览器本地；请把模型 referenceTransport 改为 data-url，或配置供应商上传接口');\n    if(transport==='upload')throw new Error('当前视频协议要求先上传参考媒体，但尚未配置供应商上传接口；不能把浏览器本地地址直接发送给上游');\n    const blob=await referenceBlob(local);if(!blob)throw new Error('浏览器本地参考媒体无法读取，已阻止发送不可访问的本地 URL');\n    if(blob.size>20*1024*1024)throw new Error('浏览器本地参考媒体超过 20MB，JSON data-url 传输已阻止；请使用供应商上传接口');\n    return await blobToDataUrl(blob);\n  });\n}\n`;
  s=replaceOnce(s,anchor,helper,'browser portable json helper');
  const bodyLine=`  const refs=resumingUpstream?[]:await makePortableReferences(task.references||[]),body=resumingUpstream?null:defaultRequestBody(provider,model,task,route,refs);`;
  const bodyNew=`  const refs=resumingUpstream?[]:await makePortableReferences(task.references||[]),body=resumingUpstream?null:defaultRequestBody(provider,model,task,route,refs);\n  let portableVideoJsonBodyPromise=null;const videoJsonBody=()=>portableVideoJsonBodyPromise||(portableVideoJsonBodyPromise=portableizeVideoJsonBody(body,route));`;
  s=replaceOnce(s,bodyLine,bodyNew,'browser video body promise');
  s=s.replaceAll(`body:JSON.stringify(body)`,`body:JSON.stringify(await videoJsonBody())`);
  const generic=`          created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(await videoJsonBody())});\n        }\n        usedCreatePath=createPath;break;`;
  const genericFixed=`          created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(modality==='video'?await videoJsonBody():body)});\n        }\n        usedCreatePath=createPath;break;`;
  s=replaceOnce(s,generic,genericFixed,'generic modality body guard');
  write('browser-runtime.js',s);
}

// Desktop: local /media/... references are equally unreachable to remote suppliers.
{
  let s=read('server.js');
  const anchor=`function standardVideoBody(model,payload,config={}){`;
  const helper=`function localVideoMediaReference(value){\n  const text=String(value||'').trim();if(!text)return'';if(/^\\/media\\/[A-Za-z0-9._-]+$/.test(text))return text;\n  try{const u=new URL(text);if(['127.0.0.1','localhost','::1'].includes(u.hostname)&&/^\\/media\\/[A-Za-z0-9._-]+$/.test(u.pathname))return u.pathname}catch{}\n  return'';\n}\nfunction localMediaMime(file){\n  const ext=path.extname(file).toLowerCase();return({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.mov':'video/quicktime','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4','.aac':'audio/aac'})[ext]||'application/octet-stream';\n}\nasync function portableizeLocalVideoJsonBody(body,config={}){\n  if(!ProviderRuntimeCore.mapNestedStrings)return body;\n  const transport=ProviderAdapterContract.normalizeReferenceTransport?ProviderAdapterContract.normalizeReferenceTransport(config.referenceTransport||'auto',{cloud:false}):'auto';\n  return await ProviderRuntimeCore.mapNestedStrings(body,async value=>{\n    const local=localVideoMediaReference(value);if(!local)return value;\n    if(transport==='url')throw new Error('当前视频协议要求公共 URL，但参考媒体仅存在本机；请使用 data-url 或配置供应商上传接口');\n    if(transport==='upload')throw new Error('当前视频协议要求先上传参考媒体，但尚未配置供应商上传接口；不能把本机 /media 地址直接发送给上游');\n    const file=mediaPathFromUrl(local),stat=fs.statSync(file);\n    if(stat.size>25*1024*1024)throw new Error('本机参考媒体超过 25MB，JSON data-url 传输已阻止；请配置供应商上传接口');\n    return 'data:'+localMediaMime(file)+';base64,'+fs.readFileSync(file).toString('base64');\n  });\n}\nfunction standardVideoBody(model,payload,config={}){`;
  s=replaceOnce(s,anchor,helper,'desktop portable json helper');
  const oldBody=`  const body=config.requestTemplate&&Object.keys(config.requestTemplate).length?renderTemplate(config.requestTemplate,ctx):(mapped?.body||standardVideoBody(model,payload,config));\n  updateTask(task,{progress:8});`;
  const newBody=`  const rawBody=config.requestTemplate&&Object.keys(config.requestTemplate).length?renderTemplate(config.requestTemplate,ctx):(mapped?.body||standardVideoBody(model,payload,config));\n  const body=await portableizeLocalVideoJsonBody(rawBody,config);\n  updateTask(task,{progress:8});`;
  s=replaceOnce(s,oldBody,newBody,'desktop portable body usage');
  write('server.js',s);
}

for(const file of ['index.html','models.html','tests/video-error-reporting.test.mjs','tests/video-result-cache-bust.test.mjs']){
  let s=read(file);s=s.replaceAll(OLD,VERSION);write(file,s);
}
{
  let s=read('browser-bootstrap.js');s=s.replaceAll(OLD,VERSION);write('browser-bootstrap.js',s);
}

write('tests/video-reference-transport.test.mjs',`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nawait import('../provider-runtime-core.js');\nconst C=globalThis.CanvasProviderRuntimeCore;\n\ntest('shared nested mapper rewrites local media strings anywhere in a JSON body',async()=>{\n  const input={image_url:'/local/a',nested:{references:[{url:'/local/b'}]},keep:'https://cdn.example/x'};\n  const out=await C.mapNestedStrings(input,async s=>s.startsWith('/local/')?'data:image/png;base64,AAAA':s);\n  assert.equal(out.image_url,'data:image/png;base64,AAAA');\n  assert.equal(out.nested.references[0].url,'data:image/png;base64,AAAA');\n  assert.equal(out.keep,'https://cdn.example/x');\n});\n\ntest('browser video JSON request portableizes local media outside task.references too',()=>{\n  const source=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');\n  assert.match(source,/function browserLocalMediaReference\\(value\\)/);\n  assert.match(source,/async function portableizeVideoJsonBody\\(body,route=\\{\\}\\)/);\n  assert.match(source,/browserLocalMediaReference\\(value\\)/);\n  assert.match(source,/JSON\\.stringify\\(await videoJsonBody\\(\\)\\)/);\n  assert.match(source,/JSON\\.stringify\\(modality==='video'\\?await videoJsonBody\\(\\):body\\)/);\n});\n\ntest('desktop video JSON request converts loopback media paths before upstream submission',()=>{\n  const source=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');\n  assert.match(source,/function localVideoMediaReference\\(value\\)/);\n  assert.match(source,/async function portableizeLocalVideoJsonBody\\(body,config=\\{\\}\\)/);\n  assert.match(source,/const body=await portableizeLocalVideoJsonBody\\(rawBody,config\\)/);\n  assert.match(source,/return 'data:'\\+localMediaMime\\(file\\)\\+';base64,'/);\n});\n\ntest('explicit public-url or upload transport refuses unreachable local media instead of sending it',()=>{\n  const browser=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');\n  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');\n  for(const source of [browser,server]){assert.match(source,/transport==='url'/);assert.match(source,/transport==='upload'/)}\n});\n`);
console.log('portable video reference body patch applied');
