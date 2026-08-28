from pathlib import Path
import json, re

root = Path('_read_123_zip_20260821_180410')

manager = r'''/* Fuiet Infinite Canvas · Browser Storage Manager
 * Single browser persistence facade for UI/workspace settings.
 * IndexedDB is the source of truth. localStorage is read only during one-time migration.
 */
(()=>{
'use strict';
if(typeof window==='undefined'||!('indexedDB'in window))return;

const DB_NAME='fuiet-infinite-canvas-browser';
const DB_VERSION=1;
const STORE='settings';
const PREFIX='ui:';
const LEGACY_PREFIXES=['canvas-studio-','libtv-','fuiet-'];
const IGNORED_KEYS=new Set([
  'canvas-studio-providers-v1',
  'fuiet-browser-providers-v1','fuiet-browser-projects-v1','fuiet-browser-tasks-v1','fuiet-browser-queue-v1'
]);
const rawLocalStorage=window.localStorage;
const cache=new Map();
const pending=new Map();
let db=null,flushTimer=0,flushChain=Promise.resolve();

function reqP(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IndexedDB 请求失败'))})}
function txP(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('IndexedDB 事务中止'));tx.onerror=()=>reject(tx.error||new Error('IndexedDB 事务失败'))})}
function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('无法打开浏览器数据库'));req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'key'})}})}
function logicalKey(rowKey){return String(rowKey||'').startsWith(PREFIX)?String(rowKey).slice(PREFIX.length):''}
function dbKey(key){return PREFIX+String(key)}
function shouldMigrate(key){return LEGACY_PREFIXES.some(prefix=>String(key).startsWith(prefix))}
function categoryFor(key){key=String(key);if(key==='libtv-clone-state')return'workspace';if(key.includes('clipboard'))return'clipboard';if(key.includes('agent'))return'agent';if(key.includes('toolbox'))return'toolbox';if(key.includes('image-'))return'image-ui';if(key.includes('workspace'))return'workspace';return'ui-setting'}
function ignored(key){return IGNORED_KEYS.has(String(key))}

async function getAllSettings(){const tx=db.transaction(STORE,'readonly'),rows=await reqP(tx.objectStore(STORE).getAll());await txP(tx);return rows||[]}
async function writeBatch(entries){if(!entries.length)return;const tx=db.transaction(STORE,'readwrite'),os=tx.objectStore(STORE);for(const [key,value] of entries)os.put({key:dbKey(key),value:String(value),category:categoryFor(key),updatedAt:new Date().toISOString()});await txP(tx)}
async function deleteKey(key){const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(dbKey(key));await txP(tx)}

function flush(){
  clearTimeout(flushTimer);flushTimer=0;
  const entries=[...pending.entries()];pending.clear();
  if(!entries.length)return flushChain;
  flushChain=flushChain.then(()=>writeBatch(entries)).catch(error=>{for(const entry of entries)pending.set(...entry);console.error('[BrowserStorageManager] flush failed',error);throw error});
  return flushChain;
}
function scheduleFlush(key){clearTimeout(flushTimer);const delay=String(key)==='libtv-clone-state'?120:35;flushTimer=setTimeout(()=>{flush().catch(()=>{})},delay)}
function getItem(key){key=String(key);if(ignored(key))return null;return cache.has(key)?cache.get(key):null}
function setItem(key,value){key=String(key);if(ignored(key))return;const text=String(value);cache.set(key,text);pending.set(key,text);scheduleFlush(key)}
function removeItem(key){key=String(key);cache.delete(key);pending.delete(key);flushChain=flushChain.then(()=>deleteKey(key)).catch(error=>console.error('[BrowserStorageManager] delete failed',error))}
function getJSON(key,fallback=null){try{const value=getItem(key);return value==null?fallback:JSON.parse(value)}catch{return fallback}}
function setJSON(key,value){setItem(key,JSON.stringify(value));return value}
function keys(){return [...cache.keys()]}
async function clearAppSettings(){cache.clear();pending.clear();const tx=db.transaction(STORE,'readwrite'),os=tx.objectStore(STORE),rows=await reqP(os.getAllKeys());for(const key of rows)if(String(key).startsWith(PREFIX))os.delete(key);await txP(tx)}
async function diagnostics(){const estimate=await navigator.storage?.estimate?.()||{};return{storage:'indexeddb',database:DB_NAME,store:STORE,settings:cache.size,usage:estimate.usage||0,quota:estimate.quota||0,cloudflarePersistence:false}}

async function initialize(){
  await globalThis.CanvasBrowserRuntime?.ready;
  db=await openDb();
  for(const row of await getAllSettings()){const key=logicalKey(row?.key);if(key)cache.set(key,String(row?.value??''))}
  const legacy=[];
  try{for(let i=0;i<rawLocalStorage.length;i++){const key=rawLocalStorage.key(i);if(key)legacy.push(key)}}catch{}
  for(const key of legacy){
    if(ignored(key)){try{rawLocalStorage.removeItem(key)}catch{};continue}
    if(!shouldMigrate(key))continue;
    try{
      const value=rawLocalStorage.getItem(key);
      if(value!=null&&!cache.has(key)){cache.set(key,value);pending.set(key,value)}
      rawLocalStorage.removeItem(key);
    }catch{}
  }
  if(pending.size)await flush();
  try{navigator.storage?.persist?.().catch(()=>{})}catch{}
  return true;
}

const ready=initialize();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush().catch(()=>{})});
window.addEventListener('pagehide',()=>{flush().catch(()=>{})});

globalThis.CanvasBrowserStorageManager=Object.freeze({
  version:1,storage:'indexeddb',cloudflarePersistence:false,ready,
  getItem,setItem,removeItem,getJSON,setJSON,keys,flush,clearAppSettings,diagnostics,
  get length(){return cache.size},
  key(index){return keys()[Number(index)]??null}
});
})();
'''

bootstrap = r'''/* Fuiet Infinite Canvas · Browser bootstrap
 * Starts application/UI scripts only after IndexedDB storage hydration completes.
 */
(()=>{
'use strict';
const manager=globalThis.CanvasBrowserStorageManager;
if(!manager?.ready)throw new Error('Browser Storage Manager 未加载');
const v='20260828-storage-manager-1';
const canvasScripts=[
  `./provider-auto-config-v1.js?v=${v}`,
  `./app.js?v=${v}`,
  `./security-client.js?v=${v}`,
  `./ui-zh.js?v=${v}`,
  `./ui-v2.js?v=${v}`,
  `./ui-v23.js?v=${v}`,
  `./ui-connect-v23.js?v=${v}`,
  `./bottom-dock-v3.js?v=${v}`,
  `./bottom-dock-v4.js?v=${v}`,
  `./bottom-left-minimap-v1.js?v=${v}`,
  `./bottom-left-edge-toggle-v1.js?v=${v}`,
  {src:`./node-send-icon-v1.js?v=${v}`,attrs:{'data-node-send-icon':'1'}},
  `./text-node-doubleclick-v1.js?v=${v}`,
  `./image-generator-v2.js?v=${v}`
];
const modelScripts=[`./provider-auto-config-v1.js?v=${v}`,`./models.js?v=${v}`,`./ui-zh.js?v=${v}`];
function loadScript(spec){return new Promise((resolve,reject)=>{const cfg=typeof spec==='string'?{src:spec}:spec,s=document.createElement('script');s.src=cfg.src;s.async=false;for(const [k,v] of Object.entries(cfg.attrs||{}))s.setAttribute(k,v);s.onload=()=>resolve();s.onerror=()=>reject(new Error(`脚本加载失败：${cfg.src}`));document.body.appendChild(s)})}
async function start(){await manager.ready;const list=document.querySelector('#canvasViewport')?canvasScripts:document.querySelector('#modelList')?modelScripts:[];for(const script of list)await loadScript(script);document.documentElement.dataset.browserStorageReady='1'}
start().catch(error=>{console.error('[browser-bootstrap]',error);const toast=document.querySelector('#toast');if(toast){toast.textContent='浏览器本地存储初始化失败：'+String(error.message||error);toast.classList.remove('hidden')}});
})();
'''

(root/'browser-storage-manager.js').write_text(manager,encoding='utf-8')
(root/'browser-bootstrap.js').write_text(bootstrap,encoding='utf-8')

# Replace all remaining direct browser Web Storage access in application/UI code.
target_names=[
  'app.js','models.js','bottom-dock-v3.js','bottom-dock-v4.js','bottom-left-edge-toggle-v1.js',
  'bottom-left-grid-snap-v1.js','bottom-left-minimap-v1.js','provider-auto-config-v1.js','image-generator-v2.js','dist/models.js'
]
for name in target_names:
    path=root/name
    if not path.exists():
        continue
    text=path.read_text(encoding='utf-8')
    text=text.replace('localStorage','globalThis.CanvasBrowserStorageManager')
    text=text.replace('sessionStorage','globalThis.CanvasBrowserStorageManager')
    path.write_text(text,encoding='utf-8')

# Route page startup through the manager/bootstrap so sync UI reads happen after hydration.
index=root/'index.html'
text=index.read_text(encoding='utf-8')
start=text.find('  <script src="./provider-auto-config-v1.js')
end=text.find('</body>',start)
if start<0 or end<0: raise SystemExit('index runtime script block not found')
replacement='  <script src="./browser-storage-manager.js?v=20260828-storage-manager-1"></script>\n  <script src="./browser-bootstrap.js?v=20260828-storage-manager-1"></script>\n'
text=text[:start]+replacement+text[end:]
index.write_text(text,encoding='utf-8')

models=root/'models.html'
text=models.read_text(encoding='utf-8')
start=text.find('  <script src="./provider-auto-config-v1.js')
end=text.find('</body>',start)
if start<0 or end<0: raise SystemExit('models runtime script block not found')
text=text[:start]+replacement+text[end:]
models.write_text(text,encoding='utf-8')

# Update architecture regression test for bootstrap-based startup.
test_path=root/'tests'/'browser-local-runtime.test.mjs'
text=test_path.read_text(encoding='utf-8')
old="test('provider core executes before application UI',()=>{for(const html of [index,models]){const a=html.indexOf('provider-adapter-contract.js'),c=html.indexOf('provider-runtime-core.js'),b=html.indexOf('browser-runtime.js');assert.ok(a>=0&&c>a&&b>c)}assert.ok(index.indexOf('app.js')>index.indexOf('browser-runtime.js'));assert.ok(models.indexOf('models.js')>models.indexOf('browser-runtime.js'))});"
new="test('provider core and storage manager execute before bootstrapped application UI',()=>{for(const html of [index,models]){const a=html.indexOf('provider-adapter-contract.js'),c=html.indexOf('provider-runtime-core.js'),b=html.indexOf('browser-runtime.js'),s=html.indexOf('browser-storage-manager.js'),boot=html.indexOf('browser-bootstrap.js');assert.ok(a>=0&&c>a&&b>c&&s>b&&boot>s)}assert.doesNotMatch(index,/src=\\\"\\.\\/app\\.js/);assert.doesNotMatch(models,/src=\\\"\\.\\/models\\.js/)});"
if old not in text: raise SystemExit('browser runtime startup test pattern missing')
test_path.write_text(text.replace(old,new),encoding='utf-8')

storage_test = r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manager=fs.readFileSync(path.join(ROOT,'browser-storage-manager.js'),'utf8');
const bootstrap=fs.readFileSync(path.join(ROOT,'browser-bootstrap.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const models=fs.readFileSync(path.join(ROOT,'models.html'),'utf8');
const appFiles=['app.js','models.js','bottom-dock-v3.js','bottom-dock-v4.js','bottom-left-edge-toggle-v1.js','bottom-left-grid-snap-v1.js','bottom-left-minimap-v1.js','provider-auto-config-v1.js','image-generator-v2.js','dist/models.js'];
test('Browser Storage Manager is the single UI persistence facade',()=>{assert.match(manager,/DB_NAME='fuiet-infinite-canvas-browser'/);assert.match(manager,/STORE='settings'/);assert.match(manager,/PREFIX='ui:'/);assert.match(manager,/getItem,setItem,removeItem,getJSON,setJSON/);assert.match(manager,/cloudflarePersistence:false/)});
test('legacy app localStorage is migrated once and removed',()=>{assert.match(manager,/rawLocalStorage=window\.localStorage/);assert.match(manager,/LEGACY_PREFIXES/);assert.match(manager,/rawLocalStorage\.removeItem/);assert.match(manager,/IGNORED_KEYS/);assert.match(manager,/canvas-studio-providers-v1/)});
test('application and UI layers no longer access Web Storage directly',()=>{for(const name of appFiles){const src=fs.readFileSync(path.join(ROOT,name),'utf8');assert.doesNotMatch(src,/\blocalStorage\b|\bsessionStorage\b/,name)}});
test('bootstrap waits for storage hydration before app and model scripts',()=>{assert.match(bootstrap,/await manager\.ready/);assert.match(bootstrap,/app\.js/);assert.match(bootstrap,/models\.js/);for(const html of [index,models]){assert.match(html,/browser-storage-manager\.js/);assert.match(html,/browser-bootstrap\.js/);assert.ok(html.indexOf('browser-storage-manager.js')<html.indexOf('browser-bootstrap.js'))}});
test('high-frequency workspace snapshot writes are batched',()=>{assert.match(manager,/libtv-clone-state/);assert.match(manager,/pending=new Map/);assert.match(manager,/scheduleFlush/);assert.match(manager,/delay=.*120/)});
'''
(root/'tests'/'browser-storage-manager.test.mjs').write_text(storage_test,encoding='utf-8')

pkg_path=root/'package.json'
pkg=json.loads(pkg_path.read_text(encoding='utf-8'))
pkg['version']='4.7.0'
pkg['description']='Fuiet Infinite Canvas 在线开发预览版：统一 Browser Storage Manager + IndexedDB 持久化/媒体 + 加密 Provider Key + Cloudflare 无状态代理。'
check=pkg['scripts']['check']
check=check.replace('node --check browser-runtime.js &&','node --check browser-runtime.js && node --check browser-storage-manager.js && node --check browser-bootstrap.js &&')
pkg['scripts']['check']=check
pkg_path.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

arch=root/'PREVIEW_ARCHITECTURE.md'
text=arch.read_text(encoding='utf-8')
text += '''\n## Browser Storage Manager\n\n`browser-storage-manager.js` is the only persistence facade used by canvas/model/UI code. It hydrates the IndexedDB `settings` store before `browser-bootstrap.js` starts application scripts, migrates legacy app-owned Web Storage keys once, removes the old copies, batches frequent canvas snapshot writes, and exposes synchronous cache-backed `getItem/setItem` compatibility plus JSON/diagnostic helpers. Provider configuration is not duplicated into this settings layer; provider data remains in the dedicated encrypted IndexedDB provider store owned by Browser Runtime.\n'''
arch.write_text(text,encoding='utf-8')
