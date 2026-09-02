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
  const raw = String(parameters.operation || parameters.videoOperation || '').trim().toLowerCase();
  const aliases = {
    text2video: 'text-to-video', t2v: 'text-to-video', text_to_video: 'text-to-video',
    image2video: 'image-to-video', i2v: 'image-to-video', image_to_video: 'image-to-video',
    reference2video: 'reference-to-video', reference_to_video: 'reference-to-video', ref2video: 'reference-to-video',
    'first-last-frame': 'first-last-frame', first_last_frame: 'first-last-frame'
  };
  const explicit = aliases[raw] || raw;
  if (explicit && !['generate', 'generation', 'video', 'video-generation', 'video_generation'].includes(explicit)) return explicit;
  const images = (Array.isArray(refs) ? refs : []).filter(r => {
    const type = String(r?.type || r?.kind || '').toLowerCase();
    const role = String(r?.role || r?.semanticRole || '').toLowerCase();
    return type === 'image' || /frame|image|reference/.test(role);
  });
  if (images.some(r => /last/.test(String(r?.role || r?.semanticRole || '').toLowerCase()))) return 'first-last-frame';
  if (images.length > 1) return 'reference-to-video';
  if (images.length) return 'image-to-video';
  return 'text-to-video';
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

function mapDesktopXogpuRequest(model = {}, task = {}, refs = [], operation = 'generate') {
  const p = { ...(task.parameters || {}) };
  const prompt = String(task.prompt || '').trim();
  if (!prompt) throw new Error('XOGPU MiniMax-H3 必须填写 prompt');
  if (prompt.length > 7000) throw new Error('XOGPU MiniMax-H3 prompt 最长 7000 字符');

  const duration = Math.max(1, Math.min(15, Math.round(Number(p.duration ?? p.seconds ?? 5) || 5)));
  const entries = (Array.isArray(refs) ? refs : []).map(classifyReference).filter(x => x.type && x.url);
  const images = entries.filter(x => x.type === 'image');
  const videos = entries.filter(x => x.type === 'video');
  const audios = entries.filter(x => x.type === 'audio');

  if (images.length > 9) throw new Error('XOGPU MiniMax-H3 最多支持 9 张图片');
  if (videos.length > 3) throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考视频');
  if (audios.length > 3) throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考音频');
  if (entries.length > 12) throw new Error('XOGPU MiniMax-H3 全部参考媒体合计最多 12 个');

  const hasVisual = images.length > 0 || videos.length > 0;
  const allowed = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', 'adaptive'];
  let ratio = String(p.ratio || p.aspectRatio || p.aspect_ratio || (hasVisual ? 'adaptive' : '16:9')).trim().toLowerCase();
  if (!allowed.includes(ratio)) ratio = hasVisual ? 'adaptive' : '16:9';
  if (ratio === 'adaptive' && !hasVisual) throw new Error('XOGPU MiniMax-H3 的 adaptive 比例仅适用于包含图片或视频参考的模式；文生视频请使用固定比例');

  const body = {
    model: 'MiniMax-H3',
    prompt,
    duration,
    ratio,
    group: 'discount_video_generation',
    n: 1
  };

  if (entries.length) {
    const explicitFirst = images.find(x => /first/.test(x.role));
    const explicitLast = images.find(x => /last/.test(x.role));
    const firstFallback = operation === 'first-last-frame' && !explicitFirst ? images[0] : null;
    const lastFallback = operation === 'first-last-frame' && !explicitLast && images.length > 1 ? images[1] : null;

    body.content = [
      { type: 'text', text: prompt },
      ...entries.map(x => {
        // Do not validate URL portability here. The desktop reference transport
        // resolves local /media, file/data URLs or provider uploads immediately
        // before the outbound HTTP request.
        const url = x.url;
        if (x.type === 'video') return { type: 'video_url', video_url: { url }, role: 'reference_video' };
        if (x.type === 'audio') return { type: 'audio_url', audio_url: { url }, role: 'reference_audio' };
        let role = 'reference_image';
        if (x === explicitFirst || x === firstFallback || (operation === 'image-to-video' && images.length === 1 && !videos.length && !audios.length)) role = 'first_frame';
        else if (x === explicitLast || x === lastFallback) role = 'last_frame';
        return { type: 'image_url', image_url: { url }, role };
      })
    ];
  }

  return body;
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
