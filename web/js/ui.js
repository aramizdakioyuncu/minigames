// ui.js - Modular UI Orchestrator for ARMOYU MiniGames

import { clientModeRegistry } from './modes/clientModeRegistry.js';
import { TasksMiniGamesController } from './ui/tasksMiniGames.js';
import { VampireUIController } from './ui/vampireUI.js';
import { ConquestUIController } from './ui/conquestUI.js';
import { EscMenuController } from './ui/escMenu.js';
import { ProfileUIController } from './ui/profileUI.js';

export class UIController {
  constructor() {
    this.currentView = 'view-profile';
    this.activeFilter = 'all';

    // Views
    this.viewProfile = document.getElementById('view-profile');
    this.viewLobby = document.getElementById('view-lobby');
    this.viewGame = document.getElementById('view-game');

    // Modals
    this.modalCreateRoom = document.getElementById('modal-create-room');

    // Profile inputs
    this.inputNickname = document.getElementById('input-nickname');
    this.avatarPicker = document.getElementById('avatar-picker');
    this.colorPicker = document.getElementById('color-picker');
    this.serverStatus = document.getElementById('txt-server-status');
    this.btnEnterLobby = document.getElementById('btn-enter-lobby');

    // Lobby elements
    this.lobbyUserAvatar = document.getElementById('lobby-user-avatar');
    this.lobbyUserName = document.getElementById('lobby-user-name');
    this.modesCarousel = document.getElementById('modes-carousel');
    this.roomsList = document.getElementById('rooms-list');
    this.btnRefreshRooms = document.getElementById('btn-refresh-rooms');
    this.btnOpenCreateRoom = document.getElementById('btn-open-create-room');
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.btnOpenProfileModal = document.getElementById('btn-open-profile-modal');

    // Create room inputs
    this.createRoomName = document.getElementById('create-room-name');
    this.createMaxPlayers = document.getElementById('create-max-players');
    this.btnSubmitCreateRoom = document.getElementById('btn-submit-create-room');
    this.btnCancelCreate = document.getElementById('btn-cancel-create');
    this.btnCloseModal = document.getElementById('btn-close-modal');

    // Game HUD elements
    this.hudPuck = document.getElementById('hud-puck');
    this.hudSumo = document.getElementById('hud-sumo');
    this.hudAgar = document.getElementById('hud-agar');
    this.hudSpace = document.getElementById('hud-space');
    this.spaceTaskFill = document.getElementById('task-progress-fill');
    this.spaceTaskPercentage = document.getElementById('task-percent-text');
    this.spaceRoleBadge = document.getElementById('space-role-badge');
    this.roleRevealBanner = document.getElementById('role-reveal-banner');
    this.roleRevealTitle = document.getElementById('role-reveal-title');
    this.roleRevealDesc = document.getElementById('role-reveal-desc');

    // Emergency Meeting Modal
    this.modalMeeting = document.getElementById('modal-emergency-meeting');
    this.meetingReasonText = document.getElementById('meeting-reason-text');
    this.meetingTimerText = document.getElementById('meeting-timer-text');
    this.meetingPlayersGrid = document.getElementById('meeting-players-grid');
    this.btnSkipVote = document.getElementById('btn-skip-vote');
    this.skipVoteCount = document.getElementById('skip-vote-count');
    this.meetingChatMessages = document.getElementById('meeting-chat-messages');
    this.meetingChatForm = document.getElementById('meeting-chat-form');
    this.meetingChatInput = document.getElementById('meeting-chat-input');

    // Cinematic Ejection Screen
    this.ejectionScreen = document.getElementById('ejection-screen');
    this.ejectedAvatar = document.getElementById('ejected-avatar');
    this.ejectionTitle = document.getElementById('ejection-title');
    this.ejectionSubtitle = document.getElementById('ejection-subtitle');

    // Interactive Task Modal & Panels
    this.modalTaskInteractive = document.getElementById('modal-task-interactive');
    this.btnCloseTask = document.getElementById('btn-close-task');
    this.taskMiniIcon = document.getElementById('task-mini-icon');
    this.taskMiniTitle = document.getElementById('task-mini-title');
    this.taskPanels = {
      wires: document.getElementById('task-panel-wires'),
      shields: document.getElementById('task-panel-shields'),
      medscan: document.getElementById('task-panel-medscan'),
      trash: document.getElementById('task-panel-trash'),
      reactor: document.getElementById('task-panel-reactor'),
      steer: document.getElementById('task-panel-steer')
    };

    // ESC Menu Modal Elements
    this.modalEscMenu = document.getElementById('modal-esc-menu');
    this.btnOpenEscMenu = document.getElementById('btn-open-esc-menu');
    this.btnEscClose = document.getElementById('btn-esc-close');
    this.btnEscResume = document.getElementById('btn-esc-resume');
    this.escRoomName = document.getElementById('esc-room-name');
    this.escHostBadge = document.getElementById('esc-room-host-badge');
    this.btnHostToggleMatch = document.getElementById('btn-host-toggle-match');
    this.btnHostRestart = document.getElementById('btn-host-restart');
    this.btnPlayerVoteRestart = document.getElementById('btn-player-vote-restart');
    this.btnEscSoundToggle = document.getElementById('btn-esc-sound-toggle');
    this.btnEscZoomToggle = document.getElementById('btn-esc-zoom-toggle');
    this.btnEscLeaveRoom = document.getElementById('btn-esc-leave-room');
    this.btnHudStartMatch = document.getElementById('btn-hud-start-match');
    this.btnHudVoteMatch = document.getElementById('btn-hud-vote-match');

    // Spectator & Team Switcher
    this.hudSpectatorBanner = document.getElementById('hud-spectator-banner');
    this.btnSpecJoinRed = document.getElementById('btn-spec-join-red');
    this.btnSpecJoinBlue = document.getElementById('btn-spec-join-blue');
    this.hudLeaderboard = document.getElementById('hud-leaderboard');
    this.leaderboardList = document.getElementById('leaderboard-list');
    this.scoreRed = document.getElementById('score-red');
    this.scoreBlue = document.getElementById('score-blue');
    this.matchTimer = document.getElementById('match-timer');
    this.sumoStatusText = document.getElementById('sumo-status-text');
    this.agarMyScore = document.getElementById('agar-my-score');
    this.pingDisplay = document.getElementById('ping-display');
    this.fpsDisplay = document.getElementById('fps-display');
    this.btnLeaveGame = document.getElementById('btn-leave-game');
    this.hudTeamSwitcher = document.getElementById('hud-team-switcher');
    this.puckPhaseBadge = document.getElementById('puck-phase-badge');
    this.labelTeamRed = document.getElementById('label-team-red');
    this.labelTeamBlue = document.getElementById('label-team-blue');

    // Hints
    this.hintAction = document.getElementById('hint-action');
    this.hintHold = document.getElementById('hint-hold');
    this.hintExtra = document.getElementById('hint-extra');
    this.btnTouchAction = document.getElementById('btn-touch-action');
    this.btnTouchHold = document.getElementById('btn-touch-hold');
    this.btnTouchVent = document.getElementById('btn-touch-vent');
    this.btnTouchReport = document.getElementById('btn-touch-report');

    // Chat
    this.hudChat = document.getElementById('hud-chat');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatForm = document.getElementById('chat-form');
    this.chatInput = document.getElementById('chat-input');

    // Vampire Mode Elements
    this.hudVampire = document.getElementById('hud-vampire');
    this.vampirePhaseBadge = document.getElementById('vampire-phase-badge');
    this.vampireDayCount = document.getElementById('vampire-day-count');
    this.vampirePhaseTimer = document.getElementById('vampire-phase-timer');
    this.vampireAliveCount = document.getElementById('vampire-alive-count');
    this.vampireRoleBadge = document.getElementById('vampire-role-badge');
    this.modalVampireRoleReveal = document.getElementById('modal-vampire-role');
    this.vampireRoleIcon = document.getElementById('vampire-reveal-icon');
    this.vampireRoleTitle = document.getElementById('vampire-reveal-title');
    this.vampireRoleTeam = document.getElementById('vampire-team-list');
    this.vampireRoleDesc = document.getElementById('vampire-reveal-desc');
    this.modalVampireNight = document.getElementById('modal-vampire-action');
    this.vampireNightActionTitle = document.getElementById('vampire-action-title');
    this.vampireNightTargetList = document.getElementById('vampire-action-grid');

    // Conquest Mode Elements
    this.hudConquest = document.getElementById('hud-conquest');
    this.conquestPhaseBadge = document.getElementById('conquest-phase-badge');
    this.conquestRoundCount = document.getElementById('conquest-round-count');
    this.conquestMyScore = document.getElementById('conquest-my-score');
    this.conquestTerritoryCount = document.getElementById('conquest-territory-count');
    this.modalConquestQuestion = document.getElementById('modal-conquest-question');
    this.conquestCatBadge = document.getElementById('conquest-cat-badge');
    this.conquestQuestionTimer = document.getElementById('conquest-question-timer');
    this.conquestTimerBar = document.getElementById('conquest-timer-bar');
    this.conquestQuestionText = document.getElementById('conquest-question-text');
    this.conquestUnitHint = document.getElementById('conquest-unit-hint');
    this.conquestAnswerInput = document.getElementById('conquest-answer-input');
    this.btnConquestClear = document.getElementById('btn-conquest-clear');
    this.btnConquestBackspace = document.getElementById('btn-conquest-backspace');
    this.btnConquestSubmitAnswer = document.getElementById('btn-conquest-submit-answer');
    this.modalConquestResult = document.getElementById('modal-conquest-result');
    this.conquestCorrectAnswerVal = document.getElementById('conquest-correct-answer-val');
    this.conquestPodiumList = document.getElementById('conquest-podium-list');

    // Goal Announcement
    this.goalAnnouncement = document.getElementById('goal-announcement');
    this.goalText = document.getElementById('goal-text');
    this.goalScorer = document.getElementById('goal-scorer');

    // Instantiate Sub-Controllers
    this.tasksController = new TasksMiniGamesController(this);
    this.vampireController = new VampireUIController(this);
    this.conquestController = new ConquestUIController(this);
    this.escMenuController = new EscMenuController(this);
    this.profileUIController = new ProfileUIController(this);

    if (this.btnOpenProfileModal) {
      this.btnOpenProfileModal.addEventListener('click', () => this.profileUIController.openProfileDashboard());
    }

    if (this.btnCloseTask) {
      this.btnCloseTask.addEventListener('click', () => this.tasksController.closeTask());
    }
  }

  showView(viewId) {
    [this.viewProfile, this.viewLobby, this.viewGame].forEach(v => {
      if (v) {
        v.classList.toggle('active', v.id === viewId);
      }
    });
    this.currentView = viewId;
  }

  setServerStatus(online) {
    if (this.serverStatus) {
      if (online) {
        this.serverStatus.textContent = 'Sunucu Çevrimiçi 🟢';
        this.serverStatus.style.color = '#10b981';
      } else {
        this.serverStatus.textContent = 'Sunucuya Bağlanıyor... 🟡';
        this.serverStatus.style.color = '#f59e0b';
      }
    }
  }

  renderRooms(rooms, onJoinCallback) {
    if (!this.roomsList) return;
    this.roomsList.innerHTML = '';

    const filtered = rooms.filter(r => {
      if (this.activeFilter === 'all') return true;
      return r.mode === this.activeFilter;
    });

    if (filtered.length === 0) {
      this.roomsList.innerHTML = `
        <div class="rooms-empty">
          <p>Aktif oda bulunamadı.</p>
          <p class="sub-text">Hemen "+ Yeni Oda Kur" butonuna tıklayarak ilk odayı başlat!</p>
        </div>
      `;
      return;
    }

    filtered.forEach(room => {
      const item = document.createElement('div');
      item.className = 'room-card';

      let tagClass = 'tag-puck';
      let modeIcon = '⚽';
      let modeTitle = 'Futbol';

      if (room.mode === 'sumo') {
        tagClass = 'tag-sumo'; modeIcon = '🥊'; modeTitle = 'Sumo';
      } else if (room.mode === 'agar') {
        tagClass = 'tag-agar'; modeIcon = '🟢'; modeTitle = 'Agar';
      } else if (room.mode === 'space') {
        tagClass = 'tag-space'; modeIcon = '🚀'; modeTitle = 'Uzay Casusu';
      } else if (room.mode === 'vampire') {
        tagClass = 'tag-vampire'; modeIcon = '🧛'; modeTitle = 'Vampir Köylü';
      } else if (room.mode === 'conquest') {
        tagClass = 'tag-conquest'; modeIcon = '🏰'; modeTitle = 'Bil ve Fethet';
      }

      const isFull = (room.playersCount || room.playerCount || 0) >= room.maxPlayers;

      item.innerHTML = `
        <div class="room-info">
          <div class="room-title-row">
            <h4 class="room-name">${this.escapeHtml(room.name || 'Arena')}</h4>
            <span class="mode-tag ${tagClass}">${modeIcon} ${modeTitle}</span>
          </div>
          <div class="room-meta">
            <span>👥 ${room.playersCount || room.playerCount || 0} / ${room.maxPlayers} Oyuncu</span>
            <span>⚡ Hız: ${room.speedMultiplier || 1.0}x</span>
          </div>
        </div>
        <div class="room-actions">
          <button class="btn btn-primary btn-sm btn-join" ${isFull ? 'disabled' : ''}>
            ${isFull ? 'Dolu' : 'Katıl ➔'}
          </button>
        </div>
      `;

      const btnJoin = item.querySelector('.btn-join');
      if (btnJoin && !isFull) {
        btnJoin.addEventListener('click', () => {
          if (onJoinCallback) onJoinCallback(room.id);
        });
      }

      this.roomsList.appendChild(item);
    });
  }

  renderGameModesCarousel(modes) {
    if (!this.modesCarousel || !modes) return;
    this.modesCarousel.innerHTML = '';

    modes.forEach(mode => {
      const card = document.createElement('div');
      card.className = `mode-card card-${mode.id}`;
      card.innerHTML = `
        <div class="mode-badge" style="background: ${mode.color || 'var(--primary)'}22; color: ${mode.color || 'var(--primary)'}; border: 1px solid ${mode.color || 'var(--primary)'}44;">
          ${mode.badge || 'Mod'}
        </div>
        <h3>${mode.name}</h3>
        <p>${mode.description}</p>
      `;
      this.modesCarousel.appendChild(card);
    });
  }

  showGoalBanner(title, text) {
    if (!this.goalAnnouncement) return;
    if (this.goalText) this.goalText.textContent = title || 'GOL!';
    if (this.goalScorer) this.goalScorer.textContent = text || '';

    this.goalAnnouncement.classList.remove('hidden');
    this.goalAnnouncement.classList.add('animate-banner');

    setTimeout(() => {
      if (this.goalAnnouncement) {
        this.goalAnnouncement.classList.remove('animate-banner');
        this.goalAnnouncement.classList.add('hidden');
      }
    }, 2800);
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'hud-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  prepareGameHUD(mode, roomData) {
    if (!mode) return;
    const activeMode = clientModeRegistry.getActiveMode(mode);
    if (activeMode && typeof activeMode.onActivate === 'function') {
      activeMode.onActivate(roomData, this);
    }
  }

  updateHUD(gameState, myPlayerId) {
    if (!gameState) return;
    const activeMode = clientModeRegistry.getActiveMode(gameState.mode);
    if (activeMode && typeof activeMode.updateHUD === 'function') {
      activeMode.updateHUD(this, gameState, myPlayerId);
    }
  }

  addChatMessage(sender, text, color = '#ffffff') {
    if (!this.chatMessages) return;
    const msg = document.createElement('div');
    msg.className = 'chat-msg';
    msg.innerHTML = `<span class="sender" style="color: ${color}">${this.escapeHtml(sender)}:</span> <span class="text">${this.escapeHtml(text)}</span>`;
    this.chatMessages.appendChild(msg);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  toggleEscMenu(show) {
    if (!this.modalEscMenu) return;
    if (show !== undefined) {
      this.modalEscMenu.classList.toggle('hidden', !show);
    } else {
      this.modalEscMenu.classList.toggle('hidden');
    }
  }

  updateEscMenu(arg1, arg2, arg3) {
    let roomData, gameState, myPlayerId;
    if (arg1 && arg1.players) {
      gameState = arg1;
      myPlayerId = arg2;
      roomData = arg3;
    } else {
      roomData = arg1;
      gameState = arg2;
      myPlayerId = arg3;
    }
    if (this.escMenuController && typeof this.escMenuController.updateEscMenu === 'function') {
      this.escMenuController.updateEscMenu(roomData, gameState, myPlayerId);
    }
  }

  openMeetingModal(modeState, players, myPlayerId) {
    if (!this.modalMeeting) return;
    if (this.meetingReasonText) {
      this.meetingReasonText.textContent = modeState.meetingCaller
        ? `${modeState.meetingCaller} acil durum butonuna bastı!`
        : (modeState.deadBodies?.length ? 'Bir ceset bildirildi!' : 'Acil Durum Toplantısı');
    }
    if (this.meetingTimerText) {
      this.meetingTimerText.textContent = `${Math.ceil(modeState.meetingTimer || 30)}s`;
    }

    if (this.meetingPlayersGrid) {
      this.meetingPlayersGrid.innerHTML = '';
      const alivePlayers = (players || []).filter(p => !p.isSpectator);

      alivePlayers.forEach(p => {
        const isDead = p.isAlive === false;
        const card = document.createElement('div');
        card.className = `meeting-player-card ${isDead ? 'dead' : ''}`;
        card.innerHTML = `
          <div class="card-avatar" style="border-color: ${p.color || '#3b82f6'}">${p.avatar || '👤'}</div>
          <div class="card-name">${this.escapeHtml(p.name)}</div>
          <div class="card-status">${isDead ? '💀 Ölü' : '❤️ Canlı'}</div>
        `;
        this.meetingPlayersGrid.appendChild(card);
      });
    }

    this.modalMeeting.classList.remove('hidden');
  }

  openTaskMiniGame(station, onComplete) {
    this.tasksController.openTask(station, onComplete);
  }

  closeTaskMiniGame() {
    this.tasksController.closeTask();
  }

  showRoleReveal(role, team) {
    if (this.vampireController && typeof this.vampireController.showRoleReveal === 'function') {
      this.vampireController.showRoleReveal(role, team);
    }
  }

  showVampireRoleReveal(role, team) {
    this.vampireController.showRoleReveal(role, team);
  }

  openVampireNightModal(role, playersMeta, myPlayerId, onAction) {
    this.vampireController.openNightModal(role, playersMeta, myPlayerId, onAction);
  }

  closeVampireNightModal() {
    this.vampireController.closeNightModal();
  }

  openConquestQuestionModal(qData, timer, onSubmit) {
    this.conquestController.openQuestionModal(qData, timer, onSubmit);
  }

  openConquestResultModal(resData, players) {
    this.conquestController.openResultModal(resData, players);
  }

  escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
}
