import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from '../socket/node_modules/ws/wrapper.mjs';

let game, url;
before(async () => {
  process.env.PORT = '0'; process.env.HOST = '127.0.0.1';
  game = await import('../socket/server.js');
  if (!game.wss.address()) await once(game.wss, 'listening');
  url = `ws://127.0.0.1:${game.wss.address().port}`;
});
after(() => game.shutdown());

async function client(t) {
  const ws = new WebSocket(url);
  const messages = [];
  ws.on('message', raw => messages.push(JSON.parse(raw)));
  await once(ws, 'open');
  t.after(() => ws.terminate());
  const wait = async (type, predicate = () => true) => {
    for (let i = 0; i < 200; i++) {
      const index = messages.findIndex(msg => msg.type === type && predicate(msg));
      if (index >= 0) return messages.splice(index, 1)[0];
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(`Missing ${type}`);
  };
  const init = await wait('init');
  return { ws, wait, id: init.playerId, send: data => ws.send(JSON.stringify(data)) };
}

test('real WebSocket: all six game modes send valid state', async t => {
  const c = await client(t);
  for (const mode of ['puck', 'sumo', 'agar', 'space', 'vampire', 'conquest']) {
    c.send({ type: 'join_room', roomId: `${mode}-1`, name: 'Network test' });
    assert.equal((await c.wait('joined_room')).mode, mode);
    assert.equal((await c.wait('game_state', state => state.mode === mode)).mode, mode);
    c.send({ type: 'leave_room' }); await c.wait('left_room');
  }
});

test('malformed messages cannot kill the server', async t => {
  const c = await client(t);
  for (const data of ['null', '[]', '"text"', '{', '{"type":"input","input":true}']) c.ws.send(data);
  c.send({ type: 'ping', t: 123 });
  assert.equal((await c.wait('pong')).clientTime, 123);
});

test('custom room settings, full-room rejection and leave cleanup', async t => {
  const a = await client(t); const b = await client(t); const c = await client(t);
  a.send({ type: 'create_room', mode: 'puck', maxPlayers: 2, tackleEnabled: false, name: 'Custom' });
  const { roomId } = await a.wait('room_created');
  assert.equal(game.rooms.get(roomId).tackleEnabled, false);
  for (const player of [a, b]) { player.send({ type: 'join_room', roomId }); await player.wait('joined_room'); }
  c.send({ type: 'join_room', roomId }); assert.match((await c.wait('error')).message, /dolu/);
  a.send({ type: 'leave_room' }); await a.wait('left_room');
  b.send({ type: 'leave_room' }); await b.wait('left_room');
  assert.equal(game.rooms.has(roomId), false);
});

test('private rooms are unlisted and map themes survive creation', async t => {
  const c = await client(t);
  c.send({ type: 'create_room', mode: 'space', isPrivate: true, mapTheme: 'castle' });
  const { roomId } = await c.wait('room_created');
  assert.equal(game.rooms.get(roomId).mapTheme, 'castle');
  c.send({ type: 'get_rooms' }); assert.ok(!(await c.wait('rooms_list')).rooms.some(r => r.id === roomId));
  c.send({ type: 'join_room', roomId }); await c.wait('joined_room');
  c.send({ type: 'leave_room' }); await c.wait('left_room');
});

test('room creation is rate limited across connections', async t => {
  const c = await client(t);
  c.send({ type: 'create_room' }); await c.wait('room_created');
  const other = await client(t); other.send({ type: 'create_room' });
  assert.match((await other.wait('error')).message, /sınır/);
});

test('oversized payload closes only the offending socket', async t => {
  const c = await client(t); const closed = once(c.ws, 'close');
  c.ws.send('x'.repeat(9000)); assert.equal((await closed)[0], 1009);
  const healthy = await client(t); healthy.send({ type: 'ping', t: 1 }); await healthy.wait('pong');
});

test('cross-origin browser handshake is rejected', async () => {
  const ws = new WebSocket(url, { origin: 'https://attacker.invalid' });
  const [error] = await once(ws, 'error');
  assert.match(error.message, /401|403/);
});
