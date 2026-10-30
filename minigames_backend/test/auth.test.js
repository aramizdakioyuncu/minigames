import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createGateway } from '../../scripts/gateway.mjs';
import path from 'node:path';

const key = 'sk_test_only_not_a_real_key';
const password = '  LongPassword-123!  ';
function user(id = 'alice') { return { id, email: `${id}@example.com`, full_name: id, role: 'user', phone: null, created_at: '2026-10-30T00:00:00Z' }; }
function session(id = 'alice') { return { access_token: `access.${id}`, refresh_token: `rt_${id}`, expires_in: 3600, user: user(id) }; }
async function listen(t, server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}
async function fixture(t, { responder, config: overrides = {}, configured = true, fetchImpl } = {}) {
  const calls = [], logs = [];
  const upstream = http.createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const call = { path: req.url, method: req.method, headers: req.headers, body: raw ? JSON.parse(raw) : undefined };
    calls.push(call);
    const reply = responder ? await responder(call) : { body: session() };
    if (res.destroyed) return;
    res.writeHead(reply.status || 200, { 'content-type': 'application/json', ...reply.headers });
    res.end(reply.raw ?? JSON.stringify(reply.body));
  });
  const upstreamUrl = await listen(t, upstream);
  const config = { ...loadConfig(configured ? { PHATSA_URL: upstreamUrl, PHATSA_API_KEY: key } : {}), ...overrides };
  const app = createApp(config, { logger: { error: entry => logs.push(entry) }, fetchImpl });
  const url = await listen(t, http.createServer(app));
  async function request(route, body, options = {}) {
    const res = await fetch(`${url}/api/auth${route}`, {
      method: body === undefined ? 'GET' : 'POST', ...options,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...options.headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: res.status, headers: res.headers, body: res.status === 204 ? null : await res.json() };
  }
  return { url, calls, logs, request };
}

test('configuration accepts HTTPS and rejects unsafe origins, keys and proxy values', () => {
  assert.equal(loadConfig({}).configured, false);
  assert.equal(loadConfig({ PHATSA_URL: 'https://project.phatsa.com/', PHATSA_API_KEY: key }).configured, true);
  for (const suffix of ['/api/v1', '/api/v1/']) {
    assert.equal(loadConfig({ PHATSA_URL: `https://project.phatsa.com${suffix}`, PHATSA_API_KEY: key }).phatsaUrl, 'https://project.phatsa.com');
  }
  for (const url of ['http://public.example', 'https://user:secret@example.com', 'https://example.com/api', 'https://example.com/?key=secret']) {
    assert.throws(() => loadConfig({ PHATSA_URL: url }));
  }
  assert.throws(() => loadConfig({ NODE_ENV: 'production', PHATSA_URL: 'http://127.0.0.1' }));
  assert.throws(() => loadConfig({ PHATSA_API_KEY: 'not-a-key' }));
  assert.throws(() => loadConfig({ AUTH_TRUST_PROXY: 'true' }));
  assert.throws(() => loadConfig({ AUTH_ALLOWED_ORIGINS: '*' }));
});

test('unconfigured service stays live but never pretends to authenticate', async t => {
  const f = await fixture(t, { configured: false });
  assert.deepEqual((await f.request('/health')).body, { status: 'ok', authConfigured: false });
  const r = await f.request('/login', { email: 'alice@example.com', password });
  assert.equal(r.status, 503);
  assert.equal(r.body.error.code, 'phatsa_not_configured');
  assert.equal(f.calls.length, 0);
});

test('register uses SDK full_name mapping and preserves email verification without a session', async t => {
  const f = await fixture(t, { responder: () => ({ status: 201, body: { user: { ...user(), password_hash: 'secret' }, session: null, email_verification_required: true } }) });
  const r = await f.request('/register', { email: ' ALICE@EXAMPLE.COM ', password, fullName: ' Alice Test ' });
  assert.equal(r.status, 201);
  assert.deepEqual(r.body.data, { user: user(), session: null, emailVerificationRequired: true });
  assert.equal(f.calls[0].path, '/api/v1/auth/register');
  assert.deepEqual(f.calls[0].body, { email: 'alice@example.com', password, full_name: 'Alice Test' });
  assert.equal(f.calls[0].headers.apikey, key);
  assert.equal(f.calls[0].headers.authorization, undefined);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.headers.get('x-powered-by'), null);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});

test('register returns an actual SDK session when Phatsa allows immediate login', async t => {
  const f = await fixture(t, { responder: () => ({ body: { user: user(), session: session(), email_verification_required: false } }) });
  const r = await f.request('/register', { email: 'alice@example.com', password, fullName: 'Alice Test' });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.session.access_token, 'access.alice');
  assert.equal(r.body.data.emailVerificationRequired, false);
  assert.ok(r.body.data.session.expires_at > Date.now());
});

test('concurrent logins keep users isolated and never log out another request', async t => {
  const f = await fixture(t, { responder: async call => {
    const id = call.body.email.split('@')[0];
    if (id === 'alice') await new Promise(resolve => setTimeout(resolve, 30));
    return { body: { ...session(id), secret: key, user: { ...user(id), password_hash: password } } };
  } });
  const results = await Promise.all(['alice', 'bob', 'carol'].map(id => f.request('/login', { email: `${id}@example.com`, password })));
  for (const [index, id] of ['alice', 'bob', 'carol'].entries()) {
    assert.equal(results[index].status, 200);
    assert.equal(results[index].body.data.user.id, id);
    assert.equal(results[index].body.data.access_token, `access.${id}`);
    assert.ok(results[index].body.data.expires_at > Date.now());
    assert.ok(!JSON.stringify(results[index].body).includes(password));
    assert.ok(!JSON.stringify(results[index].body).includes(key));
  }
  assert.equal(f.calls.length, 3);
  assert.ok(f.calls.every(call => call.path === '/api/v1/auth/login' && !call.headers.authorization));
});

test('username login works and identifiers cannot be combined', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/login', { username: 'alice', password })).status, 200);
  assert.deepEqual(f.calls[0].body, { username: 'alice', password });
  assert.equal((await f.request('/login', { username: 'alice', email: 'alice@example.com', password })).status, 400);
  assert.equal((await f.request('/login', { password })).status, 400);
});

test('invalid inputs and role injection never reach Phatsa or reflect secrets', async t => {
  const f = await fixture(t);
  const cases = [
    { email: 'bad', password, fullName: 'Alice' },
    { email: 'alice@example.com', password: 'short', fullName: 'Alice' },
    { email: 'alice@example.com', password, fullName: 'Alice', role: 'admin' },
    { email: { $ne: null }, password, fullName: 'Alice' },
  ];
  for (const body of cases) {
    const r = await f.request('/register', body);
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'validation_error');
    assert.ok(!JSON.stringify(r.body).includes(password));
  }
  assert.equal(f.calls.length, 0);
});

test('malformed, oversized and unsupported bodies have safe JSON errors', async t => {
  const f = await fixture(t);
  for (const [body, contentType, status] of [['{', 'application/json', 400], [JSON.stringify({ padding: 'x'.repeat(20000) }), 'application/json', 413], ['hello', 'text/plain', 415]]) {
    const res = await fetch(`${f.url}/api/auth/login`, { method: 'POST', headers: { 'content-type': contentType }, body });
    assert.equal(res.status, status);
    assert.ok((await res.json()).error.code);
  }
  assert.equal(f.calls.length, 0);
});

test('documented errors are mapped without relaying upstream messages or keys', async t => {
  for (const [code, upstreamStatus, expected] of [['invalid_credentials', 401, 401], ['email_not_verified', 403, 403], ['email_taken', 409, 409], ['email_not_configured', 503, 503], ['rate_limit_exceeded', 429, 429], ['invalid_api_key', 401, 502], ['database_error', 500, 502]]) {
    const f = await fixture(t, { responder: () => ({ status: upstreamStatus, body: { error: { code, message: `private ${key} ${password}` } } }) });
    const r = await f.request('/login', { email: 'alice@example.com', password });
    assert.equal(r.status, expected, code);
    assert.ok(!JSON.stringify([r.body, f.logs]).includes(key));
    assert.ok(!JSON.stringify([r.body, f.logs]).includes(password));
  }
});

test('missing Phatsa plugins produce actionable 503 errors without leaking provider details', async t => {
  for (const code of ['auth_not_installed', 'identity_not_installed']) {
    const f = await fixture(t, { responder: () => ({ status: 404, body: { error: { code, message: key } } }) });
    const r = await f.request('/login', { email: 'alice@example.com', password });
    assert.equal(r.status, 503);
    assert.equal(r.body.error.code, code);
    assert.match(r.body.error.message, /eklenti/);
    assert.ok(!JSON.stringify([r.body, f.logs]).includes(key));
  }
});

test('middleware checks real upstream user and rejects missing/revoked bearer tokens', async t => {
  const f = await fixture(t, { responder: call => call.headers.authorization === 'Bearer access.alice'
    ? { body: { user: user() } }
    : { status: 401, body: { error: { code: 'invalid_token', message: 'revoked' } } } });
  assert.equal((await f.request('/me')).status, 401);
  assert.equal((await f.request('/me', undefined, { headers: { authorization: 'Bearer revoked' } })).status, 401);
  const r = await f.request('/me', undefined, { headers: { authorization: 'Bearer access.alice' } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.user, user());
  assert.equal(f.calls.length, 2);
  assert.ok(f.calls.every(call => call.path === '/api/v1/auth/user' && call.headers.apikey === key));
});

test('refresh rotates tokens through SDK transport without fabricating user identity', async t => {
  const f = await fixture(t, { responder: () => ({ body: session('renewed') }) });
  const r = await f.request('/refresh', { refreshToken: 'rt_old' });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.refresh_token, 'rt_renewed');
  assert.equal(f.calls[0].path, '/api/v1/auth/refresh');
  assert.deepEqual(f.calls[0].body, { refresh_token: 'rt_old' });
  assert.equal(f.calls[0].headers.authorization, undefined);
});

test('logout validates user then revokes requested session scope', async t => {
  const f = await fixture(t, { responder: call => ({ body: call.path.endsWith('/user') ? { user: user() } : { ok: true } }) });
  const r = await f.request('/logout', { everywhere: true }, { headers: { authorization: 'Bearer access.alice' } });
  assert.equal(r.status, 200);
  assert.equal(f.calls[1].path, '/api/v1/auth/logout');
  assert.deepEqual(f.calls[1].body, { everywhere: true });
  assert.ok(f.calls.every(call => call.headers.authorization === 'Bearer access.alice'));
});

test('email verification and resend use official SDK endpoints', async t => {
  const f = await fixture(t, { responder: call => ({ body: call.path.endsWith('/verify-email') ? { verified: true, email: 'alice@example.com' } : { ok: true } }) });
  assert.equal((await f.request('/verify-email', { token: 'verification_token' })).body.data.verified, true);
  assert.equal((await f.request('/resend-verification', { email: 'alice@example.com' })).body.data.ok, true);
  assert.deepEqual(f.calls.map(call => call.path), ['/api/v1/auth/verify-email', '/api/v1/auth/resend-verification']);
});

test('rate limit spans login/register and cannot be bypassed with forwarded IPs', async t => {
  const f = await fixture(t, { config: { rateLimit: 2, trustProxy: 1 } });
  // Actual gateway overwrites attacker-supplied forwarding headers before trusting one hop.
  const proxy = createGateway(path.resolve('web'), 1, 1, Number(new URL(f.url).port));
  const url = await listen(t, proxy);
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`${url}/api/auth/${i === 2 ? 'register' : 'login'}`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `192.0.2.${i + 1}` },
      body: JSON.stringify({ email: 'alice@example.com', password }),
    });
    assert.equal(res.status, i < 2 ? 200 : 429);
    if (i === 2) assert.ok(res.headers.get('retry-after'));
    await res.arrayBuffer();
  }
  assert.equal(f.calls.length, 2);
});

test('CORS permits same origin and configured origin, denies others before upstream', async t => {
  const f = await fixture(t, { config: { origins: ['https://games.example'] } });
  const ok = await f.request('/login', { email: 'alice@example.com', password }, { headers: { origin: 'https://games.example' } });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://games.example');
  assert.equal((await f.request('/health', undefined, { headers: { origin: f.url } })).status, 200);
  assert.equal((await f.request('/login', { email: 'alice@example.com', password }, { headers: { origin: 'https://evil.example' } })).status, 403);
  const preflight = await f.request('/login', undefined, { method: 'OPTIONS', headers: { origin: 'https://games.example', 'access-control-request-method': 'POST' } });
  assert.equal(preflight.status, 204);
  assert.equal(f.calls.length, 1);
});

test('upstream timeout is bounded and malformed successful responses are rejected', async t => {
  const slow = await fixture(t, { config: { timeoutMs: 100 }, responder: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { body: session() };
  } });
  assert.equal((await slow.request('/login', { email: 'alice@example.com', password })).status, 503);
  for (const reply of [{ raw: '<html>oops</html>' }, { body: {} }, { body: { ...session(), user: null } }]) {
    const f = await fixture(t, { responder: () => reply });
    const r = await f.request('/login', { email: 'alice@example.com', password });
    assert.equal(r.status, 502);
    assert.equal(r.body.error.code, 'invalid_phatsa_response');
  }
});

test('upstream redirects are never followed with the API key', async t => {
  let leakedRequests = 0;
  const target = await listen(t, http.createServer((_req, res) => { leakedRequests++; res.end('{}'); }));
  const f = await fixture(t, { responder: () => ({ status: 307, headers: { location: target }, body: {} }) });
  assert.equal((await f.request('/login', { email: 'alice@example.com', password })).status, 503);
  assert.equal(leakedRequests, 0);
});
