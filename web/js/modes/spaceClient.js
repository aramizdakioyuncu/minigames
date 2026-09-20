// spaceClient.js - Modular Frontend Client for Uzay Casusu (Spaceship, Castle, Mansion)

import { BaseClientMode } from './BaseClientMode.js';
import { SpaceshipThemeRenderer } from './space/themes/spaceshipTheme.js';
import { CastleThemeRenderer } from './space/themes/castleTheme.js';
import { MansionThemeRenderer } from './space/themes/mansionTheme.js';
import { SpaceMinimapRenderer } from './space/spaceMinimap.js';
import { SpaceSabotageController } from './space/spaceSabotage.js';

export class SpaceClientMode extends BaseClientMode {
  constructor() {
    super('space');
    this.animTime = 0;
    this.spaceshipTheme = new SpaceshipThemeRenderer();
    this.castleTheme = new CastleThemeRenderer();
    this.mansionTheme = new MansionThemeRenderer();
    this.minimapRenderer = new SpaceMinimapRenderer();
    this.sabotageController = new SpaceSabotageController();

    this.currentLoadedTheme = null;
    this.spritesInitialized = false;
    this.propsContainer = null;
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
    if (this.propsContainer && this.propsContainer.parent) {
      this.propsContainer.parent.removeChild(this.propsContainer);
      this.propsContainer = null;
      this.spritesInitialized = false;
      this.currentLoadedTheme = null;
    }
  }

  setupSprites(renderer, theme = 'spaceship') {
    if (this.currentLoadedTheme !== theme) {
      if (this.propsContainer && this.propsContainer.parent) {
        this.propsContainer.parent.removeChild(this.propsContainer);
        this.propsContainer = null;
      }
      this.spritesInitialized = false;
      this.currentLoadedTheme = theme;
    }

    if (this.spritesInitialized || !renderer || !renderer.world || typeof window.PIXI === 'undefined') return;
    this.spritesInitialized = true;

    this.propsContainer = new PIXI.Container();
    if (renderer.envGraphics && renderer.world.children.includes(renderer.envGraphics)) {
      const envIdx = renderer.world.getChildIndex(renderer.envGraphics);
      renderer.world.addChildAt(this.propsContainer, envIdx + 1);
    } else {
      renderer.world.addChild(this.propsContainer);
    }

    if (theme === 'spaceship') {
      this.spaceshipTheme.setupSprites(this.propsContainer);
    }
  }

  renderEnvironment(renderer, g, gameState) {
    const s = (gameState && gameState.modeState) || {};
    const t = performance.now() / 1000;
    this.animTime += 0.03;

    const theme = s.mapTheme || 'spaceship';
    this.setupSprites(renderer, theme);

    if (theme === 'castle') {
      this.castleTheme.renderEnvironment(g, s, t, this.animTime);
    } else if (theme === 'mansion') {
      this.mansionTheme.renderEnvironment(g, s, t, this.animTime);
    } else {
      this.spaceshipTheme.renderEnvironment(g, s, t, this.animTime);
    }
  }

  renderEntities(renderer, g, gameState, entities, myPlayerId) {
    const s = gameState.modeState || {};
    const deadBodies = s.deadBodies || [];
    const myP = (gameState.players || []).find(p => p.id === myPlayerId);
    const isMeeting = s.gameState === 'meeting';
    const isDead = myP && !myP.isAlive;
    const isImpostor = myP && myP.role === 'impostor';
    const lightsOut = s.sabotage && s.sabotage.active && s.sabotage.type === 'lights';

    const visionRad = (isDead || isMeeting) ? 2200 : (lightsOut ? (isImpostor ? 320 : 120) : (isImpostor ? 380 : 300));

    // Render Dead Bodies on Floor
    deadBodies.forEach(b => {
      if (myP && !isDead && !isMeeting) {
        const dist = Math.hypot(b.x - myP.x, b.y - myP.y);
        if (dist > visionRad + 30) return;
      }
      g.lineStyle(3, 0xef4444, 0.95);
      g.beginFill(0x991b1b, 0.9);
      g.drawCircle(b.x, b.y, 16);
      g.endFill();

      // Skull bone / cross
      g.lineStyle(2, 0xffffff, 0.9);
      g.moveTo(b.x - 7, b.y - 7);
      g.lineTo(b.x + 7, b.y + 7);
      g.moveTo(b.x + 7, b.y - 7);
      g.lineTo(b.x - 7, b.y + 7);
    });

    // Impostor Kill Range Indicator Ring
    if (isImpostor && myP && myP.isAlive && s.gameState === 'playing') {
      g.lineStyle(1.5, 0xef4444, 0.45);
      g.drawCircle(myP.x, myP.y, s.killDistance || 85);
    }
  }

  updateHUD(ui, gameState, myPlayerId) {
    if (!ui) return;
    const s = gameState.modeState || {};
    const myP = (gameState.players || []).find(p => p.id === myPlayerId);

    // 1. Task Progress Bar
    if (ui.spaceTaskFill) {
      const prog = s.taskProgress || 0;
      ui.spaceTaskFill.style.width = `${Math.min(100, Math.max(0, prog))}%`;
    }
    if (ui.spaceTaskPercentage) {
      ui.spaceTaskPercentage.textContent = `%${Math.round(s.taskProgress || 0)}`;
    }

    // 2. Role Card and Badge
    if (myP) {
      const isImpostor = myP.role === 'impostor';
      if (ui.spaceRoleBadge) {
        ui.spaceRoleBadge.textContent = isImpostor ? '🔪 CASUS (IMPOSTOR)' : '🚀 MÜRETTEBAT (CREW)';
        ui.spaceRoleBadge.className = isImpostor ? 'badge-role role-impostor' : 'badge-role role-crew';
      }

      // Action Buttons (Kill, Vent, Report, Task)
      const btnKill = document.getElementById('btn-action-kill');
      const btnVent = document.getElementById('btn-action-vent');
      const btnReport = document.getElementById('btn-action-report');
      const btnTask = document.getElementById('btn-action-use');
      const impostorBar = document.getElementById('space-impostor-bar');

      if (impostorBar) {
        impostorBar.classList.toggle('hidden', !isImpostor);
      }

      if (btnKill) {
        btnKill.classList.toggle('hidden', !isImpostor);
        const cd = Math.ceil(myP.killCooldown || 0);
        btnKill.disabled = cd > 0;
        btnKill.textContent = cd > 0 ? `🔪 Öldür (${cd}s)` : '🔪 Öldür [Q]';
      }

      if (btnVent) {
        btnVent.classList.toggle('hidden', !isImpostor);
      }

      // Sabotage HUD Update
      this.sabotageController.updateSabotageHUD(ui, s, myP);
    }

    // 3. Meeting Modal Controller
    if (s.gameState === 'meeting') {
      if (ui.modalMeeting && ui.modalMeeting.classList.contains('hidden')) {
        ui.openMeetingModal(s, gameState.players || [], myPlayerId);
      }
    } else {
      if (ui.modalMeeting && !ui.modalMeeting.classList.contains('hidden')) {
        ui.modalMeeting.classList.add('hidden');
      }
    }
  }

  renderMinimap(canvas, gameState, myPlayerId) {
    this.minimapRenderer.renderMinimap(canvas, gameState, myPlayerId);
  }
}
