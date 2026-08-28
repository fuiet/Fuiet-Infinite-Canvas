import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../provider-adapter-contract.js';

const Contract=globalThis.CanvasProviderAdapters;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');

test('model modality inference repairs legacy /v1/models text defaults',()=>{
  assert.equal(Contract.normalizeModelModality('text',{id:'gpt-image-2',name:'gpt-image-2'}),'image');
  assert.equal(Contract.normalizeModelModality('',{id:'flux-1.1-pro',name:'flux-1.1-pro'}),'image');
  assert.equal(Contract.normalizeModelModality('text',{id:'sora-2',name:'sora-2'}),'video');
  assert.equal(Contract.normalizeModelModality('',{id:'tts-1-hd',name:'tts-1-hd'}),'audio');
  assert.equal(Contract.normalizeModelModality('',{id:'gpt-5.6',name:'gpt-5.6'}),'text');
});

test('explicit user modality always wins over model-name inference',()=>{
  assert.equal(Contract.normalizeModelModality('text',{id:'gpt-image-2',modalitySource:'user'}),'text');
  assert.equal(Contract.normalizeModelModality('image',{id:'sora-2',modalitySource:'user'}),'image');
});

test('legacy wrongly-typed image model becomes an executable image-node model',()=>{
  const p=Contract.finalizeProvider({baseUrl:'https://api.example.com/v1',protocol:'auto',models:[{id:'gpt-image-2',name:'gpt-image-2',modality:'text',enabled:true,adapterKey:'auto'}]});
  assert.equal(p.models[0].modality,'image');
  assert.equal(p.models[0].adapterKey,'openai-image');
  assert.equal(p.models[0].adapterResolved.ready,true);
});

test('browser discovery does not default every untyped model to text and returns protocol suggestion',()=>{
  const src=read('browser-runtime.js');
  assert.match(src,/normalizeModelModality\?Adapters\.normalizeModelModality/);
  assert.match(src,/modalitySource:rawModality\?'provider':'inferred'/);
  assert.match(src,/suggestedProtocol/);
  assert.doesNotMatch(src,/modality:String\(x\?\.modality\|\|x\?\.type\|\|'text'\)/);
});

test('provider save is durably committed before API success is returned',()=>{
  const src=read('browser-runtime.js');
  assert.match(src,/async function saveProvidersCommitted/);
  assert.match(src,/await persistProvidersNow\(\)/);
  assert.match(src,/await saveProvidersCommitted\(list\);return json\(\{provider:/);
});

test('manual model type selections are marked as user-owned',()=>{
  assert.match(read('app.js'),/route\.modalitySource='user'/);
  assert.match(read('models.js'),/m\.modalitySource='user'/);
});
