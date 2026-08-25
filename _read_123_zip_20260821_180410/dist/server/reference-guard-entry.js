import providerWorker from './provider-compat-entry.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
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
  const match = String(request.headers.get('authorization') || '').trim().match(/^Bearer\s+(.+)$/i);
  if (!cfg || !match) return '';
  const token = match[1].trim();
  if (!token || token === cfg.serviceKey) return '';
  const response = await fetch(`${cfg.url}/auth/v1/user`, {
    method: 'GET',
    headers: { apikey: cfg.anonKey, authorization: `Bearer ${token}`, accept: 'application/json' },
    redirect: 'manual'
  });
  if (!response.ok) return '';
  const user = await response.json().catch(() => null);
  return UUID_RE.test(String(user?.id || '')) ? String(user.id) : '';
}

async function resolveOwner(request, env) {
  if (String(env?.CANVAS_ALLOW_UNAUTHENTICATED_OWNER || '0') === '1') return configuredOwner(env);
  return await ownerFromBearer(request, env);
}

function localMediaPaths(value, output = new Set()) {
  if (typeof value === 'string') {
    const match = value.match(/^\/media\/([^?#]+)(?:[?#].*)?$/);
    if (match) {
      try { output.add(decodeURIComponent(match[1])); }
      catch { output.add(match[1]); }
    }
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) localMediaPaths(item, output);
    return output;
  }
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) localMediaPaths(child, output);
  }
  return output;
}

async function mediaOwner(path, env) {
  const cached = globalThis.__canvasMediaOwners?.get(path);
  if (cached) return String(cached);
  const cfg = supabaseConfig(env);
  if (!cfg) return '';
  const url = new URL(`${cfg.url}/rest/v1/media_assets`);
  url.searchParams.set('storage_path', `eq.${path}`);
  url.searchParams.set('select', 'owner_id');
  url.searchParams.set('limit', '1');
  const response = await fetch(url, {
    method: 'GET',
    headers: { apikey: cfg.serviceKey, authorization: `Bearer ${cfg.serviceKey}`, accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`媒体所有权查询失败：${response.status}`);
  const rows = await response.json().catch(() => []);
  const owner = String(Array.isArray(rows) ? rows[0]?.owner_id || '' : '');
  if (owner) {
    const map = globalThis.__canvasMediaOwners || (globalThis.__canvasMediaOwners = new Map());
    map.set(path, owner);
  }
  return owner;
}

async function validateTaskReferences(request, env) {
  if (String(env?.CANVAS_ENFORCE_OWNER || '0') !== '1') return null;
  const owner = await resolveOwner(request, env);
  if (!owner) return null; // The owner gateway will return the canonical auth error.
  const body = await request.clone().json().catch(() => null);
  if (!body || typeof body !== 'object') return null;
  const paths = [...localMediaPaths(body)];
  for (const path of paths) {
    const actualOwner = await mediaOwner(path, env);
    if (!actualOwner || actualOwner !== owner) {
      return json({ error: '参考媒体不存在或不属于当前用户' }, 404);
    }
  }
  return null;
}

export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/tasks' && request.method === 'POST') {
      try {
        const rejected = await validateTaskReferences(request, env);
        if (rejected) return rejected;
      } catch (error) {
        return json({ error: String(error?.message || error) }, 502);
      }
    }
    return providerWorker.fetch(request, env, ctx);
  }
};
