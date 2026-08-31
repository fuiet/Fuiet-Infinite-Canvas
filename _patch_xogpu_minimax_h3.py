from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
OLD_BUILD='20260831-low-zoom-media-visible-1'
NEW_BUILD='20260831-xogpu-minimax-h3-1'


def replace_once(path,old,new,label):
    p=ROOT/path
    s=p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'{label}: pattern not found in {path}')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

# 1) Preserve XOGPU's adaptive ratio through the shared video parameter normalizer.
replace_once('video-request-parameters.js',
"function cleanRatio(value){const raw=String(value||'16:9').trim().replace('/',':');const m=raw.match(/^(\\d+(?:\\.\\d+)?)\\s*:\\s*(\\d+(?:\\.\\d+)?)$/);if(!m)return '16:9';const w=Number(m[1]),h=Number(m[2]);return w>0&&h>0?`${m[1]}:${m[2]}`:'16:9'}",
"function cleanRatio(value){const raw=String(value||'16:9').trim();if(raw.toLowerCase()==='adaptive')return'adaptive';const normalized=raw.replace('/',':'),m=normalized.match(/^(\\d+(?:\\.\\d+)?)\\s*:\\s*(\\d+(?:\\.\\d+)?)$/);if(!m)return '16:9';const w=Number(m[1]),h=Number(m[2]);return w>0&&h>0?`${m[1]}:${m[2]}`:'16:9'}",
'adaptive ratio normalizer')
replace_once('video-request-parameters.js',
"function standardSize(resolution='720p',aspectRatio='16:9'){const ratio=cleanRatio(aspectRatio),[rw,rh]=ratio.split(':').map(Number),portrait=rw<rh,res=normalizeResolution(resolution),high=['1080p','1440p','2160p'].includes(res);if(rw===rh)return '';if(high)return portrait?'1024x1792':'1792x1024';return portrait?'720x1280':'1280x720'}",
"function standardSize(resolution='720p',aspectRatio='16:9'){const ratio=cleanRatio(aspectRatio);if(ratio==='adaptive')return'';const [rw,rh]=ratio.split(':').map(Number),portrait=rw<rh,res=normalizeResolution(resolution),high=['1080p','1440p','2160p'].includes(res);if(rw===rh)return '';if(high)return portrait?'1024x1792':'1792x1024';return portrait?'720x1280':'1280x720'}",
'adaptive standard size')

# 2) Add an exact XOGPU MiniMax-H3 protocol profile and request mapper.
registry=ROOT/'video-protocol-registry.js'
s=registry.read_text(encoding='utf-8')
s=s.replace("  const hint=hintOf(model);\n  if(/agnes[-_. ]?video/.test(hint))return'agnes-video';",
"  const hint=hintOf(model),host=hostOf(provider);\n  if((host==='xogpu.com'||host.endsWith('.xogpu.com'))&&/minimax[-_. ]?h3|\\bh3\\b/.test(hint))return'xogpu-minimax-h3';\n  if(/agnes[-_. ]?video/.test(hint))return'agnes-video';",1)
s=s.replace("  if(images.length>1)return'reference-to-video';\n  if(images.some(r=>/last/.test(String(r?.role||r?.semanticRole||'').toLowerCase())))return'first-last-frame';",
"  if(images.some(r=>/last/.test(String(r?.role||r?.semanticRole||'').toLowerCase())))return'first-last-frame';\n  if(images.length>1)return'reference-to-video';",1)
marker="function agnesVideoProfile(provider,model,operation){"
if marker not in s: raise SystemExit('XOGPU registry insertion marker missing')
xogpu_code=r'''function xogpuVideoProfile(provider,model,operation){
  const host=hostOf(provider),hint=hintOf(model);if(!((host==='xogpu.com'||host.endsWith('.xogpu.com'))&&/minimax[-_. ]?h3|\bh3\b/.test(hint)))return null;
  const base=genericProfile('xogpu-minimax-h3');
  return{...base,profile:'xogpu:minimax-h3',createPath:'/v1/videos',createCandidates:['/v1/videos'],pollPath:'/v1/videos/{{taskId}}',pollPathCandidates:['/v1/videos/{{taskId}}'],strictPollPath:true,taskIdPath:'id',taskIdPaths:['id','task_id','taskId',...COMMON_TASK_IDS],statusPath:'status',statusPaths:['status',...COMMON_STATUS],progressPath:'progress',progressPaths:['progress',...COMMON_PROGRESS],outputPath:'',outputPaths:[],contentPath:'/v1/videos/{{taskId}}/content',contentPathCandidates:['/v1/videos/{{taskId}}/content'],requestTransport:'json',referenceTransport:'url',allowOutputWithoutTerminalStatus:false,pollIntervalMs:15000,timeoutMs:3600000,videoOperation:operation};
}
function xogpuPublicMediaUrl(value,label){const text=String(value||'').trim();if(!/^https:\/\//i.test(text))throw new Error('XOGPU MiniMax-H3 的'+label+'必须是公网可访问的 HTTPS URL；不支持浏览器本地地址、HTTP、blob URL、Base64 或 data URI');return text}
function mapXogpuVideoRequest(model={},task={},refs=[]){
  const p={...(task.parameters||{})},prompt=String(task.prompt||'').trim();if(!prompt)throw new Error('XOGPU MiniMax-H3 必须填写 prompt');if(prompt.length>7000)throw new Error('XOGPU MiniMax-H3 prompt 最长 7000 字符');
  const duration=Math.max(1,Math.min(15,Math.round(Number(p.duration??p.seconds??5)||5))),list=Array.isArray(refs)?refs:[];
  const entries=list.map((r,index)=>{const type=String(r?.type||r?.kind||'').toLowerCase(),role=String(r?.role||r?.semanticRole||'').toLowerCase(),url=r?.url||r?.value||r?.outputUrl||'';let kind='';if(type==='image'||/image|frame|picture/.test(role))kind='image';else if(type==='video'||/video|motion/.test(role))kind='video';else if(type==='audio'||/audio|voice|sound/.test(role))kind='audio';return{r,index,type:kind,role,url}}).filter(x=>x.type&&x.url);
  const images=entries.filter(x=>x.type==='image'),videos=entries.filter(x=>x.type==='video'),audios=entries.filter(x=>x.type==='audio');
  if(images.length>9)throw new Error('XOGPU MiniMax-H3 最多支持 9 张图片');if(videos.length>3)throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考视频');if(audios.length>3)throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考音频');if(entries.length>12)throw new Error('XOGPU MiniMax-H3 全部参考媒体合计最多 12 个');
  const hasVisual=images.length>0||videos.length>0,allowed=['16:9','9:16','1:1','4:3','3:4','21:9','adaptive'];let ratio=String(p.ratio||p.aspectRatio||p.aspect_ratio||(hasVisual?'adaptive':'16:9')).trim().toLowerCase();if(!allowed.includes(ratio))ratio=hasVisual?'adaptive':'16:9';if(ratio==='adaptive'&&!hasVisual)throw new Error('XOGPU MiniMax-H3 的 adaptive 比例仅适用于包含图片或视频参考的模式；文生视频请使用固定比例');
  const body={model:'MiniMax-H3',prompt,duration,ratio,group:'discount_video_generation',n:1};
  if(entries.length){
    const explicitFirst=images.find(x=>/first/.test(x.role)),explicitLast=images.find(x=>/last/.test(x.role));
    const firstFallback=operation==='first-last-frame'&&!explicitFirst?images[0]:null,lastFallback=operation==='first-last-frame'&&!explicitLast&&images.length>1?images[1]:null;
    body.content=[{type:'text',text:prompt},...entries.map(x=>{const url=xogpuPublicMediaUrl(x.url,x.type==='image'?'图片':x.type==='video'?'参考视频':'参考音频');if(x.type==='video')return{type:'video_url',video_url:{url},role:'reference_video'};if(x.type==='audio')return{type:'audio_url',audio_url:{url},role:'reference_audio'};let role='reference_image';if(x===explicitFirst||x===firstFallback||(operation==='image-to-video'&&images.length===1&&!videos.length&&!audios.length))role='first_frame';else if(x===explicitLast||x===lastFallback)role='last_frame';return{type:'image_url',image_url:{url},role}})];
  }
  return body;
}
'''
s=s.replace(marker,xogpu_code+marker,1)
s=s.replace("  const specialized=agnesVideoProfile(provider,model,op)||dataEyesProfile(provider,model,op);if(specialized)return specialized;",
"  const specialized=xogpuVideoProfile(provider,model,op)||agnesVideoProfile(provider,model,op)||dataEyesProfile(provider,model,op);if(specialized)return specialized;",1)
s=s.replace("  if(family==='agnes-video')return{family,operation,body:mapAgnesVideoRequest(model,task,refs)};",
"  if(family==='xogpu-minimax-h3')return{family,operation,body:mapXogpuVideoRequest(model,task,refs)};\n  if(family==='agnes-video')return{family,operation,body:mapAgnesVideoRequest(model,task,refs)};",1)
s=s.replace("function publicProfiles(){return['agnes-video','kling','seedance','minimax-hailuo','vidu','veo','sora-openai','wan','grok','generic-video'];}",
"function publicProfiles(){return['xogpu-minimax-h3','agnes-video','kling','seedance','minimax-hailuo','vidu','veo','sora-openai','wan','grok','generic-video'];}",1)
registry.write_text(s,encoding='utf-8')

# 3) Make XOGPU a fixed known provider/model and remove Agnes video from automatic injection.
adapter=ROOT/'provider-adapter-contract.js'
s=adapter.read_text(encoding='utf-8')
old_agnes="""function agnesKnownModels(){
  return[
    {id:'agnes-2.5-flash',name:'Agnes 2.5 Flash',modality:'text',adapterKey:'openai-chat',createPath:'/v1/chat/completions',method:'POST',responseMode:'sync',outputPath:'choices.0.message.content'},
    {id:'agnes-image-2.1-flash',name:'Agnes Image 2.1 Flash',modality:'image',adapterKey:'openai-image',createPath:'/v1/images/generations',method:'POST',responseMode:'sync',outputPath:'data.0.url',imageCapabilities:{family:'agnes-image-2.1-flash',source:'provider-profile',confidence:1,requestMode:'agnes-image',aspectRatios:['1:1','3:4','4:3','16:9','9:16','2:3','3:2','21:9'],resolutions:['1K','2K','3K','4K'],qualities:[{label:'模型默认',value:''}],maxImages:8}},
    {id:'agnes-video-2.5-flash',name:'Agnes Video 2.5 Flash',modality:'video',adapterKey:'standard-video-async-v1',createPath:'/v1/videos',method:'POST',responseMode:'async',videoProtocolFamily:'agnes-video',capabilities:{supportedResolutions:['720p'],supportedDurations:[4,5,6,7,8,9,10,11,12],supportedAspectRatios:['21:9','16:9','4:3','1:1','3:4','9:16'],maxReferenceImages:5}}
  ];
}
"""
new_agnes="""function agnesKnownModels(){
  return[
    {id:'agnes-2.5-flash',name:'Agnes 2.5 Flash',modality:'text',adapterKey:'openai-chat',createPath:'/v1/chat/completions',method:'POST',responseMode:'sync',outputPath:'choices.0.message.content'},
    {id:'agnes-image-2.1-flash',name:'Agnes Image 2.1 Flash',modality:'image',adapterKey:'openai-image',createPath:'/v1/images/generations',method:'POST',responseMode:'sync',outputPath:'data.0.url',imageCapabilities:{family:'agnes-image-2.1-flash',source:'provider-profile',confidence:1,requestMode:'agnes-image',aspectRatios:['1:1','3:4','4:3','16:9','9:16','2:3','3:2','21:9'],resolutions:['1K','2K','3K','4K'],qualities:[{label:'模型默认',value:''}],maxImages:8}}
  ];
}
function isXogpuProvider(provider={}){
  const h=providerHost(provider);return h==='xogpu.com'||h.endsWith('.xogpu.com');
}
function xogpuKnownModels(){
  const durations=Array.from({length:15},(_,i)=>i+1),aspectRatios=['16:9','9:16','1:1','4:3','3:4','21:9','adaptive'];
  return[{id:'MiniMax-H3',name:'MiniMax H3',modality:'video',enabled:true,adapterKey:'standard-video-async-v1',createPath:'/v1/videos',method:'POST',responseMode:'async',videoProtocolFamily:'xogpu-minimax-h3',referenceTransport:'url',capabilities:{durations,resolutions:['768p'],aspectRatios,supportedDurations:durations,supportedResolutions:['768p'],supportedAspectRatios:aspectRatios,maxImages:9,maxVideos:3,maxAudios:3,maxReferences:12,maxReferenceImages:9,maxReferenceVideos:3,maxReferenceAudios:3,supportsTextToVideo:true,supportsFirstFrame:true,supportsLastFrame:true,supportsImageReference:true,supportsVideoReference:true,supportsAudioReference:true,supportsNativeAudio:true,generationModes:['text2video','image2video','audio2video','frame2video'],outputResolution:'768p',fps:24,videoCodec:'H.264',audioCodec:'AAC',billingGroup:'discount_video_generation'}}];
}
"""
if old_agnes not in s: raise SystemExit('Agnes known models block not found')
s=s.replace(old_agnes,new_agnes,1)
old_finalize="""  if(isAgnesProvider(next)){
    if(!next.protocol||next.protocol==='auto')next.protocol='openai-compatible';
    const byId=new Map(models.map(model=>[String(model?.id||''),model]));
    for(const known of agnesKnownModels()){const current=byId.get(known.id);byId.set(known.id,current?{...known,...current,id:known.id}:known)}
    models=[...byId.values()];
  }
  next.models=models.map(model=>finalizeModel(next,model,model?.modality));
"""
new_finalize="""  if(isAgnesProvider(next)){
    if(!next.protocol||next.protocol==='auto')next.protocol='openai-compatible';
    models=models.filter(model=>!/^agnes[-_. ]?video/i.test(String(model?.id||model?.name||'')));
    const byId=new Map(models.map(model=>[String(model?.id||''),model]));
    for(const known of agnesKnownModels()){const current=byId.get(known.id);byId.set(known.id,current?{...known,...current,id:known.id}:known)}
    models=[...byId.values()];
  }
  if(isXogpuProvider(next)){
    if(!String(next.authHeader||'').trim())next.authHeader='Authorization';
    if(!String(next.authScheme||'').trim())next.authScheme='Bearer';
    for(const known of xogpuKnownModels()){
      const current=models.find(model=>String(model?.id||'').toLowerCase()===known.id.toLowerCase());
      models=models.filter(model=>String(model?.id||'').toLowerCase()!==known.id.toLowerCase());
      models.push(current?{...current,...known,id:known.id,name:current.name||known.name,enabled:current.enabled!==false,pricing:current.pricing||known.pricing}:known);
    }
  }
  next.models=models.map(model=>finalizeModel(next,model,model?.modality));
"""
if old_finalize not in s: raise SystemExit('finalizeProvider block not found')
s=s.replace(old_finalize,new_finalize,1)
s=s.replace("globalThis.CanvasProviderAdapters=Object.freeze({SUCCESS,FAILURE,normalizeReferenceTransport,normalizeModelModality,providerLooksOpenAIStyle,isAgnesProvider,agnesKnownModels,inferAdapterKey,adapterDefaults,knownVideoResultProfile,resolveRoute,resolveVideoRoute,mapVideoRequest,finalizeModel,finalizeProvider,detectModelListProtocol});",
"globalThis.CanvasProviderAdapters=Object.freeze({SUCCESS,FAILURE,normalizeReferenceTransport,normalizeModelModality,providerLooksOpenAIStyle,isAgnesProvider,agnesKnownModels,isXogpuProvider,xogpuKnownModels,inferAdapterKey,adapterDefaults,knownVideoResultProfile,resolveRoute,resolveVideoRoute,mapVideoRequest,finalizeModel,finalizeProvider,detectModelListProtocol});",1)
adapter.write_text(s,encoding='utf-8')

# 4) Update the Agnes automatic-injection regression: Agnes video is intentionally no longer auto-added.
agnes_test=ROOT/'tests'/'agnes-fixed-adapter.test.mjs'
s=agnes_test.read_text(encoding='utf-8')
old="""test('Agnes provider injects documented Flash text image and video models',()=>{
  const p=A.finalizeProvider(provider);const ids=p.models.map(m=>m.id);
  assert.equal(p.protocol,'openai-compatible');
  assert.deepEqual(['agnes-2.5-flash','agnes-image-2.1-flash','agnes-video-2.5-flash'].every(id=>ids.includes(id)),true);
  assert.equal(p.models.find(m=>m.id==='agnes-2.5-flash').createPath,'/v1/chat/completions');
  assert.equal(p.models.find(m=>m.id==='agnes-image-2.1-flash').createPath,'/v1/images/generations');
  assert.equal(p.models.find(m=>m.id==='agnes-video-2.5-flash').createPath,'/v1/videos');
});
"""
new="""test('Agnes provider no longer auto-injects a video model after XOGPU migration',()=>{
  const p=A.finalizeProvider(provider);const ids=p.models.map(m=>m.id);
  assert.equal(p.protocol,'openai-compatible');
  assert.deepEqual(['agnes-2.5-flash','agnes-image-2.1-flash'].every(id=>ids.includes(id)),true);
  assert.equal(ids.includes('agnes-video-2.5-flash'),false);
  assert.equal(p.models.find(m=>m.id==='agnes-2.5-flash').createPath,'/v1/chat/completions');
  assert.equal(p.models.find(m=>m.id==='agnes-image-2.1-flash').createPath,'/v1/images/generations');
});
"""
if old not in s: raise SystemExit('Agnes injection test block not found')
agnes_test.write_text(s.replace(old,new,1),encoding='utf-8')

# 5) Add exact XOGPU protocol/request regression tests.
(ROOT/'tests'/'xogpu-minimax-h3.test.mjs').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
await import('../video-request-parameters.js');
await import('../video-protocol-registry.js');
await import('../provider-runtime-core.js');
await import('../provider-adapter-contract.js');
const V=globalThis.CanvasVideoProtocolRegistry,A=globalThis.CanvasProviderAdapters,C=globalThis.CanvasProviderRuntimeCore,P=globalThis.CanvasVideoRequestParameters;
const provider={id:'xogpu',name:'XOGPU',baseUrl:'https://xogpu.com',protocol:'auto',apiKey:'sk-test',models:[]};

test('XOGPU provider injects the fixed MiniMax-H3 video model and Bearer auth defaults',()=>{
  const p=A.finalizeProvider(provider),m=p.models.find(x=>x.id==='MiniMax-H3');
  assert.ok(m);assert.equal(m.modality,'video');assert.equal(m.createPath,'/v1/videos');assert.equal(m.videoProtocolFamily,'xogpu-minimax-h3');
  assert.equal(p.authHeader,'Authorization');assert.equal(p.authScheme,'Bearer');
  assert.deepEqual(m.capabilities.durations,Array.from({length:15},(_,i)=>i+1));
  assert.deepEqual(m.capabilities.resolutions,['768p']);assert.ok(m.capabilities.aspectRatios.includes('adaptive'));
  assert.equal(m.capabilities.maxImages,9);assert.equal(m.capabilities.maxVideos,3);assert.equal(m.capabilities.maxAudios,3);assert.equal(m.capabilities.maxReferences,12);
});

test('XOGPU MiniMax-H3 uses exact create poll and content endpoints',()=>{
  const model=A.finalizeProvider(provider).models.find(x=>x.id==='MiniMax-H3'),route=V.resolve(provider,model,'text-to-video');
  assert.equal(route.profile,'xogpu:minimax-h3');assert.equal(route.createPath,'/v1/videos');assert.equal(route.pollPath,'/v1/videos/{{taskId}}');assert.equal(route.contentPath,'/v1/videos/{{taskId}}/content');
  assert.equal(route.strictPollPath,true);assert.equal(route.taskIdPath,'id');assert.equal(route.statusPath,'status');assert.equal(route.progressPath,'progress');assert.equal(route.referenceTransport,'url');assert.equal(route.pollIntervalMs,15000);
  assert.equal(C.extractTaskId({id:'task_123',task_id:'task_123'},route),'task_123');
});

test('XOGPU text-to-video body follows discount_video_generation docs exactly',()=>{
  const model={id:'MiniMax-H3',name:'MiniMax H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3'},route=V.resolve(provider,model,'text-to-video');
  const mapped=V.mapRequest(provider,model,{prompt:'cinematic ocean',parameters:{duration:5,aspectRatio:'16:9',resolution:'1080p'}},route,[]);
  assert.deepEqual(mapped.body,{model:'MiniMax-H3',prompt:'cinematic ocean',duration:5,ratio:'16:9',group:'discount_video_generation',n:1});
});

test('XOGPU image and first-last-frame requests use documented content items and adaptive ratio',()=>{
  const model={id:'MiniMax-H3',name:'MiniMax H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3'};
  let route=V.resolve(provider,model,'image-to-video');
  let mapped=V.mapRequest(provider,model,{prompt:'move forward',parameters:{duration:6,aspectRatio:'adaptive'}},route,[{type:'image',url:'https://cdn.example.com/first.png'}]);
  assert.equal(mapped.body.ratio,'adaptive');assert.deepEqual(mapped.body.content,[{type:'text',text:'move forward'},{type:'image_url',image_url:{url:'https://cdn.example.com/first.png'},role:'first_frame'}]);
  route=V.resolve(provider,model,'first-last-frame');
  mapped=V.mapRequest(provider,model,{prompt:'day to night',parameters:{duration:10,aspectRatio:'adaptive'}},route,[{type:'image',role:'first_frame',url:'https://cdn.example.com/a.png'},{type:'image',role:'last_frame',url:'https://cdn.example.com/b.png'}]);
  assert.equal(mapped.body.content[1].role,'first_frame');assert.equal(mapped.body.content[2].role,'last_frame');
});

test('XOGPU multimodal references enforce HTTPS and documented media limits',()=>{
  const model={id:'MiniMax-H3',name:'MiniMax H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3'},route=V.resolve(provider,model,'reference-to-video');
  const refs=[{type:'image',url:'https://cdn.example.com/a.webp'},{type:'video',url:'https://cdn.example.com/motion.mp4'},{type:'audio',url:'https://cdn.example.com/voice.wav'}];
  const mapped=V.mapRequest(provider,model,{prompt:'<Picture 1> follows <Video 1>',parameters:{duration:10,ratio:'adaptive'}},route,refs);
  assert.deepEqual(mapped.body.content.map(x=>x.type),['text','image_url','video_url','audio_url']);
  assert.throws(()=>V.mapRequest(provider,model,{prompt:'bad',parameters:{duration:5,ratio:'adaptive'}},route,[{type:'image',url:'http://example.com/a.png'}]),/HTTPS URL/);
  assert.throws(()=>V.mapRequest(provider,model,{prompt:'too many',parameters:{duration:5,ratio:'adaptive'}},route,Array.from({length:10},(_,i)=>({type:'image',url:`https://cdn.example.com/${i}.png`})) ),/最多支持 9 张图片/);
  assert.throws(()=>V.mapRequest(provider,model,{prompt:'text only adaptive',parameters:{duration:5,ratio:'adaptive'}},V.resolve(provider,model,'text-to-video'),[]),/adaptive 比例仅适用于/);
});

test('shared video parameters preserve adaptive for XOGPU instead of coercing it to 16:9',()=>{
  const p=P.normalize({duration:5,aspectRatio:'adaptive',resolution:'768p'});assert.equal(p.aspectRatio,'adaptive');assert.equal(p.aspect_ratio,'adaptive');assert.equal(p.size,'');
});
''',encoding='utf-8')

# 6) Advance browser cache keys for every runtime file involved in provider/video routing.
for fp in ROOT.rglob('*'):
    if fp.suffix.lower() not in {'.js','.mjs','.html','.css'}: continue
    text=fp.read_text(encoding='utf-8')
    changed=text.replace(OLD_BUILD,NEW_BUILD)
    if fp.name in {'index.html','models.html'}:
        changed=changed.replace('20260828-video-error-reporting-1',NEW_BUILD)
    if changed!=text: fp.write_text(changed,encoding='utf-8')

print('XOGPU MiniMax-H3 adapter migration applied')
