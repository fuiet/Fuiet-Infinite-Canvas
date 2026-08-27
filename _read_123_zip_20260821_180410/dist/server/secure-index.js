import legacyWorker from './index.js';
import '../../provider-adapter-contract.js';
import '../../provider-runtime-core.js';
const ProviderAdapterContract = globalThis.CanvasProviderAdapters;
const ProviderRuntimeCore = globalThis.CanvasProviderRuntimeCore;

const SENSITIVE_HEADER_NAMES = new Set([
  'authorization', 'proxy-authorization', 'x-api-key', 'api-key', 'apikey',
  'cookie', 'set-cookie', 'x-auth-token', 'x-access-token', 'x-secret-key',
  'cf-access-client-secret'
]);
const MEDIA_TYPES = new Set(['image', 'video', 'audio']);
const TERMINAL_SUCCESS = ['completed', 'succeeded', 'success', 'done', 'finished'];
const TERMINAL_FAILURE = ['failed', 'error', 'canceled', 'cancelled'];

function clone(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders
    }
  });
}

function nowIso() { return new Date().toISOString(); }
function clamp(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
function getPath(obj, path) {
  if (!path) return obj;
  let current = obj;
  for (const part of String(path).split('.').filter(Boolean)) {
    if (current == null) return undefined;
    current = Array.isArray(current) && /^\d+$/.test(part) ? current[Number(part)] : current[part];
  }
  return current;
}
function firstPath(obj, paths) {
  for (const path of paths) {
    if (!path) continue;
    const value = getPath(obj, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function isSensitiveHeaderName(name) {
  const key = String(name || '').trim().toLowerCase();
  return SENSITIVE_HEADER_NAMES.has(key) || /(^|[-_])(authorization|secret|token)([-_]|$)/i.test(key);
}
function sanitizeHeaderObject(headers) {
  const out = {};
  if (!headers || typeof headers !== 'object') return out;
  for (const [key, value] of Object.entries(headers)) {
    if (!isSensitiveHeaderName(key)) out[key] = value;
  }
  return out;
}
function deepRedact(value, keyName = '') {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(item => deepRedact(item));
  if (typeof value !== 'object') return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (['apikey', 'apikeyencrypted', 'password', 'secret', 'access_token', 'refresh_token'].includes(lower)) continue;
    if ((lower === 'defaultheaders' || lower === 'extraheaders' || lower === 'headers') && child && typeof child === 'object') {
      out[key] = sanitizeHeaderObject(child);
      continue;
    }
    out[key] = deepRedact(child, key);
  }
  return out;
}
function publicProvider(provider) {
  const out = deepRedact(clone(provider || {}));
  out.hasApiKey = Boolean(provider?.apiKeyEncrypted || provider?.apiKey || provider?.hasApiKey);
  delete out.apiKey;
  delete out.apiKeyEncrypted;
  out.defaultHeaders = sanitizeHeaderObject(out.defaultHeaders);
  if (Array.isArray(out.models)) {
    out.models = out.models.map(model => ({
      ...model,
      extraHeaders: sanitizeHeaderObject(model?.extraHeaders)
    }));
  }
  return out;
}
function taskPublic(task) {
  const out = deepRedact(clone(task || {}));
  if (out?.payload?._upstream) {
    delete out.payload._upstream.auth;
    delete out.payload._upstream.headers;
  }
  return out;
}

function parseIPv4(host) {
  const parts = String(host || '').split('.');
  if (parts.length !== 4 || parts.some(x => !/^\d+$/.test(x) || Number(x) > 255)) return null;
  return parts.map(Number);
}
function isPrivateIPv4(host) {
  const p = parseIPv4(host);
  if (!p) return false;
  if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true;
  if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;
  if (p[0] === 169 && p[1] === 254) return true;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  if (p[0] === 192 && (p[1] === 168 || p[1] === 0 || p[1] === 2)) return true;
  if (p[0] === 198 && (p[1] === 18 || p[1] === 19 || p[1] === 51 && p[2] === 100)) return true;
  if (p[0] === 203 && p[1] === 0 && p[2] === 113) return true;
  if (p[0] >= 224) return true;
  return false;
}
function isPrivateIPv6(host) {
  const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h.includes(':')) return false;
  if (h === '::' || h === '::1') return true;
  if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true;
  if (h.startsWith('ff') || h.startsWith('2001:db8:')) return true;
  const mapped = h.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIPv4(mapped[1]) : false;
}
function allowPrivateProviderHost(provider, env) {
  return env?.CANVAS_ALLOW_PRIVATE_PROVIDER_HOSTS === '1' && provider?.allowPrivateHosts === true;
}
function validateOutboundUrl(urlText, provider = {}, env = {}) {
  let url;
  try { url = new URL(String(urlText || '')); }
  catch { throw new Error('供应商 URL 无效'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('仅允许 HTTP/HTTPS 上游地址');
  if (url.username || url.password) throw new Error('上游 URL 不允许包含用户名或密码');
  const host = url.hostname.toLowerCase();
  if (!allowPrivateProviderHost(provider, env)) {
    if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.home.arpa')) {
      throw new Error('安全策略阻止访问本机或私有网络地址');
    }
    if (isPrivateIPv4(host) || isPrivateIPv6(host)) throw new Error('安全策略阻止访问私有/保留网络地址');
    if (host === 'metadata.google.internal' || host === '169.254.169.254') throw new Error('安全策略阻止访问云元数据地址');
  }
  return url;
}
function resolveProviderUrl(provider, route, env) {
  const base = validateOutboundUrl(provider?.baseUrl, provider, env);
  const raw = String(route || '').trim();
  if (!raw) return base.toString().replace(/\/$/, '');
  if (/^\/\//.test(raw) || raw.includes('\\')) throw new Error('上游路由格式不安全');
  let target;
  if (/^https?:\/\//i.test(raw)) {
    target = validateOutboundUrl(raw, provider, env);
    if (target.origin !== base.origin) throw new Error('为防止 API Key 泄露，不允许跨域绝对上游路由');
  } else {
    let suffix = raw;
    const baseText = base.toString().replace(/\/+$/, '');
    if (/\/v1$/i.test(base.pathname.replace(/\/$/, '')) && /^\/v1(?:\/|$)/i.test(suffix)) suffix = suffix.replace(/^\/v1/i, '');
    target = validateOutboundUrl(`${baseText}/${suffix.replace(/^\/+/, '')}`, provider, env);
  }
  return target.toString();
}
async function safeProviderFetch(provider, urlText, options = {}, env = {}, policy = {}) {
  const base = validateOutboundUrl(provider?.baseUrl, provider, env);
  let current = validateOutboundUrl(urlText, provider, env);
  let enforceProviderOrigin = true;
  if (current.origin !== base.origin) throw new Error('上游请求必须与 API Base URL 同源');
  let requestOptions={...options};
  for (let i = 0; i < 4; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), clamp(requestOptions.timeoutMs, 1000, 180000, 30000));
    try {
      const res = await fetch(current.toString(), { ...requestOptions, timeoutMs: undefined, signal: controller.signal, redirect: 'manual' });
      if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.get('location')) {
        const next = validateOutboundUrl(new URL(res.headers.get('location'), current).toString(), provider, env);
        if (enforceProviderOrigin && next.origin !== base.origin) {
          if (policy.allowCredentiallessCrossOriginRedirect === true) {
            requestOptions={...requestOptions,headers:sanitizeHeaderObject(Object.fromEntries(new Headers(requestOptions.headers||{}).entries()))};
            enforceProviderOrigin=false;
          } else throw new Error('上游重定向到不同域名，已阻止以避免认证信息泄露');
        }
        current = next;
        continue;
      }
      return res;
    } finally { clearTimeout(timeout); }
  }
  throw new Error('上游重定向次数过多');
}
async function safePublicFetch(urlText, options = {}, env = {}) {
  let current = validateOutboundUrl(urlText, {}, env);
  for (let i = 0; i < 4; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), clamp(options.timeoutMs, 1000, 180000, 60000));
    try {
      const res = await fetch(current.toString(), { ...options, timeoutMs: undefined, signal: controller.signal, redirect: 'manual' });
      if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.get('location')) {
        current = validateOutboundUrl(new URL(res.headers.get('location'), current).toString(), {}, env);
        continue;
      }
      return res;
    } finally { clearTimeout(timeout); }
  }
  throw new Error('结果下载重定向次数过多');
}

function base64Url(bytes) {
  let binary = '';
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < data.length; i += 0x8000) binary += String.fromCharCode(...data.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64Url(value) {
  const padded = String(value || '').replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(String(value || '').length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
async function encryptionKey(env) {
  const secret = String(env?.PROVIDER_SECRET_KEY || env?.CANVAS_SECRET_KEY || env?.API_KEY_ENCRYPTION_KEY || '').trim();
  if (!secret) throw new Error('服务器未配置 PROVIDER_SECRET_KEY，拒绝明文保存 API Key');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
async function encryptSecret(value, env) {
  if (!value) return '';
  const key = await encryptionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(String(value)));
  return `v1.${base64Url(iv)}.${base64Url(encrypted)}`;
}
async function decryptSecret(value, env) {
  if (!value) return '';
  if (!String(value).startsWith('v1.')) throw new Error('API Key 密文格式不受支持');
  const [, ivText, cipherText] = String(value).split('.');
  const key = await encryptionKey(env);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(ivText) }, key, fromBase64Url(cipherText));
  return new TextDecoder().decode(plain);
}
async function runtimeProvider(provider, env, overrideKey = '') {
  const out = clone(provider || {});
  if (overrideKey) out.apiKey = String(overrideKey).trim().replace(/^Bearer\s+/i, '');
  else if (out.apiKeyEncrypted) out.apiKey = await decryptSecret(out.apiKeyEncrypted, env);
  else if (out.apiKey) out.apiKey = String(out.apiKey);
  return out;
}

function supabaseConfig(env) {
  const url = String(env?.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = String(env?.SUPABASE_SERVICE_ROLE_KEY || env?.SUPABASE_ANON_KEY || '').trim();
  return url && key ? { url, key } : null;
}
async function supabaseRest(env, table, { method = 'GET', query = '', body, prefer = '' } = {}) {
  const cfg = supabaseConfig(env);
  if (!cfg) return null;
  const url = new URL(`${cfg.url}/rest/v1/${table}`);
  if (query) {
    const params = new URLSearchParams(query);
    for (const [key, value] of params.entries()) url.searchParams.append(key, value);
  }
  const headers = new Headers({ apikey: cfg.key, authorization: `Bearer ${cfg.key}` });
  if (body !== undefined) headers.set('content-type', 'application/json');
  if (prefer) headers.set('prefer', prefer);
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const raw = await res.text();
  let parsed = null; try { parsed = raw ? JSON.parse(raw) : null; } catch {}
  if (!res.ok) throw new Error(`Supabase ${table} ${res.status}：${parsed?.message || parsed?.error || raw || res.statusText}`);
  return parsed;
}
async function persistProvider(provider, env) {
  const state = globalThis.__canvasWorkerState;
  const index = (state.providers || []).findIndex(item => item.id === provider.id);
  if (index >= 0) state.providers[index] = clone(provider); else state.providers.push(clone(provider));
  if (supabaseConfig(env)) {
    await supabaseRest(env, 'providers', {
      method: 'POST',
      query: 'on_conflict=id',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: [{ id: provider.id, name: provider.name || '新供应商', data: clone(provider) }]
    });
  }
}
async function deleteProvider(id, env) {
  const state = globalThis.__canvasWorkerState;
  state.providers = (state.providers || []).filter(item => item.id !== id);
  if (supabaseConfig(env)) await supabaseRest(env, 'providers', { method: 'DELETE', query: `id=eq.${encodeURIComponent(id)}` });
}
function uuidOrNull(value) {
  const text = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
}
function serializeTask(task) {
  const payload = clone(task.payload || {});
  payload.status = task.status;
  payload.progress = task.progress;
  payload.providerId = task.providerId;
  payload.modelId = task.modelId;
  payload.nodeId = task.nodeId || '';
  payload.nodeType = task.nodeType;
  payload.output = clone(task.output ?? null);
  payload.error = task.error ?? null;
  payload.attempt = task.attempt || 0;
  payload.maxRetries = task.maxRetries || 0;
  payload.priority = task.priority || 50;
  payload.cancelRequested = Boolean(task.cancelRequested);
  payload.logs = clone(task.logs || []);
  payload.createdAt = task.createdAt;
  payload.updatedAt = task.updatedAt;
  return {
    id: task.id,
    project_id: uuidOrNull(task.projectId),
    provider_id: uuidOrNull(task.providerId),
    model_id: uuidOrNull(task.modelId),
    node_id: uuidOrNull(task.nodeId),
    node_type: task.nodeType,
    status: task.status,
    progress: task.progress,
    payload,
    output: clone(task.output ?? null),
    error: task.error ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt
  };
}
async function persistTask(task, env) {
  const state = globalThis.__canvasWorkerState;
  const index = (state.tasks || []).findIndex(item => item.id === task.id);
  if (index >= 0) state.tasks[index] = task; else state.tasks.unshift(task);
  if (supabaseConfig(env)) {
    await supabaseRest(env, 'tasks', {
      method: 'POST', query: 'on_conflict=id', prefer: 'resolution=merge-duplicates,return=minimal', body: [serializeTask(task)]
    });
  }
  return task;
}

async function recoverPersistedTasks(env) {
  const state = globalThis.__canvasWorkerState;
  if (!state || state.__secureRecoveryDone) return;
  for (const task of state.tasks || []) {
    if (!task || ['succeeded', 'failed', 'canceled', 'cancelled'].includes(String(task.status || '').toLowerCase())) continue;
    const upstream = task.payload?._upstream && typeof task.payload._upstream === 'object' ? task.payload._upstream : null;
    const upstreamId = upstream?.taskId || upstream?.id || '';
    let changed = false;
    let note = '';

    if (upstream && upstreamId && !upstream.taskId) {
      upstream.taskId = String(upstreamId);
      task.payload = { ...(task.payload || {}), _upstream: upstream };
      changed = true;
    }

    if (task.cancelRequested || task.status === 'cancelling') {
      task.status = 'canceled';
      task.error = null;
      note = 'Worker 重启后完成取消状态恢复';
      changed = true;
    } else if (task.status === 'running') {
      if (upstreamId) {
        task.status = 'polling';
        task.progress = Math.max(20, Number(task.progress || 0));
        note = 'Worker 重启后恢复已提交的上游任务轮询';
      } else {
        // A running task without a persisted upstream id may have crossed the POST
        // boundary before the isolate died. Never resubmit automatically: that can
        // duplicate a paid generation. Require an explicit manual retry instead.
        task.status = 'failed';
        task.error = 'Worker 在任务执行中重启，且没有安全持久化上游 taskId。为避免重复提交和重复扣费，已停止自动重试；请确认上游状态后手动重试。';
        note = 'Worker 重启：缺少上游 taskId，按防重复扣费策略停止自动重提';
      }
      changed = true;
    } else if (task.status === 'polling' && !upstreamId) {
      task.status = 'failed';
      task.error = '持久化轮询任务缺少上游 taskId，无法安全恢复；为避免重新创建付费任务，已停止自动执行。';
      note = 'Worker 重启：轮询任务缺少 taskId，已安全终止';
      changed = true;
    }

    if (!changed) continue;
    task.updatedAt = nowIso();
    if (note) task.logs = [...(task.logs || []), { time: task.updatedAt, level: task.status === 'failed' ? 'error' : 'info', message: note }].slice(-100);
    try { await persistTask(task, env); }
    catch (error) { console.warn('[canvas-secure] failed to persist recovered task', task.id, error); }
  }
  state.__secureRecoveryDone = true;
}

async function bootstrap(request, env, ctx) {
  if (!globalThis.__canvasWorkerState?.booted) {
    const url = new URL(request.url);
    url.pathname = '/api/health'; url.search = '';
    await legacyWorker.fetch(new Request(url.toString(), { method: 'GET', headers: request.headers }), env, ctx);
  }
  await recoverPersistedTasks(env);
  return globalThis.__canvasWorkerState;
}
async function requireAuthorized(request, env, ctx) {
  const url = new URL(request.url); url.pathname = '/api/auth/status'; url.search = '';
  const res = await legacyWorker.fetch(new Request(url.toString(), { method: 'GET', headers: request.headers }), env, ctx);
  const data = await res.json().catch(() => ({}));
  return !data.enabled || data.authenticated;
}

function authCandidates(provider) {
  const raw = [
    { header: String(provider?.authHeader || 'Authorization'), scheme: String(provider?.authScheme ?? 'Bearer').trim() },
    { header: 'Authorization', scheme: 'Bearer' }, { header: 'x-api-key', scheme: '' }, { header: 'api-key', scheme: '' }
  ];
  const seen = new Set();
  return raw.filter(item => { const key = `${item.header.toLowerCase()}|${item.scheme.toLowerCase()}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
function buildHeaders(provider, model, authMode = null, contentType = 'application/json') {
  const headers = new Headers();
  for (const [key, value] of Object.entries(provider?.defaultHeaders || {})) headers.set(key, String(value));
  if (provider?.apiKey) {
    const auth = authMode || { header: String(provider.authHeader || 'Authorization'), scheme: String(provider.authScheme ?? 'Bearer').trim() };
    headers.set(auth.header, auth.scheme ? `${auth.scheme} ${provider.apiKey}` : provider.apiKey);
  }
  for (const [key, value] of Object.entries(model?.extraHeaders || {})) headers.set(key, String(value));
  if (contentType) headers.set('content-type', contentType);
  headers.set('accept', 'application/json, text/plain, */*');
  return headers;
}

function normalizeModel(input, index = 0) {
  const model = clone(input || {});
  model.id = String(model.id || model.model || model.model_id || model.name || `model_${index + 1}`).trim();
  model.name = String(model.name || model.id).trim();
  model.modality = ['text', 'script', 'image', 'video', 'audio'].includes(String(model.modality)) ? String(model.modality) : 'text';
  model.enabled = model.enabled !== false;
  model.adapterKey = String(model.adapterKey || 'auto').trim() || 'auto';
  model.operationRoutes = model.operationRoutes && typeof model.operationRoutes === 'object' ? model.operationRoutes : {};
  model.requestTemplate = model.requestTemplate && typeof model.requestTemplate === 'object' ? model.requestTemplate : {};
  return model;
}
function inferModality(item, id, name) {
  let capabilities = ''; try { capabilities = JSON.stringify(item?.capabilities || ''); } catch {}
  const hay = `${item?.modality || ''} ${item?.type || ''} ${item?.category || ''} ${item?.description || ''} ${capabilities} ${id} ${name}`.toLowerCase();
  if (/(video|seedance|artsdance|kling|hailuo|sora|veo|runway|vidu|pixverse|luma|pika|wan[-_. ]?[23])/.test(hay)) return 'video';
  if (/(image|gpt[-_. ]?image|flux|seedream|dall[-_. ]?e|imagen|recraft|ideogram|sdxl|stable.*diffusion)/.test(hay)) return 'image';
  if (/(audio|speech|tts|voice|music|whisper|suno)/.test(hay)) return 'audio';
  return 'text';
}
function extractModelArray(data) {
  if (Array.isArray(data)) return data;
  for (const path of ['data', 'models', 'items', 'result.data', 'result.models', 'data.models', 'data.items']) {
    const value = getPath(data, path); if (Array.isArray(value)) return value;
  }
  return [];
}
function normalizeDiscoveredModels(data) {
  const seen = new Set(), models = [];
  for (const [index, item] of extractModelArray(data).entries()) {
    const raw = typeof item === 'string' ? { id: item, name: item } : (item || {});
    const id = String(raw.id || raw.model || raw.model_id || raw.slug || raw.key || raw.name || '').trim();
    if (!id || seen.has(id)) continue; seen.add(id);
    const name = String(raw.name || raw.title || id);
    models.push(normalizeModel({ id, name, modality: inferModality(raw, id, name), enabled: true, capabilities: raw.capabilities || {} }, index));
  }
  return models;
}
function modelEndpointCandidates(provider) {
  if (provider.modelsPath) return [provider.modelsPath];
  return /\/v1$/i.test(String(provider.baseUrl || '').replace(/\/+$/, '')) ? ['/models', '/v1/models'] : ['/v1/models', '/models'];
}
async function parseJsonResponse(res) {
  const raw = await res.text(); let parsed = raw;
  try { parsed = raw ? JSON.parse(raw) : {}; } catch {}
  if (!res.ok) {
    const detail = typeof parsed === 'string' ? parsed : firstPath(parsed, ['error.message', 'message', 'error', 'detail']) || raw;
    throw new Error(`上游 API ${res.status}：${String(detail || res.statusText).slice(0, 600)}`);
  }
  return parsed;
}
async function discoverModels(provider, env) {
  const errors = [];
  for (const endpoint of modelEndpointCandidates(provider)) {
    const url = resolveProviderUrl(provider, endpoint, env);
    for (const auth of authCandidates(provider)) {
      try {
        const res = await safeProviderFetch(provider, url, { method: 'GET', headers: buildHeaders(provider, {}, auth, null), timeoutMs: 15000 }, env);
        if (!res.ok) {
          const raw = await res.text(); errors.push(`${endpoint} [${auth.header}]：HTTP ${res.status} ${raw.slice(0, 200)}`);
          if ((res.status === 401 || res.status === 403) && auth !== authCandidates(provider).at(-1)) continue;
          break;
        }
        const data = await parseJsonResponse(res);
        const models = normalizeDiscoveredModels(data);
        const protocolEvidence = ProviderAdapterContract.detectModelListProtocol(data, endpoint);
        if (models.length) return { endpoint, models, auth, suggestedProtocol: protocolEvidence.protocol, protocolEvidence };
        errors.push(`${endpoint}：已连接，但未识别到模型列表`);
        break;
      } catch (error) { errors.push(`${endpoint}：${String(error?.message || error)}`); break; }
    }
  }
  throw new Error(`无法拉取模型。已安全尝试 /v1/models、/models。原因：${errors.join('；')}`);
}

function providerId() { return `provider_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`; }
async function normalizeProviderForSave(input, existing, env) {
  const incoming = clone(input || {}), current = clone(existing || {}), next = { ...current, ...incoming };
  next.id = String(next.id || current.id || providerId()).trim();
  next.baseUrl = String(next.baseUrl || '').trim().replace(/\/+$/, '');
  validateOutboundUrl(next.baseUrl, next, env);
  next.name = String(next.name || (() => { try { return new URL(next.baseUrl).hostname.replace(/^api\./, ''); } catch { return 'API 供应商'; } })());
  next.protocol = ['auto','generic-rest','openai-compatible','comfyui'].includes(String(next.protocol)) ? String(next.protocol) : 'auto';
  next.videoProtocol = String(next.videoProtocol || 'auto');
  next.videoProtocolConfig = next.videoProtocolConfig && typeof next.videoProtocolConfig === 'object' ? next.videoProtocolConfig : {};
  next.authHeader = String(next.authHeader || 'Authorization');
  next.authScheme = String(next.authScheme ?? 'Bearer');
  next.defaultHeaders = next.defaultHeaders && typeof next.defaultHeaders === 'object' ? clone(next.defaultHeaders) : {};
  next.referenceTransport = ProviderAdapterContract.normalizeReferenceTransport(next.referenceTransport,{cloud:true});
  next.downloadOutputs = next.downloadOutputs !== false;
  next.models = Array.isArray(next.models) ? next.models.map(normalizeModel) : [];
  delete next.hasApiKey;
  delete next.apiKey;
  delete next.apiKeyEncrypted;
  if (String(incoming.apiKey || '').trim()) next.apiKeyEncrypted = await encryptSecret(String(incoming.apiKey).trim().replace(/^Bearer\s+/i, ''), env);
  else if (current.apiKeyEncrypted) next.apiKeyEncrypted = current.apiKeyEncrypted;
  else if (current.apiKey) next.apiKeyEncrypted = await encryptSecret(current.apiKey, env);
  else throw new Error('API Key 不能为空');
  return next;
}

function defaultRoute(nodeType) {
  if (nodeType === 'text' || nodeType === 'script') return { createPath: '/v1/chat/completions', method: 'POST', responseMode: 'sync', outputPath: 'choices.0.message.content' };
  if (nodeType === 'image') return { createPath: '/v1/images/generations', method: 'POST', responseMode: 'sync', outputPath: 'data.0.url' };
  if (nodeType === 'audio') return { createPath: '/v1/audio/speech', method: 'POST', responseMode: 'sync', outputPath: '' };
  if (nodeType === 'video') return { createPath: '/v1/videos', method: 'POST', responseMode: 'async', taskIdPath: '', pollPath: '/v1/videos/{{taskId}}', contentPath: '/v1/videos/{{taskId}}/content', statusPath: '', progressPath: '', outputPath: '', successValues: TERMINAL_SUCCESS, failureValues: TERMINAL_FAILURE, pollIntervalMs: 1500, timeoutMs: 1200000 };
  return { createPath: '', method: 'POST', responseMode: 'sync' };
}
function compactRoute(route) {
  const out = {};
  for (const [key, value] of Object.entries(route || {})) if (value !== undefined && value !== null && value !== '') out[key] = value;
  return out;
}
function routeForTask(provider, model, nodeType) {
  const operation=String(model?.operationRoutes?.activeOperation||'generate');
  return ProviderAdapterContract.resolveRoute(provider,model,nodeType,operation);
}

function replaceTemplate(value, context) {
  if (typeof value === 'string') return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path) => { const v = getPath(context, path.trim()); return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); });
  if (Array.isArray(value)) return value.map(item => replaceTemplate(item, context));
  if (value && typeof value === 'object') { const out = {}; for (const [key, child] of Object.entries(value)) out[key] = replaceTemplate(child, context); return out; }
  return value;
}
function ratioToSize(ratio) { return ratio === '9:16' ? '720x1280' : ratio === '1:1' ? '1024x1024' : '1280x720'; }
function defaultBody(task, model, references, route={}) {
  const payload = task.payload || {}, parameters = payload.parameters || {}, prompt = String(payload.prompt || '');
  if (task.nodeType === 'text' || task.nodeType === 'script') return { model: model.id, messages: parameters.messages || [{ role: 'user', content: prompt }] };
  if (task.nodeType === 'image') {
    const body = { model: model.id, prompt };
    if (parameters.size) body.size = parameters.size;
    if (references.length) body.images = references.filter(x => x.type === 'image').map(x => x.url);
    return body;
  }
  if (task.nodeType === 'audio') return { model: model.id, input: prompt, voice: parameters.voice || 'alloy', response_format: parameters.responseFormat || 'mp3' };
  const images = references.filter(x => x.type === 'image').map(x => x.url), videos = references.filter(x => x.type === 'video').map(x => x.url), audios = references.filter(x => x.type === 'audio').map(x => x.url);
  const createPath=String(route.createPath||'');
  const openAIVideos=/\/v1\/videos(?:$|\?)/i.test(createPath)&&!/generations/i.test(createPath);
  let body;
  if(openAIVideos){
    const duration=Number(parameters.duration||parameters.seconds||5);
    body={model:model.id,prompt,seconds:String(duration),size:String(parameters.size||ratioToSize(parameters.ratio||parameters.aspectRatio||'16:9'))};
    if(images[0])body.input_reference={image_url:images[0]};
  }else{
    body={model:model.id,prompt,duration:Number(parameters.duration||parameters.seconds||5),ratio:parameters.ratio||parameters.aspectRatio||'16:9'};
    if(parameters.resolution)body.resolution=parameters.resolution;
    if(images.length)body.images=images;if(videos.length)body.videos=videos;if(audios.length)body.audios=audios;
  }
  for (const [key, value] of Object.entries(parameters)) if (!['messages', 'duration', 'seconds', 'ratio', 'aspectRatio', 'resolution', 'size'].includes(key) && !key.startsWith('_')) body[key] = value;
  return body;
}

async function getLocalMedia(referenceUrl, request, env, ctx) {
  const absolute = new URL(referenceUrl, request.url).toString();
  const internal = new Request(absolute, { method: 'GET', headers: request.headers });
  const res = await legacyWorker.fetch(internal, env, ctx);
  if (!res.ok) throw new Error(`参考媒体读取失败：${res.status}`);
  const length = Number(res.headers.get('content-length') || 0);
  const max = clamp(env?.CANVAS_MAX_REFERENCE_BYTES, 1024 * 1024, 25 * 1024 * 1024, 8 * 1024 * 1024);
  if (length && length > max) throw new Error(`参考媒体过大，超过 ${Math.round(max / 1024 / 1024)}MB`);
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > max) throw new Error(`参考媒体过大，超过 ${Math.round(max / 1024 / 1024)}MB`);
  return { bytes, contentType: res.headers.get('content-type') || 'application/octet-stream' };
}
function bytesToDataUrl(bytes, contentType) {
  const data = new Uint8Array(bytes); let binary = '';
  for (let i = 0; i < data.length; i += 0x8000) binary += String.fromCharCode(...data.subarray(i, i + 0x8000));
  return `data:${contentType};base64,${btoa(binary)}`;
}
async function uploadReference(provider, model, ref, request, env, ctx) {
  if (!provider.uploadPath) throw new Error('供应商未配置参考媒体上传接口');
  const media = await getLocalMedia(ref.url, request, env, ctx);
  const form = new FormData();
  form.append(provider.uploadFileField || 'file', new Blob([media.bytes], { type: media.contentType }), ref.name || 'reference');
  const url = resolveProviderUrl(provider, provider.uploadPath, env);
  const headers = buildHeaders(provider, model, null, null); headers.delete('content-type');
  const res = await safeProviderFetch(provider, url, { method: 'POST', headers, body: form, timeoutMs: 120000 }, env);
  const parsed = await parseJsonResponse(res);
  const output = provider.uploadOutputPath ? getPath(parsed, provider.uploadOutputPath) : firstPath(parsed, ['url', 'data.url', 'file.url', 'result.url', 'download_url']);
  if (!output || typeof output !== 'string') throw new Error('参考媒体上传成功，但没有识别到返回 URL');
  return output;
}
async function prepareReferences(task, provider, model, request, env, ctx) {
  const refs = Array.isArray(task.payload?.references) ? task.payload.references : [];
  const out = [];
  for (const item of refs) {
    const ref = clone(item || {}); if (!ref.url) continue;
    if (String(ref.url).startsWith('/media/')) {
      const transport=ProviderAdapterContract.normalizeReferenceTransport(provider.referenceTransport,{cloud:true});
      if (transport === 'data-url') {
        const media = await getLocalMedia(ref.url, request, env, ctx); ref.url = bytesToDataUrl(media.bytes, media.contentType);
      } else if (transport === 'upload') {
        ref.url = await uploadReference(provider, model, ref, request, env, ctx);
      } else {
        const base = String(env?.CANVAS_PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/+$/, '');
        ref.url = `${base}${ref.url}`;
      }
    }
    out.push(ref);
  }
  return out;
}

function extractOutput(parsed, nodeType, route) {
  if (parsed == null) return null;
  if (route?.outputPath) {
    const explicit = getPath(parsed, route.outputPath);
    if (typeof explicit === 'string' && explicit.trim()) return { type: MEDIA_TYPES.has(nodeType) ? 'url' : 'text', value: explicit.trim() };
    if (explicit && typeof explicit === 'object') parsed = explicit;
  }
  if (nodeType === 'image') {
    const b64 = firstPath(parsed, ['data.0.b64_json', 'data.0.b64', 'b64_json']);
    if (typeof b64 === 'string' && b64) return { type: 'url', value: `data:image/png;base64,${b64}` };
  }
  const url = firstPath(parsed, ['url', 'value', 'file_url', 'download_url', 'video_url', 'image_url', 'audio_url', 'data.url', 'data.0.url', 'result.url', 'output.url', 'outputs.0.url', 'videos.0.url', 'images.0.url']);
  if (typeof url === 'string' && /^(https?:\/\/|data:|\/media\/)/i.test(url)) return { type: 'url', value: url };
  const text = firstPath(parsed, ['choices.0.message.content', 'text', 'content', 'message', 'result', 'output']);
  if (typeof text === 'string' && text.trim()) return { type: 'text', value: text.trim() };
  return null;
}
function extensionForMime(mime) {
  const type = String(mime || '').split(';')[0].toLowerCase();
  return ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'video/mp4': '.mp4', 'video/webm': '.webm', 'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/mp4': '.m4a' })[type] || '.bin';
}
async function storageUpload(env, objectPath, body, contentType) {
  const cfg = supabaseConfig(env);
  if (!cfg) throw new Error('未配置 Supabase Storage，无法持久化生成结果');
  const bucket = String(env?.SUPABASE_STORAGE_BUCKET || 'canvas-media').trim() || 'canvas-media';
  const path = String(objectPath).split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`${cfg.url}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`, {
    method: 'POST', headers: { apikey: cfg.key, authorization: `Bearer ${cfg.key}`, 'content-type': contentType || 'application/octet-stream', 'x-upsert': 'false' }, body
  });
  if (!res.ok) throw new Error(`Storage 上传失败 ${res.status}：${(await res.text()).slice(0, 500)}`);
  return `/media/${objectPath}`;
}
async function recordMediaAsset(task, path, mime, sourceUrl, env) {
  if (!supabaseConfig(env)) return;
  await supabaseRest(env, 'media_assets', {
    method: 'POST', prefer: 'return=minimal', body: [{
      project_id: uuidOrNull(task.projectId), task_id: uuidOrNull(task.id), kind: task.nodeType,
      storage_path: path, public_url: `/media/${path}`, mime_type: mime,
      metadata: { sourceUrl }, created_at: nowIso()
    }]
  }).catch(error => console.warn('[canvas-secure] media_assets insert failed', error));
}
async function persistMediaOutput(task, output, provider, env) {
  if (!output || output.type !== 'url' || !MEDIA_TYPES.has(task.nodeType)) return output;
  const value = String(output.value || '');
  if (value.startsWith('/media/')) return output;
  if (provider.downloadOutputs === false) return output;
  let body, mime = 'application/octet-stream', sourceUrl = value;
  if (value.startsWith('data:')) {
    const match = value.match(/^data:([^;,]+)?;base64,(.*)$/s); if (!match) throw new Error('生成结果 data URL 格式无效');
    mime = match[1] || mime; body = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
  } else {
    const res = await safePublicFetch(value, { method: 'GET', timeoutMs: 120000 }, env);
    if (!res.ok) throw new Error(`结果下载失败 ${res.status}：${(await res.text()).slice(0, 300)}`);
    mime = res.headers.get('content-type') || mime;
    body = res.body;
  }
  const objectPath = `${task.nodeType}_${task.id}_${crypto.randomUUID().slice(0, 8)}${extensionForMime(mime)}`;
  const localUrl = await storageUpload(env, objectPath, body, mime);
  await recordMediaAsset(task, objectPath, mime, sourceUrl, env);
  return { type: 'url', value: localUrl, sourceUrl, persisted: true };
}

async function fetchCompletedVideoContent(task, provider, model, route, taskId, env) {
  const template=String(route.contentPath||'').trim();if(!template)return null;
  const contentPath=template.replace(/\{\{taskId\}\}/g,encodeURIComponent(String(taskId)));
  const contentUrl=resolveProviderUrl(provider,contentPath,env);
  const res=await safeProviderFetch(provider,contentUrl,{method:'GET',headers:buildHeaders(provider,model),timeoutMs:120000},env,{allowCredentiallessCrossOriginRedirect:true});
  if(!res.ok)throw new Error(`视频内容下载失败 ${res.status}：${(await res.text()).slice(0,300)}`);
  const mime=String(res.headers.get('content-type')||'video/mp4').split(';')[0].trim();
  if(mime.includes('json')){
    const parsed=await res.json();const output=extractOutput(parsed,task.nodeType,route);
    return output&&output.type==='url'?persistMediaOutput(task,output,provider,env):null;
  }
  const objectPath=`video_${task.id}_${crypto.randomUUID().slice(0,8)}${extensionForMime(mime)}`;
  const localUrl=await storageUpload(env,objectPath,res.body,mime);
  await recordMediaAsset(task,objectPath,mime,contentUrl,env);
  return {type:'url',value:localUrl,sourceUrl:contentUrl,persisted:true};
}
async function submitTask(task, request, env, ctx) {
  const state = globalThis.__canvasWorkerState;
  const stored = (state.providers || []).find(item => item.id === task.providerId);
  if (!stored) throw new Error('API 供应商不存在');
  const provider = await runtimeProvider(stored, env);
  validateOutboundUrl(provider.baseUrl, provider, env);
  const model = (provider.models || []).find(item => item.id === task.modelId);
  if (!model) throw new Error('所选模型不存在');
  const route = routeForTask(provider, model, task.nodeType);
  if (!route.createPath) throw new Error('无法确定生成接口路径');
  const references = await prepareReferences(task, provider, model, request, env, ctx);
  const context = { model: model.id, modelId: model.id, prompt: task.payload?.prompt || '', parameters: task.payload?.parameters || {}, references };
  const body = route.requestTemplate && Object.keys(route.requestTemplate).length ? replaceTemplate(route.requestTemplate, context) : defaultBody(task, model, references, route);
  const url = resolveProviderUrl(provider, route.createPath, env);
  const method = String(route.method || 'POST').toUpperCase();
  const res = await safeProviderFetch(provider, url, { method, headers: buildHeaders(provider, model), body: ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(body), timeoutMs: task.nodeType === 'video' ? 180000 : 120000 }, env);
  if (task.nodeType === 'audio' && res.ok && !String(res.headers.get('content-type') || '').includes('json')) {
    const mime = res.headers.get('content-type') || 'audio/mpeg';
    const objectPath = `audio_${task.id}_${crypto.randomUUID().slice(0, 8)}${extensionForMime(mime)}`;
    const localUrl = await storageUpload(env, objectPath, res.body, mime);
    await recordMediaAsset(task, objectPath, mime, url, env);
    return { output: { type: 'url', value: localUrl, sourceUrl: url, persisted: true } };
  }
  const parsed = await parseJsonResponse(res);
  if (route.responseMode !== 'async') {
    let output = extractOutput(parsed, task.nodeType, route);
    if (!output) throw new Error('上游请求成功，但响应中没有识别到可用结果');
    output = await persistMediaOutput(task, output, provider, env);
    return { output };
  }
  const taskId = ProviderRuntimeCore.extractTaskId(parsed, route);
  if (!taskId) throw new Error('视频任务已提交，但响应中没有识别到任务 ID；不会再次 POST，以避免重复扣费');
  if (!route.pollPath) throw new Error('视频任务已创建，但服务端未配置 pollPath');
  return { pending: true, upstream: { taskId: String(taskId), startedAt: Date.now(), pollAttempt: 0, nextPollAt: Date.now(), routeVersion: 1 } };
}

async function runTask(task, request, env, ctx) {
  if (task.cancelRequested || task.status === 'canceled') return;
  task.status = 'running'; task.progress = 8; task.error = null; task.updatedAt = nowIso(); await persistTask(task, env);
  try {
    const result = await submitTask(task, request, env, ctx);
    if (result.pending) {
      task.payload = { ...(task.payload || {}), _upstream: result.upstream };
      task.status = 'polling'; task.progress = 20; task.error = null;
    } else {
      task.output = result.output; task.status = 'succeeded'; task.progress = 100; task.error = null;
    }
  } catch (error) {
    task.attempt = Number(task.attempt || 0) + 1;
    const message = String(error?.message || error);
    if (!task.cancelRequested && task.attempt <= Number(task.maxRetries || 0) && !/已提交|任务 ID|重复扣费/.test(message)) {
      task.status = 'queued'; task.progress = 0; task.error = message;
    } else {
      task.status = task.cancelRequested ? 'canceled' : 'failed'; task.output = null; task.error = message;
    }
    task.logs = [...(task.logs || []), { time: nowIso(), level: 'error', message }].slice(-100);
  }
  task.updatedAt = nowIso(); await persistTask(task, env);
}
async function handlePollingFailure(task, error, env) {
  const message = String(error?.message || error);
  const upstream = task.payload?._upstream && typeof task.payload._upstream === 'object' ? task.payload._upstream : null;
  if (task.cancelRequested) {
    task.status = 'canceled'; task.error = null; task.updatedAt = nowIso();
    task.logs = [...(task.logs || []), { time: task.updatedAt, level: 'warn', message: '轮询期间收到取消请求' }].slice(-100);
    await persistTask(task, env);
    return 0;
  }
  if (!upstream?.taskId) {
    task.status = 'failed'; task.output = null; task.error = message; task.updatedAt = nowIso();
    task.logs = [...(task.logs || []), { time: task.updatedAt, level: 'error', message }].slice(-100);
    await persistTask(task, env);
    return 0;
  }
  const count = Number(upstream.pollErrorCount || 0) + 1;
  const maxErrors = clamp(env?.CANVAS_POLL_ERROR_RETRIES, 0, 20, 5);
  if (count > maxErrors) {
    task.status = 'failed'; task.output = null;
    task.error = `上游轮询连续失败 ${count} 次：${message}`;
    task.updatedAt = nowIso();
    task.logs = [...(task.logs || []), { time: task.updatedAt, level: 'error', message: task.error }].slice(-100);
    await persistTask(task, env);
    return 0;
  }
  const delay = Math.min(60000, Math.round(1000 * Math.pow(2, Math.min(count - 1, 6))));
  upstream.pollErrorCount = count;
  upstream.nextPollAt = Date.now() + delay;
  task.payload = { ...(task.payload || {}), _upstream: upstream };
  task.status = 'polling'; task.error = message; task.updatedAt = nowIso();
  task.logs = [...(task.logs || []), { time: task.updatedAt, level: 'warn', message: `上游轮询失败，${Math.ceil(delay / 1000)} 秒后重试（${count}/${maxErrors}）：${message}` }].slice(-100);
  await persistTask(task, env);
  return delay;
}

async function drainQueue(request, env, ctx) {
  const state = globalThis.__canvasWorkerState;
  const queueState = state.__secureQueue || (state.__secureQueue = { running: 0, active: new Set() });
  const concurrency = clamp(env?.CANVAS_TASK_CONCURRENCY, 1, 8, 2);
  const now = Date.now();
  const candidates = (state.tasks || []).filter(task => {
    if (!task || task.cancelRequested) return false;
    if (task.status === 'queued') return true;
    if (task.status !== 'polling') return false;
    const upstream = task.payload?._upstream;
    return Boolean(upstream?.taskId) && Number(upstream.nextPollAt || 0) <= now;
  }).sort((a, b) => {
    if (a.status === 'polling' && b.status !== 'polling') return -1;
    if (b.status === 'polling' && a.status !== 'polling') return 1;
    if (a.status === 'polling' && b.status === 'polling') return Number(a.payload?._upstream?.nextPollAt || 0) - Number(b.payload?._upstream?.nextPollAt || 0);
    const priority = Number(b.priority || 50) - Number(a.priority || 50);
    return priority || String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  });
  while (queueState.running < concurrency && candidates.length) {
    const task = candidates.shift(); if (!task || queueState.active.has(task.id)) continue;
    queueState.running++; queueState.active.add(task.id);
    try {
      if (task.status === 'polling') {
        try {
          await pollTask(task, request, env);
          const upstream = task.payload?._upstream;
          if (task.status === 'polling' && upstream?.pollErrorCount) {
            upstream.pollErrorCount = 0;
            task.payload = { ...(task.payload || {}), _upstream: upstream };
            await persistTask(task, env);
          }
        } catch (error) {
          await handlePollingFailure(task, error, env);
        }
      } else {
        await runTask(task, request, env, ctx);
      }
    } finally {
      queueState.running--; queueState.active.delete(task.id);
    }
  }
}
function kickQueue(request, env, ctx) {
  if (ctx?.waitUntil) ctx.waitUntil(drainQueue(request, env, ctx));
  else return drainQueue(request, env, ctx);
}

async function pollTask(task, request, env) {
  const state = globalThis.__canvasWorkerState;
  const stored = (state.providers || []).find(item => item.id === task.providerId);
  if (!stored) throw new Error('API 供应商不存在');
  const provider = await runtimeProvider(stored, env);
  const model = (provider.models || []).find(item => item.id === task.modelId);
  if (!model) throw new Error('所选模型不存在');
  const route = routeForTask(provider, model, task.nodeType);
  const upstream = task.payload?._upstream;
  if (!upstream?.taskId) throw new Error('任务没有服务端保存的上游 taskId');
  const now = Date.now();
  if (now - Number(upstream.startedAt || now) > route.timeoutMs) throw new Error('上游视频任务超时');
  if (Number(upstream.nextPollAt || 0) > now) return { retryAfterMs: Number(upstream.nextPollAt) - now };
  const pollPath = String(route.pollPath || '').replace(/\{\{\s*taskId\s*\}\}/g, encodeURIComponent(String(upstream.taskId)));
  if (!pollPath) throw new Error('服务端未配置视频 pollPath');
  const pollUrl = resolveProviderUrl(provider, pollPath, env);
  const pollMethod=String(route.pollMethod||'GET').toUpperCase();
  const pollContext={taskId:String(upstream.taskId),model:model.id,modelId:model.id,prompt:task.payload?.prompt||'',parameters:task.payload?.parameters||{},params:task.payload?.parameters||{}};
  const pollBody=route.pollBodyTemplate&&typeof route.pollBodyTemplate==='object'?replaceTemplate(route.pollBodyTemplate,pollContext):undefined;
  const res = await safeProviderFetch(provider, pollUrl, { method: pollMethod, headers: buildHeaders(provider, model, null, ['GET','HEAD'].includes(pollMethod)?null:'application/json'), body:['GET','HEAD'].includes(pollMethod)?undefined:(pollBody===undefined?undefined:JSON.stringify(pollBody)), timeoutMs: 30000 }, env);
  const parsed = await parseJsonResponse(res);
  const assessment = ProviderRuntimeCore.classifyAsyncPoll(parsed, route, task.nodeType);
  const status = assessment.status;
  const progress = assessment.progress;
  if (assessment.state === 'failure') {
    throw new Error(ProviderRuntimeCore.formatFailure(assessment, '上游任务失败'));
  }
  if (assessment.state === 'success') {
    let output = extractOutput(parsed, task.nodeType, route);
    if ((!output || output.type !== 'url') && task.nodeType === 'video') output = await fetchCompletedVideoContent(task, provider, model, route, upstream.taskId, env);
    if (!output || output.type !== 'url') throw new Error(`上游任务状态为 ${status}，但没有识别到最终媒体 URL，也无法从 contentPath 获取媒体内容`);
    output = await persistMediaOutput(task, output, provider, env);
    task.output = output; task.status = 'succeeded'; task.progress = 100; task.error = null; task.updatedAt = nowIso(); await persistTask(task, env);
    return { done: true };
  }
  if (!status && route.allowOutputWithoutTerminalStatus !== true) {
    const possibleOutput = extractOutput(parsed, task.nodeType, route);
    if (possibleOutput?.type === 'url') {
    }
  }
  const attempt = Number(upstream.pollAttempt || 0) + 1;
  const baseDelay = route.pollIntervalMs;
  const delay = ProviderRuntimeCore.nextPollDelay(baseDelay, attempt);
  upstream.pollAttempt = attempt; upstream.nextPollAt = Date.now() + delay;
  task.payload = { ...(task.payload || {}), _upstream: upstream };
  task.status = 'polling'; task.progress = Number.isFinite(progress) ? Math.max(20, Math.min(96, progress)) : Math.min(95, Number(task.progress || 20) + 2); task.updatedAt = nowIso();
  await persistTask(task, env);
  return { retryAfterMs: delay };
}

async function probeProviderConnection(provider,env){
  const route=String(provider.testPath||'').trim();
  const target=route?resolveProviderUrl(provider,route,env):validateOutboundUrl(provider.baseUrl,provider,env).toString();
  const res=await safeProviderFetch(provider,target,{method:'GET',headers:buildHeaders(provider,{},null,null),timeoutMs:15000},env);
  const preview=(await res.text()).slice(0,500);
  return {ok:true,reachable:true,endpoint:route||'/',httpStatus:res.status,preview,warning:res.ok?'':`已连接到上游，但返回 HTTP ${res.status}。连接可达不等于鉴权或生成接口可用。`};
}
async function probeProviderAuth(provider,env){
  if(provider.testPath){
    const url=resolveProviderUrl(provider,provider.testPath,env);
    const res=await safeProviderFetch(provider,url,{method:'GET',headers:buildHeaders(provider,{},null,null),timeoutMs:15000},env);
    if(!res.ok)throw new Error(`鉴权测试接口返回 HTTP ${res.status}：${(await res.text()).slice(0,300)}`);
    return {ok:true,verified:true,endpoint:provider.testPath,mode:'test-path'};
  }
  try{
    const discovered=await discoverModels(provider,env);
    return {ok:true,verified:true,endpoint:discovered.endpoint,modelCount:discovered.models.length,mode:'model-list'};
  }catch(error){
    return {ok:true,verified:false,mode:'unverified',warning:`当前供应商没有可安全用于鉴权验证的模型列表/测试接口。为避免调用图片或视频生成接口产生费用，本次不发送生成请求。${error.message}`};
  }
}
async function handleProviderRoutes(request, env, ctx, pathname) {
  const state = globalThis.__canvasWorkerState;
  if (pathname === '/api/providers' && request.method === 'GET') return json({ providers: (state.providers || []).map(publicProvider) });
  if (pathname === '/api/providers' && request.method === 'POST') {
    const body = await request.json();
    const existing = body.id ? (state.providers || []).find(item => item.id === body.id) : null;
    const saved = await normalizeProviderForSave(body, existing, env);
    const runtime = await runtimeProvider(saved, env);
    let warning='',autoConfigured=false;
    if (!saved.models.length) {
      try{
        const discovered = await discoverModels(runtime, env);
        saved.models = discovered.models; saved.authHeader = discovered.auth.header; saved.authScheme = discovered.auth.scheme;
        if(saved.protocol==='auto'&&discovered.suggestedProtocol)saved.protocol=discovered.suggestedProtocol;
        autoConfigured=true;
      }catch(error){warning=`供应商已保存，但没有发现模型列表：${String(error?.message||error)}`;}
    }
    await persistProvider(saved, env);
    return json({ provider: publicProvider(saved), modelCount: saved.models.length, autoConfigured, warning });
  }
  if (['/api/providers/test-config', '/api/providers/test-auth', '/api/providers/diagnose', '/api/providers/discover-models'].includes(pathname) && request.method === 'POST') {
    const body = await request.json();
    const existing = body.id ? (state.providers || []).find(item => item.id === body.id) : null;
    const merged = { ...(existing || {}), ...clone(body) };
    merged.referenceTransport=ProviderAdapterContract.normalizeReferenceTransport(merged.referenceTransport,{cloud:true});
    const runtime = await runtimeProvider(merged, env, body.apiKey || '');
    validateOutboundUrl(runtime.baseUrl, runtime, env);
    if(pathname==='/api/providers/test-config')return json(await probeProviderConnection(runtime,env));
    if(pathname==='/api/providers/test-auth')return json(await probeProviderAuth(runtime,env));
    if(pathname==='/api/providers/discover-models'){
      const discovered=await discoverModels(runtime,env);
      return json({ok:true,endpoint:discovered.endpoint,models:discovered.models,count:discovered.models.length,modelCount:discovered.models.length,suggestedProtocol:discovered.suggestedProtocol||'',protocolEvidence:discovered.protocolEvidence||null,authHeader:discovered.auth.header,authScheme:discovered.auth.scheme});
    }
    const report={ok:true,connection:{ok:false},auth:{ok:false,verified:false},models:{discoveryOk:false,total:0,ready:0,pending:0},warnings:[]};
    try{const c=await probeProviderConnection(runtime,env);report.connection=c;if(c.warning)report.warnings.push(c.warning)}catch(e){report.ok=false;report.connection={ok:false,error:String(e?.message||e)}}
    try{const a=await probeProviderAuth(runtime,env);report.auth=a;if(a.warning)report.warnings.push(a.warning)}catch(e){report.ok=false;report.auth={ok:false,verified:false,error:String(e?.message||e)}}
    try{const d=await discoverModels(runtime,env);report.models.discoveryOk=true;report.models.discovered=d.models.length;report.models.endpoint=d.endpoint;report.models.suggestedProtocol=d.suggestedProtocol||''}catch(e){report.models.discoveryError=String(e?.message||e);report.warnings.push('模型发现：'+String(e?.message||e))}
    const configured=(runtime.models||[]).filter(m=>m.enabled!==false);report.models.total=configured.length;
    for(const m of configured){const key=ProviderAdapterContract.inferAdapterKey(runtime,m),route=ProviderAdapterContract.resolveRoute(runtime,m,m.modality||'');const ready=key!=='auto'&&Boolean(route.createPath);if(ready)report.models.ready++;else{report.models.pending++;report.warnings.push(`模型 ${m.name||m.id} 尚未完成适配`)}}
    if(!configured.length)report.warnings.push('当前尚未保存模型；供应商仍可保存，之后可拉取或手动添加模型。');
    return json(report);
  }
  const match = pathname.match(/^\/api\/providers\/([^/]+)$/);
  if (match && request.method === 'DELETE') {
    const id = decodeURIComponent(match[1]);
    if (!(state.providers || []).some(item => item.id === id)) return json({ error: '供应商不存在' }, 404);
    await deleteProvider(id, env); return json({ ok: true });
  }
  return null;
}

async function handleTaskRoutes(request, env, ctx, pathname) {
  const state = globalThis.__canvasWorkerState;
  if (pathname === '/api/tasks' && request.method === 'POST') {
    const body = await request.json();
    const provider = (state.providers || []).find(item => item.id === String(body.providerId || ''));
    if (!provider) return json({ error: 'API 供应商不存在' }, 404);
    validateOutboundUrl(provider.baseUrl, provider, env);
    const model = (provider.models || []).find(item => item.id === String(body.modelId || ''));
    if (!model) return json({ error: '所选模型不存在' }, 404);
    const nodeType = String(body.nodeType || ''); if (!['text', 'script', 'image', 'video', 'audio'].includes(nodeType)) return json({ error: '任务参数不完整' }, 400);
    const route = routeForTask(provider, model, nodeType); resolveProviderUrl(provider, route.createPath, env); if (route.responseMode === 'async' && route.pollPath) resolveProviderUrl(provider, route.pollPath, env);
    const now = nowIso();
    const payload = clone(body); delete payload.providerSnapshot; delete payload.modelSnapshot;
    if (payload._upstream) delete payload._upstream;
    const task = { id: crypto.randomUUID(), status: 'queued', progress: 0, providerId: String(body.providerId), modelId: String(body.modelId), projectId: String(body.projectId || ''), nodeId: String(body.nodeId || ''), nodeType, payload, output: null, error: null, createdAt: now, updatedAt: now, attempt: 0, maxRetries: clamp(body.maxRetries, 0, 5, 1), priority: clamp(body.priority, 0, 100, 50), cancelRequested: false, logs: [] };
    await persistTask(task, env); kickQueue(request, env, ctx);
    return json({ task: taskPublic(task) }, 202);
  }
  if (pathname === '/api/tasks/poll' && request.method === 'POST') {
    const body = await request.json();
    const keys = Object.keys(body || {});
    if (keys.length !== 1 || keys[0] !== 'taskId' || !body.taskId) return json({ error: '该接口只接受 { taskId }，浏览器不得提交 task、pollPath 或上游地址' }, 400);
    const task = (state.tasks || []).find(item => item.id === String(body.taskId));
    if (!task) return json({ error: '任务不存在' }, 404);
    if (task.status !== 'polling') return json({ task: taskPublic(task) });
    try {
      const result = await pollTask(task, request, env);
      return json({ task: taskPublic(task), retryAfterMs: result.retryAfterMs || 0 });
    } catch (error) {
      task.status = 'failed'; task.output = null; task.error = String(error?.message || error); task.updatedAt = nowIso(); await persistTask(task, env);
      return json({ task: taskPublic(task) });
    }
  }
  if (pathname === '/api/tasks' && request.method === 'GET') {
    const url = new URL(request.url), status = url.searchParams.get('status') || '', limit = clamp(url.searchParams.get('limit'), 1, 300, 100);
    kickQueue(request, env, ctx);
    return json({ tasks: (state.tasks || []).filter(task => !status || task.status === status).slice(0, limit).map(taskPublic) });
  }
  const retry = pathname.match(/^\/api\/tasks\/([^/]+)\/retry$/);
  if (retry && request.method === 'POST') {
    const task = (state.tasks || []).find(item => item.id === decodeURIComponent(retry[1])); if (!task) return json({ error: '任务不存在' }, 404);
    task.status = 'queued'; task.progress = 0; task.error = null; task.output = null; task.cancelRequested = false; task.payload = { ...(task.payload || {}) }; delete task.payload._upstream; task.updatedAt = nowIso(); await persistTask(task, env); kickQueue(request, env, ctx); return json({ task: taskPublic(task) });
  }
  const match = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (match) {
    const task = (state.tasks || []).find(item => item.id === decodeURIComponent(match[1])); if (!task) return json({ error: '任务不存在' }, 404);
    if (request.method === 'GET') { kickQueue(request, env, ctx); return json({ task: taskPublic(task) }); }
    if (request.method === 'PATCH') { const body = await request.json(); task.priority = clamp(body.priority, 0, 100, task.priority || 50); task.updatedAt = nowIso(); await persistTask(task, env); return json({ task: taskPublic(task) }); }
    if (request.method === 'DELETE') { task.cancelRequested = true; task.status = ['queued', 'polling'].includes(task.status) ? 'canceled' : task.status === 'running' ? 'cancelling' : task.status; task.updatedAt = nowIso(); await persistTask(task, env); return json({ task: taskPublic(task) }); }
  }
  if (pathname === '/api/queue' && request.method === 'GET') {
    const q = state.__secureQueue || { running: 0 }; const concurrency = clamp(env?.CANVAS_TASK_CONCURRENCY, 1, 8, 2); const queued = (state.tasks || []).filter(task => task.status === 'queued').length;
    kickQueue(request, env, ctx); return json({ paused: false, concurrency, running: q.running || 0, queued });
  }
  return null;
}

async function secureFetch(request, env, ctx) {
  await bootstrap(request, env, ctx);
  const url = new URL(request.url), pathname = url.pathname;
  const secured = pathname.startsWith('/api/providers') || pathname.startsWith('/api/tasks') || pathname === '/api/queue' || pathname === '/api/media/process';
  if (secured && !(await requireAuthorized(request, env, ctx))) return json({ error: '需要管理员访问密码' }, 401);

  if (pathname === '/api/media/process' && request.method === 'POST') {
    return json({ ok: false, error: '当前 Cloudflare Worker 环境不支持本地 FFmpeg/FFprobe 媒体处理，请使用服务端处理或外部媒体处理服务。此接口不会再返回虚假的处理成功结果。' }, 501);
  }

  const providerResponse = await handleProviderRoutes(request, env, ctx, pathname);
  if (providerResponse) return providerResponse;
  const taskResponse = await handleTaskRoutes(request, env, ctx, pathname);
  if (taskResponse) return taskResponse;
  return legacyWorker.fetch(request, env, ctx);
}

export default {
  async fetch(request, env, ctx) {
    try { return await secureFetch(request, env, ctx); }
    catch (error) { return json({ error: String(error?.message || error) }, 500); }
  }
};
