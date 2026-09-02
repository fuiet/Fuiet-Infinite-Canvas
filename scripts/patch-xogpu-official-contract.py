from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)


# 1) Strict XOGPU MiniMax-H3 route and request contract from supplied docs.
registry = ROOT / 'video-protocol-registry.js'
src = registry.read_text(encoding='utf-8')
src = replace_once(
    src,
    "createCandidates:['/v1/videos','/v1/videos/generations','/v1/video/generations'],pollPath:'/v1/videos/{{taskId}}',pollPathCandidates:['/v1/videos/{{taskId}}','/v1/videos/generations/{{taskId}}','/v1/video/generations/{{taskId}}','/v1/tasks/{{taskId}}']",
    "createCandidates:['/v1/videos'],pollPath:'/v1/videos/{{taskId}}',pollPathCandidates:['/v1/videos/{{taskId}}','/v1/tasks/{{taskId}}']",
    'XOGPU route fallbacks',
)
src = replace_once(
    src,
    "contentPathCandidates:['/v1/videos/{{taskId}}/content','/v1/videos/generations/{{taskId}}/content','/v1/video/generations/{{taskId}}/content']",
    "contentPathCandidates:['/v1/videos/{{taskId}}/content']",
    'XOGPU content fallbacks',
)
src = replace_once(
    src,
    "if(images.length>9)throw new Error('XOGPU MiniMax-H3 最多支持 9 张图片');if(videos.length>3)throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考视频');if(audios.length>3)throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考音频');if(entries.length>12)throw new Error('XOGPU MiniMax-H3 全部参考媒体合计最多 12 个');",
    "if(images.length>9)throw new Error('XOGPU MiniMax-H3 最多支持 9 张图片');if(videos.length>3)throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考视频');if(audios.length>3)throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考音频');",
    'XOGPU independent media limits',
)
src = replace_once(
    src,
    "const body={model:'MiniMax-H3',prompt,duration,ratio,group:'discount_video_generation',n:1};",
    "const body={model:'MiniMax-H3',group:'特惠视频生成',prompt,duration,ratio};",
    'XOGPU documented body fields',
)
registry.write_text(src, encoding='utf-8')

# 2) Provider metadata mirrors the same documented limits/group/modes.
adapter = ROOT / 'provider-adapter-contract.js'
src = adapter.read_text(encoding='utf-8')
src = replace_once(src, 'maxImages:9,maxVideos:3,maxAudios:3,maxReferences:12,maxReferenceImages:9,maxReferenceVideos:3,maxReferenceAudios:3', 'maxImages:9,maxVideos:3,maxAudios:3,maxReferenceImages:9,maxReferenceVideos:3,maxReferenceAudios:3', 'XOGPU maxReferences metadata')
src = replace_once(src, "generationModes:['text2video','image2video','audio2video','frame2video']", "generationModes:['text2video','image2video','frame2video','omni_reference']", 'XOGPU official generation modes')
src = replace_once(src, "billingGroup:'discount_video_generation'", "billingGroup:'特惠视频生成'", 'XOGPU billing group')
adapter.write_text(src, encoding='utf-8')

# 3) Remove the speculative create fallback behavior from browser and desktop runtimes.
browser = ROOT / 'browser-runtime-preview.js'
src = browser.read_text(encoding='utf-8')
src = replace_once(
    src,
    "const first=String(route.createPath||'/v1/videos'),profile=Array.isArray(route.createCandidates)?route.createCandidates:[];if(isXogpuVideoRoute(route))return[...new Set([first,...profile])];if(!autoVideoRoute(model,route))return[first];",
    "const first=String(route.createPath||'/v1/videos'),profile=Array.isArray(route.createCandidates)?route.createCandidates:[];if(!autoVideoRoute(model,route))return[first];",
    'browser XOGPU fallback candidates',
)
src = replace_once(
    src,
    "const retryMissingXogpuRoute=isXogpuVideoRoute(route)&&Number(error?.status)===404;if(!retryMissingXogpuRoute&&(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status))))throw error;",
    "if(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;",
    'browser XOGPU 404 retry',
)
browser.write_text(src, encoding='utf-8')

server = ROOT / 'server.js'
src = server.read_text(encoding='utf-8')
src = replace_once(
    src,
    "catch(error){lastCreateError=error;const retryableCreateError=isXogpuVideoConfig(config)?Number(error?.status)===404:[400,404,405,415,422].includes(Number(error?.status));if(!retryableCreateError)throw error}",
    "catch(error){lastCreateError=error;if(![400,404,405,415,422].includes(Number(error?.status)))throw error}",
    'desktop XOGPU 404 retry',
)
server.write_text(src, encoding='utf-8')

# 4) Align tests with the supplied official docs.
test_file = ROOT / 'tests' / 'xogpu-minimax-h3.test.mjs'
tests = test_file.read_text(encoding='utf-8')
tests = replace_once(tests, "assert.equal(m.capabilities.billingGroup,'discount_video_generation');", "assert.equal(m.capabilities.billingGroup,'特惠视频生成');", 'XOGPU group test')
tests = replace_once(tests, "assert.deepEqual(route.pollPathCandidates,['/v1/videos/{{taskId}}','/v1/videos/generations/{{taskId}}','/v1/video/generations/{{taskId}}','/v1/tasks/{{taskId}}']);", "assert.deepEqual(route.createCandidates,['/v1/videos']);assert.deepEqual(route.pollPathCandidates,['/v1/videos/{{taskId}}','/v1/tasks/{{taskId}}']);", 'XOGPU route test')
tests = replace_once(tests, "test('XOGPU text-to-video body follows discount_video_generation docs exactly',()=>{", "test('XOGPU text-to-video body follows supplied API docs exactly',()=>{", 'XOGPU text test name')
tests = replace_once(tests, "assert.deepEqual(mapped.body,{model:'MiniMax-H3',prompt:'cinematic ocean',duration:5,ratio:'16:9',group:'discount_video_generation',n:1});", "assert.deepEqual(mapped.body,{model:'MiniMax-H3',group:'特惠视频生成',prompt:'cinematic ocean',duration:5,ratio:'16:9'});", 'XOGPU text body test')
marker = "  assert.throws(()=>V.mapRequest(provider,model,{prompt:'text only adaptive',parameters:{duration:5,ratio:'adaptive'}},V.resolve(provider,model,'text-to-video'),[]),/adaptive 比例仅适用于/);\n});"
addition = "  const maxMixed=[...Array.from({length:9},(_,i)=>({type:'image',url:`https://cdn.example.com/i${i}.png`})),...Array.from({length:3},(_,i)=>({type:'video',url:`https://cdn.example.com/v${i}.mp4`})),...Array.from({length:3},(_,i)=>({type:'audio',url:`https://cdn.example.com/a${i}.wav`}))];\n  assert.doesNotThrow(()=>V.mapRequest(provider,model,{prompt:'max documented references',parameters:{duration:10,ratio:'adaptive'}},route,maxMixed));\n  assert.throws(()=>V.mapRequest(provider,model,{prompt:'text only adaptive',parameters:{duration:5,ratio:'adaptive'}},V.resolve(provider,model,'text-to-video'),[]),/adaptive 比例仅适用于/);\n});"
tests = replace_once(tests, marker, addition, 'XOGPU 9+3+3 test')
test_file.write_text(tests, encoding='utf-8')

wrong_test = ROOT / 'tests' / 'xogpu-create-path-fallback.test.mjs'
if wrong_test.exists():
    wrong_test.unlink()

# 5) Bust browser cache for every changed shared contract/runtime.
router = ROOT / 'browser-runtime.js'
src = router.read_text(encoding='utf-8')
src = replace_once(src, './browser-runtime-preview.js?v=20260902-xogpu-create-fallback-1', './browser-runtime-preview.js?v=20260902-xogpu-official-contract-1', 'preview runtime cache')
router.write_text(src, encoding='utf-8')

index = ROOT / 'index.html'
src = index.read_text(encoding='utf-8')
src = replace_once(src, './video-protocol-registry.js?v=20260902-xogpu-create-fallback-1', './video-protocol-registry.js?v=20260902-xogpu-official-contract-1', 'registry cache')
src = replace_once(src, './provider-adapter-contract.js?v=20260901-video-wait-progress-1&fix=chat-messages-1', './provider-adapter-contract.js?v=20260902-xogpu-official-contract-1', 'adapter cache')
src = replace_once(src, './browser-runtime.js?v=20260902-desktop-runtime-router-1&fix=xogpu-create-fallback-1', './browser-runtime.js?v=20260902-desktop-runtime-router-1&fix=xogpu-official-contract-1', 'router cache')
index.write_text(src, encoding='utf-8')
