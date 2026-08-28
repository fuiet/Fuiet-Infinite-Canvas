/* Fuiet Infinite Canvas · shared image model capability resolver
 * Single source of truth for: Provider -> Model Capability -> UI -> Request Mapper.
 * Prefer explicit model metadata; then known model-family contracts; finally conservative protocol fallback.
 */
(()=>{
'use strict';
const Params=()=>globalThis.CanvasImageRequestParameters;
const UI_RATIOS=['1:1','1:2','2:1','9:16','16:9','3:4','4:3','3:2','2:3','5:4','4:5','21:9','9:21'];
const GEMINI_RATIOS=['1:1','1:4','4:1','1:8','8:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9'];
const SEEDREAM_RATIOS=[...UI_RATIOS];
const QUALITY={
  auto:{label:'自动画质',value:'auto'},
  low:{label:'低画质',value:'low'},
  medium:{label:'标准画质',value:'medium'},
  high:{label:'高画质',value:'high'},
  standard:{label:'标准画质',value:'standard'},
  hd:{label:'高画质',value:'hd'},
  native:{label:'模型默认',value:''}
};
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const uniq=a=>[...new Set((a||[]).map(x=>String(x).trim()).filter(Boolean))];
function host(provider){try{return new URL(String(provider?.baseUrl||'')).hostname.toLowerCase()}catch{return''}}
function hint(provider={},model={}){return `${provider?.name||''} ${host(provider)} ${model?.id||''} ${model?.name||''}`.toLowerCase()}
function gcd(a,b){a=Math.round(Math.abs(a));b=Math.round(Math.abs(b));while(b){const t=b;b=a%b;a=t}return a||1}
function ratioFromSize(size){const m=String(size||'').match(/^(\d{2,5})\s*[x×]\s*(\d{2,5})$/i);if(!m)return'';const w=+m[1],h=+m[2],g=gcd(w,h);return `${w/g}:${h/g}`}
function parseSize(size){const m=String(size||'').match(/^(\d{2,5})\s*[x×]\s*(\d{2,5})$/i);return m?{width:+m[1],height:+m[2],size:`${+m[1]}x${+m[2]}`} : null}
function arrayAt(obj,paths){for(const path of paths){let cur=obj;for(const key of path.split('.'))cur=cur?.[key];if(Array.isArray(cur)&&cur.length)return cur}return[]}
function valueAt(obj,paths){for(const path of paths){let cur=obj;for(const key of path.split('.'))cur=cur?.[key];if(cur!==undefined&&cur!==null&&cur!=='')return cur}return undefined}
function qualityObjects(values){const out=[];for(const raw of uniq(values)){const v=raw.toLowerCase();let q;if(['auto','automatic'].includes(v))q=QUALITY.auto;else if(['low','draft'].includes(v))q=QUALITY.low;else if(['medium','normal'].includes(v))q=QUALITY.medium;else if(['high'].includes(v))q=QUALITY.high;else if(['standard'].includes(v))q=QUALITY.standard;else if(['hd','ultra'].includes(v))q=QUALITY.hd;else q={label:raw,value:raw};if(!out.some(x=>x.label===q.label&&x.value===q.value))out.push({...q})}return out.length?out:[{...QUALITY.native}]}
function metadataCaps(model={}){
  const raw=model.rawCapabilities||model.capabilities||model.imageCapabilities||model;
  const sizes=uniq(arrayAt(raw,['supported_sizes','supportedSizes','sizes','image_sizes','imageSizes','capabilities.image.sizes','capabilities.images.sizes']));
  const ratios=uniq(arrayAt(raw,['supported_aspect_ratios','supportedAspectRatios','aspect_ratios','aspectRatios','capabilities.image.aspect_ratios','capabilities.image.aspectRatios']));
  const resolutions=uniq(arrayAt(raw,['supported_resolutions','supportedResolutions','resolutions','image_resolutions','imageResolutions','capabilities.image.resolutions']));
  const qualities=arrayAt(raw,['supported_qualities','supportedQualities','qualities','image_qualities','imageQualities','capabilities.image.qualities']);
  const requestMode=String(valueAt(raw,['image_request_mode','imageRequestMode','request_mode','requestMode','capabilities.image.requestMode'])||'').trim();
  const exact=sizes.map(parseSize).filter(Boolean);
  return{sizes:exact.map(x=>x.size),ratios:ratios.length?ratios:uniq(exact.map(x=>ratioFromSize(x.size))),resolutions,qualities:qualityObjects(qualities),requestMode};
}
function exactMap(sizes=[]){const map={};for(const size of sizes){const r=ratioFromSize(size);if(r&&!map[r])map[r]=String(size).replace('×','x')}return map}
function areaSize(resolution,ratio){
  const [rw,rh]=String(ratio||'1:1').split(':').map(Number);const area=resolution==='4K'?4096*4096:resolution==='2K'?2048*2048:1024*1024;
  const w=Math.sqrt(area*(rw/rh)),h=area/w,round=v=>Math.max(64,Math.round(v/16)*16);return `${round(w)}x${round(h)}`;
}
function defaultCapability(provider={},model={}){
  const h=hint(provider,model),id=String(model?.id||'').toLowerCase();
  if(/gpt[-_. ]?image/.test(h))return{family:'gpt-image',source:'registry',confidence:.99,requestMode:'openai-size',aspectRatios:['1:1','3:2','2:3'],resolutions:['原生'],qualities:[QUALITY.auto,QUALITY.low,QUALITY.medium,QUALITY.high],exactSizes:{'1:1':'1024x1024','3:2':'1536x1024','2:3':'1024x1536'},maxImages:4};
  if(/dall[-_. ]?e[-_. ]?3/.test(h))return{family:'dall-e-3',source:'registry',confidence:.99,requestMode:'openai-size',aspectRatios:['1:1','7:4','4:7'],resolutions:['原生'],qualities:[QUALITY.standard,QUALITY.hd],exactSizes:{'1:1':'1024x1024','7:4':'1792x1024','4:7':'1024x1792'},maxImages:1};
  if(/gemini[-_. /]?(3(?:\.1)?|3-pro).*image|gemini.*image.*(3(?:\.1)?|3-pro)/.test(h))return{family:'gemini-3-image',source:'registry',confidence:.97,requestMode:'aspect-image-size',aspectRatios:GEMINI_RATIOS,resolutions:['512','1K','2K','4K'],qualities:[QUALITY.native],maxImages:1};
  if(/gemini[-_. /]?2\.5.*flash.*image|gemini.*flash.*image.*2\.5/.test(h))return{family:'gemini-2.5-flash-image',source:'registry',confidence:.97,requestMode:'aspect-ratio',aspectRatios:GEMINI_RATIOS,resolutions:['1K'],qualities:[QUALITY.native],maxImages:1};
  if(/doubao[-_. /]?seedream|seedream[-_. /]?(4|4\.5|5)|ark\.cn-.*seedream/.test(h))return{family:'seedream-modern',source:'registry',confidence:.97,requestMode:'seedream-size',aspectRatios:SEEDREAM_RATIOS,resolutions:['1K','2K','4K'],qualities:[QUALITY.native],maxImages:1};
  if(/jimeng|即梦/.test(h))return{family:'jimeng',source:'registry',confidence:.94,requestMode:'width-height',aspectRatios:SEEDREAM_RATIOS,resolutions:['1K','2K','4K'],qualities:[QUALITY.native],maxImages:1,areaBased:true};
  if(/siliconflow|silicon-flow/.test(h)&&/qwen[-_/ ]?image(?!.*edit)/.test(h))return{family:'siliconflow-qwen-image',source:'registry',confidence:.98,requestMode:'siliconflow-image-size',aspectRatios:['1:1','16:9','9:16','4:3','3:4','3:2','2:3'],resolutions:['原生'],qualities:[QUALITY.native],exactSizes:{'1:1':'1328x1328','16:9':'1664x928','9:16':'928x1664','4:3':'1472x1140','3:4':'1140x1472','3:2':'1584x1056','2:3':'1056x1584'},maxImages:1};
  if(/siliconflow|silicon-flow/.test(h)&&/flux\.2[-_/ ]?(pro|flex)|black-forest-labs\/flux\.2/.test(h))return{family:'siliconflow-flux2',source:'registry',confidence:.98,requestMode:'siliconflow-image-size',aspectRatios:['1:1','3:4','4:3','9:16','16:9'],resolutions:['原生'],qualities:[QUALITY.native],exactSizes:{'1:1':'512x512','3:4':'768x1024','4:3':'1024x768','9:16':'576x1024','16:9':'1024x576'},maxImages:1};
  if(/siliconflow|silicon-flow/.test(h))return{family:'siliconflow-generic',source:'registry',confidence:.9,requestMode:'siliconflow-image-size',aspectRatios:UI_RATIOS,resolutions:['1K'],qualities:[QUALITY.native],maxImages:4};
  if(/flux|stable[-_/ ]?diffusion|sdxl|kolors/.test(h))return{family:'diffusion-generic',source:'registry',confidence:.78,requestMode:'width-height',aspectRatios:UI_RATIOS,resolutions:['1K','2K'],qualities:[QUALITY.native],maxImages:4};
  const openAI=provider?.protocol==='openai-compatible'||/openai/.test(h)||/\/v1\/?$/.test(String(provider?.baseUrl||''));
  if(openAI)return{family:'openai-compatible-image',source:'protocol',confidence:.55,requestMode:'openai-size',aspectRatios:['1:1','3:2','2:3'],resolutions:['1K'],qualities:[QUALITY.native],maxImages:1};
  return{family:'generic-image',source:'fallback',confidence:.35,requestMode:'width-height',aspectRatios:UI_RATIOS,resolutions:['1K'],qualities:[QUALITY.native],maxImages:1};
}
function resolve(provider={},model={}){
  const base=defaultCapability(provider,model),meta=metadataCaps(model),explicit=model.imageCapabilities&&typeof model.imageCapabilities==='object'?clone(model.imageCapabilities):{};
  const hasMeta=Boolean(meta.sizes.length||meta.ratios.length||meta.resolutions.length||meta.requestMode||meta.qualities.some(x=>x.value));
  const merged={...base,...explicit};
  if(meta.requestMode)merged.requestMode=meta.requestMode;
  if(meta.ratios.length)merged.aspectRatios=meta.ratios;
  if(meta.resolutions.length)merged.resolutions=meta.resolutions;
  if(meta.qualities.some(x=>x.value))merged.qualities=meta.qualities;
  if(meta.sizes.length){merged.exactSizes={...(merged.exactSizes||{}),...exactMap(meta.sizes)};if(!meta.ratios.length)merged.aspectRatios=uniq(Object.keys(merged.exactSizes))}
  if(hasMeta&&!explicit.source){merged.source='metadata';merged.confidence=Math.max(Number(merged.confidence||0),.995)}
  merged.aspectRatios=uniq(merged.aspectRatios?.length?merged.aspectRatios:['1:1']);
  merged.resolutions=uniq(merged.resolutions?.length?merged.resolutions:['1K']);
  merged.qualities=(Array.isArray(merged.qualities)&&merged.qualities.length?merged.qualities:[QUALITY.native]).map(q=>typeof q==='string'?qualityObjects([q])[0]:{label:String(q.label||q.value||'模型默认'),value:String(q.value??'')});
  merged.qualityLabels=uniq(merged.qualities.map(q=>q.label));
  merged.providerId=provider?.id||'';merged.modelId=model?.id||'';merged.kind='image';
  return merged;
}
function selectedQuality(cap,label){const q=(cap.qualities||[]).find(x=>x.label===label||x.value===label);return q||cap.qualities?.[0]||QUALITY.native}
function normalizeSelection(provider,model,parameters={}){
  const cap=resolve(provider,model),ratio=cap.aspectRatios.includes(String(parameters.aspectRatio||parameters.aspect_ratio||''))?String(parameters.aspectRatio||parameters.aspect_ratio):cap.aspectRatios[0];
  const resolution=cap.resolutions.includes(String(parameters.resolution||''))?String(parameters.resolution):cap.resolutions[0];
  const q=selectedQuality(cap,parameters.imageQuality||parameters.qualityLabel||parameters.quality||'');
  let size=cap.exactSizes?.[ratio]||'';
  if(!size&&cap.areaBased)size=areaSize(resolution,ratio);
  if(!size&&!['原生','自动'].includes(resolution)){const p=Params();size=p?.dimensions?p.dimensions(resolution,ratio).size:''}
  return{...parameters,aspectRatio:ratio,aspect_ratio:ratio,resolution,imageQuality:q.label,qualityLabel:q.label,quality:q.value,size:size||parameters.size||'',capability:{family:cap.family,source:cap.source,confidence:cap.confidence,requestMode:cap.requestMode},imageCapabilities:cap};
}
function mapRequest(provider,model,parameters={},prompt='',count=1){
  const p=normalizeSelection(provider,model,parameters),cap=p.imageCapabilities,n=Math.max(1,Math.min(Number(cap.maxImages||4),Number(count||parameters.count||1))),common={model:model.id,prompt:String(prompt||'')};
  let body,profile=cap.requestMode;
  if(cap.requestMode==='openai-size')body={...common,n,...(p.size?{size:p.size}:{}),...(p.quality?{quality:p.quality}:{})};
  else if(cap.requestMode==='seedream-size')body={...common,size:p.size||p.resolution,sequential_image_generation:'disabled',stream:false,response_format:'url'};
  else if(cap.requestMode==='siliconflow-image-size')body={...common,image_size:p.size||Params()?.dimensions?.('1K',p.aspectRatio)?.size||'1024x1024',...(n>1?{batch_size:n}:{})};
  else if(cap.requestMode==='aspect-image-size')body={...common,aspect_ratio:p.aspectRatio,image_size:p.resolution};
  else if(cap.requestMode==='aspect-ratio')body={...common,aspect_ratio:p.aspectRatio};
  else {const dim=parseSize(p.size)||Params()?.dimensions?.(p.resolution,p.aspectRatio)||{};body={...common,width:Number(dim.width||p.width||1024),height:Number(dim.height||p.height||1024),...(n>1?{batch_size:n}:{})};}
  return{profile,body,capability:cap,selection:p};
}
function decorateDiscoveredModel(provider,raw={},model={}){
  if(String(model.modality||'').toLowerCase()!=='image')return model;
  const rawCapabilities={};for(const key of ['supported_sizes','supportedSizes','sizes','image_sizes','imageSizes','supported_aspect_ratios','supportedAspectRatios','aspect_ratios','aspectRatios','supported_resolutions','supportedResolutions','resolutions','supported_qualities','supportedQualities','qualities','image_request_mode','imageRequestMode','capabilities'])if(raw?.[key]!==undefined)rawCapabilities[key]=clone(raw[key]);
  const next={...model,...(Object.keys(rawCapabilities).length?{rawCapabilities}:{})};next.imageCapabilities=resolve(provider,next);return next;
}
const api=Object.freeze({UI_RATIOS,GEMINI_RATIOS,resolve,normalizeSelection,mapRequest,decorateDiscoveredModel,ratioFromSize,parseSize,areaSize});
globalThis.CanvasModelImageCapabilities=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
