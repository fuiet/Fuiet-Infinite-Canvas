import secureWorker from './secure-index.js';

const SENSITIVE = new Set([
  'authorization', 'proxy-authorization', 'x-api-key', 'api-key', 'apikey',
  'cookie', 'set-cookie', 'x-auth-token', 'x-access-token', 'x-secret-key',
  'cf-access-client-secret'
]);

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers
    }
  });
}

function sensitiveHeader(name) {
  const key = String(name || '').trim().toLowerCase();
  return SENSITIVE.has(key) || /(^|[-_])(authorization|secret|token)([-_]|$)/i.test(key);
}

function scrubHeaders(value) {
  const out = {};
  if (!value || typeof value !== 'object') return out;
  for (const [key, child] of Object.entries(value)) {
    if (!sensitiveHeader(key)) out[key] = child;
  }
  return out;
}

function scrubProviderShape(input) {
  const provider = structuredClone(input || {});
  if (provider.defaultHeaders && typeof provider.defaultHeaders === 'object') {
    provider.defaultHeaders = scrubHeaders(provider.defaultHeaders);
  }
  if (Array.isArray(provider.models)) {
    provider.models = provider.models.map(model => ({
      ...model,
      extraHeaders: scrubHeaders(model?.extraHeaders)
    }));
  }
  return provider;
}

function base64Url(bytes) {
  let binary = '';
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < data.length; i += 0x8000) {
    binary += String.fromCharCode(...data.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function cryptoKey(env) {
  const secret = String(env?.PROVIDER_SECRET_KEY || env?.CANVAS_SECRET_KEY || env?.API_KEY_ENCRYPTION_KEY || '').trim();
  if (!secret) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt']);
}

async function encryptLegacySecret(value, env) {
  const key = await cryptoKey(env);
  if (!key || !value) return '';
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(String(value))
  );
  return `v1.${base64Url(iv)}.${base64Url(encrypted)}`;
}

function supabaseConfig(env) {
  const url = String(env?.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = String(env?.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return url && key ? { url, key } : null;
}

async function persistProvider(provider, env) {
  const cfg = supabaseConfig(env);
  if (!cfg) return;
  const url = new URL(`${cfg.url}/rest/v1/providers`);
  url.searchParams.set('on_conflict', 'id');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: cfg.key,
      authorization: `Bearer ${cfg.key}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify([{ id: provider.id, name: provider.name || '新供应商', data: provider }])
  });
  if (!res.ok) {
    throw new Error(`provider secret migration failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
}

function sameJson(a, b) {
  try { return JSON.stringify(a) === JSON.stringify(b); }
  catch { return false; }
}

async function migrateStoredProviders(env) {
  const state = globalThis.__canvasWorkerState;
  if (!state?.providers) return;
  const canEncrypt = Boolean(await cryptoKey(env));
  for (let i = 0; i < state.providers.length; i++) {
    const original = state.providers[i];
    const next = scrubProviderShape(original);
    if (next.apiKey && !next.apiKeyEncrypted) {
      if (canEncrypt) {
        next.apiKeyEncrypted = await encryptLegacySecret(next.apiKey, env);
        delete next.apiKey;
      } else {
        console.warn('[canvas-security] plaintext provider API key exists but PROVIDER_SECRET_KEY is not configured');
      }
    }
    if (!sameJson(original, next)) {
      state.providers[i] = next;
      await persistProvider(next, env);
    }
  }
}

async function ensureMigrated(request, env, ctx) {
  if (!globalThis.__canvasWorkerState?.booted) {
    const url = new URL(request.url);
    url.pathname = '/api/health';
    url.search = '';
    await secureWorker.fetch(new Request(url.toString(), { method: 'GET', headers: request.headers }), env, ctx);
  }
  if (!globalThis.__canvasProviderMigrationPromise) {
    globalThis.__canvasProviderMigrationPromise = migrateStoredProviders(env).catch(error => {
      console.error('[canvas-security] provider secret migration error', error);
      globalThis.__canvasProviderMigrationPromise = null;
      throw error;
    });
  }
  await globalThis.__canvasProviderMigrationPromise;
}

async function rewriteProviderRequest(request) {
  const url = new URL(request.url);
  const isProviderBody = request.method === 'POST' && (
    url.pathname === '/api/providers' ||
    url.pathname === '/api/providers/test-config' ||
    url.pathname === '/api/providers/test-auth' ||
    url.pathname === '/api/providers/diagnose' ||
    url.pathname === '/api/providers/discover-models'
  );
  if (!isProviderBody) return request;
  let body;
  try { body = await request.clone().json(); }
  catch { return request; }
  const safe = scrubProviderShape(body);
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(safe),
    redirect: request.redirect
  });
}

function requestIp(request) {
  return String(request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
}

function loginRateLimited(request, env) {
  const limit = Math.max(3, Math.min(50, Number(env?.CANVAS_LOGIN_ATTEMPTS_PER_10M || 10)));
  const now = Date.now();
  const key = requestIp(request);
  const map = globalThis.__canvasLoginRateBuckets || (globalThis.__canvasLoginRateBuckets = new Map());
  let bucket = map.get(key);
  if (!bucket || now - bucket.startedAt >= 10 * 60 * 1000) bucket = { startedAt: now, count: 0 };
  bucket.count += 1;
  map.set(key, bucket);
  return bucket.count > limit;
}

function clearLoginRate(request) {
  globalThis.__canvasLoginRateBuckets?.delete(requestIp(request));
}

async function authStatus(request, env, ctx) {
  const url = new URL(request.url);
  url.pathname = '/api/auth/status';
  url.search = '';
  const res = await secureWorker.fetch(new Request(url.toString(), { method: 'GET', headers: request.headers }), env, ctx);
  return res.json().catch(() => ({ enabled: false, authenticated: false }));
}

function hardenSessionCookie(response, request) {
  if (new URL(request.url).protocol !== 'https:') return response;
  const headers = new Headers(response.headers);
  const cookie = headers.get('set-cookie');
  if (!cookie || /(?:^|;)\s*Secure(?:;|$)/i.test(cookie)) return response;
  headers.set('set-cookie', `${cookie}; Secure`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function uploadGuard(request, env) {
  const maxBytes = Math.max(1024 * 1024, Math.min(100 * 1024 * 1024, Number(env?.CANVAS_MAX_UPLOAD_BYTES || 50 * 1024 * 1024)));
  const length = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(length) && length > maxBytes) {
    return json({ error: `上传文件过大，最大允许 ${Math.round(maxBytes / 1024 / 1024)}MB` }, 413);
  }
  const mime = String(request.headers.get('content-type') || '').split(';')[0].toLowerCase();
  const allowed = !mime || mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/') || mime === 'application/octet-stream' || mime === 'model/gltf-binary' || mime === 'model/gltf+json';
  if (!allowed) return json({ error: `不支持的上传类型：${mime}` }, 415);
  return null;
}

async function routeSecurityGuards(request, env, ctx) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === '/api/auth/login' && request.method === 'POST') {
    if (loginRateLimited(request, env)) return json({ error: '登录尝试过于频繁，请稍后重试' }, 429);
    const response = await secureWorker.fetch(request, env, ctx);
    if (response.ok) clearLoginRate(request);
    return hardenSessionCookie(response, request);
  }

  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    return hardenSessionCookie(await secureWorker.fetch(request, env, ctx), request);
  }

  if (pathname === '/api/blender/bridge/token' && request.method === 'GET') {
    const auth = await authStatus(request, env, ctx);
    if (!auth.enabled) {
      return json({ error: '为防止 Blender Bridge Token 泄露，请先配置 CANVAS_ADMIN_PASSWORD' }, 503);
    }
    if (!auth.authenticated) return json({ error: '需要管理员身份才能获取 Blender Bridge Token' }, 401);
    return secureWorker.fetch(request, env, ctx);
  }

  if (pathname === '/api/upload' && request.method === 'POST') {
    const rejected = uploadGuard(request, env);
    if (rejected) return rejected;
  }

  return null;
}

export default {
  async fetch(request, env, ctx) {
    try {
      await ensureMigrated(request, env, ctx);
      const guarded = await routeSecurityGuards(request, env, ctx);
      if (guarded) return guarded;
      return secureWorker.fetch(await rewriteProviderRequest(request), env, ctx);
    } catch (error) {
      return json({ error: String(error?.message || error) }, 500);
    }
  }
};
