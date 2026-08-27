import secureWorker from './secure-entry.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUTO_OWNER_CACHE_MS = 15_000;

export function configuredOwner(env) {
  const value = String(env?.CANVAS_OWNER_ID || '').trim();
  return UUID_RE.test(value) ? value : '';
}

export function supabaseOwnerConfig(env) {
  const url = String(env?.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceKey = String(env?.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const anonKey = String(env?.SUPABASE_ANON_KEY || '').trim();
  return url && serviceKey ? { url, serviceKey, anonKey: anonKey || serviceKey } : null;
}

export async function ownerFromBearer(request, env) {
  const cfg = supabaseOwnerConfig(env);
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
  const id = String(user?.id || '').trim();
  return UUID_RE.test(id) ? id : '';
}

export async function adminAuthStatus(request, env, ctx) {
  const url = new URL(request.url);
  url.pathname = '/api/auth/status';
  url.search = '';
  const res = await secureWorker.fetch(new Request(url.toString(), {
    method: 'GET',
    headers: request.headers
  }), env, ctx);
  const status = await res.json().catch(() => ({}));
  return {
    enabled: Boolean(status.enabled),
    authenticated: Boolean(status.authenticated)
  };
}

export async function singleSupabaseOwner(env) {
  if (String(env?.CANVAS_AUTO_SINGLE_SUPABASE_OWNER ?? '1') === '0') return '';
  const cfg = supabaseOwnerConfig(env);
  if (!cfg) return '';

  const cached = globalThis.__canvasSingleSupabaseOwner;
  const now = Date.now();
  if (cached?.url === cfg.url && cached?.expiresAt > now && UUID_RE.test(String(cached.owner || ''))) {
    return String(cached.owner);
  }

  const url = new URL(`${cfg.url}/auth/v1/admin/users`);
  url.searchParams.set('page', '1');
  url.searchParams.set('per_page', '2');
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: cfg.serviceKey,
      authorization: `Bearer ${cfg.serviceKey}`,
      accept: 'application/json'
    },
    redirect: 'manual'
  });
  if (!res.ok) return '';
  const data = await res.json().catch(() => null);
  const users = Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : [];
  const ids = users.map(user => String(user?.id || '').trim()).filter(id => UUID_RE.test(id));
  if (ids.length !== 1 || users.length !== 1) return '';

  globalThis.__canvasSingleSupabaseOwner = {
    url: cfg.url,
    owner: ids[0],
    expiresAt: now + AUTO_OWNER_CACHE_MS
  };
  return ids[0];
}

export async function resolveCanvasOwner(request, env, ctx) {
  const bearer = await ownerFromBearer(request, env);
  if (bearer) return { owner: bearer, source: 'supabase-bearer' };

  const configured = configuredOwner(env);
  if (configured && String(env?.CANVAS_ALLOW_UNAUTHENTICATED_OWNER || '0') === '1') {
    return { owner: configured, source: 'configured-unauthenticated' };
  }

  const auth = await adminAuthStatus(request, env, ctx);
  if (!auth.enabled || !auth.authenticated) {
    return { owner: '', source: '', auth };
  }

  if (configured) return { owner: configured, source: 'configured-admin', auth };

  const automatic = await singleSupabaseOwner(env);
  if (automatic) return { owner: automatic, source: 'single-supabase-admin', auth };

  return { owner: '', source: '', auth };
}
