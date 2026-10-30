import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRoom } from './helpers.mjs';
import { PhysicsBody, resolveCircleCollision, resolveSegmentCollision, Vec2 } from '../socket/engine/physics.js';

test('physics: changed masses, coincident bodies and zero time remain stable', () => {
  const a = new PhysicsBody({ x: 0, y: 0 }); const b = new PhysicsBody({ x: 0, y: 0 });
  a.mass = 5; assert.equal(a.invMass, 0.2);
  assert.equal(resolveCircleCollision(a, b), true); assert.ok(a.pos.dist(b.pos) > 0);
  a.vel.x = 5; const before = a.pos.x; a.update(0); assert.equal(a.pos.x, before);
  const c = new PhysicsBody({ x: 0, y: 0 });
  assert.equal(resolveSegmentCollision(c, new Vec2(-10, 0), new Vec2(10, 0)), true);
  assert.ok(Number.isFinite(c.pos.y));
});

test('puck: goals count and full match advances through both halves', t => {
  const room = makeRoom(t, 'puck', 2); const mode = room.mode;
  mode.startMatch(); mode.ball.pos.set(mode.width / 2 + 30, 0); mode.update(0, false);
  assert.equal(mode.scoreRed + mode.scoreBlue, 1);
  mode.celebrationTimer = 0; mode.timeRemaining = 0; mode.update(0, true);
  assert.equal(mode.matchPhase, 'half_time');
  mode.halfTimeTimer = 0; mode.update(0, true); assert.equal(mode.matchPhase, 'second_half');
  mode.timeRemaining = 0; mode.update(0, true); assert.equal(mode.matchPhase, 'game_over');
});

test('sumo: elimination ends the round and disconnect cannot leave it stuck', t => {
  const room = makeRoom(t, 'sumo', 2);
  room.players.get('p1').pos.set(1000, 1000); room.mode.update(1 / 60, false);
  assert.equal(room.mode.roundState, 'round_over');
  room.mode.initRound(); room.removePlayer('p1'); room.mode.update(1 / 60, false);
  assert.equal(room.mode.roundState, 'round_over'); room.mode.update(4, false);
  assert.equal(room.mode.roundState, 'waiting');
});

test('agar: split conserves mass, has direction at rest and cleans player state', t => {
  const room = makeRoom(t, 'agar', 1); const p = room.players.get('p0');
  p.cells[0].score = 40; room.mode.splitPlayer(p);
  assert.equal(p.cells.length, 2); assert.equal(p.cells.reduce((n,c) => n + c.score, 0), 40);
  assert.ok(p.cells[1].vel.length() > 0);
  room.mode.lastFeedTimes.set(p.id, 10); room.removePlayer(p.id);
  assert.equal(room.mode.lastFeedTimes.size, 0);
});

test('conquest: finite, single answers; one pick per turn; zero scores after loss; reset state', t => {
  const room = makeRoom(t, 'conquest', 2); const mode = room.mode; mode.startMatch();
  mode.handleAction('p0', { type: 'submit_answer', answer: Infinity }); assert.equal(mode.playerAnswers.size, 0);
  mode.handleAction('p0', { type: 'submit_answer', answer: 1 });
  mode.handleAction('p0', { type: 'submit_answer', answer: 2 }); assert.equal(mode.playerAnswers.get('p0').answer, 1);
  mode.handleAction('p1', { type: 'submit_answer', answer: 3 }); assert.equal(mode.gameState, 'question_result');
  mode.update(10, false); assert.equal(mode.gameState, 'conquer_pick');
  mode.pickerQueue = []; const id = mode.activePickerId; const target = mode.territories.find(t => t.ownerId !== id);
  mode.claimTerritory(id, target.id); assert.equal(mode.gameState, 'intermission');
  const another = mode.territories.find(t => t.ownerId !== id); const owner = another.ownerId;
  mode.claimTerritory(id, another.id); assert.equal(another.ownerId, owner);
  mode.territories.forEach(t => { t.ownerId = 'p1'; }); mode.recalculateScores();
  assert.equal(room.players.get('p0').score, 0);
  mode.resetGame(); mode.update(100, false); assert.equal(mode.gameState, 'waiting');
  assert.equal(mode.currentQuestion, null);
});

for (const type of ['space', 'vampire', 'conquest']) test(`${type}: late join waits for next match and leave hooks run`, t => {
  const room = makeRoom(t, type, 4); room.mode.startMatch();
  const late = room.addPlayer('late', 'Late', '#ffffff', '⚽', null);
  assert.equal(late.isSpectator, true);
  let called = false; const original = room.mode.onPlayerLeave.bind(room.mode);
  room.mode.onPlayerLeave = player => { called = true; original(player); };
  room.removePlayer('p1'); assert.equal(called, true);
  room.mode.resetGame(); assert.equal(late.isSpectator, false);
});

test('restarting or destroying a room cancels old callbacks', async t => {
  const room = makeRoom(t, 'space'); let fired = false;
  room.mode.schedule(() => { fired = true; }, 15);
  room.restartMatch(); await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(fired, false);
  room.mode.schedule(() => { fired = true; }, 15);
  room.destroy(); await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(fired, false);
});

test('puck: holding is exclusive and kicking releases a moving ball', t => {
  const room = makeRoom(t, 'puck', 2), mode = room.mode;
  const [a, b] = room.players.values();
  a.pos.set(0, 0); b.pos.set(0, 40); mode.ball.pos.set(25, 0);
  a.input = { hold: true }; b.input = { hold: true };
  mode.update(1 / 60, false);
  assert.equal([...room.players.values()].filter(p => p.isHoldingBall).length, 1);
  const holder = [...room.players.values()].find(p => p.isHoldingBall);
  for (const p of room.players.values()) p.input = {};
  holder.input = { kick: true }; mode.update(1 / 60, false);
  assert.equal(holder.isHoldingBall, false);
  assert.ok(mode.ball.vel.length() > 5);
});

test('agar: feeding transfers mass and split cells merge after cooldown', t => {
  const room = makeRoom(t, 'agar', 1), mode = room.mode, p = room.players.get('p0');
  p.cells[0].score = 80; mode.ejectMass(p);
  assert.ok(p.cells[0].score < 80); assert.equal(mode.ejectedPellets.length, 1);
  const mass = p.cells[0].score;
  mode.splitPlayer(p); mode.pellets = []; mode.maxPellets = 0; mode.ejectedPellets = [];
  for (const cell of p.cells) { cell.canMergeAt = 0; cell.pos.set(0, 0); cell.vel.set(0, 0); }
  mode.update(0, false);
  assert.equal(p.cells.length, 1); assert.equal(p.cells[0].score, mass);
});

test('space: initial kill cooldown, kill, vent travel, sabotage and local repair', t => {
  const room = makeRoom(t, 'space', 5), mode = room.mode; mode.startMatch();
  const killer = [...room.players.values()].find(p => p.role === 'impostor');
  const crew = [...room.players.values()].filter(p => p.role === 'crew');
  for (const p of crew) p.pos.set(800, 800);
  killer.pos.set(0, 0); crew[0].pos.set(30, 0); killer.input = { kick: true };
  mode.handlePlayerInput(killer, 1 / 60); assert.equal(crew[0].isAlive, true);
  killer.lastKillTime -= 5100;
  mode.handlePlayerInput(killer, 1 / 60); assert.equal(crew[0].isAlive, false);
  assert.equal(mode.bodies.length, 1);
  const vent = mode.vents[0]; killer.pos.set(vent.x, vent.y); killer.input = { vent: true };
  mode.handlePlayerInput(killer, 1 / 60); assert.equal(killer.isVented, true);
  killer.lastVentToggle -= 600; killer.input.right = true;
  mode.handlePlayerInput(killer, 1 / 60); assert.ok(vent.connectsTo.includes(killer.ventId));
  mode.sabotage.cooldown = 0;
  mode.handleAction(killer.id, { type: 'sabotage', sabotageType: 'lights' });
  assert.equal(mode.sabotage.active, true);
  const station = mode.taskStations.find(s => s.room === 'electrical');
  crew[1].pos.set(station.x, station.y);
  mode.handleAction(crew[1].id, { type: 'fix_sabotage' }); assert.equal(mode.sabotage.active, false);
  mode.sabotage.cooldown = 0;
  mode.handleAction(killer.id, { type: 'sabotage', sabotageType: 'doors' });
  assert.ok(mode.doors.every(d => d.isLocked));
  mode.update(11, false); assert.ok(mode.doors.every(d => !d.isLocked));
});
