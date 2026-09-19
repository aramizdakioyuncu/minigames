// agarClient.js - Frontend Client Module for Agar Feed & Split

import { BaseClientMode } from './BaseClientMode.js';

export class AgarClientMode extends BaseClientMode {
  constructor() {
    super('agar');
  }

  isFixedArena() {
    return false;
  }

  getArenaDimensions(gameState) {
    const s = (gameState && gameState.modeState) || {};
    return {
      width: s.width || 1800,
      height: s.height || 1200
    };
  }

  onActivate(roomData, ui) {
    if (ui.hudPuck) ui.hudPuck.classList.add('hidden');
    if (ui.hudSumo) ui.hudSumo.classList.add('hidden');
    if (ui.hudAgar) ui.hudAgar.classList.remove('hidden');
    if (ui.hudSpace) ui.hudSpace.classList.add('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.remove('hidden');
    if (ui.hudTeamSwitcher) ui.hudTeamSwitcher.classList.add('hidden');
  }

  onDeactivate(ui) {
    if (ui.hudAgar) ui.hudAgar.classList.add('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.add('hidden');
  }

  renderEnvironment(renderer, g, gameState) {
    const s = (gameState && gameState.modeState) || {};
    const w = s.width || 1800;
    const h = s.height || 1200;
    const hw = w / 2;
    const hh = h / 2;

    // Dark Cell Void Background
    g.beginFill(0x060913);
    g.drawRect(-hw, -hh, w, h);
    g.endFill();

    // Subtle Grid Gridlines
    const gridSize = 60;
    g.lineStyle(1, 0x1e293b, 0.4);

    for (let x = -hw; x <= hw; x += gridSize) {
      g.moveTo(x, -hh);
      g.lineTo(x, hh);
    }
    for (let y = -hh; y <= hh; y += gridSize) {
      g.moveTo(-hw, y);
      g.lineTo(hw, y);
    }

    // Outer Boundary Glow
    g.lineStyle(4, 0x38bdf8, 0.7);
    g.drawRect(-hw, -hh, w, h);
  }

  renderEntities(renderer, g, gameState, entities, myPlayerId) {
    const s = (gameState && gameState.modeState) || {};

    // 1. Food Pellets
    const pellets = s.pellets || [];
    pellets.forEach(p => {
      const color = parseInt((p.color || '#38bdf8').replace('#', '0x'), 16) || 0x38bdf8;
      g.lineStyle(0);
      g.beginFill(color, 0.85);
      g.drawCircle(p.x, p.y, p.r || 5);
      g.endFill();
    });

    // 2. Ejected Food Mass
    const ejected = s.ejectedPellets || [];
    ejected.forEach(ep => {
      const color = parseInt((ep.color || '#f59e0b').replace('#', '0x'), 16) || 0xf59e0b;
      g.lineStyle(1, 0xffffff, 0.5);
      g.beginFill(color, 0.9);
      g.drawCircle(ep.x, ep.y, ep.r || 7);
      g.endFill();
    });

    // 3. Virus Spiky Green Cells
    const viruses = s.viruses || [];
    viruses.forEach(v => {
      const spikes = 16;
      const outerR = v.r || 35;
      const innerR = outerR * 0.82;
      const step = Math.PI / spikes;

      g.lineStyle(3, 0x16a34a, 1);
      g.beginFill(0x22c55e, 0.75);

      let angle = 0;
      g.moveTo(v.x + Math.cos(angle) * outerR, v.y + Math.sin(angle) * outerR);

      for (let i = 0; i < spikes; i++) {
        angle += step;
        g.lineTo(v.x + Math.cos(angle) * innerR, v.y + Math.sin(angle) * innerR);
        angle += step;
        g.lineTo(v.x + Math.cos(angle) * outerR, v.y + Math.sin(angle) * outerR);
      }
      g.closePath();
      g.endFill();
    });
  }

  updateHUD(ui, gameState, myPlayerId) {
    if (!ui) return;

    if (ui.hudPuck) ui.hudPuck.classList.add('hidden');
    if (ui.hudSumo) ui.hudSumo.classList.add('hidden');
    if (ui.hudAgar) ui.hudAgar.classList.remove('hidden');
    if (ui.hudSpace) ui.hudSpace.classList.add('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.remove('hidden');
    if (ui.hudTeamSwitcher) ui.hudTeamSwitcher.classList.add('hidden');

    if (ui.hintAction) ui.hintAction.innerHTML = '✂️ <b>Boşluk / Sol Tık:</b> İkiye Bölün (Split)';
    if (ui.hintHold) ui.hintHold.innerHTML = '🍇 <b>E / W / Sağ Tık:</b> Yem At (Feed)';
    if (ui.btnTouchAction) ui.btnTouchAction.textContent = '✂️ BÖLÜN';
    if (ui.btnTouchHold) {
      ui.btnTouchHold.textContent = '🍇 YEM AT';
      ui.btnTouchHold.classList.remove('hidden');
    }

    const myPlayer = (gameState.players || []).find(p => p.id === myPlayerId);
    const myScore = myPlayer ? Math.floor(myPlayer.score || 0) : 0;
    if (ui.agarMyScore) ui.agarMyScore.textContent = myScore;

    // Render Live Leaderboard / Scoreboard
    const leaderboard = (gameState.modeState && gameState.modeState.leaderboard) || [];
    ui.renderLeaderboard(leaderboard, myPlayerId);
  }
}
