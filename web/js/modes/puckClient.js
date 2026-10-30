// puckClient.js - Frontend Client Module for Disk Football (Puck Mode)

import { BaseClientMode } from './BaseClientMode.js';
import { MatchResults } from '../ui/matchResults.js';

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
      width: (s.width || 1200) + 160,
      height: (s.height || 650) + 260
    };
  }

  onActivate(roomData, ui) {
    if(!this.results)this.results=new MatchResults('puck',document.querySelector('.hud-top-right'));
    this.results.reset();
    if (ui.hudPuck) ui.hudPuck.classList.remove('hidden');
    if (ui.hudSumo) ui.hudSumo.classList.add('hidden');
    if (ui.hudAgar) ui.hudAgar.classList.add('hidden');
    if (ui.hudSpace) ui.hudSpace.classList.add('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.add('hidden');
  }

  onDeactivate(ui) {
    this.results?.reset();
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

    // 1. Stadium Concourse & Ground Base (Dark Outer Arena)
    g.beginFill(0x0a0f1d);
    g.drawRoundedRect(-hw - 80, -hh - 130, w + 160, h + 260, 24);
    g.endFill();

    // 2. TOP TRIBUNE (VIP & Seyirci Kuzey Tribünü)
    // Concourse Floor Plate
    g.beginFill(0x131d31);
    g.drawRoundedRect(-hw - 35, -hh - 120, w + 70, 110, 12);
    g.endFill();

    // Seating Tier Lines
    g.lineStyle(1.5, 0x1e293b, 1);
    g.moveTo(-hw - 25, -hh - 90); g.lineTo(hw + 25, -hh - 90);
    g.moveTo(-hw - 25, -hh - 60); g.lineTo(hw + 25, -hh - 60);
    g.moveTo(-hw - 25, -hh - 30); g.lineTo(hw + 25, -hh - 30);

    // Render Rows of Stadium Seats
    const seatCols = 42;
    const seatStep = (w + 40) / seatCols;
    const seatColors = [0xdc2626, 0x2563eb, 0x0284c7, 0xf59e0b, 0x64748b];
    for (let r = 0; r < 3; r++) {
      const sy = -hh - 100 + r * 28;
      for (let c = 0; c < seatCols; c++) {
        const sx = -hw - 15 + c * seatStep;
        // Skip dugout areas in bottom row
        if (r === 2 && (Math.abs(sx - (-hw * 0.4)) < 80 || Math.abs(sx - (hw * 0.4)) < 80)) continue;
        const color = seatColors[(r * 7 + c) % seatColors.length];
        g.lineStyle(1, 0x000000, 0.6);
        g.beginFill(color, 0.75);
        g.drawRoundedRect(sx, sy, 14, 10, 2.5);
        g.endFill();
      }
    }

    // Top VIP Barrier Glass Railing
    g.lineStyle(3, 0x38bdf8, 0.85);
    g.moveTo(-hw - 30, -hh - 10);
    g.lineTo(hw + 30, -hh - 10);
    // Railing Glass Posts
    g.lineStyle(1.5, 0x94a3b8, 0.8);
    for (let x = -hw - 30; x <= hw + 30; x += 60) {
      g.moveTo(x, -hh - 10);
      g.lineTo(x, -hh);
    }

    // Top Tribune Center Badge / Banner Plate
    g.lineStyle(2, 0x0284c7, 0.9);
    g.beginFill(0x0c4a6e, 0.95);
    g.drawRoundedRect(-170, -hh - 122, 340, 22, 6);
    g.endFill();

    // 3. BOTTOM TRIBUNE (Güney Tribünü & Seyirci Alanı)
    // Concourse Floor Plate
    g.beginFill(0x131d31);
    g.drawRoundedRect(-hw - 35, hh + 10, w + 70, 110, 12);
    g.endFill();

    // Seating Tier Lines
    g.lineStyle(1.5, 0x1e293b, 1);
    g.moveTo(-hw - 25, hh + 40); g.lineTo(hw + 25, hh + 40);
    g.moveTo(-hw - 25, hh + 70); g.lineTo(hw + 25, hh + 70);
    g.moveTo(-hw - 25, hh + 100); g.lineTo(hw + 25, hh + 100);

    // Render Rows of Stadium Seats
    for (let r = 0; r < 3; r++) {
      const sy = hh + 20 + r * 28;
      for (let c = 0; c < seatCols; c++) {
        const sx = -hw - 15 + c * seatStep;
        const color = seatColors[(r * 5 + c * 3) % seatColors.length];
        g.lineStyle(1, 0x000000, 0.6);
        g.beginFill(color, 0.75);
        g.drawRoundedRect(sx, sy, 14, 10, 2.5);
        g.endFill();
      }
    }

    // Bottom Tribune Barrier Glass Railing
    g.lineStyle(3, 0x38bdf8, 0.85);
    g.moveTo(-hw - 30, hh + 10);
    g.lineTo(hw + 30, hh + 10);
    // Railing Glass Posts
    g.lineStyle(1.5, 0x94a3b8, 0.8);
    for (let x = -hw - 30; x <= hw + 30; x += 60) {
      g.moveTo(x, hh);
      g.lineTo(x, hh + 10);
    }

    // Bottom Tribune Center Badge / Banner Plate
    g.lineStyle(2, 0x0284c7, 0.9);
    g.beginFill(0x0c4a6e, 0.95);
    g.drawRoundedRect(-170, hh + 100, 340, 22, 6);
    g.endFill();

    // 4. Team Dugouts (Yedek Kulübeleri)
    // Red Dugout
    g.lineStyle(2, 0xef4444, 0.95);
    g.beginFill(0x450a0a, 0.9);
    g.drawRoundedRect(-hw * 0.4 - 70, -hh - 28, 140, 20, 5);
    g.endFill();
    // Blue Dugout
    g.lineStyle(2, 0x3b82f6, 0.95);
    g.beginFill(0x172554, 0.9);
    g.drawRoundedRect(hw * 0.4 - 70, -hh - 28, 140, 20, 5);
    g.endFill();

    // 5. 4 Corner Stadium Floodlight Towers
    const floodlights = [
      { x: -hw - 60, y: -hh - 105 },
      { x: hw + 60, y: -hh - 105 },
      { x: -hw - 60, y: hh + 105 },
      { x: hw + 60, y: hh + 105 }
    ];
    floodlights.forEach(fl => {
      // Tower Pole Base
      g.lineStyle(2, 0x475569, 1);
      g.beginFill(0x1e293b, 1);
      g.drawCircle(fl.x, fl.y, 14);
      g.endFill();

      // Glowing Spotlights
      g.lineStyle(1, 0x38bdf8, 0.9);
      g.beginFill(0xe0f2fe, 0.95);
      g.drawCircle(fl.x - 5, fl.y - 5, 4);
      g.drawCircle(fl.x + 5, fl.y - 5, 4);
      g.drawCircle(fl.x - 5, fl.y + 5, 4);
      g.drawCircle(fl.x + 5, fl.y + 5, 4);
      g.endFill();

      // Soft Light Glow
      g.beginFill(0x38bdf8, 0.08);
      g.drawCircle(fl.x, fl.y, 45);
      g.endFill();
    });

    // 6. Grass Field Base
    g.lineStyle(0);
    g.beginFill(0x134e2c);
    g.drawRoundedRect(-hw - 15, -hh - 10, w + 30, h + 20, 16);
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

    // Outer Pitch Boundary Line & Glow
    g.lineStyle(3.5, 0xffffff, 0.9);
    g.drawRoundedRect(-hw, -hh, w, h, 14);

    // Halfway Line
    g.lineStyle(2, 0xffffff, 0.7);
    g.moveTo(0, -hh);
    g.lineTo(0, hh);

    // Center Circle & Spot
    g.drawCircle(0, 0, 90);
    g.beginFill(0xffffff, 0.85);
    g.drawCircle(0, 0, 4);
    g.endFill();

    // Goal Colors (Swapped in 2nd half when teams change sides!)
    const isSecondHalf = s.matchPhase === 'second_half';
    const leftGoalColor = isSecondHalf ? 0x60a5fa : 0xf87171;
    const rightGoalColor = isSecondHalf ? 0xf87171 : 0x60a5fa;

    // Left Goal Net & Area
    g.lineStyle(2.5, leftGoalColor, 0.95);
    g.drawRect(-hw - goalD, -goalH / 2, goalD, goalH);
    g.lineStyle(2, 0xffffff, 0.6);
    g.drawRect(-hw, -130, 110, 260); // Left Penalty Box

    // Right Goal Net & Area
    g.lineStyle(2.5, rightGoalColor, 0.95);
    g.drawRect(hw, -goalH / 2, goalD, goalH);
    g.lineStyle(2, 0xffffff, 0.6);
    g.drawRect(hw - 110, -130, 110, 260); // Right Penalty Box

    // Goal Posts (Pylons)
    const postRadius = 6;
    g.lineStyle(1.5, 0x0f172a, 1);
    g.beginFill(0xffffff);
    // Left posts
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
    this.results?.update(gameState,myPlayerId);
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
