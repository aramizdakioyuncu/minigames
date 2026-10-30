import { SpaceScene } from './space/spaceScene.js';
// spaceClient.js - Modular Frontend Client for Uzay Casusu (Spaceship, Castle, Mansion)

import { BaseClientMode } from './BaseClientMode.js';
import { SpaceMinimapRenderer } from './space/spaceMinimap.js';
import { SpaceSabotageController } from './space/spaceSabotage.js';
import { SpacePanels } from './space/spacePanels.js';

export class SpaceClientMode extends BaseClientMode {
  constructor() {
    super('space');
    this.scene=new SpaceScene();
    this.minimapRenderer=new SpaceMinimapRenderer();
    this.sabotageController=new SpaceSabotageController();
  }
  isFixedArena() {return false;}
  getArenaDimensions(state) {return {width:state?.modeState.width||2800,height:state?.modeState.height||1800};}
  onActivate(roomData,ui) {
    if(!this.panels)this.panels=new SpacePanels();
    this.panels.reset();
    this.panels.restoreColor();
    for(const element of [ui.hudPuck,ui.hudSumo,ui.hudAgar,ui.hudLeaderboard,ui.hudTeamSwitcher]) element?.classList.add('hidden');
    ui.hudSpace?.classList.remove('hidden');
  }
  onDeactivate(ui) {
    this.panels?.reset();this.scene.destroy();
    for(const element of [ui.hudSpace,ui.modalMeeting,ui.modalTaskInteractive])element?.classList.add('hidden');
    ui.hudChat?.classList.remove('hidden');
  }
  renderEnvironment() {}
  renderEntities(renderer,g,state,entities,myId) {this.scene.renderWebGL(renderer,state,myId);}
  renderCanvas(renderer,ctx,state,myId) {this.scene.renderCanvas(renderer,ctx,state,myId);}

  updateHUD(ui, gameState, myPlayerId) {
    if (!ui) return;
    const s = gameState.modeState || {};
    const myP = (gameState.players || []).find(p => p.id === myPlayerId);

    // 1. Task Progress Bar
    this.panels?.update(gameState,myPlayerId);
    if (ui.hintAction) ui.hintAction.textContent = 'E / Boşluk: Görev • Q: Öldür • V: Vent';
    if (ui.hintHold) ui.hintHold.textContent = 'R: Bildir • M: Harita • B: Sabotaj';
    if(s.soloPractice&&s.gameState==='playing'&&ui.hintHold)ui.hintHold.textContent='ANTRENMAN • Görevler maç sonucu oluşturmaz.';
    if (ui.hudChat) ui.hudChat.classList.toggle('hidden', s.gameState === 'playing');
    if (ui.btnTouchAction) ui.btnTouchAction.textContent = myP?.role === 'impostor' ? '🔪 ÖLDÜR' : '⚙️ GÖREV';
    if (ui.btnTouchHold) ui.btnTouchHold.classList.add('hidden');
    if (ui.btnTouchVent) ui.btnTouchVent.classList.toggle('hidden', myP?.role !== 'impostor');
    if (ui.btnTouchReport) ui.btnTouchReport.classList.remove('hidden');
    for(const button of [ui.btnTouchAction,ui.btnTouchVent,ui.btnTouchReport]) if(button) button.disabled=s.gameState!=='playing';
    if(s.gameState==='waiting') {
      if(ui.hintAction) ui.hintAction.textContent='Lobi: Görevler ve yetenekler maç başlayınca açılır.';
      ui.closeTaskMiniGame();
    }
    document.getElementById('btn-space-sabotage')?.classList.toggle('hidden', myP?.role !== 'impostor');
    if (ui.spaceTaskFill) {
      const prog = s.taskProgressRatio || 0;
      ui.spaceTaskFill.style.width = `${Math.min(100, Math.max(0, prog))}%`;
    }
    if (ui.spaceTaskPercentage) {
      ui.spaceTaskPercentage.textContent = `%${Math.round(s.taskProgressRatio || 0)}`;
    }

    // 2. Role Card and Badge
    if (myP) {
      const isImpostor = myP.role === 'impostor';
      if (ui.spaceRoleBadge) {
        ui.spaceRoleBadge.textContent = s.gameState==='waiting' ? `LOBİ • ${s.playersMeta.length}/4 oyuncu (1 kişi: antrenman)` : s.soloPractice?'ANTRENMAN • MÜRETTEBAT':(isImpostor ? '🔪 CASUS (IMPOSTOR)' : '🚀 MÜRETTEBAT (CREW)');
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
      ui.closeTaskMiniGame();
      if (ui.meetingTimerText) ui.meetingTimerText.textContent = `${s.meetingTimer}s`;
      if (ui.skipVoteCount) ui.skipVoteCount.textContent = s.skipVotesCount || 0;
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

  checkTaskInteraction(app) {
    const state = app.lastGameState;
    const me = state?.players.find(p => p.id === app.socket.myPlayerId);
    if (!me || me.isSpectator || me.role !== 'crew' || state.modeState.gameState !== 'playing' || !app.ui.modalTaskInteractive.classList.contains('hidden')) return;
    const meta = state.modeState.playersMeta.find(p => p.id === me.id);
    const task = state.modeState.taskStations.find(s => Math.hypot(me.x - s.x, me.y - s.y) < 80 && !meta.completedTasksList?.includes(s.id));
    if (!task) return;
    app.input.resetKeys();
    app.ui.openTaskMiniGame(task, () => app.socket.sendAction({ type: 'complete_task', taskId: task.id }));
    app.socket.sendAction({ type: 'start_task', taskId: task.id });
  }

  toggleMinimap(ui, state, myId) {
    const modal = document.getElementById('modal-space-minimap');
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
      const canvas = modal.querySelector('canvas');
      if (canvas) this.renderMinimap(canvas, state, myId);
    }
  }

  toggleSabotageModal(ui, state, myId) {
    const me = state?.players.find(p => p.id === myId);
    if (me?.role === 'impostor' && me.isAlive) document.getElementById('modal-space-sabotage').classList.toggle('hidden');
  }
}
