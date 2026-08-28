import finalWorker from './final-entry.js';

const COOKIE_NAME = 'canvas_admin_session_v2';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const DESKTOP_PROVIDER_SECRET = 'canvas-desktop-single-user-provider-key-v1';

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders
    }
  });
}

function desktopSingleUser(env) {
  return String(env?.CANVAS_DESKTOP_SINGLE_USER || '0') === '1';
}

function hostedSingleUserNoAuth(env) {
  return String(env?.CANVAS_SINGLE_USER_NO_AUTH || '0') === '1';
}

function desktopEnv(env) {
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

function parseCookies(request) {
  const out = {};
  const raw = String(request.headers.get('cookie') || '');
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    try { out[key] = decodeURIComponent(part.slice(index + 1).trim()); }
    catch { out[key] = part.slice(index + 1).trim(); }
  }
  return out;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < data.length; i += 0x8000) binary += String.fromCharCode(...data.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const text = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = text.padEnd(Math.ceil(text.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function sessionHmacKey(env) {
  const secret = String(env?.CANVAS_SESSION_SECRET || env?.PROVIDER_SECRET_KEY || '').trim();
  if (!secret) throw new Error('服务器未配置 CANVAS_SESSION_SECRET 或 PROVIDER_SECRET_KEY，无法创建安全会话');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function createSession(env) {
  const ttl = Math.max(60 * 60 * 1000, Math.min(7 * 24 * 60 * 60 * 1000, Number(env?.CANVAS_SESSION_TTL_MS || 24 * 60 * 60 * 1000)));
  const payload = {
    v: 2,
    exp: Date.now() + ttl,
    nonce: crypto.randomUUID()
  };
  const encoded = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await sessionHmacKey(env);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded));
  return `${encoded}.${bytesToBase64Url(signature)}`;
}

async function verifySession(token, env) {
  try {
    const [payloadText, signatureText, extra] = String(token || '').split('.');
    if (!payloadText || !signatureText || extra !== undefined) return false;
    const key = await sessionHmacKey(env);
    const ok = await crypto.subtle.verify('HMAC', key, base64UrlToBytes(signatureText), new TextEncoder().encode(payloadText));
    if (!ok) return false;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadText)));
    return payload?.v === 2 && Number(payload.exp) > Date.now();
  } catch {
    return false;
  }
}

async function constantTimePasswordEqual(left, right) {
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(left || ''))),
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(right || '')))
  ]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = x.length ^ y.length;
  const length = Math.max(x.length, y.length);
  for (let i = 0; i < length; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

function requestIp(request) {
  return String(request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
}

function loginRateLimited(request, env) {
  const limit = Math.max(3, Math.min(50, Number(env?.CANVAS_LOGIN_ATTEMPTS_PER_10M || 10)));
  const now = Date.now(), key = requestIp(request);
  const buckets = globalThis.__canvasStatelessLoginBuckets || (globalThis.__canvasStatelessLoginBuckets = new Map());
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= 10 * 60 * 1000) bucket = { startedAt: now, count: 0 };
  bucket.count += 1;
  buckets.set(key, bucket);
  return bucket.count > limit;
}

function clearLoginRate(request) {
  globalThis.__canvasStatelessLoginBuckets?.delete(requestIp(request));
}

function sessionCookie(token, request, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

function adminAuthEnabled(env) {
  return Boolean(String(env?.CANVAS_ADMIN_PASSWORD || '').trim());
}

function hasBearer(request) {
  return /^Bearer\s+\S+/i.test(String(request.headers.get('authorization') || '').trim());
}

function csrfAllowed(request) {
  if (SAFE_METHODS.has(request.method)) return true;
  const origin = String(request.headers.get('origin') || '').trim();
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin;
  } catch { return false; }
}

function innerEnvForAdmin(env) {
  return {
    ...env,
    CANVAS_ADMIN_PASSWORD: '',
    CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '1'
  };
}

function innerEnvForBearer(env) {
  return {
    ...env,
    CANVAS_ADMIN_PASSWORD: '',
    CANVAS_ALLOW_UNAUTHENTICATED_OWNER: '0'
  };
}

function isBridgeTokenChannel(pathname) {
  return pathname === '/api/blender/bridge/push' || pathname === '/api/blender/bridge/poll';
}

async function handleAuth(request, env, pathname) {
  if (pathname === '/api/auth/status' && request.method === 'GET') {
    const enabled = adminAuthEnabled(env);
    const token = parseCookies(request)[COOKIE_NAME] || '';
    return json({ enabled, authenticated: !enabled || await verifySession(token, env) });
  }

  if (pathname === '/api/auth/login' && request.method === 'POST') {
    if (!adminAuthEnabled(env)) return json({ ok: true, disabled: true });
    if (loginRateLimited(request, env)) return json({ error: '登录尝试过于频繁，请稍后重试' }, 429);
    const body = await request.json().catch(() => ({}));
    if (!(await constantTimePasswordEqual(body.password, env.CANVAS_ADMIN_PASSWORD))) {
      return json({ error: '访问密码错误' }, 401);
    }
    clearLoginRate(request);
    const token = await createSession(env);
    const ttlSeconds = Math.floor(Math.max(60 * 60 * 1000, Math.min(7 * 24 * 60 * 60 * 1000, Number(env?.CANVAS_SESSION_TTL_MS || 24 * 60 * 60 * 1000))) / 1000);
    return json({ ok: true }, 200, { 'set-cookie': sessionCookie(token, request, ttlSeconds) });
  }

  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', request, 0) });
  }

  return null;
}

async function route(request, env, ctx) {
  const url = new URL(request.url), pathname = url.pathname;

  // Hosted single-user mode intentionally has no login, no Supabase user, and no
  // owner isolation. It still keeps the deployment's real PROVIDER_SECRET_KEY so
  // saved supplier API keys remain encrypted at rest.
  if (hostedSingleUserNoAuth(env)) {
    const singleEnv = hostedSingleUserEnv(env);
    if (pathname === '/api/auth/status' && request.method === 'GET') {
      return json({ enabled: false, authenticated: true, mode: 'hosted-single-user-no-auth' });
    }
    if (pathname === '/api/auth/login' && request.method === 'POST') {
      return json({ ok: true, disabled: true, mode: 'hosted-single-user-no-auth' });
    }
    if (pathname === '/api/auth/logout' && request.method === 'POST') {
      return json({ ok: true, disabled: true, mode: 'hosted-single-user-no-auth' });
    }
    return finalWorker.fetch(request, singleEnv, ctx);
  }

  // Desktop/single-user builds are intentionally account-free. This guard runs
  // before all legacy admin-cookie and Supabase-Bearer authentication code so
  // stale cloud secrets cannot accidentally make provider configuration require login.
  if (desktopSingleUser(env)) {
    if (pathname === '/api/auth/status' && request.method === 'GET') {
      return json({ enabled: false, authenticated: true, mode: 'desktop-single-user' });
    }
    if (pathname === '/api/auth/login' && request.method === 'POST') {
      return json({ ok: true, disabled: true, mode: 'desktop-single-user' });
    }
    if (pathname === '/api/auth/logout' && request.method === 'POST') {
      return json({ ok: true, disabled: true, mode: 'desktop-single-user' });
    }
    return finalWorker.fetch(request, desktopEnv(env), ctx);
  }

  const authResponse = await handleAuth(request, env, pathname);
  if (authResponse) return authResponse;

  if (!adminAuthEnabled(env)) return finalWorker.fetch(request, env, ctx);
  if (pathname === '/api/health' || !pathname.startsWith('/api/') && !pathname.startsWith('/media/')) {
    return finalWorker.fetch(request, env, ctx);
  }
  if (isBridgeTokenChannel(pathname)) return finalWorker.fetch(request, env, ctx);

  const cookieToken = parseCookies(request)[COOKIE_NAME] || '';
  const adminAuthenticated = await verifySession(cookieToken, env);
  if (adminAuthenticated) {
    if (!csrfAllowed(request)) return json({ error: '跨站请求已被安全策略阻止' }, 403);
    return finalWorker.fetch(request, innerEnvForAdmin(env), ctx);
  }

  if (hasBearer(request)) return finalWorker.fetch(request, innerEnvForBearer(env), ctx);

  return json({ error: '需要管理员登录或有效用户身份' }, 401);
}

export default {
  async fetch(request, env, ctx) {
    try { return await route(request, env, ctx); }
    catch (error) { return json({ error: String(error?.message || error) }, 500); }
  }
};
