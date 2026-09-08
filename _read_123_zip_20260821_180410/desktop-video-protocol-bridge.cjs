/*
 * Desktop-only bridge between video protocol mapping and reference-media transport.
 *
 * Browser preview must reject local references for URL-only providers because the
 * provider cannot reach IndexedDB/blob URLs. The desktop runtime is different: it
 * owns the local file and has a ReferenceMediaTransport layer that can upload it
 * or publish it before the provider request leaves the machine.
 *
 * This bridge therefore keeps XOGPU MiniMax-H3 request-shape validation, but defers
 * URL portability validation to desktop-reference-media-transport.cjs.
 */
'use strict';

function operationFromReferences(refs = [], parameters = {}) {
  const raw=String(parameters.generationMode||parameters.videoMode||parameters.operation||parameters.videoOperation||'').trim().toLowerCase(),aliases={text2video:'text-to-video',image2video:'image-to-video',frame2video:'first-last-frame','first-last-frame':'first-last-frame',omni_reference:'reference-to-video',reference2video:'reference-to-video',audio2video:'reference-to-video'};
  const explicit=aliases[raw]||raw,list=Array.isArray(refs)?refs:[],images=list.filter(r=>String(r?.type||r?.kind||'').toLowerCase()==='image'||/frame|image|picture/.test(String(r?.role||r?.semanticRole||'').toLowerCase())),videoAudio=list.some(r=>['video','audio'].includes(String(r?.type||r?.kind||'').toLowerCase()));
  if(explicit&&explicit!=='text-to-video'&&!['generate','generation','video','video-generation','video_generation'].includes(explicit))return explicit;
  if(images.some(r=>/last/.test(String(r?.role||r?.semanticRole||'').toLowerCase())))return'first-last-frame';if(videoAudio||images.length>1)return'reference-to-video';if(images.length)return'image-to-video';return'text-to-video';
}

function isXogpuMiniMaxH3(provider = {}, model = {}, route = {}) {
  const family = String(route.protocolFamily || route.family || model.videoProtocolFamily || '').trim().toLowerCase();
  if (family === 'xogpu-minimax-h3') return true;
  try {
    const host = new URL(String(provider.baseUrl || '')).hostname.toLowerCase();
    const hint = `${model.id || ''} ${model.name || ''}`.toLowerCase();
    return (host === 'xogpu.com' || host.endsWith('.xogpu.com')) && /minimax[-_. ]?h3|\bh3\b/.test(hint);
  } catch {
    return false;
  }
}

function classifyReference(ref, index) {
  const type = String(ref?.type || ref?.kind || '').toLowerCase();
  const role = String(ref?.role || ref?.semanticRole || '').toLowerCase();
  const url = String(ref?.url || ref?.value || ref?.outputUrl || '').trim();
  let kind = '';
  if (type === 'image' || /image|frame|picture/.test(role)) kind = 'image';
  else if (type === 'video' || /video|motion/.test(role)) kind = 'video';
  else if (type === 'audio' || /audio|voice|sound/.test(role)) kind = 'audio';
  return { ref, index, type: kind, role, url };
}

function desktopXogpuSize(ratio,p={}){const valid=new Set(['1280x720','720x1280','1024x1024','1024x768','768x1024','1792x768']),explicit=String(p.size||'').trim();if(valid.has(explicit))return explicit;return({'16:9':'1280x720','9:16':'720x1280','1:1':'1024x1024','4:3':'1024x768','3:4':'768x1024','21:9':'1792x768'})[ratio]||'1280x720'}
function mapDesktopXogpuRequest(model = {}, task = {}, refs = [], operation = 'generate') {
  const p={...(task.parameters||{})},prompt=String(task.prompt||'').trim();if(!prompt)throw new Error('XOGPU MiniMax-H3 必须填写 prompt');if(prompt.length>7000)throw new Error('XOGPU MiniMax-H3 prompt 最长 7000 字符');const entries=(Array.isArray(refs)?refs:[]).map(classifyReference).filter(x=>x.type&&x.url),images=entries.filter(x=>x.type==='image'),videos=entries.filter(x=>x.type==='video'),audios=entries.filter(x=>x.type==='audio');let mode=operationFromReferences(refs,{...p,operation});if(mode==='text-to-video'&&entries.length)mode=videos.length||audios.length||images.length>1?'reference-to-video':'image-to-video';if(images.length>9||videos.length>3||audios.length>3||entries.length>12)throw new Error('XOGPU MiniMax-H3 参考素材数量超过限制');const seconds=Math.max(1,Math.min(15,Math.round(Number(p.duration??p.seconds??5)||5))),hasVisual=images.length||videos.length;let ratio=String(p.ratio||p.aspectRatio||p.aspect_ratio||(mode==='text-to-video'?'16:9':hasVisual?'adaptive':'16:9')).toLowerCase();if(!['16:9','9:16','1:1','4:3','3:4','21:9','adaptive'].includes(ratio))ratio=hasVisual?'adaptive':'16:9';if(ratio==='adaptive'&&!hasVisual)ratio='16:9';if(mode==='text-to-video')return{model:'MiniMax-H3',prompt,duration:seconds,ratio,group:'discount_video_generation'};const studioMode=mode==='image-to-video'?'image':mode==='first-last-frame'?'frames':'multi';return{model:'MiniMax-H3',prompt,seconds,size:desktopXogpuSize(ratio,p),metadata:JSON.stringify({mode:studioMode,ratio})};
}

function installDesktopVideoProtocolBridge() {
  if (globalThis.__fuietDesktopVideoProtocolBridgeInstalled) return globalThis.CanvasVideoProtocolRegistry;
  require('./video-protocol-registry.js');
  const base = globalThis.CanvasVideoProtocolRegistry;
  if (!base || typeof base.mapRequest !== 'function') throw new Error('视频协议注册表未加载');

  const bridged = Object.freeze({
    ...base,
    mapRequest(provider = {}, model = {}, task = {}, route = {}, refs = []) {
      if (!isXogpuMiniMaxH3(provider, model, route)) return base.mapRequest(provider, model, task, route, refs);
      const operation = String(route.videoOperation || operationFromReferences(refs, task.parameters || {}));
      return {
        family: 'xogpu-minimax-h3',
        operation,
        body: mapDesktopXogpuRequest(model, task, refs, operation)
      };
    }
  });

  globalThis.CanvasVideoProtocolRegistry = bridged;
  globalThis.__fuietDesktopVideoProtocolBridgeInstalled = true;
  return bridged;
}

module.exports = {
  operationFromReferences,
  isXogpuMiniMaxH3,
  mapDesktopXogpuRequest,
  installDesktopVideoProtocolBridge
};
