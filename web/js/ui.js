// UI Controller for DOM interactions, Modals and HUD updates
import { clientModeRegistry } from './modes/clientModeRegistry.js';

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

    // Profile elements
    this.inputNickname = document.getElementById('input-nickname');
    this.avatarPicker = document.getElementById('avatar-picker');
    this.colorPicker = document.getElementById('color-picker');
    this.serverStatus = document.getElementById('txt-server-status');
    this.btnEnterLobby = document.getElementById('btn-enter-lobby');

    // Lobby elements
    this.lobbyUserAvatar = document.getElementById('lobby-user-avatar');
    this.lobbyUserName = document.getElementById('lobby-user-name');
    this.roomsList = document.getElementById('rooms-list');
    this.btnRefreshRooms = document.getElementById('btn-refresh-rooms');
    this.btnOpenCreateRoom = document.getElementById('btn-open-create-room');
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');

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
    this.taskProgressFill = document.getElementById('task-progress-fill');
    this.taskPercentText = document.getElementById('task-percent-text');
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
    this.activeTaskStation = null;
    this.taskPanels = {
      wires: document.getElementById('task-panel-wires'),
      shields: document.getElementById('task-panel-shields'),
      medscan: document.getElementById('task-panel-medscan'),
      trash: document.getElementById('task-panel-trash'),
      reactor: document.getElementById('task-panel-reactor'),
      steer: document.getElementById('task-panel-steer')
    };

    if (this.btnCloseTask) {
      this.btnCloseTask.addEventListener('click', () => this.closeTaskMiniGame());
    }

    // ESC Menu Modal Elements
    this.modalEscMenu = document.getElementById('modal-esc-menu');
    this.btnOpenEscMenu = document.getElementById('btn-open-esc-menu');
    this.btnEscClose = document.getElementById('btn-esc-close');
    this.btnEscResume = document.getElementById('btn-esc-resume');
    this.escRoomName = document.getElementById('esc-room-name');
    this.escHostBadge = document.getElementById('esc-room-host-badge');
    this.btnHostRestart = document.getElementById('btn-host-restart');
    this.btnPlayerVoteRestart = document.getElementById('btn-player-vote-restart');
    this.escRestartVoteCount = document.getElementById('esc-restart-vote-count');
    this.btnEscSoundToggle = document.getElementById('btn-esc-sound-toggle');
    this.btnEscZoomToggle = document.getElementById('btn-esc-zoom-toggle');
    this.btnEscLeaveRoom = document.getElementById('btn-esc-leave-room');

    // Spectator Banner Elements
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
    this.btnHostToggleMatch = document.getElementById('btn-host-toggle-match');

    // Dynamic Hints & Mobile Buttons
    this.hintAction = document.getElementById('hint-action');
    this.hintHold = document.getElementById('hint-hold');
    this.hintExtra = document.getElementById('hint-extra');
    this.btnTouchAction = document.getElementById('btn-touch-action');
    this.btnTouchHold = document.getElementById('btn-touch-hold');
    this.btnTouchVent = document.getElementById('btn-touch-vent');
    this.btnTouchReport = document.getElementById('btn-touch-report');

    // Chat
    this.chatMessages = document.getElementById('chat-messages');
    this.chatForm = document.getElementById('chat-form');
    this.chatInput = document.getElementById('chat-input');

    // Goal Announcement
    this.goalAnnouncement = document.getElementById('goal-announcement');
    this.goalText = document.getElementById('goal-text');
    this.goalScorer = document.getElementById('goal-scorer');
  }

  showView(viewId) {
    [this.viewProfile, this.viewLobby, this.viewGame].forEach(v => {
      if (v) {
        if (v.id === viewId) {
          v.classList.add('active');
        } else {
          v.classList.remove('active');
        }
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
      this.roomsList.innerHTML = `<div class="rooms-empty">Bu kategoride açık oda bulunamadı. Hemen bir tane oluşturabilirsin!</div>`;
      return;
    }

    filtered.forEach(room => {
      const item = document.createElement('div');
      item.className = 'room-item';

      let tagClass = 'tag-puck';
      let tagLabel = '⚽ DİSK FUTBOLU';
      if (room.mode === 'space') {
        tagClass = 'tag-space';
        tagLabel = '🚀 UZAY CASUSU';
      } else if (room.mode === 'sumo') {
        tagClass = 'tag-sumo';
        tagLabel = '🥊 SUMO';
      } else if (room.mode === 'agar') {
        tagClass = 'tag-agar';
        tagLabel = '🟢 AGAR';
      }

      const isFull = room.playerCount >= room.maxPlayers;
      let speedIcon = '⚡';
      let speedLabel = '1.0x';
      if (room.speedMultiplier >= 1.4) {
        speedIcon = '🔥';
        speedLabel = `${room.speedMultiplier}x Turbo`;
      } else if (room.speedMultiplier >= 1.15) {
        speedIcon = '🚀';
        speedLabel = `${room.speedMultiplier}x Hızlı`;
      } else {
        speedLabel = `${room.speedMultiplier || 1.0}x Normal`;
      }

      const tackleBadge = room.tackleEnabled ? `<span class="room-tackle-tag">🥊 Faul Açık</span>` : '';

      item.innerHTML = `
        <div class="room-info-left">
          <span class="room-mode-tag ${tagClass}">${tagLabel}</span>
          <span class="room-speed-tag">${speedIcon} ${speedLabel}</span>
          ${tackleBadge}
          <span class="room-title">${this.escapeHtml(room.name)}</span>
        </div>
        <div class="room-info-right">
          <span class="room-players-badge">👥 ${room.playerCount} / ${room.maxPlayers}</span>
          <button class="btn ${isFull ? 'btn-secondary' : 'btn-primary'} btn-sm btn-join" ${isFull ? 'disabled' : ''}>
            ${isFull ? 'Dolu' : 'Katıl ➔'}
          </button>
        </div>
      `;

      const btnJoin = item.querySelector('.btn-join');
      const handleJoin = (e) => {
        if (!isFull) {
          onJoinCallback(room.id);
        }
      };

      item.style.cursor = isFull ? 'default' : 'pointer';
      item.addEventListener('click', handleJoin);
      if (btnJoin) {
        btnJoin.addEventListener('click', (e) => {
          e.stopPropagation();
          handleJoin(e);
        });
      }

      this.roomsList.appendChild(item);
    });
  }

  prepareGameHUD(mode, roomData) {
    clientModeRegistry.activate(mode, roomData, this);
  }

  updateHUD(gameState, myPlayerId) {
    if (!gameState) return;
    const activeMode = clientModeRegistry.getActiveMode();
    if (activeMode && activeMode.updateHUD) {
      activeMode.updateHUD(this, gameState, myPlayerId);
    }
  }

  renderMeetingPlayers(players, myPlayerId) {
    if (!this.meetingPlayersGrid) return;
    this.meetingPlayersGrid.innerHTML = '';

    const myPlayerMeta = players.find(p => p.id === myPlayerId);
    const iHaveVoted = myPlayerMeta ? myPlayerMeta.hasVoted : false;
    const isMeDead = myPlayerMeta ? !myPlayerMeta.isAlive : false;

    players.forEach(p => {
      const isDead = !p.isAlive;
      const isMe = p.id === myPlayerId;
      const card = document.createElement('div');
      card.className = `meeting-player-card ${isDead ? 'meeting-player-dead' : ''} ${isMe ? 'meeting-player-me' : ''}`;
      
      const votedBadge = p.hasVoted ? `<span class="voted-check-badge">✓ Oy Verdi</span>` : `<span class="voted-waiting-badge">⏳ Düşünüyor</span>`;
      const voteBtn = (!isDead && !isMe && !iHaveVoted && !isMeDead) ? `<button class="btn-vote" data-id="${p.id}">🗳️ OY VER</button>` : '';

      card.innerHTML = `
        <div class="meeting-card-left">
          <span class="meeting-avatar">${p.avatar || '👤'}</span>
          <div class="meeting-player-details">
            <span class="meeting-name" style="color: ${p.color || '#fff'}">${this.escapeHtml(p.name)}${isMe ? ' (Sen)' : ''}</span>
            ${isDead ? '<span class="dead-status-tag">💀 Elendi</span>' : votedBadge}
          </div>
        </div>
        <div class="meeting-card-right">
          ${voteBtn}
        </div>
      `;
      this.meetingPlayersGrid.appendChild(card);
    });
  }

  showEjectionScreen(ejectedData, isTie, isSkip, message) {
    if (!this.ejectionScreen) return;

    if (ejectedData) {
      if (this.ejectedAvatar) this.ejectedAvatar.textContent = ejectedData.avatar || '⚽';
      if (this.ejectionTitle) this.ejectionTitle.textContent = `${ejectedData.name} uzay boşluğuna fırlatıldı...`;
      if (this.ejectionSubtitle) {
        if (ejectedData.wasImpostor) {
          this.ejectionSubtitle.textContent = `🔪 ${ejectedData.name} BİR CASUSTU! (${ejectedData.impostorsLeft} Casus Kaldı)`;
          this.ejectionSubtitle.style.color = '#ef4444';
        } else {
          this.ejectionSubtitle.textContent = `🛠️ ${ejectedData.name} bir Casus Değildi. (${ejectedData.impostorsLeft} Casus Kaldı)`;
          this.ejectionSubtitle.style.color = '#38bdf8';
        }
      }
    } else {
      if (this.ejectedAvatar) this.ejectedAvatar.textContent = '🌌';
      if (this.ejectionTitle) this.ejectionTitle.textContent = isSkip ? 'Oylama Pas Geçildi.' : 'Oylama Berabere Sonuçlandı.';
      if (this.ejectionSubtitle) {
        this.ejectionSubtitle.textContent = 'Kimse uzay boşluğuna atılmadı.';
        this.ejectionSubtitle.style.color = '#94a3b8';
      }
    }

    this.ejectionScreen.classList.remove('hidden');

    setTimeout(() => {
      this.ejectionScreen.classList.add('hidden');
    }, 4500);
  }

  addMeetingChatMessage(sender, text, color) {
    if (!this.meetingChatMessages) return;
    const item = document.createElement('div');
    item.className = 'chat-item';
    item.innerHTML = `<span class="chat-sender" style="color: ${color || '#38bdf8'}">${this.escapeHtml(sender)}:</span> <span class="chat-text">${this.escapeHtml(text)}</span>`;

    this.meetingChatMessages.appendChild(item);
    this.meetingChatMessages.scrollTop = this.meetingChatMessages.scrollHeight;
  }

  // --- ESC Pause & Quick Menu ---

  toggleEscMenu(forceOpen = null) {
    if (!this.modalEscMenu) return;
    if (forceOpen === true) {
      this.modalEscMenu.classList.remove('hidden');
    } else if (forceOpen === false) {
      this.modalEscMenu.classList.add('hidden');
    } else {
      this.modalEscMenu.classList.toggle('hidden');
    }
  }

  isEscMenuOpen() {
    return this.modalEscMenu && !this.modalEscMenu.classList.contains('hidden');
  }

  updateEscMenu(gameState, myPlayerId, roomData) {
    if (!this.modalEscMenu) return;

    if (roomData && this.escRoomName) {
      this.escRoomName.textContent = `Oda: ${roomData.roomName || roomData.name || 'Arena'}`;
    }

    if (gameState) {
      const isHost = gameState.hostId === myPlayerId;
      const hostPlayer = (gameState.players || []).find(p => p.id === gameState.hostId);
      const isMatchActive = !!(gameState.modeState && gameState.modeState.isMatchActive);

      if (this.escHostBadge) {
        this.escHostBadge.textContent = `👑 Host: ${hostPlayer ? hostPlayer.name : 'Bilinmiyor'}${isHost ? ' (Sen)' : ''}`;
      }

      // Host Start / Stop Toggle Button
      if (this.btnHostToggleMatch) {
        this.btnHostToggleMatch.classList.toggle('hidden', !isHost);
        if (isHost) {
          if (isMatchActive) {
            this.btnHostToggleMatch.textContent = '⏹️ Maçı Bitir (Host)';
            this.btnHostToggleMatch.className = 'btn btn-danger btn-block';
          } else {
            this.btnHostToggleMatch.textContent = '⚽ Maçı Başlat (Host)';
            this.btnHostToggleMatch.className = 'btn btn-primary btn-block';
          }
        }
      }

      if (this.btnHostRestart) {
        this.btnHostRestart.classList.toggle('hidden', !isHost);
      }

      if (this.btnPlayerVoteRestart) {
        this.btnPlayerVoteRestart.classList.toggle('hidden', isHost);
        const votes = gameState.restartVotesCount || 0;
        const needed = gameState.restartVotesNeeded || 1;
        const voteLabel = isMatchActive ? 'Maçı Yeniden Başlatma Oyu Ver' : 'Maçı Başlatma Oyu Ver';
        this.btnPlayerVoteRestart.innerHTML = `🗳️ ${voteLabel} <span id="esc-restart-vote-count">(${votes}/${needed})</span>`;
        this.escRestartVoteCount = document.getElementById('esc-restart-vote-count');
      }
    }
  }

  // --- Interactive Mini-Tasks System ---

  openTaskMiniGame(station, onCompleteCallback) {
    if (!this.modalTaskInteractive || !station) return;
    this.activeTaskStation = station;

    if (this.taskMiniIcon) this.taskMiniIcon.textContent = station.icon || '⚡';
    if (this.taskMiniTitle) this.taskMiniTitle.textContent = station.name || 'Görev';

    // Hide all panels first
    Object.values(this.taskPanels).forEach(panel => {
      if (panel) panel.classList.add('hidden');
    });

    if (station.id === 'task_wires_elec') {
      if (this.taskPanels.wires) this.taskPanels.wires.classList.remove('hidden');
      this.initWiringTask(onCompleteCallback);
    } else if (station.id === 'task_shields_sec') {
      if (this.taskPanels.shields) this.taskPanels.shields.classList.remove('hidden');
      this.initShieldsTask(onCompleteCallback);
    } else if (station.id === 'task_scan_medbay') {
      if (this.taskPanels.medscan) this.taskPanels.medscan.classList.remove('hidden');
      this.initMedScanTask(onCompleteCallback);
    } else if (station.id === 'task_trash_cafe') {
      if (this.taskPanels.trash) this.taskPanels.trash.classList.remove('hidden');
      this.initTrashTask(onCompleteCallback);
    } else if (station.id === 'task_reactor_align') {
      if (this.taskPanels.reactor) this.taskPanels.reactor.classList.remove('hidden');
      this.initReactorTask(onCompleteCallback);
    } else if (station.id === 'task_steer_cockpit') {
      if (this.taskPanels.steer) this.taskPanels.steer.classList.remove('hidden');
      this.initSteerTask(onCompleteCallback);
    }

    this.modalTaskInteractive.classList.remove('hidden');
  }

  closeTaskMiniGame() {
    if (this.taskTimer) {
      clearInterval(this.taskTimer);
      this.taskTimer = null;
    }
    if (this.modalTaskInteractive) {
      this.modalTaskInteractive.classList.add('hidden');
    }
    this.activeTaskStation = null;
  }

  initWiringTask(onComplete) {
    const leftCol = document.getElementById('wire-left-col');
    const rightCol = document.getElementById('wire-right-col');
    const svg = document.getElementById('wire-svg');
    if (!leftCol || !rightCol || !svg) return;

    leftCol.innerHTML = '';
    rightCol.innerHTML = '';
    svg.innerHTML = '';

    const colors = [
      { id: 'red', color: '#ef4444', label: '1' },
      { id: 'blue', color: '#3b82f6', label: '2' },
      { id: 'yellow', color: '#eab308', label: '3' },
      { id: 'pink', color: '#ec4899', label: '4' }
    ];

    const leftColors = [...colors];
    const rightColors = [...colors].sort(() => Math.random() - 0.5);

    let selectedLeft = null;
    let connectedCount = 0;

    leftColors.forEach(c => {
      const node = document.createElement('div');
      node.className = 'wire-node';
      node.style.backgroundColor = c.color;
      node.style.color = c.color;
      node.dataset.color = c.id;

      node.addEventListener('click', () => {
        if (node.classList.contains('connected')) return;
        leftCol.querySelectorAll('.wire-node').forEach(n => n.style.transform = 'scale(1)');
        node.style.transform = 'scale(1.25)';
        selectedLeft = { node, color: c.id, elem: node };
      });
      leftCol.appendChild(node);
    });

    rightColors.forEach(c => {
      const node = document.createElement('div');
      node.className = 'wire-node';
      node.style.backgroundColor = c.color;
      node.style.color = c.color;
      node.dataset.color = c.id;

      node.addEventListener('click', () => {
        if (!selectedLeft || node.classList.contains('connected')) return;

        if (selectedLeft.color === c.id) {
          // Connected successfully!
          selectedLeft.node.classList.add('connected');
          node.classList.add('connected');
          selectedLeft.node.style.transform = 'scale(1)';

          // Draw SVG line
          const boxRect = document.getElementById('wiring-game-box').getBoundingClientRect();
          const r1 = selectedLeft.node.getBoundingClientRect();
          const r2 = node.getBoundingClientRect();

          const x1 = r1.left + r1.width / 2 - boxRect.left;
          const y1 = r1.top + r1.height / 2 - boxRect.top;
          const x2 = r2.left + r2.width / 2 - boxRect.left;
          const y2 = r2.top + r2.height / 2 - boxRect.top;

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', x1);
          line.setAttribute('y1', y1);
          line.setAttribute('x2', x2);
          line.setAttribute('y2', y2);
          line.setAttribute('stroke', c.color);
          line.setAttribute('stroke-width', '6');
          line.setAttribute('stroke-linecap', 'round');
          svg.appendChild(line);

          selectedLeft = null;
          connectedCount++;

          if (connectedCount >= colors.length) {
            setTimeout(() => {
              if (onComplete) onComplete(this.activeTaskStation ? this.activeTaskStation.id : 'task_wires_elec');
              this.closeTaskMiniGame();
            }, 500);
          }
        }
      });
      rightCol.appendChild(node);
    });
  }

  initShieldsTask(onComplete) {
    const grid = document.getElementById('shields-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const totalCells = 6;
    let activeCount = 2; // 2 start active, 4 broken

    for (let i = 0; i < totalCells; i++) {
      const hex = document.createElement('div');
      const isBroken = i >= 2;
      hex.className = `shield-hex ${isBroken ? 'broken' : 'active'}`;
      hex.innerHTML = isBroken ? '⚠️' : '⚡';

      hex.addEventListener('click', () => {
        if (!hex.classList.contains('active')) {
          hex.classList.remove('broken');
          hex.classList.add('active');
          hex.innerHTML = '⚡';
          activeCount++;

          if (activeCount >= totalCells) {
            setTimeout(() => {
              if (onComplete) onComplete(this.activeTaskStation ? this.activeTaskStation.id : 'task_shields_sec');
              this.closeTaskMiniGame();
            }, 500);
          }
        }
      });
      grid.appendChild(hex);
    }
  }

  initMedScanTask(onComplete) {
    const bar = document.getElementById('medscan-bar-fill');
    const statusText = document.getElementById('medscan-status-text');
    if (!bar) return;

    bar.style.width = '0%';
    if (statusText) statusText.textContent = 'Biyometrik Tarama Başlatılıyor...';

    let progress = 0;
    if (this.taskTimer) clearInterval(this.taskTimer);

    this.taskTimer = setInterval(() => {
      progress += 5;
      bar.style.width = `${progress}%`;
      if (statusText) statusText.textContent = `Biyometrik Tarama: %${progress}`;

      if (progress >= 100) {
        clearInterval(this.taskTimer);
        this.taskTimer = null;
        if (statusText) statusText.textContent = '✅ Tarama Tamamlandı - Sağlıklı!';

        setTimeout(() => {
          if (onComplete) onComplete(this.activeTaskStation ? this.activeTaskStation.id : 'task_scan_medbay');
          this.closeTaskMiniGame();
        }, 600);
      }
    }, 100);
  }

  initTrashTask(onComplete) {
    const handle = document.getElementById('trash-lever-handle');
    const particles = document.getElementById('trash-particles');
    if (!handle) return;

    if (particles) particles.classList.remove('emptied');
    handle.classList.remove('pulled');

    const triggerPull = () => {
      handle.classList.add('pulled');
      if (particles) particles.classList.add('emptied');

      setTimeout(() => {
        if (onComplete) onComplete(this.activeTaskStation ? this.activeTaskStation.id : 'task_trash_cafe');
        this.closeTaskMiniGame();
      }, 900);
    };

    handle.onclick = triggerPull;
  }

  initReactorTask(onComplete) {
    const grid = document.getElementById('reactor-pad-grid');
    const display = document.getElementById('reactor-seq-display');
    if (!grid) return;
    grid.innerHTML = '';

    if (display) display.textContent = 'Sıra: 1 ➔ 2 ➔ 3 ➔ 4 ➔ 5';

    const numbers = [1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    let expected = 1;

    numbers.forEach(num => {
      const btn = document.createElement('button');
      btn.className = 'reactor-btn';
      btn.textContent = num;

      btn.addEventListener('click', () => {
        if (num === expected) {
          btn.classList.add('correct');
          expected++;
          if (display) display.textContent = `Doğru! Sonraki: ${expected <= 5 ? expected : 'Tamamlandı! ✅'}`;

          if (expected > 5) {
            setTimeout(() => {
              if (onComplete) onComplete(this.activeTaskStation ? this.activeTaskStation.id : 'task_reactor_align');
              this.closeTaskMiniGame();
            }, 500);
          }
        } else {
          // Wrong button, reset!
          expected = 1;
          if (display) display.textContent = '❌ Hatalı Sıra! Baştan Başla: 1';
          grid.querySelectorAll('.reactor-btn').forEach(b => b.classList.remove('correct'));
        }
      });
      grid.appendChild(btn);
    });
  }

  initSteerTask(onComplete) {
    const target = document.getElementById('radar-ship-target');
    const status = document.getElementById('radar-status');
    if (!target) return;

    target.style.left = `${15 + Math.random() * 25}%`;
    target.style.top = `${20 + Math.random() * 40}%`;
    if (status) status.textContent = 'Hedef sapması: %45 - Hedefe Tıkla!';

    target.onclick = () => {
      target.style.left = '50%';
      target.style.top = '50%';
      target.style.transform = 'translate(-50%, -50%) scale(1.2)';
      if (status) status.textContent = '✅ Rota Kilitlendi!';

      setTimeout(() => {
        if (onComplete) onComplete(this.activeTaskStation ? this.activeTaskStation.id : 'task_steer_cockpit');
        this.closeTaskMiniGame();
      }, 500);
    };
  }

  showRoleReveal(role) {
    if (!this.roleRevealBanner) return;
    const isImpostor = role === 'impostor';
    this.roleRevealTitle.textContent = isImpostor ? 'SEN BİR CASUSSUN 🔪' : 'MÜRETTEBATSIN 🛠️';
    this.roleRevealTitle.style.color = isImpostor ? '#ef4444' : '#60a5fa';
    this.roleRevealDesc.textContent = isImpostor ? 'Mürettebata çaktırmadan herkesi avla!' : 'Tüm görevleri tamamla ve casusu bul!';
    this.roleRevealBanner.classList.remove('hidden');

    setTimeout(() => {
      this.roleRevealBanner.classList.add('hidden');
    }, 4000);
  }

  renderLeaderboard(leaderboard, myPlayerId) {
    if (!this.leaderboardList) return;
    this.leaderboardList.innerHTML = '';

    if (leaderboard.length === 0) {
      this.leaderboardList.innerHTML = `<div class="lb-empty">Liderlik tablosu hazırlanıyor...</div>`;
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];

    leaderboard.forEach((item, index) => {
      const isMe = item.id === myPlayerId;
      const rankBadge = index < 3 ? medals[index] : `#${index + 1}`;
      const div = document.createElement('div');
      div.className = `lb-item ${isMe ? 'lb-me' : ''}`;
      div.innerHTML = `
        <span class="lb-rank">${rankBadge}</span>
        <span class="lb-avatar">${item.avatar || '👤'}</span>
        <span class="lb-name" style="color: ${item.color || '#fff'}">${this.escapeHtml(item.name)}${isMe ? ' (Sen)' : ''}</span>
        <span class="lb-score">${item.score}</span>
      `;
      this.leaderboardList.appendChild(div);
    });
  }

  showGoalBanner(title, scorer) {
    this.goalText.textContent = title;
    this.goalScorer.textContent = scorer || '';
    this.goalAnnouncement.classList.remove('hidden');

    setTimeout(() => {
      this.goalAnnouncement.classList.add('hidden');
    }, 2800);
  }

  addChatMessage(sender, text, color) {
    const item = document.createElement('div');
    item.className = 'chat-item';
    item.innerHTML = `<span class="chat-sender" style="color: ${color || '#38bdf8'}">${this.escapeHtml(sender)}:</span> <span class="chat-text">${this.escapeHtml(text)}</span>`;

    this.chatMessages.appendChild(item);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    // Fade and remove old messages after 15s to keep screen clean
    setTimeout(() => {
      if (item.parentNode) {
        item.style.opacity = '0.3';
      }
    }, 12000);
  }

  escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
}
