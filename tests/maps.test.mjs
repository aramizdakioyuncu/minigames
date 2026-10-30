import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRoom } from './helpers.mjs';

for (const theme of ['spaceship', 'castle', 'mansion']) {
  test(`${theme}: every task and vent is reachable with open doors`, t => {
    const { mode } = makeRoom(t, 'space', 1, { mapTheme: theme });
    const step = 20, radius = 18, hw = mode.width / 2, hh = mode.height / 2;
    const clear = (x, y) => mode.isWalkable(x,y,radius) && Math.abs(x) < hw - radius && Math.abs(y) < hh - radius && mode.walls.every(({ p1, p2 }) => {
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const u = Math.max(0, Math.min(1, ((x - p1.x) * dx + (y - p1.y) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(x - p1.x - u * dx, y - p1.y - u * dy) >= radius;
    });
    const queue = [[0, 0]], seen = new Set(['0,0']);
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of [[step,0],[-step,0],[0,step],[0,-step]]) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        if (!seen.has(key) && clear(nx, ny) && clear(x + dx / 2, y + dy / 2)) { seen.add(key); queue.push([nx, ny]); }
      }
    }
    for (const station of [...mode.taskStations, ...mode.vents, {...mode.generator,id:'generator'}]) {
      assert.ok(queue.some(([x,y]) => Math.hypot(x - station.x, y - station.y) < 45), `Unreachable: ${station.id}`);
    }
    const ventIds = new Set(mode.vents.map(v => v.id));
    for (const vent of mode.vents) for (const destination of vent.connectsTo) assert.ok(ventIds.has(destination));
  });
}
