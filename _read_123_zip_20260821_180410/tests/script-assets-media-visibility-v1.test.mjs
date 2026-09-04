import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bridge=fs.readFileSync(new URL('../script-assets-media-visibility-v1.js',import.meta.url),'utf8');
const referenceCss=fs.readFileSync(new URL('../styles/script-assets-reference-v1.css',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('reference CSS empty-state shorthand can override inline asset media',()=>{
  assert.match(referenceCss,/\.asset-preview\{[\s\S]*background:#0e1012 center\/cover no-repeat!important/);
  assert.match(referenceCss,/\.script-asset-hero\{[\s\S]*background:#2a2b2c center\/cover no-repeat!important/);
});

test('media visibility bridge promotes persisted inline URLs above the shorthand',()=>{
  assert.match(bridge,/function promoteBackground\(el\)/);
  assert.match(bridge,/getPropertyValue\('background-image'\)/);
  assert.match(bridge,/setProperty\('background-image',image,'important'\)/);
  assert.match(bridge,/setProperty\('background-size','cover','important'\)/);
  assert.match(bridge,/\.script-asset-card \.asset-preview/);
  assert.match(bridge,/\.script-asset-hero/);
});

test('media visibility bridge is loaded before legacy canvas-result recovery',()=>{
  assert.match(bootstrap,/script-assets-reference-v1\.js\?v=\$\{v\}[\s\S]*script-assets-media-visibility-v1\.js\?v=\$\{v\}[\s\S]*script-assets-result-sync-v1\.js\?v=\$\{v\}/);
});