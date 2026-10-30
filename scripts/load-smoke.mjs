import { once } from 'node:events';
import WebSocket from '../socket/node_modules/ws/wrapper.mjs';
process.env.PORT = '0'; process.env.HOST = '127.0.0.1';
const game = await import('../socket/server.js');
if (!game.wss.address()) await once(game.wss, 'listening');
const url = `ws://127.0.0.1:${game.wss.address().port}`;
const clients = [];
const modes = ['puck', 'sumo', 'agar', 'space', 'vampire', 'conquest'];
let snapshots = 0, bytes = 0;
const latencies = [];
try {
  await Promise.all(Array.from({ length: 24 }, async (_, index) => {
    const ws = new WebSocket(url); clients.push(ws);
    ws.on('message', raw => {
      bytes += raw.length;
      const message = JSON.parse(raw);
      if (message.type === 'game_state') snapshots++;
      if (message.type === 'pong') latencies.push(Date.now() - message.clientTime);
    });
    await once(ws, 'open');
    ws.send(JSON.stringify({ type: 'join_room', roomId: modes[index % 6] + '-1', name: `Load ${index}` }));
  }));
  const started = Date.now();
  for (let frame = 0; frame < 80; frame++) {
    for (const ws of clients) {
      ws.send(JSON.stringify({ type: 'input', input: { right: frame % 20 < 10, kick: frame % 15 === 0 } }));
      if (frame % 10 === 0) ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  latencies.sort((a,b) => a-b);
  if (latencies.length < 24 || snapshots < 240) throw new Error('Insufficient game updates');
  console.log(JSON.stringify({ clients: clients.length, modes: modes.length, elapsedMs: Date.now() - started, snapshots, totalBytes: bytes, pingP95Ms: latencies[Math.floor(latencies.length * 0.95)], pingMaxMs: latencies.at(-1) }, null, 2));
} finally {
  clients.forEach(ws => ws.terminate());
  game.shutdown();
}
