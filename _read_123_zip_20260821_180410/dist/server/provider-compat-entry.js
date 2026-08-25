import productionWorker from './production-entry.js';
import secureWorker from './secure-entry.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDER_DRAFT_ROUTES = new Set([
  '/api/providers/test-config',
  '/api/providers/test-auth',
  '/api/providers/diagnose',
  '/api/providers/discover-models'
]);

function json(body, status = 200, sourceHeaders = null) {
  const headers = sourceHeaders ? new Headers(sourceHeaders) : new Headers();
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(JSON.stringify(body), { status, headers });
}

function rewriteJsonRequest(request, body) {
  const headers = new Headers(request.headers);
  headers.set('content-type', 'application/json');
  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(body),
    redirect: request.redirect
  });
}

async function ensureBootstrapped(request, env, ctx) {
  if (globalThis.__canvasWorkerState?.booted) return;
  const url = new URL(request.url);
  url.pathname = '/api/health';
  url.search = '';
  await secureWorker.fetch(new Request(url.toString(), { method: 'GET', headers: request.headers }), env, ctx);
}

function configuredOwner(env) {
  const value = String(env?.CANVAS_OWNER_ID || '').trim();
  return UUID_RE.test(value) ? value : '';
}

function supabaseConfig(env) {
  const url = String(env?.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceKey = String(env?.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const anonKey = String(env?.SUPABASE_ANON_KEY || '').trim();
  return url && serviceKey ? { url, serviceKey, anonKey: anonKey || serviceKey } : null;
}

async function ownerFromBearer(request, env) {
  const cfg = supabaseConfig(env);
  const auth = String(request.headers.get('authorization') || '').trim();
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!cfg || !match) return '';
  const token = match[1].trim();
  if (!token || token === cfg.serviceKey) return '';
  const res = await fetch(`${cfg.url}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: cfg.anonKey,
      authorization: `Bearer ${token}`,
      accept: 'application/json'
    },
    redirect: 'manual'
  });
  if (!res.ok) return '';
  const user = await res.json().catch(() => null);
  return UUID_RE.test(String(user?.id || '')) ? String(user.id) : '';
}

async function adminOwner(request, env, ctx) {
  const owner = configuredOwner(env);
  if (!owner) return '';
  if (String(env?.CANVAS_ALLOW_UNAUTHENTICATED_OWNER || '0') === '1') return owner;
  const url = new URL(request.url);
  url.pathname = '/api/auth/status';
  url.search = '';
  const res = await secureWorker.fetch(new Request(url.toString(), { method: 'GET', headers: request.headers }), env, ctx);
  const status = await res.json().catch(() => ({}));
  return status.enabled && status.authenticated ? owner : '';
}

async function resolveOwner(request, env, ctx) {
  return await ownerFromBearer(request, env) || await adminOwner(request, env, ctx);
}

function providerOwner(provider) {
  return String(provider?.ownerId || provider?.data?.ownerId || '').trim();
}

async function scrubProviderResponse(response) {
  const contentType = String(response.headers.get('content-type') || '');
  if (!contentType.includes('json')) return response;
  const data = await response.clone().json().catch(() => null);
  if (!data || typeof data !== 'object') return response;
  if (data.provider && typeof data.provider === 'object') delete data.provider.ownerId;
  return json(data, response.status, response.headers);
}

async function handleProviderDraft(request, env, ctx, pathname) {
  if (String(env?.CANVAS_ENFORCE_OWNER || '0') !== '1') return null;
  if (request.method !== 'POST' || (pathname !== '/api/providers' && !PROVIDER_DRAFT_ROUTES.has(pathname))) return null;

  await ensureBootstrapped(request, env, ctx);
  const owner = await resolveOwner(request, env, ctx);
  if (!owner) return null; // productionWorker returns the canonical owner/auth error.

  const body = await request.clone().json().catch(() => null);
  if (!body || typeof body !== 'object') return null;
  const id = String(body.id || '').trim();
  const existing = id ? (globalThis.__canvasWorkerState?.providers || []).find(item => item.id === id) : null;

  // A client-generated id is valid for a new draft. It becomes an ownership check
  // only when a row with that id already exists.
  if (existing && providerOwner(existing) !== owner) {
    return json({ error: 'API 供应商不存在' }, 404);
  }

  body.ownerId = owner;
  // Private /media URLs are not usable by third-party providers once media is owner-protected.
  // New providers therefore default to a server-prepared data URL unless explicitly configured.
  if (!body.referenceTransport) body.referenceTransport = existing?.referenceTransport || 'data-url';
  // Cloudflare production must never let a browser opt into private-network SSRF.
  body.allowPrivateHosts = false;

  const response = await secureWorker.fetch(rewriteJsonRequest(request, body), env, ctx);
  return pathname === '/api/providers' ? scrubProviderResponse(response) : response;
}

export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    const draftResponse = await handleProviderDraft(request, env, ctx, pathname);
    if (draftResponse) return draftResponse;
    return productionWorker.fetch(request, env, ctx);
  }
};
