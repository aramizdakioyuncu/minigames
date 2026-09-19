// puckClient.js - Frontend Client Module for Disk Football (Puck Mode)

import { BaseClientMode } from './BaseClientMode.js';

export class PuckClientMode extends BaseClientMode {
  constructor() {
    super('puck');
  }

  isFixedArena() {
    return true;
  }

  getArenaDimensions(gameState) {
    const s = (gameState && gameState.modeState) || {};
    return {
      width: s.width || 1200,
      height: s.height || 650
    };
  }

  onActivate(roomData, ui) {
    if (ui.hudPuck) ui.hudPuck.classList.remove('hidden');
    if (ui.hudSumo) ui.hudSumo.classList.add('hidden');
    if (ui.hudAgar) ui.hudAgar.classList.add('hidden');
    if (ui.hudSpace) ui.hudSpace.classList.add('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.add('hidden');
  }

  onDeactivate(ui) {
    if (ui.hudPuck) ui.hudPuck.classList.add('hidden');
    if (ui.hudTeamSwitcher) ui.hudTeamSwitcher.classList.add('hidden');
    if (ui.hudSpectatorBanner) ui.hudSpectatorBanner.classList.add('hidden');
  }

  renderEnvironment(renderer, g, gameState) {
    const s = (gameState && gameState.modeState) || {};
    const w = s.width || 1200;
    const h = s.height || 650;
    const hw = w / 2;
    const hh = h / 2;
    const goalD = s.goalDepth || 90;
    const goalH = s.goalHeight || 160;

    // Grass Field Base
    g.beginFill(0x134e2c);
    g.drawRoundedRect(-hw - 30, -hh - 30, w + 60, h + 60, 24);
    g.endFill();

    // Grass Stripes Pattern
    const stripeCount = 10;
    const stripeW = w / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      if (i % 2 === 0) {
        g.beginFill(0x155d34, 0.35);
        g.drawRect(-hw + i * stripeW, -hh, stripeW, h);
        g.endFill();
      }
    }

    // Outer Pitch Boundary Glow & Border
    g.lineStyle(3, 0xffffff, 0.75);
    g.drawRoundedRect(-hw, -hh, w, h, 16);

    // Halfway Line
    g.lineStyle(2, 0xffffff, 0.6);
    g.moveTo(0, -hh);
    g.lineTo(0, hh);

    // Center Circle & Spot
    g.drawCircle(0, 0, 90);
    g.beginFill(0xffffff, 0.8);
    g.drawCircle(0, 0, 4);
    g.endFill();

    // Left Goal Net & Area
    g.lineStyle(2, 0xf87171, 0.8);
    g.drawRect(-hw - goalD, -goalH / 2, goalD, goalH);
    g.lineStyle(2, 0xffffff, 0.5);
    g.drawRect(-hw, -130, 110, 260); // Left Penalty Box

    // Right Goal Net & Area
    g.lineStyle(2, 0x60a5fa, 0.8);
    g.drawRect(hw, -goalH / 2, goalD, goalH);
    g.lineStyle(2, 0xffffff, 0.5);
    g.drawRect(hw - 110, -130, 110, 260); // Right Penalty Box

    // Goal Posts (Pylons)
    const postRadius = 6;
    g.lineStyle(1, 0x1e293b, 1);
    // Left posts
    g.beginFill(0xffffff);
    g.drawCircle(-hw, -goalH / 2, postRadius);
    g.drawCircle(-hw, goalH / 2, postRadius);
    // Right posts
    g.drawCircle(hw, -goalH / 2, postRadius);
    g.drawCircle(hw, goalH / 2, postRadius);
    g.endFill();
  }

  renderEntities(renderer, g, gameState, entities, myPlayerId) {
    const s = (gameState && gameState.modeState) || {};
    const ball = s.ball || { x: 0, y: 0, vx: 0, vy: 0, r: 12 };

    // Smooth Ball Interpolation
    if (!renderer.ballState) renderer.ballState = { x: ball.x, y: ball.y, vx: 0, vy: 0, r: ball.r || 12 };
    const b = renderer.ballState;
    b.x += (ball.x - b.x) * 0.45;
    b.y += (ball.y - b.y) * 0.45;
    b.vx = ball.vx || 0;
    b.vy = ball.vy || 0;

    const ballSpeed = Math.hypot(b.vx, b.vy);

    // Ball Trail for high velocities
    if (ballSpeed > 3.5) {
      if (!renderer.ballTrail) renderer.ballTrail = [];
      renderer.ballTrail.push({ x: b.x, y: b.y, alpha: 0.6 });
      if (renderer.ballTrail.length > 8) renderer.ballTrail.shift();

      renderer.ballTrail.forEach((t, i) => {
        t.alpha *= 0.75;
        g.beginFill(0xffffff, t.alpha * 0.3);
        g.drawCircle(t.x, t.y, (b.r || 12) * (0.6 + (i / renderer.ballTrail.length) * 0.4));
        g.endFill();
      });
    } else if (renderer.ballTrail && renderer.ballTrail.length > 0) {
      renderer.ballTrail.shift();
    }

    // Ball Outer Glow
    g.beginFill(0xffffff, 0.15);
    g.drawCircle(b.x, b.y, (b.r || 12) + 6);
    g.endFill();

    // Ball Body
    g.lineStyle(2, 0x1e293b, 0.9);
    g.beginFill(0xf8fafc);
    g.drawCircle(b.x, b.y, b.r || 12);
    g.endFill();

    // Ball Center Pentagons Detail
    g.lineStyle(1.5, 0x0f172a, 0.8);
    g.beginFill(0x334155);
    g.drawCircle(b.x, b.y, (b.r || 12) * 0.35);
    g.endFill();

    // Render Magnet Holding Aura for Players
    const players = gameState.players || [];
    players.forEach(p => {
      if (p.isHoldingBall) {
        g.lineStyle(2, 0x38bdf8, 0.85);
        g.beginFill(0x38bdf8, 0.15);
        g.drawCircle(p.x, p.y, (p.r || 18) + 10);
        g.endFill();
      }
    });
  }

  updateHUD(ui, gameState, myPlayerId) {
    if (!ui) return;

    if (ui.hudPuck) ui.hudPuck.classList.remove('hidden');
    if (ui.hudSumo) ui.hudSumo.classList.add('hidden');
    if (ui.hudAgar) ui.hudAgar.classList.add('hidden');
    if (ui.hudSpace) ui.hudSpace.classList.add('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.add('hidden');

    const s = gameState.modeState || {};
    const isMatchActive = !!s.isMatchActive;
    const matchPhase = s.matchPhase || 'waiting';

    if (ui.hudTeamSwitcher) {
      ui.hudTeamSwitcher.classList.toggle('hidden', isMatchActive);
    }

    const myP = (gameState.players || []).find(p => p.id === myPlayerId);
    const isSpec = myP ? !!myP.isSpectator : false;
    const currentTeam = myP ? (myP.isSpectator ? 'spec' : myP.team) : null;

    // Update active team button highlight
    const teamBtns = document.querySelectorAll('.btn-team');
    teamBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.team === currentTeam);
    });

    // Show/Hide Floating Spectator Banner
    if (ui.hudSpectatorBanner) {
      ui.hudSpectatorBanner.classList.toggle('hidden', !isSpec || isMatchActive);
    }

    if (isSpec) {
      if (ui.hintAction) ui.hintAction.innerHTML = isMatchActive ? '👁️ <b>İzleyici Modu:</b> Maç oynanıyor, tribünden izliyorsun' : '👁️ <b>İzleyici Modu:</b> Sahada oynamak için sol üstten veya alttan takım seç';
      if (ui.hintHold) ui.hintHold.innerHTML = '🎮 <b>WASD:</b> Tribünde Gezin';
    } else {
      if (ui.hintAction) ui.hintAction.innerHTML = '⚡ <b>Boşluk / Sol Tık:</b> Şut & Pas';
      if (ui.hintHold) ui.hintHold.innerHTML = '🧲 <b>Shift / E / Sağ Tık:</b> Top Tut & Çalım (2sn)';
    }
    if (ui.btnTouchAction) ui.btnTouchAction.textContent = '⚡ ŞUT';
    if (ui.btnTouchHold) {
      ui.btnTouchHold.textContent = '🧲 TUT';
      ui.btnTouchHold.classList.toggle('hidden', isSpec);
    }

    if (ui.scoreRed) ui.scoreRed.textContent = s.scoreRed !== undefined ? s.scoreRed : 0;
    if (ui.scoreBlue) ui.scoreBlue.textContent = s.scoreBlue !== undefined ? s.scoreBlue : 0;

    // Phase badge handling
    if (ui.puckPhaseBadge) {
      if (matchPhase === 'waiting') {
        ui.puckPhaseBadge.textContent = '⚽ ISINMA MODU';
        ui.puckPhaseBadge.className = 'puck-phase-badge';
      } else if (matchPhase === 'first_half') {
        ui.puckPhaseBadge.textContent = '1. DEVRE';
        ui.puckPhaseBadge.className = 'puck-phase-badge';
      } else if (matchPhase === 'half_time') {
        ui.puckPhaseBadge.textContent = `⏸️ DEVRE ARASI (${s.halfTimeTimer !== undefined ? s.halfTimeTimer : 10}s)`;
        ui.puckPhaseBadge.className = 'puck-phase-badge halftime';
      } else if (matchPhase === 'second_half') {
        ui.puckPhaseBadge.textContent = '2. DEVRE';
        ui.puckPhaseBadge.className = 'puck-phase-badge';
      } else if (matchPhase === 'game_over') {
        ui.puckPhaseBadge.textContent = '🏁 MAÇ BİTTİ';
        ui.puckPhaseBadge.className = 'puck-phase-badge gameover';
      }
    }

    const time = s.timeRemaining !== undefined ? s.timeRemaining : 0;
    const mins = Math.floor(time / 60).toString().padStart(2, '0');
    const secs = (time % 60).toString().padStart(2, '0');
    if (ui.matchTimer) ui.matchTimer.textContent = `${mins}:${secs}`;
  }
}
