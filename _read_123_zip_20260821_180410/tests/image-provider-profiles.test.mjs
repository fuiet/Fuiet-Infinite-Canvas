import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const resolver=fs.readFileSync(new URL('../model-image-capabilities.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('image runtime delegates model-specific request dialects to the shared resolver',()=>{
  assert.match(runtime,/CanvasModelImageCapabilities/);
  assert.match(runtime,/ImageCapabilities\.mapRequest/);
  assert.match(resolver,/siliconflow-image-size/);
  assert.match(resolver,/seedream-size/);
  assert.match(resolver,/width-height/);
  assert.doesNotMatch(runtime,/function imageProviderProfile/);
});

test('image task records model capability, selected dimensions and upstream returned size',()=>{
  assert.match(runtime,/requestDiagnostics:\{\.\.\.imageRequestDiagnostics/);
  assert.match(runtime,/capabilityDiagnostics/);
  assert.match(runtime,/selection:candidate\.selection/);
  assert.match(runtime,/upstreamSize/);
  assert.match(runtime,/data\.0\.size/);
});

test('model capability resolver, output validator and image runtime are cache busted together',()=>{
  assert.match(index,/image-request-parameters\.js\?v=20260828-image-dimension-contract-1/);
  assert.match(index,/model-image-capabilities\.js\?v=20260828-image-dimension-contract-1/);
  assert.match(index,/image-output-dimensions\.js\?v=20260828-image-dimension-contract-1/);
  assert.match(index,/browser-runtime\.js\?v=20260828-image-dimension-contract-1/);
});
