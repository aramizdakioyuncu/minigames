import { PhysicsBody } from './physics.js';
import { modeRegistry } from './modes/modeRegistry.js';
import { cleanText, cleanColor, cleanInput, projectState } from '../security.js';

export class Room {
  constructor(id, name, modeType = 'puck', options = {}) {
    this.id = id;
    this.name = name;
    this.modeType = modeType;
    this.options = typeof options === 'object' ? options : { maxPlayers: options };
    this.maxPlayers = typeof options === 'number' ? options : (options.maxPlayers || 8);
    if(modeType==='space')this.maxPlayers=Math.min(15,this.maxPlayers);
    this.isPrivate = !!options.isPrivate;
    this.speedMultiplier = options.speedMultiplier || 1.0;
    this.matchDuration = options.matchDuration || 180;
    this.tackleEnabled = options.tackleEnabled !== undefined ? !!options.tackleEnabled : true;
    this.mapTheme = options.mapTheme || 'spaceship';
    this.createdAt = Date.now();

    this.players = new Map(); // id -> PlayerBody
    this.hostId = null;
    this.restartVotes = new Set();
    this.eventQueue = [];

    this.initGameMode(modeType);

    // 60 Hz Physics & Broadcast Loop
    this.physicsInterval = 1000 / 60;
    this.broadcastInterval = 1000 / 20; // Client interpolation keeps rendering smooth while bounding bandwidth.
    this.lastTickTime = Date.now();
    this.lastBroadcastTime = Date.now();
    this.secondAccumulator = 0;

    this.timer = setInterval(() => this.tick(), 1000 / 60);
  }

  initGameMode(modeType) {
    this.mode?.destroy();
    this.modeType = modeType;
    this.mode = modeRegistry.createMode(modeType, this, this.options);
  }

  restartMatch(callerName = 'Host') {
    this.initGameMode(this.modeType);
    this.restartVotes.clear();
    for (const player of this.players.values()) {
      if (this.mode.onPlayerJoin) {
        this.mode.onPlayerJoin(player);
      }
    }
    this.broadcastEvent({ type: 'match_restarted', caller: callerName });
    this.broadcastChat('Sistem', `🔄 Maç yeniden başlatıldı! (${callerName})`, '#38bdf8');
  }

  addPlayer(id, name, color, avatar, ws) {
    if (this.players.size >= this.maxPlayers || this.players.has(id)) return null;
    const player = new PhysicsBody({
      id,
      x: 0,
      y: 0,
      radius: 18,
      mass: 2.0,
      damping: 0.94,
      restitution: 0.5,
      type: 'player'
    });

    player.name = cleanText(name, 16, 'Oyuncu');
    player.color = cleanColor(color);
    player.avatar = cleanText(avatar, 8, '⚽');
    player.ws = ws;
    player.input = { up: false, down: false, left: false, right: false, kick: false, hold: false };
    player.ping = 0;
    player.lastPingSent = 0;
    player.score = 0;
    player.isSpectator = this.players.size >= this.maxPlayers;

    // Ball Hold Skill State
    player.isHoldingBall = false;
    player.holdStartTime = 0;
    player.lastHoldEndTime = 0;
    player.holdCooldownMs = 5000;
    player.maxHoldDurationMs = 2000;

    this.players.set(id, player);

    // Assign host if first player
    if (!this.hostId) {
      this.hostId = id;
    }

    this.mode.onPlayerJoin(player);

    this.broadcastChat('Sistem', `${player.name} odaya katıldı!`, '#10b981');
    return player;
  }

  removePlayer(id) {
    const player = this.players.get(id);
    if (player) {
      this.players.delete(id);
      this.mode.onPlayerLeave(player);
      this.restartVotes.delete(id);

      // Reassign host if host left
      if (this.hostId === id) {
        this.hostId = this.players.keys().next().value || null;
        if (this.hostId) {
          const newHost = this.players.get(this.hostId);
          if (newHost) {
            this.broadcastChat('Sistem', `👑 ${newHost.name} yeni oda kurucusu (Host) oldu!`, '#facc15');
          }
        }
      }

      this.broadcastChat('Sistem', `${player.name} odadan ayrıldı.`, '#ef4444');
      if (this.players.size === 0) {
        this.initGameMode(this.modeType);
        this.restartVotes.clear();
        this.eventQueue = [];
      }
    }
  }

  handlePlayerInput(id, inputData) {
    const player = this.players.get(id);
    if (player) {
      player.input = cleanInput(inputData);
      player.lastInputAt = Date.now();
    }
  }

  handlePlayerAction(id, actionData) {
    if (!actionData) return;
    const player = this.players.get(id);
    if (!player) return;

    const actionType = actionData.type || actionData.action;

    if (actionType === 'restart_match') {
      if (!this.hostId || this.hostId === id || this.players.size <= 1) {
        this.restartMatch(player.name);
      }
      return;
    }

    if (actionType === 'start_match' || actionType === 'start_game' || actionType === 'stop_match' || actionType === 'toggle_match') {
      const isHost = !this.hostId || this.hostId === id || this.players.size <= 1;
      if (isHost && this.mode && typeof this.mode.handleAction === 'function') {
        this.mode.handleAction(id, { ...actionData, type: actionType });
      }
      return;
    }

    if (actionType === 'vote_restart' || actionType === 'vote_start') {
      if (player.isSpectator || player.isAlive === false) return;
      const phase = this.mode.gameState || this.mode.matchPhase || this.mode.roundState;
      if (!['waiting', 'game_over', 'round_over'].includes(phase)) return;
      if (this.restartVotes.has(id)) {
        this.restartVotes.delete(id);
      } else {
        this.restartVotes.add(id);
      }
      const neededVotes = Math.max(1, Math.ceil(this.players.size * 0.5));
      this.broadcastChat('Oylama', `🗳️ ${player.name} maç başlatma oylaması yaptı (${this.restartVotes.size}/${neededVotes})`, '#facc15');
      if (this.restartVotes.size >= neededVotes) {
        this.restartVotes.clear();
        if (this.mode && typeof this.mode.startMatch === 'function') {
          this.mode.startMatch('Oylama ile');
        } else if (typeof this.restartMatch === 'function') {
          this.restartMatch('Oylama ile');
        }
      }
      return;
    }

    if (this.mode && typeof this.mode.handleAction === 'function') {
      this.mode.handleAction(id, { ...actionData, type: actionType });
    } else if (this.mode && typeof this.mode.castVote === 'function' && actionType === 'vote') {
      this.mode.castVote(id, actionData.targetId);
    }
  }

  handleTeamChange(id, newTeam) {
    if (this.modeType !== 'puck') return;
    const player = this.players.get(id);
    if (!player || !(newTeam === 'red' || newTeam === 'blue' || newTeam === 'spec')) return;

    // Check if mode restricts team changes (e.g. Football match is active)
    if (this.mode && typeof this.mode.canChangeTeam === 'function' && !this.mode.canChangeTeam(player)) {
      if (player.ws && player.ws.readyState === 1) {
        player.ws.send(JSON.stringify({
          type: 'chat',
          id: Math.random().toString(36).substring(2, 7),
          sender: 'Hakem',
          text: '⚠️ Maç devam ederken takım değiştiremezsiniz! (Devre arası veya maç sonunu bekleyin)',
          color: '#ef4444',
          time: Date.now()
        }));
      }
      return;
    }

    if (newTeam === 'spec') {
      player.isSpectator = true;
      player.team = 'spec';
      // Spawn player in Spectator Lounge (Tribün alanı)
      player.pos.set((Math.random() - 0.5) * 500, -385);
      player.vel.set(0, 0);
      this.broadcastChat('Sistem', `${player.name} tribüne / izleyici alanına geçti 👁️`, '#94a3b8');
    } else {
      player.isSpectator = false;
      player.team = newTeam;
      if (this.mode.spawnPlayer) {
        this.mode.spawnPlayer(player);
      }
      this.broadcastChat('Sistem', `${player.name} ${newTeam === 'red' ? '🔴 Kırmızı' : '🔵 Mavi'} takıma katıldı!`, newTeam === 'red' ? '#f87171' : '#60a5fa');
    }
  }

  getPlayersByTeam(team) {
    const list = [];
    for (const p of this.players.values()) {
      if (p.team === team && !p.isSpectator) list.push(p);
    }
    return list;
  }

  broadcastEvent(event) {
    if (this.eventQueue.length < 512) this.eventQueue.push(event);
  }

  broadcastChat(sender, message, color = '#ffffff') {
    const chatMsg = {
      type: 'chat',
      id: Math.random().toString(36).substring(2, 7),
      sender,
      text: message,
      color,
      time: Date.now()
    };
    this.sendToAll(chatMsg);
  }

  sendToAll(data) {
    const payload = JSON.stringify(data);
    for (const player of this.players.values()) {
      if (player.ws && player.ws.readyState === 1 && player.ws.bufferedAmount < 1024 * 1024) {
        player.ws.send(payload);
      }
    }
  }

  sendToPlayer(playerId, data) {
    if (this.players.has(playerId)) this.eventQueue.push({ ...data, recipientId: playerId });
  }

  tick() {
    if (this.players.size === 0) { this.lastTickTime = Date.now(); this.eventQueue = []; return; }
    const now = Date.now();
    const dt = Math.min((now - this.lastTickTime) / 1000, 0.1);
    this.lastTickTime = now;
    for (const player of this.players.values()) {
      if (now - (player.lastInputAt || 0) > 1000) player.input = cleanInput(null);
    }

    // 1-second interval flag for game timers
    this.secondAccumulator += dt;
    let secTick = false;
    if (this.secondAccumulator >= 1.0) {
      secTick = true;
      this.secondAccumulator -= 1.0;
    }

    // Update active game mode physics
    if (this.mode) {
      this.mode.update(dt, secTick);
    }

    // Network broadcast tick (30Hz)
    if (now - this.lastBroadcastTime >= this.broadcastInterval) {
      this.lastBroadcastTime = now;
      this.broadcastState();
    }
  }

  broadcastState() {
    const playersData = [];
    const now = Date.now();

    for (const p of this.players.values()) {
      // Calculate hold cooldown ratio (0 = ready, 1 = cooling down)
      let holdCdRatio = 0;
      if (p.lastHoldEndTime > 0) {
        const elapsed = now - p.lastHoldEndTime;
        if (elapsed < (p.holdCooldownMs || 5000)) {
          holdCdRatio = 1 - (elapsed / (p.holdCooldownMs || 5000));
        }
      }

      playersData.push({
        id: p.id,
        name: p.name,
        team: p.team,
        color: p.color,
        avatar: p.avatar,
        x: Math.round(p.pos.x * 10) / 10,
        y: Math.round(p.pos.y * 10) / 10,
        vx: Math.round(p.vel.x * 10) / 10,
        vy: Math.round(p.vel.y * 10) / 10,
        r: p.radius,
        score: p.score || 0,
        role: p.role,
        isVented: !!p.isVented,
        taskProgress: p.taskProgress ? Math.round(p.taskProgress * 100) : 0,
        isSpectator: !!p.isSpectator,
        isAlive: p.isAlive !== undefined ? p.isAlive : true,
        isKicking: !!p.isKicking,
        isHoldingBall: !!p.isHoldingBall,
        holdCdRatio: Math.round(holdCdRatio * 100) / 100,
        ping: p.ping || 0,
        killCooldown: this.modeType === 'space' ? Math.max(0, (p.killCooldown || 18) - (now - (p.lastKillTime || 0)) / 1000) : undefined
      });
    }

    const statePacket = {
      type: 'game_state',
      t: now,
      roomId: this.id,
      mode: this.modeType,
      hostId: this.hostId,
      restartVotesCount: this.restartVotes.size,
      restartVotesNeeded: Math.max(1, Math.ceil(this.players.size * 0.5)),
      hasVotedRestart: false, // populated per player or checked on client
      tackleEnabled: this.tackleEnabled,
      players: playersData,
      modeState: this.mode ? this.mode.getState() : {},
      events: this.eventQueue
    };

    for (const player of this.players.values()) {
      if (player.ws?.readyState === 1 && player.ws.bufferedAmount < 1024 * 1024) {
        player.ws.send(JSON.stringify(projectState(statePacket, player, this)));
      }
    }
    this.eventQueue = []; // Clear processed events
  }

  getInfo() {
    return {
      id: this.id,
      name: this.name,
      mode: this.modeType,
      mapTheme: this.mapTheme || 'spaceship',
      mapName: this.mode?.mapName || 'Uzay Gemisi',
      mapIcon: this.mode?.mapIcon || '🚀',
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      speedMultiplier: this.speedMultiplier || 1.0,
      tackleEnabled: this.tackleEnabled,
      isPrivate: this.isPrivate,
      createdAt: this.createdAt
    };
  }

  destroy() {
    this.mode?.destroy();
    this.eventQueue = [];
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
