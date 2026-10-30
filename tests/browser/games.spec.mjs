import { test, expect } from '@playwright/test';
import { createGateway } from '../../scripts/gateway.mjs';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';

let game, backend, gateway;
test.beforeAll(async () => {
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '15050';
  game = await import('../../socket/server.js');
  if (!game.wss.address()) await once(game.wss, 'listening');
  process.env.PORT = '14000';
  backend = await import('../../backend/server.js');
  if (!backend.server.listening) await once(backend.server, 'listening');
  gateway = createGateway(fileURLToPath(new URL('../../web', import.meta.url)), 14000, 15050);
  gateway.listen(18080, '127.0.0.1'); await once(gateway, 'listening');
});
test.afterAll(async () => {
  game?.shutdown(); backend?.server.close(); gateway?.close();
});

async function lobby(page, name = 'Test Oyuncu', url = 'http://127.0.0.1:18080/') {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /Socket parse error|Space PNG load error/.test(message.text())) errors.push(message.text()); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#txt-server-status')).toContainText('Çevrimiçi');
  await page.locator('#input-nickname').fill(name);
  await page.locator('#btn-enter-lobby').click();
  return errors;
}
async function join(page, mode) {
  await page.locator(`.mode-card.card-${mode}`).click();
  const room = page.locator('.room-card').first();
  await expect(room).toBeVisible();
  await room.locator('.btn-join').click();
  await page.waitForFunction(mode => window.gameApp?.lastGameState?.mode === mode, mode);
  return game.rooms.get(await page.evaluate(() => window.gameApp.currentRoom.roomId));
}

for (const mode of ['puck', 'sumo', 'agar', 'space', 'vampire', 'conquest']) {
  test(`${mode}: real lobby, room, rendering, movement and leave`, async ({ page }) => {
    const errors = await lobby(page);
    const room = await join(page, mode);
    const id = await page.evaluate(() => window.gameApp.socket.myPlayerId);
    const before = room.players.get(id).pos.x;
    await page.keyboard.down('KeyD'); await page.waitForTimeout(300); await page.keyboard.up('KeyD');
    if (mode !== 'conquest') expect(room.players.get(id).pos.x).toBeGreaterThan(before);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.gameApp.renderer.isWebGL)).toBe(true);
    await page.locator('#btn-leave-game').click();
    await expect(page.locator('#view-lobby')).toHaveClass(/active/);
    expect(errors).toEqual([]);
    expect(room.players.size).toBe(0);
  });
}

test('space: task UI completes a real server task and meeting votes work', async ({ page, browser }) => {
  const errors = await lobby(page); const room = await join(page, 'space');
  const id = await page.evaluate(() => window.gameApp.socket.myPlayerId);
  const task = room.mode.taskStations.find(t => t.id === 'task_swipe_card');
  room.players.get(id).pos.set(task.x, task.y); room.players.get(id).vel.set(0, 0);
  await page.waitForTimeout(150);
  await page.keyboard.press('KeyE');
  await expect(page.locator('#modal-task-interactive')).toHaveClass(/hidden/);
  expect(room.mode.completedTasks).toBe(0);
  await page.locator('#btn-hud-start-match').click();
  await expect.poll(()=>room.mode.gameState).toBe('playing');
  room.players.get(id).pos.set(task.x,task.y);room.players.get(id).vel.set(0,0);
  await page.waitForTimeout(150);await page.keyboard.press('KeyE');
  await expect(page.locator('#modal-task-interactive')).not.toHaveClass(/hidden/);
  const wireColors={red:'rgb(239, 68, 68)',blue:'rgb(59, 130, 246)',yellow:'rgb(234, 179, 8)',pink:'rgb(236, 72, 153)'};
  for(const [color,rgb] of Object.entries(wireColors)) {
    await expect(page.locator(`#wire-left-col [data-color="${color}"]`)).toHaveCSS('background-color',rgb);
    await expect(page.locator(`#wire-right-col [data-color="${color}"]`)).toHaveCSS('background-color',rgb);
  }
  await page.locator('#wire-left-col [data-color="red"]').click();
  await page.locator('#wire-right-col [data-color="blue"]').click();
  await expect(page.locator('#wire-right-col [data-color="blue"]')).toBeEnabled();
  for (const color of ['red', 'blue', 'yellow', 'pink']) {
    await page.locator(`#wire-left-col [data-color="${color}"]`).click();
    await page.locator(`#wire-right-col [data-color="${color}"]`).click();
  }
  await expect.poll(() => room.mode.completedTasks).toBe(1);
  await expect(page.locator('#task-percent-text')).toContainText('13');
  room.mode.resetGame();
  await expect.poll(()=>page.evaluate(()=>window.gameApp.lastGameState.modeState.gameState)).toBe('waiting');
  const other = await browser.newPage();
  await lobby(other, 'İkinci'); await join(other, 'space');
  room.addPlayer('vote-fixture-a','Üçüncü','#22c55e','⚽',null);
  room.addPlayer('vote-fixture-b','Dördüncü','#a855f7','⚽',null);
  await page.locator('#btn-hud-start-match').click();
  await expect.poll(() => room.mode.gameState).toBe('playing');
  room.players.get(id).pos.set(0, 0); room.players.get(id).vel.set(0, 0);
  await page.waitForTimeout(100); await page.keyboard.press('KeyR');
  await expect(page.locator('#modal-emergency-meeting')).not.toHaveClass(/hidden/);
  await expect(page.locator('.btn-vote')).toHaveCount(4);
  await expect(page.locator(`.btn-vote[data-id="${id}"]`)).toBeDisabled();
  await page.locator('#btn-skip-vote').click(); await other.locator('#btn-skip-vote').click();
  room.mode.castVote('vote-fixture-a','skip');room.mode.castVote('vote-fixture-b','skip');
  await expect.poll(() => room.mode.gameState).not.toBe('meeting');
  expect(errors).toEqual([]);room.removePlayer('vote-fixture-a');room.removePlayer('vote-fixture-b');await other.close();
});

test('vampire: private role, night choice, seer result and trial are usable', async ({ page, browser }) => {
  test.setTimeout(150000); // Four independent browser contexts also initialize four WebGL renderers.
  const errors = await lobby(page); const room = await join(page, 'vampire');
  const others = [];
  for (let i = 0; i < 3; i++) { const p = await browser.newPage(); await lobby(p, `Köylü ${i}`); await join(p, 'vampire'); others.push(p); }
  await page.locator('#btn-hud-start-match').click();
  await expect.poll(() => room.mode.gameState).toBe('role_reveal');
  await expect(page.locator('#modal-vampire-role')).not.toHaveClass(/hidden/);
  await expect.poll(() => page.evaluate(() => window.gameApp.myVampireRole)).toBeTruthy();
  const seer = [...room.players.values()].find(p => p.role === 'seer');
  const pages = [page, ...others]; let seerPage;
  for (const p of pages) if (await p.evaluate(() => window.gameApp.socket.myPlayerId) === seer.id) seerPage = p;
  room.mode.startNightPhase();
  await seerPage.locator('#modal-vampire-role').waitFor({ state: 'hidden' });
  await seerPage.locator('#vampire-action-grid button').first().click();
  await expect(seerPage.locator('#modal-vampire-seer-result')).not.toHaveClass(/hidden/);
  await seerPage.locator('#btn-close-seer-result').click();
  room.mode.startVotingPhase();
  await expect(page.locator('#modal-vampire-trial')).not.toHaveClass(/hidden/);
  await page.locator('#trial-candidates-grid button').first().click();
  await expect.poll(() => room.mode.trialVotes.size).toBe(1);
  expect(errors).toEqual([]);
  await Promise.all(others.map(p => p.close()));
});

test('conquest: answer, result and map selection complete a turn', async ({ page }) => {
  const errors = await lobby(page); const room = await join(page, 'conquest');
  await page.locator('#btn-hud-start-match').click();
  await expect(page.locator('#modal-conquest-question')).not.toHaveClass(/hidden/);
  await page.locator('#conquest-answer-input').click();
  await page.locator('#conquest-answer-input').pressSequentially('100');
  await page.locator('#btn-conquest-submit-answer').click();
  await expect(page.locator('#modal-conquest-result')).not.toHaveClass(/hidden/);
  room.mode.phaseTimer = 0.01;
  await expect.poll(() => room.mode.gameState).toBe('conquer_pick');
  const territory = room.mode.territories.find(t => !t.ownerId);
  const point = await page.evaluate(({ x, y }) => {
    const r = window.gameApp.renderer;
    return { x: r.width / 2 + (x - r.camera.x) * r.camera.zoom, y: r.height / 2 + (y - r.camera.y) * r.camera.zoom };
  }, territory);
  await page.locator('#modal-conquest-result').waitFor({ state: 'hidden' });
  await page.mouse.click(point.x, point.y);
  await expect.poll(() => territory.ownerId).toBeTruthy();
  expect(errors).toEqual([]);
});

test('disconnect returns to lobby and reconnect establishes a fresh session', async ({ page }) => {
  const errors = await lobby(page); await join(page, 'puck');
  const oldId = await page.evaluate(() => window.gameApp.socket.myPlayerId);
  await page.evaluate(() => window.gameApp.socket.ws.close());
  await expect(page.locator('#view-lobby')).toHaveClass(/active/);
  await expect.poll(() => page.evaluate(() => window.gameApp.socket.myPlayerId)).not.toBe(oldId);
  expect(errors).toEqual([]);
});

test('private room creation, copyable invitation and invited guest work', async ({ page, browser }) => {
  const errors = await lobby(page);
  await page.locator('#btn-open-create-room').click();
  await page.locator('#create-room-name').fill('Davet Testi');
  await page.locator('#create-room-private').check();
  await page.locator('#btn-submit-create-room').click();
  await expect(page.locator('#view-game')).toHaveClass(/active/);
  const roomId = await page.evaluate(() => window.gameApp.currentRoom.roomId);
  expect(game.rooms.get(roomId).isPrivate).toBe(true);
  await page.locator('#btn-open-esc-menu').click();
  await page.locator('#btn-copy-invite').click();
  const link = await page.locator('#room-invite-url').inputValue();
  expect(new URL(link).searchParams.get('room')).toBe(roomId);
  const guest = await browser.newPage();
  const guestErrors = await lobby(guest, 'Davetli', link);
  await expect(guest.locator('#view-game')).toHaveClass(/active/);
  await expect.poll(() => game.rooms.get(roomId).players.size).toBe(2);
  expect([...errors, ...guestErrors]).toEqual([]);
  await guest.close();
});

test('space: every task panel can complete its server-validated task', async ({ page }) => {
  test.setTimeout(90000);
  const errors = await lobby(page); const room = await join(page, 'space');
  const id = await page.evaluate(() => window.gameApp.socket.myPlayerId);
  await page.locator('#btn-hud-start-match').click();
  await expect.poll(()=>room.mode.gameState).toBe('playing');
  for (const [taskId, kind] of [
    ['task_wires_elec', 'wires'], ['task_align_engine', 'reactor'],
    ['task_download_data', 'steer'], ['task_med_scan', 'medscan'],
    ['task_prime_shields', 'shields'], ['task_clean_filter', 'trash']
  ]) {
    const station = room.mode.taskStations.find(t => t.id === taskId);
    const before = room.mode.completedTasks;
    room.players.get(id).pos.set(station.x, station.y); room.players.get(id).vel.set(0, 0);
    await page.waitForTimeout(150); await page.keyboard.press('KeyE');
    await expect(page.locator('#modal-task-interactive')).not.toHaveClass(/hidden/);
    if (kind === 'wires') for (const color of ['red', 'blue', 'yellow', 'pink']) {
      await page.locator(`#wire-left-col [data-color="${color}"]`).click();
      await page.locator(`#wire-right-col [data-color="${color}"]`).click();
    }
    if (kind === 'reactor') for (let n = 1; n <= 5; n++) await page.locator('#reactor-pad-grid button').filter({ hasText: String(n) }).click();
    if (kind === 'steer') await page.locator('#radar-ship-target').click();
    if (kind === 'shields') {
      await expect(page.locator('#shields-grid button').first()).toHaveCSS('background-color', 'rgb(239, 68, 68)');
      for (const button of await page.locator('#shields-grid button').all()) await button.click();
      await expect(page.locator('#shields-grid button').first()).toHaveCSS('background-color', 'rgb(56, 189, 248)');
    }
    if (kind === 'trash') await page.locator('#btn-pull-trash').click();
    await expect.poll(() => room.mode.completedTasks, { timeout: 10000 }).toBe(before + 1);
    await expect(page.locator('#modal-task-interactive')).toHaveClass(/hidden/);
  }
  room.mode.sabotage = { active: true, type: 'lights', timer: 20 };
  await expect(page.locator('#space-sabotage-banner')).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile touch controls move and release; all modes render without WebGL', async ({ browser }) => {
  test.setTimeout(90000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return /webgl/.test(type) ? null : getContext.call(this, type, ...args);
    };
  });
  const errors = await lobby(page);
  for (const mode of ['puck', 'sumo', 'agar', 'space', 'vampire', 'conquest']) {
    const room = await join(page, mode);
    expect(await page.evaluate(() => window.gameApp.renderer.isWebGL)).toBe(false);
    if(mode==='space') {
      room.mode.startMatch();
      await expect.poll(()=>page.evaluate(()=>window.gameApp.lastGameState.modeState.vision?.radius)).toBe(300);
      await page.waitForTimeout(150);
      room.mode.finishGame('crew','Tüm görevler tamamlandı.');
      await expect(page.locator('#space-result-title')).toHaveText('KAZANDIN');
      await page.screenshot({path:'.cache/space-mobile-results.png'});
      await page.locator('#btn-space-close-result').tap();
    }
    if (mode === 'puck') {
      const id = await page.evaluate(() => window.gameApp.socket.myPlayerId);
      const before = room.players.get(id).pos.x;
      const bounds = await page.locator('#joystick-zone').boundingBox();
      expect(bounds).toBeTruthy();
      const cdp = await context.newCDPSession(page);
      const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 35, y }] });
      await expect.poll(() => room.players.get(id).pos.x).toBeGreaterThan(before + 2);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(() => page.evaluate(() => window.gameApp.input.keys.right)).toBe(false);
      await cdp.detach();
    }
    await page.waitForTimeout(150);
    await expect(page.locator('#btn-open-esc-menu')).toBeInViewport();
    await page.locator('#btn-open-esc-menu').tap();
    await page.locator('#btn-esc-leave-room').tap();
    await expect(page.locator('#view-lobby')).toHaveClass(/active/);
  }
  expect(errors).toEqual([]);
  await context.close();
});

test('space: PNG scene, directed vents, blackout and persistent winner/loser table', async ({page,browser})=>{
  test.setTimeout(90000);
  const errors=await lobby(page);const room=await join(page,'space');
  const id=await page.evaluate(()=>window.gameApp.socket.myPlayerId);
  const other=await browser.newPage();const otherErrors=await lobby(other,'Mürettebat');await join(other,'space');
  const crewId=await other.evaluate(()=>window.gameApp.socket.myPlayerId);
  room.addPlayer('fixture-crew','Destek Mürettebat','#22c55e','⚙️',null);
  room.addPlayer('fixture-crew-2','Gözcü','#facc15','⚙️',null);
  room.mode.checkRolesDistribution=()=>{for(const p of room.players.values())p.role=p.id===id?'impostor':'crew';};
  await page.locator('#btn-hud-start-match').click();
  await expect.poll(()=>room.mode.gameState).toBe('playing');
  await page.evaluate(async()=>{const {spaceArtReady}=await import('/js/modes/space/spaceScene.js');await spaceArtReady;});
  await expect.poll(()=>page.evaluate(()=>window.gameApp.lastGameState.modeState.vision?.radius)).toBe(380);
  await page.locator('#btn-space-minimap').click();
  await expect(page.locator('#modal-space-minimap')).toBeVisible();
  await page.screenshot({path:'.cache/space-map.png'});
  await page.locator('#btn-close-space-minimap').click();
  const actor=room.players.get(id),vent=room.mode.vents[0];actor.pos.set(vent.x,vent.y);actor.vel.set(0,0);
  await page.waitForTimeout(150);await page.keyboard.press('KeyV');
  await expect(page.locator('#space-vent-controls')).toBeVisible();
  await expect(page.locator('[data-vent="vent_react"]')).toBeEnabled();
  await page.screenshot({path:'.cache/space-vents.png'});
  await page.keyboard.press('ArrowUp');
  await expect.poll(()=>actor.ventId).toBe('vent_react');
  await expect(page.locator('[data-vent="vent_med"]')).toBeEnabled();
  await page.locator('[data-vent="vent_med"]').click();
  await expect.poll(()=>actor.ventId).toBe('vent_med');
  await expect(page.locator('#btn-space-exit-vent')).toBeEnabled();
  await page.locator('#btn-space-exit-vent').click();
  await expect.poll(()=>actor.isVented).toBe(false);
  room.mode.sabotage.cooldown=0;
  await page.locator('#btn-space-sabotage').click();await page.locator('#btn-sabotage-lights').click();
  await expect.poll(()=>page.evaluate(()=>window.gameApp.lastGameState.modeState.vision?.radius)).toBe(320);
  await expect.poll(()=>other.evaluate(()=>window.gameApp.lastGameState.modeState.vision?.radius)).toBe(120);
  await other.screenshot({path:'.cache/space-blackout.png'});
  const crew=room.players.get(crewId);crew.pos.set(room.mode.generator.x,room.mode.generator.y);crew.vel.set(0,0);
  await expect(other.locator('#btn-fix-sabotage-shortcut')).toBeEnabled();
  await other.locator('#btn-fix-sabotage-shortcut').click();await expect.poll(()=>room.mode.sabotage.active).toBe(false);
  room.mode.sabotage.cooldown=0;
  await page.locator('#btn-space-sabotage').click();await page.locator('#btn-sabotage-reactor').click();
  await expect.poll(()=>room.mode.sabotage.type).toBe('reactor');
  for(const [index,p] of [actor,crew].entries()){const panel=room.mode.reactorPanels[index];p.pos.set(panel.x,panel.y);p.vel.set(0,0);}
  await expect(page.locator('#btn-fix-sabotage-shortcut')).toBeEnabled();
  await expect(other.locator('#btn-fix-sabotage-shortcut')).toBeEnabled();
  await page.locator('#btn-fix-sabotage-shortcut').hover();await page.mouse.down();
  await expect.poll(()=>room.mode.sabotage.repairCount).toBe(1);
  await other.locator('#btn-fix-sabotage-shortcut').hover();await other.mouse.down();
  await expect.poll(()=>room.mode.sabotage.active).toBe(false);
  await page.mouse.up();await other.mouse.up();
  actor.isAlive=false;room.mode.checkWinConditions();
  await expect(page.locator('#space-result-title')).toHaveText('KAYBETTİN');
  await expect(other.locator('#space-result-title')).toHaveText('KAZANDIN');
  await expect(page.locator('#space-result-players tr')).toHaveCount(4);
  await expect(page.locator('#space-result-players tr.winner')).toHaveCount(3);
  await expect(page.locator('#space-result-players tr.loser')).toHaveCount(1);
  await page.screenshot({path:'.cache/space-results.png'});
  await page.waitForTimeout(5200);await expect(page.locator('#modal-space-result')).toBeVisible();
  await page.locator('#btn-space-close-result').click();await page.locator('#btn-space-show-result').click();
  await expect(page.locator('#modal-space-result')).toBeVisible();
  await page.locator('#btn-space-next-match').click();
  await expect.poll(()=>room.mode.gameState).toBe('playing');
  await expect(page.locator('#modal-space-result')).toBeHidden();
  room.mode.sabotage.cooldown=0;
  await page.locator('#btn-space-sabotage').click();await page.locator('#btn-sabotage-reactor').click();
  await expect.poll(()=>room.mode.sabotage.type).toBe('reactor');room.mode.sabotage.timer=0.1;
  await expect(page.locator('#space-result-title')).toHaveText('KAZANDIN');
  await expect(other.locator('#space-result-title')).toHaveText('KAYBETTİN');
  await page.screenshot({path:'.cache/space-impostor-victory.png'});
  room.removePlayer('fixture-crew');room.removePlayer('fixture-crew-2');await other.close();expect([...errors,...otherErrors]).toEqual([]);
});

test('puck: host stop presents red/blue squad results, a draw, and a fresh next match',async({page,browser})=>{
  test.setTimeout(90000);
  const errors=await lobby(page,'Kaptan');const room=await join(page,'puck');
  const guest=await browser.newPage();const guestErrors=await lobby(guest,'Rakip');await join(guest,'puck');
  for(let i=0;i<4;i++)room.addPlayer(`squad-${i}`,['Arda','Deniz','Ece','Mert'][i],'#f97316','⚽',null);
  const hostId=await page.evaluate(()=>window.gameApp.socket.myPlayerId);
  await page.locator('#btn-hud-start-match').click();await expect.poll(()=>room.mode.matchPhase).toBe('first_half');
  const hostTeam=room.players.get(hostId).team;
  room.mode.scoreRed=hostTeam==='red'?3:1;room.mode.scoreBlue=hostTeam==='blue'?3:1;
  await guest.evaluate(()=>window.gameApp.socket.sendAction({type:'stop_match'}));await page.waitForTimeout(100);
  expect(room.mode.matchPhase).toBe('first_half');
  await page.locator('#btn-open-esc-menu').click();await page.locator('#btn-host-toggle-match').click();
  await expect(page.locator('#puck-result-title')).toHaveText('KAZANDIN');
  await expect(guest.locator('#puck-result-title')).toHaveText('KAYBETTİN');
  await expect(page.locator('#puck-result-players tr')).toHaveCount(6);
  await expect(page.locator('#modal-puck-result .winning-team .squad-member')).toHaveCount(3);
  await expect(page.locator('#modal-puck-result .victory-confetti')).toBeVisible();
  await page.screenshot({path:'.cache/puck-squad-victory.png'});
  await page.locator('#btn-puck-close-result').click();await page.locator('#btn-puck-show-result').click();
  await expect(page.locator('#modal-puck-result')).toBeVisible();
  await page.locator('#btn-puck-next-match').click();await expect.poll(()=>room.mode.matchPhase).toBe('first_half');
  await expect(page.locator('#modal-puck-result')).toBeHidden();
  expect(room.mode.scoreRed).toBe(0);expect(room.mode.scoreBlue).toBe(0);
  room.mode.scoreRed=2;room.mode.scoreBlue=2;
  await page.locator('#btn-open-esc-menu').click();await page.locator('#btn-host-toggle-match').click();
  await expect(page.locator('#puck-result-title')).toHaveText('BERABERE');
  await expect(page.locator('#modal-puck-result .victory-confetti')).toHaveCount(0);
  await expect(page.locator('#puck-result-players tr.draw')).toHaveCount(6);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.cache/puck-mobile-draw.png'});
  for(let i=0;i<4;i++)room.removePlayer(`squad-${i}`);
  await guest.close();expect([...errors,...guestErrors]).toEqual([]);
});

test('space: lobby colors and real mouse/touch wire connections do not produce a solo victory',async({browser})=>{
  test.setTimeout(90000);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=await lobby(page,'Renkli');const room=await join(page,'space');
  const id=await page.evaluate(()=>window.gameApp.socket.myPlayerId),actor=room.players.get(id);
  const guest=room.addPlayer('color-fixture','Davetli','#2563eb','⚽',null);
  expect(guest.color).not.toBe(actor.color);
  await page.locator('#btn-space-color').click();
  await expect(page.locator(`.space-color-choice[data-color="${guest.color}"]`)).toBeDisabled();
  const choice=page.locator('.space-color-choice:not(:disabled)[aria-pressed="false"]').first();const color=await choice.getAttribute('data-color');
  await choice.click();await expect.poll(()=>actor.color).toBe(color);
  await page.screenshot({path:'.cache/space-color-picker.png'});
  await page.locator('#btn-close-space-color').click();room.removePlayer(guest.id);
  await page.locator('#btn-hud-start-match').click();await expect.poll(()=>room.mode.gameState).toBe('playing');
  await expect(page.locator('#btn-space-color')).toBeHidden();
  const task=room.mode.taskStations.find(t=>t.id==='task_wires_elec');actor.pos.set(task.x,task.y);actor.vel.set(0,0);
  await page.waitForTimeout(150);await page.locator('#btn-touch-action').tap();
  await expect(page.locator('#modal-task-interactive')).toBeVisible();
  const center=async selector=>{const b=await page.locator(selector).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};};
  const drag=async(from,to)=>{const a=await center(from),b=await center(to);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up();};
  await drag('#wire-left-col [data-color="red"]','#wire-right-col [data-color="blue"]');
  await expect(page.locator('#wire-svg path:not(.wire-preview)')).toHaveCount(0);
  await drag('#wire-left-col [data-color="red"]','#wire-right-col [data-color="red"]');
  await expect(page.locator('#wire-svg path:not(.wire-preview)')).toHaveCount(1);
  const cdp=await context.newCDPSession(page),a=await center('#wire-left-col [data-color="blue"]'),b=await center('#wire-right-col [data-color="blue"]');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[b]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  await expect(page.locator('#wire-svg path:not(.wire-preview)')).toHaveCount(2);
  await page.screenshot({path:'.cache/space-connected-wires.png'});
  for(const color of ['yellow','pink']){await page.locator(`#wire-left-col [data-color="${color}"]`).tap();await page.locator(`#wire-right-col [data-color="${color}"]`).tap();}
  await expect.poll(()=>room.mode.completedTasks,{timeout:10000}).toBe(1);
  await expect(page.locator('#modal-space-result')).toBeHidden();expect(room.mode.gameState).toBe('playing');
  expect(errors).toEqual([]);await context.close();
});

test('space: late spectator sees the team ceremony without gaining a victory or match XP',async({page,browser})=>{
  const errors=await lobby(page);const room=await join(page,'space');
  const id=await page.evaluate(()=>window.gameApp.socket.myPlayerId);
  for(let i=0;i<3;i++)room.addPlayer(`watch-fixture-${i}`,`Mürettebat ${i}`,'#22c55e','⚽',null);
  room.mode.checkRolesDistribution=()=>{for(const p of room.players.values())p.role=p.id===id?'impostor':'crew';};
  await page.locator('#btn-hud-start-match').click();await expect.poll(()=>room.mode.gameState).toBe('playing');
  const watcher=await browser.newPage();const watcherErrors=await lobby(watcher,'İzleyici');await join(watcher,'space');
  const viewerId=await watcher.evaluate(()=>window.gameApp.socket.myPlayerId);expect(room.players.get(viewerId).isSpectator).toBe(true);
  const before=await watcher.evaluate(()=>JSON.stringify(window.gameApp.profile.stats));
  room.players.get(id).isAlive=false;room.mode.checkWinConditions();
  await expect(watcher.locator('#space-result-title')).toHaveText('MAÇ TAMAMLANDI');
  await expect(watcher.locator('#space-result-players tr')).toHaveCount(4);
  await page.waitForTimeout(1400);
  expect(await watcher.evaluate(()=>JSON.stringify(window.gameApp.profile.stats))).toBe(before);
  expect([...errors,...watcherErrors]).toEqual([]);
  for(let i=0;i<3;i++)room.removePlayer(`watch-fixture-${i}`);await watcher.close();
});
