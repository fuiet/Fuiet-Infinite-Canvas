import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { singleSupabaseOwner } from '../dist/server/owner-resolver.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const OWNER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const env = {
  SUPABASE_URL: 'https://owner-auto.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
  SUPABASE_ANON_KEY: 'anon-test-key'
};

function clearCache() {
  delete globalThis.__canvasSingleSupabaseOwner;
}

async function withFetch(handler, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  try { return await fn(); }
  finally { globalThis.fetch = original; clearCache(); }
}

test('single Supabase auth user can be used as the admin owner automatically', { concurrency: false }, async () => {
  clearCache();
  await withFetch(async input => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    assert.equal(url.pathname, '/auth/v1/admin/users');
    assert.equal(url.searchParams.get('per_page'), '2');
    return new Response(JSON.stringify({ users: [{ id: OWNER_A }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }, async () => {
    assert.equal(await singleSupabaseOwner(env), OWNER_A);
  });
});

test('multiple Supabase auth users never auto-collapse into one owner', { concurrency: false }, async () => {
  clearCache();
  await withFetch(async () => new Response(JSON.stringify({ users: [{ id: OWNER_A }, { id: OWNER_B }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  }), async () => {
    assert.equal(await singleSupabaseOwner(env), '');
  });
});

test('final production entry injects the resolved owner before all owner-aware gateways', () => {
  const source = readFileSync(join(root, 'dist/server/final-entry.js'), 'utf8');
  assert.match(source, /resolveCanvasOwner/);
  assert.match(source, /ownerAwareEnv/);
  assert.match(source, /CANVAS_OWNER_ID: resolved\.owner/);
  assert.match(source, /productionWorker\.fetch\(request, await ownerAwareEnv/);
});
