/* Fuiet Infinite Canvas · generated image dimension contract */
(()=>{
'use strict';
function parseSize(value){
  const m=String(value||'').trim().match(/^(\d{2,5})\s*[x×]\s*(\d{2,5})$/i);
  return m?{width:Number(m[1]),height:Number(m[2]),size:`${Number(m[1])}x${Number(m[2])}`}:null;
}
function sameSize(width,height,target){
  const t=typeof target==='string'?parseSize(target):target;
  return Boolean(t&&Number(width)===Number(t.width)&&Number(height)===Number(t.height));
}
function cropRect(sourceWidth,sourceHeight,targetWidth,targetHeight){
  const sw=Math.max(1,Number(sourceWidth)||1),sh=Math.max(1,Number(sourceHeight)||1),tw=Math.max(1,Number(targetWidth)||1),th=Math.max(1,Number(targetHeight)||1);
  const sourceRatio=sw/sh,targetRatio=tw/th;
  let sx=0,sy=0,sWidth=sw,sHeight=sh;
  if(Math.abs(sourceRatio-targetRatio)<1e-9)return{sx,sy,sWidth,sHeight};
  if(sourceRatio>targetRatio){sWidth=sh*targetRatio;sx=(sw-sWidth)/2;}
  else{sHeight=sw/targetRatio;sy=(sh-sHeight)/2;}
  return{sx,sy,sWidth,sHeight};
}
function outputMimeType(value){const t=String(value||'').toLowerCase();return /^image\/(png|jpeg|webp)$/.test(t)?t:'image/png'}
const api=Object.freeze({parseSize,sameSize,cropRect,outputMimeType});
globalThis.CanvasImageOutputDimensions=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
