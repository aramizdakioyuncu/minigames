// UI Controller for DOM interactions, Modals and HUD updates

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
      btnJoin.addEventListener('click', () => {
        if (!isFull) {
          onJoinCallback(room.id);
        }
      });

      this.roomsList.appendChild(item);
    });
  }

  prepareGameHUD(mode) {
    if (this.hudPuck) this.hudPuck.classList.toggle('hidden', mode !== 'puck');
    if (this.hudSumo) this.hudSumo.classList.toggle('hidden', mode !== 'sumo');
    if (this.hudAgar) this.hudAgar.classList.toggle('hidden', mode !== 'agar');
    if (this.hudSpace) this.hudSpace.classList.toggle('hidden', mode !== 'space');
    if (this.hudLeaderboard) this.hudLeaderboard.classList.toggle('hidden', mode !== 'agar');
    if (this.hudTeamSwitcher) this.hudTeamSwitcher.classList.toggle('hidden', mode !== 'puck');
  }

  updateHUD(gameState, myPlayerId) {
    if (!gameState) return;

    // Switch game HUD modes
    if (gameState.mode === 'puck') {
      if (this.hudPuck) this.hudPuck.classList.remove('hidden');
      if (this.hudSumo) this.hudSumo.classList.add('hidden');
      if (this.hudAgar) this.hudAgar.classList.add('hidden');
      if (this.hudSpace) this.hudSpace.classList.add('hidden');
      if (this.hudLeaderboard) this.hudLeaderboard.classList.add('hidden');
      if (this.hudTeamSwitcher) this.hudTeamSwitcher.classList.remove('hidden');

      if (this.hintAction) this.hintAction.innerHTML = '⚡ <b>Boşluk / Sol Tık:</b> Şut & Pas';
      if (this.hintHold) this.hintHold.innerHTML = '🧲 <b>Shift / E / Sağ Tık:</b> Top Tut & Çalım (2sn)';
      if (this.btnTouchAction) this.btnTouchAction.textContent = '⚡ ŞUT';
      if (this.btnTouchHold) {
        this.btnTouchHold.textContent = '🧲 TUT';
        this.btnTouchHold.classList.remove('hidden');
      }

      const s = gameState.modeState || {};
      if (this.scoreRed) this.scoreRed.textContent = s.scoreRed !== undefined ? s.scoreRed : 0;
      if (this.scoreBlue) this.scoreBlue.textContent = s.scoreBlue !== undefined ? s.scoreBlue : 0;

      const time = s.timeRemaining !== undefined ? s.timeRemaining : 0;
      const mins = Math.floor(time / 60).toString().padStart(2, '0');
      const secs = (time % 60).toString().padStart(2, '0');
      if (this.matchTimer) this.matchTimer.textContent = `${mins}:${secs}`;
    } else if (gameState.mode === 'sumo') {
      if (this.hudPuck) this.hudPuck.classList.add('hidden');
      if (this.hudSumo) this.hudSumo.classList.remove('hidden');
      if (this.hudAgar) this.hudAgar.classList.add('hidden');
      if (this.hudSpace) this.hudSpace.classList.add('hidden');
      if (this.hudLeaderboard) this.hudLeaderboard.classList.add('hidden');
      if (this.hudTeamSwitcher) this.hudTeamSwitcher.classList.add('hidden');

      if (this.hintAction) this.hintAction.innerHTML = '⚡ <b>Boşluk / Sol Tık:</b> Ani Dash İtişi';
      if (this.hintHold) this.hintHold.innerHTML = '🛡️ <b>Savunma:</b> Dengeyi Koru';
      if (this.btnTouchAction) this.btnTouchAction.textContent = '⚡ DASH';
      if (this.btnTouchHold) this.btnTouchHold.classList.add('hidden');

      const s = gameState.modeState || {};
      if (s.roundState === 'round_over') {
        if (this.sumoStatusText) this.sumoStatusText.textContent = `Kazanan: ${s.winner || 'Berabere'}! 👑`;
      } else if (s.roundState === 'waiting') {
        if (this.sumoStatusText) this.sumoStatusText.textContent = '🥋 Isınma Modu (Rakipler Bekleniyor)';
      } else {
        if (this.sumoStatusText) this.sumoStatusText.textContent = `Çember Daralıyor! (${s.ringRadius || 400}m)`;
      }
    } else if (gameState.mode === 'agar') {
      if (this.hudPuck) this.hudPuck.classList.add('hidden');
      if (this.hudSumo) this.hudSumo.classList.add('hidden');
      if (this.hudAgar) this.hudAgar.classList.remove('hidden');
      if (this.hudSpace) this.hudSpace.classList.add('hidden');
      if (this.hudLeaderboard) this.hudLeaderboard.classList.remove('hidden');
      if (this.hudTeamSwitcher) this.hudTeamSwitcher.classList.add('hidden');

      if (this.hintAction) this.hintAction.innerHTML = '✂️ <b>Boşluk / Sol Tık:</b> İkiye Bölün (Split)';
      if (this.hintHold) this.hintHold.innerHTML = '🍇 <b>E / W / Sağ Tık:</b> Yem At (Feed)';
      if (this.btnTouchAction) this.btnTouchAction.textContent = '✂️ BÖLÜN';
      if (this.btnTouchHold) {
        this.btnTouchHold.textContent = '🍇 YEM AT';
        this.btnTouchHold.classList.remove('hidden');
      }

      const myPlayer = (gameState.players || []).find(p => p.id === myPlayerId);
      const myScore = myPlayer ? Math.floor(myPlayer.score || 0) : 0;
      if (this.agarMyScore) this.agarMyScore.textContent = myScore;

      // Render Live Leaderboard / Scoreboard
      const leaderboard = (gameState.modeState && gameState.modeState.leaderboard) || [];
      this.renderLeaderboard(leaderboard, myPlayerId);
    } else if (gameState.mode === 'space') {
      if (this.hudPuck) this.hudPuck.classList.add('hidden');
      if (this.hudSumo) this.hudSumo.classList.add('hidden');
      if (this.hudAgar) this.hudAgar.classList.add('hidden');
      if (this.hudSpace) this.hudSpace.classList.remove('hidden');
      if (this.hudLeaderboard) this.hudLeaderboard.classList.add('hidden');
      if (this.hudTeamSwitcher) this.hudTeamSwitcher.classList.add('hidden');

      const s = gameState.modeState || {};
      const myPlayer = (gameState.players || []).find(p => p.id === myPlayerId);
      const isImpostor = myPlayer && myPlayer.role === 'impostor';

      // Update Task Bar
      const taskRatio = s.taskProgressRatio || 0;
      if (this.taskProgressFill) this.taskProgressFill.style.width = `${taskRatio}%`;
      if (this.taskPercentText) this.taskPercentText.textContent = `${taskRatio}%`;

      // Update Role Badge
      if (this.spaceRoleBadge) {
        if (isImpostor) {
          this.spaceRoleBadge.textContent = '🔪 CASUS (IMPOSTOR)';
          this.spaceRoleBadge.className = 'space-role-pill space-role-impostor';
        } else {
          this.spaceRoleBadge.textContent = '🛠️ MÜRETTEBAT (CREW)';
          this.spaceRoleBadge.className = 'space-role-pill';
        }
      }

      // Hints & Mobile Buttons
      if (isImpostor) {
        if (this.hintAction) this.hintAction.innerHTML = '🔪 <b>Boşluk / Q:</b> Avla (Kill)';
        if (this.hintHold) this.hintHold.innerHTML = '🌀 <b>V:</b> Havalandırma (Vent)';
        if (this.hintExtra) {
          this.hintExtra.innerHTML = '🚨 <b>R:</b> Acil Rapor';
          this.hintExtra.classList.remove('hidden');
        }
        if (this.btnTouchAction) this.btnTouchAction.textContent = '🔪 ÖLDÜR';
        if (this.btnTouchHold) this.btnTouchHold.classList.add('hidden');
        if (this.btnTouchVent) this.btnTouchVent.classList.remove('hidden');
        if (this.btnTouchReport) this.btnTouchReport.classList.remove('hidden');
      } else {
        if (this.hintAction) this.hintAction.innerHTML = '🛠️ <b>E / F:</b> Görev Yap (Task)';
        if (this.hintHold) this.hintHold.innerHTML = '🚨 <b>R:</b> Ceset Raporla';
        if (this.hintExtra) this.hintExtra.classList.add('hidden');
        if (this.btnTouchAction) this.btnTouchAction.textContent = '🛠️ GÖREV';
        if (this.btnTouchHold) this.btnTouchHold.classList.add('hidden');
        if (this.btnTouchVent) this.btnTouchVent.classList.add('hidden');
        if (this.btnTouchReport) this.btnTouchReport.classList.remove('hidden');
      }

      // Emergency Meeting Modal Toggle
      if (s.gameState === 'meeting') {
        if (this.modalMeeting && this.modalMeeting.classList.contains('hidden')) {
          this.modalMeeting.classList.remove('hidden');
        }
        if (this.meetingTimerText) this.meetingTimerText.textContent = s.meetingTimer || 30;
        this.renderMeetingPlayers(s.playersMeta || [], myPlayerId);
      } else {
        if (this.modalMeeting) this.modalMeeting.classList.add('hidden');
      }
    }
  }

  renderMeetingPlayers(players, myPlayerId) {
    if (!this.meetingPlayersGrid) return;
    this.meetingPlayersGrid.innerHTML = '';

    players.forEach(p => {
      const isDead = !p.isAlive;
      const isMe = p.id === myPlayerId;
      const card = document.createElement('div');
      card.className = `meeting-player-card ${isDead ? 'meeting-player-dead' : ''}`;
      card.innerHTML = `
        <span class="meeting-avatar">${p.avatar || '👤'}</span>
        <span class="meeting-name" style="color: ${p.color || '#fff'}">${this.escapeHtml(p.name)}${isMe ? ' (Sen)' : ''}</span>
        ${!isDead && !isMe ? `<button class="btn-vote" data-id="${p.id}">Oy Ver 🗳️</button>` : (isDead ? '<span>💀 Ölü</span>' : '')}
      `;
      this.meetingPlayersGrid.appendChild(card);
    });
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
