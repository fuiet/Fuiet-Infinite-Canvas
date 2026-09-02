/* Fuiet Infinite Canvas · media service worker controller recovery.
 * Ensures the IndexedDB media service worker actively claims the current page
 * before generator actions depend on /__browser_media/* URLs.
 */
(()=>{
'use strict';

async function waitForController(timeout=4500){
  if(navigator.serviceWorker?.controller)return true;
  return await new Promise(resolve=>{
    let done=false;
    const finish=value=>{if(done)return;done=true;clearTimeout(timer);navigator.serviceWorker?.removeEventListener?.('controllerchange',onChange);resolve(Boolean(value))};
    const onChange=()=>finish(Boolean(navigator.serviceWorker?.controller));
    const timer=setTimeout(()=>finish(Boolean(navigator.serviceWorker?.controller)),timeout);
    navigator.serviceWorker?.addEventListener?.('controllerchange',onChange);
  });
}

async function ensureController(){
  if(!('serviceWorker' in navigator)){
    console.warn('[media-controller] Service Worker unavailable in this browser context');
    return false;
  }
  try{
    const scriptUrl=new URL('./browser-media-sw.js?v=20260902-reference-transport-3',document.baseURI);
    const scopeUrl=new URL('./',document.baseURI);
    const registration=await navigator.serviceWorker.register(scriptUrl.href,{scope:scopeUrl.pathname,updateViaCache:'none'});
    try{await registration.update()}catch(error){console.warn('[media-controller] service worker update failed',error)}

    if(registration.waiting){
      try{registration.waiting.postMessage({type:'SKIP_WAITING_AND_CLAIM'})}catch{}
    }
    if(registration.active){
      try{registration.active.postMessage({type:'CLAIM_CLIENTS'})}catch{}
    }

    if(await waitForController(2200))return true;

    const ready=await Promise.race([
      navigator.serviceWorker.ready,
      new Promise(resolve=>setTimeout(()=>resolve(null),1800))
    ]);
    if(ready?.active){
      try{ready.active.postMessage({type:'CLAIM_CLIENTS'})}catch{}
    }
    return await waitForController(2200);
  }catch(error){
    console.warn('[media-controller] unable to establish controller',error);
    return false;
  }
}

globalThis.CanvasMediaControllerReady=ensureController();
})();
