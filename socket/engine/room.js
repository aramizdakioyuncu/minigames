import { PhysicsBody } from './physics.js';
import { PuckMode } from './modes/puckMode.js';
import { SumoMode } from './modes/sumoMode.js';
import { AgarMode } from './modes/agarMode.js';
import { SpaceMode } from './modes/spaceMode.js';

export class Room {
  constructor(id, name, modeType = 'puck', options = {}) {
    this.id = id;
    this.name = name;
    this.modeType = modeType;
    this.maxPlayers = typeof options === 'number' ? options : (options.maxPlayers || 8);
    this.isPrivate = !!options.isPrivate;
    this.speedMultiplier = options.speedMultiplier || 1.0;
    this.matchDuration = options.matchDuration || 180;
    this.tackleEnabled = options.tackleEnabled !== undefined ? !!options.tackleEnabled : true;
    this.createdAt = Date.now();

    this.players = new Map(); // id -> PlayerBody
    this.eventQueue = [];

    this.initGameMode(modeType);

    // 60 Hz Physics & Broadcast Loop
    this.physicsInterval = 1000 / 60;
    this.broadcastInterval = 1000 / 60; // Full 60Hz broadcast for ultra-smooth sync
    this.lastTickTime = Date.now();
    this.lastBroadcastTime = Date.now();
    this.secondAccumulator = 0;

    this.timer = setInterval(() => this.tick(), 1000 / 60);
  }

  initGameMode(modeType) {
    this.modeType = modeType;
    if (modeType === 'sumo') {
      this.mode = new SumoMode(this);
    } else if (modeType === 'agar') {
      this.mode = new AgarMode(this);
    } else if (modeType === 'space') {
      this.mode = new SpaceMode(this);
    } else {
      this.mode = new PuckMode(this);
    }
  }

  addPlayer(id, name, color, avatar, ws) {
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

    player.name = (name || 'Player').substring(0, 16);
    player.color = color || '#3b82f6';
    player.avatar = avatar || '⚽';
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
    this.mode.onPlayerJoin(player);

    this.broadcastChat('Sistem', `${player.name} odaya katıldı!`, '#10b981');
    return player;
  }

  removePlayer(id) {
    const player = this.players.get(id);
    if (player) {
      this.players.delete(id);
      this.broadcastChat('Sistem', `${player.name} odadan ayrıldı.`, '#ef4444');
    }
  }

  handlePlayerInput(id, inputData) {
    const player = this.players.get(id);
    if (player) {
      player.input = inputData;
    }
  }

  handlePlayerAction(id, actionData) {
    if (this.mode && this.mode.castVote && actionData.type === 'vote') {
      this.mode.castVote(id, actionData.targetId);
    }
  }

  handleTeamChange(id, newTeam) {
    const player = this.players.get(id);
    if (player && (newTeam === 'red' || newTeam === 'blue' || newTeam === 'spec')) {
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
  }

  getPlayersByTeam(team) {
    const list = [];
    for (const p of this.players.values()) {
      if (p.team === team && !p.isSpectator) list.push(p);
    }
    return list;
  }

  broadcastEvent(event) {
    this.eventQueue.push(event);
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
      if (player.ws && player.ws.readyState === 1) { // OPEN
        player.ws.send(payload);
      }
    }
  }

  tick() {
    const now = Date.now();
    const dt = Math.min((now - this.lastTickTime) / 1000, 0.1);
    this.lastTickTime = now;

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
        ping: p.ping || 0
      });
    }

    const statePacket = {
      type: 'game_state',
      t: now,
      roomId: this.id,
      mode: this.modeType,
      tackleEnabled: this.tackleEnabled,
      players: playersData,
      modeState: this.mode ? this.mode.getState() : {},
      events: this.eventQueue
    };

    this.sendToAll(statePacket);
    this.eventQueue = []; // Clear processed events
  }

  getInfo() {
    return {
      id: this.id,
      name: this.name,
      mode: this.modeType,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      speedMultiplier: this.speedMultiplier || 1.0,
      tackleEnabled: this.tackleEnabled,
      isPrivate: this.isPrivate,
      createdAt: this.createdAt
    };
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
