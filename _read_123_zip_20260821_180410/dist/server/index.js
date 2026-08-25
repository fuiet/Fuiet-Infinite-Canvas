const globalState = globalThis.__canvasWorkerState || (globalThis.__canvasWorkerState = {
  booted: false,
  supabase: null,
  providers: null,
  projects: null,
  tasks: null,
  bridgeToken: null,
  bridgeState: null,
  sessions: new Map(),
  media: new Map()
});

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function uid(prefix = 'id_') {
  return prefix + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function getSupabaseConfig(env) {
  const url = String(env?.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = String(env?.SUPABASE_SERVICE_ROLE_KEY || env?.SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) return null;
  return { url, key };
}

function supabaseHeaders(cfg, extra = {}) {
  const headers = new Headers({
    apikey: cfg.key,
    authorization: `Bearer ${cfg.key}`,
    ...extra
  });
  return headers;
}

async function supabaseRequest(env, path, { method = 'GET', body, headers = {}, query = '' } = {}) {
  const cfg = getSupabaseConfig(env);
  if (!cfg) throw new Error('Supabase 未配置');
  const url = new URL(`${cfg.url}/rest/v1/${String(path).replace(/^\/+/, '')}`);
  if (query) {
    const q = new URLSearchParams(query);
    for (const [k, v] of q.entries()) url.searchParams.set(k, v);
  }
  const reqHeaders = supabaseHeaders(cfg, headers);
  const init = { method, headers: reqHeaders };
  if (body !== undefined) {
    if (!reqHeaders.has('content-type')) reqHeaders.set('content-type', 'application/json');
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!res.ok) {
    const message = data?.message || data?.error || raw || `Supabase ${res.status}`;
    throw new Error(message);
  }
  return data;
}

function supabaseStorageBucket(env) {
  return String(env?.SUPABASE_STORAGE_BUCKET || 'canvas-media').trim() || 'canvas-media';
}

async function supabaseStorageRequest(env, bucket, objectPath, { method = 'GET', body, headers = {} } = {}) {
  const cfg = getSupabaseConfig(env);
  if (!cfg) throw new Error('Supabase 未配置');
  const url = new URL(`${cfg.url}/storage/v1/object/${encodeURIComponent(bucket)}/${String(objectPath).split('/').map(encodeURIComponent).join('/')}`);
  const reqHeaders = supabaseHeaders(cfg, headers);
  const init = { method, headers: reqHeaders };
  if (body !== undefined) {
    init.body = body;
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const raw = await res.text();
    throw new Error(raw || `Storage ${res.status}`);
  }
  return res;
}

function hydrateProjectRow(row) {
  const data = clone(row?.data || {});
  const out = {
    ...data,
    id: String(row?.id || data.id || uid('proj_')),
    name: String(row?.name || data.name || '未命名画布'),
    createdAt: row?.created_at || data.createdAt || new Date().toISOString(),
    updatedAt: row?.updated_at || data.updatedAt || new Date().toISOString()
  };
  if (Array.isArray(out.versions)) out.versions = out.versions.map(v => clone(v));
  if (out.data && typeof out.data === 'object') out.data = clone(out.data);
  return out;
}

function serializeProjectRow(project) {
  const data = clone(project || {});
  return {
    id: String(project?.id || uid('proj_')),
    name: String(project?.name || '未命名画布'),
    data
  };
}

function hydrateProviderRow(row) {
  const data = clone(row?.data || {});
  const out = {
    ...data,
    id: String(row?.id || data.id || uid('provider_')),
    name: String(row?.name || data.name || '新供应商'),
    createdAt: row?.created_at || data.createdAt || new Date().toISOString(),
    updatedAt: row?.updated_at || data.updatedAt || new Date().toISOString()
  };
  if (Array.isArray(out.models)) out.models = out.models.map(m => clone(m));
  return out;
}

function serializeProviderRow(provider) {
  return {
    id: String(provider?.id || uid('provider_')),
    name: String(provider?.name || '新供应商'),
    data: clone(provider || {})
  };
}

function hydrateTaskRow(row) {
  const payload = clone(row?.payload || {});
  const out = {
    ...payload,
    id: String(row?.id || payload.id || uid('task_')),
    status: String(row?.status || payload.status || 'queued'),
    progress: Number(row?.progress ?? payload.progress ?? 0),
    providerId: String(row?.provider_id || payload.providerId || ''),
    modelId: String(row?.model_id || payload.modelId || ''),
    nodeId: String(row?.node_id || payload.nodeId || ''),
    nodeType: String(row?.node_type || payload.nodeType || ''),
    payload: clone(payload),
    output: clone(row?.output ?? payload.output ?? null),
    error: row?.error ?? payload.error ?? null,
    createdAt: row?.created_at || payload.createdAt || new Date().toISOString(),
    updatedAt: row?.updated_at || payload.updatedAt || new Date().toISOString(),
    attempt: Number(payload.attempt ?? 0),
    maxRetries: Number(payload.maxRetries ?? 1),
    priority: Number(payload.priority ?? 50),
    cancelRequested: Boolean(payload.cancelRequested ?? false),
    logs: Array.isArray(payload.logs) ? payload.logs.map(x => clone(x)) : []
  };
  return out;
}

function serializeTaskRow(task) {
  const payload = clone(task?.payload || {});
  payload.attempt = Number(task?.attempt ?? payload.attempt ?? 0);
  payload.maxRetries = Number(task?.maxRetries ?? payload.maxRetries ?? 1);
  payload.priority = Number(task?.priority ?? payload.priority ?? 50);
  payload.cancelRequested = Boolean(task?.cancelRequested ?? payload.cancelRequested ?? false);
  payload.logs = Array.isArray(task?.logs) ? clone(task.logs) : Array.isArray(payload.logs) ? payload.logs : [];
  payload.status = String(task?.status || payload.status || 'queued');
  payload.progress = Number(task?.progress ?? payload.progress ?? 0);
  payload.providerId = String(task?.providerId || payload.providerId || '');
  payload.modelId = String(task?.modelId || payload.modelId || '');
  payload.nodeId = String(task?.nodeId || payload.nodeId || '');
  payload.nodeType = String(task?.nodeType || payload.nodeType || '');
  payload.output = clone(task?.output ?? payload.output ?? null);
  payload.error = task?.error ?? payload.error ?? null;
  payload.createdAt = task?.createdAt || payload.createdAt || new Date().toISOString();
  payload.updatedAt = task?.updatedAt || payload.updatedAt || new Date().toISOString();
  return {
    id: String(task?.id || uid('task_')),
    project_id: String(task?.projectId || task?.project_id || ''),
    provider_id: String(task?.providerId || task?.provider_id || ''),
    model_id: String(task?.modelId || task?.model_id || ''),
    node_id: String(task?.nodeId || task?.node_id || ''),
    node_type: String(task?.nodeType || task?.node_type || ''),
    status: String(task?.status || 'queued'),
    progress: Number(task?.progress ?? 0),
    payload,
    output: clone(task?.output ?? null),
    error: task?.error ?? null,
    created_at: task?.createdAt || task?.created_at || new Date().toISOString(),
    updated_at: task?.updatedAt || task?.updated_at || new Date().toISOString()
  };
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

async function readJSONStore(name, fallback) {
  const cfg = globalState.supabase;
  if (cfg && ['providers', 'projects', 'tasks'].includes(name)) {
    try {
      const rows = await supabaseRequest({ SUPABASE_URL: cfg.url, SUPABASE_SERVICE_ROLE_KEY: cfg.key }, name, {
        method: 'GET',
        query: 'select=*'
      });
      const list = Array.isArray(rows) ? rows : [];
      if (name === 'providers') return list.map(hydrateProviderRow);
      if (name === 'projects') return list.map(hydrateProjectRow);
      if (name === 'tasks') return list.map(hydrateTaskRow);
    } catch (error) {
      console.warn(`[canvas] failed to read ${name} from supabase`, error);
    }
  }
  if (globalState[name] !== null && globalState[name] !== undefined) return clone(globalState[name]);
  return clone(fallback);
}

async function writeJSONStore(name, value) {
  const cfg = globalState.supabase;
  if (cfg && ['providers', 'projects', 'tasks'].includes(name)) {
    const rows = Array.isArray(value) ? value : [];
    const serialized = name === 'providers'
      ? rows.map(serializeProviderRow)
      : name === 'projects'
        ? rows.map(serializeProjectRow)
        : rows.map(serializeTaskRow);
    const currentRows = await supabaseRequest({ SUPABASE_URL: cfg.url, SUPABASE_SERVICE_ROLE_KEY: cfg.key }, name, {
      method: 'GET',
      query: 'select=id'
    }).catch(() => []);
    const currentIds = new Set(Array.isArray(currentRows) ? currentRows.map(row => String(row?.id || '')) : []);
    const nextIds = new Set(serialized.map(row => String(row.id || '')));
    const removed = [...currentIds].filter(id => id && !nextIds.has(id));
    if (removed.length) {
      for (const id of removed) {
        try {
          await supabaseRequest({ SUPABASE_URL: cfg.url, SUPABASE_SERVICE_ROLE_KEY: cfg.key }, name, {
            method: 'DELETE',
            query: `id=eq.${id}`
          });
        } catch (error) {
          console.warn(`[canvas] failed to delete stale ${name} row ${id}`, error);
        }
      }
    }
    if (serialized.length) {
      await supabaseRequest({ SUPABASE_URL: cfg.url, SUPABASE_SERVICE_ROLE_KEY: cfg.key }, name, {
        method: 'POST',
        query: 'on_conflict=id',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: serialized
      });
    }
  }
  globalState[name] = clone(value);
  return value;
}

async function ensureBootstrap(env) {
  if (globalState.booted) return;
  const supabase = getSupabaseConfig(env);
  globalState.supabase = supabase ? { ...supabase, bucket: supabaseStorageBucket(env) } : null;
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

function taskPublic(task) {
  return clone(task);
}

function providerHasKey(provider) {
  return Boolean(String(provider?.apiKey || provider?.apiKeyEncrypted || '').trim()) || provider?.hasApiKey === true;
}


function providerAdapter(model) {
  const modality = String(model?.modality || 'text');
  const key = modality === 'text' || modality === 'script' ? 'openai-chat'
    : modality === 'image' ? 'openai-image'
    : modality === 'audio' ? 'openai-audio-speech'
    : modality === 'video' ? 'standard-video-async-v1' : 'auto';
  return { key, label:'自动适配', ready:Boolean(model?.id) };
}
function publicProvider(provider) {
  const out = clone(provider);
  delete out.apiKey;
  delete out.apiKeyEncrypted;
  out.hasApiKey = providerHasKey(provider);
  out.models = (out.models || []).map(model => ({ ...model, adapterResolved:providerAdapter(model) }));
  return out;
}


function cleanApiKey(value) {
  return String(value || '').trim().replace(/^authorization\s*:\s*/i, '').replace(/^bearer\s+/i, '').trim();
}
function providerNameFromUrl(baseUrl) {
  try { return new URL(baseUrl).hostname.replace(/^api\./i, '') || 'API 供应商'; }
  catch { return 'API 供应商'; }
}
function normalizeProvider(input, existing = null) {
  const current = existing ? clone(existing) : {};
  const incoming = clone(input || {});
  const next = { ...current, ...incoming };
  next.id = String(next.id || current.id || uid('provider_')).trim();
  next.baseUrl = String(next.baseUrl || current.baseUrl || '').trim().replace(/\/+$/, '');
  const incomingKey = cleanApiKey(incoming.apiKey);
  if (incomingKey) next.apiKey = incomingKey;
  else if (current.apiKey) next.apiKey = current.apiKey;
  else delete next.apiKey;
  const rawName = String(incoming.name || current.name || '').trim();
  next.name = rawName && rawName !== '新供应商' ? rawName : providerNameFromUrl(next.baseUrl);
  next.protocol = String(next.protocol || current.protocol || 'openai-compatible');
  next.videoProtocol = String(next.videoProtocol || current.videoProtocol || 'auto');
  next.videoProtocolConfig = next.videoProtocolConfig || current.videoProtocolConfig || {};
  next.authHeader = String(next.authHeader || current.authHeader || 'Authorization');
  next.authScheme = String(next.authScheme ?? current.authScheme ?? 'Bearer');
  next.testPath = String(next.testPath || current.testPath || '').trim();
  next.modelsPath = String(next.modelsPath || current.modelsPath || '').trim();
  next.referenceTransport = String(next.referenceTransport || current.referenceTransport || 'url');
  next.publicBaseUrl = String(next.publicBaseUrl || current.publicBaseUrl || '').trim();
  next.uploadPath = String(next.uploadPath || current.uploadPath || '').trim();
  next.uploadFileField = String(next.uploadFileField || current.uploadFileField || 'file');
  next.uploadOutputPath = String(next.uploadOutputPath || current.uploadOutputPath || '').trim();
  next.allowPrivateHosts = Boolean(next.allowPrivateHosts ?? current.allowPrivateHosts ?? false);
  next.downloadOutputs = Boolean(next.downloadOutputs ?? current.downloadOutputs ?? true);
  next.defaultHeaders = next.defaultHeaders && typeof next.defaultHeaders === 'object' ? next.defaultHeaders : {};
  next.models = Array.isArray(next.models) ? next.models : Array.isArray(current.models) ? current.models : [];
  next.models = next.models.map((model, idx) => normalizeModel(model, idx));
  return next;
}


function normalizeModel(input, idx = 0) {
  const next = clone(input || {});
  next.id = String(next.id || `model_${idx + 1}`).trim();
  next.name = String(next.name || next.id || `模型 ${idx + 1}`).trim();
  next.modality = ['text','script','image','video','audio'].includes(String(next.modality)) ? String(next.modality) : 'text';
  next.enabled = next.enabled !== false;
  next.adapterKey = String(next.adapterKey || 'auto');
  next.method = String(next.method || 'POST').toUpperCase();
  next.responseMode = String(next.responseMode || (next.modality === 'video' ? 'async' : 'sync'));
  for (const key of ['createPath','outputPath','taskIdPath','pollPath','statusPath','progressPath']) next[key] = String(next[key] || '').trim();
  next.successValues = Array.isArray(next.successValues) ? next.successValues : ['completed','succeeded','success','done','finished'];
  next.failureValues = Array.isArray(next.failureValues) ? next.failureValues : ['failed','error','canceled','cancelled'];
  next.pollIntervalMs = Math.max(500, Number(next.pollIntervalMs || 1500));
  next.timeoutMs = Math.max(5000, Number(next.timeoutMs || 1200000));
  next.requestTemplate = next.requestTemplate && typeof next.requestTemplate === 'object' ? next.requestTemplate : {};
  next.operationRoutes = next.operationRoutes && typeof next.operationRoutes === 'object' ? next.operationRoutes : {};
  next.capabilities = next.capabilities && typeof next.capabilities === 'object' ? next.capabilities : {};
  next.pricing = next.pricing && typeof next.pricing === 'object' ? next.pricing : {};
  return next;
}


function defaultRouteFor(nodeType) {
  if (nodeType === 'text' || nodeType === 'script') return {createPath:'/v1/chat/completions',responseMode:'sync',outputPath:'choices.0.message.content'};
  if (nodeType === 'image') return {createPath:'/v1/images/generations',responseMode:'sync',outputPath:'data.0.url'};
  if (nodeType === 'audio') return {createPath:'/v1/audio/speech',responseMode:'sync',outputPath:''};
  if (nodeType === 'video') return {createPath:'/v1/video/generations',responseMode:'async',taskIdPath:'',pollPath:'/v1/video/generations/{{taskId}}',statusPath:'',progressPath:'',outputPath:''};
  return {createPath:'',responseMode:'sync',outputPath:''};
}
function routeForTask(provider, model, nodeType) {
  const routes = model?.operationRoutes && typeof model.operationRoutes === 'object' ? model.operationRoutes : {};
  const override = routes.generate || {};
  const defaults = defaultRouteFor(nodeType);
  return {
    ...defaults,...override,
    createPath:override.createPath || model?.createPath || defaults.createPath,
    method:override.method || model?.method || 'POST',
    responseMode:override.responseMode || model?.responseMode || defaults.responseMode,
    outputPath:override.outputPath || model?.outputPath || defaults.outputPath,
    taskIdPath:override.taskIdPath || model?.taskIdPath || defaults.taskIdPath || '',
    pollPath:override.pollPath || model?.pollPath || defaults.pollPath || '',
    statusPath:override.statusPath || model?.statusPath || defaults.statusPath || '',
    progressPath:override.progressPath || model?.progressPath || defaults.progressPath || '',
    successValues:override.successValues || model?.successValues,
    failureValues:override.failureValues || model?.failureValues,
    pollIntervalMs:override.pollIntervalMs || model?.pollIntervalMs,
    timeoutMs:override.timeoutMs || model?.timeoutMs,
    requestTemplate:override.requestTemplate || model?.requestTemplate || {}
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
  const route = String(maybePath || '').trim();
  if (/^https?:\/\//i.test(route)) return route;
  const base = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!route) return base;
  let suffix = route;
  if (/\/v1$/i.test(base) && /^\/v1(?:\/|$)/i.test(suffix)) suffix = suffix.replace(/^\/v1/i, '');
  return base + '/' + suffix.replace(/^\/+/, '');
}

function buildTaskContext(task, provider, model, route) {
  const payload = task?.payload || {};
  const parameters = payload.parameters || {};
  return {
    model: model?.id || '',
    modelId: model?.id || '',
    modelName: model?.name || model?.id || '',
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


function defaultRequestBody(task, model) {
  const payload = task?.payload || {}, parameters = payload.parameters || {}, prompt = String(payload.prompt || '');
  if (task.nodeType === 'text' || task.nodeType === 'script') return {model:model.id,messages:[{role:'user',content:prompt}]};
  if (task.nodeType === 'image') {
    const body={model:model.id,prompt,n:Number(parameters.count||1)};
    if(parameters.size)body.size=parameters.size;
    if(parameters.aspectRatio)body.aspect_ratio=parameters.aspectRatio;
    return body;
  }
  if (task.nodeType === 'audio') return {model:model.id,input:prompt,voice:parameters.voice||'alloy',response_format:parameters.responseFormat||'mp3'};
  const body={model:model.id,prompt,duration:Number(parameters.duration||5),ratio:parameters.ratio||parameters.aspectRatio||'16:9'};
  if(parameters.resolution)body.resolution=parameters.resolution;
  const refs=Array.isArray(payload.references)?payload.references:[];
  const images=refs.filter(x=>x?.type==='image'&&x.url).map(x=>x.url),videos=refs.filter(x=>x?.type==='video'&&x.url).map(x=>x.url),audios=refs.filter(x=>x?.type==='audio'&&x.url).map(x=>x.url);
  if(images.length)body.images=images;if(videos.length)body.videos=videos;if(audios.length)body.audios=audios;
  for(const [key,value] of Object.entries(parameters))if(!['count','aspectRatio','ratio','duration','resolution'].includes(key)&&!key.startsWith('_'))body[key]=value;
  return body;
}
function firstPath(obj,paths){for(const path of paths){const value=getPath(obj,path);if(value!==undefined&&value!==null&&value!=='')return value}return undefined}
function bytesToBase64(buffer){const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary)}
async function parseProviderResponse(res,nodeType){
  const contentType=String(res.headers.get('content-type')||'').toLowerCase();
  if(nodeType==='audio'&&!contentType.includes('json')&&res.ok){const buffer=await res.arrayBuffer();return{__binaryOutput:{type:'url',value:`data:${contentType.split(';')[0]||'audio/mpeg'};base64,${bytesToBase64(buffer)}`}}}
  const raw=await res.text();let parsed=raw;try{parsed=raw?JSON.parse(raw):{}}catch{}
  if(!res.ok){const detail=typeof parsed==='string'?parsed:JSON.stringify(parsed);throw new Error(`上游 API ${res.status}：${detail.slice(0,600)||res.statusText}`)}
  return parsed;
}
function outputFromResponse(parsed,nodeType,route){
  if(parsed?.__binaryOutput)return parsed.__binaryOutput;
  if(nodeType==='image'){const b64=firstPath(parsed,['data.0.b64_json','data.0.b64','b64_json']);if(typeof b64==='string'&&b64)return{type:'url',value:`data:image/png;base64,${b64}`}}
  if(route.outputPath){const explicit=extractOutput(getPath(parsed,route.outputPath),nodeType);if(explicit)return explicit}
  return extractOutput(parsed,nodeType);
}
async function tryProviderGeneration(task,provider,model){
  if(!provider)throw new Error('API 供应商不存在');
  if(!model?.id)throw new Error('所选模型不存在');
  if(!provider.baseUrl)throw new Error('API Base URL 不能为空');
  const route=routeForTask(provider,model,task.nodeType);
  if(!route.createPath)throw new Error(`无法自动识别模型「${model.name||model.id}」的生成接口`);
  const ctx=buildTaskContext(task,provider,model,route);
  const explicitRoute=Boolean(model?.createPath||model?.operationRoutes?.generate?.createPath);
  const hasTemplate=explicitRoute&&route.requestTemplate&&Object.keys(route.requestTemplate).length>0;
  const bodyObject=hasTemplate?replacePlaceholders(route.requestTemplate,ctx):defaultRequestBody(task,model);
  const url=resolveUrl(provider.baseUrl,route.createPath),method=String(route.method||'POST').toUpperCase();
  const res=await fetchWithTimeout(url,{method,headers:buildHeaders(provider,model),body:method==='GET'||method==='HEAD'?undefined:JSON.stringify(bodyObject)},Math.min(Number(route.timeoutMs||120000),120000));
  const parsed=await parseProviderResponse(res,task.nodeType),immediate=outputFromResponse(parsed,task.nodeType,route);
  if(immediate)return{output:immediate,raw:parsed,sourceUrl:url};
  if(route.responseMode!=='async')throw new Error('上游请求成功，但响应中没有识别到可用结果');
  const taskId=route.taskIdPath?getPath(parsed,route.taskIdPath):firstPath(parsed,['id','task_id','taskId','data.id','data.task_id','data.taskId','task.id','result.id']);
  if(!taskId)throw new Error('视频任务已提交，但响应中没有识别到任务 ID（支持 id、task_id、data.id 等常见字段）');
  if(!route.pollPath)throw new Error('视频任务已创建，但无法确定查询任务状态的接口');
  const deadline=Date.now()+Math.max(5000,Number(route.timeoutMs||1200000)),pollDelay=Math.max(500,Number(route.pollIntervalMs||1500));
  const successValues=new Set((route.successValues||['completed','succeeded','success','done','finished']).map(v=>String(v).toLowerCase())),failureValues=new Set((route.failureValues||['failed','error','canceled','cancelled']).map(v=>String(v).toLowerCase()));
  while(Date.now()<deadline){
    await new Promise(resolve=>setTimeout(resolve,pollDelay));
    const pollPath=route.pollPath.replace(/\{\{\s*taskId\s*\}\}/g,encodeURIComponent(String(taskId))),pollUrl=resolveUrl(provider.baseUrl,pollPath);
    const pollRes=await fetchWithTimeout(pollUrl,{method:'GET',headers:buildHeaders(provider,model)},30000),latest=await parseProviderResponse(pollRes,task.nodeType);
    const statusRaw=route.statusPath?getPath(latest,route.statusPath):firstPath(latest,['status','data.status','state','data.state','task.status','result.status']),status=String(statusRaw||'').toLowerCase();
    const progressRaw=route.progressPath?getPath(latest,route.progressPath):firstPath(latest,['progress','data.progress','percent','data.percent','task.progress']),progress=Number(progressRaw);
    if(Number.isFinite(progress)){task.progress=Math.max(20,Math.min(96,progress));task.updatedAt=new Date().toISOString();await persistTasks()}
    if(failureValues.has(status))throw new Error(`上游任务失败：${status||'unknown'}`);
    const output=outputFromResponse(latest,task.nodeType,route);
    if(output)return{output,raw:latest,sourceUrl:pollUrl};
    if(successValues.has(status))throw new Error(`上游任务状态为 ${status}，但响应中没有识别到结果 URL`);
  }
  throw new Error('上游任务超时');
}


async function processTask(task){
  task.status='running';task.progress=8;task.error=null;task.updatedAt=new Date().toISOString();await persistTasks();
  try{
    const savedProvider=(globalState.providers||[]).find(p=>p.id===task.providerId),provider=savedProvider||task.payload?.providerSnapshot||null;
    const model=provider?.models?.find(m=>m.id===task.modelId)||task.payload?.modelSnapshot||null,result=await tryProviderGeneration(task,provider,model);
    if(!result?.output)throw new Error('上游响应中没有识别到有效生成结果');
    task.output=result.output;task.status='succeeded';task.progress=100;task.error=null;task.updatedAt=new Date().toISOString();task.logs=[...(task.logs||[]),{time:task.updatedAt,level:'info',message:'任务完成'}];
  }catch(error){
    task.output=null;task.status='failed';task.error=String(error?.message||error);task.updatedAt=new Date().toISOString();task.logs=[...(task.logs||[]),{time:task.updatedAt,level:'error',message:task.error}];
  }
  await persistTasks();return task;
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
  const storageName = `${uid('media_')}${ext || ''}`;
  const now = new Date().toISOString();
  globalState.media.set(storageName, { bytes, contentType, name, size: bytes.byteLength, createdAt: now });
  if (globalState.supabase) {
    try {
      const bucket = supabaseStorageBucket({ SUPABASE_STORAGE_BUCKET: globalState.supabase.bucket });
      await supabaseStorageRequest({ SUPABASE_URL: globalState.supabase.url, SUPABASE_SERVICE_ROLE_KEY: globalState.supabase.key }, bucket, storageName, {
        method: 'POST',
        headers: {
          'content-type': contentType,
          'x-upsert': 'true'
        },
        body: bytes
      });
      await supabaseRequest({ SUPABASE_URL: globalState.supabase.url, SUPABASE_SERVICE_ROLE_KEY: globalState.supabase.key }, 'media_assets', {
        method: 'POST',
        body: [{
          project_id: null,
          task_id: null,
          kind: contentType.startsWith('video/') ? 'video' : contentType.startsWith('audio/') ? 'audio' : contentType.startsWith('image/') ? 'image' : 'file',
          storage_path: storageName,
          public_url: `/media/${storageName}`,
          mime_type: contentType,
          metadata: { name, size: bytes.byteLength, mediaId: storageName },
          created_at: now
        }]
      }).catch(() => {});
    } catch (error) {
      console.warn('[canvas] supabase upload failed, keeping in-memory media only', error);
    }
  }
  return json({
    ok: true,
    url: `/media/${storageName}`,
    name: storageName,
    size: bytes.byteLength,
    mime: contentType,
    meta: { size: bytes.byteLength, mime: contentType }
  }, 201);
}

async function getMedia(id, req) {
  let cached = globalState.media.get(id);
  if (!cached && globalState.supabase) {
    try {
      const bucket = supabaseStorageBucket({ SUPABASE_STORAGE_BUCKET: globalState.supabase.bucket });
      const res = await supabaseStorageRequest({ SUPABASE_URL: globalState.supabase.url, SUPABASE_SERVICE_ROLE_KEY: globalState.supabase.key }, bucket, id, {
        method: 'GET'
      });
      const bytes = await res.arrayBuffer();
      cached = {
        bytes,
        contentType: res.headers.get('content-type') || 'application/octet-stream',
        name: id,
        size: bytes.byteLength
      };
      globalState.media.set(id, cached);
    } catch (error) {
      console.warn('[canvas] failed to load media from supabase', error);
    }
  }
  if (!cached) return json({ error: 'media not found' }, 404);
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


function modelEndpointCandidates(provider){
  if(provider.modelsPath)return[provider.modelsPath];
  const base=String(provider.baseUrl||'').replace(/\/+$/,'');
  return /\/v1$/i.test(base)?['/models','/v1/models']:['/v1/models','/models'];
}
function inferModality(item,id,name){
  const explicit=String(item?.modality||item?.model_type||item?.category||'').toLowerCase(),capabilities=Array.isArray(item?.capabilities)?item.capabilities.join(' '):String(item?.capabilities||''),hay=`${explicit} ${capabilities} ${id} ${name}`.toLowerCase();
  if(/(video|seedance|kling|hailuo|vidu|pixverse|runway|sora|veo|wan[-_. ]?2|hunyuan.*video|ltx.*video)/.test(hay))return'video';
  if(/(image|flux|seedream|dall[-_. ]?e|imagen|recraft|ideogram|sdxl|stable.*diffusion|qwen.*image|nano.*banana)/.test(hay))return'image';
  if(/(audio|speech|tts|voice|music|eleven|mureka|suno|whisper)/.test(hay))return'audio';
  return'text';
}
function extractModelArray(data){if(Array.isArray(data))return data;for(const path of ['data','models','items','result.data','result.models','data.models','data.items']){const value=getPath(data,path);if(Array.isArray(value))return value}return[]}
function normalizeDiscoveredModels(data){
  const seen=new Set(),models=[];
  for(const [idx,item] of extractModelArray(data).entries()){
    const raw=typeof item==='string'?{id:item,name:item}:(item||{}),id=String(raw.id||raw.model||raw.model_id||raw.slug||raw.key||raw.name||'').trim();
    if(!id||seen.has(id))continue;seen.add(id);
    const name=String(raw.name||raw.title||id),modality=inferModality(raw,id,name);
    models.push(normalizeModel({id,name,modality,enabled:true,adapterKey:'auto',capabilities:raw.capabilities&&typeof raw.capabilities==='object'?raw.capabilities:{}},idx));
  }
  return models;
}
async function discoverProviderModels(body){
  const existing=body?.id?(globalState.providers||[]).find(p=>p.id===body.id):null,provider=normalizeProvider(body,existing||null);
  if(!provider.baseUrl)throw new Error('API Base URL 不能为空');
  const errors=[];
  for(const endpoint of modelEndpointCandidates(provider)){
    const target=resolveUrl(provider.baseUrl,endpoint);
    try{
      const res=await fetchWithTimeout(target,{method:'GET',headers:buildHeaders(provider,{})},15000),data=await parseProviderResponse(res,'text'),models=normalizeDiscoveredModels(data);
      if(models.length)return{ok:true,endpoint,models,count:models.length,modelCount:models.length,suggestedProtocol:'openai-compatible'};
      errors.push(`${endpoint}：已连接，但没有识别到模型列表`);
    }catch(error){errors.push(`${endpoint}：${String(error?.message||error)}`)}
  }
  throw new Error(`无法拉取模型。已自动尝试 /v1/models 和 /models。原因：${errors.join('；')}`);
}
async function testProviderConfig(body){const discovered=await discoverProviderModels(body);return{ok:true,endpoint:discovered.endpoint,modelCount:discovered.models.length}}
async function testProviderAuth(body){const discovered=await discoverProviderModels(body);return{ok:true,endpoint:discovered.endpoint,modelCount:discovered.models.length,mode:'model-list'}}
async function diagnoseProvider(body){
  try{const discovered=await discoverProviderModels(body);return{ok:true,connection:{ok:true,endpoint:discovered.endpoint},auth:{ok:true,endpoint:discovered.endpoint,mode:'model-list'},models:{ready:discovered.models.length,total:discovered.models.length,pending:0},warnings:[]}}
  catch(error){const message=String(error?.message||error);return{ok:false,connection:{ok:false,error:message},auth:{ok:false,error:message},models:{ready:0,total:0,pending:0},warnings:[message]}}
}


async function handleTaskPost(body,ctx){
  const now=new Date().toISOString(),safePayload=clone(body||{});
  if(safePayload.providerSnapshot){delete safePayload.providerSnapshot.apiKey;delete safePayload.providerSnapshot.apiKeyEncrypted}
  const task={id:crypto.randomUUID(),status:'queued',progress:0,providerId:String(body.providerId||''),modelId:String(body.modelId||''),nodeType:String(body.nodeType||''),payload:safePayload,output:null,error:null,createdAt:now,updatedAt:now,attempt:0,maxRetries:Math.max(0,Math.min(5,Number(body.maxRetries??1))),priority:Math.max(0,Math.min(100,Number(body.priority??50))),cancelRequested:false,logs:[]};
  if(!task.providerId||!task.modelId||!['text','image','video','audio','script'].includes(task.nodeType))return json({error:'任务参数不完整'},400);
  const provider=(globalState.providers||[]).find(p=>p.id===task.providerId);
  if(!provider)return json({error:'API 供应商不存在'},404);
  if(!(provider.models||[]).some(model=>model.id===task.modelId))return json({error:'所选模型不存在'},404);
  globalState.tasks.unshift(task);await persistTasks();
  const running=processTask(task);if(ctx?.waitUntil)ctx.waitUntil(running);else await running;
  return json({task:taskPublic(task)},202);
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

async function handleRequest(request, env, ctx) {
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
    const existing = body.id ? globalState.providers.find(p => p.id === body.id) : null;
    const next = normalizeProvider(body, existing || null);
    if (!next.baseUrl) return json({ error: 'API Base URL 不能为空' }, 400);
    if (!providerHasKey(next)) return json({ error: 'API Key 不能为空' }, 400);
    if (!Array.isArray(next.models) || !next.models.length) {
      try {
        const discovered = await discoverProviderModels(next);
        next.models = discovered.models;
        next.protocol = discovered.suggestedProtocol || 'openai-compatible';
      } catch (error) {
        return json({ error: String(error?.message || error) }, 502);
      }
    }
    const idx = globalState.providers.findIndex(p => p.id === next.id);
    if (idx >= 0) globalState.providers[idx] = next;
    else globalState.providers.push(next);
    await persistProviders();
    return json({ provider: publicProvider(next), modelCount: next.models.length, autoConfigured: true });
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
    return handleTaskPost(body, ctx);
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
  const headers = new Headers(resp.headers);
  if (!headers.has('x-content-type-options')) headers.set('x-content-type-options', 'nosniff');
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers
  });
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
