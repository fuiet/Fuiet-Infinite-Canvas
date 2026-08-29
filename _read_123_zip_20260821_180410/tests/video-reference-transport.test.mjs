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

test('browser video JSON request portableizes local media outside task.references too',()=>{
  const source=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  assert.match(source,/function browserLocalMediaReference\(value\)/);
  assert.match(source,/async function portableizeVideoJsonBody\(body,route=\{\}\)/);
  assert.match(source,/browserLocalMediaReference\(value\)/);
  assert.match(source,/JSON\.stringify\(await videoJsonBody\(\)\)/);
  assert.match(source,/JSON\.stringify\(modality==='video'\?await videoJsonBody\(\):body\)/);
});

test('desktop video JSON request converts loopback media paths before upstream submission',()=>{
  const source=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.match(source,/function localVideoMediaReference\(value\)/);
  assert.match(source,/async function portableizeLocalVideoJsonBody\(body,config=\{\}\)/);
  assert.match(source,/const body=await portableizeLocalVideoJsonBody\(rawBody,config\)/);
  assert.match(source,/return 'data:'\+localMediaMime\(file\)\+';base64,'/);
});

test('explicit public-url or upload transport refuses unreachable local media instead of sending it',()=>{
  const browser=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  for(const source of [browser,server]){assert.match(source,/transport==='url'/);assert.match(source,/transport==='upload'/)}
});
