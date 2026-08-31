/* Fuiet Infinite Canvas browser-local runtime.
 * Cloudflare is preview transport only. No provider, API key, project, task or media
 * state is persisted on Cloudflare. Existing /api/* calls are emulated in-browser.
 */
(()=>{
'use strict';
if(typeof window==='undefined'||typeof window.fetch!=='function')return;

const rawFetch=window.fetch.bind(window);
const Adapters=globalThis.CanvasProviderAdapters;
const Core=globalThis.CanvasProviderRuntimeCore;
const ImageParams=globalThis.CanvasImageRequestParameters;
const ImageCapabilities=globalThis.CanvasModelImageCapabilities;
const ImageOutputDimensions=globalThis.CanvasImageOutputDimensions;
const VideoParams=globalThis.CanvasVideoRequestParameters;
const LEGACY_KEYS={
  providers:'fuiet-browser-providers-v1',
  projects:'fuiet-browser-projects-v1',
  tasks:'fuiet-browser-tasks-v1',
  queue:'fuiet-browser-queue-v1'
};
const DB_NAME='fuiet-infinite-canvas-browser';
const DB_VERSION=1;
const STORES={providers:'providers',projects:'projects',tasks:'tasks',media:'media',settings:'settings',meta:'meta'};
const cache={providers:[],projects:[],tasks:[],queue:{paused:false,concurrency:2}};
const runtime={running:0,pumping:false,controllers:new Map(),objectUrls:new Set(),resultRetryTimers:new Map(),rateLimitRetryTimers:new Map(),persistChain:Promise.resolve(),db:null,ready:null,swReady:null};
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
function runtimeErrorText(value,depth=0){
  if(value==null||depth>8)return'';
  if(typeof value==='string'){const text=value.trim();return text==='[object Object]'?'':text}
  if(value instanceof Error)return runtimeErrorText(value.message,depth+1)||runtimeErrorText(value.cause,depth+1)||String(value.name||'Error');
  if(Array.isArray(value))return value.map(item=>runtimeErrorText(item,depth+1)).filter(Boolean).join('；');
  if(typeof value==='object'){
    for(const key of ['message','error','detail','reason','msg','title','body','response','data']){const text=runtimeErrorText(value[key],depth+1);if(text)return text}
    try{return JSON.stringify(value)}catch{return''}
  }
  return String(value);
}
const now=()=>new Date().toISOString();
const uid=p=>`${p}${crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36)}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function json(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}})}
function parseBody(init){if(init?.body==null)return{};if(typeof init.body==='string'){try{return JSON.parse(init.body)}catch{return{}}}return init.body}
function requestInfo(input,init={}){try{const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.href);return{url,method:String(init.method||(input instanceof Request?input.method:'GET')||'GET').toUpperCase()}}catch{return null}}
function safeProvider(p){const x=clone(p||{});const has=Boolean(String(x.apiKey||'').trim());delete x.apiKey;delete x.apiKeyEncrypted;x.hasApiKey=has||x.hasApiKey===true;return x}
function legacyRead(key,fallback){try{const v=JSON.parse(localStorage.getItem(key));return v==null?clone(fallback):v}catch{return clone(fallback)}}
function requestPromise(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IndexedDB 请求失败'))})}
function txPromise(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('IndexedDB 事务已中止'));tx.onerror=()=>reject(tx.error||new Error('IndexedDB 事务失败'))})}
function openDatabase(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;for(const name of Object.values(STORES)){if(!db.objectStoreNames.contains(name)){if(name===STORES.settings||name===STORES.meta)db.createObjectStore(name,{keyPath:'key'});else db.createObjectStore(name,{keyPath:'id'})}}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('无法打开 IndexedDB'))})}
async function idbGet(store,key){const tx=runtime.db.transaction(store,'readonly'),value=await requestPromise(tx.objectStore(store).get(key));await txPromise(tx);return value}
async function idbGetAll(store){const tx=runtime.db.transaction(store,'readonly'),value=await requestPromise(tx.objectStore(store).getAll());await txPromise(tx);return value||[]}
async function idbPut(store,value){const tx=runtime.db.transaction(store,'readwrite');tx.objectStore(store).put(value);await txPromise(tx);return value}
async function idbDelete(store,key){const tx=runtime.db.transaction(store,'readwrite');tx.objectStore(store).delete(key);await txPromise(tx)}
async function idbReplaceAll(store,values){const tx=runtime.db.transaction(store,'readwrite'),os=tx.objectStore(store);os.clear();for(const value of values)os.put(value);await txPromise(tx)}
function enqueuePersist(job){runtime.persistChain=runtime.persistChain.then(job).catch(error=>{console.error('[browser-runtime] IndexedDB persistence failed',error);throw error});return runtime.persistChain}
function bytesToBase64(value){const bytes=value instanceof Uint8Array?value:new Uint8Array(value);let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
function base64ToBytes(value){const s=atob(String(value||'')),out=new Uint8Array(s.length);for(let i=0;i<s.length;i++)out[i]=s.charCodeAt(i);return out}
let providerCryptoKeyPromise=null;
async function providerCryptoKey(){
  if(providerCryptoKeyPromise)return providerCryptoKeyPromise;
  providerCryptoKeyPromise=(async()=>{
    const existing=await idbGet(STORES.meta,'provider-aes-key');
    if(existing?.value)return existing.value;
    if(!crypto?.subtle)throw new Error('当前浏览器不支持 WebCrypto，无法安全保存 API Key');
    const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
    await idbPut(STORES.meta,{key:'provider-aes-key',value:key,createdAt:now()});
    return key;
  })();
  return providerCryptoKeyPromise;
}
async function providerToRecord(provider){
  const out=clone(provider||{}),plain=String(out.apiKey||'');delete out.apiKey;delete out.apiKeyEncrypted;
  if(plain){const key=await providerCryptoKey(),iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(plain));out.apiKeyEncrypted={v:1,iv:bytesToBase64(iv),cipher:bytesToBase64(cipher)};out.hasApiKey=true}
  return out;
}
async function providerFromRecord(record){
  const out=clone(record||{}),enc=out.apiKeyEncrypted;
  if(enc?.iv&&enc?.cipher){try{const key=await providerCryptoKey(),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:base64ToBytes(enc.iv)},key,base64ToBytes(enc.cipher));out.apiKey=new TextDecoder().decode(plain);out.hasApiKey=true}catch(error){console.warn('[browser-runtime] provider API key decrypt failed',error)}}
  delete out.apiKeyEncrypted;
  return out;
}
async function persistProvidersNow(){const records=[];for(const p of cache.providers)records.push(await providerToRecord(p));await idbReplaceAll(STORES.providers,records)}
function providers(){return cache.providers}
function normalizeProviderRecord(provider){try{return Adapters?.finalizeProvider?Adapters.finalizeProvider(provider||{}):clone(provider||{})}catch{return clone(provider||{})}}
function saveProviders(list){cache.providers=clone(Array.isArray(list)?list:[]).map(normalizeProviderRecord);enqueuePersist(persistProvidersNow);return cache.providers}
async function saveProvidersCommitted(list){cache.providers=clone(Array.isArray(list)?list:[]).map(normalizeProviderRecord);await persistProvidersNow();return cache.providers}
function projects(){return cache.projects}
function saveProjects(list){cache.projects=clone(Array.isArray(list)?list:[]);enqueuePersist(()=>idbReplaceAll(STORES.projects,cache.projects));return cache.projects}
function tasks(){return cache.tasks}
function saveTasks(list){cache.tasks=clone((Array.isArray(list)?list:[]).slice(0,300));enqueuePersist(()=>idbReplaceAll(STORES.tasks,cache.tasks));return cache.tasks}
function queueState(){return{paused:false,concurrency:2,...cache.queue}}
function setQueue(patch){cache.queue={...queueState(),...clone(patch||{})};enqueuePersist(()=>idbPut(STORES.settings,{key:'queue',value:cache.queue,updatedAt:now()}));return cache.queue}
function mediaUrl(id){return `/__browser_media/${encodeURIComponent(id)}`}
async function ensureMediaServiceWorker(){
  if(!('serviceWorker'in navigator))return false;
  try{
    const registration=await navigator.serviceWorker.register('./browser-media-sw.js?v=20260831-media-canvas-scale-350-1',{scope:'./',updateViaCache:'none'});try{await registration.update()}catch{}
    await navigator.serviceWorker.ready;
    if(navigator.serviceWorker.controller)return true;
    return await new Promise(resolve=>{let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value)};const timer=setTimeout(()=>finish(Boolean(navigator.serviceWorker.controller)),5000);navigator.serviceWorker.addEventListener('controllerchange',()=>finish(true),{once:true})});
  }catch(error){console.warn('[browser-runtime] media service worker unavailable',error);return false}
}
async function storeMediaBlob(blob,{name='',id=''}={}){
  if(!(blob instanceof Blob))throw new Error('媒体内容不是 Blob');
  const mediaId=id||uid('media_');
  await idbPut(STORES.media,{id:mediaId,blob,name:String(name||''),type:blob.type||'application/octet-stream',size:blob.size,createdAt:now(),updatedAt:now()});
  const controlled=await (runtime.swReady||(runtime.swReady=ensureMediaServiceWorker()));
  if(!controlled)throw new Error('浏览器本地媒体服务未就绪，请刷新页面后重试');
  return{id:mediaId,url:mediaUrl(mediaId),size:blob.size,type:blob.type||'application/octet-stream',persistent:true};
}
async function initializePersistence(){
  runtime.db=await openDatabase();
  const providerRows=await idbGetAll(STORES.providers),projectRows=await idbGetAll(STORES.projects),taskRows=await idbGetAll(STORES.tasks),queueRow=await idbGet(STORES.settings,'queue');
  if(!providerRows.length){const legacy=legacyRead(LEGACY_KEYS.providers,[]);const fallback=legacy.length?legacy:legacyRead('canvas-studio-providers-v1',[]);cache.providers=Array.isArray(fallback)?fallback:[];if(cache.providers.length)await persistProvidersNow()}else cache.providers=await Promise.all(providerRows.map(providerFromRecord));
  const providerSnapshot=JSON.stringify(cache.providers.map(p=>{const x=clone(p);delete x.apiKey;return x}));
  cache.providers=cache.providers.map(normalizeProviderRecord);
  const providerHealed=JSON.stringify(cache.providers.map(p=>{const x=clone(p);delete x.apiKey;return x}))!==providerSnapshot;
  if(providerHealed&&cache.providers.length)await persistProvidersNow();
  if(!projectRows.length){cache.projects=legacyRead(LEGACY_KEYS.projects,[]);if(cache.projects.length)await idbReplaceAll(STORES.projects,cache.projects)}else cache.projects=projectRows;
  if(!taskRows.length){cache.tasks=legacyRead(LEGACY_KEYS.tasks,[]).slice(0,300);if(cache.tasks.length)await idbReplaceAll(STORES.tasks,cache.tasks)}else cache.tasks=taskRows.slice(0,300);
  cache.queue={paused:false,concurrency:2,...(queueRow?.value||legacyRead(LEGACY_KEYS.queue,{}))};
  if(!queueRow)await idbPut(STORES.settings,{key:'queue',value:cache.queue,updatedAt:now()});
  for(const key of Object.values(LEGACY_KEYS)){try{localStorage.removeItem(key)}catch{}}
  try{navigator.storage?.persist?.().catch(()=>{})}catch{}
  runtime.swReady=ensureMediaServiceWorker();
  return true;
}
function findProvider(id){return providers().find(p=>String(p.id)===String(id))||null}
function findTask(id){return tasks().find(t=>String(t.id)===String(id))||null}
function updateTask(id,patch){
  const list=tasks(),i=list.findIndex(t=>t.id===id);if(i<0)return null;
  const current=list[i],next={...(patch||{})};
  const providerSucceeded=current.providerStatus==='succeeded'||next.providerStatus==='succeeded'||['provider_succeeded','result_pending','succeeded'].includes(current.status);
  if(current.status==='succeeded'&&next.status&&next.status!=='succeeded'&&next.status!=='canceled')delete next.status;
  if(providerSucceeded&&next.status==='failed'){
    next.status=current.output?'succeeded':'result_pending';
    next.providerStatus='succeeded';
    next.resultStatus=current.output?'saved':'pending';
    next.lastError=runtimeErrorText(next.error)||runtimeErrorText(next.lastError)||current.lastError||'';
    next.error=null;
  }
  if(next.status==='provider_succeeded'){
    next.providerStatus='succeeded';next.resultStatus=current.resultStatus==='saved'?'saved':'pending';
    next.providerSucceededAt=current.providerSucceededAt||next.providerSucceededAt||now();next.error=null;
  }
  if(next.status==='result_pending'){
    next.providerStatus='succeeded';next.resultStatus='pending';next.providerSucceededAt=current.providerSucceededAt||next.providerSucceededAt||now();next.error=null;
  }
  if(next.status==='succeeded'){
    next.providerStatus='succeeded';next.resultStatus='saved';next.providerSucceededAt=current.providerSucceededAt||next.providerSucceededAt||now();next.resultSavedAt=current.resultSavedAt||next.resultSavedAt||now();next.error=null;next.lastError=null;
  }
  list[i]={...current,...next,updatedAt:now()};saveTasks(list);
  if(['succeeded','failed','canceled'].includes(list[i].status)){const timer=runtime.resultRetryTimers.get(id);if(timer){clearTimeout(timer);runtime.resultRetryTimers.delete(id)}const rateTimer=runtime.rateLimitRetryTimers.get(id);if(rateTimer){clearTimeout(rateTimer);runtime.rateLimitRetryTimers.delete(id)}}
  return list[i]
}
function scheduleTaskResume(id,delay=3000){
  if(runtime.resultRetryTimers.has(id))return;
  const timer=setTimeout(()=>{runtime.resultRetryTimers.delete(id);const current=findTask(id);if(!current||current.cancelRequested)return;if(['provider_succeeded','result_pending'].includes(current.status)){updateTask(id,{status:'queued',error:null});pump()}},Math.max(1000,Number(delay)||3000));
  runtime.resultRetryTimers.set(id,timer);
}
function scheduleRateLimitRetry(id,delay=65000){
  const wait=Math.max(1000,Math.min(15*60*1000,Number(delay)||65000));
  const previous=runtime.rateLimitRetryTimers.get(id);if(previous)clearTimeout(previous);
  const timer=setTimeout(()=>{runtime.rateLimitRetryTimers.delete(id);const current=findTask(id);if(!current||current.cancelRequested||current.status!=='retrying'||current.retryReason!=='rate_limit')return;updateTask(id,{status:'queued',error:null,lastError:null,nextRetryAt:null,rateLimitRetryAt:null,retryReason:null});pump()},wait);
  runtime.rateLimitRetryTimers.set(id,timer);
}
function providerCreateThrottleKey(provider,route={}){
  let origin='';try{origin=new URL(String(provider?.baseUrl||''),location.href).origin}catch{}
  const family=String(route?.protocolFamily||route?.protocolProfile||route?.adapterKey||'').toLowerCase();
  const host=(()=>{try{return new URL(String(provider?.baseUrl||''),location.href).hostname.toLowerCase()}catch{return''}})();
  if(!(host.includes('agnes-ai.com')||host.includes('agnes-ai.cn')||family.includes('agnes')))return'';
  return `${String(provider?.id||'agnes')}|${origin||host||'agnes'}|video-create`;
}
function reserveProviderCreateSlot(provider,route={}){
  const key=providerCreateThrottleKey(provider,route);if(!key)return null;
  const q=queueState(),last={...(q.providerCreateLastAt||{})},cooldowns={...(q.providerCreateCooldownUntil||{})},nowMs=Date.now();
  const minGap=65000,due=Math.max(Number(cooldowns[key]||0),Number(last[key]||0)+minGap);
  if(due>nowMs){const wait=Math.max(1000,due-nowMs);const err=new Error(`供应商创建限流：约 ${Math.ceil(wait/1000)} 秒后自动提交`);err.status=429;err.retryAfterMs=wait+250;err.localRateLimit=true;err.providerRateLimitKey=key;throw err}
  last[key]=nowMs;setQueue({providerCreateLastAt:last});return key;
}
function recordProviderCreateRateLimit(provider,route={},delay=65000){
  const key=providerCreateThrottleKey(provider,route);if(!key)return null;
  const q=queueState(),cooldowns={...(q.providerCreateCooldownUntil||{})},wait=Math.max(65000,Math.min(15*60*1000,Number(delay)||65000));
  cooldowns[key]=Math.max(Number(cooldowns[key]||0),Date.now()+wait);setQueue({providerCreateCooldownUntil:cooldowns});return cooldowns[key];
}
function upsertTask(task){const list=tasks(),i=list.findIndex(t=>t.id===task.id);if(i>=0)list[i]=task;else list.unshift(task);saveTasks(list);return task}
function normalizeMod(v,model={}){return Adapters?.normalizeModelModality?Adapters.normalizeModelModality(v,model):(String(v||'text').toLowerCase()==='script'?'text':String(v||'text').toLowerCase())}
function fillTemplate(value,ctx){if(typeof value==='string')return value.replace(/\{\{\s*([^}]+)\s*\}\}/g,(_,k)=>{const parts=k.trim().split('.');let cur=ctx;for(const p of parts)cur=cur?.[p];return cur==null?'':typeof cur==='object'?JSON.stringify(cur):String(cur)});if(Array.isArray(value))return value.map(v=>fillTemplate(v,ctx));if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value))out[k]=fillTemplate(v,ctx);return out}return value}
function joinUrl(base,path){if(/^https?:\/\//i.test(String(path||'')))return String(path);const b=new URL(String(base||location.origin));const root=b.pathname.replace(/\/+$/,'');let p=String(path||'');if(!p.startsWith('/'))p='/'+p;if(root&&root!=='/'&&p.startsWith(root+'/'))b.pathname=p;else b.pathname=(root+p).replace(/\/{2,}/g,'/');b.search='';b.hash='';return b.toString()}
function providerOrigin(provider){try{return new URL(String(provider?.baseUrl||''),location.href).origin}catch{return''}}
function isProviderOriginUrl(provider,url){try{const expected=providerOrigin(provider);if(!expected)return false;return new URL(String(url||''),String(provider?.baseUrl||location.href)).origin===expected}catch{return false}}
function credentialedProviderUrl(provider,url){if(!isProviderOriginUrl(provider,url))throw new Error('安全策略阻止向供应商 Base URL 之外的地址发送 API Key');return String(url)}
function stripCredentialHeaders(headers={}){const out={};for(const [k,v] of Object.entries(headers||{})){const n=String(k).toLowerCase();if(n==='authorization'||n==='proxy-authorization'||n==='x-api-key'||n==='api-key'||/(^|[-_])(token|secret|api[-_]?key)([-_]|$)/i.test(n))continue;out[k]=v}return out}
function providerRouteUrl(provider,value){const text=String(value||'').trim();if(!text)return'';try{const url=/^https?:\/\//i.test(text)?text:joinUrl(provider.baseUrl,text);return isProviderOriginUrl(provider,url)?url:''}catch{return''}}
function providerResourceUrl(provider,value){const text=String(value||'').trim();if(!text)return'';try{if(/^https?:\/\//i.test(text))return new URL(text).toString();if(text.startsWith('/'))return joinUrl(provider.baseUrl,text);return''}catch{return''}}
function authCandidates(provider){const key=String(provider?.apiKey||'').trim(),list=[];if(!key)return[{}];const configured=String(provider?.authHeader||'').trim();if(configured){const scheme=String(provider?.authScheme||'').trim();list.push({[configured]:scheme?`${scheme} ${key}`:key})}list.push({Authorization:`Bearer ${key}`},{'x-api-key':key},{'api-key':key});const seen=new Set();return list.filter(x=>{const s=JSON.stringify(x);if(seen.has(s))return false;seen.add(s);return true})}
function cleanHeaders(headers={}){const h={};for(const [k,v] of Object.entries(headers||{})){const n=String(k).toLowerCase();if(['host','cookie','set-cookie','content-length','connection','transfer-encoding','cf-connecting-ip','x-forwarded-for'].includes(n))continue;h[k]=String(v)}return h}

async function blobToBase64(blob){const bytes=new Uint8Array(await blob.arrayBuffer());let out='';const step=0x8000;for(let i=0;i<bytes.length;i+=step)out+=String.fromCharCode(...bytes.subarray(i,i+step));return btoa(out)}
async function serializeProxyBody(body){if(body==null)return{bodyType:'none',body:null};if(typeof body==='string')return{bodyType:'text',body};if(body instanceof FormData){const entries=[];for(const [name,value] of body.entries()){if(value instanceof Blob){if(value.size>25*1024*1024)throw new Error('在线预览的单个代理文件不能超过 25MB');entries.push({name,kind:'file',filename:value.name||'upload.bin',type:value.type||'application/octet-stream',base64:await blobToBase64(value)})}else entries.push({name,kind:'text',value:String(value)})}return{bodyType:'form-data',formData:entries}}throw new Error('在线代理不支持此请求体类型')}
async function proxyFetch(url,init={}){
  const headers=cleanHeaders(init.headers||{}),packed=await serializeProxyBody(init.body);
  if(packed.bodyType==='form-data'){delete headers['content-type'];delete headers['Content-Type']}
  const res=await rawFetch('/api/proxy',{method:'POST',headers:{'content-type':'application/json','x-canvas-proxy':'1'},body:JSON.stringify({url,method:String(init.method||'GET').toUpperCase(),headers,...packed})});
  // Do not throw on upstream HTTP errors here. The proxy intentionally mirrors the
  // upstream status/body; providerJson must receive that status so protocol fallback
  // can react to 400/404/405/415/422 instead of losing it inside a generic Error.
  return res;
}
async function providerFetch(url,init={}){
  const method=String(init.method||'GET').toUpperCase();
  const fetchInit={...init,mode:'cors',redirect:'follow',...(['GET','HEAD'].includes(method)?{cache:'no-store'}:{})};
  try{
    return await rawFetch(url,fetchInit);
  }catch(error){
    if(error?.name==='AbortError')throw error;
    return proxyFetch(url,init);
  }
}
async function fetchWithAuth(provider,url,init={}){
  url=credentialedProviderUrl(provider,url);
  let last=null;
  for(const auth of authCandidates(provider)){
    const res=await providerFetch(url,{...init,headers:{accept:'application/json',...(init.headers||{}),...auth}});
    last=res;
    if(![401,403].includes(res.status))return res;
  }
  return last;
}
async function fetchProviderResource(provider,url,init={}){
  if(isProviderOriginUrl(provider,url))return fetchWithAuth(provider,url,init);
  return providerFetch(url,{...init,headers:stripCredentialHeaders(init.headers||{})});
}
async function readResponse(res){const ct=String(res.headers.get('content-type')||'').toLowerCase();if(ct.includes('application/json')||ct.includes('+json'))return{kind:'json',value:await res.json()};if(ct.startsWith('text/'))return{kind:'text',value:await res.text()};const blob=await res.blob(),stored=await storeMediaBlob(blob,{name:'provider-output'});return{kind:'blob',value:stored.url,blob,type:ct,mediaId:stored.id,persistent:true}}
function outputObject(value,modality='text'){
  if(value==null)return null;
  if(typeof value==='object'&&value.type&&('value'in value))return value;
  if(modality==='text')return{type:'text',value:String(value),text:String(value)};
  return{type:'url',value:String(value),url:String(value),sourceUrl:String(value)};
}
function validMediaOutput(value){const text=String(value||'').trim();return /^(https?:\/\/|data:|blob:|\/\/|\/media\/|\/__browser_media\/)/i.test(text)}
async function normalizeGeneratedOutput(value,modality,provider){
  if(value==null)return value;
  let text=typeof value==='string'?value.trim():value;
  if(modality==='image'&&typeof text==='string'&&/^data:image\//i.test(text)){
    try{const blob=await (await rawFetch(text)).blob(),stored=await storeMediaBlob(blob,{name:'generated-image'});return stored.url}catch{}
  }
  if(typeof text==='string'&&text.startsWith('/')&&!text.startsWith('/__browser_media/')&&!text.startsWith('/media/')){
    try{return joinUrl(provider?.baseUrl||location.origin,text)}catch{}
  }
  return text;
}
async function typedGeneratedVideoBlob(blob,url,res){
  if(!(blob instanceof Blob)||!blob.size)return blob;
  const current=String(blob.type||res?.headers?.get?.('content-type')||'').split(';')[0].trim().toLowerCase();
  if(current.startsWith('video/'))return blob;
  const hint=`${String(url||'')} ${String(res?.headers?.get?.('content-disposition')||'')}`.toLowerCase();
  let mime='';
  if(/\.(mp4|m4v)(?:[?#]|$)/i.test(hint))mime='video/mp4';
  else if(/\.webm(?:[?#]|$)/i.test(hint))mime='video/webm';
  else if(/\.(mov|qt)(?:[?#]|$)/i.test(hint))mime='video/quicktime';
  else if(/\.(ogv|ogg)(?:[?#]|$)/i.test(hint))mime='video/ogg';
  if(!mime){
    try{
      const head=new Uint8Array(await blob.slice(0,16).arrayBuffer());
      const ascii=String.fromCharCode(...head);
      if(head.length>=8&&ascii.slice(4,8)==='ftyp')mime='video/mp4';
      else if(head.length>=4&&head[0]===0x1a&&head[1]===0x45&&head[2]===0xdf&&head[3]===0xa3)mime='video/webm';
      else if(ascii.startsWith('OggS'))mime='video/ogg';
    }catch{}
  }
  return mime?new Blob([blob],{type:mime}):blob;
}
async function materializeGeneratedVideoOutput(value,provider){
  const text=String(value||'').trim();
  if(!text||text.startsWith('/__browser_media/')||text.startsWith('/media/')||text.startsWith('data:')||text.startsWith('blob:'))return text;
  if(!/^(https?:\/\/|\/\/)/i.test(text))return text;
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
  const blob=await res.blob();
  if(!blob.size)throw new Error('视频结果下载为空文件');
  const typed=await typedGeneratedVideoBlob(blob,url,res);
  const stored=await storeMediaBlob(typed,{name:'generated-video'});
  if(!stored?.url)throw new Error('视频结果下载后未能保存到浏览器本地媒体库');
  return stored.url;
}
function imageTargetSelection(provider,model,parameters={}){
  const selection=ImageCapabilities?.normalizeSelection?.(provider||{},model||{},parameters||{});
  const target=ImageOutputDimensions?.parseSize?.(selection?.size||parameters?.size||'');
  return target?{...target,selection}:null;
}
async function generatedImageBlob(value){
  const text=String(value||'').trim();if(!text)throw new Error('生成图片地址为空，无法校验尺寸');
  let res;
  if(/^https?:\/\//i.test(text)||text.startsWith('//')){const url=text.startsWith('//')?`${location.protocol}${text}`:text;res=await providerFetch(url,{method:'GET',headers:{accept:'image/*'}})}
  else res=await rawFetch(text,{method:'GET',headers:{accept:'image/*'}});
  if(!res?.ok)throw new Error(`无法读取生成图片以校验尺寸${res?.status?`（HTTP ${res.status}）`:''}`);
  const blob=await res.blob();if(!String(blob.type||'').toLowerCase().startsWith('image/'))throw new Error('生成结果不是可校验的图片文件');return blob;
}
async function decodeGeneratedImage(blob){
  if(typeof createImageBitmap==='function'){const bitmap=await createImageBitmap(blob);return{image:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close?.()}}
  if(typeof Image!=='function'||typeof URL==='undefined')throw new Error('当前浏览器无法读取生成图片像素尺寸');
  return await new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),img=new Image();img.onload=()=>resolve({image:img,width:img.naturalWidth,height:img.naturalHeight,close:()=>URL.revokeObjectURL(url)});img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('生成图片解码失败'))};img.src=url});
}
async function encodedCanvasBlob(canvas,type){
  const mime=ImageOutputDimensions?.outputMimeType?.(type)||'image/png';
  if(typeof canvas.convertToBlob==='function')return canvas.convertToBlob({type:mime,quality:.95});
  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('纠正后的图片编码失败')),mime,.95));
}
async function enforceGeneratedImageDimensions(value,provider,model,parameters={}){
  const target=imageTargetSelection(provider,model,parameters);if(!target)return{value,corrected:false,targetSize:'',sourceSize:'',finalSize:'',policy:''};
  const targetSize=target.size,blob=await generatedImageBlob(value),decoded=await decodeGeneratedImage(blob),sourceSize=`${decoded.width}x${decoded.height}`;
  try{
    if(ImageOutputDimensions?.sameSize?.(decoded.width,decoded.height,target))return{value,corrected:false,targetSize,sourceSize,finalSize:sourceSize,policy:'verified'};
    const crop=ImageOutputDimensions?.cropRect?.(decoded.width,decoded.height,target.width,target.height);if(!crop)throw new Error('无法计算图片尺寸纠正规则');
    let canvas;if(typeof OffscreenCanvas==='function')canvas=new OffscreenCanvas(target.width,target.height);else{if(typeof document==='undefined')throw new Error('当前浏览器不支持图片尺寸纠正');canvas=document.createElement('canvas');canvas.width=target.width;canvas.height=target.height}
    const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw new Error('无法创建图片尺寸纠正画布');
    ctx.drawImage(decoded.image,crop.sx,crop.sy,crop.sWidth,crop.sHeight,0,0,target.width,target.height);
    const corrected=await encodedCanvasBlob(canvas,blob.type),stored=await storeMediaBlob(corrected,{name:`generated-image-${targetSize}`});
    return{value:stored.url,corrected:true,targetSize,sourceSize,finalSize:targetSize,policy:'center-crop-resize'};
  }finally{decoded.close?.()}
}
function imageDimensionTaskPatch(info){return info?{requestedImageSize:info.targetSize||'',sourceImageSize:info.sourceSize||'',finalImageSize:info.finalSize||'',imageDimensionCorrected:info.corrected===true,imageDimensionPolicy:info.policy||''}:{}}
function refsForRequest(refs=[]){return (Array.isArray(refs)?refs:[]).map(r=>({role:r.role||r.semanticRole||r.kind||'reference',type:r.type||r.kind||'',url:r.url||r.outputUrl||'',text:r.text||'',title:r.title||''})).filter(r=>r.url||r.text)}
async function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(blob)})}
async function referenceBlob(url){const value=String(url||'');if(!value)return null;try{if(value.startsWith('data:')){const res=await rawFetch(value);return await res.blob()}if(value.startsWith('blob:')||value.startsWith('/__browser_media/')){const res=await rawFetch(value);if(res.ok)return await res.blob()}if(/^https?:\/\//i.test(value)){try{const res=await rawFetch(value,{mode:'cors'});if(res.ok)return await res.blob()}catch{}const proxied=await proxyFetch(value,{method:'GET'});if(proxied.ok)return await proxied.blob()}}catch{}return null}
async function makePortableReferences(refs=[]){const out=[];for(const r of refsForRequest(refs)){let url=r.url;if(url&&(url.startsWith('blob:')||url.startsWith('/__browser_media/'))){try{const blob=await referenceBlob(url);if(blob&&blob.size<=20*1024*1024)url=await blobToDataUrl(blob)}catch{}}out.push({...r,url})}return out}
function browserLocalMediaReference(value){
  const text=String(value||'').trim();if(!text)return'';if(text.startsWith('blob:')||text.startsWith('/__browser_media/'))return text;
  try{const u=new URL(text,location.href);if(u.origin===location.origin&&u.pathname.startsWith('/__browser_media/'))return u.pathname+u.search}catch{}
  return'';
}
async function portableizeVideoJsonBody(body,route={}){
  if(!Core?.mapNestedStrings)return body;
  const transport=Adapters?.normalizeReferenceTransport?Adapters.normalizeReferenceTransport(route.referenceTransport||'auto',{cloud:true}):'data-url';
  return await Core.mapNestedStrings(body,async value=>{
    const local=browserLocalMediaReference(value);if(!local)return value;
    if(transport==='url')throw new Error('当前视频协议要求公共 URL，但参考媒体仅存在浏览器本地；请把模型 referenceTransport 改为 data-url，或配置供应商上传接口');
    if(transport==='upload')throw new Error('当前视频协议要求先上传参考媒体，但尚未配置供应商上传接口；不能把浏览器本地地址直接发送给上游');
    const blob=await referenceBlob(local);if(!blob)throw new Error('浏览器本地参考媒体无法读取，已阻止发送不可访问的本地 URL');
    if(blob.size>20*1024*1024)throw new Error('浏览器本地参考媒体超过 20MB，JSON data-url 传输已阻止；请使用供应商上传接口');
    return await blobToDataUrl(blob);
  });
}
function providerHost(provider){try{return new URL(String(provider?.baseUrl||'')).hostname.toLowerCase()}catch{return''}}
function officialOpenAIImageProvider(provider){const h=providerHost(provider);return h==='api.openai.com'||h.endsWith('.openai.com')}
function imageRequestBodies(provider,model,task,route,refs){
  const strict=defaultRequestBody(provider,model,task,route,refs);
  if(route.requestTemplate&&Object.keys(route.requestTemplate).length)return[{profile:'template',body:strict,capability:null,selection:null}];
  if(route.adapterKey!=='openai-image')return[{profile:'generic',body:strict,capability:null,selection:null}];
  if(ImageCapabilities?.mapRequest){
    const mapped=ImageCapabilities.mapRequest(provider,model,task.parameters||{},String(task.prompt||''),Number(task.parameters?.count||1),refs);
    return[{profile:mapped.profile,body:mapped.body,capability:{family:mapped.capability?.family||'',source:mapped.capability?.source||'',confidence:mapped.capability?.confidence??0,requestMode:mapped.capability?.requestMode||''},selection:{aspectRatio:mapped.selection?.aspectRatio||'',resolution:mapped.selection?.resolution||'',imageQuality:mapped.selection?.imageQuality||'',size:mapped.selection?.size||''}}];
  }
  return[{profile:'openai-fallback',body:strict,capability:null,selection:null}];
}

function imageResponseSize(raw){
  const value=Core?.firstPath?Core.firstPath(raw,['data.0.size','images.0.size','output.0.size','output.size','result.size','size']):undefined;
  return value==null?'':String(value);
}
function imageRequestDiagnostics(profile,body,path){
  const safe={};
  for(const key of ['model','size','image_size','width','height','aspect_ratio','resolution','quality','image_quality','n','batch_size'])if(body?.[key]!==undefined)safe[key]=body[key];
  return{profile,path:String(path||''),parameters:safe,at:now()};
}

function defaultRequestBody(provider,model,task,route,refs){
  const mod=normalizeMod(task.nodeType||model.modality),rawParams=task.parameters||{},p=mod==='image'?(ImageParams?.normalize?.(rawParams)||rawParams):mod==='video'?(VideoParams?.normalize?.(rawParams)||rawParams):rawParams,prompt=String(task.prompt||''),modelId=model.id;
  const ctx={model:modelId,prompt,references:refs,parameters:p,task};
  if(route.requestTemplate&&Object.keys(route.requestTemplate).length)return fillTemplate(route.requestTemplate,ctx);
  if(route.adapterKey==='openai-chat'){
    const images=refs.filter(r=>r.url&&r.type==='image');
    if(Adapters?.isAgnesProvider?.(provider)&&images.some(r=>!/^https?:\/\//i.test(String(r.url||''))))throw new Error('Agnes 文本模型的图像理解仅支持公开可访问的 image_url；浏览器本地图片不能直接提交');
    const content=images.length?[{type:'text',text:prompt},...images.map(r=>({type:'image_url',image_url:{url:r.url}}))]:prompt;
    return{model:modelId,messages:[{role:'user',content}],...(p.responseFormat==='json_object'?{response_format:{type:'json_object'}}:{})};
  }
  if(route.adapterKey==='openai-responses')return{model:modelId,input:prompt};
  if(route.adapterKey==='openai-image')return{model:modelId,prompt,n:Number(p.count||1),...(p.size?{size:p.size}:{}),...(p.quality?{quality:p.quality}:{}),...(p.aspectRatio?{aspect_ratio:p.aspectRatio}:{})};
  if(route.adapterKey==='openai-audio-speech')return{model:modelId,input:prompt,voice:p.voice||'alloy',...(p.format?{format:p.format}:{})};
  if(route.adapterKey==='comfyui-workflow')return{prompt:p.workflow||p.promptGraph||{},client_id:uid('browser_')};
  if(mod==='video'){const mapped=Adapters?.mapVideoRequest?.(provider,model,{...task,parameters:p},route,refs);if(mapped?.body)return mapped.body;const first=refs.find(r=>['first_frame','image','image_reference'].includes(r.role)||r.type==='image');const last=refs.find(r=>r.role==='last_frame');const duration=Number(p.duration??p.seconds??4);const ratio=String(p.aspectRatio||p.aspect_ratio||'16:9');return{model:modelId,prompt,...p,duration,seconds:String(p.seconds||duration),aspect_ratio:ratio,ratio,...(p.size?{size:p.size}:{}),...(first?.url?{image:first.url,image_url:first.url,input_image:first.url,first_frame:first.url,input_reference:first.url}:{}),...(last?.url?{last_frame:last.url,last_frame_url:last.url}:{}),...(refs.length?{references:refs}:{})};}

  return{model:modelId,prompt,...p,...(refs.length?{references:refs}:{})};
}
async function buildStandardVideoForm(model,task,refs){const p=VideoParams?.normalize?.(task.parameters||{})||task.parameters||{},form=new FormData();form.append('model',String(model.id||''));form.append('prompt',String(task.prompt||''));if(p.seconds)form.append('seconds',String(p.seconds));if(p.size)form.append('size',String(p.size));const first=refs.find(r=>['first_frame','image','image_reference'].includes(r.role)||r.type==='image');if(first?.url){const blob=await referenceBlob(first.url);if(!blob)throw new Error('首帧/参考图无法读取，无法提交图生视频');if(blob.size>25*1024*1024)throw new Error('首帧/参考图超过 25MB，在线预览暂不支持');form.append('input_reference',blob,'input-reference.'+((blob.type||'image/png').split('/')[1]||'png'))}return form}
function autoVideoRoute(model,route){return route?.adapterKey==='standard-video-async-v1'&&(model?.routeOrigin==='auto'||model?.adapterResolved?.auto===true||!String(model?.createPath||'').trim())}
const VIDEO_AUTO_RETRY_STATUSES=new Set([400,404,405,415,422]);
function alternateVideoCreatePaths(route,model){
  const first=String(route.createPath||'/v1/videos'),profile=Array.isArray(route.createCandidates)?route.createCandidates:[];if(!autoVideoRoute(model,route))return[first];
  return[...new Set([first,...profile,'/v1/video/generations','/v1/videos','/v1/videos/generations','/v1/video/generation','/video/generations','/videos/generations','/api/v1/videos','/api/v1/video/generations'])];
}
function matchingPollPath(createPath,taskId,route){if(createPath==='/v1/video/generations'||createPath==='/api/v1/video/generations')return `${createPath}/${taskId}`;if(createPath==='/v1/videos/generations'||createPath==='/video/generations'||createPath==='/videos/generations')return `${createPath}/${taskId}`;return fillTemplate(route.pollPath||'/v1/videos/{{taskId}}',{taskId})}
function videoRouteCandidate(provider,value){return providerRouteUrl(provider,value)}
function videoResourceCandidate(provider,value){return providerResourceUrl(provider,value)}
function isAgnesVideoRoute(route={}){const family=String(route?.protocolFamily||route?.family||''),profile=String(route?.protocolProfile||route?.profile||'');return family==='agnes-video'||profile.startsWith('agnes:')}
function providerVideoIdentity(raw={}){if(!raw||typeof raw!=='object')return{videoId:'',taskId:'',ambiguousTaskAlias:false};let videoId=Core?.firstPath?Core.firstPath(raw,['video_id','videoId','data.video_id','data.videoId']):'',taskId=Core?.firstPath?Core.firstPath(raw,['task_id','taskId','data.task_id','data.taskId','id','data.id']):'';videoId=videoId==null?'':String(videoId).trim();taskId=taskId==null?'':String(taskId).trim();const ambiguousTaskAlias=Boolean(videoId&&taskId&&videoId===taskId&&/^task[_-]/i.test(videoId));if(ambiguousTaskAlias)videoId='';return{videoId,taskId,ambiguousTaskAlias}}
function agnesLegacyTaskPollUrl(provider,taskId){const id=String(taskId||'').trim();return id?joinUrl(provider.baseUrl,`/v1/videos/${encodeURIComponent(id)}`):''}
function videoPollUrlCandidates(provider,createdRaw,createPath,taskId,route){
  const out=[],add=value=>{const url=videoRouteCandidate(provider,value);if(url&&!out.includes(url))out.push(url)};
  if(route?.strictPollPath===true){
    if(isAgnesVideoRoute(route)){
      const identity=providerVideoIdentity(createdRaw),videoId=identity.videoId,providerTaskId=identity.taskId||(!videoId?String(taskId||'').trim():'');
      if(videoId){
        if(route.pollPath)add(joinUrl(provider.baseUrl,fillTemplate(route.pollPath,{taskId:videoId})));
        for(const template of (Array.isArray(route.pollPathCandidates)?route.pollPathCandidates:[]))add(joinUrl(provider.baseUrl,fillTemplate(template,{taskId:videoId})));
        if(providerTaskId)add(agnesLegacyTaskPollUrl(provider,providerTaskId));
      }else if(providerTaskId){
        add(agnesLegacyTaskPollUrl(provider,providerTaskId));
        if(route.pollPath)add(joinUrl(provider.baseUrl,fillTemplate(route.pollPath,{taskId:providerTaskId})));
      }else if(route.pollPath)add(joinUrl(provider.baseUrl,fillTemplate(route.pollPath,{taskId})));
      return out;
    }
    if(route.pollPath)add(joinUrl(provider.baseUrl,fillTemplate(route.pollPath,{taskId})));
    for(const template of (Array.isArray(route.pollPathCandidates)?route.pollPathCandidates:[]))add(joinUrl(provider.baseUrl,fillTemplate(template,{taskId})));
    return out;
  }
  const responseUrl=Core?.extractPollUrl?Core.extractPollUrl(createdRaw):'';add(responseUrl);
  add(joinUrl(provider.baseUrl,matchingPollPath(createPath,taskId,route)));
  for(const template of (Array.isArray(route.pollPathCandidates)?route.pollPathCandidates:[]))add(joinUrl(provider.baseUrl,fillTemplate(template,{taskId})));
  for(const path of [`/v1/tasks/${taskId}`,`/v1/video/tasks/${taskId}`,`/v1/videos/${taskId}`,`/v1/video/generations/${taskId}`,`/v1/videos/generations/${taskId}`,`/api/v1/tasks/${taskId}`,`/api/v1/video/generations/${taskId}`])add(joinUrl(provider.baseUrl,path));
  return out;
}
function freshVideoPollUrl(url,route){const profile=String(route?.protocolProfile||route?.profile||''),family=String(route?.protocolFamily||route?.family||'');if(family!=='agnes-video'&&!profile.startsWith('agnes:'))return String(url);try{const u=new URL(String(url));u.searchParams.set('_canvas_poll',String(Date.now()));return u.toString()}catch{return String(url)}}
async function pollVideoJson(provider,candidates,route){let last=null;for(const url of candidates){const requestUrl=freshVideoPollUrl(url,route);try{return{parsed:await providerJson(provider,requestUrl,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}}),url,requestUrl}}catch(error){last=error;if(![404,405].includes(Number(error?.status)))throw error}}throw last||new Error('没有可用的视频任务轮询接口')}
async function fetchVideoContent(provider,createdRaw,taskId,route,activePollUrl=''){
  const candidates=[],add=value=>{const url=videoResourceCandidate(provider,value);if(url&&!candidates.includes(url))candidates.push(url)};
  const explicit=Core?.firstPath?Core.firstPath(createdRaw,['content_url','contentUrl','download_url','downloadUrl','links.content','links.download']):'';add(explicit);
  for(const template of (Array.isArray(route.contentPathCandidates)?route.contentPathCandidates:[]))add(joinUrl(provider.baseUrl,fillTemplate(template,{taskId})));
  if(route.contentPath)add(joinUrl(provider.baseUrl,fillTemplate(route.contentPath,{taskId})));
  const genericContent=route.protocolFamily==='generic-video'||route.protocolFamily==='sora-openai';
  if(genericContent&&activePollUrl)add(activePollUrl.replace(/\/$/,'')+'/content');
  if(genericContent)for(const path of [`/v1/videos/${taskId}/content`,`/v1/video/generations/${taskId}/content`,`/v1/videos/generations/${taskId}/content`])add(joinUrl(provider.baseUrl,path));
  if(!candidates.length)throw new Error('上游已成功，但该模型协议没有独立内容下载接口；继续从任务状态响应等待结果 URL');
  let last=null;for(const url of candidates){const res=await fetchProviderResource(provider,url,{method:'GET'});if(!res.ok){last=new Error(`结果下载失败 ${res.status}`);if([404,405].includes(res.status))continue;throw last}const parsed=await readResponse(res);return parsed.value}throw last||new Error('任务成功但没有找到视频结果下载接口');
}
function videoRequestDiagnostics(model,task,refs,createPath,transport,route={}){const p=VideoParams?.normalize?.(task.parameters||{})||task.parameters||{};return{createPath,transport,modelId:String(model?.id||''),protocolFamily:route.protocolFamily||'',protocolProfile:route.protocolProfile||'',videoOperation:route.videoOperation||'',duration:Number(p.duration||p.seconds||0),resolution:String(p.resolution||''),aspectRatio:String(p.aspectRatio||p.aspect_ratio||''),size:String(p.size||''),referenceCount:refs.length,hasFirstFrame:refs.some(r=>['first_frame','image','image_reference'].includes(r.role)||r.type==='image')}}
function providerRetryAfterMs(res,detail=''){
  const clamp=ms=>Math.max(1000,Math.min(15*60*1000,Math.round(Number(ms)||0)));
  const header=String(res?.headers?.get?.('retry-after')||'').trim();
  if(header){const seconds=Number(header);if(Number.isFinite(seconds)&&seconds>=0)return clamp(seconds*1000+1000);const at=Date.parse(header);if(Number.isFinite(at))return clamp(Math.max(1000,at-Date.now()+1000))}
  const reset=Number(res?.headers?.get?.('x-ratelimit-reset')||res?.headers?.get?.('ratelimit-reset')||0);if(Number.isFinite(reset)&&reset>0){const ms=reset>1e12?reset-Date.now():reset*1000-Date.now();if(ms>0)return clamp(ms+1000)}
  const m=String(detail||'').match(/per\s+(\d+(?:\.\d+)?)\s*(second|minute|hour)/i);if(m){const n=Number(m[1])||1,unit=m[2].toLowerCase(),factor=unit.startsWith('hour')?3600000:unit.startsWith('minute')?60000:1000;return clamp(n*factor+1000)}
  return 65000;
}
async function providerJson(provider,url,init){const res=await fetchWithAuth(provider,url,init);const parsed=await readResponse(res);if(!res.ok){const detail=runtimeErrorText(parsed.value);const err=new Error(`供应商 HTTP ${res.status}${detail?`：${detail.slice(0,500)}`:''}`);err.status=res.status;err.detail=detail;if(res.status===429)err.retryAfterMs=providerRetryAfterMs(res,detail);throw err}return parsed}

async function discover(provider){
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
        const base={id,name,modality,modalitySource:rawModality?'provider':'inferred',enabled:true,adapterKey:String(raw.adapterKey||raw.adapter_key||'auto'),...(raw.createPath||raw.create_path?{createPath:String(raw.createPath||raw.create_path)}:{}),...(raw.pollPath||raw.poll_path?{pollPath:String(raw.pollPath||raw.poll_path)}:{}),...(raw.contentPath||raw.content_path?{contentPath:String(raw.contentPath||raw.content_path)}:{}),...(raw.taskIdPath||raw.task_id_path?{taskIdPath:String(raw.taskIdPath||raw.task_id_path)}:{}),...(raw.statusPath||raw.status_path?{statusPath:String(raw.statusPath||raw.status_path)}:{}),...(raw.outputPath||raw.output_path?{outputPath:String(raw.outputPath||raw.output_path)}:{}),...(raw.responseMode||raw.response_mode?{responseMode:String(raw.responseMode||raw.response_mode)}:{}),...(raw.operationRoutes?{operationRoutes:clone(raw.operationRoutes)}:{}),...(raw.requestTemplate?{requestTemplate:clone(raw.requestTemplate)}:{}),...(raw.videoProtocolFamily||raw.video_protocol_family?{videoProtocolFamily:String(raw.videoProtocolFamily||raw.video_protocol_family)}:{}),...(raw.videoProtocolConfig||raw.video_protocol_config?{videoProtocolConfig:clone(raw.videoProtocolConfig||raw.video_protocol_config)}:{}),...(raw.owned_by?{ownedBy:String(raw.owned_by)}:{})};
        return ImageCapabilities?.decorateDiscoveredModel?ImageCapabilities.decorateDiscoveredModel({...provider,protocol:resolvedProtocol},raw,base):base;
      }).filter(Boolean);
      const merged={...provider,protocol:resolvedProtocol,models};
      const finalized=Adapters?.finalizeProvider?Adapters.finalizeProvider(merged):merged;
      return{provider:finalized,endpoint:url,models:finalized.models||models,suggestedProtocol};
    }catch(e){last=e.message}
  }
  throw new Error(last||'没有发现可用的模型列表接口');
}
async function testAuth(provider){const result=await discover(provider);return{ok:true,endpoint:result.endpoint,modelCount:result.models.length,protocol:result.provider.protocol||'auto'}}

async function executeTask(task){
  if(task.cancelRequested)return updateTask(task.id,{status:'canceled',error:'已取消'});
  const stored=findProvider(task.providerId),provider={...(task.providerSnapshot||{}),...(stored||{})};
  if(!provider?.baseUrl)throw new Error('供应商 Base URL 不存在');
  if(!String(provider.apiKey||'').trim())throw new Error('供应商 API Key 不存在，请重新保存供应商');
  const model=(provider.models||[]).find(m=>m.id===task.modelId)||task.modelSnapshot;
  if(!model?.id)throw new Error('模型不存在');
  const operation=task.parameters?.operation||'generate';
  const modality=normalizeMod(task.nodeType);
  const route=modality==='video'&&Adapters?.resolveVideoRoute?Adapters.resolveVideoRoute(provider,model,task,task.references||[]):Adapters?.resolveRoute?Adapters.resolveRoute(provider,model,task.nodeType,operation):{createPath:model.createPath,method:model.method||'POST',responseMode:model.responseMode||'sync',outputPath:model.outputPath||''};
  if(!route.createPath)throw new Error('无法自动确定供应商创建接口');
  const recoveredUpstreamTaskId=modality==='video'&&task.providerCreateResponse&&Core?.extractTaskId?String(Core.extractTaskId(task.providerCreateResponse,route)||'').trim():'';
  const existingUpstreamTaskId=modality==='video'?String(recoveredUpstreamTaskId||task.upstreamTaskId||'').trim():'';
  const resumingUpstream=Boolean(existingUpstreamTaskId);
  const refs=resumingUpstream?[]:await makePortableReferences(task.references||[]),body=resumingUpstream?null:defaultRequestBody(provider,model,task,route,refs);
  let portableVideoJsonBodyPromise=null;const videoJsonBody=()=>portableVideoJsonBodyPromise||(portableVideoJsonBodyPromise=portableizeVideoJsonBody(body,route));
  let created=null,usedCreatePath=String(task.upstreamCreatePath||task.videoProtocolDiagnostics?.createPath||route.createPath),lastCreateError=null;
  updateTask(task.id,{status:resumingUpstream?(task.providerStatus==='succeeded'?'result_pending':'polling'):'running',progress:resumingUpstream?Math.max(5,Number(task.progress||5)):2,error:null});
  if(resumingUpstream&&recoveredUpstreamTaskId&&recoveredUpstreamTaskId!==String(task.upstreamTaskId||'')){
    updateTask(task.id,{upstreamTaskId:recoveredUpstreamTaskId,lastError:null,videoProtocolDiagnostics:{...(task.videoProtocolDiagnostics||{}),recoveredTaskId:true,recoveredTaskIdAt:now()}});
  }

  if(!resumingUpstream){
    if(modality==='video')reserveProviderCreateSlot(provider,route);
    const paths=modality==='video'?alternateVideoCreatePaths(route,model):[route.createPath];
    for(const createPath of paths){
      const createUrl=joinUrl(provider.baseUrl,createPath);
      try{
        if(route.adapterKey==='standard-video-async-v1'){
          if(route.requestTransport==='json'){
            updateTask(task.id,{videoRequestDiagnostics:videoRequestDiagnostics(model,task,refs,createPath,'json',route)});
            created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(await videoJsonBody())});
          }else{
            try{
              updateTask(task.id,{videoRequestDiagnostics:videoRequestDiagnostics(model,task,refs,createPath,'multipart',route)});
              const form=await buildStandardVideoForm(model,task,refs);
              created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{},body:form});
            }catch(error){
              if(!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;
              lastCreateError=error;
              updateTask(task.id,{videoRequestDiagnostics:videoRequestDiagnostics(model,task,refs,createPath,'json',route)});
              created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(await videoJsonBody())});
            }
          }
        }else if(modality==='image'&&route.adapterKey==='openai-image'){
          const candidates=imageRequestBodies(provider,model,task,route,refs);let imageError=null;
          for(let bi=0;bi<candidates.length;bi++){
            const candidate=candidates[bi];
            updateTask(task.id,{requestDiagnostics:{...imageRequestDiagnostics(candidate.profile,candidate.body,createPath),selection:candidate.selection||null},capabilityDiagnostics:candidate.capability||null});
            try{created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(candidate.body)});imageError=null;break}
            catch(error){imageError=error;if(bi===candidates.length-1||![400,405,415,422].includes(Number(error?.status)))throw error}
          }
          if(!created&&imageError)throw imageError;
        }else{
          created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(modality==='video'?await videoJsonBody():body)});
        }
        usedCreatePath=createPath;break;
      }catch(error){
        lastCreateError=error;
        if(Number(error?.status)===429&&modality==='video')recordProviderCreateRateLimit(provider,route,error?.retryAfterMs);
        if(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;
      }
    }
    if(!created)throw lastCreateError||new Error('视频创建接口不可用');

    if(route.responseMode!=='async'){
      if(created.kind==='blob'){
        let value=created.value,dimensionInfo=null;
        if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(value,provider,model,task.parameters||{});value=dimensionInfo.value}
        return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,modality),...imageDimensionTaskPatch(dimensionInfo)});
      }
      const raw=created.value,extracted=Core?.extractOutput?Core.extractOutput(raw,route,modality):undefined;
      let value=extracted!==undefined?extracted:(modality==='text'?(raw?.choices?.[0]?.message?.content??raw?.text??raw?.content??JSON.stringify(raw)):raw?.url??raw?.data?.url);
      value=await normalizeGeneratedOutput(value,modality,provider);
      if(modality==='video')value=await materializeGeneratedVideoOutput(value,provider);
      if(modality==='image'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到图片结果字段');
      if(modality==='video'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到视频结果字段');
      let dimensionInfo=null;if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(value,provider,model,task.parameters||{});value=dimensionInfo.value}
      const upstreamSize=modality==='image'?imageResponseSize(raw):'';
      return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,modality),...imageDimensionTaskPatch(dimensionInfo),...(upstreamSize?{upstreamSize}:{})});
    }
  }

  let taskId=existingUpstreamTaskId,pollCandidates=Array.isArray(task.videoProtocolDiagnostics?.pollCandidates)?task.videoProtocolDiagnostics.pollCandidates.filter(Boolean):[],activePollUrl=String(task.videoProtocolDiagnostics?.pollUrl||'');
  if(!resumingUpstream){
    if(created.kind!=='json')throw new Error('异步创建接口没有返回 JSON 任务信息');
    const immediateOutput=modality==='video'&&Core?.extractOutput?Core.extractOutput(created.value,route,'video'):undefined;
    taskId=Core?.extractTaskId?Core.extractTaskId(created.value,route):created.value?.id;
    if(modality==='video'&&immediateOutput&&!taskId){
      let value=await normalizeGeneratedOutput(immediateOutput,'video',provider);
      value=await materializeGeneratedVideoOutput(value,provider);
      return updateTask(task.id,{status:'succeeded',providerStatus:'succeeded',resultStatus:'saved',progress:100,output:outputObject(value,'video'),providerOutput:clone(created.value),providerResultUrl:String(value||''),resultSavedAt:now(),videoProtocolDiagnostics:{createPath:usedCreatePath,mode:'immediate-output'}});
    }
    if(!taskId){const error=new Error('异步接口没有返回任务 ID，也没有返回可用的视频结果；为避免重复扣费不会自动重新提交');error.noRetry=true;throw error}
    if(modality==='video')pollCandidates=videoPollUrlCandidates(provider,created.value,usedCreatePath,taskId,route);
    const providerVideoId=modality==='video'&&Core?.firstPath?Core.firstPath(created.value,['video_id','videoId','data.video_id','data.videoId']):'';
    const providerTaskId=modality==='video'&&Core?.firstPath?Core.firstPath(created.value,['task_id','taskId','data.task_id','data.taskId','id','data.id']):'';
    updateTask(task.id,{status:'polling',providerStatus:'processing',resultStatus:'pending',upstreamTaskId:String(taskId),providerVideoId:providerVideoId==null?'':String(providerVideoId),providerTaskId:providerTaskId==null?'':String(providerTaskId),upstreamCreatePath:usedCreatePath,providerCreateResponse:created.kind==='json'?clone(created.value):null,progress:5,videoProtocolDiagnostics:modality==='video'?{createPath:usedCreatePath,pollCandidates}:undefined});
  }else{
    if(route?.strictPollPath===true){let resumeIdentity=isAgnesVideoRoute(route)?providerVideoIdentity({video_id:task.providerVideoId||'',task_id:task.providerTaskId||task.upstreamTaskId||taskId}):null;if(resumeIdentity?.ambiguousTaskAlias){updateTask(task.id,{providerVideoId:'',providerTaskId:resumeIdentity.taskId,videoProtocolDiagnostics:{...(task.videoProtocolDiagnostics||{}),healedAmbiguousTaskAlias:true,healedAmbiguousTaskAliasAt:now()}})}pollCandidates=videoPollUrlCandidates(provider,resumeIdentity,usedCreatePath,taskId,route);activePollUrl=''}
    else if(!pollCandidates.length)pollCandidates=videoPollUrlCandidates(provider,null,usedCreatePath,taskId,route);
    updateTask(task.id,{status:task.providerStatus==='succeeded'?'result_pending':'polling',providerStatus:task.providerStatus||'processing',resultStatus:task.providerStatus==='succeeded'?'pending':(task.resultStatus||'pending'),upstreamTaskId:String(taskId),upstreamCreatePath:usedCreatePath,videoProtocolDiagnostics:{...(task.videoProtocolDiagnostics||{}),createPath:usedCreatePath,pollCandidates}});
  }

  const started=Date.now();let pollCount=0,retryAttempt=0;
  while(Date.now()-started<Number(route.timeoutMs||1200000)){
    const current=findTask(task.id);if(current?.cancelRequested)return updateTask(task.id,{status:'canceled',error:'已取消'});
    const pollPath=matchingPollPath(usedCreatePath,taskId,route),pollUrl=joinUrl(provider.baseUrl,pollPath);
    const delay=retryAttempt>0?(Core?.nextPollDelay?Core.nextPollDelay(route.pollIntervalMs||1500,retryAttempt):Math.min(30000,(route.pollIntervalMs||1500)*Math.pow(2,retryAttempt))):Math.max(500,Number(route.pollIntervalMs||1500));
    await sleep(delay);
    let polled;
    try{
      if(modality==='video'){
        const ordered=activePollUrl?[activePollUrl,...pollCandidates.filter(x=>x!==activePollUrl)]:pollCandidates;
        const result=await pollVideoJson(provider,ordered.length?ordered:[pollUrl],route);polled=result.parsed;activePollUrl=result.url;
        updateTask(task.id,{lastPollAt:now(),videoProtocolDiagnostics:{createPath:usedCreatePath,pollUrl:activePollUrl,lastPollRequestUrl:result.requestUrl||activePollUrl,pollCandidates}});
      }else polled=await providerJson(provider,pollUrl,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}});
      retryAttempt=0;
    }catch(error){
      const latest=findTask(task.id);
      if(latest?.providerStatus==='succeeded'){
        updateTask(task.id,{status:'result_pending',lastPollAt:now(),lastError:runtimeErrorText(error)||'上游已成功，结果同步暂时失败',error:null});retryAttempt++;continue;
      }
      if(Core?.isRetryableProviderFailure?.(error)){
        updateTask(task.id,{status:'retrying',providerStatus:latest?.providerStatus||'processing',resultStatus:latest?.resultStatus||'pending',lastPollAt:now(),lastError:runtimeErrorText(error)||'上游轮询暂时不可用，将继续重试',error:null});retryAttempt++;continue;
      }
      throw error;
    }
    if(polled.kind!=='json')throw new Error('轮询接口没有返回 JSON');
    pollCount++;
    const assessment=Core?.classifyAsyncPoll?Core.classifyAsyncPoll(polled.value,route,modality):{state:'pending',output:null};
    const pollIdentity=modality==='video'&&isAgnesVideoRoute(route)?providerVideoIdentity(polled.value):null;
    const pollVideoId=pollIdentity?pollIdentity.videoId:(modality==='video'&&Core?.firstPath?Core.firstPath(polled.value,['video_id','videoId','data.video_id','data.videoId']):'');
    const pollTaskId=pollIdentity?pollIdentity.taskId:(modality==='video'&&Core?.firstPath?Core.firstPath(polled.value,['task_id','taskId','data.task_id','data.taskId','id','data.id']):'');
    if(modality==='video'&&isAgnesVideoRoute(route)&&pollVideoId){const upgraded=videoPollUrlCandidates(provider,{video_id:String(pollVideoId),task_id:pollTaskId||findTask(task.id)?.providerTaskId||''},usedCreatePath,String(pollVideoId),route);if(upgraded.length){pollCandidates=[...new Set([...upgraded,...pollCandidates])];activePollUrl=upgraded[0]}}
    updateTask(task.id,{lastPollAt:now(),providerRawStatus:assessment.status||'',providerProgress:assessment.progress==null?null:Number(assessment.progress),...(pollIdentity?.ambiguousTaskAlias?{providerVideoId:'',providerTaskId:String(pollTaskId||'')}:(pollVideoId?{providerVideoId:String(pollVideoId)}:{})),...(!pollIdentity?.ambiguousTaskAlias&&pollTaskId?{providerTaskId:String(pollTaskId)}:{}),progress:assessment.progress==null?Math.min(95,8+pollCount*3):Number(assessment.progress),videoProtocolDiagnostics:{...(findTask(task.id)?.videoProtocolDiagnostics||{}),createPath:usedCreatePath,pollUrl:activePollUrl,pollCandidates,...(pollIdentity?.ambiguousTaskAlias?{healedAmbiguousTaskAlias:true}:{})}});
    if(assessment.state==='retryable'){
      updateTask(task.id,{status:'retrying',providerStatus:'processing',resultStatus:'pending',lastError:Core?.formatFailure?Core.formatFailure(assessment,'上游轮询暂时不可用'):'上游轮询暂时不可用，将继续重试',error:null});retryAttempt++;continue;
    }
    if(assessment.state==='failure'){
      const latest=findTask(task.id);
      if(latest?.providerStatus==='succeeded'){updateTask(task.id,{status:'result_pending',lastError:Core?.formatFailure?Core.formatFailure(assessment):'上游成功后的旧状态响应被忽略',error:null});continue}
      throw new Error(Core?.formatFailure?Core.formatFailure(assessment):'上游任务失败');
    }
    if(assessment.state==='success'){
      const before=findTask(task.id);
      updateTask(task.id,{status:'provider_succeeded',providerStatus:'succeeded',resultStatus:'pending',providerOutput:clone(polled.value),providerSucceededAt:before?.providerSucceededAt||now(),progress:Math.max(99,Number(assessment.progress||0)),lastPollAt:now(),error:null});
      let output=assessment.output,resultError='';
      try{
        if((output==null||output==='')&&modality==='video')output=await fetchVideoContent(provider,polled.value,taskId,route,activePollUrl);
        else if((output==null||output==='')&&route.contentPath){const contentUrl=joinUrl(provider.baseUrl,fillTemplate(route.contentPath,{taskId}));const content=await fetchWithAuth(provider,contentUrl,{method:'GET'});if(!content.ok)throw new Error(`结果下载失败 ${content.status}`);const parsed=await readResponse(content);output=parsed.value}
      }catch(error){resultError=runtimeErrorText(error)||'上游已生成成功，视频结果地址暂未就绪'}
      if(output==null||output===''){
        updateTask(task.id,{status:'result_pending',lastError:resultError||'上游已生成成功，正在等待视频结果地址',error:null,progress:99});continue;
      }
      output=await normalizeGeneratedOutput(output,modality,provider);
      if(modality==='video'){
        try{output=await materializeGeneratedVideoOutput(output,provider)}
        catch(error){updateTask(task.id,{status:'result_pending',providerStatus:'succeeded',resultStatus:'pending',providerResultUrl:String(output||''),lastError:runtimeErrorText(error)||'上游已成功，但视频结果保存到浏览器本地失败，将继续重试',error:null,progress:99});retryAttempt++;continue}
      }
      if(modality==='image'&&!validMediaOutput(output))throw new Error('上游任务已成功，但未识别到图片结果字段');
      if(modality==='video'&&!validMediaOutput(output)){
        updateTask(task.id,{status:'result_pending',lastError:'上游已生成成功，但返回的视频结果地址暂不可识别',error:null,progress:99});continue;
      }
      let dimensionInfo=null;if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(output,provider,model,task.parameters||{});output=dimensionInfo.value}
      return updateTask(task.id,{status:'succeeded',providerStatus:'succeeded',resultStatus:'saved',providerResultUrl:modality==='video'?String(output||''):'',progress:100,output:outputObject(output,modality),resultSavedAt:now(),lastError:null,error:null,...imageDimensionTaskPatch(dimensionInfo)});
    }
  }
  const current=findTask(task.id);
  if(current?.providerStatus==='succeeded'){
    const pending=updateTask(task.id,{status:'result_pending',progress:99,lastError:'上游已生成成功，视频结果仍在同步，将继续自动重试',error:null});
    scheduleTaskResume(task.id,3000);return pending;
  }
  throw new Error('供应商任务轮询超时');
}
async function runTask(task){
  try{
    const result=await executeTask(task);
    if(result?.status==='result_pending')scheduleTaskResume(task.id,3000);
    return result;
  }catch(error){
    const current=findTask(task.id)||task,attempt=Number(current.attempt||0),max=Number(current.maxRetries??1),message=runtimeErrorText(error)||'生成失败',detail=runtimeErrorText(error?.detail);
    const failurePatch={error:message,...(Number.isFinite(Number(error?.status))?{errorStatus:Number(error.status)}:{}),...(detail?{errorDetail:detail}:{})};
    if(current.providerStatus==='succeeded'||['provider_succeeded','result_pending'].includes(current.status)){
      const pending=updateTask(task.id,{status:'result_pending',providerStatus:'succeeded',resultStatus:'pending',lastError:message,error:null,progress:Math.max(99,Number(current.progress||0))});scheduleTaskResume(task.id,3000);return pending;
    }
    if(Number(error?.status)===429&&!error?.noRetry&&!current.cancelRequested){const delay=Math.max(1000,Number(error?.retryAfterMs)||65000),retryAt=new Date(Date.now()+delay).toISOString(),waiting=updateTask(task.id,{status:'retrying',attempt,...failurePatch,error:null,lastError:message,retryReason:'rate_limit',nextRetryAt:retryAt,rateLimitRetryAt:retryAt,rateLimitDelayMs:delay,rateLimitRetryCount:Number(current.rateLimitRetryCount||0)+1});scheduleRateLimitRetry(task.id,delay);return waiting}
    if(!error?.noRetry&&!current.cancelRequested&&attempt<max){updateTask(task.id,{status:'queued',attempt:attempt+1,...failurePatch});pump();return}
    return updateTask(task.id,{status:current.cancelRequested?'canceled':'failed',...failurePatch,progress:current.progress||0});
  }
}
async function pump(){if(runtime.pumping)return;runtime.pumping=true;try{while(true){const q=queueState();if(q.paused||runtime.running>=Math.max(1,Math.min(8,Number(q.concurrency||2))))break;const next=tasks().filter(t=>t.status==='queued'&&!t.cancelRequested).sort((a,b)=>(b.priority||0)-(a.priority||0)||String(a.createdAt).localeCompare(String(b.createdAt)))[0];if(!next)break;runtime.running++;updateTask(next.id,{status:'running'});runTask(next).finally(()=>{runtime.running=Math.max(0,runtime.running-1);pump()})}}finally{runtime.pumping=false}}

function projectSummary(p){return{id:p.id,name:p.name,version:Number(p.version||1),createdAt:p.createdAt,updatedAt:p.updatedAt}}
function projectRoute(path,method,body){
  const parts=path.split('/').filter(Boolean);let list=projects();
  if(parts.length===2&&method==='GET')return json({projects:list.map(projectSummary)});
  if(parts.length===2&&method==='POST'){const p={id:uid('proj_'),name:String(body.name||'未命名画布'),data:clone(body.data||{}),version:1,versions:[],createdAt:now(),updatedAt:now()};p.data.projectId=p.id;p.data.projectName=p.name;p.data.projectUpdatedAt=p.updatedAt;list.unshift(p);saveProjects(list);return json({project:clone(p)});}
  const id=decodeURIComponent(parts[2]||''),i=list.findIndex(p=>p.id===id);if(i<0)return json({error:'画布不存在'},404);let p=list[i];
  if(parts.length===3&&method==='GET')return json({project:clone(p)});
  if(parts.length===3&&method==='PUT'){if(body.forceSnapshot){p.versions=p.versions||[];p.versions.unshift({version:p.version,createdAt:p.updatedAt,data:clone(p.data),name:p.name})}p.version=Number(p.version||1)+(body.forceSnapshot?1:0);p.name=String(body.name||p.name);p.data=clone(body.data||p.data);p.updatedAt=now();p.data.projectId=p.id;p.data.projectName=p.name;p.data.projectUpdatedAt=p.updatedAt;list[i]=p;saveProjects(list);return json({project:clone(p)});}
  if(parts.length===3&&method==='DELETE'){list.splice(i,1);saveProjects(list);return json({ok:true});}
  if(parts[3]==='versions'&&method==='GET')return json({versions:(p.versions||[]).map(v=>({version:v.version,createdAt:v.createdAt}))});
  if(parts[3]==='restore'&&method==='POST'){const v=(p.versions||[]).find(x=>String(x.version)===String(parts[4]));if(!v)return json({error:'版本不存在'},404);p.versions.unshift({version:p.version,createdAt:p.updatedAt,data:clone(p.data),name:p.name});p.version=Number(p.version||1)+1;p.data=clone(v.data);p.name=v.name||p.name;p.updatedAt=now();p.data.projectId=p.id;p.data.projectUpdatedAt=p.updatedAt;list[i]=p;saveProjects(list);return json({project:clone(p)});}
  return json({error:'不支持的项目操作'},405);
}

async function handleApi(info,input,init){
  const path=info.url.pathname,method=info.method,body=parseBody(init);
  if(path==='/api/health')return json({ok:true,service:'canvas-browser-runtime',runtime:'browser-local-preview',persistence:'browser-only',cloudflarePersistence:false});
  if(path==='/api/auth/status')return json({enabled:false,authenticated:true,mode:'browser-local-preview'});
  if(path==='/api/auth/login')return json({ok:true,authenticated:true});
  if(path==='/api/providers'&&method==='GET')return json({providers:providers().map(safeProvider)});
  if(path==='/api/providers'&&method==='POST'){
    const list=providers(),old=list.find(p=>p.id===body.id),merged={...old,...clone(body),id:body.id||old?.id||uid('provider_'),updatedAt:now(),createdAt:old?.createdAt||now()};if(!String(body.apiKey||'').trim()&&old?.apiKey)merged.apiKey=old.apiKey;const final=normalizeProviderRecord(merged),i=list.findIndex(p=>p.id===final.id);if(i>=0)list[i]=final;else list.push(final);await saveProvidersCommitted(list);return json({provider:safeProvider(final)});
  }
  if(path.startsWith('/api/providers/')&&method==='DELETE'&&!['test-config','test-auth','diagnose','discover-models'].some(x=>path.endsWith('/'+x))){const id=decodeURIComponent(path.slice('/api/providers/'.length)),list=providers().filter(p=>p.id!==id);await saveProvidersCommitted(list);return json({ok:true});}
  if(['/api/providers/test-config','/api/providers/test-auth','/api/providers/diagnose','/api/providers/discover-models'].includes(path)&&method==='POST'){
    const existing=body.id?findProvider(body.id):null,provider={...existing,...clone(body)};if(!provider.apiKey&&existing?.apiKey)provider.apiKey=existing.apiKey;
    try{const found=await discover(provider);if(path==='/api/providers/discover-models')return json({ok:true,endpoint:found.endpoint,models:found.models,provider:safeProvider(found.provider),modelCount:found.models.length,protocol:found.provider.protocol||'auto',suggestedProtocol:found.suggestedProtocol||''});return json({ok:true,endpoint:found.endpoint,modelCount:found.models.length,protocol:found.provider.protocol||'auto',suggestedProtocol:found.suggestedProtocol||'',warning:''});}catch(e){return json({error:String(e.message||e)},400)}
  }
  if(path==='/api/tasks'&&method==='GET'){const limit=Math.max(1,Math.min(300,Number(info.url.searchParams.get('limit')||120)));return json({tasks:tasks().slice(0,limit)});}
  if(path==='/api/tasks'&&method==='POST'){const task={id:uid('task_'),status:'queued',providerStatus:'pending',resultStatus:'pending',upstreamTaskId:'',upstreamCreatePath:'',providerOutput:null,providerResultUrl:'',providerSucceededAt:null,resultSavedAt:null,lastPollAt:null,lastError:null,progress:0,providerId:String(body.providerId||''),modelId:String(body.modelId||''),providerSnapshot:clone(body.providerSnapshot||null),modelSnapshot:clone(body.modelSnapshot||null),nodeId:String(body.nodeId||''),nodeType:String(body.nodeType||body.modelSnapshot?.modality||'text'),prompt:String(body.prompt||''),references:clone(body.references||[]),parameters:clone(body.parameters||{}),priority:Number(body.priority??50),attempt:0,maxRetries:Number(body.maxRetries??1),rateLimitRetryCount:0,cancelRequested:false,output:null,error:null,createdAt:now(),updatedAt:now()};upsertTask(task);pump();return json({task:clone(task)});}
  if(path==='/api/queue'&&method==='GET'){const q=queueState(),list=tasks();return json({...q,running:runtime.running,queued:list.filter(t=>t.status==='queued').length});}
  if(path==='/api/queue'&&method==='PUT'){const q=setQueue({paused:Boolean(body.paused),...(body.concurrency!=null?{concurrency:Math.max(1,Math.min(8,Number(body.concurrency)))}:{})});pump();return json(q);}
  if(path.startsWith('/api/tasks/')){const parts=path.split('/').filter(Boolean),id=decodeURIComponent(parts[2]||''),task=findTask(id);if(!task)return json({error:'任务不存在'},404);if(parts[3]==='retry'&&method==='POST'){const t=updateTask(id,{status:'queued',cancelRequested:false,error:null,progress:0});pump();return json({task:t});}if(method==='GET')return json({task});if(method==='PATCH'){const t=updateTask(id,{...(body.priority!=null?{priority:Number(body.priority)}:{})});return json({task:t});}if(method==='DELETE'){const t=updateTask(id,{cancelRequested:true,status:['queued'].includes(task.status)?'canceled':'cancelling'});return json({task:t});}}
  if(path.startsWith('/api/projects'))return projectRoute(path,method,body);
  if(path==='/api/upload'&&method==='POST'){
    let blob=init.body;if(!(blob instanceof Blob)){try{blob=await new Response(init.body).blob()}catch{return json({error:'无法读取浏览器本地素材'},400)}}try{const stored=await storeMediaBlob(blob,{name:info.url.searchParams.get('name')||''});return json({ok:true,url:stored.url,mediaId:stored.id,browserLocal:true,persistent:true,size:stored.size,type:stored.type,name:info.url.searchParams.get('name')||''})}catch(error){return json({error:String(error.message||error)},503)};
  }
  if(path==='/api/media/process')return json({error:'在线预览不把媒体上传到 Cloudflare；FFmpeg / ImageMagick 本地处理将在 Windows 正式版运行'},501);
  if(path.startsWith('/api/blender/bridge/'))return json({error:'Blender Bridge 属于本地桌面能力，在线预览不通过 Cloudflare 保存或转发场景状态'},501);
  if(path==='/api/autolink')return json({matches:[]});
  return null;
}

// IndexedDB is the source of truth. Existing localStorage stores are migrated once.
runtime.ready=initializePersistence();
runtime.ready.then(()=>{
  const list=tasks();let changed=false;
  for(const t of list){
    if(t.status==='cancelling'){t.status='canceled';t.error='已取消';t.updatedAt=now();changed=true;continue}
    if(t.status==='retrying'&&t.retryReason==='rate_limit'&&!t.upstreamTaskId){const due=Date.parse(t.nextRetryAt||t.rateLimitRetryAt||''),delay=Number.isFinite(due)?Math.max(1000,due-Date.now()):65000;scheduleRateLimitRetry(t.id,delay);continue}
    if(['provider_succeeded','result_pending','running','polling','fallback','retrying'].includes(t.status)&&t.upstreamTaskId){t.status='queued';t.error=null;t.lastError=null;t.updatedAt=now();changed=true;continue}
    if(['running','polling','fallback'].includes(t.status)&&!t.upstreamTaskId){t.status='failed';t.error='页面刷新发生在上游任务 ID 持久化之前；为避免重复生成和重复扣费不会自动重新提交，请重新创建任务。';t.lastError=t.error;t.updatedAt=now();changed=true;continue}
  }
  if(changed)saveTasks(list);pump();
}).catch(error=>console.error('[browser-runtime] initialization failed',error));

window.fetch=async function canvasBrowserRuntimeFetch(input,init={}){
  const info=requestInfo(input,init);if(!info||info.url.origin!==location.origin||!info.url.pathname.startsWith('/api/'))return rawFetch(input,init);
  await runtime.ready;
  const handled=await handleApi(info,input,init);
  if(handled){await runtime.persistChain;return handled}
  return rawFetch(input,init);
};

globalThis.CanvasBrowserRuntime=Object.freeze({mode:'browser-indexeddb-preview',storage:'indexeddb',cloudflarePersistence:false,ready:runtime.ready,getProviders:()=>providers().map(safeProvider),getProjects:()=>projects().map(projectSummary),getTasks:()=>clone(tasks()),getStorageEstimate:async()=>navigator.storage?.estimate?.()||{},deleteMedia:async id=>idbDelete(STORES.media,id),rawFetch});
})();
