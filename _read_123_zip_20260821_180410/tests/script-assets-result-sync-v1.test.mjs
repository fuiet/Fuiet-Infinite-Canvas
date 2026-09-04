import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sync=fs.readFileSync(new URL('../script-assets-result-sync-v1.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('generated canvas image can be rebound into Prepare Assets',()=>{
  assert.match(sync,/function candidateFor\(name\)/);
  assert.match(sync,/drawerAssetCanvas/);
  assert.match(sync,/drawerAssetBindCanvas/);
  assert.match(sync,/bind\.click\(\)/);
  assert.match(sync,/generatedResultRecovered/);
});

test('asset result sync runs for canvas result mutations and asset page rerenders',()=>{
  assert.match(sync,/MutationObserver\(\(\)=>schedule\(180\)\)/);
  assert.match(sync,/observe\(nodeLayer/);
  assert.match(sync,/observe\(featureModal/);
});

test('result sync bundle is loaded with fresh cache version',()=>{
  assert.match(bootstrap,/20260904-script-assets-result-sync-1/);
  assert.match(bootstrap,/script-assets-result-sync-v1\.js\?v=\$\{v\}/);
  assert.match(index,/browser-bootstrap\.js\?v=20260904-script-assets-result-sync-1/);
});
