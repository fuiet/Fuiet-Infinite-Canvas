/* Fuiet Infinite Canvas · Browser bootstrap
 * Starts application/UI scripts only after IndexedDB storage hydration completes.
 */
(()=>{
'use strict';
const manager=globalThis.CanvasBrowserStorageManager;
if(!manager?.ready)throw new Error('Browser Storage Manager 未加载');
const v='20260829-agnes-fixed-adapter-1';
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
  `./image-generator-v2.js?v=${v}`,
  `./image-ratio-picker-v1.js?v=${v}`
];
const modelScripts=[`./provider-auto-config-v1.js?v=${v}`,`./models.js?v=${v}`,`./ui-zh.js?v=${v}`];
function loadScript(spec){return new Promise((resolve,reject)=>{const cfg=typeof spec==='string'?{src:spec}:spec,s=document.createElement('script');s.src=cfg.src;s.async=false;for(const [k,v] of Object.entries(cfg.attrs||{}))s.setAttribute(k,v);s.onload=()=>resolve();s.onerror=()=>reject(new Error(`脚本加载失败：${cfg.src}`));document.body.appendChild(s)})}
function loadStyle(href){return new Promise((resolve,reject)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.onload=()=>resolve();l.onerror=()=>reject(new Error(`样式加载失败：${href}`));document.head.appendChild(l)})}
async function start(){await Promise.all([manager.ready,globalThis.CanvasBrowserRuntime?.ready||Promise.resolve()]);const isCanvas=Boolean(document.querySelector('#canvasViewport'));if(isCanvas)await loadStyle(`./styles/image-result-autofit-v1.css?v=${v}`);const list=isCanvas?canvasScripts:document.querySelector('#modelList')?modelScripts:[];for(const script of list)await loadScript(script);document.documentElement.dataset.browserStorageReady='1'}
start().catch(error=>{console.error('[browser-bootstrap]',error);const toast=document.querySelector('#toast');if(toast){toast.textContent='浏览器本地存储初始化失败：'+String(error.message||error);toast.classList.remove('hidden')}});
})();
