import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRoom } from './helpers.mjs';
import { SPACE_COLORS } from '../socket/engine/modes/spaceMode.js';

test('puck: only host can finish; final score and participant teams persist',t=>{
  const room=makeRoom(t,'puck',4),mode=room.mode;
  room.handlePlayerAction('p0',{type:'start_match'});mode.scoreRed=3;mode.scoreBlue=1;
  room.removePlayer('p2');
  room.handlePlayerAction('p1',{type:'stop_match'});assert.equal(mode.matchPhase,'first_half');
  room.handlePlayerAction('p0',{type:'stop_match'});
  assert.equal(mode.result.winner,'red');assert.equal(mode.result.players.length,4);
  assert.equal(mode.result.players.find(p=>p.id==='p2').disconnected,true);
  assert.equal(mode.result.players.filter(p=>p.outcome==='winner').length,2);
  const snapshot=JSON.stringify(mode.result);
  room.handleTeamChange('p0','blue');mode.update(100,true);mode.stopMatch();
  assert.equal(JSON.stringify(mode.result),snapshot);assert.equal(mode.scoreRed,3);
  assert.equal(mode.pendingTimers.size,0);mode.startMatch();assert.equal(mode.result,null);assert.equal(mode.scoreRed,0);
});

test('puck: natural ending selects blue; tied host finish is a draw for both teams',t=>{
  const {mode}=makeRoom(t,'puck',2);mode.startMatch();mode.scoreBlue=2;mode.matchPhase='second_half';mode.timeRemaining=0;mode.update(1,true);
  assert.equal(mode.result.winner,'blue');
  mode.startMatch();mode.scoreRed=2;mode.scoreBlue=2;mode.stopMatch();
  assert.equal(mode.result.winner,'draw');assert.ok(mode.result.players.every(p=>p.outcome==='draw'));
});

test('space: random colors are distinct; selection is validated and locked during a match',t=>{
  const room=makeRoom(t,'space',8),p=room.players.get('p0');
  assert.equal(new Set([...room.players.values()].map(p=>p.color)).size,8);
  const previous=p.color;
  room.handlePlayerAction(p.id,{type:'choose_color',color:room.players.get('p1').color});assert.equal(p.color,previous);
  room.handlePlayerAction(p.id,{type:'choose_color',color:'url(evil)'});assert.equal(p.color,previous);
  const used=new Set([...room.players.values()].map(p=>p.color));const free=SPACE_COLORS.find(c=>!used.has(c.color)).color;
  room.handlePlayerAction(p.id,{type:'choose_color',color:free});assert.equal(p.color,free);
  room.mode.startMatch();room.handlePlayerAction(p.id,{type:'choose_color',color:previous});assert.equal(p.color,free);
});

function completeTask(mode,p,task) {
  p.pos.set(task.x,task.y);mode.handleAction(p.id,{type:'start_task',taskId:task.id});
  p.taskStartedAt=Date.now()-task.duration*1000-1;mode.completeTask(p.id,task.id);
}

test('space: solo task completion never creates victory; two or three players cannot start social play',t=>{
  const room=makeRoom(t,'space',1),mode=room.mode,p=room.players.get('p0');mode.startMatch();
  for(const task of mode.taskStations)completeTask(mode,p,task);
  assert.equal(mode.completedTasks,mode.totalTasks);assert.equal(mode.gameState,'playing');assert.equal(mode.result,null);
  assert.equal(room.eventQueue.some(e=>e.type==='game_over'),false);
  for(const count of [2,3]) {const r=makeRoom(t,'space',count);r.mode.startMatch();assert.equal(r.mode.gameState,'waiting');assert.equal(r.mode.result,null);}
});

test('space: one completed task or one crew member finishing cannot end the match; ghost tasks count',t=>{
  const {mode,players}=makeRoom(t,'space',4);mode.startMatch();
  const crew=[...players.values()].filter(p=>p.role==='crew');
  crew[0].pos.set(mode.taskStations[0].x,mode.taskStations[0].y);crew[0].input={hold:true};
  for(let i=0;i<600;i++)mode.handlePlayerInput(crew[0],1/60);
  assert.equal(mode.completedTasks,0);crew[0].input={};
  completeTask(mode,crew[0],mode.taskStations[0]);assert.equal(mode.gameState,'playing');
  for(const task of mode.taskStations.slice(1))completeTask(mode,crew[0],task);
  assert.equal(mode.gameState,'playing');assert.equal(mode.result,null);
  crew[1].isAlive=false;
  for(const p of crew.slice(1))for(const task of mode.taskStations)completeTask(mode,p,task);
  assert.equal(mode.result.winner,'crew');assert.equal(mode.result.players.filter(p=>p.outcome==='winner').length,3);
});

test('space: surviving impostor parity wins; eliminating all impostors gives crew victory',t=>{
  const room=makeRoom(t,'space',4),mode=room.mode;mode.startMatch();
  const crew=[...room.players.values()].filter(p=>p.role==='crew');crew[0].isAlive=false;crew[1].isAlive=false;
  mode.checkWinConditions();assert.equal(mode.result.winner,'impostor');
  mode.startMatch();for(const p of room.players.values())if(p.role==='impostor')p.isAlive=false;
  mode.checkWinConditions();assert.equal(mode.result.winner,'crew');
});

test('space: critical sabotage requires two distinct live holders and its timeout awards impostors',t=>{
  const room=makeRoom(t,'space',4),mode=room.mode;mode.startMatch();
  const imp=[...room.players.values()].find(p=>p.role==='impostor');
  const crew=[...room.players.values()].filter(p=>p.role==='crew');mode.sabotage.cooldown=0;
  mode.handleAction(imp.id,{type:'sabotage',sabotageType:'reactor'});
  crew[0].pos.set(0,0);mode.handleAction(crew[0].id,{type:'emergency_meeting'});assert.equal(mode.gameState,'playing');
  for(let i=0;i<2;i++){crew[i].pos.set(mode.reactorPanels[i].x,mode.reactorPanels[i].y);crew[i].input={hold:true};}
  crew[1].isAlive=false;mode.update(1/60,false);assert.equal(mode.sabotage.active,true);assert.equal(mode.sabotage.repairCount,1);
  crew[1].isAlive=true;mode.update(1/60,false);assert.equal(mode.sabotage.active,false);assert.equal(mode.result,null);
  for(const p of crew)p.input={};mode.sabotage.cooldown=0;mode.handleAction(imp.id,{type:'sabotage',sabotageType:'reactor'});
  mode.update(31,false);assert.equal(mode.result.winner,'impostor');assert.match(mode.result.reason,/reaktör/);
});

test('space: resetting cancels critical sabotage; lights require repair; player capacity fits unique palette',t=>{
  const room=makeRoom(t,'space',4,{maxPlayers:24}),mode=room.mode;assert.equal(room.maxPlayers,15);
  mode.startMatch();let imp=[...room.players.values()].find(p=>p.role==='impostor');mode.sabotage.cooldown=0;
  mode.handleAction(imp.id,{type:'sabotage',sabotageType:'reactor'});mode.resetGame();mode.update(31,false);
  assert.equal(mode.gameState,'waiting');assert.equal(mode.result,null);assert.equal(mode.sabotage.active,false);
  mode.startMatch();imp=[...room.players.values()].find(p=>p.role==='impostor');mode.sabotage.cooldown=0;
  mode.handleAction(imp.id,{type:'sabotage',sabotageType:'lights'});mode.update(31,false);
  assert.equal(mode.sabotage.active,true);assert.equal(mode.sabotage.type,'lights');assert.equal(mode.result,null);
});
