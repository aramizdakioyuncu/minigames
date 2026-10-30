import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import WebSocket from '../socket/node_modules/ws/wrapper.mjs';

let game, upstream, url;
before(async () => {
  upstream = http.createServer(async (req, res) => {
    const token = req.headers.authorization?.slice(7);
    if (token === 'slow') await new Promise(r => setTimeout(r, 150));
    const valid = ['valid', 'slow', 'other'].includes(token) || token?.startsWith('exp.');
    res.writeHead(valid ? 200 : 401, { 'content-type': 'application/json' });
    res.end(JSON.stringify(valid ? { data: { user: { id: token === 'other' ? 'account-two' : 'account-one', email: 'private@example.com' } } } : { error: { code: 'invalid_token' } }));
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  process.env.AUTH_SERVICE_URL = `http://127.0.0.1:${upstream.address().port}`;
  process.env.PORT = '0'; process.env.HOST = '127.0.0.1';
  game = await import('../socket/server.js');
  if (!game.wss.address()) await once(game.wss, 'listening');
  url = `ws://127.0.0.1:${game.wss.address().port}`;
});
after(() => { game.shutdown(); upstream.close(); upstream.closeAllConnections(); });
async function client(t) {
  const ws = new WebSocket(url), messages = [];
  ws.on('message', raw => messages.push(JSON.parse(raw)));
  await once(ws, 'open'); t.after(() => ws.terminate());
  const wait = async type => {
    for (let i = 0; i < 300; i++) {
      const index = messages.findIndex(m => m.type === type);
      if (index >= 0) return messages.splice(index, 1)[0];
      await new Promise(r => setTimeout(r, 10));
    }
    throw new Error(`Missing ${type}`);
  };
  const { playerId } = await wait('init');
  return { ws, messages, wait, playerId, send: data => ws.send(JSON.stringify(data)) };
}
test('socket auth: verified account binds to player; client account/role spoofing is ignored', async t => {
  const c = await client(t);
  c.send({ type: 'join_room', roomId: 'puck-1', accessToken: 'valid', accountId: 'admin', role: 'admin' });
  assert.equal((await c.wait('joined_room')).authenticated, true);
  assert.equal(game.rooms.get('puck-1').players.get(c.playerId).accountId, 'account-one');
  const state = await c.wait('game_state');
  assert.ok(!JSON.stringify(state).includes('account-one'));
  assert.ok(!JSON.stringify(state).includes('private@example.com'));
});
test('socket auth: renewal keeps the same player; leaving clears account binding', async t => {
  const c = await client(t);
  c.send({ type: 'join_room', roomId: 'puck-1', accessToken: 'valid' });
  await c.wait('joined_room'); await c.wait('auth_state');
  c.send({ type: 'authenticate', accessToken: 'valid' });
  assert.equal((await c.wait('auth_state')).authenticated, true);
  assert.equal(game.rooms.get('puck-1').players.get(c.playerId).accountId, 'account-one');
  c.send({ type: 'leave_room' }); await c.wait('left_room');
  c.send({ type: 'join_room', roomId: 'puck-1' });
  assert.equal((await c.wait('joined_room')).authenticated, false);
  assert.equal(game.rooms.get('puck-1').players.get(c.playerId).accountId, null);
});

test('socket auth: invalid token never falls back to a guest join', async t => {
  const c = await client(t);
  c.send({ type: 'join_room', roomId: 'puck-1', accessToken: 'forged' });
  await c.wait('auth_expired');
  assert.equal(game.rooms.get('puck-1').players.has(c.playerId), false);
});
test('socket auth: leaving cancels an in-flight authenticated join', async t => {
  const c = await client(t);
  c.send({ type: 'join_room', roomId: 'puck-1', accessToken: 'slow' });
  c.send({ type: 'leave_room' }); await c.wait('left_room');
  await new Promise(r => setTimeout(r, 200));
  assert.equal(game.rooms.get('puck-1').players.has(c.playerId), false);
  assert.equal(c.messages.some(m => m.type === 'joined_room'), false);
});
test('socket auth: logout removes authenticated player; guest identity cannot claim account', async t => {
  const c = await client(t);
  c.send({ type: 'join_room', roomId: 'puck-1', accessToken: 'valid' }); await c.wait('joined_room'); await c.wait('auth_state');
  // Exhaust upstream verification budget; local logout must still be accepted.
  for (let i = 0; i < 11; i++) {
    c.send({ type: 'authenticate', accessToken: 'valid' }); await c.wait('auth_state');
  }
  c.send({ type: 'authenticate', accessToken: null });
  assert.equal((await c.wait('auth_state')).authenticated, false);
  assert.equal(game.rooms.get('puck-1').players.has(c.playerId), false);
  c.send({ type: 'join_room', roomId: 'puck-1', accountId: 'account-one' });
  assert.equal((await c.wait('joined_room')).authenticated, false);
  assert.equal(game.rooms.get('puck-1').players.get(c.playerId).accountId, null);
});
test('socket auth: token expiry removes authenticated player', async t => {
  const c = await client(t);
  const token = 'exp.' + Buffer.from(JSON.stringify({ exp: (Date.now() + 600) / 1000 })).toString('base64url') + '.test';
  c.send({ type: 'join_room', roomId: 'puck-1', accessToken: token }); await c.wait('joined_room');
  await c.wait('auth_expired');
  assert.equal(game.rooms.get('puck-1').players.has(c.playerId), false);
});
