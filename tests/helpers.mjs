import { Room } from '../socket/engine/room.js';
export function makeRoom(t, mode, count = 4, options = {}) {
  const room = new Room('test', 'Test', mode, options);
  clearInterval(room.timer);
  t.after(() => room.destroy());
  for (let i = 0; i < count; i++) {
    const ws = { readyState: 1, bufferedAmount: 0, packets: [], send(payload) { this.packets.push(JSON.parse(payload)); } };
    room.addPlayer('p' + i, 'Oyuncu ' + i, '#3b82f6', '⚽', ws);
  }
  return room;
}
export const stateFor = (room, id) => room.players.get(id).ws.packets.findLast(p => p.type === 'game_state');
