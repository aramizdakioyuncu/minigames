// conquestClient.js - Frontend Client Module for Bil ve Fethet (Trivia Territory Conquest)

import { BaseClientMode } from './BaseClientMode.js';

export class ConquestClientMode extends BaseClientMode {
  constructor() {
    super('conquest');
    this.animTime = 0;
    this.hoveredTerritoryId = null;
    this.selectedTerritoryId = null;
    this.territoryHitboxes = [];
    this.pointerListenerBound = false;
    this.rendererRef = null;
    this.socketRef = null;
    this.myPlayerId = null;
    this.lastModeState = null;
  }

  isFixedArena() {
    return true;
  }

  getArenaDimensions(gameState) {
    const s = (gameState && gameState.modeState) || {};
    return {
      width: s.width || 1400,
      height: s.height || 900
    };
  }

  onActivate(roomData, ui) {
    if (ui.hudPuck) ui.hudPuck.classList.add('hidden');
    if (ui.hudSumo) ui.hudSumo.classList.add('hidden');
    if (ui.hudAgar) ui.hudAgar.classList.add('hidden');
    if (ui.hudSpace) ui.hudSpace.classList.add('hidden');
    if (ui.hudVampire) ui.hudVampire.classList.add('hidden');
    if (ui.hudConquest) ui.hudConquest.classList.remove('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.remove('hidden');
    if (ui.hudTeamSwitcher) ui.hudTeamSwitcher.classList.add('hidden');

    this.bindCanvasInteraction();
  }

  onDeactivate(ui) {
    if (ui.hudConquest) ui.hudConquest.classList.add('hidden');
    if (ui.modalConquestQuestion) ui.modalConquestQuestion.classList.add('hidden');
    if (ui.modalConquestResult) ui.modalConquestResult.classList.add('hidden');
    this.unbindCanvasInteraction();
  }

  setContext(renderer, socket, myPlayerId) {
    this.rendererRef = renderer;
    this.socketRef = socket;
    this.myPlayerId = myPlayerId;
  }

  bindCanvasInteraction() {
    if (this.pointerListenerBound) return;
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    this._onPointerMove = (e) => {
      if (!this.rendererRef || !this.lastModeState) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldPos = this.rendererRef.screenToWorld(mouseX, mouseY);

      let found = null;
      const territories = this.lastModeState.territories || [];
      for (const t of territories) {
        const dx = worldPos.x - t.x;
        const dy = worldPos.y - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 48) {
          found = t.id;
          break;
        }
      }
      this.hoveredTerritoryId = found;
      canvas.style.cursor = found ? 'pointer' : 'default';
    };

    this._onPointerDown = (e) => {
      if (e.button !== 0) return;
      if (!this.hoveredTerritoryId || !this.lastModeState) return;

      const s = this.lastModeState;
      if (s.phase === 'conquer_pick' && s.pickingPlayerId === this.myPlayerId) {
        const territory = (s.territories || []).find(t => t.id === this.hoveredTerritoryId);
        // Can claim if unowned or opponent owned
        if (territory && territory.ownerId !== this.myPlayerId) {
          if (this.socketRef) {
            this.socketRef.emit('conquest_claim_territory', { territoryId: territory.id });
            if (window.audio) window.audio.playSwordClash();
          }
        }
      }
    };

    canvas.addEventListener('mousemove', this._onPointerMove);
    canvas.addEventListener('mousedown', this._onPointerDown);
    this.pointerListenerBound = true;
  }

  unbindCanvasInteraction() {
    const canvas = document.getElementById('game-canvas');
    if (canvas && this.pointerListenerBound) {
      canvas.removeEventListener('mousemove', this._onPointerMove);
      canvas.removeEventListener('mousedown', this._onPointerDown);
      canvas.style.cursor = 'default';
      this.pointerListenerBound = false;
    }
  }

  renderEnvironment(renderer, g, gameState) {
    const s = (gameState && gameState.modeState) || {};
    this.lastModeState = s;
    const w = s.width || 1400;
    const h = s.height || 900;
    const hw = w / 2;
    const hh = h / 2;
    this.animTime += 0.03;

    // 1. Medieval War Room Parchment / Tactical Sea Map Base
    // Sea / Deep Ocean background
    g.beginFill(0x0a192f);
    g.drawRect(-hw - 100, -hh - 100, w + 200, h + 200);
    g.endFill();

    // Map Landmass outline / Anatolia aesthetic plate
    g.lineStyle(4, 0x1e3a5f, 0.8);
    g.beginFill(0x132743, 0.95);
    g.drawRoundedRect(-hw + 40, -hh + 40, w - 80, h - 80, 24);
    g.endFill();

    // Compass & Grid lines aesthetic
    g.lineStyle(1, 0x1d3557, 0.35);
    for (let x = -hw + 100; x <= hw - 100; x += 150) {
      g.moveTo(x, -hh + 50);
      g.lineTo(x, hh - 50);
    }
    for (let y = -hh + 100; y <= hh - 100; y += 150) {
      g.moveTo(-hw + 50, y);
      g.lineTo(hw - 50, y);
    }

    // Compass Rose in top right corner
    const crX = hw - 130;
    const crY = -hh + 130;
    g.lineStyle(2, 0xd4af37, 0.4);
    g.drawCircle(crX, crY, 40);
    g.drawCircle(crX, crY, 60);

    // 2. Connection Roads / Trade Routes Between Cities
    const connections = s.connections || [];
    const territories = s.territories || [];
    const territoryMap = new Map(territories.map(t => [t.id, t]));

    g.lineStyle(3, 0x334e68, 0.6);
    connections.forEach(([idA, idB]) => {
      const a = territoryMap.get(idA);
      const b = territoryMap.get(idB);
      if (a && b) {
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
      }
    });

    // 3. Render Territories (Castles & Fortresses)
    const players = gameState.players || [];
    const isPickPhase = s.phase === 'conquer_pick';
    const isMyPick = isPickPhase && s.pickingPlayerId === this.myPlayerId;

    territories.forEach(t => {
      const owner = players.find(p => p.id === t.ownerId);
      const isOwned = !!owner;
      const isMine = isOwned && t.ownerId === this.myPlayerId;
      const isHovered = this.hoveredTerritoryId === t.id;

      // Color determining
      let baseColor = 0x334155; // Unconquered neutral dark slate
      let ringColor = 0x64748b;

      if (isOwned) {
        // Convert hex color string like '#ff4444' or number
        if (owner.color) {
          baseColor = typeof owner.color === 'string'
            ? parseInt(owner.color.replace('#', '0x'), 16)
            : owner.color;
          ringColor = baseColor;
        }
      }

      // If it's my pick turn and territory is selectable
      if (isMyPick && !isMine) {
        const pulse = 48 + Math.sin(this.animTime * 4) * 6;
        g.lineStyle(3, 0xf59e0b, 0.85);
        g.drawCircle(t.x, t.y, pulse);
      }

      // Territory outer circle / glow
      if (isHovered) {
        g.lineStyle(4, 0xfacc15, 1);
        g.beginFill(baseColor, 0.85);
        g.drawCircle(t.x, t.y, 42);
        g.endFill();
      } else {
        g.lineStyle(3, ringColor, isOwned ? 0.9 : 0.6);
        g.beginFill(baseColor, isOwned ? 0.85 : 0.45);
        g.drawCircle(t.x, t.y, 36);
        g.endFill();
      }

      // Castle Icon / Fort symbol inside node
      g.lineStyle(2, 0xffffff, 0.9);
      // Fortress battlement
      const bx = t.x - 12;
      const by = t.y - 10;
      g.beginFill(0xffffff, 0.9);
      g.drawRect(bx, by + 6, 24, 14);
      // Crenellations (3 towers)
      g.drawRect(bx, by, 6, 7);
      g.drawRect(bx + 9, by, 6, 7);
      g.drawRect(bx + 18, by, 6, 7);
      g.endFill();

      // Gate archway
      g.beginFill(0x0f172a, 0.9);
      g.drawRect(t.x - 4, t.y + 10, 8, 10);
      g.endFill();

      // Text label: City Name + Points
      // (Rendered directly or via Pixi text in PIXI rendering)
    });

    // 4. Map Border styling
    g.lineStyle(6, 0xd4af37, 0.8);
    g.drawRoundedRect(-hw + 40, -hh + 40, w - 80, h - 80, 24);
  }

  renderEntities(renderer, g, gameState, entities, myPlayerId) {
    // Players roam or represent banners
    const s = gameState.modeState || {};
    const territories = s.territories || [];
    const territoryMap = new Map(territories.map(t => [t.id, t]));

    // Draw banners over territories with player avatars
    territories.forEach(t => {
      if (t.ownerId) {
        const player = (gameState.players || []).find(p => p.id === t.ownerId);
        if (player) {
          // Floating crown/banner above conquered city
          const bannerY = t.y - 48 + Math.sin(this.animTime * 2 + t.x) * 3;
          g.lineStyle(2, 0xd4af37, 0.9);
          g.beginFill(0x1e293b, 0.9);
          g.drawRoundedRect(t.x - 45, bannerY - 12, 90, 22, 6);
          g.endFill();
        }
      }
    });
  }

  updateHUD(ui, gameState, myPlayerId) {
    if (!ui) return;
    this.myPlayerId = myPlayerId;
    const s = gameState.modeState || {};
    const myPlayer = (gameState.players || []).find(p => p.id === myPlayerId);
    const territories = s.territories || [];

    // Count my territories and points
    const myTerritories = territories.filter(t => t.ownerId === myPlayerId);
    const myTerritoryCount = myTerritories.length;
    const myScore = myPlayer ? (myPlayer.score || 0) : 0;

    // Update Conquest HUD Elements
    if (ui.conquestRoundCount) ui.conquestRoundCount.textContent = `${s.currentRound || 1} / ${s.maxRounds || 5}`;
    if (ui.conquestMyScore) ui.conquestMyScore.textContent = `${myScore} Puan`;
    if (ui.conquestTerritoryCount) ui.conquestTerritoryCount.textContent = `${myTerritoryCount} Şehir`;

    // Phase Badge & Announcements
    if (ui.conquestPhaseBadge) {
      if (s.phase === 'waiting') {
        ui.conquestPhaseBadge.textContent = '🏰 LOBİ - Oyuncular Bekleniyor';
        ui.conquestPhaseBadge.className = 'conquest-phase-pill phase-lobby';
      } else if (s.phase === 'question') {
        ui.conquestPhaseBadge.textContent = `❓ SORU #${s.currentRound || 1} (${s.timer || 0}s)`;
        ui.conquestPhaseBadge.className = 'conquest-phase-pill phase-question';
      } else if (s.phase === 'question_result') {
        ui.conquestPhaseBadge.textContent = '📊 CEVAP DEĞERLENDİRMESİ';
        ui.conquestPhaseBadge.className = 'conquest-phase-pill phase-result';
      } else if (s.phase === 'conquer_pick') {
        const picker = (gameState.players || []).find(p => p.id === s.pickingPlayerId);
        const pickerName = picker ? picker.username : 'Bir oyuncu';
        if (s.pickingPlayerId === myPlayerId) {
          ui.conquestPhaseBadge.textContent = '⚔️ SENİN SIRAN! BİR ŞEHİR SEÇ!';
          ui.conquestPhaseBadge.className = 'conquest-phase-pill phase-mypick';
        } else {
          ui.conquestPhaseBadge.textContent = `⚔️ ${pickerName} Şehir Seçiyor...`;
          ui.conquestPhaseBadge.className = 'conquest-phase-pill phase-pick';
        }
      } else if (s.phase === 'game_over') {
        ui.conquestPhaseBadge.textContent = '👑 OYUN BİTTİ - ZAFER!';
        ui.conquestPhaseBadge.className = 'conquest-phase-pill phase-gameover';
      }
    }

    // Modal Control: Question Modal
    if (s.phase === 'question' && s.currentQuestion) {
      if (ui.modalConquestQuestion && ui.modalConquestQuestion.classList.contains('hidden')) {
        ui.openConquestQuestionModal(s.currentQuestion, s.timer || 15);
      }
      if (ui.conquestQuestionTimer) {
        ui.conquestQuestionTimer.textContent = `${s.timer || 0}s`;
        const progress = Math.max(0, Math.min(100, ((s.timer || 0) / 15) * 100));
        if (ui.conquestTimerBar) ui.conquestTimerBar.style.width = `${progress}%`;
      }
    } else {
      if (ui.modalConquestQuestion && !ui.modalConquestQuestion.classList.contains('hidden')) {
        ui.modalConquestQuestion.classList.add('hidden');
      }
    }

    // Modal Control: Question Result Podium Modal
    if (s.phase === 'question_result' && s.lastResult) {
      if (ui.modalConquestResult && ui.modalConquestResult.classList.contains('hidden')) {
        ui.openConquestResultModal(s.lastResult, gameState.players || []);
      }
    } else {
      if (ui.modalConquestResult && !ui.modalConquestResult.classList.contains('hidden')) {
        ui.modalConquestResult.classList.add('hidden');
      }
    }

    // Help / Action Hint Bar
    if (s.phase === 'waiting') {
      if (ui.hintAction) ui.hintAction.innerHTML = '🏰 <b>Bil ve Fethet:</b> Soruları en yakın ve hızlı cevaplayan şehir fetheder!';
      if (ui.hintHold) ui.hintHold.innerHTML = '👑 <b>Host:</b> Oyunu başlatabilir.';
    } else if (s.phase === 'question') {
      if (ui.hintAction) ui.hintAction.innerHTML = '⚡ <b>Soru Zamanı:</b> Klavyeden veya ekrandaki tuş takımından cevabını gir!';
      if (ui.hintHold) ui.hintHold.innerHTML = '🎯 Hedef: Doğru cevaba en yakın ve en hızlı olmak.';
    } else if (s.phase === 'conquer_pick') {
      if (s.pickingPlayerId === myPlayerId) {
        if (ui.hintAction) ui.hintAction.innerHTML = '⚔️ <b>Fetih Sırası Sende:</b> Haritadan ele geçirmek istediğin şehre tıkla!';
      } else {
        if (ui.hintAction) ui.hintAction.innerHTML = '⏳ <b>Bekleniyor:</b> Kazanan oyuncu haritadan şehir seçiyor...';
      }
    }
  }
}
