import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
await import('../provider-runtime-core.js');
const C=globalThis.CanvasProviderRuntimeCore;

test('shared nested mapper rewrites local media strings anywhere in a JSON body',async()=>{
  const input={image_url:'/local/a',nested:{references:[{url:'/local/b'}]},keep:'https://cdn.example/x'};
  const out=await C.mapNestedStrings(input,async s=>s.startsWith('/local/')?'data:image/png;base64,AAAA':s);
  assert.equal(out.image_url,'data:image/png;base64,AAAA');
  assert.equal(out.nested.references[0].url,'data:image/png;base64,AAAA');
  assert.equal(out.keep,'https://cdn.example/x');
});

test('browser preview video JSON request portableizes local media outside task.references too',()=>{
  const source=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
  assert.match(source,/function browserLocalMediaReference\(value\)/);
  assert.match(source,/async function portableizeVideoJsonBody\(body,route=\{\}\)/);
  assert.match(source,/browserLocalMediaReference\(value\)/);
  assert.match(source,/JSON\.stringify\(await videoJsonBody\(\)\)/);
  assert.match(source,/JSON\.stringify\(modality==='video'\?await videoJsonBody\(\):body\)/);
});

test('desktop runtime has a dedicated reference-media transport before provider submission',()=>{
  const transport=fs.readFileSync(new URL('../desktop-reference-media-transport.cjs',import.meta.url),'utf8');
  const electron=fs.readFileSync(new URL('../electron-main.cjs',import.meta.url),'utf8');
  assert.match(transport,/function effectiveTransport\(provider = \{\}, model = \{\}\)/);
  assert.match(transport,/function localMediaFileFromValue\(value, mediaDir\)/);
  assert.match(transport,/async function uploadReference/);
  assert.match(transport,/function createReferenceAwareFetch/);
  assert.match(electron,/installDesktopReferenceMediaTransport/);
  assert.ok(electron.indexOf('installDesktopReferenceMediaTransport')<electron.indexOf("require('./server.js')"));
});

test('explicit URL transport refuses unreachable local media instead of leaking it upstream',()=>{
  const desktop=fs.readFileSync(new URL('../desktop-reference-media-transport.cjs',import.meta.url),'utf8');
  const browser=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
  assert.match(desktop,/if \(transport === 'url'\)/);
  assert.match(desktop,/要求公网 URL 参考素材/);
  assert.match(browser,/transport==='url'/);
  assert.match(browser,/transport==='upload'/);
});
