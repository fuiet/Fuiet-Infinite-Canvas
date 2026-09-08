/* Fuiet Infinite Canvas · Browser/Desktop bootstrap
 * Browser preview hydrates IndexedDB first. Electron/local desktop probes the
 * bundled Node server and restores native fetch so /api/* is handled by the
 * persistent desktop runtime instead of the browser preview emulator.
 */
(()=>{
'use strict';
const manager=globalThis.CanvasBrowserStorageManager;
if(!manager?.ready)throw new Error('Browser Storage Manager 未加载');
// Keep the shared runtime cache key stable. Feature-only revisions must not
// invalidate unrelated provider/media/runtime assets.
const v='20260907-script-asset-node-layout-1';
const promptV='20260907-final-prompt-asset-source-5';
const batchInputV='20260907-universal-upstream-inputs-1';
const durationV='20260907-shot-duration-compact-1';
const shotEditorV='20260907-shot-editor-inline-mentions-3';
const dialogueV='20260907-shot-dialogue-reference-1';
const promptWorkbenchV='20260908-final-prompt-workbench-layout-2';
const scriptTypographyV='20260908-confirm-shot-rail-unified-2';
const sendIconV='20260907-unified-send-icon-v2-1';
const canvasScripts=[
  `./provider-auto-config-v1.js?v=${v}`,
  `./script-workflow-core.js?v=${promptV}`,
  `./script-node-skill-pack-v1.js?v=${v}`,
  `./script-inline-asset-refs-v1.js?v=${v}`,
  `./image-node-display-normalizer-v1.js?v=${v}`,
  `./script-asset-node-layout-v1.js?v=${v}`,
  `./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&refs=generator-reference-strip-1&scriptclick=toolbar-3&scriptgen=panel-4&shotdesc=reference-1&resultimagegen=1&imageStudio=removed-1`,
  `./script-shot-description-editor-highlight-v1.js?v=${shotEditorV}`,
  `./script-prompt-asset-source-v1.js?v=${promptV}`,
  `./script-final-prompt-v2.js?v=${promptV}`,
  `./script-final-prompt-rich-v1.js?v=${promptV}`,
  `./script-final-prompt-workbench-v4.js?v=${promptWorkbenchV}`,
  `./script-prompt-provenance-v1.js?v=${batchInputV}`,
  `./upstream-generation-inputs-v1.js?v=${batchInputV}`,
  `./script-generator-reference-preview-v1.js?v=${batchInputV}`,
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
  {src:`./node-send-icon-v1.js?v=${sendIconV}`,attrs:{'data-node-send-icon':'2'}},
  `./text-node-doubleclick-v1.js?v=${v}`,
  `./image-generator-v2.js?v=${v}`,
  `./image-ratio-picker-v1.js?v=${v}`,
  `./script-asset-picker-modal-v1.js?v=${v}`,
  `./script-assets-reference-v1.js?v=${v}`,
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
      loadStyle(`./styles/script-shot-description-reference-v1.css?v=${v}`),
      loadStyle(`./styles/script-shot-description-editor-highlight-v1.css?v=${shotEditorV}`),
      loadStyle(`./styles/script-shot-dialogue-reference-v1.css?v=${dialogueV}`),
      loadStyle(`./styles/script-shot-duration-compact-v1.css?v=${durationV}`),
      loadStyle(`./styles/script-assets-reference-v1.css?v=${v}`),
      loadStyle(`./styles/script-asset-picker-modal-v1.css?v=${v}`),
      loadStyle(`./styles/script-assets-layout-fix-v2.css?v=${v}`),
      loadStyle(`./styles/script-final-prompt-v2.css?v=${promptV}`),
      loadStyle(`./styles/script-final-prompt-workbench-v4.css?v=${promptWorkbenchV}`),
      loadStyle(`./styles/script-final-prompt-layout-v5.css?v=${promptWorkbenchV}`),
      loadStyle(`./styles/script-prompt-provenance-v1.css?v=${batchInputV}`),
      loadStyle(`./styles/script-generator-reference-preview-v1.css?v=${batchInputV}`),
      loadStyle(`./styles/script-node-progress-v1.css?v=${v}&scriptclick=toolbar-3&scriptbar=large-1`),
      loadStyle(`./styles/edge-reference-cards-v1.css?v=${v}&ui=generator-reference-strip-1`),
      loadStyle(`./styles/video-generator-reference-layout-fix-v1.css?v=${v}`),
      loadStyle(`./styles/edge-cut-interaction-v1.css?v=${v}`),
      loadStyle(`./styles/agent-left-v2.css?v=${v}`),
      loadStyle(`./styles/agent-panel-top-v1.css?v=${v}`),
      loadStyle(`./styles/script-studio-typography-unified-v1.css?v=${scriptTypographyV}`)
    ]);
  }
  const list=isCanvas?canvasScripts:document.querySelector('#modelList')?modelScripts:[];
  for(const script of list)await loadScript(script);
  document.documentElement.dataset.browserStorageReady='1';
}
start().catch(error=>{console.error('[browser-bootstrap]',error);const toast=document.querySelector('#toast');if(toast){toast.textContent='运行环境初始化失败：'+String(error.message||error);toast.classList.remove('hidden')}});
})();
