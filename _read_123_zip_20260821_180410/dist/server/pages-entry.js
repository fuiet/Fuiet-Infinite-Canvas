import authWorker from './auth-entry.js';
import finalWorker from './final-entry.js';

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

async function authStatus(request, env, ctx) {
  const url = new URL(request.url);
  url.pathname = '/api/auth/status';
  url.search = '';
  const response = await authWorker.fetch(new Request(url.toString(), {
    method: 'GET',
    headers: request.headers
  }), env, ctx);
  return response.json().catch(() => ({ enabled: false, authenticated: false }));
}

async function ensureBootstrap(request, env, ctx) {
  if (globalThis.__canvasWorkerState?.booted) return;
  const url = new URL(request.url);
  url.pathname = '/api/health';
  url.search = '';
  await finalWorker.fetch(new Request(url.toString(), { method: 'GET', headers: request.headers }), env, ctx);
}

async function blenderToken(request, env, ctx) {
  const auth = await authStatus(request, env, ctx);
  if (!auth.enabled) return json({ error: '为防止 Blender Bridge Token 泄露，请先配置 CANVAS_ADMIN_PASSWORD' }, 503);
  if (!auth.authenticated) return json({ error: '需要管理员身份才能获取 Blender Bridge Token' }, 401);
  await ensureBootstrap(request, env, ctx);
  const token = String(globalThis.__canvasWorkerState?.bridgeToken || '');
  if (!token) return json({ error: 'Blender Bridge Token 尚未初始化' }, 503);
  return json({ token, plugin: '/blender_canvas_bridge.py', pollIntervalMs: 1000 });
}

function uploadLimit(env) {
  return Math.max(1024 * 1024, Math.min(100 * 1024 * 1024, Number(env?.CANVAS_MAX_UPLOAD_BYTES || 50 * 1024 * 1024)));
}

async function boundedUploadRequest(request, env) {
  const maxBytes = uploadLimit(env);
  const declared = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { response: json({ error: `上传文件过大，最大允许 ${Math.round(maxBytes / 1024 / 1024)}MB` }, 413) };
  }
  if (!request.body) return { request };

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel('upload too large'); } catch {}
        return { response: json({ error: `上传文件过大，最大允许 ${Math.round(maxBytes / 1024 / 1024)}MB` }, 413) };
      }
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }

  const headers = new Headers(request.headers);
  headers.set('content-length', String(total));
  const blob = new Blob(chunks, { type: String(headers.get('content-type') || 'application/octet-stream') });
  return {
    request: new Request(request.url, {
      method: request.method,
      headers,
      body: blob,
      redirect: request.redirect
    })
  };
}

export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/blender/bridge/token' && request.method === 'GET') {
      return blenderToken(request, env, ctx);
    }
    if (pathname === '/api/upload' && request.method === 'POST') {
      const bounded = await boundedUploadRequest(request, env);
      if (bounded.response) return bounded.response;
      request = bounded.request;
    }
    return authWorker.fetch(request, env, ctx);
  }
};
