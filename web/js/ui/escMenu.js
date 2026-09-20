// escMenu.js - In-Game Quick Menu & Mode-Adaptive Action Controller

export class EscMenuController {
  constructor(ui) {
    this.ui = ui;
  }

  getModeActionLabels(mode, isMatchActive) {
    const configs = {
      puck: {
        start: '⚽ Maçı Başlat (Host)',
        stop: '⏹️ Maçı Bitir (Host)',
        restart: '🔄 Maçı Sıfırla (Host)',
        hudStart: '⚽ Maçı Başlat',
        voteStart: 'Maçı Başlatma Oyu Ver',
        voteRestart: 'Maçı Yeniden Başlatma Oyu Ver',
        hudVote: '⚽ Başlatma Oyu'
      },
      space: {
        start: '🚀 Oyunu Başlat (Host)',
        stop: '⏹️ Oyunu Bitir (Host)',
        restart: '🔄 Oyunu Sıfırla (Host)',
        hudStart: '🚀 Oyunu Başlat',
        voteStart: 'Oyunu Başlatma Oyu Ver',
        voteRestart: 'Oyunu Yeniden Başlatma Oyu Ver',
        hudVote: '🚀 Başlatma Oyu'
      },
      conquest: {
        start: '🏰 Seferi Başlat (Host)',
        stop: '⏹️ Seferi Bitir (Host)',
        restart: '🔄 Seferi Sıfırla (Host)',
        hudStart: '🏰 Seferi Başlat',
        voteStart: 'Seferi Başlatma Oyu Ver',
        voteRestart: 'Seferi Yeniden Başlatma Oyu Ver',
        hudVote: '🏰 Başlatma Oyu'
      },
      vampire: {
        start: '🧛 Macerayı Başlat (Host)',
        stop: '⏹️ Macerayı Bitir (Host)',
        restart: '🔄 Macerayı Sıfırla (Host)',
        hudStart: '🧛 Macerayı Başlat',
        voteStart: 'Macerayı Başlatma Oyu Ver',
        voteRestart: 'Macerayı Yeniden Başlatma Oyu Ver',
        hudVote: '🧛 Başlatma Oyu'
      },
      sumo: {
        start: '🥋 Karşılaşmayı Başlat (Host)',
        stop: '⏹️ Karşılaşmayı Bitir (Host)',
        restart: '🔄 Karşılaşmayı Sıfırla (Host)',
        hudStart: '🥋 Karşılaşmayı Başlat',
        voteStart: 'Karşılaşmayı Başlatma Oyu Ver',
        voteRestart: 'Karşılaşmayı Yeniden Başlatma Oyu Ver',
        hudVote: '🥋 Başlatma Oyu'
      },
      agar: {
        start: '🦠 Arenayı Başlat (Host)',
        stop: '⏹️ Arenayı Bitir (Host)',
        restart: '🔄 Arenayı Sıfırla (Host)',
        hudStart: '🦠 Arenayı Başlat',
        voteStart: 'Arenayı Başlatma Oyu Ver',
        voteRestart: 'Arenayı Yeniden Başlatma Oyu Ver',
        hudVote: '🦠 Başlatma Oyu'
      }
    };

    const cfg = configs[mode] || {
      start: '🎮 Oyunu Başlat (Host)',
      stop: '⏹️ Oyunu Bitir (Host)',
      restart: '🔄 Oyunu Sıfırla (Host)',
      hudStart: '🎮 Oyunu Başlat',
      voteStart: 'Oyunu Başlatma Oyu Ver',
      voteRestart: 'Oyunu Yeniden Başlatma Oyu Ver',
      hudVote: '🎮 Başlatma Oyu'
    };

    return {
      hostToggle: isMatchActive ? cfg.stop : cfg.start,
      hostRestart: cfg.restart,
      playerVote: isMatchActive ? cfg.voteRestart : cfg.voteStart,
      hudStart: cfg.hudStart,
      hudVote: cfg.hudVote
    };
  }

  updateEscMenu(roomData, gameState, myPlayerId) {
    if (!this.ui.modalEscMenu) return;

    if (roomData && this.ui.escRoomName) {
      this.ui.escRoomName.textContent = `Oda: ${roomData.roomName || roomData.name || 'Arena'}`;
    }

    if (gameState) {
      const isHost = !gameState.hostId || gameState.hostId === myPlayerId || (gameState.players && gameState.players.length <= 1);
      const hostPlayer = (gameState.players || []).find(p => p.id === gameState.hostId);
      const isMatchActive = !!(gameState.modeState && (gameState.modeState.isMatchActive || gameState.modeState.gameState === 'playing' || gameState.modeState.gameState === 'meeting' || (gameState.modeState.gameState && gameState.modeState.gameState !== 'waiting' && gameState.modeState.gameState !== 'game_over')));

      if (this.ui.escHostBadge) {
        this.ui.escHostBadge.textContent = `👑 Host: ${hostPlayer ? hostPlayer.name : (isHost ? 'Sen' : 'Bilinmiyor')}${isHost ? ' (Sen)' : ''}`;
      }

      const labels = this.getModeActionLabels(gameState.mode, isMatchActive);

      // Host Start / Stop Toggle Button
      if (this.ui.btnHostToggleMatch) {
        this.ui.btnHostToggleMatch.classList.toggle('hidden', !isHost);
        if (isHost) {
          this.ui.btnHostToggleMatch.textContent = labels.hostToggle;
          this.ui.btnHostToggleMatch.className = isMatchActive ? 'btn btn-danger btn-block' : 'btn btn-primary btn-block';
        }
      }

      if (this.ui.btnHostRestart) {
        this.ui.btnHostRestart.classList.toggle('hidden', !isHost);
        this.ui.btnHostRestart.textContent = labels.hostRestart;
      }

      if (this.ui.btnPlayerVoteRestart) {
        this.ui.btnPlayerVoteRestart.classList.toggle('hidden', isHost);
        const votes = gameState.restartVotesCount || 0;
        const needed = gameState.restartVotesNeeded || 1;
        this.ui.btnPlayerVoteRestart.innerHTML = `🗳️ ${labels.playerVote} <span id="esc-restart-vote-count">(${votes}/${needed})</span>`;
      }

      // Top bar HUD match controls
      this.updateHUDMatchControls(gameState, myPlayerId);
    }
  }

  updateHUDMatchControls(gameState, myPlayerId) {
    if (!gameState) return;
    const isHost = !gameState.hostId || gameState.hostId === myPlayerId || (gameState.players && gameState.players.length <= 1);
    const votes = gameState.restartVotesCount || 0;
    const needed = gameState.restartVotesNeeded || 1;

    const s = gameState.modeState || {};
    const phase = s.gameState || s.matchPhase || s.phase || 'waiting';
    const isWaiting = phase === 'waiting' || phase === 'game_over';
    const labels = this.getModeActionLabels(gameState.mode, !isWaiting);

    if (isWaiting) {
      if (isHost) {
        if (this.ui.btnHudStartMatch) {
          this.ui.btnHudStartMatch.textContent = labels.hudStart;
          this.ui.btnHudStartMatch.className = 'btn btn-success btn-sm pulse-glow';
          this.ui.btnHudStartMatch.classList.remove('hidden');
        }
        if (this.ui.btnHudVoteMatch) this.ui.btnHudVoteMatch.classList.add('hidden');
      } else {
        if (this.ui.btnHudStartMatch) this.ui.btnHudStartMatch.classList.add('hidden');
        if (this.ui.btnHudVoteMatch) {
          this.ui.btnHudVoteMatch.textContent = `🗳️ ${labels.hudVote} (${votes}/${needed})`;
          this.ui.btnHudVoteMatch.classList.remove('hidden');
        }
      }
    } else {
      if (this.ui.btnHudStartMatch) this.ui.btnHudStartMatch.classList.add('hidden');
      if (this.ui.btnHudVoteMatch) this.ui.btnHudVoteMatch.classList.add('hidden');
    }
  }
}
