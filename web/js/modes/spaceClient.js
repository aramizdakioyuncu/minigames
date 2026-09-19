// spaceClient.js - Frontend Client Module for Uzay Casusu (Space Infiltration)

import { BaseClientMode } from './BaseClientMode.js';

export class SpaceClientMode extends BaseClientMode {
  constructor() {
    super('space');
    this.beaconPulse = 0;
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
    if (ui.hudAgar) ui.hudAgar.classList.add('hidden');
    if (ui.hudSpace) ui.hudSpace.classList.remove('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.add('hidden');
    if (ui.hudTeamSwitcher) ui.hudTeamSwitcher.classList.add('hidden');
  }

  onDeactivate(ui) {
    if (ui.hudSpace) ui.hudSpace.classList.add('hidden');
    if (ui.modalMeeting) ui.modalMeeting.classList.add('hidden');
    if (ui.modalTaskInteractive) ui.modalTaskInteractive.classList.add('hidden');
  }

  renderEnvironment(renderer, g, gameState) {
    const s = (gameState && gameState.modeState) || {};
    const rooms = s.rooms || [];
    const walls = s.walls || [];

    // 1. Room Floor Plates
    rooms.forEach(r => {
      const color = parseInt((r.color || '#1e293b').replace('#', '0x'), 16) || 0x1e293b;
      g.beginFill(color, 0.45);
      g.drawRoundedRect(r.x, r.y, r.w, r.h, 12);
      g.endFill();

      // Subtle Room Border
      g.lineStyle(1.5, 0x38bdf8, 0.25);
      g.drawRoundedRect(r.x, r.y, r.w, r.h, 12);
    });

    // 2. Cafeteria Center Meeting Table
    g.lineStyle(3, 0x0284c7, 0.9);
    g.beginFill(0x0f172a, 0.9);
    g.drawCircle(0, 0, 48);
    g.endFill();

    // Emergency Red Button on Center Table
    g.lineStyle(2, 0xef4444, 1);
    g.beginFill(0xdc2626, 0.95);
    g.drawCircle(0, 0, 14);
    g.endFill();

    // 3. Starship Corridor & Room Walls
    g.lineStyle(6, 0x475569, 1);
    walls.forEach(w => {
      if (w.p1 && w.p2) {
        g.moveTo(w.p1.x, w.p1.y);
        g.lineTo(w.p2.x, w.p2.y);
      }
    });
  }

  renderEntities(renderer, g, gameState, entities, myPlayerId) {
    const s = (gameState && gameState.modeState) || {};
    this.beaconPulse += 0.06;

    // 1. Task Station Holographic Beacons
    const stations = s.taskStations || [];
    const myPlayerMeta = (s.playersMeta || []).find(p => p.id === myPlayerId);
    const completedList = (myPlayerMeta && myPlayerMeta.completedTasksList) || [];

    stations.forEach(st => {
      const isDone = completedList.includes(st.id);
      const beaconColor = isDone ? 0x10b981 : 0xeab308;
      const pulseSize = 12 + Math.sin(this.beaconPulse + st.x) * 3;

      // Glow Ring
      g.lineStyle(2, beaconColor, isDone ? 0.4 : 0.8);
      g.beginFill(beaconColor, isDone ? 0.1 : 0.25);
      g.drawCircle(st.x, st.y, pulseSize);
      g.endFill();

      // Station Base
      g.lineStyle(1.5, 0xffffff, 0.7);
      g.beginFill(0x1e293b);
      g.drawRect(st.x - 10, st.y - 10, 20, 20);
      g.endFill();
    });

    // 2. Vents (Visible to Impostor or as small floor grates)
    const vents = s.vents || [];
    vents.forEach(v => {
      g.lineStyle(2, 0x64748b, 0.8);
      g.beginFill(0x0f172a, 0.85);
      g.drawRoundedRect(v.x - 16, v.y - 12, 32, 24, 4);
      g.endFill();

      // Grate Lines
      g.lineStyle(1, 0x94a3b8, 0.6);
      g.moveTo(v.x - 10, v.y - 6); g.lineTo(v.x - 10, v.y + 6);
      g.moveTo(v.x, v.y - 6); g.lineTo(v.x, v.y + 6);
      g.moveTo(v.x + 10, v.y - 6); g.lineTo(v.x + 10, v.y + 6);
    });

    // 3. Dead Bodies
    const bodies = s.bodies || [];
    bodies.forEach(b => {
      const color = parseInt((b.color || '#ef4444').replace('#', '0x'), 16) || 0xef4444;
      g.lineStyle(2, 0x000000, 0.8);
      g.beginFill(color, 0.85);
      g.drawEllipse(b.x, b.y, 16, 11);
      g.endFill();

      // Bone detail
      g.lineStyle(2, 0xffffff, 0.95);
      g.moveTo(b.x - 4, b.y);
      g.lineTo(b.x + 4, b.y);
    });
  }

  updateHUD(ui, gameState, myPlayerId) {
    if (!ui) return;

    if (ui.hudPuck) ui.hudPuck.classList.add('hidden');
    if (ui.hudSumo) ui.hudSumo.classList.add('hidden');
    if (ui.hudAgar) ui.hudAgar.classList.add('hidden');
    if (ui.hudSpace) ui.hudSpace.classList.remove('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.add('hidden');
    if (ui.hudTeamSwitcher) ui.hudTeamSwitcher.classList.add('hidden');

    const s = gameState.modeState || {};
    const myPlayer = (gameState.players || []).find(p => p.id === myPlayerId);
    const isImpostor = myPlayer && myPlayer.role === 'impostor';

    // Update Task Bar
    const taskRatio = s.taskProgressRatio || 0;
    if (ui.taskProgressFill) ui.taskProgressFill.style.width = `${taskRatio}%`;
    if (ui.taskPercentText) ui.taskPercentText.textContent = `${taskRatio}%`;

    // Update Role Badge
    if (ui.spaceRoleBadge) {
      if (isImpostor) {
        ui.spaceRoleBadge.textContent = '🔪 CASUS (IMPOSTOR)';
        ui.spaceRoleBadge.className = 'space-role-pill space-role-impostor';
      } else {
        ui.spaceRoleBadge.textContent = '🛠️ MÜRETTEBAT (CREW)';
        ui.spaceRoleBadge.className = 'space-role-pill';
      }
    }

    // Hints & Mobile Buttons
    if (isImpostor) {
      if (ui.hintAction) ui.hintAction.innerHTML = '🔪 <b>Boşluk / Q:</b> Avla (Kill)';
      if (ui.hintHold) ui.hintHold.innerHTML = '🌀 <b>V:</b> Havalandırma (Vent)';
      if (ui.hintExtra) {
        ui.hintExtra.innerHTML = '🚨 <b>R:</b> Acil Rapor';
        ui.hintExtra.classList.remove('hidden');
      }
      if (ui.btnTouchAction) ui.btnTouchAction.textContent = '🔪 ÖLDÜR';
      if (ui.btnTouchHold) ui.btnTouchHold.classList.add('hidden');
      if (ui.btnTouchVent) ui.btnTouchVent.classList.remove('hidden');
      if (ui.btnTouchReport) ui.btnTouchReport.classList.remove('hidden');
    } else {
      if (ui.hintAction) ui.hintAction.innerHTML = '🛠️ <b>E / F:</b> Görev Yap (Task)';
      if (ui.hintHold) ui.hintHold.innerHTML = '🚨 <b>R:</b> Ceset Raporla';
      if (ui.hintExtra) ui.hintExtra.classList.add('hidden');
      if (ui.btnTouchAction) ui.btnTouchAction.textContent = '🛠️ GÖREV';
      if (ui.btnTouchHold) ui.btnTouchHold.classList.add('hidden');
      if (ui.btnTouchVent) ui.btnTouchVent.classList.add('hidden');
      if (ui.btnTouchReport) ui.btnTouchReport.classList.remove('hidden');
    }

    // Emergency Meeting Modal Toggle
    if (s.gameState === 'meeting') {
      if (ui.modalMeeting && ui.modalMeeting.classList.contains('hidden')) {
        ui.modalMeeting.classList.remove('hidden');
        ui.closeTaskMiniGame(); // Close task if meeting starts
      }
      if (ui.meetingTimerText) ui.meetingTimerText.textContent = s.meetingTimer !== undefined ? s.meetingTimer : 30;
      if (ui.meetingReasonText && s.meetingReason) ui.meetingReasonText.textContent = s.meetingReason;
      if (ui.skipVoteCount) ui.skipVoteCount.textContent = s.skipVotesCount || 0;

      const myPlayerMeta = (s.playersMeta || []).find(p => p.id === myPlayerId);
      const iHaveVoted = myPlayerMeta ? myPlayerMeta.hasVoted : false;
      const isMeDead = myPlayerMeta ? !myPlayerMeta.isAlive : false;

      if (ui.btnSkipVote) {
        if (iHaveVoted) {
          ui.btnSkipVote.disabled = true;
          ui.btnSkipVote.classList.add('voted-disabled');
          ui.btnSkipVote.innerHTML = `<span>✓ Oyunu Kullandın</span> <span class="skip-count-badge" id="skip-vote-count">${s.skipVotesCount || 0}</span>`;
        } else if (isMeDead) {
          ui.btnSkipVote.disabled = true;
          ui.btnSkipVote.classList.add('voted-disabled');
          ui.btnSkipVote.innerHTML = `<span>💀 Ölüler Oy Kullanamaz</span> <span class="skip-count-badge" id="skip-vote-count">${s.skipVotesCount || 0}</span>`;
        } else {
          ui.btnSkipVote.disabled = false;
          ui.btnSkipVote.classList.remove('voted-disabled');
          ui.btnSkipVote.innerHTML = `<span>Pas Geç (Oy Kullanma)</span> <span class="skip-count-badge" id="skip-vote-count">${s.skipVotesCount || 0}</span>`;
        }
      }

      ui.renderMeetingPlayers(s.playersMeta || [], myPlayerId);
    } else {
      if (ui.modalMeeting) ui.modalMeeting.classList.add('hidden');
    }
  }

  checkTaskInteraction(app) {
    if (!app || !app.lastGameState || app.lastGameState.mode !== 'space') return;
    const s = app.lastGameState.modeState || {};
    if (s.gameState === 'meeting') return;
    if (app.ui.modalTaskInteractive && !app.ui.modalTaskInteractive.classList.contains('hidden')) return;

    const myP = (app.lastGameState.players || []).find(p => p.id === app.socket.myPlayerId);
    if (!myP) return;

    const stations = s.taskStations || [];
    const playerMeta = (s.playersMeta || []).find(p => p.id === app.socket.myPlayerId);
    const completedList = (playerMeta && playerMeta.completedTasksList) || [];

    for (const st of stations) {
      if (completedList.includes(st.id)) continue;
      const dist = Math.hypot(myP.x - st.x, myP.y - st.y);
      if (dist <= 85) {
        app.ui.openTaskMiniGame(st, (taskId) => {
          app.socket.sendAction({ type: 'complete_task', taskId });
        });
        break;
      }
    }
  }
}
