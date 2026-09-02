/* Fuiet Infinite Canvas runtime router.
 *
 * Cloudflare/browser preview loads browser-runtime-preview.js (IndexedDB + in-page
 * /api emulation). Electron serves the same HTML from 127.0.0.1, but must NOT
 * start that preview emulator: desktop /api calls belong to the bundled Node
 * server so persistent tasks, local files, provider adapters and reference-media
 * transport all run in one backend.
 */
(()=>{
'use strict';
if(typeof window==='undefined'||typeof window.fetch!=='function')return;
const rawFetch=window.fetch.bind(window);
const host=String(location.hostname||'').toLowerCase();
const localDesktopHost=['127.0.0.1','localhost','::1'].includes(host);

if(localDesktopHost){
  globalThis.CanvasBrowserRuntime=Object.freeze({
    mode:'desktop-pass-through',
    storage:'node-server',
    cloudflarePersistence:false,
    ready:Promise.resolve(true),
    rawFetch
  });
  return;
}

// Preserve the full IndexedDB browser-preview implementation in a separate file.
// document.write is intentional here: this router itself is parser-blocking, so
// the preview runtime must execute before browser-storage-manager/bootstrap.
const base=document.currentScript?.src||location.href;
const src=new URL('./browser-runtime-preview.js?v=20260902-desktop-runtime-router-1',base).href;
document.write(`<script src="${src.replace(/"/g,'&quot;')}"><\/script>`);
})();
