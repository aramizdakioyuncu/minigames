import { SocketClient } from './socketClient.js';
import { GameRenderer } from './renderer.js';
import { InputController } from './input.js';
import { audio } from './audio.js';
import { UIController } from './ui.js';
import { clientModeRegistry } from './modes/clientModeRegistry.js';

class GameApp {
  constructor() {
    this.ui = new UIController();
    this.socket = new SocketClient();
    this.input = new InputController();
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new GameRenderer(this.canvas);

    this.profile = {
      name: localStorage.getItem('ball_name') || '',
      avatar: localStorage.getItem('ball_avatar') || '⚽',
      color: localStorage.getItem('ball_color') || '#3b82f6'
    };

    this.currentRoom = null;
    this.lastGameState = null;
    this.fps = 60;
    this.lastFrameTime = performance.now();
    this.lastTimestamp = performance.now();
    this.inputAccumulator = 0;
    this.frameCount = 0;

    this.init();
  }

  init() {
    this.bindProfileControls();
    this.bindLobbyControls();
    this.bindGameControls();
    this.bindSocketEvents();

    // Connect to WebSocket Server
    this.socket.connect().then(() => {
      this.ui.setServerStatus(true);
    }).catch(() => {
      this.ui.setServerStatus(false);
    });

    // Start 60 FPS Render & Input Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  bindProfileControls() {
    // Fill saved name
    if (this.profile.name) {
      this.ui.inputNickname.value = this.profile.name;
    }

    // Avatar Selection
    const avatarBtns = document.querySelectorAll('.avatar-option');
    avatarBtns.forEach(btn => {
      if (btn.dataset.avatar === this.profile.avatar) {
        avatarBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      }
      btn.addEventListener('click', () => {
        avatarBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.profile.avatar = btn.dataset.avatar;
        localStorage.setItem('ball_avatar', this.profile.avatar);
      });
    });

    // Color Selection
    const colorBtns = document.querySelectorAll('.color-option');
    colorBtns.forEach(btn => {
      if (btn.dataset.color === this.profile.color) {
        colorBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      }
      btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.profile.color = btn.dataset.color;
        localStorage.setItem('ball_color', this.profile.color);
      });
    });

    // Enter Lobby Button
    this.ui.btnEnterLobby.addEventListener('click', () => {
      audio.init();
      const rawName = this.ui.inputNickname.value.trim();
      this.profile.name = rawName.length > 0 ? rawName : 'Oyuncu_' + Math.floor(Math.random() * 900 + 100);
      localStorage.setItem('ball_name', this.profile.name);

      this.ui.lobbyUserName.textContent = this.profile.name;
      this.ui.lobbyUserAvatar.textContent = this.profile.avatar;
      this.ui.showView('view-lobby');
      this.socket.send({ type: 'get_rooms' });
    });
  }

  bindLobbyControls() {
    // Filter tabs
    const filterBtns = document.querySelectorAll('.tab-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.ui.activeFilter = btn.dataset.filter;
        this.socket.send({ type: 'get_rooms' });
      });
    });

    // Refresh rooms
    this.ui.btnRefreshRooms.addEventListener('click', () => {
      this.socket.send({ type: 'get_rooms' });
    });

    // Audio Toggle
    if (this.ui.btnSoundToggle) {
      this.ui.btnSoundToggle.addEventListener('click', () => {
        const isMuted = audio.toggleMute();
        this.ui.btnSoundToggle.textContent = isMuted ? '🔇' : '🔊';
      });
    }

    // Modal Create Room
    if (this.ui.btnOpenCreateRoom) {
      this.ui.btnOpenCreateRoom.addEventListener('click', () => {
        if (this.ui.modalCreateRoom) this.ui.modalCreateRoom.classList.remove('hidden');
      });
    }

    if (this.ui.btnCloseModal) {
      this.ui.btnCloseModal.addEventListener('click', () => {
        if (this.ui.modalCreateRoom) this.ui.modalCreateRoom.classList.add('hidden');
      });
    }

    if (this.ui.btnCancelCreate) {
      this.ui.btnCancelCreate.addEventListener('click', () => {
        if (this.ui.modalCreateRoom) this.ui.modalCreateRoom.classList.add('hidden');
      });
    }

    // Mode Radio Selection
    const modeCards = document.querySelectorAll('.mode-radio-card');
    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const input = card.querySelector('input');
        if (input) input.checked = true;
      });
    });

    // Speed Radio Selection
    const speedCards = document.querySelectorAll('.speed-radio-card');
    speedCards.forEach(card => {
      card.addEventListener('click', () => {
        speedCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const input = card.querySelector('input');
        if (input) input.checked = true;
      });
    });

    // Create Room Submit
    this.ui.btnSubmitCreateRoom.addEventListener('click', () => {
      const name = this.ui.createRoomName.value.trim() || `${this.profile.name}'in Odası`;
      const selectedMode = document.querySelector('input[name="create-room-mode"]:checked')?.value || 'puck';
      const selectedSpeed = parseFloat(document.querySelector('input[name="create-room-speed"]:checked')?.value || '1.0');
      const maxPlayers = parseInt(this.ui.createMaxPlayers.value) || 8;
      const matchDuration = parseInt(document.getElementById('create-match-time')?.value || '180');
      const tackleEnabled = document.getElementById('create-tackle-enabled')?.checked !== false;

      this.socket.send({
        type: 'create_room',
        roomName: name,
        mode: selectedMode,
        speedMultiplier: selectedSpeed,
        matchDuration,
        tackleEnabled,
        maxPlayers
      });

      this.ui.modalCreateRoom.classList.add('hidden');
      setTimeout(() => this.socket.send({ type: 'get_rooms' }), 200);
    });

    // Mobile Touch Hold Button
    const btnTouchHold = document.getElementById('btn-touch-hold');
    if (btnTouchHold) {
      btnTouchHold.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.input.keys.hold = true;
      });
      btnTouchHold.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.input.keys.hold = false;
      });
    }
  }

  bindGameControls() {
    // Leave Game Button
    this.ui.btnLeaveGame.addEventListener('click', () => {
      this.socket.leaveRoom();
    });

    // Team Switcher Buttons
    const teamBtns = document.querySelectorAll('.btn-team');
    teamBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTeam = btn.dataset.team;
        this.socket.changeTeam(targetTeam);
      });
    });

    if (this.ui.btnSpecJoinRed) {
      this.ui.btnSpecJoinRed.addEventListener('click', () => this.socket.changeTeam('red'));
    }
    if (this.ui.btnSpecJoinBlue) {
      this.ui.btnSpecJoinBlue.addEventListener('click', () => this.socket.changeTeam('blue'));
    }

    // Chat Form
    this.ui.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.ui.chatInput.value.trim();
      if (text.length > 0) {
        this.socket.sendChat(text);
        this.ui.chatInput.value = '';
      }
      this.ui.chatInput.blur();
      this.input.setChatting(false);
    });

    this.ui.chatInput.addEventListener('focus', () => this.input.setChatting(true));
    this.ui.chatInput.addEventListener('blur', () => this.input.setChatting(false));

    // Meeting voting controls
    if (this.ui.meetingPlayersGrid) {
      this.ui.meetingPlayersGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-vote');
        if (btn && btn.dataset.id) {
          this.socket.sendAction({ type: 'vote', targetId: btn.dataset.id });
        }
      });
    }
    if (this.ui.btnSkipVote) {
      this.ui.btnSkipVote.addEventListener('click', () => {
        this.socket.sendAction({ type: 'vote', targetId: 'skip' });
      });
    }

    // Meeting Chat Form
    if (this.ui.meetingChatForm) {
      this.ui.meetingChatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.ui.meetingChatInput.value.trim();
        if (text.length > 0) {
          this.socket.sendChat(text);
          this.ui.meetingChatInput.value = '';
        }
        this.ui.meetingChatInput.blur();
        this.input.setChatting(false);
      });
    }
    if (this.ui.meetingChatInput) {
      this.ui.meetingChatInput.addEventListener('focus', () => this.input.setChatting(true));
      this.ui.meetingChatInput.addEventListener('blur', () => this.input.setChatting(false));
    }

    // Mobile Action Button space task trigger
    const btnTouchAction = document.getElementById('btn-touch-action');
    if (btnTouchAction) {
      btnTouchAction.addEventListener('click', () => {
        if (this.lastGameState && this.lastGameState.mode === 'space') {
          this.checkSpaceTaskInteraction();
        }
      });
    }

    const btnTouchReport = document.getElementById('btn-touch-report');
    if (btnTouchReport) {
      btnTouchReport.addEventListener('click', () => {
        if (this.lastGameState && this.lastGameState.mode === 'space') {
          this.socket.sendAction({ type: 'emergency_meeting' });
        }
      });
    }

    const handleGameAreaClick = (e) => {
      const isChatField = e && e.target && (e.target.id === 'chat-input' || e.target.id === 'meeting-chat-input' || e.target.closest('#chat-form') || e.target.closest('#meeting-chat-form'));
      if (!isChatField) {
        if (document.activeElement && document.activeElement.blur && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
        this.input.setChatting(false);
        window.focus();
      }
      if (this.lastGameState && this.lastGameState.mode === 'space') {
        this.checkSpaceTaskInteraction();
      }
    };

    if (this.canvas) {
      this.canvas.addEventListener('click', handleGameAreaClick);
    }
    if (this.ui.viewGame) {
      this.ui.viewGame.addEventListener('click', handleGameAreaClick);
    }

    // ESC Menu Controls
    if (this.ui.btnOpenEscMenu) {
      this.ui.btnOpenEscMenu.addEventListener('click', () => {
        this.ui.toggleEscMenu();
        this.ui.updateEscMenu(this.lastGameState, this.socket.myPlayerId, this.currentRoom);
      });
    }

    if (this.ui.btnEscClose) {
      this.ui.btnEscClose.addEventListener('click', () => this.ui.toggleEscMenu(false));
    }

    if (this.ui.btnEscResume) {
      this.ui.btnEscResume.addEventListener('click', () => this.ui.toggleEscMenu(false));
    }

    if (this.ui.btnHudStartMatch) {
      this.ui.btnHudStartMatch.addEventListener('click', () => {
        this.socket.sendAction({ type: 'start_match' });
      });
    }

    if (this.ui.btnHudVoteMatch) {
      this.ui.btnHudVoteMatch.addEventListener('click', () => {
        this.socket.sendAction({ type: 'vote_start' });
      });
    }

    if (this.ui.btnHostToggleMatch) {
      this.ui.btnHostToggleMatch.addEventListener('click', () => {
        this.socket.sendAction({ type: 'toggle_match' });
        this.ui.toggleEscMenu(false);
      });
    }

    if (this.ui.btnHostRestart) {
      this.ui.btnHostRestart.addEventListener('click', () => {
        this.socket.sendAction({ type: 'restart_match' });
        this.ui.toggleEscMenu(false);
      });
    }

    if (this.ui.btnPlayerVoteRestart) {
      this.ui.btnPlayerVoteRestart.addEventListener('click', () => {
        this.socket.sendAction({ type: 'vote_restart' });
      });
    }

    if (this.ui.btnEscLeaveRoom) {
      this.ui.btnEscLeaveRoom.addEventListener('click', () => {
        this.ui.toggleEscMenu(false);
        this.socket.leaveRoom();
      });
    }

    if (this.ui.btnEscSoundToggle) {
      this.ui.btnEscSoundToggle.addEventListener('click', () => {
        const isMuted = audio.toggleMute();
        this.ui.btnEscSoundToggle.textContent = isMuted ? '🔇 Ses Efektleri: Kapalı' : '🔊 Ses Efektleri: Açık';
        if (this.ui.btnSoundToggle) {
          this.ui.btnSoundToggle.textContent = isMuted ? '🔇' : '🔊';
        }
      });
    }

    if (this.ui.btnEscZoomToggle) {
      this.currentZoomIndex = 0;
      const zoomLevels = [
        { zoom: 1.0, label: '🔍 Kamera Açısı: Normal (1.0x)' },
        { zoom: 0.8, label: '🔍 Kamera Açısı: Geniş Açı (0.8x)' },
        { zoom: 1.25, label: '🔍 Kamera Açısı: Yakın Açı (1.25x)' }
      ];
      this.ui.btnEscZoomToggle.addEventListener('click', () => {
        this.currentZoomIndex = (this.currentZoomIndex + 1) % zoomLevels.length;
        const current = zoomLevels[this.currentZoomIndex];
        this.renderer.camera.zoom = current.zoom;
        this.ui.btnEscZoomToggle.textContent = current.label;
      });
    }

    // Keyboard Hotkeys
    window.addEventListener('keydown', (e) => {
      if (this.ui.modalMeeting && !this.ui.modalMeeting.classList.contains('hidden')) {
        // When meeting is active, allow voting shortcuts or chatting
        if (e.key === 'Enter') {
          if (document.activeElement !== this.ui.meetingChatInput && this.ui.meetingChatInput) {
            e.preventDefault();
            this.ui.meetingChatInput.focus();
          }
        }
        return;
      }

      if (e.key === 'Escape' && this.ui.currentView === 'view-game') {
        // If task interactive modal open, close it
        if (this.ui.modalTaskInteractive && !this.ui.modalTaskInteractive.classList.contains('hidden')) {
          this.ui.closeTaskMiniGame();
          return;
        }
        this.ui.toggleEscMenu();
        this.ui.updateEscMenu(this.lastGameState, this.socket.myPlayerId, this.currentRoom);
        return;
      }

      if (e.key === 'Enter' && this.ui.currentView === 'view-game') {
        if (this.ui.hudChat && !this.ui.hudChat.classList.contains('hidden')) {
          if (document.activeElement !== this.ui.chatInput) {
            e.preventDefault();
            this.ui.chatInput.focus();
          }
        }
      } else if ((e.code === 'KeyE' || e.code === 'KeyF' || e.code === 'Space') && !this.input.isChatting) {
        if (this.lastGameState && this.lastGameState.mode === 'space') {
          this.checkSpaceTaskInteraction();
        }
      } else if (e.code === 'KeyR' && !this.input.isChatting) {
        if (this.lastGameState && this.lastGameState.mode === 'space') {
          const myP = (this.lastGameState.players || []).find(p => p.id === this.socket.myPlayerId);
          if (myP && Math.hypot(myP.x, myP.y) < 120) {
            this.socket.sendAction({ type: 'emergency_meeting' });
          }
        }
      }
    });
  }

  checkSpaceTaskInteraction() {
    const activeMode = clientModeRegistry.getActiveMode();
    if (activeMode && activeMode.checkTaskInteraction) {
      activeMode.checkTaskInteraction(this);
    }
  }

  bindSocketEvents() {
    this.socket.on('onConnect', () => {
      this.ui.setServerStatus(true);
    });

    this.socket.on('onDisconnect', () => {
      this.ui.setServerStatus(false);
    });

    this.socket.on('onInit', (data) => {
      if (data.rooms) {
        this.ui.renderRooms(data.rooms, (roomId) => this.joinRoom(roomId));
      }
    });

    this.socket.on('onRoomsList', (rooms) => {
      this.ui.renderRooms(rooms, (roomId) => this.joinRoom(roomId));
    });

    this.socket.on('onJoinedRoom', (roomData) => {
      this.currentRoom = roomData;
      this.myCurrentRole = null;
      this.lastGameState = null;
      if (this.renderer && typeof this.renderer.reset === 'function') {
        this.renderer.reset();
      }
      if (this.input) {
        if (typeof this.input.setChatting === 'function') this.input.setChatting(false);
        if (typeof this.input.resetKeys === 'function') {
          this.input.resetKeys();
        } else if (this.input.keys) {
          Object.keys(this.input.keys).forEach(k => { this.input.keys[k] = false; });
        }
      }
      document.querySelectorAll('input, textarea').forEach(el => {
        if (el.blur) el.blur();
      });
      if (document.activeElement && document.activeElement.blur && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      window.focus();
      if (roomData && roomData.mode) {
        this.ui.prepareGameHUD(roomData.mode, roomData);
      }
      this.ui.showView('view-game');
      this.ui.chatMessages.innerHTML = '';
      if (this.ui.meetingChatMessages) this.ui.meetingChatMessages.innerHTML = '';
      this.ui.addChatMessage('Sistem', `${roomData.roomName} odasına bağlandınız.`, '#38bdf8');
    });

    this.socket.on('onLeftRoom', (roomsData) => {
      this.currentRoom = null;
      this.lastGameState = null;
      this.myCurrentRole = null;
      if (this.renderer && typeof this.renderer.reset === 'function') {
        this.renderer.reset();
      }
      this.ui.showView('view-lobby');
      if (roomsData.rooms) {
        this.ui.renderRooms(roomsData.rooms, (roomId) => this.joinRoom(roomId));
      }
    });

    this.socket.on('onGameState', (state) => {
      if (!state) return;

      // Auto-sync mode HUD if gameState mode differs from active HUD mode
      if (state.mode && (!this.currentRoom || this.currentRoom.mode !== state.mode)) {
        if (this.currentRoom) this.currentRoom.mode = state.mode;
        this.ui.prepareGameHUD(state.mode, this.currentRoom || { mode: state.mode });
      }

      this.lastGameState = state;
      this.ui.updateHUD(state, this.socket.myPlayerId);
      this.ui.updateEscMenu(state, this.socket.myPlayerId, this.currentRoom);

      // Check for space role reveal banner
      if (state.mode === 'space' && state.players) {
        const myP = state.players.find(p => p.id === this.socket.myPlayerId);
        if (myP && myP.role && myP.role !== this.myCurrentRole) {
          this.myCurrentRole = myP.role;
          this.ui.showRoleReveal(myP.role);
        }
      }

      // Process Game Events (SFX, Announcements)
      if (state.events && state.events.length > 0) {
        state.events.forEach(evt => {
          if (evt.type === 'first_half_start') {
            audio.playWhistle();
            this.ui.showGoalBanner('⚽ MAÇ BAŞLADI!', evt.caller ? `${evt.caller} maçı başlattı` : '1. Devre Başladı!');
            this.ui.addChatMessage('Hakem', 'Maç başladı! 1. Devre başladı.', '#22c55e');
          } else if (evt.type === 'half_time') {
            audio.playWhistle();
            this.ui.showGoalBanner('⏸️ DEVRE ARASI!', 'Takımlar kaleleri değiştiriyor...');
            this.ui.addChatMessage('Hakem', 'İlk yarı bitti! 10 saniye devre arası.', '#f59e0b');
          } else if (evt.type === 'second_half_start') {
            audio.playWhistle();
            this.ui.showGoalBanner('⚽ 2. DEVRE BAŞLADI!', 'Kaleler ve yönler değişti!');
            this.ui.addChatMessage('Hakem', '2. Devre başladı! Başarılar!', '#22c55e');
          } else if (evt.type === 'match_stopped') {
            audio.playWhistle();
            this.ui.showGoalBanner('⏹️ MAÇ DURDURULDU', evt.caller ? `${evt.caller} maçı bitirdi` : 'Maç sona erdi.');
            this.ui.addChatMessage('Hakem', 'Maç host tarafından bitirildi.', '#ef4444');
          } else if (evt.type === 'match_ended') {
            audio.playWhistle();
            const winText = evt.winner === 'tie' ? '🤝 Berabere Bitti!' : (evt.winner === 'red' ? '🔴 Kırmızı Takım Kazandı!' : '🔵 Mavi Takım Kazandı!');
            this.ui.showGoalBanner('🏆 MAÇ SONA ERDİ!', winText);
            this.ui.addChatMessage('Hakem', `Maç süresi doldu! Sonuç: ${winText}`, '#38bdf8');
          } else if (evt.type === 'match_restarted') {
            audio.playWhistle();
            this.ui.showGoalBanner('🔄 MAÇ SIFIRLANDI!', `Sıfırlayan: ${evt.caller || 'Host'}`);
          } else if (evt.type === 'sfx_kick') {
            audio.playKick();
            this.renderer.addKickSparks(evt.x, evt.y);
          } else if (evt.type === 'sfx_bump') {
            audio.playBounce();
          } else if (evt.type === 'sfx_dash') {
            audio.playDash();
          } else if (evt.type === 'sfx_pickup') {
            audio.playPickup();
          } else if (evt.type === 'sfx_split') {
            audio.playSplit();
            this.renderer.addSplitEffect(
              evt.originX ?? evt.x,
              evt.originY ?? evt.y,
              evt.targetX ?? evt.x,
              evt.targetY ?? evt.y,
              evt.dirX ?? 1,
              evt.dirY ?? 0,
              evt.color || '#38bdf8',
              evt.radius || 24,
              evt.childCellId,
              evt.parentCellId
            );
          } else if (evt.type === 'sfx_merge') {
            audio.playMerge();
            this.renderer.addMergeEffect(
              evt.fromX ?? evt.x,
              evt.fromY ?? evt.y,
              evt.toX ?? evt.x,
              evt.toY ?? evt.y,
              evt.targetRadius || 30,
              evt.absorbedRadius || 20,
              evt.color || '#38bdf8',
              evt.targetCellId,
              evt.absorbedCellId
            );
          } else if (evt.type === 'sfx_eject') {
            audio.playEject();
          } else if (evt.type === 'sfx_eat_player') {
            audio.playEatPlayer();
            this.renderer.addMergeEffect(
              evt.fromX ?? evt.x,
              evt.fromY ?? evt.y,
              evt.toX ?? evt.x,
              evt.toY ?? evt.y,
              evt.targetRadius || 35,
              evt.absorbedRadius || 20,
              evt.preyColor || evt.color || '#f43f5e',
              evt.targetCellId
            );
            this.ui.addChatMessage('⚔️ Savaş', `${evt.eater}, ${evt.prey} adlı oyuncuyu yuttu!`, '#f43f5e');
          } else if (evt.type === 'sfx_hold_start') {
            audio.playMagnetHold();
            this.renderer.addKickSparks(evt.x, evt.y, '#38bdf8');
          } else if (evt.type === 'sfx_hold_release') {
            audio.playKick();
          } else if (evt.type === 'sfx_tackle') {
            audio.playTackle();
            this.renderer.addKickSparks(evt.x, evt.y, '#ef4444');
          } else if (evt.type === 'sfx_kill') {
            audio.playKill();
            this.renderer.addKickSparks(evt.x, evt.y, '#ef4444');
            this.ui.addChatMessage('💀 Cinayet', `${evt.killer || 'Bir casus'} bir mürettebatı ortadan kaldırdı!`, '#ef4444');
          } else if (evt.type === 'sfx_vent') {
            audio.playVent();
          } else if (evt.type === 'sfx_task_complete') {
            audio.playTaskComplete();
            this.renderer.addKickSparks(evt.x, evt.y, '#10b981');
          } else if (evt.type === 'emergency_meeting') {
            audio.playEmergencySiren();
            const callerName = evt.caller || evt.reporter || 'Bir oyuncu';
            this.ui.showGoalBanner('🚨 ACİL TOPLANTI!', `${callerName} toplantı başlattı!`);
          } else if (evt.type === 'meeting_result') {
            if (evt.ejected) {
              audio.playEjection();
            }
            this.ui.showEjectionScreen(evt.ejected, evt.isTie, evt.isSkip, evt.message);
          } else if (evt.type === 'game_over') {
            this.ui.showGoalBanner('🏆 OYUN BİTTİ!', evt.winner === 'impostor' ? '🚨 Casuslar Kazandı!' : '✨ Mürettebat Kazandı!');
          } else if (evt.type === 'goal') {
            const myPlayer = (state.players || []).find(p => p.id === this.socket.myPlayerId);
            if (myPlayer && myPlayer.team) {
              if (myPlayer.team === evt.team) {
                audio.playGoalScored();
              } else if (myPlayer.team !== 'spec') {
                audio.playGoalConceded();
              } else {
                audio.playGoalScored();
              }
            } else {
              audio.playGoalScored();
            }

            this.renderer.addGoalCelebration(0, 0);
            this.ui.showGoalBanner('⚽ GOL!', `${evt.scorer} (${evt.team === 'red' ? 'Kırmızı' : 'Mavi'})`);
          } else if (evt.type === 'round_winner') {
            this.ui.showGoalBanner('👑 KAZANAN!', evt.winner);
          }
        });
      }
    });

    this.socket.on('onChat', (msg) => {
      this.ui.addChatMessage(msg.sender, msg.text, msg.color);
      this.ui.addMeetingChatMessage(msg.sender, msg.text, msg.color);
    });

    this.socket.on('onPing', (pingMs) => {
      this.ui.pingDisplay.textContent = `${pingMs} ms`;
    });
  }

  joinRoom(roomId) {
    audio.init();
    this.socket.joinRoom(roomId, this.profile);
  }

  loop(currentTime) {
    // Delta-Time Calculation (capped at 100ms to avoid tab switch jumps)
    const dt = Math.min((currentTime - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = currentTime;

    // FPS calculation
    this.frameCount++;
    if (currentTime - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = currentTime;
      if (this.ui.fpsDisplay) {
        this.ui.fpsDisplay.textContent = `${this.fps} FPS`;
      }
    }

    if (this.ui.currentView === 'view-game') {
      // Fixed 60Hz Input Send Rate (Throttles socket traffic to prevent jitter)
      this.inputAccumulator += dt;
      if (this.inputAccumulator >= 1 / 60) {
        const inputState = this.input.getState();
        this.socket.sendInput(inputState);
        this.inputAccumulator %= (1 / 60);
      }

      // High-Performance WebGL Render with Delta-Time
      this.renderer.render(this.lastGameState, this.socket.myPlayerId, dt);
    }

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Bootstrap Application
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
