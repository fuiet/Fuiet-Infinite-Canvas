/* Fuiet Infinite Canvas · Browser Storage Manager
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
