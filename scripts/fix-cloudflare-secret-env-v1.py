from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')
AUTH = ROOT / 'dist/server/auth-entry.js'
TEST = ROOT / 'tests/cloudflare-secret-env-preservation.test.mjs'

text = AUTH.read_text(encoding='utf-8')

old = '''function desktopEnv(env) {
  return {
    ...env,
    // Desktop/single-user builds must work out of the box without asking users
    // to configure server secrets. Keep an explicitly configured secret when
    // present; otherwise use the desktop-only fallback for provider-key encryption.
    PROVIDER_SECRET_KEY: String(env?.PROVIDER_SECRET_KEY || '').trim() || DESKTOP_PROVIDER_SECRET,
    CANVAS_ADMIN_PASSWORD: '',
    CANVAS_ENFORCE_OWNER: '0',
    CANVAS_OWNER_ID: '',
    CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '0',
    CANVAS_AUTO_SINGLE_SUPABASE_OWNER: '0'
  };
}

function hostedSingleUserEnv(env) {
  return {
    ...env,
    // Hosted single-user mode is intentionally account-free, but unlike the
    // desktop mode it must never synthesize a public fallback encryption key.
    // PROVIDER_SECRET_KEY remains whatever the deployment configured.
    CANVAS_ADMIN_PASSWORD: '',
    CANVAS_ENFORCE_OWNER: '0',
    CANVAS_OWNER_ID: '',
    CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '0',
    CANVAS_AUTO_SINGLE_SUPABASE_OWNER: '0'
  };
}
'''

new = '''function envOverlay(env, overrides) {
  // Cloudflare bindings are runtime-owned properties. Do not copy them with
  // object spread: secret bindings may be non-enumerable in some runtimes and
  // would disappear from the downstream env. Inherit directly from the real
  // binding object and define only the few application-mode overrides locally.
  const source = env && typeof env === 'object' ? env : null;
  const overlay = Object.create(source);
  for (const [key, value] of Object.entries(overrides || {})) {
    Object.defineProperty(overlay, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: false
    });
  }
  return overlay;
}

function desktopEnv(env) {
  return envOverlay(env, {
    // Desktop/single-user builds must work out of the box without asking users
    // to configure server secrets. Keep an explicitly configured secret when
    // present; otherwise use the desktop-only fallback for provider-key encryption.
    PROVIDER_SECRET_KEY: String(env?.PROVIDER_SECRET_KEY || '').trim() || DESKTOP_PROVIDER_SECRET,
    CANVAS_ADMIN_PASSWORD: '',
    CANVAS_ENFORCE_OWNER: '0',
    CANVAS_OWNER_ID: '',
    CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '0',
    CANVAS_AUTO_SINGLE_SUPABASE_OWNER: '0'
  });
}

function hostedSingleUserEnv(env) {
  return envOverlay(env, {
    // Hosted single-user mode is intentionally account-free, but unlike the
    // desktop mode it must never synthesize a public fallback encryption key.
    // All Cloudflare bindings, including PROVIDER_SECRET_KEY, remain inherited
    // directly from the original runtime env object.
    CANVAS_ADMIN_PASSWORD: '',
    CANVAS_ENFORCE_OWNER: '0',
    CANVAS_OWNER_ID: '',
    CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '0',
    CANVAS_AUTO_SINGLE_SUPABASE_OWNER: '0'
  });
}
'''

if old not in text:
    raise SystemExit('auth-entry env copy block not found')
text = text.replace(old, new, 1)

needle = '''  if (hostedSingleUserNoAuth(env)) {
    const singleEnv = hostedSingleUserEnv(env);
    if (pathname === '/api/auth/status' && request.method === 'GET') {
'''
replacement = '''  if (hostedSingleUserNoAuth(env)) {
    // Safe deployment diagnostic: expose presence only, never secret values.
    if (pathname === '/api/runtime/env-status' && request.method === 'GET') {
      const providerSecret = String(env?.PROVIDER_SECRET_KEY || '').trim();
      const canvasSecret = String(env?.CANVAS_SECRET_KEY || '').trim();
      const legacyEncryptionSecret = String(env?.API_KEY_ENCRYPTION_KEY || '').trim();
      const supabaseServiceRole = String(env?.SUPABASE_SERVICE_ROLE_KEY || '').trim();
      return json({
        mode: 'hosted-single-user-no-auth',
        providerSecretConfigured: Boolean(providerSecret),
        supabaseServiceRoleConfigured: Boolean(supabaseServiceRole),
        encryptionSecretConfigured: Boolean(providerSecret || canvasSecret || legacyEncryptionSecret || supabaseServiceRole)
      });
    }
    const singleEnv = hostedSingleUserEnv(env);
    if (pathname === '/api/auth/status' && request.method === 'GET') {
'''
if needle not in text:
    raise SystemExit('hosted route insertion point not found')
text = text.replace(needle, replacement, 1)
AUTH.write_text(text, encoding='utf-8')

TEST.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/pages-entry.js';

const BASE = 'https://canvas.example.test';

function ctx() { return { waitUntil() {} }; }

function cloudflareLikeEnv() {
  const env = {
    CANVAS_SINGLE_USER_NO_AUTH: '1',
    CANVAS_ADMIN_PASSWORD: 'stale-password',
    CANVAS_ENFORCE_OWNER: '1',
    CANVAS_OWNER_ID: '11111111-1111-4111-8111-111111111111',
    CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '0'
  };
  Object.defineProperty(env, 'PROVIDER_SECRET_KEY', {
    value: 'non-enumerable-cloudflare-provider-secret',
    enumerable: false,
    configurable: true
  });
  return env;
}

async function call(env, path, { method = 'GET', body } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set('content-type', 'application/json');
  const response = await worker.fetch(new Request(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  }), env, ctx());
  return { response, data: await response.clone().json().catch(() => null) };
}

test('runtime diagnostic sees a non-enumerable Cloudflare provider secret binding', { concurrency: false }, async () => {
  const result = await call(cloudflareLikeEnv(), '/api/runtime/env-status');
  assert.equal(result.response.status, 200);
  assert.equal(result.data.mode, 'hosted-single-user-no-auth');
  assert.equal(result.data.providerSecretConfigured, true);
  assert.equal(result.data.encryptionSecretConfigured, true);
});

test('hosted single-user env preserves a non-enumerable provider secret through downstream layers', { concurrency: false }, async () => {
  const env = cloudflareLikeEnv();
  await call(env, '/api/health');
  if (globalThis.__canvasWorkerState?.providers) globalThis.__canvasWorkerState.providers = [];
  globalThis.__canvasProviderMigrationPromise = null;

  const saved = await call(env, '/api/providers', {
    method: 'POST',
    body: {
      id: 'cloudflare-secret-env-provider',
      name: 'Cloudflare Secret Env Provider',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'supplier-secret-key',
      models: [{ id: 'image-model', name: 'Image Model', modality: 'image' }]
    }
  });

  assert.equal(saved.response.status, 200, JSON.stringify(saved.data));
  assert.equal(saved.data.provider.id, 'cloudflare-secret-env-provider');
  assert.equal(saved.data.provider.hasApiKey, true);
  const stored = globalThis.__canvasWorkerState.providers.find(item => item.id === 'cloudflare-secret-env-provider');
  assert.ok(stored);
  assert.equal(stored.apiKey, undefined);
  assert.match(String(stored.apiKeyEncrypted || ''), /^v1\./);
});
''', encoding='utf-8')

print('patched auth-entry.js and wrote Cloudflare secret preservation regression test')
