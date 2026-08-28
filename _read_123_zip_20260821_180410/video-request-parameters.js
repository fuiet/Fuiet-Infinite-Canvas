/* Fuiet Infinite Canvas · video generation request parameters */
(()=>{
'use strict';
function cleanRatio(value){const raw=String(value||'16:9').trim().replace('/',':');const m=raw.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);if(!m)return '16:9';const w=Number(m[1]),h=Number(m[2]);return w>0&&h>0?`${m[1]}:${m[2]}`:'16:9'}
function normalizeResolution(value){const raw=String(value||'720p').trim().toLowerCase();if(['480p','720p','768p','1080p','1440p','2160p','4k'].includes(raw))return raw==='4k'?'2160p':raw;return raw||'720p'}
function standardSize(resolution='720p',aspectRatio='16:9'){const ratio=cleanRatio(aspectRatio),[rw,rh]=ratio.split(':').map(Number),portrait=rw<rh,res=normalizeResolution(resolution),high=['1080p','1440p','2160p'].includes(res);if(rw===rh)return '';if(high)return portrait?'1024x1792':'1792x1024';return portrait?'720x1280':'1280x720'}
function normalize(parameters={}){const p={...(parameters||{})};const duration=Number(p.duration??p.seconds??4),resolution=normalizeResolution(p.resolution||'720p'),aspectRatio=cleanRatio(p.aspectRatio||p.aspect_ratio||'16:9'),size=String(p.size||standardSize(resolution,aspectRatio)||'').trim();return {...p,duration,seconds:String(duration),resolution,aspectRatio,aspect_ratio:aspectRatio,size}}
function isOpenAIStandardDuration(value){return [4,8,12].includes(Number(value))}
globalThis.CanvasVideoRequestParameters=Object.freeze({cleanRatio,normalizeResolution,standardSize,normalize,isOpenAIStandardDuration});
})();
