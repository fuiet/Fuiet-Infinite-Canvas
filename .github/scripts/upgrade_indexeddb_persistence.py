from pathlib import Path
import re
import json

ROOT = Path('_read_123_zip_20260821_180410')
RUNTIME = ROOT / 'browser-runtime.js'

storage_block = r'''const LEGACY_KEYS={
  providers:'fuiet-browser-providers-v1',
  projects:'fuiet-browser-projects-v1',
  tasks:'fuiet-browser-tasks-v1',
  queue:'fuiet-browser-queue-v1'
};
const DB_NAME='fuiet-infinite-canvas-browser';
const DB_VERSION=1;
const STORES={providers:'providers',projects:'projects',tasks:'tasks',media:'media',settings:'settings',meta:'meta'};
const cache={providers:[],projects:[],tasks:[],queue:{paused:false,concurrency:2}};
const runtime={running:0,pumping:false,controllers:new Map(),objectUrls:new Set(),persistChain:Promise.resolve(),db:null,ready:null,swReady:null};
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
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
function saveProviders(list){cache.providers=clone(Array.isArray(list)?list:[]);enqueuePersist(persistProvidersNow);return cache.providers}
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
    await navigator.serviceWorker.register('./browser-media-sw.js?v=20260828-idb-1',{scope:'./'});
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
  if(!projectRows.length){cache.projects=legacyRead(LEGACY_KEYS.projects,[]);if(cache.projects.length)await idbReplaceAll(STORES.projects,cache.projects)}else cache.projects=projectRows;
  if(!taskRows.length){cache.tasks=legacyRead(LEGACY_KEYS.tasks,[]).slice(0,300);if(cache.tasks.length)await idbReplaceAll(STORES.tasks,cache.tasks)}else cache.tasks=taskRows.slice(0,300);
  cache.queue={paused:false,concurrency:2,...(queueRow?.value||legacyRead(LEGACY_KEYS.queue,{}))};
  if(!queueRow)await idbPut(STORES.settings,{key:'queue',value:cache.queue,updatedAt:now()});
  for(const key of Object.values(LEGACY_KEYS)){try{localStorage.removeItem(key)}catch{}}
  try{navigator.storage?.persist?.().catch(()=>{})}catch{}
  runtime.swReady=ensureMediaServiceWorker();
  return true;
}
function findProvider(id){return providers().find(p=>String(p.id)===String(id))||null}'''

text = RUNTIME.read_text(encoding='utf-8')
pattern = r"const KEYS=\{.*?function findProvider\(id\)\{return providers\(\)\.find\(p=>String\(p\.id\)===String\(id\)\)\|\|null\}"
text, count = re.subn(pattern, storage_block, text, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'failed to replace browser storage block: {count}')

old_read = "async function readResponse(res){const ct=String(res.headers.get('content-type')||'').toLowerCase();if(ct.includes('application/json')||ct.includes('+json'))return{kind:'json',value:await res.json()};if(ct.startsWith('text/'))return{kind:'text',value:await res.text()};const blob=await res.blob(),url=URL.createObjectURL(blob);runtime.objectUrls.add(url);return{kind:'blob',value:url,blob,type:ct}}"
new_read = "async function readResponse(res){const ct=String(res.headers.get('content-type')||'').toLowerCase();if(ct.includes('application/json')||ct.includes('+json'))return{kind:'json',value:await res.json()};if(ct.startsWith('text/'))return{kind:'text',value:await res.text()};const blob=await res.blob(),stored=await storeMediaBlob(blob,{name:'provider-output'});return{kind:'blob',value:stored.url,blob,type:ct,mediaId:stored.id,persistent:true}}"
if old_read not in text:
    raise SystemExit('readResponse anchor missing')
text = text.replace(old_read, new_read, 1)

old_upload = "let blob=init.body;if(!(blob instanceof Blob)){try{blob=await new Response(init.body).blob()}catch{return json({error:'无法读取浏览器本地素材'},400)}}const url=URL.createObjectURL(blob);runtime.objectUrls.add(url);return json({ok:true,url,browserLocal:true,size:blob.size,type:blob.type,name:info.url.searchParams.get('name')||''});"
new_upload = "let blob=init.body;if(!(blob instanceof Blob)){try{blob=await new Response(init.body).blob()}catch{return json({error:'无法读取浏览器本地素材'},400)}}try{const stored=await storeMediaBlob(blob,{name:info.url.searchParams.get('name')||''});return json({ok:true,url:stored.url,mediaId:stored.id,browserLocal:true,persistent:true,size:stored.size,type:stored.type,name:info.url.searchParams.get('name')||''})}catch(error){return json({error:String(error.message||error)},503)};"
if old_upload not in text:
    raise SystemExit('upload anchor missing')
text = text.replace(old_upload, new_upload, 1)

old_init = "// Tasks left in an executing state after a reload have lost their in-memory polling loop.\n(()=>{const list=tasks();let changed=false;for(const t of list){if(['running','polling','retrying','cancelling'].includes(t.status)){t.status='failed';t.error='页面刷新中断了浏览器本地任务，请重新生成';t.updatedAt=now();changed=true}}if(changed)saveTasks(list)})();\n\nwindow.fetch=async function canvasBrowserRuntimeFetch(input,init={}){\n  const info=requestInfo(input,init);if(!info||info.url.origin!==location.origin||!info.url.pathname.startsWith('/api/'))return rawFetch(input,init);\n  const handled=await handleApi(info,input,init);return handled||rawFetch(input,init);\n};\n\nglobalThis.CanvasBrowserRuntime=Object.freeze({mode:'browser-local-preview',cloudflarePersistence:false,getProviders:()=>providers().map(safeProvider),getProjects:()=>projects().map(projectSummary),getTasks:()=>tasks(),rawFetch});"
new_init = "// IndexedDB is the source of truth. Existing localStorage stores are migrated once.\nruntime.ready=initializePersistence();\nruntime.ready.then(()=>{const list=tasks();let changed=false;for(const t of list){if(['running','polling','retrying','cancelling'].includes(t.status)){t.status='failed';t.error='页面刷新中断了浏览器本地任务，请重新生成';t.updatedAt=now();changed=true}}if(changed)saveTasks(list);pump()}).catch(error=>console.error('[browser-runtime] initialization failed',error));\n\nwindow.fetch=async function canvasBrowserRuntimeFetch(input,init={}){\n  const info=requestInfo(input,init);if(!info||info.url.origin!==location.origin||!info.url.pathname.startsWith('/api/'))return rawFetch(input,init);\n  await runtime.ready;\n  const handled=await handleApi(info,input,init);\n  if(handled){await runtime.persistChain;return handled}\n  return rawFetch(input,init);\n};\n\nglobalThis.CanvasBrowserRuntime=Object.freeze({mode:'browser-indexeddb-preview',storage:'indexeddb',cloudflarePersistence:false,ready:runtime.ready,getProviders:()=>providers().map(safeProvider),getProjects:()=>projects().map(projectSummary),getTasks:()=>clone(tasks()),getStorageEstimate:async()=>navigator.storage?.estimate?.()||{},deleteMedia:async id=>idbDelete(STORES.media,id),rawFetch});"
if old_init not in text:
    raise SystemExit('runtime initialization anchor missing')
text = text.replace(old_init, new_init, 1)
RUNTIME.write_text(text, encoding='utf-8')

sw = ROOT / 'browser-media-sw.js'
sw.write_text(r'''/* IndexedDB-backed local media transport for the online preview. */
'use strict';
const DB_NAME='fuiet-infinite-canvas-browser';
const DB_VERSION=1;
const MEDIA_STORE='media';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('providers'))db.createObjectStore('providers',{keyPath:'id'});if(!db.objectStoreNames.contains('projects'))db.createObjectStore('projects',{keyPath:'id'});if(!db.objectStoreNames.contains('tasks'))db.createObjectStore('tasks',{keyPath:'id'});if(!db.objectStoreNames.contains('media'))db.createObjectStore('media',{keyPath:'id'});if(!db.objectStoreNames.contains('settings'))db.createObjectStore('settings',{keyPath:'key'});if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'key'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function getMedia(id){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(MEDIA_STORE,'readonly'),req=tx.objectStore(MEDIA_STORE).get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)})}
function rangeResponse(blob,request,type){const header=request.headers.get('range');if(!header)return new Response(blob,{status:200,headers:{'content-type':type,'content-length':String(blob.size),'accept-ranges':'bytes','cache-control':'no-store'}});const match=/bytes=(\d*)-(\d*)/.exec(header);if(!match)return new Response(null,{status:416,headers:{'content-range':`bytes */${blob.size}`}});let start=match[1]?Number(match[1]):0,end=match[2]?Number(match[2]):blob.size-1;if(!match[1]&&match[2]){const suffix=Math.min(blob.size,Number(match[2]));start=blob.size-suffix;end=blob.size-1}if(blob.size===0)return new Response(blob,{status:200,headers:{'content-type':type,'content-length':'0','accept-ranges':'bytes','cache-control':'no-store'}});start=Math.max(0,Math.min(start,blob.size-1));end=Math.max(start,Math.min(end,blob.size-1));const part=blob.slice(start,end+1,type);return new Response(part,{status:206,headers:{'content-type':type,'content-length':String(part.size),'content-range':`bytes ${start}-${end}/${blob.size}`,'accept-ranges':'bytes','cache-control':'no-store'}})}
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.origin!==self.location.origin||!url.pathname.startsWith('/__browser_media/'))return;event.respondWith((async()=>{try{const id=decodeURIComponent(url.pathname.slice('/__browser_media/'.length)),row=await getMedia(id);if(!row?.blob)return new Response('Media not found',{status:404,headers:{'cache-control':'no-store'}});return rangeResponse(row.blob,event.request,row.type||row.blob.type||'application/octet-stream')}catch(error){return new Response('IndexedDB media read failed',{status:500,headers:{'cache-control':'no-store'}})}})())});
''', encoding='utf-8')

test = ROOT / 'tests' / 'browser-local-runtime.test.mjs'
t = test.read_text(encoding='utf-8')
old_test = "test('preview persistence belongs to browser runtime',()=>{assert.match(runtime,/fuiet-browser-providers-v1/);assert.match(runtime,/fuiet-browser-projects-v1/);assert.match(runtime,/fuiet-browser-tasks-v1/);assert.match(runtime,/localStorage\\.setItem/);assert.match(runtime,/cloudflarePersistence:false/)});"
new_test = "test('preview persistence belongs to IndexedDB browser runtime',()=>{assert.match(runtime,/indexedDB\\.open/);assert.match(runtime,/STORES=\\{providers:'providers',projects:'projects',tasks:'tasks',media:'media'/);assert.match(runtime,/browser-indexeddb-preview/);assert.match(runtime,/cloudflarePersistence:false/);assert.match(runtime,/localStorage\\.removeItem/)});"
if old_test not in t:
    raise SystemExit('old browser persistence test missing')
test.write_text(t.replace(old_test, new_test, 1), encoding='utf-8')

idx_test = ROOT / 'tests' / 'indexeddb-persistence.test.mjs'
idx_test.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=fs.readFileSync(path.join(ROOT,'browser-runtime.js'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'browser-media-sw.js'),'utf8');
test('provider project task queue and media use IndexedDB stores',()=>{for(const name of ['providers','projects','tasks','media','settings','meta'])assert.match(runtime,new RegExp(`'${name}'`));assert.match(runtime,/idbReplaceAll/);assert.match(runtime,/idbPut/)});
test('legacy browser localStorage is migrated then removed',()=>{assert.match(runtime,/LEGACY_KEYS/);assert.match(runtime,/legacyRead/);assert.match(runtime,/localStorage\.removeItem/)});
test('provider API keys are encrypted before IndexedDB persistence',()=>{assert.match(runtime,/AES-GCM/);assert.match(runtime,/crypto\.subtle\.encrypt/);assert.match(runtime,/apiKeyEncrypted/);assert.match(runtime,/delete out\.apiKey/)});
test('uploaded and binary provider media are stored as IndexedDB blobs',()=>{assert.match(runtime,/storeMediaBlob\(blob/);assert.match(runtime,/\/__browser_media\//);assert.match(runtime,/persistent:true/)});
test('service worker serves IndexedDB media and supports range requests',()=>{assert.match(sw,/indexedDB\.open/);assert.match(sw,/\/__browser_media\//);assert.match(sw,/status:206/);assert.match(sw,/content-range/);assert.match(sw,/accept-ranges/);assert.match(sw,/clients\.claim/)});
''', encoding='utf-8')

doc = ROOT / 'PREVIEW_ARCHITECTURE.md'
d = doc.read_text(encoding='utf-8') if doc.exists() else ''
d += '''\n## IndexedDB persistence\n\nBrowser preview persistence uses IndexedDB as the primary store for providers, projects, tasks, queue settings and media blobs. Legacy browser-runtime localStorage records are imported once and removed. Provider API keys are encrypted with a non-extractable AES-GCM WebCrypto key stored in IndexedDB. Uploaded media is stored as Blob data in IndexedDB and served through a same-origin Service Worker route (`/__browser_media/<id>`), including byte-range responses for video/audio seeking. Cloudflare stores none of this data.\n'''
doc.write_text(d, encoding='utf-8')

pkg_path = ROOT / 'package.json'
pkg = json.loads(pkg_path.read_text(encoding='utf-8'))
pkg['version'] = '4.6.0'
pkg['description'] = 'Fuiet Infinite Canvas 在线开发预览版：IndexedDB 本地持久化 + 加密 Provider Key + IndexedDB 媒体 Blob + Cloudflare 无状态代理。'
if 'browser-media-sw.js' not in pkg['scripts']['check']:
    pkg['scripts']['check'] = pkg['scripts']['check'].replace('node --check browser-runtime.js', 'node --check browser-runtime.js && node --check browser-media-sw.js')
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
