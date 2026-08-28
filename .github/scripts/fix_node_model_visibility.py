from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'pattern not found in {path}: {old[:160]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


# The provider/model persistence and modality inference are already healed in main.
# This follow-up makes the node picker resilient to stale readiness metadata and
# guarantees both IndexedDB runtimes finish hydrating before app.js/models.js start.
replace_once(
    ROOT / 'browser-bootstrap.js',
    "async function start(){await manager.ready;const list=document.querySelector('#canvasViewport')?canvasScripts:document.querySelector('#modelList')?modelScripts:[];for(const script of list)await loadScript(script);document.documentElement.dataset.browserStorageReady='1'}",
    "async function start(){await Promise.all([manager.ready,globalThis.CanvasBrowserRuntime?.ready||Promise.resolve()]);const list=document.querySelector('#canvasViewport')?canvasScripts:document.querySelector('#modelList')?modelScripts:[];for(const script of list)await loadScript(script);document.documentElement.dataset.browserStorageReady='1'}"
)

app_path = ROOT / 'app.js'
app = app_path.read_text(encoding='utf-8')
old_ready = """  function modelRuntimeReady(p,m){
    if(!m||m.enabled===false)return false;
    if(m.adapterResolved&&m.adapterResolved.ready===false)return false;
    if(m.adapterResolved&&m.adapterResolved.ready===true)return true;
    if(p?.protocol==='comfyui')return true;
    if(p?.protocol==='openai-compatible'&&['text','image','audio'].includes(normalizeClientModality(m.modality)))return true;
    if(normalizeClientModality(m.modality)==='video'&&p?.protocol!=='comfyui'&&(p?.videoProtocol==='standard-video-async-v1'||providerHasApiKey(p)))return true;
    return Boolean(String(m.createPath||'').trim()) || normalizeClientModality(m.modality)==='text';
  }
"""
new_ready = """  function modelRuntimeReady(p,m){
    if(!m||m.enabled===false||!String(m.id||'').trim())return false;
    const modality=normalizeClientModality(m.modality);
    try{
      const Contract=globalThis.CanvasProviderAdapters;
      if(Contract?.resolveRoute){
        const route=Contract.resolveRoute(p||{},m,modality,'generate');
        if(route?.adapterKey&&route.adapterKey!=='auto'&&String(route.createPath||'').trim())return true;
      }
    }catch{}
    // adapterResolved is cached diagnostic metadata. A historical ready=false must
    // not hide a model that the current Provider Core can execute successfully.
    if(m.adapterResolved?.ready===true)return true;
    if(p?.protocol==='comfyui')return true;
    if(p?.protocol==='openai-compatible'&&['text','image','audio'].includes(modality))return true;
    if(modality==='video'&&p?.protocol!=='comfyui'&&(p?.videoProtocol==='standard-video-async-v1'||providerHasApiKey(p)))return true;
    return Boolean(String(m.createPath||'').trim()) || modality==='text';
  }
"""
if old_ready not in app:
    raise SystemExit('modelRuntimeReady pattern missing')
app = app.replace(old_ready, new_ready, 1)
app = app.replace(
    "m.enabled!==false&&m.modality===modality&&modelRuntimeReady(p,m)",
    "m.enabled!==false&&normalizeClientModality(m.modality)===normalizeClientModality(modality)&&modelRuntimeReady(p,m)"
)
app_path.write_text(app, encoding='utf-8')

# Existing storage bootstrap regression must reflect the stronger requirement: both
# the UI settings manager and provider runtime are hydrated before app scripts start.
storage_test = ROOT / 'tests' / 'browser-storage-manager.test.mjs'
st = storage_test.read_text(encoding='utf-8')
st = st.replace(
    "assert.match(bootstrap,/await manager\\.ready/);",
    "assert.match(bootstrap,/Promise\\.all\\(\\[manager\\.ready,globalThis\\.CanvasBrowserRuntime\\?\\.ready/);",
    1
)
if "Promise\\.all\\(\\[manager\\.ready" not in st:
    raise SystemExit('browser storage bootstrap assertion was not updated')
storage_test.write_text(st, encoding='utf-8')

# Add a regression test that specifically protects the bug visible in the user's
# screenshot: provider/model exists, but every node picker reports 0 available.
test = r"""import test from 'node:test';
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
"""
(ROOT / 'tests' / 'node-model-availability-runtime.test.mjs').write_text(test, encoding='utf-8')

print('patched bootstrap and canvas runtime model availability; updated regressions')
