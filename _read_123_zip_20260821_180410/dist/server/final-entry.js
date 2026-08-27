import productionWorker from './reference-guard-entry.js';
import secureWorker from './secure-entry.js';
import { configuredOwner, resolveCanvasOwner } from './owner-resolver.js';

async function ownerAwareEnv(request, env, ctx) {
  if (String(env?.CANVAS_ENFORCE_OWNER || '0') !== '1') return env;
  if (configuredOwner(env)) return env;
  const resolved = await resolveCanvasOwner(request, env, ctx);
  if (!resolved.owner) return env;
  return { ...env, CANVAS_OWNER_ID: resolved.owner };
}

export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    // Blender push/poll authenticate with the dedicated bridge token rather than
    // a browser session or Supabase user token. Keep that narrow channel intact.
    if (pathname === '/api/blender/bridge/push' || pathname === '/api/blender/bridge/poll') {
      return secureWorker.fetch(request, env, ctx);
    }
    return productionWorker.fetch(request, await ownerAwareEnv(request, env, ctx), ctx);
  }
};
