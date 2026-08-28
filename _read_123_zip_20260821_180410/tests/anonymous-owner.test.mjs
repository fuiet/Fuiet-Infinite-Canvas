import assert from 'node:assert/strict';
import test from 'node:test';

import finalWorker from '../dist/server/final-entry.js';

const OWNER_COOKIE_RE = /^canvas_owner_v1=([0-9a-f-]{36})\.([A-Za-z0-9_-]+);/i;

function env() {
  return {
    CANVAS_ENFORCE_OWNER: '1',
    CANVAS_ANONYMOUS_OWNER: '1',
    CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '0',
    CANVAS_AUTO_SINGLE_SUPABASE_OWNER: '0',
    CANVAS_CLAIM_UNOWNED: '0',
    CANVAS_SESSION_SECRET: 'test-session-secret-that-is-long-enough',
    PROVIDER_SECRET_KEY: 'test-provider-secret-that-is-long-enough'
  };
}

test('anonymous mode creates a signed owner cookie without login', async () => {
  const res = await finalWorker.fetch(new Request('https://canvas.test/api/auth/status'), env(), {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.enabled, false);
  assert.equal(body.authenticated, true);
  assert.equal(body.mode, 'anonymous-owner');
  assert.match(res.headers.get('set-cookie') || '', OWNER_COOKIE_RE);
});

test('same anonymous cookie keeps the same owner while another browser gets a different owner', async () => {
  const first = await finalWorker.fetch(new Request('https://canvas.test/api/auth/status'), env(), {});
  const firstCookie = first.headers.get('set-cookie') || '';
  const firstMatch = firstCookie.match(OWNER_COOKIE_RE);
  assert.ok(firstMatch);

  const again = await finalWorker.fetch(new Request('https://canvas.test/api/auth/status', {
    headers: { cookie: firstCookie.split(';')[0] }
  }), env(), {});
  assert.equal(again.status, 200);
  assert.equal(again.headers.get('set-cookie'), null);

  const secondBrowser = await finalWorker.fetch(new Request('https://canvas.test/api/auth/status'), env(), {});
  const secondMatch = (secondBrowser.headers.get('set-cookie') || '').match(OWNER_COOKIE_RE);
  assert.ok(secondMatch);
  assert.notEqual(secondMatch[1], firstMatch[1]);
});

test('anonymous mode fails closed when no signing secret exists', async () => {
  const badEnv = env();
  delete badEnv.CANVAS_SESSION_SECRET;
  delete badEnv.PROVIDER_SECRET_KEY;
  const res = await finalWorker.fetch(new Request('https://canvas.test/api/auth/status'), badEnv, {});
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.match(String(body.error || ''), /CANVAS_SESSION_SECRET|PROVIDER_SECRET_KEY/);
});
