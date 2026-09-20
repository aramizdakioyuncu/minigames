// spaceClient.js - Frontend Client Module for Uzay Casusu (Space Infiltration)

import { BaseClientMode } from './BaseClientMode.js';

export class SpaceClientMode extends BaseClientMode {
  constructor() {
    super('space');
    this.beaconPulse = 0;
    this.fogTime = 0;
    // Ambient cosmic mist particles
    this.mistParticles = Array.from({ length: 45 }, () => ({
      x: (Math.random() - 0.5) * 2600,
      y: (Math.random() - 0.5) * 1600,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.3,
      r: 40 + Math.random() * 60,
      alpha: 0.08 + Math.random() * 0.12
    }));
  }

  isFixedArena() {
    return false;
  }

  getArenaDimensions(gameState) {
    const s = (gameState && gameState.modeState) || {};
    return {
      width: s.width || 2800,
      height: s.height || 1800
    };
  }

  onActivate(roomData, ui) {
    if (ui.hudPuck) ui.hudPuck.classList.add('hidden');
    if (ui.hudSumo) ui.hudSumo.classList.add('hidden');
    if (ui.hudAgar) ui.hudAgar.classList.add('hidden');
    if (ui.hudSpace) ui.hudSpace.classList.remove('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.add('hidden');
    if (ui.hudTeamSwitcher) ui.hudTeamSwitcher.classList.add('hidden');
    if (ui.hudChat) ui.hudChat.classList.add('hidden');
  }

  onDeactivate(ui) {
    if (ui.hudSpace) ui.hudSpace.classList.add('hidden');
    if (ui.modalMeeting) ui.modalMeeting.classList.add('hidden');
    if (ui.modalTaskInteractive) ui.modalTaskInteractive.classList.add('hidden');
    if (ui.hudChat) ui.hudChat.classList.remove('hidden');
  }

  renderEnvironment(renderer, g, gameState) {
    const s = (gameState && gameState.modeState) || {};
    const w = s.width || 2800;
    const h = s.height || 1800;
    const hw = w / 2;
    const hh = h / 2;
    const rooms = s.rooms || [];
    const walls = s.walls || [];

    // 1. Deep Space Background Void
    g.beginFill(0x02040a);
    g.drawRect(-hw - 300, -hh - 300, w + 600, h + 600);
    g.endFill();

    // Starfield Points
    for (let i = -hw; i < hw; i += 280) {
      for (let j = -hh; j < hh; j += 280) {
        g.beginFill(0xffffff, 0.25);
        g.drawCircle(i + (Math.sin(i * 13 + j) * 80), j + (Math.cos(j * 17 + i) * 80), 1.5);
        g.endFill();
      }
    }

    // 2. Spaceship Floor Deck Plate
    g.beginFill(0x090e1a);
    g.drawRoundedRect(-hw + 30, -hh + 30, w - 60, h - 60, 32);
    g.endFill();

    // Corridor Gridlines
    g.lineStyle(1, 0x1e293b, 0.3);
    for (let x = -hw + 100; x < hw - 100; x += 120) {
      g.moveTo(x, -hh + 50); g.lineTo(x, hh - 50);
    }
    for (let y = -hh + 100; y < hh - 100; y += 120) {
      g.moveTo(-hw + 50, y); g.lineTo(hw - 50, y);
    }

    // 3. Themed Room Floor Plates
    rooms.forEach(r => {
      let roomColor = 0x131c2e;
      let borderColor = 0x0284c7;

      if (r.id === 'reactor') { roomColor = 0x142820; borderColor = 0x10b981; }
      else if (r.id === 'electrical') { roomColor = 0x241d13; borderColor = 0xf59e0b; }
      else if (r.id === 'medbay') { roomColor = 0x0f2428; borderColor = 0x06b6d4; }
      else if (r.id === 'cockpit') { roomColor = 0x161c33; borderColor = 0x6366f1; }
      else if (r.id === 'security') { roomColor = 0x24151e; borderColor = 0xf43f5e; }
      else if (r.id === 'o2') { roomColor = 0x10281b; borderColor = 0x22c55e; }
      else if (r.id === 'storage') { roomColor = 0x201c18; borderColor = 0xd97706; }

      g.beginFill(roomColor, 0.65);
      g.drawRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 16);
      g.endFill();

      // Subtle Room Border
      g.lineStyle(2, borderColor, 0.45);
      g.drawRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 16);
    });

    // 4. Cafeteria Center Meeting Table
    g.lineStyle(4, 0x0284c7, 0.95);
    g.beginFill(0x0f172a, 0.95);
    g.drawCircle(0, -30, 60);
    g.endFill();

    // Emergency Red Button on Center Table
    g.lineStyle(2.5, 0xef4444, 1);
    g.beginFill(0xdc2626, 0.95);
    g.drawCircle(0, -30, 18);
    g.endFill();

    // 5. Automatic Sliding Airlock Doors
    const doors = s.doors || [];
    doors.forEach(d => {
      const isH = d.orientation === 'h';
      const isOpen = d.isOpen;
      const dw = d.w || (isH ? 180 : 28);
      const dh = d.h || (isH ? 28 : 160);

      // Outer Frame
      g.lineStyle(2, isOpen ? 0x10b981 : 0xef4444, 0.85);
      g.beginFill(0x0f172a, 0.9);
      g.drawRect(d.x - dw / 2, d.y - dh / 2, dw, dh);
      g.endFill();

      // Sliding blast panels
      if (!isOpen) {
        g.lineStyle(2, 0x64748b, 0.9);
        g.beginFill(0x334155, 0.95);
        g.drawRect(d.x - dw / 2 + 2, d.y - dh / 2 + 2, dw - 4, dh - 4);
        g.endFill();

        // Center seam & Hazard Stripes
        g.lineStyle(2, 0xfacc15, 0.8);
        if (isH) {
          g.moveTo(d.x, d.y - dh / 2 + 2);
          g.lineTo(d.x, d.y + dh / 2 - 2);
        } else {
          g.moveTo(d.x - dw / 2 + 2, d.y);
          g.lineTo(d.x + dw / 2 - 2, d.y);
        }
      } else {
        // Open sliding state (split panels on sides)
        g.lineStyle(1, 0x10b981, 0.7);
        g.beginFill(0x1e293b, 0.7);
        if (isH) {
          g.drawRect(d.x - dw / 2, d.y - dh / 2, 24, dh);
          g.drawRect(d.x + dw / 2 - 24, d.y - dh / 2, 24, dh);
        } else {
          g.drawRect(d.x - dw / 2, d.y - dh / 2, dw, 24);
          g.drawRect(d.x - dw / 2, d.y + dh / 2 - 24, dw, 24);
        }
        g.endFill();
      }

      // Status LED indicator
      g.lineStyle(0);
      g.beginFill(isOpen ? 0x22c55e : 0xef4444, 1);
      g.drawCircle(d.x, d.y, 4);
      g.endFill();
    });

    // 6. Starship Hull & Room Walls
    g.lineStyle(7, 0x334155, 1);
    walls.forEach(w => {
      if (w.p1 && w.p2) {
        g.moveTo(w.p1.x, w.p1.y);
        g.lineTo(w.p2.x, w.p2.y);
      }
    });

    // Outer hull glowing neon seam
    g.lineStyle(2, 0x38bdf8, 0.55);
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
    this.fogTime += 0.02;

    const myPlayer = (gameState.players || []).find(p => p.id === myPlayerId);
    const myPos = myPlayer ? { x: myPlayer.x, y: myPlayer.y } : { x: 0, y: 0 };
    const isMeeting = s.gameState === 'meeting';
    const isLobby = s.gameState === 'waiting';
    const isImpostor = myPlayer && myPlayer.role === 'impostor';
    const isDead = myPlayer && !myPlayer.isAlive;

    // Vision radius: Crewmate 280px, Impostor 360px, Ghost/Meeting full
    const visionRadius = (isDead || isMeeting) ? 2200 : (isLobby ? 420 : (isImpostor ? 360 : 280));

    // 1. Task Station Holographic Beacons
    const stations = s.taskStations || [];
    const myPlayerMeta = (s.playersMeta || []).find(p => p.id === myPlayerId);
    const completedList = (myPlayerMeta && myPlayerMeta.completedTasksList) || [];

    stations.forEach(st => {
      const isDone = completedList.includes(st.id);
      const beaconColor = isDone ? 0x10b981 : 0xeab308;
      const pulseSize = 14 + Math.sin(this.beaconPulse + st.x) * 3.5;

      // Glow Ring
      g.lineStyle(2, beaconColor, isDone ? 0.4 : 0.85);
      g.beginFill(beaconColor, isDone ? 0.1 : 0.25);
      g.drawCircle(st.x, st.y, pulseSize);
      g.endFill();

      // Station Base
      g.lineStyle(1.5, 0xffffff, 0.7);
      g.beginFill(0x1e293b);
      g.drawRect(st.x - 12, st.y - 12, 24, 24);
      g.endFill();
    });

    // 2. Vents (Visible to Impostor with red glow, or normal grate for crew)
    const vents = s.vents || [];
    vents.forEach(v => {
      const ventGlow = isImpostor ? 0xef4444 : 0x64748b;
      g.lineStyle(2, ventGlow, isImpostor ? 0.9 : 0.7);
      g.beginFill(0x0f172a, 0.9);
      g.drawRoundedRect(v.x - 18, v.y - 14, 36, 28, 5);
      g.endFill();

      // Grate Lines
      g.lineStyle(1.5, isImpostor ? 0xf87171 : 0x94a3b8, 0.7);
      g.moveTo(v.x - 10, v.y - 7); g.lineTo(v.x - 10, v.y + 7);
      g.moveTo(v.x, v.y - 7); g.lineTo(v.x, v.y + 7);
      g.moveTo(v.x + 10, v.y - 7); g.lineTo(v.x + 10, v.y + 7);
    });

    // 3. Dead Bodies
    const bodies = s.bodies || [];
    bodies.forEach(b => {
      const dist = Math.hypot(b.x - myPos.x, b.y - myPos.y);
      if (!isDead && !isMeeting && dist > visionRadius + 60) return; // Hidden in fog

      const color = parseInt((b.color || '#ef4444').replace('#', '0x'), 16) || 0xef4444;
      g.lineStyle(2, 0x000000, 0.85);
      g.beginFill(color, 0.9);
      g.drawEllipse(b.x, b.y, 18, 12);
      g.endFill();

      // Bone detail
      g.lineStyle(2.5, 0xffffff, 0.95);
      g.moveTo(b.x - 5, b.y);
      g.lineTo(b.x + 5, b.y);
    });

    // 4. ATMOSPHERIC FOG OF WAR (Sis & Görüş Alanı)
    if (!isDead && !isMeeting) {
      // Shroud outer space outside vision circle
      const outerR = 1800;
      const stepCount = 8;
      for (let i = 0; i < stepCount; i++) {
        const ringInner = visionRadius * (0.75 + (i * 0.1));
        const ringThickness = visionRadius * 0.12;
        const ringAlpha = (i / (stepCount - 1)) * 0.88;

        g.lineStyle(ringThickness, 0x030712, ringAlpha);
        g.drawCircle(myPos.x, myPos.y, ringInner + ringThickness / 2);
      }

      // Outer Absolute Darkness Mask
      g.lineStyle(outerR, 0x030712, 0.97);
      g.drawCircle(myPos.x, myPos.y, visionRadius * 1.55 + outerR / 2);

      // Subtle Flashlight / Vision Edge Halo
      g.lineStyle(3, isImpostor ? 0xef4444 : 0x38bdf8, 0.25);
      g.drawCircle(myPos.x, myPos.y, visionRadius * 0.95);

      // 5. Dynamic Cosmic Mist / Floating Space Fog Particles
      this.mistParticles.forEach((m, idx) => {
        m.x += m.vx;
        m.y += m.vy;
        if (m.x < -1400) m.x = 1400;
        if (m.x > 1400) m.x = -1400;
        if (m.y < -900) m.y = 900;
        if (m.y > 900) m.y = -900;

        const pDist = Math.hypot(m.x - myPos.x, m.y - myPos.y);
        if (pDist <= visionRadius + 120) {
          const pulse = Math.sin(this.fogTime + idx) * 0.05;
          g.lineStyle(0);
          g.beginFill(0x1e293b, Math.max(0.04, m.alpha + pulse));
          g.drawCircle(m.x, m.y, m.r);
          g.endFill();
        }
      });
    }
  }

  updateHUD(ui, gameState, myPlayerId) {
    if (!ui) return;

    if (ui.hudPuck) ui.hudPuck.classList.add('hidden');
    if (ui.hudSumo) ui.hudSumo.classList.add('hidden');
    if (ui.hudAgar) ui.hudAgar.classList.add('hidden');
    if (ui.hudSpace) ui.hudSpace.classList.remove('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.add('hidden');
    if (ui.hudTeamSwitcher) ui.hudTeamSwitcher.classList.add('hidden');
    if (ui.hudChat) ui.hudChat.classList.add('hidden');

    const s = gameState.modeState || {};
    const myPlayer = (gameState.players || []).find(p => p.id === myPlayerId);
    const isLobby = s.gameState === 'waiting';
    const isImpostor = !isLobby && myPlayer && myPlayer.role === 'impostor';

    // Update Task Bar
    const taskRatio = s.taskProgressRatio || 0;
    if (ui.taskProgressFill) ui.taskProgressFill.style.width = `${taskRatio}%`;
    if (ui.taskPercentText) ui.taskPercentText.textContent = `${taskRatio}%`;

    // Update Role Badge
    if (ui.spaceRoleBadge) {
      if (isLobby) {
        ui.spaceRoleBadge.textContent = '🛸 LOBİ (Isınma & Serbest Gezinti)';
        ui.spaceRoleBadge.className = 'space-role-pill space-role-lobby';
      } else if (isImpostor) {
        ui.spaceRoleBadge.textContent = '🔪 CASUS (IMPOSTOR)';
        ui.spaceRoleBadge.className = 'space-role-pill space-role-impostor';
      } else {
        ui.spaceRoleBadge.textContent = '🛠️ MÜRETTEBAT (CREW)';
        ui.spaceRoleBadge.className = 'space-role-pill';
      }
    }

    // Hints & Mobile Buttons
    if (isLobby) {
      if (ui.hintAction) ui.hintAction.innerHTML = '🛸 <b>Lobi:</b> Gemide serbestçe dolaşabilir, görevleri test edebilirsiniz.';
      if (ui.hintHold) ui.hintHold.innerHTML = '⚡ <b>E / F:</b> Görevleri Dene';
      if (ui.hintExtra) ui.hintExtra.classList.add('hidden');
      if (ui.btnTouchAction) ui.btnTouchAction.textContent = '🛠️ TEST ET';
      if (ui.btnTouchHold) ui.btnTouchHold.classList.add('hidden');
      if (ui.btnTouchVent) ui.btnTouchVent.classList.add('hidden');
      if (ui.btnTouchReport) ui.btnTouchReport.classList.add('hidden');
    } else if (isImpostor) {
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

  toggleMinimap(ui, gameState, myPlayerId) {
    const modal = document.getElementById('modal-space-minimap');
    if (!modal) return;

    if (!modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
    } else {
      modal.classList.remove('hidden');
      this.drawMinimapCanvas(gameState, myPlayerId);
    }
  }

  drawMinimapCanvas(gameState, myPlayerId) {
    const canvas = document.getElementById('space-minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const s = (gameState && gameState.modeState) || {};
    const mapW = s.width || 2800;
    const mapH = s.height || 1800;

    // Scale world (-1400..1400, -900..900) to canvas (padding 30px)
    const pad = 35;
    const scaleX = (cw - pad * 2) / mapW;
    const scaleY = (ch - pad * 2) / mapH;
    const toScreenX = (wx) => cw / 2 + wx * scaleX;
    const toScreenY = (wy) => ch / 2 + wy * scaleY;

    // 1. Radar Grid Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < cw; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
    }
    for (let y = 0; y < ch; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }

    // 2. Corridors Paths
    const corridors = s.corridors || [];
    corridors.forEach(corr => {
      const rx = toScreenX(corr.x - corr.w / 2);
      const ry = toScreenY(corr.y - corr.h / 2);
      const rw = corr.w * scaleX;
      const rh = corr.h * scaleY;

      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.fillRect(rx, ry, rw, rh);

      // Corridor Label
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(corr.name, toScreenX(corr.x), toScreenY(corr.y) + 3);
    });

    // 3. Rooms Layout
    const rooms = s.rooms || [];
    rooms.forEach(r => {
      const rx = toScreenX(r.x - r.w / 2);
      const ry = toScreenY(r.y - r.h / 2);
      const rw = r.w * scaleX;
      const rh = r.h * scaleY;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);

      // Room Title & Icon
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${r.icon || '🛸'} ${r.name}`, toScreenX(r.x), toScreenY(r.y) - 6);
    });

    // 4. Doors
    const doors = s.doors || [];
    doors.forEach(d => {
      const dx = toScreenX(d.x);
      const dy = toScreenY(d.y);
      ctx.fillStyle = d.isOpen ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.arc(dx, dy, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Tasks (Yellow Exclamation Marks)
    const stations = s.taskStations || [];
    const myPlayerMeta = (s.playersMeta || []).find(p => p.id === myPlayerId);
    const completedList = (myPlayerMeta && myPlayerMeta.completedTasksList) || [];

    stations.forEach(st => {
      const isDone = completedList.includes(st.id);
      const sx = toScreenX(st.x);
      const sy = toScreenY(st.y);

      ctx.fillStyle = isDone ? '#10b981' : '#facc15';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isDone ? '✓' : '!', sx, sy);
    });

    // 6. Current Player Beacon
    const myPlayer = (gameState.players || []).find(p => p.id === myPlayerId);
    if (myPlayer) {
      const px = toScreenX(myPlayer.x);
      const py = toScreenY(myPlayer.y);

      // Pulse ring
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('SEN', px, py - 16);
    }
  }
}
