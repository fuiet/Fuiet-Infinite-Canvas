import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('bootstrap waits for provider runtime IndexedDB hydration before loading app scripts', () => {
  const src = read('browser-bootstrap.js');
  assert.match(src, /Promise\.all\(\[manager\.ready,globalThis\.CanvasBrowserRuntime\?\.ready/);
});

test('canvas model availability resolves current adapter route and ignores stale ready=false veto', () => {
  const src = read('app.js');
  assert.match(src, /Contract\.resolveRoute\(p\|\|\{\},m,modality,'generate'\)/);
  assert.doesNotMatch(src, /adapterResolved&&m\.adapterResolved\.ready===false\)return false/);
  assert.match(src, /normalizeClientModality\(m\.modality\)===normalizeClientModality\(modality\)/);
});

test('shared adapter contract makes normal image video and text models executable', () => {
  const sandbox = { console, URL };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read('provider-adapter-contract.js'), sandbox);
  const A = sandbox.CanvasProviderAdapters;
  assert.equal(typeof A.normalizeModelModality, 'function');
  for (const [modality, id] of [['image','flux-1.1-pro'],['video','seedance-2.0'],['text','gpt-5']]) {
    const p = A.finalizeProvider({baseUrl:'https://example.com/v1',protocol:'auto',models:[{id,name:id,modality,enabled:true,adapterKey:'auto'}]});
    const m = p.models[0];
    assert.equal(m.adapterResolved.ready, true, `${modality} should resolve ready`);
    assert.ok(m.createPath, `${modality} should have a create route`);
  }
});

test('browser runtime already heals persisted provider records before exposing them to UI', () => {
  const src = read('browser-runtime.js');
  assert.match(src, /cache\.providers=cache\.providers\.map\(normalizeProviderRecord\)/);
  assert.match(src, /await saveProvidersCommitted\(list\)/);
  assert.match(src, /suggestedProtocol/);
});
