import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const preview=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
const electron=fs.readFileSync(new URL('../electron-main.cjs',import.meta.url),'utf8');

test('desktop runtime router never starts the browser preview task emulator',()=>{
  assert.match(router,/localDesktopHost/);
  assert.match(router,/mode:'desktop-pass-through'/);
  assert.match(router,/storage:'node-server'/);
  assert.match(router,/return;[\s\S]*browser-runtime-preview\.js/);
});

test('browser preview runtime remains isolated in its own file',()=>{
  assert.match(preview,/mode:'browser-indexeddb-preview'/);
  assert.match(preview,/window\.fetch=async function canvasBrowserRuntimeFetch/);
  assert.match(preview,/rawFetch\}\);/);
});

test('desktop bootstrap confirms local Node health before loading application scripts',()=>{
  assert.match(bootstrap,/async function detectDesktopServer\(\)/);
  assert.match(bootstrap,/browserRuntime\?\.rawFetch/);
  assert.match(bootstrap,/rawFetch\('\/api\/health'/);
  assert.match(bootstrap,/window\.fetch=rawFetch/);
  assert.match(bootstrap,/dataset\.executionRuntime='desktop'/);
});

test('desktop mode does not depend on browser media service worker',()=>{
  assert.match(bootstrap,/if\(!desktop\)\{/);
  assert.match(bootstrap,/browser-media-controller-v2\.js/);
  assert.match(electron,/CANVAS_DESKTOP = '1'/);
  assert.match(electron,/CANVAS_RUNTIME = 'local'/);
});
