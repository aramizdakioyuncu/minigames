import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { makeRoom,stateFor } from './helpers.mjs';

test('space: waiting room rejects tasks via actions AND held inputs',t=>{
  const room=makeRoom(t,'space',1),mode=room.mode,p=room.players.get('p0'),task=mode.taskStations[0];
  p.pos.set(task.x,task.y);mode.handleAction(p.id,{type:'start_task',taskId:task.id});
  assert.equal(p.isDoingTask,false);
  p.input={hold:true};for(let i=0;i<600;i++)mode.handlePlayerInput(p,1/60);
  mode.completeTask(p.id,task.id);assert.equal(mode.completedTasks,0);assert.equal(p.taskProgress,0);
});

test('space: direction-only vent travel is deterministic; invalid targets and crew are rejected',t=>{
  const room=makeRoom(t,'space',4),mode=room.mode;mode.startMatch();
  const p=[...room.players.values()].find(p=>p.role==='impostor'),vent=mode.vents[0];
  p.pos.set(vent.x,vent.y);p.input={vent:true};mode.handlePlayerInput(p);assert.equal(p.isVented,true);
  p.lastVentToggle=0;p.input={up:true};mode.handlePlayerInput(p);
  assert.equal(p.ventId,'vent_react');
  p.lastVentToggle=0;mode.handleAction(p.id,{type:'vent_travel',targetId:'vent_storage'});assert.equal(p.ventId,'vent_react');
  mode.handleAction(p.id,{type:'vent_travel',targetId:'vent_med'});assert.equal(p.ventId,'vent_med');
  p.lastVentToggle=0;mode.handleAction(p.id,{type:'vent_exit'});assert.equal(p.isVented,false);
  const crew=[...room.players.values()].find(p=>p.role==='crew');mode.handleAction(crew.id,{type:'vent_travel',targetId:'vent_med'});assert.equal(crew.isVented,false);
});

test('space: self-votes are rejected and votes for another player still work',t=>{
  const room=makeRoom(t,'space',4),mode=room.mode;mode.startMatch();mode.startEmergencyMeeting('Test','Test');
  mode.castVote('p0','p0');assert.equal(mode.votes.size,0);
  mode.castVote('p0','p1');assert.equal(mode.votes.get('p0'),'p1');
});

test('space: walls, closed doors and darkness control BOTH network visibility and the rendered polygon',t=>{
  const room=makeRoom(t,'space',4),mode=room.mode;mode.startMatch();
  const [viewer,target]=[...room.players.values()].filter(p=>p.role==='crew');
  viewer.pos.set(-320,100);target.pos.set(-360,100);room.broadcastState();
  assert.equal(stateFor(room,viewer.id).players.some(p=>p.id===target.id),false);
  viewer.pos.set(-320,0);target.pos.set(-360,0);const door=mode.doors.find(d=>d.id==='door_cafe_west');
  door.isOpen=false;room.broadcastState();assert.equal(stateFor(room,viewer.id).players.some(p=>p.id===target.id),false);
  door.isOpen=true;room.broadcastState();assert.equal(stateFor(room,viewer.id).players.some(p=>p.id===target.id),true);
  viewer.pos.set(0,0);target.pos.set(200,0);room.broadcastState();assert.equal(stateFor(room,viewer.id).modeState.vision.radius,300);
  mode.sabotage={active:true,type:'lights',timer:20};room.broadcastState();const state=stateFor(room,viewer.id);
  assert.equal(state.modeState.vision.radius,120);assert.equal(state.players.some(p=>p.id===target.id),false);
  const {polygon,x,y,radius}=state.modeState.vision;
  for(let i=0;i<polygon.length;i+=2)assert.ok(Math.hypot(polygon[i]-x,polygon[i+1]-y)<=radius+0.2);
});

for(const theme of ['spaceship','castle','mansion'])test(`${theme}: walk from cafeteria to generator with real collision and automatic doors`,t=>{
  const room=makeRoom(t,'space',1,{mapTheme:theme}),mode=room.mode,p=room.players.get('p0');p.pos.set(0,0);
  for(const [x,y] of [[-420,0],[-420,545],[-800,545],[mode.generator.x,mode.generator.y]]) {
    let frame=0;
    for(;frame<600 && Math.hypot(p.pos.x-x,p.pos.y-y)>12;frame++) {
      room.handlePlayerInput(p.id,{left:p.pos.x>x+4,right:p.pos.x<x-4,up:p.pos.y>y+4,down:p.pos.y<y-4});mode.update(1/60,false);
    }
    assert.ok(frame<600,`blocked approaching ${x},${y} at ${p.pos.x},${p.pos.y}`);
  }
  assert.ok(Math.hypot(p.pos.x-mode.generator.x,p.pos.y-mode.generator.y)<20);
});

test('space: match result includes dead winners and losers and persists until the next match',t=>{
  const room=makeRoom(t,'space',4),mode=room.mode;mode.startMatch();
  const crew=[...room.players.values()].find(p=>p.role==='crew');crew.isAlive=false;
  for(const p of room.players.values())if(p.role==='impostor')p.isAlive=false;
  mode.checkWinConditions();assert.equal(mode.result.winner,'crew');assert.equal(mode.result.players.length,4);
  assert.equal(mode.result.players.find(p=>p.id===crew.id).outcome,'winner');
  assert.equal(mode.result.players.filter(p=>p.outcome==='loser').length,1);
  mode.update(60,false);assert.equal(mode.gameState,'game_over');assert.equal(mode.pendingTimers.size,0);
  mode.startMatch();assert.equal(mode.result,null);
});

test('space: committed artwork consists of loadable PNG maps and sprites',()=>{
  const directory=new URL('../web/assets/space/png/',import.meta.url),files=readdirSync(directory);
  assert.equal(files.filter(f=>f.endsWith('.png')).length,13);
  for(const file of files) {
    const data=readFileSync(new URL(file,directory));assert.equal(data.subarray(1,4).toString(),'PNG');
    if(file.startsWith('map-')){assert.equal(data.readUInt32BE(16),2800);assert.equal(data.readUInt32BE(20),1800);}
  }
});
