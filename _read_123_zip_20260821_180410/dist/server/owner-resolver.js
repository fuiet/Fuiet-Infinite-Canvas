import secureWorker from './secure-entry.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUTO_OWNER_CACHE_MS = 15_000;
const ANON_COOKIE_NAME = 'canvas_owner_v1';
const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2;

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

function anonymousOwnerEnabled(env) {
  return String(env?.CANVAS_ANONYMOUS_OWNER ?? '0') === '1';
}

function ownerSigningSecret(env) {
  return String(env?.CANVAS_SESSION_SECRET || env?.PROVIDER_SECRET_KEY || '').trim();
}

function parseCookieHeader(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function signAnonymousOwner(owner, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(owner));
  return base64Url(new Uint8Array(signature));
}

async function verifyAnonymousOwnerCookie(value, secret) {
  const raw = String(value || '').trim();
  const dot = raw.indexOf('.');
  if (dot <= 0) return '';
  const owner = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  if (!UUID_RE.test(owner) || !signature) return '';
  const expected = await signAnonymousOwner(owner, secret);
  if (expected.length !== signature.length) return '';
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0 ? owner : '';
}

export async function anonymousOwnerFromRequest(request, env) {
  if (!anonymousOwnerEnabled(env)) return { owner: '', setCookie: '' };
  const secret = ownerSigningSecret(env);
  if (!secret) return { owner: '', setCookie: '', error: '匿名 owner 模式需要 CANVAS_SESSION_SECRET 或 PROVIDER_SECRET_KEY' };

  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const existing = await verifyAnonymousOwnerCookie(cookies[ANON_COOKIE_NAME], secret);
  if (existing) return { owner: existing, setCookie: '' };

  const owner = crypto.randomUUID();
  const signature = await signAnonymousOwner(owner, secret);
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  const setCookie = `${ANON_COOKIE_NAME}=${owner}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ANON_COOKIE_MAX_AGE}${secure}`;
  return { owner, setCookie };
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
  const anonymous = await anonymousOwnerFromRequest(request, env);
  if (anonymous.owner) return { owner: anonymous.owner, source: 'anonymous-cookie', setCookie: anonymous.setCookie };
  if (anonymous.error) return { owner: '', source: '', error: anonymous.error };

  const bearer = await ownerFromBearer(request, env);
  if (bearer) return { owner: bearer, source: 'supabase-bearer', setCookie: '' };

  const configured = configuredOwner(env);
  const trustedAdminPassThrough = String(env?.CANVAS_ALLOW_UNAUTHENTICATED_OWNER || '0') === '1';
  if (trustedAdminPassThrough) {
    if (configured) return { owner: configured, source: 'configured-admin-pass-through', setCookie: '' };
    const automatic = await singleSupabaseOwner(env);
    if (automatic) return { owner: automatic, source: 'single-supabase-admin-pass-through', setCookie: '' };
    return { owner: '', source: '', setCookie: '' };
  }

  const auth = await adminAuthStatus(request, env, ctx);
  if (!auth.enabled || !auth.authenticated) {
    return { owner: '', source: '', auth, setCookie: '' };
  }

  if (configured) return { owner: configured, source: 'configured-admin', auth, setCookie: '' };

  const automatic = await singleSupabaseOwner(env);
  if (automatic) return { owner: automatic, source: 'single-supabase-admin', auth, setCookie: '' };

  return { owner: '', source: '', auth, setCookie: '' };
}
