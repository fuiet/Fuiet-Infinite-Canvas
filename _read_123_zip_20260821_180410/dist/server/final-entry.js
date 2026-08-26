import productionWorker from './reference-guard-entry.js';
import secureWorker from './secure-entry.js';

export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    // Blender push/poll authenticate with the dedicated bridge token rather than
    // a browser session or Supabase user token. Keep that narrow channel intact.
    if (pathname === '/api/blender/bridge/push' || pathname === '/api/blender/bridge/poll') {
      return secureWorker.fetch(request, env, ctx);
    }
    return productionWorker.fetch(request, env, ctx);
  }
};
