// vampireClient.js - Frontend Client Module for Vampir Köylü (Vampire & Villager)

import { BaseClientMode } from './BaseClientMode.js';

export class VampireClientMode extends BaseClientMode {
  constructor() {
    super('vampire');
    this.torchFlicker = 0;
    this.nightFogTime = 0;

    // Ambient floating fireflies / mist particles
    this.fireflies = Array.from({ length: 30 }, () => ({
      x: (Math.random() - 0.5) * 1600,
      y: (Math.random() - 0.5) * 1000,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 2 + Math.random() * 3,
      alpha: 0.3 + Math.random() * 0.5
    }));
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
    if (ui.hudSpace) ui.hudSpace.classList.add('hidden');
    if (ui.hudVampire) ui.hudVampire.classList.remove('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.add('hidden');
    if (ui.hudTeamSwitcher) ui.hudTeamSwitcher.classList.add('hidden');
  }

  onDeactivate(ui) {
    if (ui.hudVampire) ui.hudVampire.classList.add('hidden');
    if (ui.modalVampireRole) ui.modalVampireRole.classList.add('hidden');
    if (ui.modalVampireAction) ui.modalVampireAction.classList.add('hidden');
    if (ui.modalVampireTrial) ui.modalVampireTrial.classList.add('hidden');
    if (ui.hudChat) ui.hudChat.classList.remove('hidden');
  }

  renderEnvironment(renderer, g, gameState) {
    const s = (gameState && gameState.modeState) || {};
    const w = s.width || 1800;
    const h = s.height || 1200;
    const hw = w / 2;
    const hh = h / 2;
    const isNight = s.gameState === 'night';
    this.torchFlicker += 0.05;

    // 1. Village Meadow Base
    const groundColor = isNight ? 0x09111e : 0x14281d;
    g.beginFill(groundColor);
    g.drawRect(-hw - 200, -hh - 200, w + 400, h + 400);
    g.endFill();

    // 2. Cobblestone Village Roads & Pathways
    const pathColor = isNight ? 0x171f2c : 0x33291f;
    g.lineStyle(0);
    g.beginFill(pathColor, 0.9);
    // Main cross roads
    g.drawRect(-hw + 80, -35, w - 160, 70);
    g.drawRect(-35, -hh + 80, 70, h - 160);
    // Central Square Plaza Ring
    g.drawCircle(0, 0, 180);
    g.endFill();

    // 3. Central Fountain
    g.lineStyle(4, isNight ? 0x38bdf8 : 0x0284c7, 0.85);
    g.beginFill(isNight ? 0x0f2744 : 0x0284c7, 0.7);
    g.drawCircle(0, 0, 75);
    g.endFill();

    // Water ripple
    const ripple = 15 + Math.sin(this.torchFlicker * 2) * 5;
    g.lineStyle(2, 0xffffff, 0.6);
    g.drawCircle(0, 0, ripple);

    // 4. Village Buildings & Landmarks
    const landmarks = s.landmarks || [];
    landmarks.forEach(lm => {
      let bColor = 0x1e293b;
      let strokeColor = 0x475569;
      let rw = 220;
      let rh = 160;

      if (lm.id === 'tavern') {
        bColor = isNight ? 0x271912 : 0x54331d;
        strokeColor = 0xf59e0b;
      } else if (lm.id === 'church') {
        bColor = isNight ? 0x191e2b : 0x334155;
        strokeColor = 0x94a3b8;
      } else if (lm.id === 'house') {
        bColor = isNight ? 0x241620 : 0x4a2839;
        strokeColor = 0xec4899;
      } else if (lm.id === 'cemetery') {
        bColor = isNight ? 0x141a24 : 0x1e293b;
        strokeColor = 0x64748b;
      } else if (lm.id === 'gallows') {
        bColor = 0x3b2219;
        strokeColor = 0xd97706;
        rw = 120;
        rh = 80;
      }

      if (lm.id !== 'fountain') {
        g.lineStyle(3, strokeColor, 0.85);
        g.beginFill(bColor, 0.85);
        g.drawRoundedRect(lm.x - rw / 2, lm.y - rh / 2, rw, rh, 16);
        g.endFill();

        // Glowing Windows
        if (lm.id !== 'gallows' && lm.id !== 'cemetery') {
          const winAlpha = isNight ? (0.7 + Math.sin(this.torchFlicker + lm.x) * 0.2) : 0.4;
          g.lineStyle(1, 0xfef08a, winAlpha);
          g.beginFill(0xfacc15, winAlpha * 0.8);
          g.drawRect(lm.x - rw / 3, lm.y - rh / 4, 20, 20);
          g.drawRect(lm.x + rw / 3 - 20, lm.y - rh / 4, 20, 20);
          g.endFill();
        }
      }
    });

    // 5. Village Lanterns / Torches with warm halo glow
    const torchSpots = [
      { x: -140, y: -140 }, { x: 140, y: -140 },
      { x: -140, y: 140 }, { x: 140, y: 140 },
      { x: -440, y: -30 }, { x: 440, y: -30 },
      { x: 0, y: 300 }
    ];

    torchSpots.forEach(t => {
      const glowR = 30 + Math.sin(this.torchFlicker + t.x * 2) * 5;
      g.lineStyle(0);
      g.beginFill(0xf59e0b, isNight ? 0.25 : 0.1);
      g.drawCircle(t.x, t.y, glowR);
      g.beginFill(0xfffbeb, 0.9);
      g.drawCircle(t.x, t.y, 4);
      g.endFill();
    });

    // 6. Night Fog / Atmospheric Moonlight Overlay
    if (isNight) {
      g.lineStyle(0);
      g.beginFill(0x060b19, 0.45);
      g.drawRect(-hw - 200, -hh - 200, w + 400, h + 400);
      g.endFill();

      // Fireflies
      this.fireflies.forEach(ff => {
        ff.x += ff.vx;
        ff.y += ff.vy;
        if (ff.x < -hw) ff.x = hw;
        if (ff.x > hw) ff.x = -hw;
        if (ff.y < -hh) ff.y = hh;
        if (ff.y > hh) ff.y = -hh;

        g.beginFill(0x86efac, ff.alpha);
        g.drawCircle(ff.x, ff.y, ff.r);
        g.endFill();
      });
    }

    // 7. Outer Village Fence / Boundary Ring
    g.lineStyle(5, isNight ? 0x4338ca : 0x15803d, 0.8);
    g.drawRect(-hw, -hh, w, h);
  }

  renderEntities(renderer, g, gameState, entities, myPlayerId) {
    // Mode-specific entity overlays (e.g. night halos or role markers)
  }

  updateHUD(ui, gameState, myPlayerId) {
    if (!ui) return;

    const s = gameState.modeState || {};
    const myPlayer = (gameState.players || []).find(p => p.id === myPlayerId);
    const myMeta = (s.playersMeta || []).find(p => p.id === myPlayerId);
    const isLobby = s.gameState === 'waiting';
    const isNight = s.gameState === 'night';
    const isDay = s.gameState === 'day';
    const isTrial = s.gameState === 'voting';
    const myRole = (myMeta && myMeta.role) || (myPlayer && myPlayer.role) || 'villager';
    const isAlive = myMeta ? myMeta.isAlive : (myPlayer ? myPlayer.isAlive : true);

    // Chat handling: In night phase, hide hudChat if not vampire
    if (ui.hudChat) {
      if (isNight && myRole !== 'vampire') {
        ui.hudChat.classList.add('hidden');
      } else {
        ui.hudChat.classList.remove('hidden');
      }
    }

    // Update Vampire HUD Counter & Day Info
    if (ui.vampireDayCount) ui.vampireDayCount.textContent = s.dayCount || 1;
    if (ui.vampirePhaseTimer) ui.vampirePhaseTimer.textContent = s.phaseTimer !== undefined ? s.phaseTimer : 0;
    if (ui.vampireAliveCount) ui.vampireAliveCount.textContent = s.totalAlive || 0;

    // Update Phase Badge
    if (ui.vampirePhaseBadge) {
      if (isLobby) {
        ui.vampirePhaseBadge.textContent = '🏰 LOBİ (Köy Meydanı)';
        ui.vampirePhaseBadge.className = 'vampire-phase-pill phase-lobby';
      } else if (isNight) {
        ui.vampirePhaseBadge.textContent = '🌙 GECE AŞAMASI';
        ui.vampirePhaseBadge.className = 'vampire-phase-pill phase-night';
      } else if (isDay) {
        ui.vampirePhaseBadge.textContent = '☀️ GÜNDÜZ TARTIŞMA';
        ui.vampirePhaseBadge.className = 'vampire-phase-pill phase-day';
      } else if (isTrial) {
        ui.vampirePhaseBadge.textContent = '⚖️ MAHKEME & İDAM';
        ui.vampirePhaseBadge.className = 'vampire-phase-pill phase-trial';
      } else {
        ui.vampirePhaseBadge.textContent = '🏆 OYUN BİTTİ';
        ui.vampirePhaseBadge.className = 'vampire-phase-pill phase-gameover';
      }
    }

    // Update Role Pill
    if (ui.vampireRoleBadge) {
      const roleMap = {
        vampire: { title: '🧛 VAMPİR', cls: 'role-vampire' },
        doctor: { title: '🧙‍♂️ DOKTOR', cls: 'role-doctor' },
        seer: { title: '🔮 KAHİN', cls: 'role-seer' },
        hunter: { title: '🏹 AVCI', cls: 'role-hunter' },
        villager: { title: '🧑‍🌾 KÖYLÜ', cls: 'role-villager' }
      };
      const rInfo = roleMap[myRole] || roleMap.villager;
      ui.vampireRoleBadge.textContent = isLobby ? '👤 SAKİN' : (isAlive ? rInfo.title : `💀 ÖLÜ (${rInfo.title})`);
      ui.vampireRoleBadge.className = `vampire-role-pill ${rInfo.cls}`;
    }

    // Modal Control: Night Action Modal
    if (isNight && isAlive && !isLobby && (myRole === 'vampire' || myRole === 'doctor' || myRole === 'seer')) {
      if (ui.modalVampireAction && ui.modalVampireAction.classList.contains('hidden')) {
        ui.openVampireNightModal(myRole, s.playersMeta || [], myPlayerId);
      }
    } else {
      if (ui.modalVampireAction && !ui.modalVampireAction.classList.contains('hidden')) {
        ui.modalVampireAction.classList.add('hidden');
      }
    }

    // Modal Control: Trial Voting Modal
    if (isTrial && isAlive && !isLobby) {
      if (ui.modalVampireTrial && ui.modalVampireTrial.classList.contains('hidden')) {
        ui.openVampireTrialModal(s.playersMeta || [], myPlayerId);
      }
    } else {
      if (ui.modalVampireTrial && !ui.modalVampireTrial.classList.contains('hidden')) {
        ui.modalVampireTrial.classList.add('hidden');
      }
    }

    // Hints
    if (isLobby) {
      if (ui.hintAction) ui.hintAction.innerHTML = '🏰 <b>Lobi:</b> Köy meydanında serbestçe dolaşabilirsiniz.';
      if (ui.hintHold) ui.hintHold.innerHTML = '👑 <b>Host:</b> Oyunu başlatabilir.';
    } else if (isNight) {
      if (myRole === 'vampire') {
        if (ui.hintAction) ui.hintAction.innerHTML = '🧛 <b>Gece:</b> Kurbanınızı seçin ve diğer vampirlerle gizli telsizden konuşun.';
      } else if (myRole === 'doctor') {
        if (ui.hintAction) ui.hintAction.innerHTML = '🧙‍♂️ <b>Gece:</b> Bu gece korumak istediğin bir köylüyü seç.';
      } else if (myRole === 'seer') {
        if (ui.hintAction) ui.hintAction.innerHTML = '🔮 <b>Gece:</b> Kimliğini sorgulamak istediğin bir şüpheliyi seç.';
      } else {
        if (ui.hintAction) ui.hintAction.innerHTML = '🌙 <b>Gece:</b> Köy uyuyor. Sabah çanını bekleyin...';
      }
    } else if (isDay) {
      if (ui.hintAction) ui.hintAction.innerHTML = '☀️ <b>Gündüz:</b> Gece raporunu inceleyin ve şüphelileri chatte tartışın.';
    } else if (isTrial) {
      if (ui.hintAction) ui.hintAction.innerHTML = '⚖️ <b>Mahkeme:</b> Şüpheliyi darağacına göndermek için oy kullanın veya pas geçin.';
    }
  }
}
