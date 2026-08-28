import secureWorker from './secure-entry.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clone(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function json(body, status = 200, sourceHeaders = null) {
  const headers = sourceHeaders ? new Headers(sourceHeaders) : new Headers();
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(JSON.stringify(body), { status, headers });
}

function ownerEnforced(env) {
  return String(env?.CANVAS_ENFORCE_OWNER || '0') === '1';
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

async function supabaseTable(env, table, { method = 'GET', filters = {}, select = '', body, prefer = '', onConflict = '' } = {}) {
  const cfg = supabaseConfig(env);
  if (!cfg) return null;
  const url = new URL(`${cfg.url}/rest/v1/${table}`);
  if (select) url.searchParams.set('select', select);
  if (onConflict) url.searchParams.set('on_conflict', onConflict);
  for (const [key, value] of Object.entries(filters || {})) url.searchParams.set(key, value);
  const headers = new Headers({
    apikey: cfg.serviceKey,
    authorization: `Bearer ${cfg.serviceKey}`
  });
  if (body !== undefined) headers.set('content-type', 'application/json');
  if (prefer) headers.set('prefer', prefer);
  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const raw = await res.text();
  let parsed = null;
  try { parsed = raw ? JSON.parse(raw) : null; } catch {}
  if (!res.ok) throw new Error(`Supabase ${table} ${res.status}：${parsed?.message || parsed?.error || raw || res.statusText}`);
  return parsed;
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

async function adminAuthenticated(request, env, ctx) {
  const url = new URL(request.url);
  url.pathname = '/api/auth/status';
  url.search = '';
  const res = await secureWorker.fetch(new Request(url.toString(), {
    method: 'GET',
    headers: request.headers
  }), env, ctx);
  const status = await res.json().catch(() => ({}));
  return { enabled: Boolean(status.enabled), authenticated: Boolean(status.authenticated) };
}

async function resolveOwner(request, env, ctx) {
  const bearer = await ownerFromBearer(request, env);
  if (bearer) return bearer;
  const owner = configuredOwner(env);
  if (!owner) return '';
  if (String(env?.CANVAS_ALLOW_UNAUTHENTICATED_OWNER || '0') === '1') return owner;
  const auth = await adminAuthenticated(request, env, ctx);
  return auth.enabled && auth.authenticated ? owner : '';
}

function ownerOfProvider(provider) {
  return String(provider?.ownerId || provider?.data?.ownerId || '').trim();
}
function ownerOfTask(task) {
  return String(task?.ownerId || task?.payload?.ownerId || '').trim();
}
function ownerOfProject(project) {
  return String(project?.ownerId || '').trim();
}
function sameOwner(actual, owner) {
  return Boolean(owner && actual && actual === owner);
}
function canClaimUnowned(env) {
  return String(env?.CANVAS_CLAIM_UNOWNED || '0') === '1';
}

async function requireOwner(request, env, ctx) {
  if (!ownerEnforced(env)) return { owner: '', enforced: false };
  const owner = await resolveOwner(request, env, ctx);
  if (owner) return { owner, enforced: true };
  if (!configuredOwner(env) && !request.headers.get('authorization')) {
    return { error: json({ error: '已开启 owner 隔离，但未配置 CANVAS_OWNER_ID，也没有有效 Supabase Bearer 用户' }, 503) };
  }
  return { error: json({ error: '需要有效用户身份才能访问此资源' }, 401) };
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

async function responseJson(response) {
  return response.clone().json().catch(() => null);
}

function stripTaskOwner(task) {
  const out = clone(task);
  delete out?.ownerId;
  if (out?.payload && typeof out.payload === 'object') delete out.payload.ownerId;
  return out;
}

function stripProjectOwner(project) {
  const out = clone(project);
  delete out?.ownerId;
  return out;
}

async function claimProvider(provider, owner, env) {
  provider.ownerId = owner;
  await supabaseTable(env, 'providers', {
    method: 'PATCH',
    filters: { id: `eq.${provider.id}` },
    body: { owner_id: owner, data: clone(provider) },
    prefer: 'return=minimal'
  }).catch(() => null);
}

async function claimTask(task, owner, env) {
  task.ownerId = owner;
  task.payload = { ...(task.payload || {}), ownerId: owner };
  await supabaseTable(env, 'tasks', {
    method: 'PATCH',
    filters: { id: `eq.${task.id}` },
    body: { owner_id: owner, payload: clone(task.payload) },
    prefer: 'return=minimal'
  }).catch(() => null);
}

async function claimProject(project, owner, env) {
  project.ownerId = owner;
  await persistProject(project, env);
}

async function ensureProviderOwned(id, owner, env) {
  const state = globalThis.__canvasWorkerState;
  const provider = (state?.providers || []).find(item => item.id === id);
  if (!provider) return { error: json({ error: 'API 供应商不存在' }, 404) };
  if (sameOwner(ownerOfProvider(provider), owner)) return { provider };
  if (!ownerOfProvider(provider) && canClaimUnowned(env)) {
    await claimProvider(provider, owner, env);
    return { provider };
  }
  return { error: json({ error: 'API 供应商不存在' }, 404) };
}

async function ensureTaskOwned(id, owner, env) {
  const state = globalThis.__canvasWorkerState;
  const task = (state?.tasks || []).find(item => item.id === id);
  if (!task) return { error: json({ error: '任务不存在' }, 404) };
  if (sameOwner(ownerOfTask(task), owner)) return { task };
  if (!ownerOfTask(task) && canClaimUnowned(env)) {
    await claimTask(task, owner, env);
    return { task };
  }
  return { error: json({ error: '任务不存在' }, 404) };
}

async function ensureProjectOwned(id, owner, env) {
  const state = globalThis.__canvasWorkerState;
  const project = (state?.projects || []).find(item => item.id === id);
  if (!project) return { error: json({ error: '项目不存在' }, 404) };
  if (sameOwner(ownerOfProject(project), owner)) return { project };
  if (!ownerOfProject(project) && canClaimUnowned(env)) {
    await claimProject(project, owner, env);
    return { project };
  }
  return { error: json({ error: '项目不存在' }, 404) };
}

function serializeProject(project) {
  return {
    id: String(project.id),
    name: String(project.name || '未命名画布'),
    owner_id: project.ownerId,
    data: clone(project)
  };
}

async function persistProject(project, env) {
  const state = globalThis.__canvasWorkerState;
  const index = (state.projects || []).findIndex(item => item.id === project.id);
  if (index >= 0) state.projects[index] = project;
  else state.projects.unshift(project);
  await supabaseTable(env, 'projects', {
    method: 'POST',
    onConflict: 'id',
    body: [serializeProject(project)],
    prefer: 'resolution=merge-duplicates,return=minimal'
  });
  return project;
}

async function deleteProject(project, env) {
  const state = globalThis.__canvasWorkerState;
  state.projects = (state.projects || []).filter(item => item.id !== project.id);
  await supabaseTable(env, 'projects', {
    method: 'DELETE',
    filters: { id: `eq.${project.id}` },
    prefer: 'return=minimal'
  });
}

function projectSummary(project) {
  return {
    id: project.id,
    name: project.name,
    version: Array.isArray(project.versions) ? project.versions.length + 1 : 1,
    updatedAt: project.updatedAt,
    createdAt: project.createdAt
  };
}

async function handleProjects(request, env, owner, pathname) {
  const state = globalThis.__canvasWorkerState;
  if (pathname === '/api/projects' && request.method === 'GET') {
    return json({ projects: (state.projects || []).filter(item => sameOwner(ownerOfProject(item), owner)).map(projectSummary) });
  }
  if (pathname === '/api/projects' && request.method === 'POST') {
    const body = await request.json();
    const now = new Date().toISOString();
    const requestedId = String(body.id || '').trim();
    let project = requestedId ? (state.projects || []).find(item => item.id === requestedId) : null;
    if (project && !sameOwner(ownerOfProject(project), owner)) return json({ error: '项目不存在' }, 404);
    if (!project) {
      project = {
        id: requestedId || `proj_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
        name: String(body.name || '未命名画布'),
        data: clone(body.data || {}),
        ownerId: owner,
        createdAt: now,
        updatedAt: now,
        versions: []
      };
    } else {
      if (body.forceSnapshot) {
        const snapshot = {
          version: Number(project.versions?.at(-1)?.version || 0) + 1,
          createdAt: now,
          name: project.name,
          data: clone(project.data)
        };
        project.versions = [...(project.versions || []), snapshot].slice(-50);
      }
      if (body.name !== undefined) project.name = String(body.name || project.name);
      if (body.data !== undefined) project.data = clone(body.data);
      project.updatedAt = now;
      project.ownerId = owner;
    }
    await persistProject(project, env);
    return json({ project: stripProjectOwner(project) }, requestedId ? 200 : 201);
  }

  const versions = pathname.match(/^\/api\/projects\/([^/]+)\/versions$/);
  if (versions && request.method === 'GET') {
    const access = await ensureProjectOwned(decodeURIComponent(versions[1]), owner, env);
    if (access.error) return access.error;
    return json({ versions: (access.project.versions || []).map(item => ({ version: item.version, createdAt: item.createdAt, name: item.name })) });
  }

  const restore = pathname.match(/^\/api\/projects\/([^/]+)\/restore\/(\d+)$/);
  if (restore && request.method === 'POST') {
    const access = await ensureProjectOwned(decodeURIComponent(restore[1]), owner, env);
    if (access.error) return access.error;
    const version = (access.project.versions || []).find(item => Number(item.version) === Number(restore[2]));
    if (!version) return json({ error: '项目版本不存在' }, 404);
    access.project.data = clone(version.data);
    access.project.updatedAt = new Date().toISOString();
    await persistProject(access.project, env);
    return json({ project: stripProjectOwner(access.project) });
  }

  const match = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (!match) return null;
  const access = await ensureProjectOwned(decodeURIComponent(match[1]), owner, env);
  if (access.error) return access.error;
  if (request.method === 'GET') return json({ project: stripProjectOwner(access.project) });
  if (request.method === 'PUT') {
    const body = await request.json();
    const now = new Date().toISOString();
    if (body.forceSnapshot) {
      const snapshot = {
        version: Number(access.project.versions?.at(-1)?.version || 0) + 1,
        createdAt: now,
        name: access.project.name,
        data: clone(access.project.data)
      };
      access.project.versions = [...(access.project.versions || []), snapshot].slice(-50);
    }
    if (body.name !== undefined) access.project.name = String(body.name || access.project.name);
    if (body.data !== undefined) access.project.data = clone(body.data);
    access.project.updatedAt = now;
    await persistProject(access.project, env);
    return json({ project: stripProjectOwner(access.project) });
  }
  if (request.method === 'DELETE') {
    await deleteProject(access.project, env);
    return json({ ok: true });
  }
  return null;
}

async function rememberMediaOwner(path, owner, env) {
  if (!path || !owner) return;
  const map = globalThis.__canvasMediaOwners || (globalThis.__canvasMediaOwners = new Map());
  map.set(path, owner);
  await supabaseTable(env, 'media_assets', {
    method: 'PATCH',
    filters: { storage_path: `eq.${path}` },
    body: { owner_id: owner },
    prefer: 'return=minimal'
  }).catch(() => null);
}

async function mediaOwner(path, env) {
  const cached = globalThis.__canvasMediaOwners?.get(path);
  if (cached) return cached;
  const rows = await supabaseTable(env, 'media_assets', {
    method: 'GET',
    filters: { storage_path: `eq.${path}` },
    select: 'owner_id'
  });
  const owner = String(Array.isArray(rows) ? rows[0]?.owner_id || '' : '').trim();
  if (owner) {
    const map = globalThis.__canvasMediaOwners || (globalThis.__canvasMediaOwners = new Map());
    map.set(path, owner);
  }
  return owner;
}

async function rememberTaskMedia(task, owner, env) {
  const value = String(task?.output?.value || task?.output?.url || '');
  const match = value.match(/^\/media\/(.+)$/);
  if (match) await rememberMediaOwner(decodeURIComponent(match[1]), owner, env);
}

async function filterTaskResponse(response, owner, env) {
  const data = await responseJson(response);
  if (!data || typeof data !== 'object') return response;
  if (data.task) {
    if (!sameOwner(ownerOfTask(data.task), owner)) return json({ error: '任务不存在' }, 404, response.headers);
    await rememberTaskMedia(data.task, owner, env);
    data.task = stripTaskOwner(data.task);
  }
  if (Array.isArray(data.tasks)) {
    const allowed = [];
    for (const task of data.tasks) {
      if (!sameOwner(ownerOfTask(task), owner)) continue;
      await rememberTaskMedia(task, owner, env);
      allowed.push(stripTaskOwner(task));
    }
    data.tasks = allowed;
  }
  return json(data, response.status, response.headers);
}

async function handleProvidersAndTasks(request, env, ctx, owner, pathname) {
  const state = globalThis.__canvasWorkerState;

  if (pathname === '/api/providers' && request.method === 'GET') {
    const response = await secureWorker.fetch(request, env, ctx);
    const data = await responseJson(response);
    if (!data?.providers) return response;
    const allowed = new Set((state.providers || []).filter(item => sameOwner(ownerOfProvider(item), owner)).map(item => item.id));
    data.providers = data.providers.filter(item => allowed.has(item.id)).map(item => { const out = clone(item); delete out.ownerId; return out; });
    return json(data, response.status, response.headers);
  }

  if (pathname === '/api/providers' && request.method === 'POST') {
    const body = await request.json();
    if (body.id) {
      const access = await ensureProviderOwned(String(body.id), owner, env);
      if (access.error) return access.error;
    }
    body.ownerId = owner;
    return secureWorker.fetch(rewriteJsonRequest(request, body), env, ctx);
  }

  if (['/api/providers/test-config', '/api/providers/test-auth', '/api/providers/diagnose', '/api/providers/discover-models'].includes(pathname) && request.method === 'POST') {
    const body = await request.json();
    if (body.id) {
      const access = await ensureProviderOwned(String(body.id), owner, env);
      if (access.error) return access.error;
    }
    return secureWorker.fetch(rewriteJsonRequest(request, body), env, ctx);
  }

  const providerMatch = pathname.match(/^\/api\/providers\/([^/]+)$/);
  if (providerMatch && request.method === 'DELETE') {
    const access = await ensureProviderOwned(decodeURIComponent(providerMatch[1]), owner, env);
    if (access.error) return access.error;
    return secureWorker.fetch(request, env, ctx);
  }

  if (pathname === '/api/tasks' && request.method === 'POST') {
    const body = await request.json();
    const access = await ensureProviderOwned(String(body.providerId || ''), owner, env);
    if (access.error) return access.error;
    if (body.projectId) {
      const project = await ensureProjectOwned(String(body.projectId), owner, env);
      if (project.error) return project.error;
    }
    body.ownerId = owner;
    const response = await secureWorker.fetch(rewriteJsonRequest(request, body), env, ctx);
    return filterTaskResponse(response, owner, env);
  }

  if (pathname === '/api/tasks' && request.method === 'GET') {
    return filterTaskResponse(await secureWorker.fetch(request, env, ctx), owner, env);
  }

  if (pathname === '/api/tasks/poll' && request.method === 'POST') {
    const body = await request.json();
    const access = await ensureTaskOwned(String(body.taskId || ''), owner, env);
    if (access.error) return access.error;
    return filterTaskResponse(await secureWorker.fetch(rewriteJsonRequest(request, body), env, ctx), owner, env);
  }

  const retry = pathname.match(/^\/api\/tasks\/([^/]+)\/retry$/);
  if (retry && request.method === 'POST') {
    const access = await ensureTaskOwned(decodeURIComponent(retry[1]), owner, env);
    if (access.error) return access.error;
    return filterTaskResponse(await secureWorker.fetch(request, env, ctx), owner, env);
  }

  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch) {
    const access = await ensureTaskOwned(decodeURIComponent(taskMatch[1]), owner, env);
    if (access.error) return access.error;
    return filterTaskResponse(await secureWorker.fetch(request, env, ctx), owner, env);
  }

  if (pathname === '/api/queue' && request.method === 'GET') {
    const owned = (state.tasks || []).filter(item => sameOwner(ownerOfTask(item), owner));
    return json({
      paused: false,
      concurrency: Math.max(1, Math.min(8, Number(env?.CANVAS_TASK_CONCURRENCY || 2))),
      running: owned.filter(item => ['running', 'polling'].includes(item.status)).length,
      queued: owned.filter(item => item.status === 'queued').length
    });
  }

  return null;
}

async function secureMedia(request, env, ctx, owner, pathname) {
  if (pathname === '/api/upload' && request.method === 'POST') {
    const response = await secureWorker.fetch(request, env, ctx);
    if (response.ok) {
      const data = await responseJson(response);
      const path = String(data?.name || '').trim() || String(data?.url || '').replace(/^\/media\//, '');
      if (path) await rememberMediaOwner(path, owner, env);
    }
    return response;
  }

  if (pathname.startsWith('/media/') && request.method === 'GET') {
    const path = decodeURIComponent(pathname.slice('/media/'.length));
    const actualOwner = await mediaOwner(path, env);
    if (!sameOwner(actualOwner, owner)) return json({ error: 'media not found' }, 404);
    const response = await secureWorker.fetch(request, env, ctx);
    const headers = new Headers(response.headers);
    headers.set('cache-control', 'private, no-store');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
  return null;
}

function hasUnsafePlaintextProviderSecret() {
  return (globalThis.__canvasWorkerState?.providers || []).some(provider => Boolean(String(provider?.apiKey || '').trim()) && !provider?.apiKeyEncrypted);
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (!ownerEnforced(env)) return secureWorker.fetch(request, env, ctx);

  if (hasUnsafePlaintextProviderSecret() && !String(env?.PROVIDER_SECRET_KEY || env?.CANVAS_SECRET_KEY || env?.API_KEY_ENCRYPTION_KEY || '').trim()) {
    if (!pathname.startsWith('/api/auth/') && pathname !== '/api/health') {
      return json({ error: '检测到旧的明文供应商 API Key，但服务器未配置 PROVIDER_SECRET_KEY。为避免继续使用明文密钥，生产网关已拒绝该请求。' }, 503);
    }
  }

  const ownerResult = await requireOwner(request, env, ctx);
  if (ownerResult.error) {
    if (pathname.startsWith('/api/auth/') || pathname === '/api/health') return secureWorker.fetch(request, env, ctx);
    return ownerResult.error;
  }
  const owner = ownerResult.owner;

  const projectResponse = await handleProjects(request, env, owner, pathname);
  if (projectResponse) return projectResponse;

  const dataResponse = await handleProvidersAndTasks(request, env, ctx, owner, pathname);
  if (dataResponse) return dataResponse;

  const mediaResponse = await secureMedia(request, env, ctx, owner, pathname);
  if (mediaResponse) return mediaResponse;

  return secureWorker.fetch(request, env, ctx);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env, ctx);
    } catch (error) {
      return json({ error: String(error?.message || error) }, 500);
    }
  }
};
