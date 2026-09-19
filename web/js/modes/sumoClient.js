// sumoClient.js - Frontend Client Module for Sumo Ring Knockout

import { BaseClientMode } from './BaseClientMode.js';

export class SumoClientMode extends BaseClientMode {
  constructor() {
    super('sumo');
    this.ringPulse = 0;
  }

  isFixedArena() {
    return true;
  }

  getArenaDimensions(gameState) {
    return {
      width: 1000,
      height: 1000
    };
  }

  onActivate(roomData, ui) {
    if (ui.hudPuck) ui.hudPuck.classList.add('hidden');
    if (ui.hudSumo) ui.hudSumo.classList.remove('hidden');
    if (ui.hudAgar) ui.hudAgar.classList.add('hidden');
    if (ui.hudSpace) ui.hudSpace.classList.add('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.add('hidden');
    if (ui.hudTeamSwitcher) ui.hudTeamSwitcher.classList.add('hidden');
  }

  onDeactivate(ui) {
    if (ui.hudSumo) ui.hudSumo.classList.add('hidden');
  }

  renderEnvironment(renderer, g, gameState) {
    const s = (gameState && gameState.modeState) || {};
    const radius = s.ringRadius || 420;

    this.ringPulse += 0.05;
    const pulseScale = 1 + Math.sin(this.ringPulse) * 0.02;

    // Outer Danger Acid/Fire Void
    g.beginFill(0x1a0505);
    g.drawCircle(0, 0, 700);
    g.endFill();

    // Danger Zone Hatch Pattern
    g.lineStyle(1, 0xef4444, 0.15);
    for (let r = radius + 20; r < 700; r += 35) {
      g.drawCircle(0, 0, r);
    }

    // Outer Glow of Ring
    g.lineStyle(0);
    g.beginFill(0xf59e0b, 0.15);
    g.drawCircle(0, 0, radius * pulseScale + 12);
    g.endFill();

    // Inner Safe Ring Floor
    g.beginFill(0x0f172a);
    g.drawCircle(0, 0, radius);
    g.endFill();

    // Center Yin-Yang / Ring Markings
    g.lineStyle(2, 0x334155, 0.6);
    g.drawCircle(0, 0, radius * 0.4);
    g.drawCircle(0, 0, radius * 0.7);

    // Active Shrinking Ring Border
    g.lineStyle(4, 0xf59e0b, 0.95);
    g.drawCircle(0, 0, radius);
  }

  renderEntities(renderer, g, gameState, entities, myPlayerId) {
    // Optional ring boundary sparks
  }

  updateHUD(ui, gameState, myPlayerId) {
    if (!ui) return;

    if (ui.hudPuck) ui.hudPuck.classList.add('hidden');
    if (ui.hudSumo) ui.hudSumo.classList.remove('hidden');
    if (ui.hudAgar) ui.hudAgar.classList.add('hidden');
    if (ui.hudSpace) ui.hudSpace.classList.add('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.add('hidden');
    if (ui.hudTeamSwitcher) ui.hudTeamSwitcher.classList.add('hidden');

    if (ui.hintAction) ui.hintAction.innerHTML = '⚡ <b>Boşluk / Sol Tık:</b> Ani Dash İtişi';
    if (ui.hintHold) ui.hintHold.innerHTML = '🛡️ <b>Savunma:</b> Dengeyi Koru';
    if (ui.btnTouchAction) ui.btnTouchAction.textContent = '⚡ DASH';
    if (ui.btnTouchHold) ui.btnTouchHold.classList.add('hidden');

    const s = gameState.modeState || {};
    if (s.roundState === 'round_over') {
      if (ui.sumoStatusText) ui.sumoStatusText.textContent = `Kazanan: ${s.winner || 'Berabere'}! 👑`;
    } else if (s.roundState === 'waiting') {
      if (ui.sumoStatusText) ui.sumoStatusText.textContent = '🥋 Isınma Modu (Rakipler Bekleniyor)';
    } else {
      if (ui.sumoStatusText) ui.sumoStatusText.textContent = `Çember Daralıyor! (${s.ringRadius || 400}m)`;
    }
  }
}
