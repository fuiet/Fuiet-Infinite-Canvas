import secureWorker from './secure-index.js';

const SENSITIVE = new Set([
  'authorization', 'proxy-authorization', 'x-api-key', 'api-key', 'apikey',
  'cookie', 'set-cookie', 'x-auth-token', 'x-access-token', 'x-secret-key',
  'cf-access-client-secret'
]);

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

export default {
  async fetch(request, env, ctx) {
    try {
      await ensureMigrated(request, env, ctx);
      return secureWorker.fetch(await rewriteProviderRequest(request), env, ctx);
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error?.message || error) }), {
        status: 500,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff'
        }
      });
    }
  }
};
