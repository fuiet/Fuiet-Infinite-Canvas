import worker from '../../dist/server/pages-entry.js';

const ENCRYPTION_KEYS = [
  'PROVIDER_SECRET_KEY',
  'CANVAS_SECRET_KEY',
  'API_KEY_ENCRYPTION_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

function textBinding(env, name) {
  const value = env?.[name];
  return value == null ? '' : String(value).trim();
}

function explicitRuntimeEnv(env) {
  const source = env && typeof env === 'object' ? env : null;
  const runtimeEnv = Object.create(source);
  for (const name of ENCRYPTION_KEYS) {
    Object.defineProperty(runtimeEnv, name, {
      value: source?.[name],
      enumerable: true,
      configurable: true,
      writable: false
    });
  }
  return runtimeEnv;
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

function envStatus(env) {
  const providerSecret = textBinding(env, 'PROVIDER_SECRET_KEY');
  const canvasSecret = textBinding(env, 'CANVAS_SECRET_KEY');
  const legacySecret = textBinding(env, 'API_KEY_ENCRYPTION_KEY');
  const supabaseServiceRole = textBinding(env, 'SUPABASE_SERVICE_ROLE_KEY');
  return {
    boundary: 'cloudflare-pages-function',
    providerSecretConfigured: Boolean(providerSecret),
    supabaseServiceRoleConfigured: Boolean(supabaseServiceRole),
    encryptionSecretConfigured: Boolean(providerSecret || canvasSecret || legacySecret || supabaseServiceRole)
  };
}

export async function onRequest(context) {
  const pathname = new URL(context.request.url).pathname;
  const status = envStatus(context.env);

  // Read bindings at the very first Cloudflare Pages Function boundary. This proves
  // whether Cloudflare actually injected the secret before any application wrapper runs.
  if (pathname === '/api/runtime/env-status' && context.request.method === 'GET') {
    return json(status);
  }

  // Give a canonical boundary-level error instead of letting a deeper runtime report
  // the ambiguous historical PROVIDER_SECRET_KEY message.
  if (pathname === '/api/providers' && context.request.method === 'POST' && !status.encryptionSecretConfigured) {
    return json({
      error: 'Cloudflare Pages Function 未收到 PROVIDER_SECRET_KEY 或其他可用加密密钥',
      code: 'PROVIDER_ENCRYPTION_SECRET_MISSING_AT_PAGES_BOUNDARY',
      ...status
    }, 503);
  }

  return worker.fetch(context.request, explicitRuntimeEnv(context.env), context);
}
