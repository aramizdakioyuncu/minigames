import { test, expect } from '@playwright/test';
import http from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createGateway } from '../../scripts/gateway.mjs';
import { createApp } from '../../minigames_backend/src/app.js';
import { loadConfig } from '../../minigames_backend/src/config.js';

test.use({ baseURL: 'http://127.0.0.1:18083' });
let upstream, auth, backend, game, gateway;
const sessions = new Map(), refreshTokens = new Map();
let serial = 0, resendCount = 0;
function user(email) { return { id: email.split('@')[0], email, full_name: email.startsWith('bob') ? 'Bob Test' : 'Alice Test', role: 'user', phone: null }; }
function issue(email) {
  const access_token = `access.${++serial}`, refresh_token = `rt_${serial}`;
  const data = { access_token, refresh_token, expires_in: 3600, user: user(email) };
  sessions.set(access_token, data); refreshTokens.set(refresh_token, data);
  return data;
}
test.beforeAll(async () => {
  upstream = http.createServer(async (req, res) => {
    let raw = ''; for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : {}, token = req.headers.authorization?.slice(7);
    const current = sessions.get(token);
    const send = (status, data) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };
    const fail = code => send(401, { error: { code, message: 'Test upstream error' } });
    if (req.url.endsWith('/login')) return body.password === 'TestPassword123!' ? send(200, issue(body.email)) : fail('invalid_credentials');
    if (req.url.endsWith('/register')) {
      const needsVerification = body.email.startsWith('verify');
      return send(201, { user: user(body.email), session: needsVerification ? null : issue(body.email), email_verification_required: needsVerification });
    }
    if (req.url.endsWith('/user')) return current ? send(200, { user: current.user }) : fail('invalid_token');
    if (req.url.endsWith('/refresh')) {
      const old = refreshTokens.get(body.refresh_token);
      if (!old) return fail('invalid_refresh_token');
      sessions.delete(old.access_token); refreshTokens.delete(body.refresh_token);
      return send(200, issue(old.user.email));
    }
    if (req.url.endsWith('/logout')) {
      if (!current) return fail('invalid_token');
      sessions.delete(token); refreshTokens.delete(current.refresh_token); return send(200, { ok: true });
    }
    if (req.url.endsWith('/resend-verification')) { resendCount++; return send(200, { ok: true }); }
    if (req.url.endsWith('/verify-email')) return send(200, { verified: true, email: 'verify@example.com' });
    send(404, { error: { code: 'not_found' } });
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const config = { ...loadConfig({ PHATSA_URL: `http://127.0.0.1:${upstream.address().port}`, PHATSA_API_KEY: 'sk_test_browser' }), trustProxy: 1, rateLimit: 1000 };
  auth = http.createServer(createApp(config, { logger: { error() {} } }));
  auth.listen(14013, '127.0.0.1'); await once(auth, 'listening');
  process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:14013';
  process.env.HOST = '127.0.0.1'; process.env.PORT = '15053';
  game = await import('../../socket/server.js?browser-auth');
  if (!game.wss.address()) await once(game.wss, 'listening');
  process.env.PORT = '14003'; backend = await import('../../backend/server.js?browser-auth');
  if (!backend.server.listening) await once(backend.server, 'listening');
  gateway = createGateway(fileURLToPath(new URL('../../web', import.meta.url)), 14003, 15053, 14013);
  gateway.listen(18083, '127.0.0.1'); await once(gateway, 'listening');
});
test.afterAll(async () => {
  game?.shutdown();
  for (const server of [gateway, backend?.server, auth, upstream]) if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
});
async function login(page, email = 'alice@example.com', password = 'TestPassword123!') {
  await page.locator('[data-auth-mode="login"]').click();
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill(password);
  await page.locator('#btn-auth-submit').click();
}
async function logout(page) {
  await page.locator('#btn-open-profile-modal').click();
  await page.locator('#btn-profile-logout').click();
  await expect(page.locator('#view-profile')).toHaveClass(/active/);
  await expect(page.locator('[data-auth-mode="login"]')).toBeEnabled();
}
test('account UI: invalid login, verified game join, reload, token renewal and logout', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await login(page, 'alice@example.com', 'WrongPassword');
  await expect(page.locator('#auth-message')).toContainText('hatalı');
  await expect(page.locator('#auth-password')).toHaveValue('');
  await login(page);
  await expect(page.locator('#view-lobby')).toHaveClass(/active/);
  expect(await page.evaluate(() => window.gameApp.profile.isGuest)).toBe(false);
  await page.locator('.mode-card.card-puck').click();
  await page.locator('.room-card .btn-join').first().click();
  await page.waitForFunction(() => window.gameApp.currentRoom?.authenticated === true);
  const ids = await page.evaluate(() => ({ player: window.gameApp.socket.myPlayerId, room: window.gameApp.currentRoom.roomId }));
  expect(game.rooms.get(ids.room).players.get(ids.player).accountId).toBe('alice');
  await page.evaluate(async () => {
    const { authClient } = await import('/js/auth/authClient.js');
    await authClient.refresh();
  });
  await expect.poll(() => game.rooms.get(ids.room).players.get(ids.player)?.accountId).toBe('alice');
  expect(await page.evaluate(() => window.gameApp.currentRoom?.authenticated)).toBe(true);
  await page.reload();
  await expect(page.locator('#auth-account')).toBeVisible();
  await expect(page.locator('#auth-account-name')).toContainText('Alice Test');
  await page.locator('#btn-enter-lobby').click();
  const rotated = await page.evaluate(async () => {
    const { authClient } = await import('/js/auth/authClient.js');
    const before = authClient.session.refresh_token;
    await authClient.refresh();
    return before !== authClient.session.refresh_token;
  });
  expect(rotated).toBe(true);
  await logout(page);
  expect(await page.evaluate(() => sessionStorage.getItem('minigames_phatsa_session_v1'))).toBeNull();
  expect(await page.evaluate(() => Object.values(localStorage).some(v => v.includes('access_token') || v.includes('refresh_token')))).toBe(false);
  expect(errors).toEqual([]);
});
test('account UI: verification-required registration waits, resends and handles verification link', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-auth-mode="register"]').click();
  await page.locator('#auth-full-name').fill('Verification Test');
  await page.locator('#auth-email').fill('verify@example.com');
  await page.locator('#auth-password').fill('TestPassword123!');
  await page.locator('#btn-auth-submit').click();
  await expect(page.locator('#auth-message')).toContainText('Hesabın oluşturuldu');
  await expect(page.locator('#view-profile')).toHaveClass(/active/);
  expect(await page.evaluate(() => window.gameApp.profile.isGuest)).toBe(true);
  const before = resendCount;
  await page.locator('#btn-auth-resend').click();
  await expect(page.locator('#auth-message')).toContainText('gönderildi');
  expect(resendCount).toBe(before + 1);
  await page.goto('/verify-email?token=test_verification_token');
  await expect(page.locator('#auth-message')).toContainText('doğrulandı');
  expect(page.url()).not.toContain('token=');
});
test('account UI: immediate registration enters lobby and never stores the password', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-auth-mode="register"]').click();
  await page.locator('#auth-full-name').fill('New Account');
  await page.locator('#auth-email').fill('new@example.com');
  await page.locator('#auth-password').fill('TestPassword123!');
  await page.locator('#btn-auth-submit').click();
  await expect(page.locator('#view-lobby')).toHaveClass(/active/);
  expect(await page.evaluate(() => window.gameApp.profile.id)).toBe('new');
  expect(await page.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)].some(v => v.includes('TestPassword123!')))).toBe(false);
  await logout(page);
});
test('account UI: guest and two accounts retain separate local progress', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => { const { profileManager } = await import('/js/auth/profileManager.js'); profileManager.addXP(11); });
  await login(page);
  await expect(page.locator('#view-lobby')).toHaveClass(/active/);
  expect(await page.evaluate(() => window.gameApp.profile.totalXp)).toBe(0);
  await page.evaluate(async () => { const { profileManager } = await import('/js/auth/profileManager.js'); profileManager.addXP(33); });
  await logout(page);
  expect(await page.evaluate(() => window.gameApp.profile.totalXp)).toBe(11);
  await login(page, 'bob@example.com');
  await expect(page.locator('#view-lobby')).toHaveClass(/active/);
  expect(await page.evaluate(() => window.gameApp.profile.totalXp)).toBe(0);
  await logout(page);
  await login(page);
  await expect(page.locator('#view-lobby')).toHaveClass(/active/);
  expect(await page.evaluate(() => window.gameApp.profile.totalXp)).toBe(33);
  await logout(page);
});
test('account UI: forged stored session is rejected and mobile login stays accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => sessionStorage.setItem('minigames_phatsa_session_v1', JSON.stringify({ access_token: 'forged', refresh_token: 'forged', expires_at: Date.now() + 3600000, user: { id: 'admin', full_name: 'Admin', email: 'admin@example.com' } })));
  await page.goto('/');
  await expect(page.locator('[data-auth-mode="login"]')).toBeEnabled();
  expect(await page.evaluate(() => sessionStorage.getItem('minigames_phatsa_session_v1'))).toBeNull();
  expect(await page.evaluate(() => window.gameApp.profile.isGuest)).toBe(true);
  await login(page);
  await expect(page.locator('#view-lobby')).toHaveClass(/active/);
  await logout(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
