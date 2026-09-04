/* Fuiet Infinite Canvas · Browser/Desktop bootstrap
 * Browser preview hydrates IndexedDB first. Electron/local desktop probes the
 * bundled Node server and restores native fetch so /api/* is handled by the
 * persistent desktop runtime instead of the browser preview emulator.
 */
(()=>{
'use strict';
const manager=globalThis.CanvasBrowserStorageManager;
if(!manager?.ready)throw new Error('Browser Storage Manager 未加载');
const v='20260904-script-asset-picker-modal-3';
const canvasScripts=[
  `./provider-auto-config-v1.js?v=${v}`,
  `./script-workflow-core.js?v=${v}`,
  `./script-node-skill-pack-v1.js?v=${v}`,
  `./script-inline-asset-refs-v1.js?v=${v}`,
  `./image-node-display-normalizer-v1.js?v=${v}`,
  `./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&refs=generator-reference-strip-1&scriptclick=toolbar-3&scriptgen=panel-4`,
  `./upstream-generation-inputs-v1.js?v=${v}`,
  `./reference-popover-portal-v1.js?v=${v}`,
  `./video-hover-player-v1.js?v=${v}&audio=default-on-1`,
  `./security-client.js?v=${v}`,
  `./ui-zh.js?v=${v}`,
  `./ui-v2.js?v=${v}&fix=text-controls-stable-1`,
  `./ui-v23.js?v=${v}`,
  `./ui-connect-v23.js?v=${v}`,
  `./edge-cut-interaction-v1.js?v=${v}`,
  `./bottom-dock-v3.js?v=${v}`,
  `./bottom-dock-v4.js?v=${v}`,
  `./bottom-left-minimap-v1.js?v=${v}`,
  `./bottom-left-edge-toggle-v1.js?v=${v}`,
  {src:`./node-send-icon-v1.js?v=${v}`,attrs:{'data-node-send-icon':'1'}},
  `./text-node-doubleclick-v1.js?v=${v}`,
  `./image-generator-v2.js?v=${v}`,
  `./image-ratio-picker-v1.js?v=${v}`,
  `./script-assets-reference-v1.js?v=${v}`,
  `./script-asset-picker-modal-v1.js?v=${v}`,
  `./script-assets-media-visibility-v1.js?v=${v}`,
  `./script-assets-result-sync-v1.js?v=${v}`,
  `./agent-left-v2.js?v=${v}`
];
const modelScripts=[`./provider-auto-config-v1.js?v=${v}`,`./models.js?v=${v}`,`./ui-zh.js?v=${v}`];
function loadScript(spec){return new Promise((resolve,reject)=>{const cfg=typeof spec==='string'?{src:spec}:spec,s=document.createElement('script');s.src=cfg.src;s.async=false;for(const [k,v] of Object.entries(cfg.attrs||{}))s.setAttribute(k,v);s.onload=()=>resolve();s.onerror=()=>reject(new Error(`脚本加载失败：${cfg.src}`));document.body.appendChild(s)})}
function loadStyle(href){return new Promise((resolve,reject)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.onload=()=>resolve();l.onerror=()=>reject(new Error(`样式加载失败：${href}`));document.head.appendChild(l)})}
async function detectDesktopServer(){
  const browserRuntime=globalThis.CanvasBrowserRuntime;
  const rawFetch=browserRuntime?.rawFetch;
  if(typeof rawFetch!=='function')return false;
  const host=String(location.hostname||'').toLowerCase();
  if(!['127.0.0.1','localhost','::1'].includes(host))return false;
  try{
    const res=await rawFetch('/api/health',{headers:{accept:'application/json'},cache:'no-store'});
    if(!res.ok)return false;
    const data=await res.json().catch(()=>null);
    if(!data?.ok)return false;
    if(String(data.runtime||'').toLowerCase()==='browser-local-preview')return false;
    window.fetch=rawFetch;
    globalThis.CanvasExecutionRuntime=Object.freeze({mode:'desktop-local-server',health:data});
    document.documentElement.dataset.executionRuntime='desktop';
    return true;
  }catch(error){
    console.warn('[browser-bootstrap] desktop server probe failed; keeping browser preview runtime',error);
    return false;
  }
}
async function start(){
  await Promise.all([manager.ready,globalThis.CanvasBrowserRuntime?.ready||Promise.resolve()]);
  const desktop=await detectDesktopServer();
  const isCanvas=Boolean(document.querySelector('#canvasViewport'));
  if(isCanvas){
    if(!desktop){
      await loadScript(`./browser-media-controller-v2.js?v=${v}`);
      try{await globalThis.CanvasMediaControllerReady}catch(error){console.warn('[browser-bootstrap] media controller recovery failed',error)}
    }
    await Promise.all([
      loadStyle(`./styles/image-result-autofit-v1.css?v=${v}`),
      loadStyle(`./styles/video-result-autofit-v1.css?v=${v}`),
      loadStyle(`./styles/script-workflow-v2.css?v=${v}`),
      loadStyle(`./styles/script-editor-simplified-v1.css?v=${v}`),
      loadStyle(`./styles/script-assets-reference-v1.css?v=${v}`),
      loadStyle(`./styles/script-asset-picker-modal-v1.css?v=${v}`),
      loadStyle(`./styles/script-assets-layout-fix-v2.css?v=${v}`),
      loadStyle(`./styles/script-node-progress-v1.css?v=${v}&scriptclick=toolbar-3&scriptbar=large-1`),
      loadStyle(`./styles/edge-reference-cards-v1.css?v=${v}&ui=generator-reference-strip-1`),
      loadStyle(`./styles/video-generator-reference-layout-fix-v1.css?v=${v}`),
      loadStyle(`./styles/edge-cut-interaction-v1.css?v=${v}`),
      loadStyle(`./styles/agent-left-v2.css?v=${v}`),
      loadStyle(`./styles/agent-panel-top-v1.css?v=${v}`)
    ]);
  }
  const list=isCanvas?canvasScripts:document.querySelector('#modelList')?modelScripts:[];
  for(const script of list)await loadScript(script);
  document.documentElement.dataset.browserStorageReady='1';
}
start().catch(error=>{console.error('[browser-bootstrap]',error);const toast=document.querySelector('#toast');if(toast){toast.textContent='运行环境初始化失败：'+String(error.message||error);toast.classList.remove('hidden')}});
})();