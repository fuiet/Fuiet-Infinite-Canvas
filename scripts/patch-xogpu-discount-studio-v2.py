from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'_read_123_zip_20260821_180410'
PROTOCOL=APP/'video-protocol-registry.js'
ADAPTER=APP/'provider-adapter-contract.js'
PREVIEW=APP/'browser-runtime-preview.js'
SERVER=APP/'server.js'
DESKTOP=APP/'desktop-video-protocol-bridge.cjs'
UPSTREAM=APP/'upstream-generation-inputs-v1.js'
BOOTSTRAP=APP/'browser-bootstrap.js'
ROUTER=APP/'browser-runtime.js'
XOGPU_TEST=APP/'tests'/'xogpu-minimax-h3.test.mjs'
DESKTOP_TEST=APP/'tests'/'desktop-video-protocol-bridge.test.mjs'
CONTRACT_TEST=APP/'tests'/'xogpu-discount-studio-contract.test.mjs'


def once(text, old, new, label):
    n=text.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, found {n}')
    return text.replace(old,new,1)

def regex_once(text, pattern, replacement, label):
    out,n=re.subn(pattern,lambda m:replacement,text,count=1,flags=re.S)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, found {n}')
    return out

# ---------------------------------------------------------------------------
# Shared protocol: media references MUST use discount-video-studio multipart.
# Connected media beats an accidental text2video selection so it cannot be lost.
# ---------------------------------------------------------------------------
protocol=PROTOCOL.read_text(encoding='utf-8')
protocol=regex_once(protocol,r"function detectOperation\(\{references=\[\],parameters=\{\}\}=\{\}\)\{.*?\n\}\nconst COMMON_TASK_IDS=",'''function detectOperation({references=[],parameters={}}={}){
  const raw=String(parameters.generationMode||parameters.videoMode||parameters.operation||parameters.videoOperation||'').trim().toLowerCase();
  const aliases={
    'text2video':'text-to-video','t2v':'text-to-video','text_to_video':'text-to-video','text-video':'text-to-video','文生视频':'text-to-video',
    'image2video':'image-to-video','i2v':'image-to-video','image_to_video':'image-to-video','image-video':'image-to-video','图生视频':'image-to-video',
    'frame2video':'first-last-frame','first-last-frame':'first-last-frame','first_last_frame':'first-last-frame','首尾帧':'first-last-frame',
    'omni_reference':'reference-to-video','omni-reference':'reference-to-video','omni':'reference-to-video','multimodal':'reference-to-video','multi-modal':'reference-to-video','reference2video':'reference-to-video','reference_to_video':'reference-to-video','ref2video':'reference-to-video','audio2video':'reference-to-video','全能参考':'reference-to-video','多模态':'reference-to-video'
  };
  const explicit=aliases[raw]||raw,refs=Array.isArray(references)?references:[];
  const media=refs.filter(r=>['image','video','audio'].includes(String(r?.type||r?.kind||'').toLowerCase())||/frame|image|picture|video|motion|audio|voice|sound/.test(String(r?.role||r?.semanticRole||'').toLowerCase()));
  const images=media.filter(r=>String(r?.type||r?.kind||'').toLowerCase()==='image'||/frame|image|picture/.test(String(r?.role||r?.semanticRole||'').toLowerCase()));
  const hasVideoAudio=media.some(r=>['video','audio'].includes(String(r?.type||r?.kind||'').toLowerCase()));
  const hasLast=images.some(r=>/last/.test(String(r?.role||r?.semanticRole||'').toLowerCase()));
  if(explicit&&explicit!=='text-to-video'&&!['generate','generation','video','video-generation','video_generation'].includes(explicit))return explicit;
  if(hasLast)return'first-last-frame';
  if(hasVideoAudio||images.length>1)return'reference-to-video';
  if(images.length)return'image-to-video';
  if(explicit==='text-to-video')return'text-to-video';
  return'text-to-video';
}
const COMMON_TASK_IDS=''', 'make connected media authoritative')

protocol=regex_once(protocol,r"function xogpuVideoProfile\(provider,model,operation\)\{.*?\n\}\nfunction xogpuMediaReference",'''function xogpuVideoProfile(provider,model,operation){
  const host=hostOf(provider),hint=hintOf(model);if(!((host==='xogpu.com'||host.endsWith('.xogpu.com'))&&/minimax[-_. ]?h3|\\bh3\\b/.test(hint)))return null;
  const base=genericProfile('xogpu-minimax-h3'),media=operation!=='text-to-video';
  return{...base,profile:'xogpu:minimax-h3',createPath:media?'/api/user/discount-video-studio/jobs':'/v1/videos',createCandidates:[media?'/api/user/discount-video-studio/jobs':'/v1/videos'],pollPath:'/v1/videos/{{taskId}}',pollPathCandidates:['/v1/videos/{{taskId}}','/api/user/discount-video-studio/jobs/{{taskId}}'],strictPollPath:true,strictCreatePath:true,taskIdPath:'id',taskIdPaths:['id','task_id','taskId',...COMMON_TASK_IDS],statusPath:'status',statusPaths:['status',...COMMON_STATUS],progressPath:'progress',progressPaths:['progress',...COMMON_PROGRESS],outputPath:'',outputPaths:[],contentPath:'/v1/videos/{{taskId}}/content',contentPathCandidates:['/v1/videos/{{taskId}}/content'],requestTransport:media?'multipart':'json',strictMediaTransport:media,noJsonFallback:media,referenceTransport:'auto',allowOutputWithoutTerminalStatus:false,pollIntervalMs:15000,timeoutMs:3600000,videoOperation:operation};
}
function xogpuMediaReference''','route XOGPU media to studio multipart')

new_mapper='''function xogpuStudioSize(ratio,p={}){
  const valid=new Set(['1280x720','720x1280','1024x1024','1024x768','768x1024','1792x768']),explicit=String(p.size||'').trim();if(valid.has(explicit))return explicit;
  return({'16:9':'1280x720','9:16':'720x1280','1:1':'1024x1024','4:3':'1024x768','3:4':'768x1024','21:9':'1792x768'})[ratio]||'1280x720';
}
function mapXogpuVideoRequest(model={},task={},refs=[],operation='generate'){
  const p={...(task.parameters||{})},prompt=String(task.prompt||'').trim();
  if(!prompt)throw new Error('XOGPU MiniMax-H3 必须填写 prompt');
  if(prompt.length>7000)throw new Error('XOGPU MiniMax-H3 prompt 最长 7000 字符');
  const list=Array.isArray(refs)?refs:[],inferred=detectOperation({references:list,parameters:p});
  const aliases={'text2video':'text-to-video','image2video':'image-to-video','frame2video':'first-last-frame','omni_reference':'reference-to-video','reference2video':'reference-to-video','audio2video':'reference-to-video'};
  const raw=String(operation||'').trim().toLowerCase(),normalized=aliases[raw]||raw;
  let mode=['text-to-video','image-to-video','first-last-frame','reference-to-video'].includes(normalized)?normalized:inferred;
  const entries=list.map((r,index)=>{const type=String(r?.type||r?.kind||'').toLowerCase(),role=String(r?.role||r?.semanticRole||'').toLowerCase(),url=String(r?.url||r?.value||r?.outputUrl||'').trim();let kind='';if(type==='image'||/image|frame|picture/.test(role))kind='image';else if(type==='video'||/video|motion/.test(role))kind='video';else if(type==='audio'||/audio|voice|sound/.test(role))kind='audio';return{r,index,type:kind,role,url}}).filter(x=>x.type&&x.url);
  if(mode==='text-to-video'&&entries.length)mode=inferred;
  const images=entries.filter(x=>x.type==='image'),videos=entries.filter(x=>x.type==='video'),audios=entries.filter(x=>x.type==='audio');
  if(images.length>9)throw new Error('XOGPU MiniMax-H3 最多支持 9 张图片');
  if(videos.length>3)throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考视频');
  if(audios.length>3)throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考音频');
  if(entries.length>12)throw new Error('XOGPU MiniMax-H3 全部参考媒体合计最多 12 个');
  for(const item of [...videos,...audios]){const seconds=Number(item.r?.duration??item.r?.seconds??item.r?.metadata?.duration);if(Number.isFinite(seconds)&&(seconds<2||seconds>15))throw new Error(`XOGPU MiniMax-H3 的${item.type==='video'?'参考视频':'参考音频'}必须为 2-15 秒`)}
  const duration=Math.max(1,Math.min(15,Math.round(Number(p.duration??p.seconds??5)||5))),allowed=['16:9','9:16','1:1','4:3','3:4','21:9','adaptive'];
  const hasVisual=images.length>0||videos.length>0;let ratio=String(p.ratio||p.aspectRatio||p.aspect_ratio||(mode==='text-to-video'?'16:9':hasVisual?'adaptive':'16:9')).trim().toLowerCase();if(!allowed.includes(ratio))ratio=mode==='text-to-video'?'16:9':hasVisual?'adaptive':'16:9';if(ratio==='adaptive'&&!hasVisual)ratio='16:9';
  if(mode==='text-to-video')return{model:'MiniMax-H3',prompt,duration,ratio,group:'discount_video_generation'};
  if(mode==='image-to-video'&&(images.length!==1||videos.length||audios.length))throw new Error('XOGPU MiniMax-H3 图生视频必须且只能上传 1 张首帧图片');
  if(mode==='first-last-frame'&&(images.length!==2||videos.length||audios.length))throw new Error('XOGPU MiniMax-H3 首尾帧模式必须上传 2 张图片');
  if(mode==='reference-to-video'&&!entries.length)throw new Error('XOGPU MiniMax-H3 多模态参考至少需要 1 个媒体素材');
  const studioMode=mode==='image-to-video'?'image':mode==='first-last-frame'?'frames':'multi';
  return{model:'MiniMax-H3',prompt,seconds:duration,size:xogpuStudioSize(ratio,p),metadata:JSON.stringify({mode:studioMode,ratio})};
}
'''
protocol=regex_once(protocol,r"function mapXogpuVideoRequest\(model=\{\},task=\{\},refs=\[\],operation='generate'\)\{.*?\n\}\nfunction agnesVideoProfile",new_mapper+'function agnesVideoProfile','replace XOGPU request mapper')
PROTOCOL.write_text(protocol,encoding='utf-8')

# ---------------------------------------------------------------------------
# Known model route: per-operation paths override the legacy static /v1/videos.
# ---------------------------------------------------------------------------
adapter=ADAPTER.read_text(encoding='utf-8')
needle="videoProtocolFamily:'xogpu-minimax-h3',referenceTransport:'url',capabilities:"
replacement="videoProtocolFamily:'xogpu-minimax-h3',referenceTransport:'auto',operationRoutes:{'text-to-video':{createPath:'/v1/videos',requestTransport:'json'},'image-to-video':{createPath:'/api/user/discount-video-studio/jobs',requestTransport:'multipart',strictCreatePath:true,strictMediaTransport:true,noJsonFallback:true},'first-last-frame':{createPath:'/api/user/discount-video-studio/jobs',requestTransport:'multipart',strictCreatePath:true,strictMediaTransport:true,noJsonFallback:true},'reference-to-video':{createPath:'/api/user/discount-video-studio/jobs',requestTransport:'multipart',strictCreatePath:true,strictMediaTransport:true,noJsonFallback:true}},capabilities:"
adapter=once(adapter,needle,replacement,'install XOGPU operation routes')
ADAPTER.write_text(adapter,encoding='utf-8')

# ---------------------------------------------------------------------------
# Browser preview: upload real Blob/File parts and NEVER fall back to JSON when
# XOGPU has media. This is the main fix for silently ignored image/video refs.
# ---------------------------------------------------------------------------
preview=PREVIEW.read_text(encoding='utf-8')
preview=regex_once(preview,r"function xogpuStrictVideoBody\(body=\{\},route=\{\}\)\{.*?\n\}\nfunction mergeUpstreamReferenceText",'''function xogpuStrictVideoBody(body={},route={}){
  const family=String(route?.protocolFamily||route?.family||'').trim().toLowerCase();if(family!=='xogpu-minimax-h3')return body;
  const src=body&&typeof body==='object'?body:{},duration=Math.max(1,Math.min(15,Math.round(Number(src.duration)||5))),allowed=['16:9','9:16','1:1','4:3','3:4','21:9'];let ratio=String(src.ratio||'16:9');if(!allowed.includes(ratio))ratio='16:9';
  return{model:'MiniMax-H3',prompt:String(src.prompt||''),duration,ratio,group:'discount_video_generation'};
}
function mergeUpstreamReferenceText''','remove XOGPU JSON media content')

browser_form='''function xogpuRefEntry(ref,index){const type=String(ref?.type||ref?.kind||'').toLowerCase(),role=String(ref?.role||ref?.semanticRole||'').toLowerCase(),url=String(ref?.url||ref?.outputUrl||ref?.value||'').trim();let kind='';if(type==='image'||/image|frame|picture/.test(role))kind='image';else if(type==='video'||/video|motion/.test(role))kind='video';else if(type==='audio'||/audio|voice|sound/.test(role))kind='audio';return{ref,index,type:kind,role,url}}
function xogpuRatioSize(ratio,p={}){const explicit=String(p.size||'').trim(),valid=['1280x720','720x1280','1024x1024','1024x768','768x1024','1792x768'];if(valid.includes(explicit))return explicit;return({'16:9':'1280x720','9:16':'720x1280','1:1':'1024x1024','4:3':'1024x768','3:4':'768x1024','21:9':'1792x768'})[ratio]||'1280x720'}
function xogpuFilename(kind,index,blob){const map={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif','video/mp4':'mp4','video/quicktime':'mov','audio/mpeg':'mp3','audio/wav':'wav','audio/x-wav':'wav'};return`${kind}-${index+1}.${map[String(blob?.type||'').toLowerCase()]||(kind==='image'?'png':kind==='video'?'mp4':'wav')}`}
async function appendXogpuPart(form,field,entry,limits,total){const blob=await referenceBlob(entry.url);if(!blob)throw new Error(`参考${entry.type==='image'?'图片':entry.type==='video'?'视频':'音频'}无法读取，已阻止无参考素材提交`);const max=entry.type==='image'?10*1024*1024:entry.type==='video'?48*1024*1024:20*1024*1024;if(blob.size>max)throw new Error(`XOGPU ${entry.type==='image'?'图片':entry.type==='video'?'视频':'音频'}单文件超过限制`);total.bytes+=blob.size;if(total.bytes>120*1024*1024)throw new Error('XOGPU 参考媒体总大小超过 120 MiB');form.append(field,blob,xogpuFilename(entry.type,entry.index,blob));total.files+=1;if(total.files>12)throw new Error('XOGPU 参考媒体合计最多 12 个文件')}
async function buildXogpuDiscountVideoForm(model,task,refs,route){const p=VideoParams?.normalize?.(task.parameters||{})||task.parameters||{},entries=(Array.isArray(refs)?refs:[]).map(xogpuRefEntry).filter(x=>x.type&&x.url),images=entries.filter(x=>x.type==='image'),videos=entries.filter(x=>x.type==='video'),audios=entries.filter(x=>x.type==='audio');if(images.length>9||videos.length>3||audios.length>3||entries.length>12)throw new Error('XOGPU 参考素材数量超过文档限制');let op=String(route?.videoOperation||'').toLowerCase();if(op==='image2video')op='image-to-video';if(op==='reference2video')op='reference-to-video';if(op==='frame2video')op='first-last-frame';if(op==='text-to-video'&&entries.length)op=videos.length||audios.length||images.length>1?'reference-to-video':'image-to-video';const hasVisual=images.length||videos.length;let ratio=String(p.ratio||p.aspectRatio||p.aspect_ratio||(hasVisual?'adaptive':'16:9')).toLowerCase();if(!['16:9','9:16','1:1','4:3','3:4','21:9','adaptive'].includes(ratio))ratio=hasVisual?'adaptive':'16:9';if(ratio==='adaptive'&&!hasVisual)ratio='16:9';const mode=op==='image-to-video'?'image':op==='first-last-frame'?'frames':'multi';if(mode==='image'&&(images.length!==1||videos.length||audios.length))throw new Error('图生视频必须且只能提供 1 张图片');if(mode==='frames'&&(images.length!==2||videos.length||audios.length))throw new Error('首尾帧模式必须提供 2 张图片');if(mode==='multi'&&!entries.length)throw new Error('多模态参考至少需要 1 个媒体素材');const form=new FormData(),seconds=Math.max(1,Math.min(15,Math.round(Number(p.duration??p.seconds??5)||5)));form.append('model','MiniMax-H3');form.append('prompt',String(task.prompt||''));form.append('seconds',String(seconds));form.append('size',xogpuRatioSize(ratio,p));form.append('metadata',JSON.stringify({mode,ratio}));const total={bytes:0,files:0};if(mode==='image'){await appendXogpuPart(form,'input_reference',images[0],null,total)}else if(mode==='frames'){const first=images.find(x=>/first/.test(x.role))||images[0],last=images.find(x=>/last/.test(x.role))||images.find(x=>x!==first);await appendXogpuPart(form,'input_reference',first,null,total);await appendXogpuPart(form,'end_reference',last,null,total)}else{if(images[0])await appendXogpuPart(form,'input_reference',images[0],null,total);for(const x of images.slice(1))await appendXogpuPart(form,'reference_images',x,null,total);for(const x of videos)await appendXogpuPart(form,'reference_videos',x,null,total);for(const x of audios)await appendXogpuPart(form,'reference_audios',x,null,total)}if(total.files!==entries.length)throw new Error('参考素材未全部写入 multipart，请求已阻止');return form}
async function buildStandardVideoForm(model,task,refs,route={}){if(String(route?.protocolFamily||route?.family||'').toLowerCase()==='xogpu-minimax-h3'&&String(route?.requestTransport||'').toLowerCase()==='multipart')return buildXogpuDiscountVideoForm(model,task,refs,route);const p=VideoParams?.normalize?.(task.parameters||{})||task.parameters||{},form=new FormData();form.append('model',String(model.id||''));form.append('prompt',String(task.prompt||''));if(p.seconds)form.append('seconds',String(p.seconds));if(p.size)form.append('size',String(p.size));const first=refs.find(r=>['first_frame','image','image_reference'].includes(r.role)||r.type==='image');if(first?.url){const blob=await referenceBlob(first.url);if(!blob)throw new Error('首帧/参考图无法读取，无法提交图生视频');if(blob.size>25*1024*1024)throw new Error('首帧/参考图超过 25MB，在线预览暂不支持');form.append('input_reference',blob,'input-reference.'+((blob.type||'image/png').split('/')[1]||'png'))}return form}
'''
preview=regex_once(preview,r"async function buildStandardVideoForm\(model,task,refs\)\{.*?\}\nfunction autoVideoRoute",browser_form+'function autoVideoRoute','install XOGPU multipart form builder')
preview=once(preview,"const first=String(route.createPath||'/v1/videos'),profile=Array.isArray(route.createCandidates)?route.createCandidates:[];if(!autoVideoRoute(model,route))return[first];","const first=String(route.createPath||'/v1/videos'),profile=Array.isArray(route.createCandidates)?route.createCandidates:[];if(route?.strictCreatePath||!autoVideoRoute(model,route))return[first];",'protect strict XOGPU create path')
preview=once(preview,'const form=await buildStandardVideoForm(model,task,refs);','const form=await buildStandardVideoForm(model,task,refs,route);','pass route to video multipart builder')
preview=once(preview,"if(!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;\n              lastCreateError=error;","if(route.noJsonFallback||route.strictMediaTransport||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;\n              lastCreateError=error;",'forbid media-to-json fallback')
PREVIEW.write_text(preview,encoding='utf-8')

# ---------------------------------------------------------------------------
# Desktop bridge maps to the same documented studio envelope. Media bytes are
# appended by server.js, not embedded as content[].
# ---------------------------------------------------------------------------
desktop=DESKTOP.read_text(encoding='utf-8')
desktop=regex_once(desktop,r"function operationFromReferences\(refs = \[\], parameters = \{\}\) \{.*?\n\}\n\nfunction isXogpuMiniMaxH3",'''function operationFromReferences(refs = [], parameters = {}) {
  const raw=String(parameters.generationMode||parameters.videoMode||parameters.operation||parameters.videoOperation||'').trim().toLowerCase(),aliases={text2video:'text-to-video',image2video:'image-to-video',frame2video:'first-last-frame','first-last-frame':'first-last-frame',omni_reference:'reference-to-video',reference2video:'reference-to-video',audio2video:'reference-to-video'};
  const explicit=aliases[raw]||raw,list=Array.isArray(refs)?refs:[],images=list.filter(r=>String(r?.type||r?.kind||'').toLowerCase()==='image'||/frame|image|picture/.test(String(r?.role||r?.semanticRole||'').toLowerCase())),videoAudio=list.some(r=>['video','audio'].includes(String(r?.type||r?.kind||'').toLowerCase()));
  if(explicit&&explicit!=='text-to-video'&&!['generate','generation','video','video-generation','video_generation'].includes(explicit))return explicit;
  if(images.some(r=>/last/.test(String(r?.role||r?.semanticRole||'').toLowerCase())))return'first-last-frame';if(videoAudio||images.length>1)return'reference-to-video';if(images.length)return'image-to-video';return'text-to-video';
}

function isXogpuMiniMaxH3''','desktop operation inference')

desktop_mapper='''function desktopXogpuSize(ratio,p={}){const valid=new Set(['1280x720','720x1280','1024x1024','1024x768','768x1024','1792x768']),explicit=String(p.size||'').trim();if(valid.has(explicit))return explicit;return({'16:9':'1280x720','9:16':'720x1280','1:1':'1024x1024','4:3':'1024x768','3:4':'768x1024','21:9':'1792x768'})[ratio]||'1280x720'}
function mapDesktopXogpuRequest(model = {}, task = {}, refs = [], operation = 'generate') {
  const p={...(task.parameters||{})},prompt=String(task.prompt||'').trim();if(!prompt)throw new Error('XOGPU MiniMax-H3 必须填写 prompt');if(prompt.length>7000)throw new Error('XOGPU MiniMax-H3 prompt 最长 7000 字符');const entries=(Array.isArray(refs)?refs:[]).map(classifyReference).filter(x=>x.type&&x.url),images=entries.filter(x=>x.type==='image'),videos=entries.filter(x=>x.type==='video'),audios=entries.filter(x=>x.type==='audio');let mode=operationFromReferences(refs,{...p,operation});if(mode==='text-to-video'&&entries.length)mode=videos.length||audios.length||images.length>1?'reference-to-video':'image-to-video';if(images.length>9||videos.length>3||audios.length>3||entries.length>12)throw new Error('XOGPU MiniMax-H3 参考素材数量超过限制');const seconds=Math.max(1,Math.min(15,Math.round(Number(p.duration??p.seconds??5)||5))),hasVisual=images.length||videos.length;let ratio=String(p.ratio||p.aspectRatio||p.aspect_ratio||(mode==='text-to-video'?'16:9':hasVisual?'adaptive':'16:9')).toLowerCase();if(!['16:9','9:16','1:1','4:3','3:4','21:9','adaptive'].includes(ratio))ratio=hasVisual?'adaptive':'16:9';if(ratio==='adaptive'&&!hasVisual)ratio='16:9';if(mode==='text-to-video')return{model:'MiniMax-H3',prompt,duration:seconds,ratio,group:'discount_video_generation'};const studioMode=mode==='image-to-video'?'image':mode==='first-last-frame'?'frames':'multi';return{model:'MiniMax-H3',prompt,seconds,size:desktopXogpuSize(ratio,p),metadata:JSON.stringify({mode:studioMode,ratio})};
}
'''
desktop=regex_once(desktop,r"function mapDesktopXogpuRequest\(model = \{\}, task = \{\}, refs = \[\], operation = 'generate'\) \{.*?\n\}\n\nfunction installDesktopVideoProtocolBridge",desktop_mapper+'\nfunction installDesktopVideoProtocolBridge','desktop studio envelope')
DESKTOP.write_text(desktop,encoding='utf-8')

# ---------------------------------------------------------------------------
# Desktop/server runtime: build multipart with actual local/remote bytes.
# ---------------------------------------------------------------------------
server=SERVER.read_text(encoding='utf-8')
server_helpers=r'''function xogpuServerRef(ref,index){const type=String(ref?.type||ref?.kind||'').toLowerCase(),role=String(ref?.role||ref?.semanticRole||'').toLowerCase(),url=String(ref?.url||ref?.outputUrl||ref?.value||'').trim();let kind='';if(type==='image'||/image|frame|picture/.test(role))kind='image';else if(type==='video'||/video|motion/.test(role))kind='video';else if(type==='audio'||/audio|voice|sound/.test(role))kind='audio';return{ref,index,type:kind,role,url}}
function decodeDataReference(value){const m=String(value||'').match(/^data:([^;,]+)?(;base64)?,(.*)$/is);if(!m)return null;return{mime:String(m[1]||'application/octet-stream').toLowerCase(),buffer:m[2]?Buffer.from(m[3]||'','base64'):Buffer.from(decodeURIComponent(m[3]||''),'utf8')}}
async function serverReferenceBlob(entry){const local=localVideoMediaReference(entry.url);if(local){const file=mediaPathFromUrl(local),buffer=fs.readFileSync(file);return{blob:new Blob([buffer],{type:localMediaMime(file)}),name:path.basename(file),file}}const data=decodeDataReference(entry.url);if(data)return{blob:new Blob([data.buffer],{type:data.mime}),name:`reference_${entry.index}${safeExt('',data.mime)}`,file:''};if(/^https?:\/\//i.test(entry.url)){const res=await fetchSafe(entry.url,{method:'GET',timeoutMs:90000},{},{sameOrigin:false});if(!res.ok)throw new Error(`参考素材下载失败 ${res.status}`);const buffer=Buffer.from(await res.arrayBuffer()),mime=String(res.headers.get('content-type')||'application/octet-stream').split(';')[0];return{blob:new Blob([buffer],{type:mime}),name:`reference_${entry.index}${safeExt(new URL(entry.url).pathname,mime)}`,file:''}}throw new Error('参考素材不是可读取的本地媒体、Data URL 或公网 URL')}
async function appendServerXogpuPart(form,field,entry,total){const part=await serverReferenceBlob(entry),size=part.blob.size,max=entry.type==='image'?10*1024*1024:entry.type==='video'?48*1024*1024:20*1024*1024;if(size>max)throw new Error(`XOGPU ${entry.type==='image'?'图片':entry.type==='video'?'视频':'音频'}单文件超过限制`);if(part.file&&['video','audio'].includes(entry.type)){try{const info=await probeMediaFile(part.file);if(info.duration&&(info.duration<2||info.duration>15))throw new Error(`XOGPU 参考${entry.type==='video'?'视频':'音频'}时长必须为 2-15 秒`)}catch(error){if(/时长必须/.test(String(error?.message||'')))throw error}}total.bytes+=size;total.files+=1;if(total.bytes>120*1024*1024)throw new Error('XOGPU 参考媒体总大小超过 120 MiB');if(total.files>12)throw new Error('XOGPU 参考媒体合计最多 12 个文件');form.append(field,part.blob,part.name)}
async function buildServerXogpuForm(body,refs,operation){const entries=(Array.isArray(refs)?refs:[]).map(xogpuServerRef).filter(x=>x.type&&x.url),images=entries.filter(x=>x.type==='image'),videos=entries.filter(x=>x.type==='video'),audios=entries.filter(x=>x.type==='audio');if(images.length>9||videos.length>3||audios.length>3||entries.length>12)throw new Error('XOGPU 参考素材数量超过文档限制');let metadata={};try{metadata=typeof body.metadata==='string'?JSON.parse(body.metadata):body.metadata||{}}catch{}const mode=String(metadata.mode|| (operation==='image-to-video'?'image':operation==='first-last-frame'?'frames':'multi'));if(mode==='image'&&(images.length!==1||videos.length||audios.length))throw new Error('图生视频必须且只能提供 1 张图片');if(mode==='frames'&&(images.length!==2||videos.length||audios.length))throw new Error('首尾帧模式必须提供 2 张图片');if(mode==='multi'&&!entries.length)throw new Error('多模态参考至少需要 1 个媒体素材');const form=new FormData();for(const key of ['model','prompt','seconds','size','metadata'])if(body[key]!==undefined)form.append(key,String(body[key]));const total={bytes:0,files:0};if(mode==='image'){await appendServerXogpuPart(form,'input_reference',images[0],total)}else if(mode==='frames'){const first=images.find(x=>/first/.test(x.role))||images[0],last=images.find(x=>/last/.test(x.role))||images.find(x=>x!==first);await appendServerXogpuPart(form,'input_reference',first,total);await appendServerXogpuPart(form,'end_reference',last,total)}else{if(images[0])await appendServerXogpuPart(form,'input_reference',images[0],total);for(const x of images.slice(1))await appendServerXogpuPart(form,'reference_images',x,total);for(const x of videos)await appendServerXogpuPart(form,'reference_videos',x,total);for(const x of audios)await appendServerXogpuPart(form,'reference_audios',x,total)}if(total.files!==entries.length)throw new Error('参考素材未全部写入 multipart，请求已阻止');return form}
'''
server=regex_once(server,r"function localMediaMime\(file\)\{.*?\n\}\nasync function portableizeLocalVideoJsonBody",lambda_placeholder:='',label='') if False else server
# Insert helpers without relying on minified localMediaMime internals.
anchor='async function portableizeLocalVideoJsonBody(body,config={}){'
if server_helpers not in server:
    if anchor not in server: raise SystemExit('server multipart helper anchor missing')
    server=server.replace(anchor,server_helpers+'\n'+anchor,1)
server=once(server,"const body=await portableizeLocalVideoJsonBody(rawBody,config);","const xogpuStudio=String(sharedRoute.protocolFamily||sharedRoute.family||config.protocolFamily||'').toLowerCase()==='xogpu-minimax-h3'&&String(sharedRoute.requestTransport||'').toLowerCase()==='multipart';\n  const body=xogpuStudio?rawBody:await portableizeLocalVideoJsonBody(rawBody,config);",'detect server XOGPU studio transport')
old_create="try{created=await fetchJson(joinUrl(provider.baseUrl,createPath),{method:createMethod,headers:providerHeaders(provider),body:['GET','HEAD'].includes(createMethod)?undefined:JSON.stringify(body),timeoutMs:Math.min(config.timeoutMs,120000),provider});break}"
new_create="try{if(xogpuStudio){const form=await buildServerXogpuForm(rawBody,payload.references||[],String(sharedRoute.videoOperation||'')),headers=providerHeaders(provider);for(const key of Object.keys(headers))if(key.toLowerCase()==='content-type')delete headers[key];created=await fetchJson(joinUrl(provider.baseUrl,createPath),{method:createMethod,headers,body:form,timeoutMs:Math.min(config.timeoutMs,120000),provider})}else created=await fetchJson(joinUrl(provider.baseUrl,createPath),{method:createMethod,headers:providerHeaders(provider),body:['GET','HEAD'].includes(createMethod)?undefined:JSON.stringify(body),timeoutMs:Math.min(config.timeoutMs,120000),provider});break}"
server=once(server,old_create,new_create,'server XOGPU multipart POST')
SERVER.write_text(server,encoding='utf-8')

# ---------------------------------------------------------------------------
# Upstream node reliability: re-hydrate connected nodes from persisted state,
# preferring local persisted result URLs over fragile provider source URLs.
# ---------------------------------------------------------------------------
up=UPSTREAM.read_text(encoding='utf-8')
up=once(up,"return clean(node.outputSourceUrl||node.outputUrl||node.mediaUrl||node.url||node.src||content.url||content.outputUrl);","return clean(node.outputUrl||node.mediaUrl||content.url||content.outputUrl||node.outputSourceUrl||node.url||node.src);",'prefer persisted upstream media')
hydrate='''function nodeTextValue(node={}){const content=node?.content;return clean(node.outputText||node.resultText||node.text||(typeof content==='string'?content:content?.text||content?.value)||node.prompt||node.description)}
function hydrateConnectedReference(raw={}){const ref={...raw},id=clean(ref.sourceNodeId||ref.id);if(!id)return ref;const state=browserState(),node=list(state?.nodes).find(x=>String(x?.id)===id);if(!node)return ref;const type=clean(ref.type||ref.kind||node.type).toLowerCase();ref.type=ref.type||type;ref.kind=ref.kind||type;ref.title=ref.title||node.title||'';if(MEDIA_TYPES.has(type)){const url=nodeMediaUrl(node);if(url)ref.url=url}else if(TEXT_TYPES.has(type)){const value=nodeTextValue(node);if(value)ref.text=value}return ref}
'''
anchor='function linkedReferences(task={}){'
if 'function hydrateConnectedReference' not in up:
    up=up.replace(anchor,hydrate+'\n'+anchor,1)
up=once(up,'const ref=normalizeReference(raw),role=clean(ref.role||ref.semanticRole).toLowerCase(),type=clean(ref.type||ref.kind).toLowerCase(),url=clean(ref.url),kind=clean(ref.kind).toLowerCase();','const ref=normalizeReference(hydrateConnectedReference(raw)),role=clean(ref.role||ref.semanticRole).toLowerCase(),type=clean(ref.type||ref.kind).toLowerCase(),url=clean(ref.url),kind=clean(ref.kind).toLowerCase();','hydrate connected upstream refs')
up=up.replace('upstreamInputContract:{version:5,','upstreamInputContract:{version:6,',1)
UPSTREAM.write_text(up,encoding='utf-8')

# Cache bust browser runtime/protocol/upstream code.
router=ROUTER.read_text(encoding='utf-8').replace("browser-runtime-preview.js?v=20260907-universal-upstream-inputs-1","browser-runtime-preview.js?v=20260908-xogpu-discount-studio-2",1)
ROUTER.write_text(router,encoding='utf-8')
boot=BOOTSTRAP.read_text(encoding='utf-8')
boot=boot.replace("const batchInputV='20260907-universal-upstream-inputs-1';","const batchInputV='20260908-universal-upstream-inputs-2';",1)
BOOTSTRAP.write_text(boot,encoding='utf-8')

# ---------------------------------------------------------------------------
# Focused contract tests: public docs 2026-09-04.
# ---------------------------------------------------------------------------
XOGPU_TEST.write_text('''import test from 'node:test';\nimport assert from 'node:assert/strict';\nawait import('../video-request-parameters.js');\nawait import('../video-protocol-registry.js');\nawait import('../provider-runtime-core.js');\nawait import('../provider-adapter-contract.js');\nconst V=globalThis.CanvasVideoProtocolRegistry,A=globalThis.CanvasProviderAdapters;\nconst provider={id:'xogpu',name:'XOGPU',baseUrl:'https://xogpu.com',protocol:'auto',apiKey:'sk-test',models:[]};\nconst model={id:'MiniMax-H3',name:'MiniMax H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3'};\n\ntest('text mode uses /v1/videos JSON only',()=>{const route=V.resolve(provider,model,'text-to-video'),mapped=V.mapRequest(provider,model,{prompt:'ocean',parameters:{duration:5,ratio:'16:9'}},route,[]);assert.equal(route.createPath,'/v1/videos');assert.equal(route.requestTransport,'json');assert.deepEqual(mapped.body,{model:'MiniMax-H3',prompt:'ocean',duration:5,ratio:'16:9',group:'discount_video_generation'});assert.equal('content' in mapped.body,false)});\n\ntest('all media modes use discount studio multipart and never JSON fallback',()=>{for(const op of ['image-to-video','first-last-frame','reference-to-video']){const route=V.resolve(provider,model,op);assert.equal(route.createPath,'/api/user/discount-video-studio/jobs');assert.equal(route.requestTransport,'multipart');assert.equal(route.strictCreatePath,true);assert.equal(route.noJsonFallback,true);assert.equal(route.strictMediaTransport,true)}});\n\ntest('image mode emits studio fields, not content[]',()=>{const route=V.resolve(provider,model,'image-to-video'),mapped=V.mapRequest(provider,model,{prompt:'wave',parameters:{duration:6,ratio:'adaptive'}},route,[{type:'image',url:'/__browser_media/a'}]);assert.equal(mapped.body.model,'MiniMax-H3');assert.equal(mapped.body.seconds,6);assert.equal(mapped.body.size,'1280x720');assert.deepEqual(JSON.parse(mapped.body.metadata),{mode:'image',ratio:'adaptive'});assert.equal('content' in mapped.body,false)});\n\ntest('frames and multi use documented metadata modes',()=>{let route=V.resolve(provider,model,'first-last-frame'),mapped=V.mapRequest(provider,model,{prompt:'transition',parameters:{duration:10,ratio:'adaptive'}},route,[{type:'image',role:'first_frame',url:'/a'},{type:'image',role:'last_frame',url:'/b'}]);assert.equal(JSON.parse(mapped.body.metadata).mode,'frames');route=V.resolve(provider,model,'reference-to-video');mapped=V.mapRequest(provider,model,{prompt:'keep identity',parameters:{duration:10,ratio:'adaptive'}},route,[{type:'image',url:'/i'},{type:'video',url:'/v'}]);assert.equal(JSON.parse(mapped.body.metadata).mode,'multi')});\n\ntest('connected media cannot silently stay text-to-video',()=>{const refs=[{type:'image',url:'/local.png'}];assert.equal(V.detectOperation({references:refs,parameters:{generationMode:'text2video'}}),'image-to-video')});\n\ntest('known XOGPU model exposes documented discount group and limits',()=>{const p=A.finalizeProvider(provider),m=p.models.find(x=>x.id==='MiniMax-H3');assert.ok(m);assert.equal(m.capabilities.billingGroup,'discount_video_generation');assert.equal(m.capabilities.maxImages,9);assert.equal(m.capabilities.maxVideos,3);assert.equal(m.capabilities.maxAudios,3)});\n''',encoding='utf-8')

DESKTOP_TEST.write_text('''import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {createRequire} from 'node:module';\nconst require=createRequire(import.meta.url);\nconst {mapDesktopXogpuRequest,operationFromReferences}=require('../desktop-video-protocol-bridge.cjs');\n\ntest('desktop image request uses studio envelope without content URLs',()=>{const body=mapDesktopXogpuRequest({id:'MiniMax-H3'},{prompt:'move',parameters:{duration:5,ratio:'adaptive'}},[{type:'image',url:'/media/a.png'}],'image-to-video');assert.equal(body.seconds,5);assert.equal(body.size,'1280x720');assert.deepEqual(JSON.parse(body.metadata),{mode:'image',ratio:'adaptive'});assert.equal('content' in body,false)});\ntest('desktop text request keeps standard JSON envelope',()=>{const body=mapDesktopXogpuRequest({id:'MiniMax-H3'},{prompt:'ocean',parameters:{duration:5,ratio:'16:9'}},[],'text-to-video');assert.equal(body.duration,5);assert.equal(body.group,'discount_video_generation');assert.equal('metadata' in body,false)});\ntest('desktop operation inference sees video/audio as multimodal',()=>{assert.equal(operationFromReferences([{type:'video',url:'/media/v.mp4'}],{}),'reference-to-video');assert.equal(operationFromReferences([{type:'audio',url:'/media/a.wav'}],{}),'reference-to-video')});\n''',encoding='utf-8')

CONTRACT_TEST.write_text('''import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nconst preview=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');\nconst server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');\nconst upstream=fs.readFileSync(new URL('../upstream-generation-inputs-v1.js',import.meta.url),'utf8');\n\ntest('browser multipart carries all documented XOGPU media fields',()=>{for(const field of ['input_reference','end_reference','reference_images','reference_videos','reference_audios'])assert.ok(preview.includes(`form,'${field}'`)||preview.includes(`form.append('${field}'`));assert.match(preview,/metadata.*JSON\.stringify\(\{mode,ratio\}\)/);assert.match(preview,/route\.noJsonFallback\|\|route\.strictMediaTransport/)});\ntest('server uses FormData and strips JSON content-type for XOGPU studio',()=>{assert.match(server,/buildServerXogpuForm/);assert.match(server,/new FormData\(\)/);assert.match(server,/key\.toLowerCase\(\)==='content-type'/);assert.match(server,/reference_videos/);assert.match(server,/reference_audios/)});\ntest('upstream references are hydrated from source nodes and prefer persisted outputUrl',()=>{assert.match(upstream,/function hydrateConnectedReference/);const posLocal=upstream.indexOf('node.outputUrl||node.mediaUrl'),posSource=upstream.indexOf('node.outputSourceUrl',posLocal);assert.ok(posLocal>=0&&posSource>posLocal);assert.match(upstream,/upstreamInputContract:\{version:6/)});\n''',encoding='utf-8')

print('XOGPU discount video studio v2 repair applied')
