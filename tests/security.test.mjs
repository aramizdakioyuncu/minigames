import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRoom, stateFor } from './helpers.mjs';
import { cleanInput, originAllowed } from '../socket/security.js';

for (const mode of ['space', 'vampire']) test(`${mode}: roles and private events never leak to other clients`, t => {
  const room = makeRoom(t, mode, 4);
  room.mode.startMatch();
  room.broadcastState();
  const innocent = [...room.players.values()].find(p => !['impostor', 'vampire'].includes(p.role));
  const state = stateFor(room, innocent.id);
  for (const list of [state.players, state.modeState.playersMeta]) {
    assert.ok(list.find(p => p.id === innocent.id).role);
    assert.ok(list.filter(p => p.id !== innocent.id).every(p => p.role === undefined));
  }
  if (mode === 'vampire') {
    const events = state.events.filter(e => e.type === 'vampire_role_assigned');
    assert.equal(events.length, 1);
    assert.equal(events[0].role, innocent.role);
    assert.deepEqual(events[0].vampireTeam, []);
  }
});

test('space: killer identity and vented coordinates are private', t => {
  const room = makeRoom(t, 'space');
  const [crew, killer] = room.players.values();
  killer.role = 'impostor'; killer.isVented = true;
  room.mode.bodies = [{ id: 'body', killerId: killer.id, x: 1, y: 2 }];
  room.broadcastEvent({ type: 'sfx_kill', killerId: killer.id });
  room.broadcastState();
  const state = stateFor(room, crew.id);
  assert.equal(state.players.some(p => p.id === killer.id), false);
  assert.equal(state.modeState.bodies[0].killerId, undefined);
  assert.equal(state.events.find(e => e.type === 'sfx_kill').killerId, undefined);
});

test('capacity, profile fields, boolean inputs and host authority are enforced', t => {
  const room = makeRoom(t, 'puck', 2, { maxPlayers: 2 });
  assert.equal(room.addPlayer('extra', {}, {}, {}, {}), null);
  room.handlePlayerAction('p1', { type: 'start_match' });
  assert.equal(room.mode.matchPhase, 'waiting');
  room.handlePlayerAction('p0', { type: 'start_match' });
  assert.equal(room.mode.matchPhase, 'first_half');
  room.handlePlayerAction('p1', { type: 'restart_match' });
  assert.equal(room.mode.matchPhase, 'first_half');
  room.handlePlayerInput('p1', { right: 'true', left: true, speed: 10000, up: {} });
  assert.deepEqual(room.players.get('p1').input, cleanInput({ left: true }));
  room.removePlayer('p1');
  const player = room.addPlayer('safe', { bad: true }, '" onload="alert(1)', '<img src=x>', null);
  assert.equal(player.name, 'Oyuncu');
  assert.equal(player.color, '#3b82f6');
  assert.ok(!player.avatar.includes('<'));
});

test('non-football team changes cannot revive or change roles', t => {
  const room = makeRoom(t, 'vampire');
  const player = room.players.get('p1'); player.isAlive = false; player.isSpectator = true;
  room.handleTeamChange('p1', 'red');
  assert.equal(player.isSpectator, true);
  assert.equal(player.isAlive, false);
});

test('space tasks enforce role, location, task start, duration and duplicate rejection', t => {
  const room = makeRoom(t, 'space', 1); const p = room.players.get('p0'); const mode = room.mode;
  mode.startMatch();
  const task = mode.taskStations[0];
  mode.completeTask(p.id, task.id);
  assert.equal(mode.completedTasks, 0);
  p.pos.set(task.x, task.y);
  mode.handleAction(p.id, { type: 'start_task', taskId: task.id });
  mode.completeTask(p.id, task.id);
  assert.equal(mode.completedTasks, 0);
  p.taskStartedAt -= task.duration * 1000;
  mode.completeTask(p.id, task.id);
  assert.equal(mode.completedTasks, 1);
  mode.completeTask(p.id, task.id);
  assert.equal(mode.completedTasks, 1);
  const other = mode.taskStations[1]; p.pos.set(other.x, other.y); p.role = 'impostor';
  mode.handleAction(p.id, { type: 'start_task', taskId: other.id });
  assert.equal(p.isDoingTask, false);
});

test('space: remote reports and sabotage repairs are rejected', t => {
  const room = makeRoom(t, 'space'); room.mode.startMatch();
  const p = room.players.get('p0'); p.pos.set(1200, 800);
  room.mode.handleAction(p.id, { type: 'emergency_meeting' });
  assert.equal(room.mode.gameState, 'playing');
  room.mode.sabotage = { active: true, type: 'lights' };
  room.mode.handleAction(p.id, { type: 'fix_sabotage' });
  assert.equal(room.mode.sabotage.active, true);
});

test('vampire: seer investigates once, hunter shoots once, invalid votes are ignored', t => {
  const room = makeRoom(t, 'vampire', 6); const mode = room.mode;
  mode.startMatch(); mode.startNightPhase();
  const players = [...room.players.values()]; const seer = players.find(p => p.role === 'seer');
  mode.handleAction(seer.id, { type: 'seer_investigate', targetId: 'not-a-player' });
  assert.equal(seer.hasActed, false);
  const targets = players.filter(p => p.id !== seer.id);
  mode.handleAction(seer.id, { type: 'seer_investigate', targetId: targets[0].id });
  mode.handleAction(seer.id, { type: 'seer_investigate', targetId: targets[1].id });
  assert.equal(room.eventQueue.filter(e => e.type === 'vampire_seer_result').length, 1);
  const hunter = players.find(p => p.role === 'hunter'); hunter.isAlive = false; hunter.hunterRevengeAvailable = true;
  const victims = players.filter(p => !['hunter', 'vampire'].includes(p.role));
  mode.handleAction(hunter.id, { type: 'hunter_revenge', targetId: victims[0].id });
  mode.handleAction(hunter.id, { type: 'hunter_revenge', targetId: victims[1].id });
  assert.equal(victims[0].isAlive, false); assert.equal(victims[1].isAlive, true);
});

test('browser origins are checked against the requested host', () => {
  assert.equal(originAllowed({ headers: { origin: 'https://evil.invalid', host: 'arena.test' } }), false);
  assert.equal(originAllowed({ headers: { origin: 'https://arena.test', host: 'arena.test' } }), true);
  assert.equal(originAllowed({ headers: { origin: 'null', host: 'arena.test' } }), false);
});

test('space: fog of war removes distant positions, bodies and kill events from network data', t => {
  const room = makeRoom(t, 'space', 4); room.mode.startMatch();
  const [viewer, far] = [...room.players.values()].filter(p => p.role !== 'impostor');
  viewer.pos.set(0, 0); far.pos.set(800, 800);
  room.mode.bodies = [{ id: 'far-body', x: 800, y: 800 }, { id: 'near-body', x: 20, y: 20 }];
  room.broadcastEvent({ type: 'sfx_kill', x: 800, y: 800 }); room.broadcastState();
  const state = stateFor(room, viewer.id);
  assert.equal(state.players.some(p => p.id === far.id), false);
  assert.deepEqual(state.modeState.bodies.map(b => b.id), ['near-body']);
  assert.equal(state.events.some(e => e.type === 'sfx_kill'), false);
});

test('vampire: hunter last shot is resolved before declaring a winner', t => {
  const room = makeRoom(t, 'vampire', 6); const mode = room.mode; mode.startMatch();
  const hunter = [...room.players.values()].find(p => p.role === 'hunter');
  const vampire = [...room.players.values()].find(p => p.role === 'vampire');
  for (const p of room.players.values()) p.isAlive = p === vampire;
  mode.grantHunterRevenge(hunter);
  assert.equal(mode.checkWinConditions(), false);
  mode.handleAction(hunter.id, { type: 'hunter_revenge', targetId: vampire.id });
  assert.equal(mode.gameState, 'game_over');
  assert.equal(mode.winner, 'villagers');
});
