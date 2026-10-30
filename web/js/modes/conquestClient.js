// conquestClient.js - Frontend Client Module for Bil ve Fethet (Trivia Territory Conquest)

import { BaseClientMode } from './BaseClientMode.js';

export class ConquestClientMode extends BaseClientMode {
  constructor() {
    super('conquest');
    this.animTime = 0;
    this.hoveredTerritoryId = null;
    this.selectedTerritoryId = null;
    this.pointerListenerBound = false;
    this.rendererRef = null;
    this.socketRef = null;
    this.myPlayerId = null;
    this.lastModeState = null;
    this.cityLabelsContainer = null;
    this.cityLabelsMap = new Map();
  }

  isFixedArena() {
    return true;
  }

  getArenaDimensions(gameState) {
    const s = (gameState && gameState.modeState) || {};
    return {
      width: s.width || 1600,
      height: s.height || 1000
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
    this.destroyCityLabels();
  }

  destroyCityLabels() {
    if (this.cityLabelsContainer && this.cityLabelsContainer.parent) {
      this.cityLabelsContainer.parent.removeChild(this.cityLabelsContainer);
      this.cityLabelsContainer.destroy({ children: true });
    }
    this.cityLabelsMap.clear();
    this.cityLabelsContainer = null;
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

    const getEventPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      if (this.rendererRef && typeof this.rendererRef.screenToWorld === 'function') {
        return this.rendererRef.screenToWorld(mouseX, mouseY);
      }
      const cx = (canvas.width || 800) / 2;
      const cy = (canvas.height || 600) / 2;
      return { x: mouseX - cx, y: mouseY - cy };
    };

    this._onPointerMove = (e) => {
      if (!this.lastModeState) return;
      const worldPos = getEventPos(e);

      let found = null;
      const territories = this.lastModeState.territories || [];
      for (const t of territories) {
        const dx = worldPos.x - t.x;
        const dy = worldPos.y - t.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= 55) {
          found = t.id;
          break;
        }
      }
      this.hoveredTerritoryId = found;
      canvas.style.cursor = found ? 'pointer' : 'default';
    };

    const handlePickAtPos = (worldPos) => {
      if (!this.lastModeState) return;
      const s = this.lastModeState;
      const phase = s.phase || s.gameState;
      const pickerId = s.pickingPlayerId || s.activePickerId;
      const myId = this.myPlayerId || window.gameApp?.socket?.myPlayerId;
      const isPickPhase = phase === 'conquer_pick';
      const isMyPick = isPickPhase && pickerId === myId;

      const territories = s.territories || [];
      let targetTerritory = null;
      for (const t of territories) {
        const dist = Math.hypot(worldPos.x - t.x, worldPos.y - t.y);
        if (dist <= 65) {
          targetTerritory = t;
          break;
        }
      }

      if (isPickPhase && isMyPick && targetTerritory) {
        if (targetTerritory.ownerId !== myId) {
          const socketObj = this.socketRef || window.gameApp?.socket;
          if (socketObj) {
            socketObj.sendAction({
              type: 'claim_territory',
              territoryId: targetTerritory.id
            });
            if (window.audio && typeof window.audio.playSwordClash === 'function') {
              window.audio.playSwordClash();
            }
          }
        }
      }
    };

    this._onPointerDown = (e) => {
      if (e.button !== 0) return;
      const worldPos = getEventPos(e);
      handlePickAtPos(worldPos);
    };

    this._onTouchEnd = (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const mouseX = touch.clientX - rect.left;
      const mouseY = touch.clientY - rect.top;
      let worldPos;
      if (this.rendererRef && typeof this.rendererRef.screenToWorld === 'function') {
        worldPos = this.rendererRef.screenToWorld(mouseX, mouseY);
      } else {
        const cx = (canvas.width || 800) / 2;
        const cy = (canvas.height || 600) / 2;
        worldPos = { x: mouseX - cx, y: mouseY - cy };
      }
      handlePickAtPos(worldPos);
    };

    canvas.addEventListener('mousemove', this._onPointerMove);
    canvas.addEventListener('mousedown', this._onPointerDown);
    canvas.addEventListener('touchend', this._onTouchEnd, { passive: true });
    this.pointerListenerBound = true;
  }

  unbindCanvasInteraction() {
    const canvas = document.getElementById('game-canvas');
    if (canvas && this.pointerListenerBound) {
      canvas.removeEventListener('mousemove', this._onPointerMove);
      canvas.removeEventListener('mousedown', this._onPointerDown);
      if (this._onTouchEnd) canvas.removeEventListener('touchend', this._onTouchEnd);
      canvas.style.cursor = 'default';
      this.pointerListenerBound = false;
    }
  }

  renderEnvironment(renderer, g, gameState) {
    const s = (gameState && gameState.modeState) || {};
    this.lastModeState = s;
    const w = s.width || 1600;
    const h = s.height || 1000;
    const hw = w / 2;
    const hh = h / 2;
    this.animTime += 0.03;

    // 1. Medieval War Room Tactical Parchment & Sea Base
    g.beginFill(0x0a192f);
    g.drawRect(-hw - 100, -hh - 100, w + 200, h + 200);
    g.endFill();

    // Map Landmass outline / Anatolia aesthetic plate
    g.lineStyle(4, 0x1e3a5f, 0.85);
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
    g.lineStyle(2, 0xd4af37, 0.45);
    g.drawCircle(crX, crY, 40);
    g.drawCircle(crX, crY, 60);

    // 2. Connection Roads / Trade Routes Between Cities
    const connections = s.connections || [
      ['canakkale', 'istanbul'], ['canakkale', 'izmir'], ['canakkale', 'bursa'],
      ['istanbul', 'bursa'], ['istanbul', 'eskisehir'],
      ['izmir', 'bursa'], ['izmir', 'antalya'],
      ['bursa', 'eskisehir'], ['bursa', 'antalya'],
      ['eskisehir', 'ankara'], ['eskisehir', 'konya'],
      ['antalya', 'konya'], ['antalya', 'adana'],
      ['ankara', 'samsun'], ['ankara', 'konya'], ['ankara', 'sivas'],
      ['konya', 'adana'], ['konya', 'sivas'],
      ['samsun', 'sivas'], ['samsun', 'trabzon'],
      ['adana', 'gaziantep'],
      ['sivas', 'erzurum'], ['sivas', 'gaziantep'], ['sivas', 'diyarbakir'],
      ['trabzon', 'erzurum'],
      ['gaziantep', 'diyarbakir'],
      ['erzurum', 'diyarbakir'], ['erzurum', 'van'],
      ['diyarbakir', 'van']
    ];
    const territories = s.territories || [];
    const territoryMap = new Map(territories.map(t => [t.id, t]));

    g.lineStyle(3, 0x334e68, 0.65);
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
    const phase = s.phase || s.gameState;
    const pickerId = s.pickingPlayerId || s.activePickerId;
    const isPickPhase = phase === 'conquer_pick';
    const isMyPick = isPickPhase && pickerId === this.myPlayerId;

    territories.forEach(t => {
      const owner = players.find(p => p.id === t.ownerId);
      const isOwned = !!owner;
      const isMine = isOwned && t.ownerId === this.myPlayerId;
      const isHovered = this.hoveredTerritoryId === t.id;

      // Color determining
      let baseColor = 0x334155; // Unconquered neutral dark slate
      let ringColor = 0x64748b;

      if (isOwned) {
        if (owner.color) {
          baseColor = typeof owner.color === 'string'
            ? parseInt(owner.color.replace('#', '0x'), 16)
            : owner.color;
          ringColor = baseColor;
        } else if (t.color) {
          baseColor = typeof t.color === 'string'
            ? parseInt(t.color.replace('#', '0x'), 16)
            : t.color;
          ringColor = baseColor;
        }
      }

      // If it's my pick turn and territory is selectable
      if (isMyPick && !isMine) {
        const pulse = 48 + Math.sin(this.animTime * 5) * 8;
        g.lineStyle(4, 0xf59e0b, 0.95);
        g.drawCircle(t.x, t.y, pulse);
      }

      // Territory outer circle / glow
      if (isHovered) {
        g.lineStyle(4, 0xfacc15, 1);
        g.beginFill(baseColor, 0.9);
        g.drawCircle(t.x, t.y, 42);
        g.endFill();
      } else {
        g.lineStyle(3, ringColor, isOwned ? 0.95 : 0.65);
        g.beginFill(baseColor, isOwned ? 0.85 : 0.45);
        g.drawCircle(t.x, t.y, 36);
        g.endFill();
      }

      // Castle Icon / Fort symbol inside node
      g.lineStyle(2, 0xffffff, 0.95);
      const bx = t.x - 12;
      const by = t.y - 10;
      g.beginFill(0xffffff, 0.95);
      g.drawRect(bx, by + 6, 24, 14);
      // Crenellations
      g.drawRect(bx, by, 6, 7);
      g.drawRect(bx + 9, by, 6, 7);
      g.drawRect(bx + 18, by, 6, 7);
      g.endFill();

      // Gate archway
      g.beginFill(0x0f172a, 0.95);
      g.drawRect(t.x - 4, t.y + 10, 8, 10);
      g.endFill();

      // Point Ribbon Badge below node
      g.lineStyle(1.5, ringColor, 0.85);
      g.beginFill(0x0f172a, 0.85);
      g.drawRoundedRect(t.x - 30, t.y + 26, 60, 18, 5);
      g.endFill();
    });

    // 4. Map Border styling
    g.lineStyle(6, 0xd4af37, 0.8);
    g.drawRoundedRect(-hw + 40, -hh + 40, w - 80, h - 80, 24);

    // 5. Update City Labels
    this.updateCityLabels(renderer, territories, players);
  }

  updateCityLabels(renderer, territories, players) {
    if (!renderer || !renderer.world || !renderer.isWebGL || typeof PIXI === 'undefined') return;

    if (!this.cityLabelsContainer) {
      this.cityLabelsContainer = new PIXI.Container();
      renderer.world.addChild(this.cityLabelsContainer);
    }

    const currentIds = new Set();

    territories.forEach(t => {
      currentIds.add(t.id);
      let labelObj = this.cityLabelsMap.get(t.id);

      const owner = players.find(p => p.id === t.ownerId);
      const ownerName = owner ? owner.name : (t.ownerName || null);
      const displayName = `${t.icon || '🏰'} ${t.name}`;
      const pointText = `${t.points} P`;

      if (!labelObj) {
        const titleText = new PIXI.Text(displayName, {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 13,
          fontWeight: 'bold',
          fill: 0xffffff,
          align: 'center',
          dropShadow: true,
          dropShadowColor: 0x000000,
          dropShadowBlur: 4,
          dropShadowDistance: 2
        });
        titleText.anchor.set(0.5, 1);

        const ptsText = new PIXI.Text(pointText, {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: 'bold',
          fill: 0xfacc15,
          align: 'center'
        });
        ptsText.anchor.set(0.5, 0);

        const bannerText = new PIXI.Text('', {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: 'bold',
          fill: 0x38bdf8,
          align: 'center',
          dropShadow: true,
          dropShadowColor: 0x000000,
          dropShadowBlur: 3
        });
        bannerText.anchor.set(0.5, 1);

        this.cityLabelsContainer.addChild(titleText);
        this.cityLabelsContainer.addChild(ptsText);
        this.cityLabelsContainer.addChild(bannerText);

        labelObj = { titleText, ptsText, bannerText };
        this.cityLabelsMap.set(t.id, labelObj);
      }

      labelObj.titleText.text = displayName;
      labelObj.titleText.position.set(t.x, t.y - 38);

      labelObj.ptsText.text = pointText;
      labelObj.ptsText.position.set(t.x, t.y + 28);

      if (ownerName) {
        labelObj.bannerText.text = `👑 ${ownerName}`;
        labelObj.bannerText.position.set(t.x, t.y - 54);
        labelObj.bannerText.visible = true;
      } else {
        labelObj.bannerText.visible = false;
      }
    });

    for (const [id, labelObj] of this.cityLabelsMap.entries()) {
      if (!currentIds.has(id)) {
        if (this.cityLabelsContainer) {
          this.cityLabelsContainer.removeChild(labelObj.titleText);
          this.cityLabelsContainer.removeChild(labelObj.ptsText);
          this.cityLabelsContainer.removeChild(labelObj.bannerText);
        }
        this.cityLabelsMap.delete(id);
      }
    }
  }

  renderEntities(renderer, g, gameState, entities, myPlayerId) {
    // Mode specific entity highlights
  }

  updateHUD(ui, gameState, myPlayerId) {
    if (!ui) return;
    this.myPlayerId = myPlayerId;
    const s = gameState.modeState || {};
    this.lastModeState = s;
    const myPlayer = (gameState.players || []).find(p => p.id === myPlayerId);
    const territories = s.territories || [];

    // Count my territories and points
    const myTerritories = territories.filter(t => t.ownerId === myPlayerId);
    const myTerritoryCount = myTerritories.length;
    const myScore = myPlayer ? (myPlayer.score || 0) : 0;

    // Update Conquest HUD Elements
    if (ui.conquestRoundCount) ui.conquestRoundCount.textContent = `${s.currentRound || 1} / ${s.maxRounds || 6}`;
    if (ui.conquestMyScore) ui.conquestMyScore.textContent = `${myScore} Puan`;
    if (ui.conquestTerritoryCount) ui.conquestTerritoryCount.textContent = `${myTerritoryCount} Şehir`;

    const phase = s.phase || s.gameState || 'waiting';
    const timerVal = s.timer !== undefined ? s.timer : (s.phaseTimer !== undefined ? s.phaseTimer : 0);
    const pickerId = s.pickingPlayerId || s.activePickerId;

    // Phase Badge & Announcements
    if (ui.conquestPhaseBadge) {
      if (phase === 'waiting') {
        ui.conquestPhaseBadge.textContent = '🏰 LOBİ - Seferi Başlatın';
        ui.conquestPhaseBadge.className = 'conquest-phase-pill phase-lobby';
      } else if (phase === 'question') {
        ui.conquestPhaseBadge.textContent = `❓ SORU #${s.currentRound || 1} (${timerVal}s)`;
        ui.conquestPhaseBadge.className = 'conquest-phase-pill phase-question';
      } else if (phase === 'question_result') {
        ui.conquestPhaseBadge.textContent = '📊 CEVAP DEĞERLENDİRMESİ';
        ui.conquestPhaseBadge.className = 'conquest-phase-pill phase-result';
      } else if (phase === 'conquer_pick') {
        const picker = (gameState.players || []).find(p => p.id === pickerId);
        const pickerName = picker ? picker.name : 'Bir oyuncu';
        if (pickerId === myPlayerId) {
          ui.conquestPhaseBadge.textContent = '⚔️ SENİN SIRAN! BİR ŞEHİR SEÇ!';
          ui.conquestPhaseBadge.className = 'conquest-phase-pill phase-mypick';
        } else {
          ui.conquestPhaseBadge.textContent = `⚔️ ${pickerName} Şehir Seçiyor...`;
          ui.conquestPhaseBadge.className = 'conquest-phase-pill phase-pick';
        }
      } else if (phase === 'game_over') {
        ui.conquestPhaseBadge.textContent = '👑 OYUN BİTTİ - ZAFER!';
        ui.conquestPhaseBadge.className = 'conquest-phase-pill phase-gameover';
      }
    }

    // Modal Control: Question Modal
    if (phase === 'question' && s.currentQuestion) {
      if (ui.modalConquestQuestion && ui.modalConquestQuestion.classList.contains('hidden')) {
        ui.openConquestQuestionModal(s.currentQuestion, timerVal || 16, (answer) => {
          const socketObj = this.socketRef || window.gameApp?.socket;
          if (socketObj) {
            socketObj.sendAction({ type: 'conquest_submit_answer', answer });
          }
        });
      }
      if (ui.conquestQuestionTimer) {
        ui.conquestQuestionTimer.textContent = `${timerVal}s`;
        const progress = Math.max(0, Math.min(100, (timerVal / 16) * 100));
        if (ui.conquestTimerBar) ui.conquestTimerBar.style.width = `${progress}%`;
      }
    } else {
      if (ui.modalConquestQuestion && !ui.modalConquestQuestion.classList.contains('hidden')) {
        ui.modalConquestQuestion.classList.add('hidden');
      }
    }

    // Modal Control: Question Result Podium Modal
    if (phase === 'question_result' && s.lastResult) {
      if (ui.modalConquestResult && ui.modalConquestResult.classList.contains('hidden')) {
        ui.openConquestResultModal(s.lastResult, gameState.players || []);
      }
    } else {
      if (ui.modalConquestResult && !ui.modalConquestResult.classList.contains('hidden')) {
        ui.modalConquestResult.classList.add('hidden');
      }
    }

    // Help / Action Hint Bar
    if (phase === 'waiting') {
      if (ui.hintAction) ui.hintAction.innerHTML = '🏰 <b>Bil ve Fethet:</b> Soruları en yakın ve hızlı cevaplayan şehir fetheder!';
      if (ui.hintHold) ui.hintHold.innerHTML = '👑 <b>Host:</b> Oyunu başlatabilir.';
    } else if (phase === 'question') {
      if (ui.hintAction) ui.hintAction.innerHTML = '⚡ <b>Soru Zamanı:</b> Klavyeden veya ekrandaki tuş takımından cevabını gir!';
      if (ui.hintHold) ui.hintHold.innerHTML = '🎯 Hedef: Doğru cevaba en yakın ve en hızlı olmak.';
    } else if (phase === 'conquer_pick') {
      if (pickerId === myPlayerId) {
        if (ui.hintAction) ui.hintAction.innerHTML = '⚔️ <b>Fetih Sırası Sende:</b> Haritadan ele geçirmek istediğin şehre tıkla!';
      } else {
        if (ui.hintAction) ui.hintAction.innerHTML = '⏳ <b>Bekleniyor:</b> Kazanan oyuncu haritadan şehir seçiyor...';
      }
    }
  }
}

