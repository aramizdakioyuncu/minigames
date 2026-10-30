import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from '../socket/node_modules/ws/wrapper.mjs';

const base = new URL(process.argv[2] || 'http://localhost:8080');
const response = await fetch(base);
assert.equal(response.status, 200);
assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
assert.equal((await (await fetch(new URL('/api/health', base))).json()).status, 'online');
assert.equal((await (await fetch(new URL('/api/modes', base))).json()).modes.length, 6);
const authHealth = await fetch(new URL('/api/auth/health', base));
assert.equal(authHealth.status, 200);
const authState = await authHealth.json();
assert.equal(authState.status, 'ok');
assert.equal(typeof authState.authConfigured, 'boolean');
assert.equal((await fetch(new URL('/api/auth/me', base))).status, 401);
for (const path of ['/.env', '/Dockerfile', '/nginx.conf']) {
  assert.ok([403, 404].includes((await fetch(new URL(path, base))).status), path);
}

const wsUrl = new URL('/ws', base); wsUrl.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(wsUrl, { origin: base.origin });
const packets = [];
ws.on('message', raw => packets.push(JSON.parse(raw)));
const wait = async (type, predicate = () => true) => {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const index = packets.findIndex(p => p.type === type && predicate(p));
    if (index >= 0) return packets.splice(index, 1)[0];
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error(`Missing ${type}`);
};
try {
  await once(ws, 'open');
  await wait('init');
  for (const mode of ['puck', 'sumo', 'agar', 'space', 'vampire', 'conquest']) {
    ws.send(JSON.stringify({ type: 'join_room', roomId: `${mode}-1`, name: 'Deployment check' }));
    assert.equal((await wait('joined_room')).mode, mode);
    await wait('game_state', p => p.mode === mode);
    ws.send(JSON.stringify({ type: 'leave_room' }));
    await wait('left_room');
  }
  console.log(`Deployment OK: ${base.origin}; HTTP headers, game/auth APIs, file protection and six modes over proxied WebSocket. Phatsa configured: ${authState.authConfigured}.`);
} finally { ws.terminate(); }
