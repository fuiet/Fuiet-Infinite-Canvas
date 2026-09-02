from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)


# 1) XOGPU route: documented endpoint first, common gateway variants only as 404 fallbacks.
registry = ROOT / 'video-protocol-registry.js'
src = registry.read_text(encoding='utf-8')
start = src.index('function xogpuVideoProfile(')
end = src.index('function xogpuMediaReference(', start)
seg = src[start:end]
seg = replace_once(
    seg,
    "createCandidates:['/v1/videos']",
    "createCandidates:['/v1/videos','/v1/videos/generations','/v1/video/generations']",
    'XOGPU create candidates',
)
seg = replace_once(
    seg,
    "pollPathCandidates:['/v1/videos/{{taskId}}','/v1/tasks/{{taskId}}']",
    "pollPathCandidates:['/v1/videos/{{taskId}}','/v1/videos/generations/{{taskId}}','/v1/video/generations/{{taskId}}','/v1/tasks/{{taskId}}']",
    'XOGPU poll candidates',
)
seg = replace_once(
    seg,
    "contentPathCandidates:['/v1/videos/{{taskId}}/content']",
    "contentPathCandidates:['/v1/videos/{{taskId}}/content','/v1/videos/generations/{{taskId}}/content','/v1/video/generations/{{taskId}}/content']",
    'XOGPU content candidates',
)
registry.write_text(src[:start] + seg + src[end:], encoding='utf-8')

# 2) Browser preview: specialized XOGPU route may use its candidates, but only retry create on 404.
browser = ROOT / 'browser-runtime-preview.js'
src = browser.read_text(encoding='utf-8')
src = replace_once(
    src,
    "function alternateVideoCreatePaths(route,model){\n  const first=String(route.createPath||'/v1/videos'),profile=Array.isArray(route.createCandidates)?route.createCandidates:[];if(!autoVideoRoute(model,route))return[first];",
    "function alternateVideoCreatePaths(route,model){\n  const first=String(route.createPath||'/v1/videos'),profile=Array.isArray(route.createCandidates)?route.createCandidates:[];if(isXogpuVideoRoute(route))return[...new Set([first,...profile])];if(!autoVideoRoute(model,route))return[first];",
    'browser XOGPU candidate selection',
)
src = replace_once(
    src,
    "if(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;",
    "const retryMissingXogpuRoute=isXogpuVideoRoute(route)&&Number(error?.status)===404;if(!retryMissingXogpuRoute&&(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status))))throw error;",
    'browser XOGPU 404-only retry',
)
browser.write_text(src, encoding='utf-8')

# 3) Desktop server already iterates createCandidates; tighten XOGPU to 404-only retry.
server = ROOT / 'server.js'
src = server.read_text(encoding='utf-8')
src = replace_once(
    src,
    "catch(error){lastCreateError=error;if(![400,404,405,415,422].includes(Number(error?.status)))throw error}",
    "catch(error){lastCreateError=error;const retryableCreateError=isXogpuVideoConfig(config)?Number(error?.status)===404:[400,404,405,415,422].includes(Number(error?.status));if(!retryableCreateError)throw error}",
    'desktop XOGPU 404-only retry',
)
server.write_text(src, encoding='utf-8')

# 4) Refresh preview router and protocol registry cache keys.
router = ROOT / 'browser-runtime.js'
src = router.read_text(encoding='utf-8')
src = replace_once(
    src,
    "./browser-runtime-preview.js?v=20260902-public-upstream-media-1",
    "./browser-runtime-preview.js?v=20260902-xogpu-create-fallback-1",
    'preview runtime cache key',
)
router.write_text(src, encoding='utf-8')

index = ROOT / 'index.html'
src = index.read_text(encoding='utf-8')
src = replace_once(
    src,
    './video-protocol-registry.js?v=20260902-xogpu-image-data-url-1',
    './video-protocol-registry.js?v=20260902-xogpu-create-fallback-1',
    'registry cache key',
)
src = replace_once(
    src,
    './browser-runtime.js?v=20260902-desktop-runtime-router-1&fix=chat-messages-1',
    './browser-runtime.js?v=20260902-desktop-runtime-router-1&fix=xogpu-create-fallback-1',
    'browser router cache key',
)
index.write_text(src, encoding='utf-8')

# 5) Focused regression test for route ordering and retry safety.
test_file = ROOT / 'tests' / 'xogpu-create-path-fallback.test.mjs'
if test_file.exists():
    raise SystemExit('xogpu-create-path-fallback.test.mjs already exists')
test_file.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
await import('../video-protocol-registry.js');
const V=globalThis.CanvasVideoProtocolRegistry;
const provider={id:'xogpu',name:'XOGPU',baseUrl:'https://xogpu.com/v1'};
const model={id:'MiniMax-H3',name:'MiniMax H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3'};

test('XOGPU keeps documented create endpoint first and exposes gateway fallbacks',()=>{
  const route=V.resolve(provider,model,'image-to-video');
  assert.equal(route.createPath,'/v1/videos');
  assert.deepEqual(route.createCandidates,['/v1/videos','/v1/videos/generations','/v1/video/generations']);
  assert.deepEqual(route.pollPathCandidates.slice(0,3),['/v1/videos/{{taskId}}','/v1/videos/generations/{{taskId}}','/v1/video/generations/{{taskId}}']);
});

test('browser retries specialized XOGPU create only when the endpoint is missing',()=>{
  const src=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
  assert.ok(src.includes("if(isXogpuVideoRoute(route))return[...new Set([first,...profile])]"));
  assert.ok(src.includes("const retryMissingXogpuRoute=isXogpuVideoRoute(route)&&Number(error?.status)===404"));
  assert.ok(src.includes("if(!retryMissingXogpuRoute&&(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status))))throw error"));
});

test('desktop retries XOGPU create candidates on 404 only',()=>{
  const src=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.ok(src.includes("const retryableCreateError=isXogpuVideoConfig(config)?Number(error?.status)===404:[400,404,405,415,422].includes(Number(error?.status))"));
});
""", encoding='utf-8')
