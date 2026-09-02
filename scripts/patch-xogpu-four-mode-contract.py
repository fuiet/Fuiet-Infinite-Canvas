from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = ROOT / '_read_123_zip_20260821_180410'
PROTOCOL = APP_ROOT / 'video-protocol-registry.js'
ADAPTER = APP_ROOT / 'provider-adapter-contract.js'
PREVIEW = APP_ROOT / 'browser-runtime-preview.js'
DESKTOP_BRIDGE = APP_ROOT / 'desktop-video-protocol-bridge.cjs'
APP = APP_ROOT / 'app.js'
BOOTSTRAP = APP_ROOT / 'browser-bootstrap.js'
ROUTER = APP_ROOT / 'browser-runtime.js'
INDEX = APP_ROOT / 'index.html'
XOGPU_TEST = APP_ROOT / 'tests' / 'xogpu-minimax-h3.test.mjs'
STRICT_TEST = APP_ROOT / 'tests' / 'xogpu-browser-strict-request.test.mjs'
DESKTOP_TEST = APP_ROOT / 'tests' / 'desktop-video-protocol-bridge.test.mjs'
VIDEO_MODE_TEST = APP_ROOT / 'tests' / 'video-generation-mode-logic.test.mjs'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, lambda _m: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return updated


# 1) Shared protocol registry: the selected UI generation mode is authoritative and
# XOGPU request bodies follow the four documented contracts.
protocol = PROTOCOL.read_text(encoding='utf-8')
protocol = regex_once(
    protocol,
    r"function detectOperation\(\{references=\[\],parameters=\{\}\}=\{\}\)\{.*?\n\}\nconst COMMON_TASK_IDS=",
    """function detectOperation({references=[],parameters={}}={}){
  const raw=String(parameters.generationMode||parameters.videoMode||parameters.operation||parameters.videoOperation||'').trim().toLowerCase();
  const aliases={
    'text2video':'text-to-video','t2v':'text-to-video','text_to_video':'text-to-video','text-video':'text-to-video','文生视频':'text-to-video',
    'image2video':'image-to-video','i2v':'image-to-video','image_to_video':'image-to-video','image-video':'image-to-video','图生视频':'image-to-video',
    'frame2video':'first-last-frame','first-last-frame':'first-last-frame','first_last_frame':'first-last-frame','首尾帧':'first-last-frame',
    'omni_reference':'reference-to-video','omni-reference':'reference-to-video','omni':'reference-to-video','multimodal':'reference-to-video','multi-modal':'reference-to-video','reference2video':'reference-to-video','reference_to_video':'reference-to-video','ref2video':'reference-to-video','audio2video':'reference-to-video','全能参考':'reference-to-video','多模态':'reference-to-video'
  };
  const explicit=aliases[raw]||raw;
  if(explicit&&!['generate','generation','video','video-generation','video_generation'].includes(explicit))return explicit;
  const refs=Array.isArray(references)?references:[];
  const images=refs.filter(r=>String(r?.type||r?.kind||'').toLowerCase()==='image'||/frame|image|reference/.test(String(r?.role||r?.semanticRole||'').toLowerCase()));
  if(images.some(r=>/last/.test(String(r?.role||r?.semanticRole||'').toLowerCase())))return'first-last-frame';
  if(refs.some(r=>['video','audio'].includes(String(r?.type||r?.kind||'').toLowerCase()))||images.length>1)return'reference-to-video';
  if(images.length)return'image-to-video';
  return'text-to-video';
}
const COMMON_TASK_IDS=""",
    'make selected video mode authoritative',
)

new_xogpu_mapper = """function mapXogpuVideoRequest(model={},task={},refs=[],operation='generate'){
  const p={...(task.parameters||{})},prompt=String(task.prompt||'').trim();
  if(!prompt)throw new Error('XOGPU MiniMax-H3 必须填写 prompt');
  if(prompt.length>7000)throw new Error('XOGPU MiniMax-H3 prompt 最长 7000 字符');
  const list=Array.isArray(refs)?refs:[],inferred=detectOperation({references:list,parameters:p});
  const opAliases={'text2video':'text-to-video','image2video':'image-to-video','frame2video':'first-last-frame','omni_reference':'reference-to-video','audio2video':'reference-to-video'};
  const rawOperation=String(operation||'').trim().toLowerCase(),normalizedOperation=opAliases[rawOperation]||rawOperation;
  const mode=['text-to-video','image-to-video','first-last-frame','reference-to-video'].includes(normalizedOperation)?normalizedOperation:inferred;
  const duration=Math.max(1,Math.min(15,Math.round(Number(p.duration??p.seconds??5)||5)));
  const entries=list.map((r,index)=>{
    const type=String(r?.type||r?.kind||'').toLowerCase(),role=String(r?.role||r?.semanticRole||'').toLowerCase(),url=r?.url||r?.value||r?.outputUrl||'';
    let kind='';if(type==='image'||/image|frame|picture/.test(role))kind='image';else if(type==='video'||/video|motion/.test(role))kind='video';else if(type==='audio'||/audio|voice|sound/.test(role))kind='audio';
    return{r,index,type:kind,role,url};
  }).filter(x=>x.type&&x.url);
  const images=entries.filter(x=>x.type==='image'),videos=entries.filter(x=>x.type==='video'),audios=entries.filter(x=>x.type==='audio');
  for(const item of [...videos,...audios]){
    const seconds=Number(item.r?.duration??item.r?.seconds??item.r?.metadata?.duration);
    if(Number.isFinite(seconds)&&(seconds<2||seconds>15))throw new Error(`XOGPU MiniMax-H3 的${item.type==='video'?'参考视频':'参考音频'}必须为 2-15 秒`);
  }
  const allowed=['16:9','9:16','1:1','4:3','3:4','21:9','adaptive'];
  let ratio=String(p.ratio||p.aspectRatio||p.aspect_ratio||(mode==='text-to-video'?'16:9':'adaptive')).trim().toLowerCase();
  if(!allowed.includes(ratio))ratio=mode==='text-to-video'?'16:9':'adaptive';
  if(mode==='text-to-video'&&ratio==='adaptive')throw new Error('XOGPU MiniMax-H3 文生视频必须使用固定画幅比例');
  const body={model:'MiniMax-H3',group:'特惠视频生成',prompt,duration,ratio};
  if(mode==='text-to-video')return body;
  const textItem={type:'text',text:prompt};
  if(mode==='image-to-video'){
    if(images.length!==1||videos.length||audios.length)throw new Error('XOGPU MiniMax-H3 图生视频只接受 1 张参考图');
    const image=images[0],url=xogpuPublicMediaUrl(image.url,'图片');
    body.content=[textItem,{type:'image_url',image_url:{url},role:'first_frame'}];
    return body;
  }
  if(mode==='first-last-frame'){
    if(videos.length||audios.length)throw new Error('XOGPU MiniMax-H3 首尾帧模式只接受首帧和尾帧图片');
    const firstList=images.filter(x=>/first/.test(x.role)),lastList=images.filter(x=>/last/.test(x.role));
    if(images.length!==2||firstList.length!==1||lastList.length!==1)throw new Error('XOGPU MiniMax-H3 首尾帧模式必须各提供 1 张首帧和尾帧图片');
    const first=firstList[0],last=lastList[0];
    body.content=[textItem,{type:'image_url',image_url:{url:xogpuPublicMediaUrl(first.url,'首帧图片')},role:'first_frame'},{type:'image_url',image_url:{url:xogpuPublicMediaUrl(last.url,'尾帧图片')},role:'last_frame'}];
    return body;
  }
  if(!entries.length)throw new Error('XOGPU MiniMax-H3 全能参考至少需要 1 个参考素材');
  if(images.length>9)throw new Error('XOGPU MiniMax-H3 最多支持 9 张图片');
  if(videos.length>3)throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考视频');
  if(audios.length>3)throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考音频');
  if(entries.length>12)throw new Error('XOGPU MiniMax-H3 全部参考媒体合计最多 12 个');
  body.content=[textItem,...entries.map(x=>{
    const url=xogpuPublicMediaUrl(x.url,x.type==='image'?'图片':x.type==='video'?'参考视频':'参考音频');
    if(x.type==='video')return{type:'video_url',video_url:{url},role:'reference_video'};
    if(x.type==='audio')return{type:'audio_url',audio_url:{url},role:'reference_audio'};
    return{type:'image_url',image_url:{url},role:'reference_image'};
  })];
  return body;
}
"""
protocol = regex_once(
    protocol,
    r"function mapXogpuVideoRequest\(model=\{\},task=\{\},refs=\[\],operation='generate'\)\{.*?\n\}\nfunction agnesVideoProfile",
    new_xogpu_mapper + 'function agnesVideoProfile',
    'replace XOGPU four-mode request mapper',
)
PROTOCOL.write_text(protocol, encoding='utf-8')


# 2) Known XOGPU model advertises the same four modes the UI exposes. Keep the
# existing URL transport contract because staging still produces a public URL.
adapter = ADAPTER.read_text(encoding='utf-8')
adapter = replace_once(
    adapter,
    "generationModes:['text2video','image2video','audio2video','frame2video']",
    "generationModes:['text2video','image2video','frame2video','omni_reference']",
    'align known XOGPU generation modes',
)
ADAPTER.write_text(adapter, encoding='utf-8')


# 3) Browser preview's final whitelist must not re-introduce undocumented fields.
preview = PREVIEW.read_text(encoding='utf-8')
preview = regex_once(
    preview,
    r"function xogpuStrictVideoBody\(body=\{\},route=\{\}\)\{.*?\n\}\nfunction defaultRequestBody",
    """function xogpuStrictVideoBody(body={},route={}){
  const family=String(route?.protocolFamily||route?.family||'').trim().toLowerCase();
  if(family!=='xogpu-minimax-h3')return body;
  const src=body&&typeof body==='object'?body:{};
  const duration=Math.max(1,Math.min(15,Math.round(Number(src.duration)||5)));
  const allowedRatios=['16:9','9:16','1:1','4:3','3:4','21:9','adaptive'];
  const ratio=allowedRatios.includes(String(src.ratio||''))?String(src.ratio):'16:9';
  const out={model:'MiniMax-H3',group:'特惠视频生成',prompt:String(src.prompt||''),duration,ratio};
  if(Array.isArray(src.content)&&src.content.length)out.content=src.content;
  return out;
}
function defaultRequestBody""",
    'tighten browser XOGPU request whitelist',
)
PREVIEW.write_text(preview, encoding='utf-8')


# 4) Desktop bridge mirrors the exact same contract but intentionally preserves
# local references for ReferenceMediaTransport/Input Staging to resolve later.
desktop = DESKTOP_BRIDGE.read_text(encoding='utf-8')
desktop = regex_once(
    desktop,
    r"function operationFromReferences\(refs = \[\], parameters = \{\}\) \{.*?\n\}\n\nfunction isXogpuMiniMaxH3",
    """function operationFromReferences(refs = [], parameters = {}) {
  const raw = String(parameters.generationMode || parameters.videoMode || parameters.operation || parameters.videoOperation || '').trim().toLowerCase();
  const aliases = {
    text2video: 'text-to-video', t2v: 'text-to-video', text_to_video: 'text-to-video',
    image2video: 'image-to-video', i2v: 'image-to-video', image_to_video: 'image-to-video',
    frame2video: 'first-last-frame', 'first-last-frame': 'first-last-frame', first_last_frame: 'first-last-frame',
    omni_reference: 'reference-to-video', 'omni-reference': 'reference-to-video', omni: 'reference-to-video', multimodal: 'reference-to-video',
    reference2video: 'reference-to-video', reference_to_video: 'reference-to-video', ref2video: 'reference-to-video', audio2video: 'reference-to-video'
  };
  const explicit = aliases[raw] || raw;
  if (explicit && !['generate', 'generation', 'video', 'video-generation', 'video_generation'].includes(explicit)) return explicit;
  const list = Array.isArray(refs) ? refs : [];
  const images = list.filter(r => {
    const type = String(r?.type || r?.kind || '').toLowerCase();
    const role = String(r?.role || r?.semanticRole || '').toLowerCase();
    return type === 'image' || /frame|image|reference/.test(role);
  });
  if (images.some(r => /last/.test(String(r?.role || r?.semanticRole || '').toLowerCase()))) return 'first-last-frame';
  if (list.some(r => ['video', 'audio'].includes(String(r?.type || r?.kind || '').toLowerCase())) || images.length > 1) return 'reference-to-video';
  if (images.length) return 'image-to-video';
  return 'text-to-video';
}

function isXogpuMiniMaxH3""",
    'make desktop selected mode authoritative',
)

desktop = regex_once(
    desktop,
    r"function mapDesktopXogpuRequest\(model = \{\}, task = \{\}, refs = \[\], operation = 'generate'\) \{.*?\n\}\n\nfunction installDesktopVideoProtocolBridge",
    """function mapDesktopXogpuRequest(model = {}, task = {}, refs = [], operation = 'generate') {
  const p = { ...(task.parameters || {}) };
  const prompt = String(task.prompt || '').trim();
  if (!prompt) throw new Error('XOGPU MiniMax-H3 必须填写 prompt');
  if (prompt.length > 7000) throw new Error('XOGPU MiniMax-H3 prompt 最长 7000 字符');

  const list = Array.isArray(refs) ? refs : [];
  const inferred = operationFromReferences(list, p);
  const opAliases = { text2video: 'text-to-video', image2video: 'image-to-video', frame2video: 'first-last-frame', omni_reference: 'reference-to-video', audio2video: 'reference-to-video' };
  const rawOperation = String(operation || '').trim().toLowerCase();
  const normalizedOperation = opAliases[rawOperation] || rawOperation;
  const mode = ['text-to-video', 'image-to-video', 'first-last-frame', 'reference-to-video'].includes(normalizedOperation) ? normalizedOperation : inferred;
  const duration = Math.max(1, Math.min(15, Math.round(Number(p.duration ?? p.seconds ?? 5) || 5)));
  const entries = list.map(classifyReference).filter(x => x.type && x.url);
  const images = entries.filter(x => x.type === 'image');
  const videos = entries.filter(x => x.type === 'video');
  const audios = entries.filter(x => x.type === 'audio');

  for (const item of [...videos, ...audios]) {
    const seconds = Number(item.ref?.duration ?? item.ref?.seconds ?? item.ref?.metadata?.duration);
    if (Number.isFinite(seconds) && (seconds < 2 || seconds > 15)) {
      throw new Error(`XOGPU MiniMax-H3 的${item.type === 'video' ? '参考视频' : '参考音频'}必须为 2-15 秒`);
    }
  }

  const allowed = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', 'adaptive'];
  let ratio = String(p.ratio || p.aspectRatio || p.aspect_ratio || (mode === 'text-to-video' ? '16:9' : 'adaptive')).trim().toLowerCase();
  if (!allowed.includes(ratio)) ratio = mode === 'text-to-video' ? '16:9' : 'adaptive';
  if (mode === 'text-to-video' && ratio === 'adaptive') throw new Error('XOGPU MiniMax-H3 文生视频必须使用固定画幅比例');

  const body = { model: 'MiniMax-H3', group: '特惠视频生成', prompt, duration, ratio };
  if (mode === 'text-to-video') return body;
  const textItem = { type: 'text', text: prompt };

  if (mode === 'image-to-video') {
    if (images.length !== 1 || videos.length || audios.length) throw new Error('XOGPU MiniMax-H3 图生视频只接受 1 张参考图');
    const image = images[0];
    body.content = [textItem, { type: 'image_url', image_url: { url: image.url }, role: 'first_frame' }];
    return body;
  }

  if (mode === 'first-last-frame') {
    if (videos.length || audios.length) throw new Error('XOGPU MiniMax-H3 首尾帧模式只接受首帧和尾帧图片');
    const firstList = images.filter(x => /first/.test(x.role));
    const lastList = images.filter(x => /last/.test(x.role));
    if (images.length !== 2 || firstList.length !== 1 || lastList.length !== 1) throw new Error('XOGPU MiniMax-H3 首尾帧模式必须各提供 1 张首帧和尾帧图片');
    body.content = [
      textItem,
      { type: 'image_url', image_url: { url: firstList[0].url }, role: 'first_frame' },
      { type: 'image_url', image_url: { url: lastList[0].url }, role: 'last_frame' }
    ];
    return body;
  }

  if (!entries.length) throw new Error('XOGPU MiniMax-H3 全能参考至少需要 1 个参考素材');
  if (images.length > 9) throw new Error('XOGPU MiniMax-H3 最多支持 9 张图片');
  if (videos.length > 3) throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考视频');
  if (audios.length > 3) throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考音频');
  if (entries.length > 12) throw new Error('XOGPU MiniMax-H3 全部参考媒体合计最多 12 个');
  body.content = [textItem, ...entries.map(x => {
    if (x.type === 'video') return { type: 'video_url', video_url: { url: x.url }, role: 'reference_video' };
    if (x.type === 'audio') return { type: 'audio_url', audio_url: { url: x.url }, role: 'reference_audio' };
    return { type: 'image_url', image_url: { url: x.url }, role: 'reference_image' };
  })];
  return body;
}

function installDesktopVideoProtocolBridge""",
    'replace desktop XOGPU four-mode mapper',
)
DESKTOP_BRIDGE.write_text(desktop, encoding='utf-8')


# 5) UI-side validation mirrors the documented mode inputs before a task is sent.
app = APP.read_text(encoding='utf-8')
old_validation = """    if(n.type==='video'){
      const currentMode=normalizeVideoModeKey(n.videoMode||'text2video')||'text2video';
      if(currentMode==='image2video'){
        if(!refs.some(r=>r.type==='image'&&r.url))errors.push('图生视频至少需要 1 张参考图');
        if(refs.length&&caps.supportsImageReference===false)errors.push('当前视频模型不支持图像参考');
      }else if(currentMode==='frame2video'){
        if(!(byRole.first_frame||[]).some(r=>r.url))errors.push('首尾帧模式需要首帧图片');
        if(!(byRole.last_frame||[]).some(r=>r.url))errors.push('首尾帧模式需要尾帧图片');
        if((byRole.first_frame||[]).length&&caps.supportsFirstFrame===false)errors.push('当前视频模型不支持首帧输入');
        if((byRole.last_frame||[]).length&&caps.supportsLastFrame===false)errors.push('当前视频模型不支持尾帧输入');
      }else if(currentMode==='omni_reference'){
        if(!refs.some(r=>r.url||String(r.text||'').trim()))errors.push('全能参考至少需要 1 个参考素材');
        if(refs.some(r=>r.type==='image')&&caps.supportsImageReference===false)errors.push('当前视频模型不支持图像参考');
        if(refs.some(r=>r.type==='video')&&caps.supportsVideoReference===false)errors.push('当前视频模型不支持参考视频 / 运镜参考');
        if(refs.some(r=>r.type==='audio')&&caps.supportsAudioReference===false)errors.push('当前视频模型不支持音频参考');
      }
    }
"""
new_validation = """    if(n.type==='video'){
      const currentMode=normalizeVideoModeKey(n.videoMode||'text2video')||'text2video';
      if(currentMode==='image2video'){
        const imageRefs=refs.filter(r=>r.type==='image'&&r.url);
        if(!imageRefs.length)errors.push('图生视频至少需要 1 张参考图');
        if(imageRefs.length>1)errors.push('图生视频只能使用 1 张参考图');
        if(imageRefs.length&&caps.supportsImageReference===false)errors.push('当前视频模型不支持图像参考');
      }else if(currentMode==='frame2video'){
        const firstFrames=(byRole.first_frame||[]).filter(r=>r.url),lastFrames=(byRole.last_frame||[]).filter(r=>r.url);
        if(!firstFrames.length)errors.push('首尾帧模式需要首帧图片');
        if(!lastFrames.length)errors.push('首尾帧模式需要尾帧图片');
        if(firstFrames.length>1)errors.push('首尾帧模式只能使用 1 张首帧图片');
        if(lastFrames.length>1)errors.push('首尾帧模式只能使用 1 张尾帧图片');
        if(firstFrames.length&&caps.supportsFirstFrame===false)errors.push('当前视频模型不支持首帧输入');
        if(lastFrames.length&&caps.supportsLastFrame===false)errors.push('当前视频模型不支持尾帧输入');
      }else if(currentMode==='omni_reference'){
        const imageRefs=refs.filter(r=>r.type==='image'&&r.url),videoRefs=refs.filter(r=>r.type==='video'&&r.url),audioRefs=refs.filter(r=>r.type==='audio'&&r.url);
        if(!refs.some(r=>r.url||String(r.text||'').trim()))errors.push('全能参考至少需要 1 个参考素材');
        if(imageRefs.length>9)errors.push('全能参考最多支持 9 张图片');
        if(videoRefs.length>3)errors.push('全能参考最多支持 3 个视频');
        if(audioRefs.length>3)errors.push('全能参考最多支持 3 个音频');
        if(imageRefs.length&&caps.supportsImageReference===false)errors.push('当前视频模型不支持图像参考');
        if(videoRefs.length&&caps.supportsVideoReference===false)errors.push('当前视频模型不支持参考视频 / 运镜参考');
        if(audioRefs.length&&caps.supportsAudioReference===false)errors.push('当前视频模型不支持音频参考');
      }
    }
"""
app = replace_once(app, old_validation, new_validation, 'tighten four-mode UI validation')
APP.write_text(app, encoding='utf-8')


# 6) Cache-bust the changed browser runtime/protocol assets.
bootstrap = BOOTSTRAP.read_text(encoding='utf-8')
bootstrap = regex_once(bootstrap, r"const v='[^']+';", "const v='20260902-xogpu-four-modes-1';", 'bump bootstrap cache version')
BOOTSTRAP.write_text(bootstrap, encoding='utf-8')

router = ROUTER.read_text(encoding='utf-8')
router = regex_once(router, r"browser-runtime-preview\.js\?v=[^'\"]+", 'browser-runtime-preview.js?v=20260902-xogpu-four-modes-1', 'bump preview runtime version')
ROUTER.write_text(router, encoding='utf-8')

index = INDEX.read_text(encoding='utf-8')
index = regex_once(index, r"video-protocol-registry\.js\?v=[^\"]+", 'video-protocol-registry.js?v=20260902-xogpu-four-modes-1', 'bump protocol script version')
index = regex_once(index, r"provider-adapter-contract\.js\?v=[^\"]+", 'provider-adapter-contract.js?v=20260902-xogpu-four-modes-1', 'bump adapter script version')
index = regex_once(index, r"browser-runtime\.js\?v=[^\"]+", 'browser-runtime.js?v=20260902-xogpu-four-modes-1', 'bump browser runtime script version')
index = regex_once(index, r"browser-bootstrap\.js\?v=[^\"]+", 'browser-bootstrap.js?v=20260902-xogpu-four-modes-1', 'bump bootstrap script version')
INDEX.write_text(index, encoding='utf-8')


# 7) Update legacy assertions to the documented request body and add four-mode tests.
xogpu_test = XOGPU_TEST.read_text(encoding='utf-8')
xogpu_test = replace_once(
    xogpu_test,
    "assert.deepEqual(mapped.body,{model:'MiniMax-H3',prompt:'cinematic ocean',duration:5,ratio:'16:9',group:'discount_video_generation',n:1});",
    "assert.deepEqual(mapped.body,{model:'MiniMax-H3',group:'特惠视频生成',prompt:'cinematic ocean',duration:5,ratio:'16:9'});",
    'update documented XOGPU text body assertion',
)
XOGPU_TEST.write_text(xogpu_test, encoding='utf-8')

strict_test = STRICT_TEST.read_text(encoding='utf-8')
strict_test = replace_once(strict_test, "assert.match(src,/group:'discount_video_generation'/);", "assert.match(src,/group:'特惠视频生成'/);", 'update browser strict group assertion')
strict_test = replace_once(
    strict_test,
    "assert.ok(fn.includes(\"const out={model:'MiniMax-H3'\"));",
    "assert.ok(fn.includes(\"const out={model:'MiniMax-H3',group:'特惠视频生成'\"));\n  assert.equal(/\\bn\\s*:|out\\.n\\s*=/.test(fn),false);",
    'assert undocumented n is absent',
)
STRICT_TEST.write_text(strict_test, encoding='utf-8')

mode_test = VIDEO_MODE_TEST.read_text(encoding='utf-8')
mode_test = replace_once(
    mode_test,
    "assert.match(block,/图生视频至少需要 1 张参考图/);",
    "assert.match(block,/图生视频至少需要 1 张参考图/);\n  assert.match(block,/图生视频只能使用 1 张参考图/);",
    'cover image mode cardinality validation',
)
mode_test = replace_once(
    mode_test,
    "assert.match(block,/全能参考至少需要 1 个参考素材/);",
    "assert.match(block,/全能参考至少需要 1 个参考素材/);\n  assert.match(block,/全能参考最多支持 9 张图片/);\n  assert.match(block,/全能参考最多支持 3 个视频/);\n  assert.match(block,/全能参考最多支持 3 个音频/);",
    'cover omni media limits',
)
VIDEO_MODE_TEST.write_text(mode_test, encoding='utf-8')

# Append focused desktop/runtime contract coverage without touching unrelated tests.
desktop_test = DESKTOP_TEST.read_text(encoding='utf-8')
extra = r'''

test('selected generationMode wins over connected references', () => {
  assert.equal(operationFromReferences([{ type: 'image', url: '/media/a.png' }], { generationMode: 'text2video' }), 'text-to-video');
  assert.equal(operationFromReferences([], { generationMode: 'image2video' }), 'image-to-video');
  assert.equal(operationFromReferences([], { generationMode: 'frame2video' }), 'first-last-frame');
  assert.equal(operationFromReferences([], { generationMode: 'omni_reference' }), 'reference-to-video');
});

test('desktop XOGPU four modes follow documented content roles', () => {
  const model = { id: 'MiniMax-H3' };
  const text = mapDesktopXogpuRequest(model, { prompt: 'text only', parameters: { generationMode: 'text2video', duration: 5, aspectRatio: '16:9' } }, [{ type: 'image', url: '/media/ignored.png' }], 'text-to-video');
  assert.deepEqual(text, { model: 'MiniMax-H3', group: '特惠视频生成', prompt: 'text only', duration: 5, ratio: '16:9' });

  const image = mapDesktopXogpuRequest(model, { prompt: 'move', parameters: { generationMode: 'image2video', duration: 5, aspectRatio: '9:16' } }, [{ type: 'image', url: '/media/first.png' }], 'image-to-video');
  assert.deepEqual(image.content.map(x => x.role || x.type), ['text', 'first_frame']);

  const frames = mapDesktopXogpuRequest(model, { prompt: 'transition', parameters: { generationMode: 'frame2video', duration: 5, aspectRatio: '1:1' } }, [
    { type: 'image', role: 'first_frame', url: '/media/first.png' },
    { type: 'image', role: 'last_frame', url: '/media/last.png' }
  ], 'first-last-frame');
  assert.deepEqual(frames.content.map(x => x.role || x.type), ['text', 'first_frame', 'last_frame']);

  const omni = mapDesktopXogpuRequest(model, { prompt: '<Picture 1> follows <Video 1>', parameters: { generationMode: 'omni_reference', duration: 10, aspectRatio: '16:9' } }, [
    { type: 'image', url: '/media/picture.png' },
    { type: 'video', duration: 2, url: '/media/video.mp4' },
    { type: 'audio', duration: 2, url: '/media/audio.wav' }
  ], 'reference-to-video');
  assert.deepEqual(omni.content.map(x => x.role || x.type), ['text', 'reference_image', 'reference_video', 'reference_audio']);
});

test('desktop XOGPU validates documented reference duration and per-type counts', () => {
  const model = { id: 'MiniMax-H3' }, task = { prompt: 'omni', parameters: { generationMode: 'omni_reference', duration: 5 } };
  assert.throws(() => mapDesktopXogpuRequest(model, task, [{ type: 'video', duration: 1, url: '/media/short.mp4' }], 'reference-to-video'), /2-15 秒/);
  assert.throws(() => mapDesktopXogpuRequest(model, task, Array.from({ length: 10 }, (_, i) => ({ type: 'image', url: `/media/${i}.png` })), 'reference-to-video'), /最多支持 9 张图片/);
});
'''
if "selected generationMode wins over connected references" not in desktop_test:
    desktop_test += extra
DESKTOP_TEST.write_text(desktop_test, encoding='utf-8')

print('patched XOGPU MiniMax-H3 four-mode request contract')
