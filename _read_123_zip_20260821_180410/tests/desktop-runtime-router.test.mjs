import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const electron=fs.readFileSync(new URL('../electron-main.cjs',import.meta.url),'utf8');

test('desktop bootstrap probes local Node health using browser runtime raw fetch',()=>{
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

test('browser preview emulator still exposes its raw fetch for desktop handoff',()=>{
  assert.match(runtime,/CanvasBrowserRuntime=Object\.freeze\(\{mode:'browser-indexeddb-preview'/);
  assert.match(runtime,/rawFetch\}\);/);
});
