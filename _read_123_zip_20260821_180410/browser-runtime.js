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
const base=document.currentScript?.src||location.href;
const imageCapsSrc=new URL('./model-image-capabilities.js?v=20260902-public-upstream-media-1',base).href;
const scriptTag=src=>`<script src="${src.replace(/"/g,'&quot;')}"><\/script>`;

// model-image-capabilities.js is also present earlier in index.html. Reload it with
// the current contract version here so a stale browser/CDN cache can never leave
// the runtime using the old mapper that silently dropped connected reference images.
if(localDesktopHost){
  document.write(scriptTag(imageCapsSrc));
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
// document.write is intentional here: this router itself is parser-blocking. The
// refreshed image mapper must execute before preview captures CanvasModelImageCapabilities.
const previewSrc=new URL('./browser-runtime-preview.js?v=20260902-xogpu-create-fallback-1',base).href;
document.write(scriptTag(imageCapsSrc)+scriptTag(previewSrc));
})();
