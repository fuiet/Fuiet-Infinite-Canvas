from pathlib import Path

root = Path('_read_123_zip_20260821_180410')
adapter = root / 'provider-adapter-contract.js'
index = root / 'index.html'
test_file = root / 'tests' / 'xogpu-route-merge-v2.test.mjs'

src = adapter.read_text(encoding='utf-8')
old = """  const op=compact(model.operationRoutes?.[operation]||model.operationRoutes?.generate||{});\n  const route={...defaults,...knownVideo,...providerVideo,...modelVideo,...direct,...op,adapterKey};\n  route.method=String(route.method||'POST').toUpperCase();\n"""
new = """  const op=compact(model.operationRoutes?.[operation]||model.operationRoutes?.generate||{});\n  const route={...defaults,...knownVideo,...providerVideo,...modelVideo,...direct,...op,adapterKey};\n  const knownVideoFamily=String(knownVideo.protocolFamily||knownVideo.family||'').trim().toLowerCase();\n  if(nodeType==='video'&&knownVideoFamily==='xogpu-minimax-h3'&&/^https?:\\/\\//i.test(String(knownVideo.createPath||''))){\n    route.createPath=knownVideo.createPath;\n    route.createCandidates=Array.isArray(knownVideo.createCandidates)&&knownVideo.createCandidates.length?[...knownVideo.createCandidates]:[knownVideo.createPath];\n  }\n  route.method=String(route.method||'POST').toUpperCase();\n"""
if old not in src:
    if "knownVideoFamily==='xogpu-minimax-h3'" not in src:
        raise SystemExit('provider adapter route merge anchor not found')
else:
    src = src.replace(old, new, 1)
    adapter.write_text(src, encoding='utf-8')

html = index.read_text(encoding='utf-8')
old_cache = './provider-adapter-contract.js?v=20260902-provider-model-ownership-2'
new_cache = './provider-adapter-contract.js?v=20260909-xogpu-route-merge-2'
if old_cache in html:
    html = html.replace(old_cache, new_cache, 1)
elif new_cache not in html:
    raise SystemExit('provider adapter cache key anchor not found')
index.write_text(html, encoding='utf-8')

test_file.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const registrySrc=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');
const adapterSrc=fs.readFileSync(new URL('../provider-adapter-contract.js',import.meta.url),'utf8');
const sandbox={URL};
sandbox.globalThis=sandbox;
vm.runInNewContext(registrySrc,sandbox,{filename:'video-protocol-registry.js'});
vm.runInNewContext(adapterSrc,sandbox,{filename:'provider-adapter-contract.js'});
const Adapters=sandbox.CanvasProviderAdapters;

test('resolved XOGPU media route keeps origin-root canonical URL after operation route merge',()=>{
  const provider={baseUrl:'https://xogpu.com/v1'};
  const model=Adapters.xogpuKnownModels()[0];
  const route=Adapters.resolveVideoRoute(provider,model,{parameters:{operation:'image-to-video'}},[{type:'image',url:'https://example.com/frame.png'}]);
  assert.equal(route.createPath,'https://xogpu.com/api/user/discount-video-studio/jobs');
  assert.equal(route.createPath.includes('/v1/api/'),false);
  assert.deepEqual(Array.from(route.createCandidates),['https://xogpu.com/api/user/discount-video-studio/jobs']);
  assert.equal(route.requestTransport,'multipart');
  assert.equal(route.strictCreatePath,true);
});

test('XOGPU text-to-video route remains /v1/videos',()=>{
  const provider={baseUrl:'https://xogpu.com/v1'};
  const model=Adapters.xogpuKnownModels()[0];
  const route=Adapters.resolveVideoRoute(provider,model,{parameters:{operation:'text-to-video'}},[]);
  assert.equal(route.createPath,'/v1/videos');
  assert.equal(route.requestTransport,'json');
});

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('browser cache key is bumped for adapter route merge fix',()=>{
  assert.match(html,/provider-adapter-contract\\.js\\?v=20260909-xogpu-route-merge-2/);
});
""", encoding='utf-8')
