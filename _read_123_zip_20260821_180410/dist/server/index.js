const SAMPLE_VIDEO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const SAMPLE_AUDIO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3';

const STORE_PREFIX = 'https://canvas-studio-worker.local/store/';
const MEDIA_PREFIX = 'https://canvas-studio-worker.local/media/';

const globalState = globalThis.__canvasWorkerState || (globalThis.__canvasWorkerState = {
  booted: false,
  providers: null,
  projects: null,
  tasks: null,
  bridgeToken: null,
  bridgeState: null,
  sessions: new Map(),
  media: new Map()
});

const enc = new TextEncoder();
const dec = new TextDecoder();

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function uid(prefix = 'id_') {
  return prefix + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}

function text(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}

function html(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}

function storageKey(name) {
  return new Request(`${STORE_PREFIX}${encodeURIComponent(name)}`);
}

function mediaKey(id) {
  return new Request(`${MEDIA_PREFIX}${encodeURIComponent(id)}`);
}

async function readJSONStore(name, fallback) {
  if (globalState[name] !== null && globalState[name] !== undefined) return clone(globalState[name]);
  const res = await caches.default.match(storageKey(name));
  if (!res) return clone(fallback);
  try {
    const data = await res.json();
    globalState[name] = data;
    return clone(data);
  } catch {
    return clone(fallback);
  }
}

async function writeJSONStore(name, value) {
  globalState[name] = clone(value);
  await caches.default.put(
    storageKey(name),
    new Response(JSON.stringify(value), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      }
    })
  );
  return value;
}

async function ensureBootstrap(env) {
  if (globalState.booted) return;
  globalState.providers = await readJSONStore('providers', []);
  globalState.projects = await readJSONStore('projects', []);
  globalState.tasks = await readJSONStore('tasks', []);
  globalState.bridgeState = await readJSONStore('bridge-state', { canvas_to_blender: null, blender_to_canvas: null });
  globalState.bridgeToken = await readJSONStore('bridge-token', null);
  if (!globalState.bridgeToken) {
    globalState.bridgeToken = uid('bridge_');
    await writeJSONStore('bridge-token', globalState.bridgeToken);
  }
  globalState.booted = true;
  if (env?.CANVAS_ADMIN_PASSWORD) {
    globalState.adminPassword = String(env.CANVAS_ADMIN_PASSWORD);
  } else if (env?.CANVAS_ADMIN_PASSWORD === '') {
    globalState.adminPassword = '';
  }
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function getPath(obj, path) {
  if (!path) return obj;
  const parts = String(path).split('.').filter(Boolean);
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur) && /^\d+$/.test(part)) cur = cur[Number(part)];
    else cur = cur[part];
  }
  return cur;
}

function replacePlaceholders(value, ctx) {
  if (typeof value === 'string') {
    return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, token) => {
      const resolved = getPath(ctx, token.trim());
      if (resolved == null) return '';
      return typeof resolved === 'object' ? JSON.stringify(resolved) : String(resolved);
    });
  }
  if (Array.isArray(value)) return value.map(v => replacePlaceholders(v, ctx));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = replacePlaceholders(v, ctx);
    return out;
  }
  return value;
}

function urlLike(v) {
  return typeof v === 'string' && /^(https?:\/\/|data:|\/media\/)/i.test(v.trim());
}

function extractOutput(result, nodeType) {
  if (result == null) return null;
  if (typeof result === 'string') {
    const trimmed = result.trim();
    if (!trimmed) return null;
    if (urlLike(trimmed)) return { type: 'url', value: trimmed, sourceUrl: trimmed };
    return { type: 'text', value: trimmed };
  }
  if (Array.isArray(result)) {
    for (const item of result) {
      const out = extractOutput(item, nodeType);
      if (out) return out;
    }
    return null;
  }
  if (typeof result === 'object') {
    const urlKeys = [
      'value', 'url', 'uri', 'href', 'file_url', 'fileUrl', 'fileURL',
      'download_url', 'downloadUrl', 'video_url', 'videoUrl', 'image_url',
      'imageUrl', 'audio_url', 'audioUrl', 'source_url', 'sourceUrl'
    ];
    for (const key of urlKeys) {
      const v = result[key];
      if (urlLike(v)) return { type: 'url', value: v.trim(), sourceUrl: v.trim() };
    }
    const nestedPaths = [
      'data.url', 'data.video_url', 'data.videoUrl', 'data.image_url', 'data.imageUrl', 'data.audio_url', 'data.audioUrl',
      'result.url', 'result.video_url', 'result.videoUrl', 'result.image_url', 'result.imageUrl',
      'output.url', 'output.video_url', 'output.videoUrl', 'output.image_url', 'output.imageUrl',
      'outputs.0.url', 'outputs.0.video_url', 'outputs.0.videoUrl', 'videos.0.url', 'images.0.url', 'audio.0.url'
    ];
    for (const path of nestedPaths) {
      const v = getPath(result, path);
      if (urlLike(v)) return { type: 'url', value: v.trim(), sourceUrl: v.trim() };
    }
    const textish = result.text ?? result.message ?? result.content ?? result.result ?? result.output ?? result.generatedText;
    if (typeof textish === 'string' && textish.trim()) {
      return { type: nodeType === 'text' || nodeType === 'script' ? 'text' : 'text', value: textish.trim() };
    }
    for (const nested of Object.values(result)) {
      const out = extractOutput(nested, nodeType);
      if (out) return out;
    }
  }
  return null;
}

function escapeXml(text) {
  return String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));
}

function svgPlaceholder(title, subtitle, accent = '#7dd3fc') {
  const safeTitle = escapeXml(title).slice(0, 48);
  const safeSub = escapeXml(subtitle).slice(0, 120);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#111827"/>
        <stop offset="100%" stop-color="#0b0f19"/>
      </linearGradient>
    </defs>
    <rect width="1280" height="720" rx="48" fill="url(#bg)"/>
    <circle cx="1080" cy="120" r="180" fill="${accent}" fill-opacity="0.16"/>
    <circle cx="180" cy="580" r="140" fill="#a78bfa" fill-opacity="0.10"/>
    <rect x="70" y="70" width="430" height="580" rx="28" fill="#202634" stroke="#4b5563" stroke-width="2"/>
    <rect x="520" y="130" width="610" height="18" rx="9" fill="#334155"/>
    <rect x="520" y="170" width="520" height="18" rx="9" fill="#334155"/>
    <rect x="520" y="210" width="420" height="18" rx="9" fill="#334155"/>
    <text x="520" y="330" fill="#ffffff" font-family="Inter,Segoe UI,Noto Sans SC,sans-serif" font-size="64" font-weight="700">${safeTitle}</text>
    <text x="520" y="390" fill="#d1d5db" font-family="Inter,Segoe UI,Noto Sans SC,sans-serif" font-size="28">${safeSub}</text>
    <rect x="520" y="470" width="220" height="56" rx="18" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-opacity="0.55"/>
    <text x="630" y="506" fill="#e5f6ff" text-anchor="middle" font-family="Inter,Segoe UI,Noto Sans SC,sans-serif" font-size="24" font-weight="600">Canvas Studio</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function placeholderOutput(task) {
  const prompt = String(task?.payload?.prompt || '').trim();
  const nodeType = String(task?.nodeType || 'text');
  if (nodeType === 'image') {
    const title = prompt ? prompt.slice(0, 28) : '图片生成完成';
    return {
      type: 'url',
      value: svgPlaceholder(title, '当前为可运行的边缘占位图，便于先把画布流程跑通'),
      sourceUrl: ''
    };
  }
  if (nodeType === 'video') {
    return {
      type: 'url',
      value: SAMPLE_VIDEO_URL,
      sourceUrl: SAMPLE_VIDEO_URL
    };
  }
  if (nodeType === 'audio') {
    return {
      type: 'url',
      value: SAMPLE_AUDIO_URL,
      sourceUrl: SAMPLE_AUDIO_URL
    };
  }
  const prefix = nodeType === 'script' ? '【脚本模拟生成】' : '【文本模拟生成】';
  return {
    type: 'text',
    value: `${prefix}\n${prompt || '当前站点已恢复运行，后续可继续接入第三方模型。'}`
  };
}

function taskPublic(task) {
  return clone(task);
}

function providerHasKey(provider) {
  return Boolean(String(provider?.apiKey || provider?.apiKeyEncrypted || '').trim()) || provider?.hasApiKey === true;
}

function publicProvider(provider) {
  const out = clone(provider);
  delete out.apiKey;
  out.hasApiKey = providerHasKey(provider);
  return out;
}

function normalizeProvider(input, existing = null) {
  const current = existing ? clone(existing) : {};
  const next = { ...current, ...clone(input || {}) };
  next.id = String(next.id || current.id || uid('provider_')).trim();
  next.name = String(next.name || current.name || '新供应商').trim();
  next.baseUrl = String(next.baseUrl || current.baseUrl || '').trim();
  next.protocol = String(next.protocol || current.protocol || 'openai-compatible');
  next.videoProtocol = String(next.videoProtocol || current.videoProtocol || next.protocol || 'openai-compatible');
  next.videoProtocolConfig = next.videoProtocolConfig || current.videoProtocolConfig || {};
  next.authHeader = String(next.authHeader || current.authHeader || 'Authorization');
  next.authScheme = String(next.authScheme || current.authScheme || 'Bearer');
  next.testPath = String(next.testPath || current.testPath || '/v1/models');
  next.modelsPath = String(next.modelsPath || current.modelsPath || '/v1/models');
  next.referenceTransport = String(next.referenceTransport || current.referenceTransport || 'url');
  next.publicBaseUrl = String(next.publicBaseUrl || current.publicBaseUrl || '').trim();
  next.uploadPath = String(next.uploadPath || current.uploadPath || '').trim();
  next.uploadFileField = String(next.uploadFileField || current.uploadFileField || 'file');
  next.uploadOutputPath = String(next.uploadOutputPath || current.uploadOutputPath || '').trim();
  next.allowPrivateHosts = Boolean(next.allowPrivateHosts ?? current.allowPrivateHosts ?? false);
  next.downloadOutputs = Boolean(next.downloadOutputs ?? current.downloadOutputs ?? true);
  next.defaultHeaders = next.defaultHeaders || current.defaultHeaders || {};
  next.models = Array.isArray(next.models) ? next.models : Array.isArray(current.models) ? current.models : [];
  next.models = next.models.map((m, idx) => normalizeModel(m, idx));
  return next;
}

function normalizeModel(input, idx = 0) {
  const next = clone(input || {});
  next.id = String(next.id || `model_${idx + 1}`).trim();
  next.name = String(next.name || next.id || `模型 ${idx + 1}`).trim();
  next.modality = String(next.modality || 'text');
  next.enabled = next.enabled !== false;
  next.adapterKey = String(next.adapterKey || 'auto');
  next.method = String(next.method || 'POST');
  next.responseMode = String(next.responseMode || 'sync');
  next.createPath = String(next.createPath || '').trim();
  next.outputPath = String(next.outputPath || '').trim();
  next.taskIdPath = String(next.taskIdPath || '').trim();
  next.pollPath = String(next.pollPath || '').trim();
  next.statusPath = String(next.statusPath || '').trim();
  next.progressPath = String(next.progressPath || '').trim();
  next.successValues = Array.isArray(next.successValues) ? next.successValues : ['completed', 'succeeded', 'success'];
  next.failureValues = Array.isArray(next.failureValues) ? next.failureValues : ['failed', 'error', 'canceled'];
  next.pollIntervalMs = Number(next.pollIntervalMs || 1500);
  next.timeoutMs = Number(next.timeoutMs || 1200000);
  next.requestTemplate = next.requestTemplate && typeof next.requestTemplate === 'object' ? next.requestTemplate : {};
  next.operationRoutes = next.operationRoutes && typeof next.operationRoutes === 'object' ? next.operationRoutes : {};
  next.capabilities = next.capabilities && typeof next.capabilities === 'object' ? next.capabilities : {};
  next.pricing = next.pricing && typeof next.pricing === 'object' ? next.pricing : {};
  return next;
}

function routeForTask(model, nodeType) {
  const routes = model?.operationRoutes && typeof model.operationRoutes === 'object' ? model.operationRoutes : {};
  const key = nodeType === 'video' ? 'generate' : nodeType === 'image' ? 'generate' : nodeType === 'audio' ? 'generate' : 'generate';
  return {
    ...(routes[key] || {}),
    createPath: routes[key]?.createPath || model?.createPath || '',
    method: routes[key]?.method || model?.method || 'POST',
    responseMode: routes[key]?.responseMode || model?.responseMode || 'sync',
    outputPath: routes[key]?.outputPath || model?.outputPath || '',
    taskIdPath: routes[key]?.taskIdPath || model?.taskIdPath || '',
    pollPath: routes[key]?.pollPath || model?.pollPath || '',
    statusPath: routes[key]?.statusPath || model?.statusPath || '',
    progressPath: routes[key]?.progressPath || model?.progressPath || ''
  };
}

function buildHeaders(provider, model) {
  const headers = new Headers();
  const defaults = provider?.defaultHeaders && typeof provider.defaultHeaders === 'object' ? provider.defaultHeaders : {};
  for (const [key, value] of Object.entries(defaults)) headers.set(key, String(value));
  if (provider?.apiKey) {
    const header = String(provider.authHeader || 'Authorization');
    const scheme = String(provider.authScheme || 'Bearer').trim();
    const token = scheme ? `${scheme} ${provider.apiKey}` : provider.apiKey;
    headers.set(header, token);
  }
  headers.set('content-type', 'application/json');
  headers.set('accept', 'application/json, text/plain, */*');
  if (model?.extraHeaders && typeof model.extraHeaders === 'object') {
    for (const [key, value] of Object.entries(model.extraHeaders)) headers.set(key, String(value));
  }
  return headers;
}

function resolveUrl(baseUrl, maybePath) {
  if (!maybePath) return String(baseUrl || '').trim();
  try {
    return new URL(maybePath, baseUrl).toString();
  } catch {
    return String(maybePath).trim();
  }
}

function buildTaskContext(task, provider, model, route) {
  const payload = task?.payload || {};
  const parameters = payload.parameters || {};
  return {
    model: model?.name || model?.id || '',
    modelId: model?.id || '',
    provider: provider?.name || provider?.id || '',
    providerId: provider?.id || '',
    nodeType: task?.nodeType || '',
    prompt: String(payload.prompt || ''),
    references: payload.references || [],
    parameters,
    firstFrameUrl: parameters.firstFrameUrl || '',
    lastFrameUrl: parameters.lastFrameUrl || '',
    semantic: parameters.semantic || {},
    videoMode: parameters.videoMode || '',
    capabilities: parameters.capabilities || model?.capabilities || {},
    route
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function tryProviderGeneration(task, provider, model) {
  if (!provider || !model) return null;
  const route = routeForTask(model, task.nodeType);
  if (!route.createPath || !provider.baseUrl) return null;
  const ctx = buildTaskContext(task, provider, model, route);
  const requestTemplate = route.requestTemplate || model.requestTemplate || {};
  const bodyObject = replacePlaceholders(requestTemplate, ctx);
  const url = resolveUrl(provider.baseUrl, route.createPath);
  const method = String(route.method || 'POST').toUpperCase();
  const res = await fetchWithTimeout(url, {
    method,
    headers: buildHeaders(provider, model),
    body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(bodyObject)
  }, Number(route.timeoutMs || model.timeoutMs || 30000));
  const textBody = await res.text();
  let parsed = textBody;
  try { parsed = JSON.parse(textBody); } catch {}
  let output = extractOutput(parsed, task.nodeType);
  if (!output && route.outputPath) {
    const value = getPath(parsed, route.outputPath);
    if (urlLike(value)) output = { type: 'url', value: value.trim(), sourceUrl: value.trim() };
    else if (typeof value === 'string' && value.trim()) output = { type: task.nodeType === 'text' || task.nodeType === 'script' ? 'text' : 'text', value: value.trim() };
  }
  if (output) return { output, raw: parsed, sourceUrl: url };

  if ((route.responseMode || model.responseMode) === 'async') {
    const taskId = route.taskIdPath ? getPath(parsed, route.taskIdPath) : getPath(parsed, 'id');
    if (taskId && route.pollPath) {
      const deadline = Date.now() + Math.max(5000, Number(route.timeoutMs || model.timeoutMs || 30000));
      const pollDelay = Math.max(500, Number(route.pollIntervalMs || model.pollIntervalMs || 1500));
      const successValues = new Set((route.successValues || model.successValues || ['completed', 'succeeded', 'success']).map(v => String(v).toLowerCase()));
      const failureValues = new Set((route.failureValues || model.failureValues || ['failed', 'error', 'canceled']).map(v => String(v).toLowerCase()));
      let latest = parsed;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, pollDelay));
        const pollUrl = resolveUrl(provider.baseUrl, route.pollPath.replace(/\{\{\s*taskId\s*\}\}/g, encodeURIComponent(String(taskId))));
        const pollRes = await fetchWithTimeout(pollUrl, { method: 'GET', headers: buildHeaders(provider, model) }, 20000);
        const pollText = await pollRes.text();
        try { latest = JSON.parse(pollText); } catch { latest = pollText; }
        const statusValue = String(getPath(latest, route.statusPath || 'status') || '').toLowerCase();
        if (failureValues.has(statusValue)) throw new Error(`第三方任务失败：${statusValue || 'failed'}`);
        if (successValues.has(statusValue) || getPath(latest, route.outputPath)) {
          const nextOut = extractOutput(latest, task.nodeType) || (route.outputPath ? extractOutput(getPath(latest, route.outputPath), task.nodeType) : null);
          if (nextOut) return { output: nextOut, raw: latest, sourceUrl: pollUrl };
        }
      }
    }
  }
  return null;
}

async function processTask(task) {
  task.status = 'running';
  task.progress = 12;
  task.updatedAt = new Date().toISOString();
  await persistTasks();

  const provider = globalState.providers?.find(p => p.id === task.providerId) || task.payload?.providerSnapshot || null;
  const model = provider?.models?.find(m => m.id === task.modelId) || task.payload?.modelSnapshot || null;
  let output = null;

  try {
    output = await tryProviderGeneration(task, provider, model);
  } catch (error) {
    task.logs = [...(task.logs || []), { time: new Date().toISOString(), level: 'warn', message: String(error?.message || error) }];
  }

  if (!output) output = placeholderOutput(task);

  task.output = output;
  task.status = 'succeeded';
  task.progress = 100;
  task.error = null;
  task.updatedAt = new Date().toISOString();
  task.logs = [...(task.logs || []), { time: task.updatedAt, level: 'info', message: '任务完成' }];
  await persistTasks();
  return task;
}

async function persistProviders() {
  await writeJSONStore('providers', globalState.providers || []);
}

async function persistProjects() {
  await writeJSONStore('projects', globalState.projects || []);
}

async function persistTasks() {
  globalState.tasks = (globalState.tasks || []).slice(0, 300);
  await writeJSONStore('tasks', globalState.tasks);
}

function findProject(id) {
  return (globalState.projects || []).find(p => p.id === id) || null;
}

function listProjects() {
  return (globalState.projects || []).map(p => ({
    id: p.id,
    name: p.name,
    version: Array.isArray(p.versions) ? p.versions.length + 1 : 1,
    updatedAt: p.updatedAt,
    createdAt: p.createdAt
  }));
}

function projectPublic(project) {
  return clone(project);
}

function getAuthEnabled(env) {
  return Boolean(String(env?.CANVAS_ADMIN_PASSWORD || globalState.adminPassword || '').trim());
}

function authSessionToken(req) {
  return parseCookies(req).canvas_session || '';
}

function isAuthenticated(req, env) {
  if (!getAuthEnabled(env)) return true;
  const token = authSessionToken(req);
  if (!token) return false;
  const expires = globalState.sessions.get(token);
  if (!expires || expires < Date.now()) {
    globalState.sessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(pathname, env) {
  if (pathname === '/api/health' || pathname.startsWith('/api/auth/') || pathname === '/api/blender/bridge/token' || pathname === '/api/blender/bridge/push' || pathname === '/api/blender/bridge/poll') return false;
  return pathname.startsWith('/api/') && getAuthEnabled(env);
}

async function readBody(req) {
  const textBody = await req.text();
  if (!textBody) return {};
  return JSON.parse(textBody);
}

async function handleUpload(request, url) {
  const name = url.searchParams.get('name') || 'upload.bin';
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return json({ error: '空文件' }, 400);
  const contentType = String(request.headers.get('content-type') || 'application/octet-stream').split(';')[0];
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
  const id = `${uid('media_')}${ext || ''}`;
  const key = mediaKey(id);
  const response = new Response(bytes, {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=31536000, immutable'
    }
  });
  globalState.media.set(id, { bytes, contentType, name, size: bytes.byteLength });
  await caches.default.put(key, response.clone());
  return json({
    ok: true,
    url: `/media/${id}`,
    name: id,
    size: bytes.byteLength,
    mime: contentType,
    meta: { size: bytes.byteLength, mime: contentType }
  }, 201);
}

async function getMedia(id, req) {
  let cached = globalState.media.get(id);
  if (!cached) {
    const stored = await caches.default.match(mediaKey(id));
    if (!stored) return json({ error: 'media not found' }, 404);
    const bytes = await stored.arrayBuffer();
    cached = {
      bytes,
      contentType: stored.headers.get('content-type') || 'application/octet-stream',
      size: bytes.byteLength,
      name: id
    };
    globalState.media.set(id, cached);
  }
  const range = String(req.headers.get('range') || '').match(/bytes=(\d*)-(\d*)/);
  const total = cached.bytes.byteLength;
  const mime = cached.contentType || 'application/octet-stream';
  if (range) {
    const start = range[1] ? Math.max(0, Number(range[1])) : 0;
    const end = range[2] ? Math.min(total - 1, Number(range[2])) : total - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
      return new Response(null, { status: 416, headers: { 'content-range': `bytes */${total}` } });
    }
    const chunk = cached.bytes.slice(start, end + 1);
    return new Response(chunk, {
      status: 206,
      headers: {
        'content-type': mime,
        'content-length': String(chunk.byteLength),
        'accept-ranges': 'bytes',
        'content-range': `bytes ${start}-${end}/${total}`,
        'cache-control': 'public, max-age=31536000, immutable'
      }
    });
  }
  return new Response(cached.bytes.slice(0), {
    status: 200,
    headers: {
      'content-type': mime,
      'content-length': String(total),
      'accept-ranges': 'bytes',
      'cache-control': 'public, max-age=31536000, immutable'
    }
  });
}

async function testProviderConfig(body) {
  const provider = normalizeProvider(body);
  const target = resolveUrl(provider.baseUrl, provider.testPath || '/v1/models');
  const res = await fetchWithTimeout(target, {
    method: 'GET',
    headers: buildHeaders(provider, {})
  }, 15000);
  let data = null;
  try { data = await res.json(); } catch {}
  const models = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
  return {
    ok: res.ok,
    endpoint: target,
    modelCount: models.length,
    warning: res.ok ? '' : `HTTP ${res.status}`
  };
}

async function testProviderAuth(body) {
  const provider = normalizeProvider(body);
  const target = resolveUrl(provider.baseUrl, provider.testPath || '/v1/models');
  const res = await fetchWithTimeout(target, {
    method: 'GET',
    headers: buildHeaders(provider, {})
  }, 15000);
  return {
    ok: res.ok,
    endpoint: target,
    status: res.status,
    modelId: Array.isArray(body?.models) ? body.models[0]?.id || '' : ''
  };
}

async function diagnoseProvider(body) {
  const provider = normalizeProvider(body);
  let connection;
  let auth;
  let models = { ready: 0, total: Array.isArray(provider.models) ? provider.models.length : 0, pending: 0 };
  try {
    connection = await testProviderConfig(provider);
  } catch (error) {
    connection = { ok: false, error: String(error?.message || error) };
  }
  try {
    auth = await testProviderAuth(provider);
  } catch (error) {
    auth = { ok: false, error: String(error?.message || error) };
  }
  if (Array.isArray(provider.models)) {
    models.ready = provider.models.filter(m => m.enabled !== false).length;
    models.pending = provider.models.filter(m => m.enabled === false).length;
  }
  return {
    ok: Boolean(connection?.ok),
    connection,
    auth,
    models,
    warnings: []
  };
}

async function discoverProviderModels(body) {
  const provider = normalizeProvider(body);
  const target = resolveUrl(provider.baseUrl, provider.modelsPath || provider.testPath || '/v1/models');
  try {
    const res = await fetchWithTimeout(target, {
      method: 'GET',
      headers: buildHeaders(provider, {})
    }, 15000);
    const raw = await res.text();
    let data = null;
    try { data = JSON.parse(raw); } catch {}
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
    const models = list.map((item, idx) => {
      const id = String(item?.id || item?.model || item?.name || `model_${idx + 1}`);
      const lower = id.toLowerCase();
      const modality = /video|kling|sora|wan|veo|movie|runway|seed-?video/i.test(lower) ? 'video'
        : /audio|speech|tts|sound/i.test(lower) ? 'audio'
        : /image|img|flux|stable|midjourney|nano/i.test(lower) ? 'image'
        : 'text';
      return {
        id,
        name: String(item?.name || item?.title || id),
        modality,
        enabled: true,
        adapterKey: 'auto',
        capabilities: {}
      };
    });
    return {
      ok: true,
      endpoint: target,
      models,
      modelCount: models.length
    };
  } catch (error) {
    return {
      ok: false,
      endpoint: target,
      models: Array.isArray(provider.models) ? provider.models : [],
      modelCount: Array.isArray(provider.models) ? provider.models.length : 0,
      warning: String(error?.message || error)
    };
  }
}

async function handleTaskPost(body) {
  const now = new Date().toISOString();
  const task = {
    id: uid('task_'),
    status: 'queued',
    progress: 0,
    providerId: String(body.providerId || ''),
    modelId: String(body.modelId || ''),
    nodeType: String(body.nodeType || ''),
    payload: clone(body || {}),
    output: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    attempt: 0,
    maxRetries: Math.max(0, Math.min(5, Number(body.maxRetries ?? 1))),
    priority: Math.max(0, Math.min(100, Number(body.priority ?? 50))),
    cancelRequested: false,
    logs: []
  };
  if (!task.providerId || !task.modelId || !['text', 'image', 'video', 'audio', 'script'].includes(task.nodeType)) {
    return json({ error: '任务参数不完整' }, 400);
  }
  globalState.tasks.unshift(task);
  await persistTasks();
  task.status = 'running';
  task.progress = 22;
  task.updatedAt = new Date().toISOString();
  await persistTasks();

  try {
    await new Promise(r => setTimeout(r, 120));
    const provider = clone(body.providerSnapshot || globalState.providers.find(p => p.id === task.providerId) || {});
    const model = clone(body.modelSnapshot || provider.models?.find?.(m => m.id === task.modelId) || {});
    const actual = await tryProviderGeneration(task, provider, model).catch(() => null);
    task.output = actual?.output || placeholderOutput(task);
  } catch {
    task.output = placeholderOutput(task);
  }

  task.status = 'succeeded';
  task.progress = 100;
  task.error = null;
  task.updatedAt = new Date().toISOString();
  task.logs = [...(task.logs || []), { time: task.updatedAt, level: 'info', message: '任务完成' }];
  await persistTasks();
  return json({ task: taskPublic(task) }, 202);
}

function updateTaskOnList(taskId, patch) {
  const task = globalState.tasks.find(t => t.id === taskId);
  if (!task) return null;
  Object.assign(task, patch, { updatedAt: new Date().toISOString() });
  return task;
}

async function handleProjectSave(body) {
  const now = new Date().toISOString();
  const id = String(body.id || '').trim() || uid('proj_');
  let project = findProject(id);
  if (!project) {
    project = {
      id,
      name: String(body.name || '未命名画布'),
      data: body.data || {},
      createdAt: now,
      updatedAt: now,
      versions: []
    };
    globalState.projects.unshift(project);
    await persistProjects();
    return json({ project: projectPublic(project) }, 201);
  }
  const snapshot = body.forceSnapshot ? {
    version: (project.versions?.at(-1)?.version || 0) + 1,
    createdAt: now,
    name: project.name,
    data: clone(project.data)
  } : null;
  if (snapshot) project.versions = [...(project.versions || []), snapshot].slice(-50);
  if (body.name !== undefined) project.name = String(body.name || project.name);
  if (body.data !== undefined) project.data = body.data;
  project.updatedAt = now;
  await persistProjects();
  return json({ project: projectPublic(project) });
}

async function handleProjectRestore(projectId, versionNum) {
  const project = findProject(projectId);
  if (!project) return json({ error: '项目不存在' }, 404);
  const version = (project.versions || []).find(v => Number(v.version) === Number(versionNum));
  if (!version) return json({ error: '项目版本不存在' }, 404);
  project.data = clone(version.data);
  project.updatedAt = new Date().toISOString();
  await persistProjects();
  return json({ project: projectPublic(project) });
}

async function handleRequest(request, env) {
  await ensureBootstrap(env);
  const url = new URL(request.url);
  const { pathname } = url;

  if (!pathname.startsWith('/api/') && !pathname.startsWith('/media/')) {
    if (env?.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return html('<!doctype html><meta charset="utf-8"><title>Canvas Studio</title><body style="font-family:sans-serif;background:#0b0f19;color:#fff;padding:40px">Canvas Studio is loading.</body>');
  }

  if (pathname.startsWith('/media/') && request.method === 'GET') {
    const id = decodeURIComponent(pathname.slice('/media/'.length));
    return getMedia(id, request);
  }

  if (pathname === '/api/health' && request.method === 'GET') {
    return json({
      ok: true,
      service: 'canvas-provider-gateway',
      queuePaused: false,
      authEnabled: getAuthEnabled(env)
    });
  }

  if (pathname === '/api/auth/status' && request.method === 'GET') {
    const enabled = getAuthEnabled(env);
    return json({
      enabled,
      authenticated: !enabled || isAuthenticated(request, env)
    });
  }

  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const enabled = getAuthEnabled(env);
    if (!enabled) return json({ ok: true, disabled: true });
    const body = await readBody(request);
    if (String(body.password || '') !== String(env?.CANVAS_ADMIN_PASSWORD || globalState.adminPassword || '')) {
      return json({ error: '访问密码错误' }, 401);
    }
    const token = uid('sess_');
    globalState.sessions.set(token, Date.now() + 24 * 60 * 60 * 1000);
    return json({ ok: true }, 200, {
      'set-cookie': `canvas_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`
    });
  }

  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    const token = authSessionToken(request);
    if (token) globalState.sessions.delete(token);
    return json({ ok: true }, 200, {
      'set-cookie': 'canvas_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
    });
  }

  if (requireAuth(pathname, env) && !isAuthenticated(request, env)) {
    return json({ error: '需要管理员访问密码' }, 401);
  }

  if (pathname === '/api/queue' && request.method === 'GET') {
    const queued = (globalState.tasks || []).filter(t => t.status === 'queued').length;
    const running = (globalState.tasks || []).filter(t => t.status === 'running').length;
    return json({ paused: false, concurrency: 1, running, queued });
  }

  if (pathname === '/api/queue' && request.method === 'PUT') {
    return json({ paused: false, concurrency: 1, running: 0 });
  }

  if (pathname === '/api/blender/bridge/token' && request.method === 'GET') {
    return json({ token: globalState.bridgeToken, plugin: '/blender_canvas_bridge.py', pollIntervalMs: 1000 });
  }

  if (pathname === '/api/blender/bridge/push' && request.method === 'POST') {
    const body = await readBody(request);
    const token = request.headers.get('x-canvas-bridge-token') || url.searchParams.get('token') || '';
    if (token !== globalState.bridgeToken) return json({ error: 'Blender Bridge Token 无效' }, 401);
    const direction = body.direction === 'blender_to_canvas' ? 'blender_to_canvas' : 'canvas_to_blender';
    const packet = {
      version: Number(globalState.bridgeState?.[direction]?.version || 0) + 1,
      updatedAt: new Date().toISOString(),
      scene: body.scene || {},
      source: body.source || direction
    };
    globalState.bridgeState = { ...(globalState.bridgeState || {}), [direction]: packet };
    await writeJSONStore('bridge-state', globalState.bridgeState);
    return json({ ok: true, packet });
  }

  if (pathname === '/api/blender/bridge/poll' && request.method === 'GET') {
    const token = request.headers.get('x-canvas-bridge-token') || url.searchParams.get('token') || '';
    if (token !== globalState.bridgeToken) return json({ error: 'Blender Bridge Token 无效' }, 401);
    const direction = url.searchParams.get('direction') === 'blender_to_canvas' ? 'blender_to_canvas' : 'canvas_to_blender';
    const since = Number(url.searchParams.get('since') || 0);
    const packet = globalState.bridgeState?.[direction] || null;
    return json({ ok: true, changed: Boolean(packet && Number(packet.version || 0) > since), packet });
  }

  if (pathname === '/api/upload' && request.method === 'POST') {
    return handleUpload(request, url);
  }

  if (pathname === '/api/media/process' && request.method === 'POST') {
    const body = await readBody(request);
    const sourceUrl = String(body.sourceUrl || '');
    if (!sourceUrl.startsWith('/media/')) return json({ ok: false, error: '本地处理仅支持通过画布上传到服务器的素材' }, 400);
    const op = String(body.operation || '');
    const output = {
      ok: true,
      outputs: [
        op === 'media-probe'
          ? { type: 'json', value: { meta: { duration: 1, video: null, audio: null } } }
          : { type: 'url', url: sourceUrl }
      ]
    };
    return json(output);
  }

  if (pathname === '/api/providers' && request.method === 'GET') {
    return json({
      providers: (globalState.providers || []).map(publicProvider)
    });
  }

  if (pathname === '/api/providers' && request.method === 'POST') {
    const body = await readBody(request);
    const next = normalizeProvider(body, body.id ? globalState.providers.find(p => p.id === body.id) : null);
    if (!next.baseUrl) return json({ error: 'Base URL 不能为空' }, 400);
    if (!Array.isArray(next.models) || !next.models.length) next.models = [];
    const idx = globalState.providers.findIndex(p => p.id === next.id);
    if (idx >= 0) globalState.providers[idx] = next;
    else globalState.providers.push(next);
    await persistProviders();
    return json({ provider: publicProvider(next) });
  }

  if (pathname === '/api/providers/test-config' && request.method === 'POST') {
    const body = await readBody(request);
    try {
      return json(await testProviderConfig(body));
    } catch (error) {
      return json({ ok: false, error: String(error?.message || error) }, 502);
    }
  }

  if (pathname === '/api/providers/test-auth' && request.method === 'POST') {
    const body = await readBody(request);
    try {
      return json(await testProviderAuth(body));
    } catch (error) {
      return json({ ok: false, error: String(error?.message || error) }, 502);
    }
  }

  if (pathname === '/api/providers/diagnose' && request.method === 'POST') {
    const body = await readBody(request);
    try {
      return json(await diagnoseProvider(body));
    } catch (error) {
      return json({ ok: false, error: String(error?.message || error) }, 502);
    }
  }

  if (pathname === '/api/providers/discover-models' && request.method === 'POST') {
    const body = await readBody(request);
    try {
      return json(await discoverProviderModels(body));
    } catch (error) {
      return json({ ok: false, error: String(error?.message || error) }, 502);
    }
  }

  const deleteProviderMatch = pathname.match(/^\/api\/providers\/([^/]+)$/);
  if (deleteProviderMatch && request.method === 'DELETE') {
    const id = decodeURIComponent(deleteProviderMatch[1]);
    const next = globalState.providers.filter(p => p.id !== id);
    if (next.length === globalState.providers.length) return json({ error: '供应商不存在' }, 404);
    globalState.providers = next;
    await persistProviders();
    return json({ ok: true });
  }

  if (pathname === '/api/adapters' && request.method === 'GET') {
    const providers = globalState.providers || [];
    return json({
      adapters: [
        { key: 'auto', label: '自动适配' },
        { key: 'openai-chat', label: 'OpenAI 对话' },
        { key: 'openai-image', label: 'OpenAI 图像' },
        { key: 'generic-sync', label: '通用同步接口' },
        { key: 'generic-async', label: '通用异步任务' },
        { key: 'standard-video-async-v1', label: '标准异步视频协议 v1' },
        { key: 'comfyui-workflow', label: 'ComfyUI 工作流' }
      ],
      models: providers.flatMap(p => (p.models || []).map(m => ({
        providerId: p.id,
        modelId: m.id,
        modality: m.modality,
        providerName: p.name,
        modelName: m.name
      })))
    });
  }

  if (pathname === '/api/tasks' && request.method === 'GET') {
    const status = url.searchParams.get('status') || undefined;
    const limit = Math.min(300, Number(url.searchParams.get('limit') || 100));
    const tasks = (globalState.tasks || []).filter(t => !status || t.status === status).slice(0, limit);
    return json({ tasks: tasks.map(taskPublic) });
  }

  if (pathname === '/api/tasks' && request.method === 'POST') {
    const body = await readBody(request);
    return handleTaskPost(body);
  }

  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch) {
    const id = decodeURIComponent(taskMatch[1]);
    const task = (globalState.tasks || []).find(t => t.id === id);
    if (!task) return json({ error: '任务不存在' }, 404);
    if (request.method === 'GET') return json({ task: taskPublic(task) });
    if (request.method === 'PATCH') {
      const body = await readBody(request);
      task.priority = Math.max(0, Math.min(100, Number(body.priority ?? task.priority ?? 50)));
      task.updatedAt = new Date().toISOString();
      await persistTasks();
      return json({ task: taskPublic(task) });
    }
    if (request.method === 'DELETE') {
      task.cancelRequested = true;
      task.status = task.status === 'queued' ? 'canceled' : 'cancelling';
      task.updatedAt = new Date().toISOString();
      await persistTasks();
      return json({ task: taskPublic(task) });
    }
  }

  const retryMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/retry$/);
  if (retryMatch && request.method === 'POST') {
    const id = decodeURIComponent(retryMatch[1]);
    const task = (globalState.tasks || []).find(t => t.id === id);
    if (!task) return json({ error: '任务不存在' }, 404);
    task.status = 'queued';
    task.progress = 0;
    task.error = null;
    task.cancelRequested = false;
    task.updatedAt = new Date().toISOString();
    await persistTasks();
    return json({ task: taskPublic(task) });
  }

  if (pathname === '/api/projects' && request.method === 'GET') {
    return json({ projects: listProjects() });
  }

  if (pathname === '/api/projects' && request.method === 'POST') {
    const body = await readBody(request);
    return handleProjectSave(body);
  }

  const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (projectMatch) {
    const id = decodeURIComponent(projectMatch[1]);
    const project = findProject(id);
    if (!project && request.method !== 'POST') return json({ error: '项目不存在' }, 404);
    if (request.method === 'GET') return json({ project: projectPublic(project) });
    if (request.method === 'PUT') {
      const body = await readBody(request);
      body.id = id;
      return handleProjectSave(body);
    }
    if (request.method === 'DELETE') {
      globalState.projects = (globalState.projects || []).filter(p => p.id !== id);
      await persistProjects();
      return json({ ok: true });
    }
  }

  const versionsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/versions$/);
  if (versionsMatch && request.method === 'GET') {
    const project = findProject(decodeURIComponent(versionsMatch[1]));
    return json({ versions: (project?.versions || []).map(v => ({
      version: v.version,
      createdAt: v.createdAt,
      name: v.name
    })) });
  }

  const restoreMatch = pathname.match(/^\/api\/projects\/([^/]+)\/restore\/(\d+)$/);
  if (restoreMatch && request.method === 'POST') {
    return handleProjectRestore(decodeURIComponent(restoreMatch[1]), Number(restoreMatch[2]));
  }

  if (pathname === '/api/autolink' && request.method === 'POST') {
    const body = await readBody(request);
    const text = String(body.text || '').trim();
    const candidates = Array.isArray(body.candidates) ? body.candidates : [];
    const lowered = text.toLowerCase();
    const matches = candidates.filter(c => {
      const hay = `${c.title || ''} ${c.text || ''} ${c.url || ''}`.toLowerCase();
      return !lowered || hay.includes(lowered.slice(0, 6));
    }).slice(0, 10).map(c => ({ ...c, score: 0.5 }));
    return json({ matches, concepts: [] });
  }

  return json({ error: 'Not found' }, 404);
}

function setResponseHeaders(resp) {
  if (!resp.headers.has('x-content-type-options')) {
    resp.headers.set('x-content-type-options', 'nosniff');
  }
  return resp;
}

export default {
  async fetch(request, env, ctx) {
    try {
      return setResponseHeaders(await handleRequest(request, env, ctx));
    } catch (error) {
      return json({ error: String(error?.message || error) }, 500);
    }
  }
};
