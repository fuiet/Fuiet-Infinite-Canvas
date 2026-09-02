from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / '_read_123_zip_20260821_180410' / 'app.js'
BOOTSTRAP = ROOT / '_read_123_zip_20260821_180410' / 'browser-bootstrap.js'


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


app = APP.read_text(encoding='utf-8')

mode_helpers = """  const VIDEO_GENERATION_MODES=Object.freeze([
    Object.freeze({key:'text2video',label:'文生视频'}),
    Object.freeze({key:'image2video',label:'图生视频'}),
    Object.freeze({key:'frame2video',label:'首尾帧'}),
    Object.freeze({key:'omni_reference',label:'全能参考'})
  ]);
  const VIDEO_ASPECT_RATIOS_BY_MODE=Object.freeze({
    text2video:Object.freeze(['16:9','9:16','1:1','4:3','3:4','21:9']),
    image2video:Object.freeze(['16:9','9:16','1:1','4:3','3:4','21:9']),
    frame2video:Object.freeze(['16:9','9:16','1:1','4:3','3:4','21:9']),
    omni_reference:Object.freeze(['16:9','9:16','1:1','4:3','3:4','21:9'])
  });
  function normalizeVideoModeKey(value){
    const v=String(value||'').trim().toLowerCase();
    if(!v)return '';
    if(['text2video','text-video','text_video','文生视频','文生'].includes(v))return 'text2video';
    if(['image2video','image-video','image_video','图生视频','图生'].includes(v))return 'image2video';
    if(['frame2video','first_last','first-last','首帧 / 末帧','首帧末帧','首尾帧','首帧视频','末帧视频'].includes(v))return 'frame2video';
    if(['omni_reference','omni-reference','omni','multimodal','multi-modal','全能参考','多模态','多模态视频','audio2video','audio-video','audio_video','音频生视频','音频生'].includes(v))return 'omni_reference';
    return '';
  }
  function videoModeOptions(){return VIDEO_GENERATION_MODES.map(item=>({...item}))}
  function videoModeLabel(mode){
    const key=normalizeVideoModeKey(mode)||'text2video';
    return VIDEO_GENERATION_MODES.find(item=>item.key===key)?.label||'文生视频';
  }
  function videoAspectRatiosForMode(mode){
    const key=normalizeVideoModeKey(mode)||'text2video';
    return [...(VIDEO_ASPECT_RATIOS_BY_MODE[key]||VIDEO_ASPECT_RATIOS_BY_MODE.text2video)];
  }
  function videoReferencesForMode(n,refs=[]){
    const mode=normalizeVideoModeKey(n?.videoMode||'text2video')||'text2video',list=Array.isArray(refs)?refs.filter(Boolean):[];
    if(mode==='text2video')return [];
    if(mode==='image2video')return list.filter(ref=>String(ref?.type||'').toLowerCase()==='image');
    if(mode==='frame2video')return list.filter(ref=>{
      const role=String(ref?.role||'').toLowerCase();
      return String(ref?.type||'').toLowerCase()==='image'&&(role==='first_frame'||role==='last_frame');
    });
    return list;
  }
  function syncVideoNodeCapabilities(n,caps){
    if(!n||n.type!=='video')return;
    n.videoMode=normalizeVideoModeKey(n.videoMode)||'text2video';
    const durations=(caps.durations||[]).map(Number).filter(Number.isFinite);
    if(durations.length&&!durations.includes(Number(n.duration)))n.duration=durations[0];
    const resolutions=(caps.resolutions||[]).map(String).filter(Boolean);
    if(resolutions.length&&!resolutions.includes(String(n.resolution||'')))n.resolution=resolutions[0];
    const aspectRatios=videoAspectRatiosForMode(n.videoMode);
    if(!aspectRatios.includes(String(n.aspectRatio||'')))n.aspectRatio=aspectRatios[0];
  }
  function defaultVideoModeForSource(source,params={},targetType='video'){
"""
app = regex_once(
    app,
    r"  function normalizeVideoModeKey\(value\)\{.*?  function defaultVideoModeForSource\(source,params=\{\},targetType='video'\)\{\n",
    mode_helpers,
    'replace video mode helpers',
)

app = regex_once(
    app,
    r"    if\(targetType!=='video'\)return '';\n    const explicit=normalizeVideoModeKey\(params\.generationMode\|\|params\.videoMode\|\|''\);\n    if\(explicit\)return explicit;\n    const op=String\(params\.operation\|\|params\.tool\|\|''\)\.toLowerCase\(\);\n    if\(source\?\.type==='audio'\|\|/audio\|voice\|speech/\.test\(op\)\)return 'audio2video';\n    if\(source\?\.type==='image'\|\|/image\|reference\|first_frame\|last_frame\|frame/\.test\(op\)\)return 'image2video';\n    return 'text2video';\n  \}",
    """    if(targetType!=='video')return '';
    const explicit=normalizeVideoModeKey(params.generationMode||params.videoMode||'');
    if(explicit)return explicit;
    const op=String(params.operation||params.tool||'').toLowerCase();
    if(/first_frame|last_frame|first-last|frame2video/.test(op))return 'frame2video';
    if(source?.type==='audio'||source?.type==='video'||/audio|voice|speech|video_reference|motion_reference|multimodal|omni/.test(op))return 'omni_reference';
    if(source?.type==='image'||/image|reference/.test(op))return 'image2video';
    return 'text2video';
  }""",
    'replace default video mode inference',
)

app = replace_once(
    app,
    "const ratios=caps.aspectRatios||['16:9','9:16','1:1'],durations=caps.durations||[4,5,10],resolutions=caps.resolutions||['720p'],videoModes=videoModeOptions(caps);",
    "const ratios=n.type==='video'?videoAspectRatiosForMode(n.videoMode):(caps.aspectRatios||['16:9','9:16','1:1']),durations=caps.durations||[4,5,10],resolutions=caps.resolutions||['720p'],videoModes=videoModeOptions();",
    'use fixed video ratios in generator',
)

app = replace_once(
    app,
    "$('#videoModeSelect')?.addEventListener('change',e=>{n.videoMode=normalizeVideoModeKey(e.target.value);saveState();renderGenerator()});",
    "$('#videoModeSelect')?.addEventListener('change',e=>{n.videoMode=normalizeVideoModeKey(e.target.value)||'text2video';const allowed=videoAspectRatiosForMode(n.videoMode);if(!allowed.includes(String(n.aspectRatio||'')))n.aspectRatio=allowed[0];saveState();renderGenerator()});",
    'resync ratio when generator mode changes',
)

app = replace_once(
    app,
    "const refs=collectReferences(n.id),caps=modelOverride?.model?modelCapabilitiesFor(n.type,modelOverride.provider,modelOverride.model):modelCapabilities(n),warnings=[],errors=[];",
    "const allRefs=collectReferences(n.id),refs=n.type==='video'?videoReferencesForMode(n,allRefs):allRefs,caps=modelOverride?.model?modelCapabilitiesFor(n.type,modelOverride.provider,modelOverride.model):modelCapabilities(n),warnings=[],errors=[];",
    'filter references by video mode',
)

old_video_validation = """    if(n.type==='video'){
      const currentMode=normalizeVideoModeKey(n.videoMode||'text2video'),allowedModes=videoModeOptions(caps).map(x=>x.key);
      if(allowedModes.length&&currentMode&&!allowedModes.includes(currentMode))errors.push(`当前视频模型不支持 ${videoModeLabel(currentMode)}`);
      if((byRole.first_frame||[]).length&&caps.supportsFirstFrame===false)errors.push('当前视频模型不支持首帧输入');
      if((byRole.last_frame||[]).length&&caps.supportsLastFrame===false)errors.push('当前视频模型不支持尾帧输入');
      if((byRole.video_reference||[]).length+(byRole.motion_reference||[]).length>0&&caps.supportsVideoReference===false)errors.push('当前视频模型不支持参考视频 / 运镜参考');
      if((byRole.audio_reference||[]).length+(byRole.voice_reference||[]).length>0&&caps.supportsAudioReference===false)errors.push('当前视频模型不支持音频参考');
    }
"""
new_video_validation = """    if(n.type==='video'){
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
app = replace_once(app, old_video_validation, new_video_validation, 'replace video mode validation')

app = replace_once(
    app,
    "aspectRatio:n.aspectRatio||caps.aspectRatios?.[0]||'16:9'",
    "aspectRatio:n.aspectRatio||(n.type==='video'?videoAspectRatiosForMode(n.videoMode)[0]:caps.aspectRatios?.[0])||'16:9'",
    'use fixed task video ratio fallback',
)

app = replace_once(
    app,
    "capabilities:caps,creativeContext:buildCreativeContextPacket(n),...(n.toolParams||{})",
    "capabilities:caps,creativeContext:buildCreativeContextPacket(n),...(n.toolParams||{}),...(n.type==='video'?{videoMode:normalizeVideoModeKey(n.videoMode)||'text2video',generationMode:normalizeVideoModeKey(n.videoMode)||'text2video'}:{})",
    'send selected video mode to task runtime',
)

app = replace_once(
    app,
    "const modes=videoModeOptions(caps);const activeMode=normalizeVideoModeKey(n.videoMode||modes[0]?.key||'text2video');",
    "const modes=videoModeOptions(),activeMode=normalizeVideoModeKey(n.videoMode||modes[0]?.key||'text2video')||'text2video',studioRatios=videoAspectRatiosForMode(activeMode);",
    'use fixed modes in video studio',
)

app = replace_once(
    app,
    "<select id=\"videoStudioRatio\">${optionList(caps.aspectRatios,n.aspectRatio||caps.aspectRatios?.[0])}</select>",
    "<select id=\"videoStudioRatio\">${optionList(studioRatios,n.aspectRatio||studioRatios[0])}</select>",
    'use fixed ratios in video studio',
)

app = replace_once(
    app,
    "$('#videoStudioMode').onchange=e=>{n.videoMode=normalizeVideoModeKey(e.target.value);saveState()};",
    "$('#videoStudioMode').onchange=e=>{n.videoMode=normalizeVideoModeKey(e.target.value)||'text2video';const allowed=videoAspectRatiosForMode(n.videoMode);if(!allowed.includes(String(n.aspectRatio||'')))n.aspectRatio=allowed[0];saveState();openVideoStudio(n)};",
    'resync ratio when studio mode changes',
)

app = replace_once(
    app,
    "video.title='全能参考生视频';video.prompt='使用首帧参考图和剧情描述生成完整视频，保持动作和镜头连续。';\n          video.videoMode='frame2video';",
    "video.title='全能参考生视频';video.prompt='使用首帧参考图和剧情描述生成完整视频，保持动作和镜头连续。';\n          video.videoMode='omni_reference';",
    'route reference-video shortcut to omni mode',
)

app = replace_once(
    app,
    "video.videoMode='audio2video';",
    "video.videoMode='omni_reference';",
    'route legacy audio-video shortcut to omni mode',
)

APP.write_text(app, encoding='utf-8')

bootstrap = BOOTSTRAP.read_text(encoding='utf-8')
bootstrap = regex_once(
    bootstrap,
    r"const v='[^']+';",
    "const v='20260902-video-generation-modes-1';",
    'bump browser cache version',
)
BOOTSTRAP.write_text(bootstrap, encoding='utf-8')

print('patched video generation modes, ratios, references and task parameters')
