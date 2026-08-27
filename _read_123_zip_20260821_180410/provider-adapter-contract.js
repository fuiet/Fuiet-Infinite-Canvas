/* Shared provider adapter contract.
 * Loaded as a side-effect by both Node (require) and Cloudflare Worker (import).
 * Keep this file free of Node-only and Worker-only APIs.
 */
(()=>{
'use strict';
const SUCCESS=['completed','succeeded','success','done','finished'];
const FAILURE=['failed','error','canceled','cancelled'];
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
function inferAdapterKey(provider={},model={}){
  const explicit=String(model.adapterKey||'auto').trim();
  if(explicit&&explicit!=='auto')return explicit;
  if(provider.protocol==='comfyui')return 'comfyui-workflow';
  const mod=String(model.modality||'image');
  if(provider.protocol==='openai-compatible'){
    if(mod==='text'||mod==='script')return 'openai-chat';
    if(mod==='image')return 'openai-image';
    if(mod==='audio')return 'openai-audio-speech';
  }
  const route=String(model.createPath||model.operationRoutes?.generate?.createPath||'').toLowerCase();
  if(/\/responses(?:$|\?)/.test(route))return 'openai-responses';
  if(/\/chat\/completions(?:$|\?)/.test(route))return 'openai-chat';
  if(/\/images\/generations(?:$|\?)/.test(route))return 'openai-image';
  if(/\/audio\/speech(?:$|\?)/.test(route))return 'openai-audio-speech';
  if(mod==='video'&&provider.videoProtocol==='standard-video-async-v1')return 'standard-video-async-v1';
  if(route)return (model.responseMode==='async'||model.operationRoutes?.generate?.responseMode==='async')?'generic-async':'generic-sync';
  return 'auto';
}
function adapterDefaults(key,nodeType){
  if(key==='openai-chat')return{createPath:'/v1/chat/completions',method:'POST',responseMode:'sync',outputPath:'choices.0.message.content'};
  if(key==='openai-responses')return{createPath:'/v1/responses',method:'POST',responseMode:'sync',outputPath:'output.0.content.0.text'};
  if(key==='openai-image')return{createPath:'/v1/images/generations',method:'POST',responseMode:'sync',outputPath:'data.0.url'};
  if(key==='openai-audio-speech')return{createPath:'/v1/audio/speech',method:'POST',responseMode:'sync',outputPath:''};
  if(key==='comfyui-workflow')return{createPath:'/prompt',method:'POST',responseMode:'async',taskIdPath:'prompt_id',pollPath:'/history/{{taskId}}',pollMethod:'GET'};
  if(key==='standard-video-async-v1')return{createPath:'/v1/video/generations',method:'POST',responseMode:'async',taskIdPath:'',pollPath:'/v1/video/generations/{{taskId}}',pollMethod:'GET',statusPath:'',progressPath:'',outputPath:'',successValues:SUCCESS,failureValues:FAILURE,pollIntervalMs:1500,timeoutMs:1200000};
  if(key==='generic-async')return{createPath:'',method:'POST',responseMode:'async',pollMethod:'GET',successValues:SUCCESS,failureValues:FAILURE,pollIntervalMs:1500,timeoutMs:1200000};
  if(key==='generic-sync')return{createPath:'',method:'POST',responseMode:'sync'};
  return{createPath:'',method:'POST',responseMode:nodeType==='video'?'async':'sync',pollMethod:'GET',successValues:SUCCESS,failureValues:FAILURE,pollIntervalMs:1500,timeoutMs:1200000};
}
function resolveRoute(provider={},model={},nodeType='',operation='generate'){
  const adapterKey=inferAdapterKey(provider,model);
  const defaults=adapterDefaults(adapterKey,nodeType);
  const providerVideo=nodeType==='video'?compact(provider.videoProtocolConfig||{}):{};
  const direct=compact({
    createPath:model.createPath,method:model.method,responseMode:model.responseMode,outputPath:model.outputPath,
    taskIdPath:model.taskIdPath,pollPath:model.pollPath,pollMethod:model.pollMethod,pollBodyTemplate:model.pollBodyTemplate,
    statusPath:model.statusPath,progressPath:model.progressPath,successValues:model.successValues,failureValues:model.failureValues,
    pollIntervalMs:model.pollIntervalMs,timeoutMs:model.timeoutMs,requestTemplate:model.requestTemplate,
    allowOutputWithoutTerminalStatus:model.allowOutputWithoutTerminalStatus
  });
  const op=compact(model.operationRoutes?.[operation]||model.operationRoutes?.generate||{});
  const route={...defaults,...providerVideo,...direct,...op,adapterKey};
  route.method=String(route.method||'POST').toUpperCase();
  route.pollMethod=String(route.pollMethod||'GET').toUpperCase();
  route.successValues=Array.isArray(route.successValues)&&route.successValues.length?route.successValues:SUCCESS;
  route.failureValues=Array.isArray(route.failureValues)&&route.failureValues.length?route.failureValues:FAILURE;
  route.pollIntervalMs=clamp(route.pollIntervalMs,500,30000,1500);
  route.timeoutMs=clamp(route.timeoutMs,5000,3600000,1200000);
  return route;
}
function detectModelListProtocol(data,endpoint=''){
  const list=Array.isArray(data?.data)?data.data:null;
  if(!list)return{protocol:'',confidence:0,reason:'response-not-openai-list'};
  const objects=list.filter(x=>x&&typeof x==='object');
  const withIds=objects.filter(x=>typeof x.id==='string'&&x.id.trim()).length;
  const modelObjects=objects.filter(x=>String(x.object||'').toLowerCase()==='model').length;
  if(data?.object==='list'&&withIds===objects.length&&objects.length>0)return{protocol:'openai-compatible',confidence:.99,reason:'object=list + data[id]'};
  if(objects.length>0&&modelObjects/objects.length>=.8&&withIds/objects.length>=.8)return{protocol:'openai-compatible',confidence:.96,reason:'data[].object=model'};
  return{protocol:'',confidence:0,reason:`generic-model-list:${endpoint||'unknown'}`};
}
globalThis.CanvasProviderAdapters=Object.freeze({SUCCESS,FAILURE,normalizeReferenceTransport,inferAdapterKey,adapterDefaults,resolveRoute,detectModelListProtocol});
})();
