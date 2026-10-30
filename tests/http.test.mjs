import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createGateway } from '../scripts/gateway.mjs';

let backend, gateway, base;
before(async () => {
  process.env.HOST = '127.0.0.1'; process.env.PORT = '0';
  backend = await import('../backend/server.js');
  if (!backend.server.listening) await once(backend.server, 'listening');
  gateway = createGateway(fileURLToPath(new URL('../web', import.meta.url)), backend.server.address().port, 1);
  gateway.listen(0, '127.0.0.1'); await once(gateway, 'listening');
  base = `http://127.0.0.1:${gateway.address().port}`;
});
after(() => { gateway.close(); backend.server.close(); });
test('HTTP serves the app and six-mode API with security headers', async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(await response.text(), /game-canvas/);
  assert.equal((await (await fetch(base + '/api/modes')).json()).modes.length, 6);
  assert.equal((await (await fetch(base + '/api/health')).json()).status, 'online');
});
test('HTTP cannot publish configuration files, hidden files or path traversal', async () => {
  for (const target of ['/Dockerfile', '/nginx.conf', '/.env', '/js/../../package.json', '/js/..%5c..%5cpackage.json', '/js/%2esecret']) {
    assert.ok([403, 404].includes((await fetch(base + target)).status), target);
  }
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  const head = await fetch(base + '/style.css', { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
});
