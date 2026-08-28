import productionWorker from './reference-guard-entry.js';
import secureWorker from './secure-entry.js';
import { configuredOwner, resolveCanvasOwner } from './owner-resolver.js';

async function ownerAwareContext(request, env, ctx) {
  if (String(env?.CANVAS_ENFORCE_OWNER || '0') !== '1') return { env, setCookie: '', error: '' };
  if (configuredOwner(env)) return { env, setCookie: '', error: '' };
  const resolved = await resolveCanvasOwner(request, env, ctx);
  if (!resolved.owner) return { env, setCookie: '', error: resolved.error || '' };
  return { env: { ...env, CANVAS_OWNER_ID: resolved.owner }, setCookie: resolved.setCookie || '', error: '' };
}

function withCookie(response, setCookie) {
  if (!setCookie) return response;
  const headers = new Headers(response.headers);
  headers.append('set-cookie', setCookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

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

export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    // Blender push/poll authenticate with the dedicated bridge token rather than
    // a browser session or anonymous owner cookie. Keep that narrow channel intact.
    if (pathname === '/api/blender/bridge/push' || pathname === '/api/blender/bridge/poll') {
      return secureWorker.fetch(request, env, ctx);
    }

    // Anonymous hosted mode intentionally has no login screen. The signed owner
    // cookie provides tenant isolation for providers/projects/tasks/media instead.
    if (pathname === '/api/auth/status' && String(env?.CANVAS_ANONYMOUS_OWNER || '0') === '1') {
      const ownerCtx = await ownerAwareContext(request, env, ctx);
      if (ownerCtx.error) return json({ enabled: false, authenticated: false, error: ownerCtx.error }, 503);
      return withCookie(json({ enabled: false, authenticated: true, mode: 'anonymous-owner' }), ownerCtx.setCookie);
    }

    const ownerCtx = await ownerAwareContext(request, env, ctx);
    if (ownerCtx.error) return json({ error: ownerCtx.error }, 503);
    const response = await productionWorker.fetch(request, ownerCtx.env, ctx);
    return withCookie(response, ownerCtx.setCookie);
  }
};
