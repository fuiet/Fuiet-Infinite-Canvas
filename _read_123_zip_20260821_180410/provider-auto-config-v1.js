/* Fuiet provider auto configuration v1
 * Zero-config provider/model normalization for the browser.
 * Runs before app.js/models.js and keeps the existing runtime/UI logic untouched.
 */
(()=>{
'use strict';
const Contract=globalThis.CanvasProviderAdapters;
if(!Contract?.finalizeProvider||typeof window.fetch!=='function')return;

const rawFetch=window.fetch.bind(window);
const STORAGE_KEY='canvas-studio-providers-v1';
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));

function finalize(provider){
  try{return Contract.finalizeProvider(provider||{})}
  catch{return clone(provider||{})}
}
function stable(value){
  try{return JSON.stringify(value)}catch{return''}
}
function sanitizeForSave(provider){
  const out=clone(provider||{});
  delete out.apiKey;
  delete out.apiKeyEncrypted;
  delete out.hasApiKey;
  return out;
}
function rewriteResponse(response,data){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type','application/json; charset=utf-8');
  return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
}
function requestInfo(input,init={}){
  try{
    const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.href);
    const method=String(init.method||(input instanceof Request?input.method:'GET')||'GET').toUpperCase();
    return{url,method};
  }catch{return null}
}
function parseInitBody(init){
  if(typeof init?.body!=='string')return null;
  try{return JSON.parse(init.body)}catch{return null}
}
async function persistFinalizedProviders(providers,credentials='same-origin'){
  for(const provider of providers){
    if(!provider?.id||!provider?.baseUrl)continue;
    const res=await rawFetch('/api/providers',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials,
      body:JSON.stringify(sanitizeForSave(provider))
    });
    if(!res.ok){
      const data=await res.json().catch(()=>({}));
      throw new Error(data.error||`自动配置保存失败 HTTP ${res.status}`);
    }
  }
}
function upgradeLocalCache(){
  try{
    const list=JSON.parse(globalThis.CanvasBrowserStorageManager.getItem(STORAGE_KEY)||'[]');
    if(!Array.isArray(list)||!list.length)return;
    const next=list.map(finalize);
    if(stable(next)!==stable(list))globalThis.CanvasBrowserStorageManager.setItem(STORAGE_KEY,JSON.stringify(next));
  }catch{}
}

window.fetch=async function providerAutoConfiguredFetch(input,init={}){
  const info=requestInfo(input,init);
  if(!info||info.url.origin!==location.origin)return rawFetch(input,init);
  const {pathname}=info.url;
  let actualInput=input,actualInit=init;

  // Any model saved through the UI is materialized into an executable adapter
  // before it reaches the server. Existing explicit custom routes are preserved.
  if(pathname==='/api/providers'&&info.method==='POST'){
    const body=parseInitBody(init);
    if(body&&typeof body==='object'){
      actualInit={...init,body:JSON.stringify(finalize(body))};
    }
  }

  const response=await rawFetch(actualInput,actualInit);
  if(pathname!=='/api/providers'||info.method!=='GET'||!response.ok)return response;

  const data=await response.clone().json().catch(()=>null);
  if(!data||!Array.isArray(data.providers))return response;
  const finalized=data.providers.map(finalize);
  const changed=finalized.filter((provider,index)=>stable(provider)!==stable(data.providers[index]));

  // Heal providers/models imported by older builds before the application starts
  // using them. Saving without apiKey preserves the server-side encrypted key.
  if(changed.length){
    try{
      const credentials=init?.credentials||(input instanceof Request?input.credentials:'same-origin')||'same-origin';
      await persistFinalizedProviders(changed,credentials);
    }catch(error){
      console.warn('[provider-auto-config] automatic persistence failed',error);
    }
  }
  return rewriteResponse(response,{...data,providers:finalized});
};

upgradeLocalCache();
globalThis.CanvasProviderAutoConfig=Object.freeze({finalizeProvider:finalize,upgradeLocalCache});
})();
