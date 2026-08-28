import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('image runtime uses provider-specific request profiles instead of mixed aliases',()=>{
  assert.match(runtime,/function imageProviderProfile/);
  assert.match(runtime,/siliconflow/);
  assert.match(runtime,/seedream/);
  assert.match(runtime,/image_size:p\.size/);
  assert.match(runtime,/size:p\.size,sequential_image_generation:'disabled'/);
  assert.match(runtime,/width:Number\(p\.width\),height:Number\(p\.height\)/);
});

test('image task records exact upstream request profile and returned size',()=>{
  assert.match(runtime,/requestDiagnostics:imageRequestDiagnostics/);
  assert.match(runtime,/upstreamSize/);
  assert.match(runtime,/data\.0\.size/);
});

test('image protocol runtime is cache busted',()=>{
  assert.match(index,/image-request-parameters\.js\?v=20260828-image-profiles-3/);
  assert.match(index,/browser-runtime\.js\?v=20260828-image-profiles-3/);
});
