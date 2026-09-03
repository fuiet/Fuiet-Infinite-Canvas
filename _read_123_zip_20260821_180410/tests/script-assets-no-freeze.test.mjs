import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const adapter=fs.readFileSync(new URL('../script-assets-reference-v1.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('prepare-assets patch disconnects its MutationObserver while mutating the observed subtree',()=>{
  assert.match(adapter,/observer\?\.disconnect\(\)/);
  assert.match(adapter,/finally\s*\{\s*observeFeatureModal\(\);\s*\}/);
  assert.match(adapter,/observer=new MutationObserver\(queuePatch\)/);
});

test('prepare-assets text writes are idempotent instead of replacing text nodes forever',()=>{
  assert.match(adapter,/function setText\(el,text\)\{if\(el&&el\.textContent!==text\)el\.textContent=text\}/);
  assert.match(adapter,/setText\(bulkButton,/);
  assert.match(adapter,/setText\(warning,text\)/);
});

test('freeze fix is cache-busted all the way from index to the asset adapter',()=>{
  assert.match(index,/browser-bootstrap\.js\?v=20260903-script-assets-freeze-fix-1/);
  assert.match(bootstrap,/const v='20260903-script-assets-freeze-fix-1'/);
  assert.match(bootstrap,/script-assets-reference-v1\.js\?v=\$\{v\}/);
});
