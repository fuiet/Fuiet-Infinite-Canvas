/* Fuiet Infinite Canvas · image generation request parameters */
(()=>{
'use strict';
function cleanRatio(value){
  const raw=String(value||'1:1').trim().replace('/',':');
  const m=raw.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if(!m)return '1:1';
  const w=Number(m[1]),h=Number(m[2]);
  return w>0&&h>0?`${m[1]}:${m[2]}`:'1:1';
}
function resolutionEdge(value){
  const raw=String(value||'1K').trim().toUpperCase();
  if(raw==='1K')return 1024;
  if(raw==='2K')return 2048;
  if(raw==='4K')return 4096;
  const px=raw.match(/^(\d{3,5})(?:PX)?$/);
  if(px)return Math.max(64,Number(px[1]));
  return 1024;
}
function round8(value){return Math.max(8,Math.round(Number(value||0)/8)*8)}
function parseSize(value){
  const m=String(value||'').trim().match(/^(\d{2,5})\s*[x×]\s*(\d{2,5})$/i);
  return m?{width:Number(m[1]),height:Number(m[2])}:null;
}
function dimensions(resolution='1K',aspectRatio='1:1',explicitSize=''){
  const fixed=parseSize(explicitSize);
  if(fixed)return{...fixed,size:`${fixed.width}x${fixed.height}`,aspectRatio:cleanRatio(aspectRatio)};
  const ratio=cleanRatio(aspectRatio),[rw,rh]=ratio.split(':').map(Number),edge=resolutionEdge(resolution);
  let width,height;
  if(rw>=rh){width=edge;height=round8(edge*rh/rw)}else{height=edge;width=round8(edge*rw/rh)}
  return{width,height,size:`${width}x${height}`,aspectRatio:ratio};
}
function normalizeQuality(value){
  const raw=String(value||'标准画质').trim().toLowerCase();
  if(['低画质','low','draft'].includes(raw))return'low';
  if(['高画质','high','hd','ultra'].includes(raw))return'high';
  if(['标准画质','standard','medium','normal','auto'].includes(raw))return'medium';
  return raw||'medium';
}
function normalize(parameters={}){
  const p={...(parameters||{})};
  const aspectRatio=cleanRatio(p.aspectRatio||p.aspect_ratio||'1:1');
  const resolution=String(p.resolution||'1K');
  const dim=dimensions(resolution,aspectRatio,p.size||'');
  const imageQuality=p.imageQuality||p.qualityLabel||p.quality||'标准画质';
  return{
    ...p,
    imageQuality,
    quality:normalizeQuality(imageQuality),
    resolution,
    aspectRatio,
    aspect_ratio:aspectRatio,
    width:dim.width,
    height:dim.height,
    size:dim.size
  };
}
const api=Object.freeze({cleanRatio,resolutionEdge,dimensions,normalizeQuality,normalize});
globalThis.CanvasImageRequestParameters=api;
})();
