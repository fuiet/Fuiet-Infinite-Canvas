const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL, fileURLToPath } = require('url');

const LOCAL_MEDIA_RE = /^\/media\/([A-Za-z0-9._-]+)$/;
const DATA_URL_RE = /^data:([^;,]+)?(;base64)?,(.*)$/is;
const TRANSPORTS = new Set(['auto', 'data-url', 'url', 'upload']);

function deepGet(value, dottedPath) {
  if (!dottedPath) return undefined;
  return String(dottedPath).split('.').reduce((cur, key) => cur == null ? undefined : cur[key], value);
}

function normalizeTransport(value) {
  let text = String(value || 'auto').trim().toLowerCase();
  if (text === 'base64') text = 'data-url';
  if (text === 'public-url') text = 'url';
  if (text === 'upload-endpoint') text = 'upload';
  return TRANSPORTS.has(text) ? text : 'auto';
}

function effectiveTransport(provider = {}, model = {}) {
  const nested = model.videoProtocolConfig && typeof model.videoProtocolConfig === 'object'
    ? model.videoProtocolConfig
    : {};
  const value = model.referenceTransport ?? nested.referenceTransport ?? provider.referenceTransport ?? 'auto';
  return normalizeTransport(value);
}

function mimeFromExt(ext = '') {
  const map = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac'
  };
  return map[String(ext).toLowerCase()] || 'application/octet-stream';
}

function extFromMime(mime = '') {
  const map = {
    'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif',
    'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm',
    'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/mp4': '.m4a', 'audio/aac': '.aac'
  };
  return map[String(mime).toLowerCase()] || '.bin';
}

function safeMediaFile(mediaDir, name) {
  if (!/^[A-Za-z0-9._-]+$/.test(String(name || ''))) throw new Error('本地参考媒体文件名无效');
  const root = path.resolve(mediaDir);
  const file = path.resolve(root, String(name));
  if (file !== root && !file.startsWith(root + path.sep)) throw new Error('本地参考媒体路径越界');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`本地参考媒体不存在：${path.basename(file)}`);
  return file;
}

function localMediaFileFromValue(value, mediaDir) {
  const text = String(value || '').trim();
  if (!text) return '';
  const direct = text.match(LOCAL_MEDIA_RE);
  if (direct) return safeMediaFile(mediaDir, direct[1]);
  try {
    const u = new URL(text);
    if ((u.hostname === '127.0.0.1' || u.hostname === 'localhost') && LOCAL_MEDIA_RE.test(u.pathname)) {
      return safeMediaFile(mediaDir, u.pathname.match(LOCAL_MEDIA_RE)[1]);
    }
    if (u.protocol === 'file:') {
      const file = path.resolve(fileURLToPath(u));
      const root = path.resolve(mediaDir);
      if (file === root || file.startsWith(root + path.sep)) return safeMediaFile(mediaDir, path.basename(file));
    }
  } catch {}
  if (path.isAbsolute(text)) {
    const file = path.resolve(text), root = path.resolve(mediaDir);
    if (file === root || file.startsWith(root + path.sep)) return safeMediaFile(mediaDir, path.basename(file));
  }
  return '';
}

function dataUrlToBuffer(value) {
  const match = String(value || '').match(DATA_URL_RE);
  if (!match) return null;
  const mime = String(match[1] || 'application/octet-stream').toLowerCase();
  const encoded = match[3] || '';
  const buffer = match[2]
    ? Buffer.from(encoded, 'base64')
    : Buffer.from(decodeURIComponent(encoded), 'utf8');
  return { buffer, mime };
}

function fileToDataUrl(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length > 35 * 1024 * 1024) {
    throw new Error('参考素材超过 35MB，不能使用 Data URL 传输；请配置供应商上传接口或公共媒体桥');
  }
  return `data:${mimeFromExt(path.extname(file))};base64,${buffer.toString('base64')}`;
}

function materializeDataUrl(value, mediaDir) {
  const decoded = dataUrlToBuffer(value);
  if (!decoded) return '';
  if (decoded.buffer.length > 100 * 1024 * 1024) throw new Error('参考素材超过 100MB，拒绝写入本地媒体缓存');
  const hash = crypto.createHash('sha256').update(decoded.buffer).digest('hex').slice(0, 24);
  const file = path.join(mediaDir, `media_ref_${hash}${extFromMime(decoded.mime)}`);
  fs.mkdirSync(mediaDir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, decoded.buffer);
  return file;
}

function mapNestedStrings(value, mapper) {
  if (typeof value === 'string') return mapper(value);
  if (Array.isArray(value)) return Promise.all(value.map(item => mapNestedStrings(item, mapper)));
  if (value && typeof value === 'object') {
    const out = {};
    return Promise.all(Object.entries(value).map(async ([key, item]) => {
      out[key] = await mapNestedStrings(item, mapper);
    })).then(() => out);
  }
  return Promise.resolve(value);
}

function providerMatchesRequest(provider, requestUrl) {
  try {
    const base = new URL(String(provider?.baseUrl || ''));
    const target = new URL(String(requestUrl || ''));
    if (base.origin !== target.origin) return false;
    const prefix = base.pathname.replace(/\/+$/, '') || '/';
    return prefix === '/' || target.pathname === prefix || target.pathname.startsWith(prefix + '/');
  } catch {
    return false;
  }
}

function findProviderAndModel(providers, requestUrl, body) {
  const provider = (Array.isArray(providers) ? providers : []).find(item => providerMatchesRequest(item, requestUrl));
  if (!provider) return { provider: null, model: null };
  const modelId = String(body?.model || '').trim().toLowerCase();
  const model = (provider.models || []).find(item => String(item?.id || '').trim().toLowerCase() === modelId) || null;
  return { provider, model };
}

function publicMediaUrl(provider, file) {
  const base = String(provider?.publicBaseUrl || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  const url = `${base}/media/${encodeURIComponent(path.basename(file))}`;
  try { return new URL(url).toString(); } catch { throw new Error('Public Base URL 无效'); }
}

function strictHttpsReference(provider, model) {
  try {
    const host = new URL(String(provider?.baseUrl || '')).hostname.toLowerCase();
    const hint = `${model?.id || ''} ${model?.name || ''}`.toLowerCase();
    return (host === 'xogpu.com' || host.endsWith('.xogpu.com')) && /minimax[-_. ]?h3|\bh3\b/.test(hint);
  } catch {
    return false;
  }
}

function normalizePublicReference(url, provider, model) {
  const text = String(url || '').trim();
  let parsed;
  try { parsed = new URL(text); } catch { throw new Error('供应商素材上传没有返回有效 URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('供应商素材上传返回的不是 HTTP/HTTPS URL');
  if (strictHttpsReference(provider, model) && parsed.protocol !== 'https:') {
    throw new Error('XOGPU MiniMax-H3 的参考素材必须使用公网 HTTPS URL');
  }
  return parsed.toString();
}

function joinProviderUrl(baseUrl, route) {
  const base = new URL(String(baseUrl || ''));
  const value = String(route || '').trim();
  if (/^https?:\/\//i.test(value)) {
    const absolute = new URL(value);
    if (absolute.origin !== base.origin) throw new Error('供应商上传接口必须与 API Base URL 同源');
    return absolute.toString();
  }
  let routePath = value || '/';
  if (!routePath.startsWith('/')) routePath = '/' + routePath;
  const root = base.pathname.replace(/\/+$/, '');
  if (root && root !== '/' && !routePath.startsWith(root + '/')) base.pathname = (root + routePath).replace(/\/{2,}/g, '/');
  else base.pathname = routePath;
  base.search = '';
  base.hash = '';
  return base.toString();
}

function copyUploadHeaders(headers) {
  const source = new Headers(headers || {}), out = new Headers();
  for (const [key, value] of source.entries()) {
    const lower = key.toLowerCase();
    if (['content-type', 'content-length', 'host', 'connection', 'transfer-encoding'].includes(lower)) continue;
    out.set(key, value);
  }
  return out;
}

async function uploadReference({ provider, model, file, dataUrl, requestHeaders, fetchImpl }) {
  if (!String(provider?.uploadPath || '').trim()) throw new Error('供应商未配置素材上传接口');
  let buffer, mime, filename;
  if (file) {
    buffer = fs.readFileSync(file);
    mime = mimeFromExt(path.extname(file));
    filename = path.basename(file);
  } else {
    const decoded = dataUrlToBuffer(dataUrl);
    if (!decoded) throw new Error('无法读取待上传参考素材');
    buffer = decoded.buffer;
    mime = decoded.mime;
    filename = `reference${extFromMime(mime)}`;
  }
  if (buffer.length > 100 * 1024 * 1024) throw new Error('参考素材超过 100MB，拒绝上传');
  const form = new FormData();
  form.append(provider.uploadFileField || 'file', new Blob([buffer], { type: mime }), filename);
  const response = await fetchImpl(joinProviderUrl(provider.baseUrl, provider.uploadPath), {
    method: 'POST',
    headers: copyUploadHeaders(requestHeaders),
    body: form,
    redirect: 'follow'
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`供应商素材上传失败 ${response.status}: ${text.slice(0, 300)}`);
  const raw = deepGet(data, provider.uploadOutputPath || 'data.url') || data.url || data.uri || data.file_url || data.fileUrl;
  if (!raw) throw new Error(`素材上传成功，但未找到返回字段 ${provider.uploadOutputPath || 'data.url'}`);
  const absolute = /^https?:\/\//i.test(String(raw)) ? String(raw) : new URL(String(raw), provider.baseUrl).toString();
  return normalizePublicReference(absolute, provider, model);
}

async function resolveReferenceValue(value, context) {
  const { provider, model, mediaDir, requestHeaders, fetchImpl } = context;
  const text = String(value || '').trim();
  const file = localMediaFileFromValue(text, mediaDir);
  const isData = DATA_URL_RE.test(text);
  if (!file && !isData) return value;

  const transport = effectiveTransport(provider, model);
  const uploadAvailable = Boolean(String(provider?.uploadPath || '').trim());
  const publicAvailable = Boolean(String(provider?.publicBaseUrl || '').trim());

  if (transport === 'data-url') return file ? fileToDataUrl(file) : text;

  if (transport === 'upload') {
    return uploadReference({ provider, model, file, dataUrl: file ? '' : text, requestHeaders, fetchImpl });
  }

  if (transport === 'url') {
    if (uploadAvailable) return uploadReference({ provider, model, file, dataUrl: file ? '' : text, requestHeaders, fetchImpl });
    let publicFile = file;
    if (!publicFile && publicAvailable) publicFile = materializeDataUrl(text, mediaDir);
    if (publicFile && publicAvailable) return normalizePublicReference(publicMediaUrl(provider, publicFile), provider, model);
    throw new Error('当前模型要求公网 URL 参考素材，但本机素材尚无可用传输方式；请配置供应商上传接口，或配置可从公网访问的 Public Base URL');
  }

  if (uploadAvailable) return uploadReference({ provider, model, file, dataUrl: file ? '' : text, requestHeaders, fetchImpl });
  if (publicAvailable) {
    const publicFile = file || materializeDataUrl(text, mediaDir);
    return normalizePublicReference(publicMediaUrl(provider, publicFile), provider, model);
  }
  return file ? fileToDataUrl(file) : text;
}

function loadProvidersFile(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createReferenceAwareFetch({ dataDir, fetchImpl = global.fetch, loadProviders, logger = console } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('ReferenceMediaTransport 需要 fetch 实现');
  const root = path.resolve(dataDir || process.env.CANVAS_DATA_DIR || path.join(__dirname, '.data'));
  const mediaDir = path.join(root, 'media');
  const providersFile = path.join(root, 'providers.json');
  const providerLoader = loadProviders || (() => loadProvidersFile(providersFile));

  return async function referenceAwareFetch(input, init = {}) {
    const requestUrl = typeof input === 'string' || input instanceof URL ? String(input) : String(input?.url || '');
    const method = String(init.method || input?.method || 'GET').toUpperCase();
    if (!['POST', 'PUT', 'PATCH'].includes(method) || typeof init.body !== 'string') return fetchImpl(input, init);

    let body;
    try { body = JSON.parse(init.body); } catch { return fetchImpl(input, init); }
    if (!body || typeof body !== 'object') return fetchImpl(input, init);

    const { provider, model } = findProviderAndModel(providerLoader(), requestUrl, body);
    if (!provider || !model) return fetchImpl(input, init);

    let changed = false;
    const rewritten = await mapNestedStrings(body, async value => {
      const before = String(value || '');
      const after = await resolveReferenceValue(value, {
        provider,
        model,
        mediaDir,
        requestHeaders: init.headers || input?.headers || {},
        fetchImpl
      });
      if (after !== value) changed = true;
      return after;
    });

    if (!changed) return fetchImpl(input, init);
    logger?.info?.(`[ReferenceMediaTransport] ${provider.name || provider.id || 'provider'} / ${model.name || model.id || 'model'}: ${effectiveTransport(provider, model)}`);
    return fetchImpl(input, { ...init, body: JSON.stringify(rewritten) });
  };
}

function installDesktopReferenceMediaTransport(options = {}) {
  if (globalThis.__fuietReferenceMediaTransportInstalled) return globalThis.fetch;
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = createReferenceAwareFetch({ ...options, fetchImpl: originalFetch });
  globalThis.__fuietReferenceMediaTransportInstalled = true;
  return globalThis.fetch;
}

module.exports = {
  normalizeTransport,
  effectiveTransport,
  localMediaFileFromValue,
  dataUrlToBuffer,
  fileToDataUrl,
  materializeDataUrl,
  resolveReferenceValue,
  createReferenceAwareFetch,
  installDesktopReferenceMediaTransport
};
