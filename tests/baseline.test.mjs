import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRoom } from './helpers.mjs';

for (const mode of ['puck', 'sumo', 'agar', 'space', 'vampire', 'conquest']) {
  test(`${mode}: joins, starts, simulates, broadcasts, leaves and restarts`, t => {
    const room = makeRoom(t, mode);
    room.handlePlayerAction('p0', { type: 'start_match' });
    for (let frame = 0; frame < 600; frame++) {
      for (const p of room.players.values()) room.handlePlayerInput(p.id, { right: frame % 120 < 60, down: frame % 60 < 30, kick: frame % 90 === 0 });
      room.mode.update(1 / 60, frame % 60 === 0);
    }
    room.broadcastState();
    for (const p of room.players.values()) {
      assert.ok(Number.isFinite(p.pos.x) && Number.isFinite(p.pos.y));
      assert.ok(p.ws.packets.some(packet => packet.type === 'game_state'));
    }
    room.removePlayer('p0');
    assert.equal(room.hostId, 'p1');
    room.restartMatch();
    room.mode.update(1 / 60, false);
  });
}
