/* Shared provider adapter contract.
 * Loaded as a side-effect by both the local Node runtime and browser/preview runtime.
 * Keep this file free of Node-only and Cloudflare-only APIs.
 */
(()=>{
'use strict';
const SUCCESS=['completed','succeeded','success','done','finished','ready'];
const FAILURE=['failed','failure','error','canceled','cancelled','rejected','expired'];
const VideoProtocols=globalThis.CanvasVideoProtocolRegistry;
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const compact=o=>{const out={};for(const [k,v] of Object.entries(o||{}))if(v!==undefined&&v!==null&&v!=='')out[k]=v;return out};
const clamp=(v,min,max,fallback)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback};
function normalizeReferenceTransport(value,{cloud=false}={}){
  let v=String(value||'auto').trim().toLowerCase();
  if(v==='base64')v='data-url';
  if(v==='public-url')v='url';
  if(v==='upload-endpoint')v='upload';
  if(!v||v==='auto')return cloud?'data-url':'auto';
  return ['data-url','url','upload'].includes(v)?v:(cloud?'data-url':'auto');
}
function providerLooksOpenAIStyle(provider={}){
  if(provider.protocol==='openai-compatible')return true;
  try{
    const url=new URL(String(provider.baseUrl||''));
    const path=url.pathname.replace(/\/+$/,'').toLowerCase();
    return /(?:^|\/)v\d+(?:\/|$)/.test(path)||/openai|api/.test(url.hostname);
  }catch{return false}
}
function providerHost(provider={}){
  try{return new URL(String(provider.baseUrl||'')).hostname.toLowerCase()}catch{return ''}
}
function modelHint(model={}){
  return `${model.id||''} ${model.name||''}`.trim().toLowerCase();
}
function isAgnesProvider(provider={}){
  const h=providerHost(provider);return h==='apihub.agnes-ai.com'||h.endsWith('.agnes-ai.com');
}
function agnesKnownModels(){
  return[
    {id:'agnes-2.5-flash',name:'Agnes 2.5 Flash',modality:'text',adapterKey:'openai-chat',createPath:'/v1/chat/completions',method:'POST',responseMode:'sync',outputPath:'choices.0.message.content'},
    {id:'agnes-image-2.1-flash',name:'Agnes Image 2.1 Flash',modality:'image',adapterKey:'openai-image',createPath:'/v1/images/generations',method:'POST',responseMode:'sync',outputPath:'data.0.url',imageCapabilities:{family:'agnes-image-2.1-flash',source:'provider-profile',confidence:1,requestMode:'agnes-image',aspectRatios:['1:1','3:4','4:3','16:9','9:16','2:3','3:2','21:9'],resolutions:['1K','2K','3K','4K'],qualities:[{label:'模型默认',value:''}],maxImages:8}},
    {id:'agnes-video-2.5-flash',name:'Agnes Video 2.5 Flash',modality:'video',adapterKey:'standard-video-async-v1',createPath:'/v1/videos',method:'POST',responseMode:'async',videoProtocolFamily:'agnes-video',capabilities:{supportedResolutions:['720p'],supportedDurations:[4,5,6,7,8,9,10,11,12],supportedAspectRatios:['21:9','16:9','4:3','1:1','3:4','9:16'],maxReferenceImages:5}}
  ];
}
function normalizeModelModality(value,model={}){
  const raw=String(value||'').trim().toLowerCase().replace(/\s+/g,'-');
  const aliases={
    text:'text',script:'text',chat:'text',llm:'text',language:'text',completion:'text',completions:'text',response:'text',responses:'text',
    image:'image',images:'image',img:'image',picture:'image','text-to-image':'image','image-to-image':'image','image-generation':'image',image_generation:'image',t2i:'image',i2i:'image',
    video:'video',videos:'video','text-to-video':'video','image-to-video':'video','video-generation':'video',video_generation:'video',t2v:'video',i2v:'video',
    audio:'audio',speech:'audio',voice:'audio',tts:'audio',sound:'audio',music:'audio'
  };
  const canonical=aliases[raw]||(['text','image','video','audio'].includes(raw)?raw:'');
  if(model?.modalitySource==='user'&&canonical)return canonical;
  const adapter=String(model?.adapterKey||model?.adapterResolved?.key||'').toLowerCase();
  const route=String(model?.createPath||model?.operationRoutes?.generate?.createPath||'').toLowerCase();
  if(adapter==='openai-image'||/\/images?(?:\/|$)|image[-_/]?generation/.test(route))return'image';
  if(adapter==='standard-video-async-v1'||/\/videos?(?:\/|$)|video[-_/]?generation/.test(route))return'video';
  if(adapter==='openai-audio-speech'||/\/audio(?:\/|$)|\/speech(?:\/|$)/.test(route))return'audio';
  if(['openai-chat','openai-responses'].includes(adapter)||/\/chat\/completions|\/responses(?:\/|$)/.test(route))return'text';
  if(canonical&&canonical!=='text')return canonical;
  const hint=modelHint(model);
  if(/gpt[-_. ]?image|dall[-_. ]?e|(?:^|[-_. ])flux(?:[-_. ]|$)|imagen|ideogram|stable[-_. ]?diffusion|sdxl|(?:^|[-_. ])image(?:[-_. ]|$)/.test(hint))return'image';
  if(/sora|seedance|veo(?:[-_. ]|$)|kling|hailuo|minimax|vidu|hunyuan[-_. ]?video|(?:^|[-_. ])video(?:[-_. ]|$)|(?:^|[-_. ])t2v(?:[-_. ]|$)|(?:^|[-_. ])i2v(?:[-_. ]|$)/.test(hint))return'video';
  if(/(?:^|[-_. ])tts(?:[-_. ]|$)|speech|voice|whisper/.test(hint))return'audio';
  return canonical||'text';
}
function inferAdapterKey(provider={},model={}){
  const explicit=String(model.adapterKey||'auto').trim();
  if(explicit&&explicit!=='auto')return explicit;
  if(provider.protocol==='comfyui')return 'comfyui-workflow';
  const mod=normalizeModelModality(model.modality,model);
  if(provider.protocol==='openai-compatible'){
    if(mod==='text'||mod==='script')return 'openai-chat';
    if(mod==='image')return 'openai-image';
    if(mod==='audio')return 'openai-audio-speech';
    if(mod==='video')return 'standard-video-async-v1';
  }
  const route=String(model.createPath||model.operationRoutes?.generate?.createPath||'').toLowerCase();
  if(/\/responses(?:$|\?)/.test(route))return 'openai-responses';
  if(/\/chat\/completions(?:$|\?)/.test(route))return 'openai-chat';
  if(/\/images\/generations(?:$|\?)/.test(route))return 'openai-image';
  if(/\/audio\/speech(?:$|\?)/.test(route))return 'openai-audio-speech';
  if(mod==='video'&&provider.videoProtocol==='standard-video-async-v1')return 'standard-video-async-v1';
  if(route)return (model.responseMode==='async'||model.operationRoutes?.generate?.responseMode==='async')?'generic-async':'generic-sync';

  const hint=modelHint(model), openAIStyle=providerLooksOpenAIStyle(provider);
  if(mod==='image'&&(/gpt[-_. ]?image|dall[-_. ]?e|flux|imagen|ideogram|stable[-_. ]?diffusion|sdxl/.test(hint)||openAIStyle))return 'openai-image';
  if((mod==='text'||mod==='script')&&(/^(gpt|o1|o3|o4)|claude|gemini|qwen|deepseek|llama|mistral|glm|doubao|moonshot|kimi/.test(hint)||openAIStyle))return 'openai-chat';
  if(mod==='audio'&&(/tts|speech|voice|audio/.test(hint)||openAIStyle))return 'openai-audio-speech';
  if(mod==='video'&&(/sora|seedance|veo|kling|hailuo|minimax|vidu|wan|hunyuan|video/.test(hint)||openAIStyle))return 'standard-video-async-v1';

  if(mod==='image')return 'openai-image';
  if(mod==='audio')return 'openai-audio-speech';
  if(mod==='video')return 'standard-video-async-v1';
  if(mod==='text'||mod==='script')return 'openai-chat';
  return 'generic-sync';
}
function adapterDefaults(key,nodeType){
  if(key==='openai-chat')return{createPath:'/v1/chat/completions',method:'POST',responseMode:'sync',outputPath:'choices.0.message.content'};
  if(key==='openai-responses')return{createPath:'/v1/responses',method:'POST',responseMode:'sync',outputPath:'output.0.content.0.text'};
  if(key==='openai-image')return{createPath:'/v1/images/generations',method:'POST',responseMode:'sync',outputPath:'data.0.url'};
  if(key==='openai-audio-speech')return{createPath:'/v1/audio/speech',method:'POST',responseMode:'sync',outputPath:''};
  if(key==='comfyui-workflow')return{createPath:'/prompt',method:'POST',responseMode:'async',taskIdPath:'prompt_id',pollPath:'/history/{{taskId}}',pollMethod:'GET'};
  if(key==='standard-video-async-v1')return{createPath:'/v1/videos',method:'POST',responseMode:'async',taskIdPath:'',pollPath:'/v1/videos/{{taskId}}',pollMethod:'GET',contentPath:'/v1/videos/{{taskId}}/content',statusPath:'',progressPath:'',outputPath:'',successValues:SUCCESS,failureValues:FAILURE,allowOutputWithoutTerminalStatus:true,pollIntervalMs:1500,timeoutMs:1200000};
  if(key==='generic-async')return{createPath:'',method:'POST',responseMode:'async',pollMethod:'GET',successValues:SUCCESS,failureValues:FAILURE,pollIntervalMs:1500,timeoutMs:1200000};
  if(key==='generic-sync')return{createPath:'',method:'POST',responseMode:'sync'};
  return{createPath:'',method:'POST',responseMode:nodeType==='video'?'async':'sync',pollMethod:'GET',successValues:SUCCESS,failureValues:FAILURE,pollIntervalMs:1500,timeoutMs:1200000};
}
function knownVideoResultProfile(provider={},model={},operation='generate'){
  if(VideoProtocols?.resolve){
    const profile=VideoProtocols.resolve(provider,model,operation)||{};
    return{...profile,protocolFamily:profile.protocolFamily||profile.family||VideoProtocols.detectFamily?.(provider,model)||'generic-video',protocolProfile:profile.protocolProfile||profile.profile||''};
  }
  const host=providerHost(provider),hint=modelHint(model);
  if((host==='platform.dataeyes.ai'||host.endsWith('.dataeyes.ai'))&&/hailuo|minimax|\bh3\b/.test(hint))return{taskIdPath:'task_id',statusPath:'task.status',outputPath:'task.content.url',contentPath:'',pollIntervalMs:2000,timeoutMs:3600000,protocolFamily:'minimax-hailuo',protocolProfile:'legacy-dataeyes-hailuo'};
  return{};
}
function looksLikeLegacyAutoVideoRoute(value={}){
  const create=String(value.createPath||'').trim(), poll=String(value.pollPath||'').trim();
  const request=value.requestTemplate&&typeof value.requestTemplate==='object'?value.requestTemplate:{};
  const pollBody=value.pollBodyTemplate&&typeof value.pollBodyTemplate==='object'?value.pollBodyTemplate:{};
  const noCustom=!String(value.taskIdPath||'').trim()&&!String(value.statusPath||'').trim()&&!String(value.progressPath||'').trim()&&!String(value.outputPath||'').trim()&&!Object.keys(request).length&&!Object.keys(pollBody).length;
  return create==='/v1/video/generations'&&poll==='/v1/video/generations/{{taskId}}'&&noCustom;
}
function migrateLegacyAutoVideoRoute(value={}){
  if(!looksLikeLegacyAutoVideoRoute(value))return value;
  return {...value,createPath:'/v1/videos',pollPath:'/v1/videos/{{taskId}}',contentPath:'/v1/videos/{{taskId}}/content'};
}
function routeIsExplicit(model={}){
  const nested=model.videoProtocolConfig&&typeof model.videoProtocolConfig==='object'?model.videoProtocolConfig:{};
  const nestedExplicit=Object.keys(nested).some(k=>nested[k]!==undefined&&nested[k]!==null&&nested[k]!=='');
  const persistedAuto=model.routeOrigin==='auto'||model.adapterResolved?.auto===true;
  const legacyAuto=looksLikeLegacyAutoVideoRoute(model)||persistedAuto;
  const explicitAdapter=!legacyAuto&&Boolean(String(model.adapterKey||'').trim()&&String(model.adapterKey||'auto').trim()!=='auto');
  const hasExplicitRoute=!legacyAuto&&Boolean(String(model.createPath||model.operationRoutes?.generate?.createPath||'').trim());
  return {explicitAdapter,hasExplicitRoute,nestedExplicit,autoDefaults:!explicitAdapter&&!hasExplicitRoute&&!nestedExplicit};
}
function resolveRoute(provider={},model={},nodeType='',operation='generate'){
  const adapterKey=inferAdapterKey(provider,model);
  const defaults=adapterDefaults(adapterKey,nodeType);
  const knownVideo=nodeType==='video'?knownVideoResultProfile(provider,model,operation):{};
  const providerRaw=nodeType==='video'?migrateLegacyAutoVideoRoute(compact(provider.videoProtocolConfig||{})):{};
  const providerAutoDefaults=String(provider.videoProtocol||'auto')==='auto'&&['/v1/videos','/v1/video/generations'].includes(String(providerRaw.createPath||''))&&!String(providerRaw.taskIdPath||providerRaw.statusPath||providerRaw.outputPath||'').trim()&&!Object.keys(providerRaw.requestTemplate||{}).length;
  const providerVideo=providerAutoDefaults?{}:providerRaw;
  const modelVideo=nodeType==='video'?compact(model.videoProtocolConfig||{}):{};
  const {explicitAdapter,hasExplicitRoute,autoDefaults}=routeIsExplicit(model);
  const direct=compact({
    createPath:autoDefaults?undefined:model.createPath,
    method:autoDefaults?undefined:model.method,
    responseMode:autoDefaults?undefined:model.responseMode,
    outputPath:autoDefaults?undefined:model.outputPath,
    taskIdPath:autoDefaults?undefined:model.taskIdPath,
    pollPath:autoDefaults?undefined:model.pollPath,
    pollMethod:autoDefaults?undefined:model.pollMethod,
    pollBodyTemplate:autoDefaults?undefined:model.pollBodyTemplate,
    contentPath:autoDefaults?undefined:model.contentPath,
    statusPath:autoDefaults?undefined:model.statusPath,
    progressPath:autoDefaults?undefined:model.progressPath,
    successValues:autoDefaults?undefined:model.successValues,
    failureValues:autoDefaults?undefined:model.failureValues,
    pollIntervalMs:autoDefaults?undefined:model.pollIntervalMs,
    timeoutMs:autoDefaults?undefined:model.timeoutMs,
    requestTemplate:autoDefaults?undefined:model.requestTemplate,
    allowOutputWithoutTerminalStatus:autoDefaults?undefined:model.allowOutputWithoutTerminalStatus
  });
  const op=compact(model.operationRoutes?.[operation]||model.operationRoutes?.generate||{});
  const route={...defaults,...knownVideo,...providerVideo,...modelVideo,...direct,...op,adapterKey};
  route.method=String(route.method||'POST').toUpperCase();
  route.pollMethod=String(route.pollMethod||'GET').toUpperCase();
  route.successValues=Array.isArray(route.successValues)&&route.successValues.length?route.successValues:SUCCESS;
  route.failureValues=Array.isArray(route.failureValues)&&route.failureValues.length?route.failureValues:FAILURE;
  route.pollIntervalMs=clamp(route.pollIntervalMs,500,30000,1500);
  route.timeoutMs=clamp(route.timeoutMs,5000,3600000,1200000);
  if(nodeType==='video'){
    route.protocolFamily=route.protocolFamily||route.family||VideoProtocols?.detectFamily?.(provider,model)||'generic-video';
    route.protocolProfile=route.protocolProfile||route.profile||'';
    const uniq=list=>[...new Set((list||[]).map(String).map(x=>x.trim()).filter(Boolean))];
    route.createCandidates=uniq([route.createPath,...(Array.isArray(route.createCandidates)?route.createCandidates:[])]);
    route.pollPathCandidates=uniq([route.pollPath,...(Array.isArray(route.pollPathCandidates)?route.pollPathCandidates:[])]);
    route.contentPathCandidates=uniq([route.contentPath,...(Array.isArray(route.contentPathCandidates)?route.contentPathCandidates:[])]);
    route.taskIdPaths=uniq([route.taskIdPath,...(Array.isArray(route.taskIdPaths)?route.taskIdPaths:[])]);
    route.statusPaths=uniq([route.statusPath,...(Array.isArray(route.statusPaths)?route.statusPaths:[])]);
    route.progressPaths=uniq([route.progressPath,...(Array.isArray(route.progressPaths)?route.progressPaths:[])]);
    route.outputPaths=uniq([route.outputPath,...(Array.isArray(route.outputPaths)?route.outputPaths:[])]);
  }
  return route;
}
function resolveVideoRoute(provider={},model={},task={},references=[]){
  const operation=VideoProtocols?.detectOperation?VideoProtocols.detectOperation({references,parameters:task?.parameters||{}}):String(task?.parameters?.operation||'generate');
  return resolveRoute(provider,model,'video',operation);
}
function mapVideoRequest(provider={},model={},task={},route={},references=[]){
  return VideoProtocols?.mapRequest?VideoProtocols.mapRequest(provider,model,task,route,references):null;
}
function finalizeModel(provider={},model={},nodeType=''){
  const next=clone(model||{}); next.modality=normalizeModelModality(next.modality,next); const type=normalizeModelModality(nodeType||next.modality,next);
  const before=routeIsExplicit(next), route=resolveRoute(provider,next,type,'generate');
  const ready=Boolean(next.id&&route.adapterKey&&route.adapterKey!=='auto'&&route.createPath);
  if(!before.explicitAdapter&&route.adapterKey&&route.adapterKey!=='auto')next.adapterKey=route.adapterKey;
  if(before.autoDefaults&&ready){
    next.createPath=route.createPath||'';
    next.method=route.method||'POST';
    next.responseMode=route.responseMode||'sync';
    next.outputPath=route.outputPath||'';
    next.taskIdPath=route.taskIdPath||'';
    next.pollPath=route.pollPath||'';
    next.pollMethod=route.pollMethod||'GET';
    next.contentPath=route.contentPath||'';
    next.statusPath=route.statusPath||'';
    next.progressPath=route.progressPath||'';
    next.successValues=route.successValues||SUCCESS;
    next.failureValues=route.failureValues||FAILURE;
    next.pollIntervalMs=route.pollIntervalMs||1500;
    next.timeoutMs=route.timeoutMs||1200000;
    next.requestTemplate={};
  }
  if(type==='video'){next.videoProtocolFamily=next.videoProtocolFamily||route.protocolFamily||route.family||'';next.videoProtocolProfile=route.protocolProfile||route.profile||'';}
  next.adapterResolved={key:route.adapterKey||'auto',ready,auto:!before.explicitAdapter,createPath:route.createPath||'',responseMode:route.responseMode||'',protocolFamily:route.protocolFamily||'',protocolProfile:route.protocolProfile||''};
  if(before.autoDefaults&&ready)next.routeOrigin='auto';
  return next;
}
function finalizeProvider(provider={}){
  const next=clone(provider||{});
  let models=Array.isArray(next.models)?next.models:[];
  if(isAgnesProvider(next)){
    if(!next.protocol||next.protocol==='auto')next.protocol='openai-compatible';
    const byId=new Map(models.map(model=>[String(model?.id||''),model]));
    for(const known of agnesKnownModels()){const current=byId.get(known.id);byId.set(known.id,current?{...known,...current,id:known.id}:known)}
    models=[...byId.values()];
  }
  next.models=models.map(model=>finalizeModel(next,model,model?.modality));
  return next;
}
function detectModelListProtocol(data,endpoint=''){
  const list=Array.isArray(data?.data)?data.data:Array.isArray(data?.models)?data.models:Array.isArray(data)?data:null;
  if(!list)return{protocol:'',confidence:0,reason:'response-not-model-list'};
  const objects=list.filter(x=>x&&typeof x==='object');
  const withIds=objects.filter(x=>typeof x.id==='string'&&x.id.trim()).length;
  const modelObjects=objects.filter(x=>String(x.object||'').toLowerCase()==='model').length;
  if(data?.object==='list'&&withIds===objects.length&&objects.length>0)return{protocol:'openai-compatible',confidence:.99,reason:'object=list + data[id]'};
  if(objects.length>0&&modelObjects/objects.length>=.8&&withIds/objects.length>=.8)return{protocol:'openai-compatible',confidence:.96,reason:'data[].object=model'};
  if(objects.length>0&&withIds/objects.length>=.8&&/\/models(?:$|\?)/i.test(String(endpoint||'')))return{protocol:'openai-compatible',confidence:.9,reason:'models endpoint + model ids'};
  return{protocol:'',confidence:0,reason:`generic-model-list:${endpoint||'unknown'}`};
}
globalThis.CanvasProviderAdapters=Object.freeze({SUCCESS,FAILURE,normalizeReferenceTransport,normalizeModelModality,providerLooksOpenAIStyle,isAgnesProvider,agnesKnownModels,inferAdapterKey,adapterDefaults,knownVideoResultProfile,resolveRoute,resolveVideoRoute,mapVideoRequest,finalizeModel,finalizeProvider,detectModelListProtocol});
})();