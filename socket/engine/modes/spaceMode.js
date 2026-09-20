import { Vec2, resolveCircleCollision, resolveSegmentCollision } from '../physics.js';
import { configDb } from '../../db/configDb.js';
import { BaseMode } from './BaseMode.js';

export class SpaceMode extends BaseMode {
  constructor(room) {
    super(room);
    this.type = 'space';
    this.name = 'Uzay Casusu (Spaceship Infiltration)';

    // Spaceship Map Dimensions (Bigger Map)
    this.width = 2800;
    this.height = 1800;

    this.gameState = 'waiting'; // 'waiting' (Lobi Serbest Dolaşma), 'playing', 'meeting', 'game_over'
    this.meetingTimer = 0;
    this.meetingDuration = 30; // 30 seconds voting
    this.ejectedPlayer = null;
    this.winner = null; // 'crew' or 'impostor'

    this.totalTasks = 0;
    this.completedTasks = 0;
    this.bodies = []; // Array of { id, x, y, color, avatar, name, killerId }
    this.votes = new Map(); // voterId -> targetId ('skip' or playerId)

    this.initMap();
    this.initDoors();
    this.initCorridors();
    this.initVents();
    this.initTaskStations();
  }

  initMap() {
    const hw = this.width / 2;
    const hh = this.height / 2;

    // Outer spaceship hull & internal architectural walls
    this.walls = [
      // Outer Ship Hull
      { p1: new Vec2(-hw, -hh), p2: new Vec2(hw, -hh) },
      { p1: new Vec2(-hw, hh), p2: new Vec2(hw, hh) },
      { p1: new Vec2(-hw, -hh), p2: new Vec2(-hw, hh) },
      { p1: new Vec2(hw, -hh), p2: new Vec2(hw, hh) },

      // Cafeteria (Center / Toplantı Masası) Walls with Wide Doorway Openings
      { p1: new Vec2(-340, -300), p2: new Vec2(-100, -300) },
      { p1: new Vec2(100, -300), p2: new Vec2(340, -300) },
      { p1: new Vec2(-340, 240), p2: new Vec2(-100, 240) },
      { p1: new Vec2(100, 240), p2: new Vec2(340, 240) },
      { p1: new Vec2(-340, -300), p2: new Vec2(-340, -80) },
      { p1: new Vec2(-340, 80), p2: new Vec2(-340, 240) },
      { p1: new Vec2(340, -300), p2: new Vec2(340, -80) },
      { p1: new Vec2(340, 80), p2: new Vec2(340, 240) },

      // Reactor & Engine (Left Room)
      { p1: new Vec2(-1150, -450), p2: new Vec2(-680, -450) },
      { p1: new Vec2(-680, -450), p2: new Vec2(-680, -100) },
      { p1: new Vec2(-680, 100), p2: new Vec2(-680, 450) },
      { p1: new Vec2(-1150, 450), p2: new Vec2(-680, 450) },

      // Electrical (Bottom Left)
      { p1: new Vec2(-950, 360), p2: new Vec2(-520, 360) },
      { p1: new Vec2(-520, 360), p2: new Vec2(-520, 750) },

      // Cockpit / Navigation (Right Room)
      { p1: new Vec2(700, -450), p2: new Vec2(1180, -450) },
      { p1: new Vec2(700, -450), p2: new Vec2(700, -100) },
      { p1: new Vec2(700, 100), p2: new Vec2(700, 450) },
      { p1: new Vec2(700, 450), p2: new Vec2(1180, 450) },

      // MedBay / Revir (Top Room)
      { p1: new Vec2(-300, -780), p2: new Vec2(300, -780) },
      { p1: new Vec2(-300, -780), p2: new Vec2(-300, -460) },
      { p1: new Vec2(300, -780), p2: new Vec2(300, -460) },

      // Security / Kalkan (Bottom Room)
      { p1: new Vec2(-280, 460), p2: new Vec2(280, 460) },
      { p1: new Vec2(-280, 460), p2: new Vec2(-280, 780) },
      { p1: new Vec2(280, 460), p2: new Vec2(280, 780) },

      // O2 / Yaşam Destek (Top Right Room)
      { p1: new Vec2(520, -750), p2: new Vec2(920, -750) },
      { p1: new Vec2(520, -750), p2: new Vec2(520, -480) },
      { p1: new Vec2(920, -750), p2: new Vec2(920, -480) },

      // Storage / Depo (Bottom Right Room)
      { p1: new Vec2(500, 460), p2: new Vec2(950, 460) },
      { p1: new Vec2(500, 460), p2: new Vec2(500, 800) },
      { p1: new Vec2(950, 460), p2: new Vec2(950, 800) }
    ];

    // Room Label Zones for Mini-Map and Fog vision
    this.roomsList = [
      { id: 'cafeteria', name: 'Kafeterya (Merkez)', x: 0, y: -30, w: 640, h: 500, icon: '☕' },
      { id: 'reactor', name: 'Reaktör & Motor Odası', x: -910, y: 0, w: 420, h: 840, icon: '⚛️' },
      { id: 'electrical', name: 'Elektrik & Jeneratör', x: -730, y: 550, w: 400, h: 360, icon: '⚡' },
      { id: 'medbay', name: 'Revir (MedBay Tarama)', x: 0, y: -620, w: 560, h: 280, icon: '💊' },
      { id: 'cockpit', name: 'Kokpit & Seyir / Navigasyon', x: 940, y: 0, w: 440, h: 840, icon: '🚀' },
      { id: 'security', name: 'Güvenlik & Kalkan', x: 0, y: 620, w: 520, h: 300, icon: '🛡️' },
      { id: 'o2', name: 'O2 & Yaşam Destek', x: 720, y: -610, w: 380, h: 260, icon: '🍃' },
      { id: 'storage', name: 'Depo & Kargo Bölümü', x: 720, y: 630, w: 420, h: 320, icon: '📦' }
    ];
  }

  initDoors() {
    this.doors = [
      { id: 'door_cafe_north', name: 'Kafeterya Kuzey Kapısı', x: 0, y: -300, w: 200, h: 28, orientation: 'h', isOpen: false, openTimer: 0 },
      { id: 'door_cafe_south', name: 'Kafeterya Güney Kapısı', x: 0, y: 240, w: 200, h: 28, orientation: 'h', isOpen: false, openTimer: 0 },
      { id: 'door_cafe_west', name: 'Kafeterya Batı Kapısı', x: -340, y: 0, w: 28, h: 160, orientation: 'v', isOpen: false, openTimer: 0 },
      { id: 'door_cafe_east', name: 'Kafeterya Doğu Kapısı', x: 340, y: 0, w: 28, h: 160, orientation: 'v', isOpen: false, openTimer: 0 },
      { id: 'door_medbay', name: 'Revir Kapısı', x: 0, y: -460, w: 180, h: 28, orientation: 'h', isOpen: false, openTimer: 0 },
      { id: 'door_security', name: 'Güvenlik Kapısı', x: 0, y: 460, w: 180, h: 28, orientation: 'h', isOpen: false, openTimer: 0 },
      { id: 'door_reactor', name: 'Reaktör Kapısı', x: -680, y: 0, w: 28, h: 200, orientation: 'v', isOpen: false, openTimer: 0 },
      { id: 'door_cockpit', name: 'Kokpit Kapısı', x: 700, y: 0, w: 28, h: 200, orientation: 'v', isOpen: false, openTimer: 0 },
      { id: 'door_electrical', name: 'Elektrik Kapısı', x: -520, y: 550, w: 28, h: 160, orientation: 'v', isOpen: false, openTimer: 0 },
      { id: 'door_storage', name: 'Depo Kapısı', x: 500, y: 630, w: 28, h: 160, orientation: 'v', isOpen: false, openTimer: 0 },
      { id: 'door_o2', name: 'O2 Kapısı', x: 520, y: -610, w: 28, h: 140, orientation: 'v', isOpen: false, openTimer: 0 }
    ];
  }

  initCorridors() {
    this.corridors = [
      { id: 'corr_north', name: 'Kuzey Koridoru (Revir Yolu)', x: 0, y: -380, w: 200, h: 160 },
      { id: 'corr_south', name: 'Güney Koridoru (Güvenlik Yolu)', x: 0, y: 350, w: 200, h: 160 },
      { id: 'corr_west', name: 'Batı Ana Koridoru (Reaktör Yolu)', x: -510, y: 0, w: 340, h: 160 },
      { id: 'corr_east', name: 'Doğu Ana Koridoru (Kokpit Yolu)', x: 520, y: 0, w: 360, h: 160 },
      { id: 'corr_ne', name: 'Kuzeydoğu Koridoru (O2 Geçişi)', x: 430, y: -450, w: 180, h: 180 },
      { id: 'corr_se', name: 'Güneydoğu Koridoru (Depo Geçişi)', x: 420, y: 450, w: 180, h: 180 },
      { id: 'corr_sw', name: 'Güneybatı Koridoru (Elektrik Geçişi)', x: -430, y: 450, w: 180, h: 180 }
    ];
  }

  initVents() {
    // Interconnected Vents for Impostor (Expanded Ship Map)
    this.vents = [
      { id: 'vent_elec', room: 'electrical', x: -750, y: 580, connectsTo: ['vent_react', 'vent_sec'] },
      { id: 'vent_react', room: 'reactor', x: -940, y: -260, connectsTo: ['vent_elec', 'vent_med'] },
      { id: 'vent_med', room: 'medbay', x: -180, y: -640, connectsTo: ['vent_react', 'vent_cafe'] },
      { id: 'vent_cafe', room: 'cafeteria', x: 250, y: -220, connectsTo: ['vent_med', 'vent_o2'] },
      { id: 'vent_o2', room: 'o2', x: 760, y: -620, connectsTo: ['vent_cafe', 'vent_cockpit'] },
      { id: 'vent_cockpit', room: 'cockpit', x: 960, y: -240, connectsTo: ['vent_o2', 'vent_storage'] },
      { id: 'vent_storage', room: 'storage', x: 760, y: 640, connectsTo: ['vent_cockpit', 'vent_sec'] },
      { id: 'vent_sec', room: 'security', x: 160, y: 640, connectsTo: ['vent_storage', 'vent_elec'] }
    ];
  }

  initTaskStations() {
    // Distributed Tasks around the expanded starship
    this.taskStations = [
      { id: 'task_wires_elec', room: 'electrical', name: '⚡ Kabloları Onar', x: -720, y: 560, icon: '⚡', timeSec: 2 },
      { id: 'task_reactor_align', room: 'reactor', name: '⚛️ Reaktörü Soğut', x: -920, y: 200, icon: '⚛️', timeSec: 3 },
      { id: 'task_scan_medbay', room: 'medbay', name: '💊 Biyometrik Tarama', x: 140, y: -630, icon: '💊', timeSec: 3 },
      { id: 'task_steer_cockpit', room: 'cockpit', name: '🚀 Rotayı Belirle', x: 980, y: 180, icon: '🚀', timeSec: 2 },
      { id: 'task_shields_sec', room: 'security', name: '🛡️ Kalkanları Güçlendir', x: -140, y: 640, icon: '🛡️', timeSec: 2 },
      { id: 'task_trash_cafe', room: 'cafeteria', name: '☕ Çöpleri Boşalt', x: -250, y: 140, icon: '🗑️', timeSec: 2 }
    ];
  }

  onPlayerJoin(player) {
    player.radius = 18;
    player.mass = 2.5;
    player.damping = 0.92;
    player.restitution = 0.4;
    player.isAlive = true;
    player.isSpectator = false;
    player.role = 'crew'; // 'crew' or 'impostor'
    player.killCooldown = 18; // 18 seconds
    player.lastKillTime = Date.now();
    player.isVented = false;
    player.ventId = null;
    player.currentTask = null;
    player.taskProgress = 0;
    player.completedTasksList = [];

    // Spawn at Cafeteria Table
    this.spawnAtCafeteria(player);

    if (this.gameState === 'playing' || this.gameState === 'meeting') {
      // If a match is already ongoing, check if there are active impostors
      const hasImpostor = Array.from(this.room.players.values()).some(p => p.id !== player.id && p.role === 'impostor');
      if (!hasImpostor) {
        this.checkRolesDistribution();
      } else {
        player.role = 'crew';
        this.recalculateTaskProgress();
      }
    } else {
      this.recalculateTaskProgress();
    }
  }

  onPlayerLeave(player) {
    // Remove player's vote if meeting is active
    if (this.votes.has(player.id)) {
      this.votes.delete(player.id);
    }
    // Remove votes targeted at this leaving player
    for (const [voterId, targetId] of this.votes.entries()) {
      if (targetId === player.id) {
        this.votes.set(voterId, 'skip');
      }
    }
    // Remove dead body of this player if left on map
    this.bodies = this.bodies.filter(b => b.id !== player.id);

    // Recalculate tasks and win conditions
    this.recalculateTaskProgress();
    if (this.gameState === 'playing' || this.gameState === 'meeting') {
      this.checkWinConditions();
    }
  }

  spawnAtCafeteria(player) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 80;
    player.pos.set(Math.cos(angle) * dist, Math.sin(angle) * dist);
    player.vel.set(0, 0);
    player.isVented = false;
  }

  startMatch(callerName = 'Host') {
    this.gameState = 'playing';
    this.winner = null;
    this.bodies = [];
    this.votes.clear();
    this.meetingReason = '';

    const players = Array.from(this.room.players.values()).filter(p => !p.isSpectator);
    players.forEach(p => {
      p.isAlive = true;
      p.isVented = false;
      p.ventId = null;
      p.completedTasksList = [];
      p.taskProgress = 0;
      this.spawnAtCafeteria(p);
    });

    this.checkRolesDistribution();
    this.recalculateTaskProgress();

    this.room.broadcastEvent({
      type: 'round_start',
      caller: callerName,
      message: '🚀 UZAY CASUSU BAŞLADI!'
    });
    this.room.broadcastEvent({ type: 'sfx_round_start' });
    this.room.broadcastChat('Sistem', `🚀 Oyun ${callerName} tarafından başlatıldı! Hain aranızda...`, '#ef4444');
  }

  checkRolesDistribution() {
    const players = Array.from(this.room.players.values()).filter(p => !p.isSpectator);
    if (players.length === 0) return;
    
    if (players.length === 1) {
      // Solo practice mode: player is crewmate by default to test tasks and interactions
      players[0].role = 'crew';
      this.recalculateTaskProgress();
      return;
    }

    const impostorCount = players.length >= 7 ? 2 : 1;
    // Assign random Impostor
    players.forEach(p => p.role = 'crew');
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    for (let i = 0; i < impostorCount; i++) {
      shuffled[i].role = 'impostor';
      shuffled[i].lastKillTime = Date.now() + 5000; // 5s initial cooldown
    }

    this.recalculateTaskProgress();
  }

  recalculateTaskProgress() {
    const crewPlayers = Array.from(this.room.players.values()).filter(p => !p.isSpectator && p.role === 'crew');
    const crewCount = crewPlayers.length;
    this.totalTasks = Math.max(this.taskStations.length, crewCount * this.taskStations.length);

    let completed = 0;
    for (const p of crewPlayers) {
      if (Array.isArray(p.completedTasksList)) {
        completed += p.completedTasksList.length;
      }
    }
    this.completedTasks = completed;
  }

  handlePlayerInput(player) {
    if (!player.input || !player.isAlive || player.isSpectator) return;
    const now = Date.now();

    // 1. USE / TASK INTERACTION -> 'KeyE' or 'hold' / 'use'
    if (player.input.hold || player.input.use) {
      if (player.role === 'crew' && !player.isVented) {
        // Check nearest task station
        for (const task of this.taskStations) {
          const dist = Math.hypot(player.pos.x - task.x, player.pos.y - task.y);
          if (dist < 45 && !player.completedTasksList.includes(task.id)) {
            player.taskProgress = (player.taskProgress || 0) + 0.025;
            if (player.taskProgress >= 1.0) {
              player.completedTasksList.push(task.id);
              player.taskProgress = 0;
              this.recalculateTaskProgress();
              this.room.broadcastEvent({
                type: 'sfx_task_complete',
                playerId: player.id,
                taskName: task.name
              });
              this.checkWinConditions();
            }
            break;
          }
        }
      }
    } else {
      player.taskProgress = 0;
    }

    // 2. KILL MECHANIC (Impostor only) -> 'kick' or 'kill'
    if (player.input.kick && player.role === 'impostor' && !player.isVented && this.gameState === 'playing') {
      const cdElapsed = (now - player.lastKillTime) / 1000;
      if (cdElapsed >= player.killCooldown) {
        // Find nearest alive crewmate
        const players = Array.from(this.room.players.values()).filter(p => p.id !== player.id && p.isAlive && !p.isSpectator && !p.isVented);
        for (const target of players) {
          const dist = Math.hypot(player.pos.x - target.pos.x, player.pos.y - target.pos.y);
          if (dist < 60) {
            // Kill target!
            target.isAlive = false;
            player.lastKillTime = now;

            // Leave Dead Body
            this.bodies.push({
              id: 'body_' + Math.random().toString(36).substring(2, 8),
              x: target.pos.x,
              y: target.pos.y,
              color: target.color,
              avatar: target.avatar,
              name: target.name,
              killerId: player.id,
              time: now
            });

            this.room.broadcastEvent({
              type: 'sfx_kill',
              killerId: player.id,
              victimId: target.id,
              x: target.pos.x,
              y: target.pos.y
            });

            this.checkWinConditions();
            break;
          }
        }
      }
    }

    // 3. VENT MECHANIC (Impostor only) -> 'vent' or 'KeyV'
    if (player.input.vent && player.role === 'impostor' && this.gameState === 'playing') {
      if (!player.lastVentToggle || now - player.lastVentToggle > 500) {
        player.lastVentToggle = now;
        if (!player.isVented) {
          // Enter nearest vent
          for (const vent of this.vents) {
            const dist = Math.hypot(player.pos.x - vent.x, player.pos.y - vent.y);
            if (dist < 50) {
              player.isVented = true;
              player.ventId = vent.id;
              player.pos.set(vent.x, vent.y);
              player.vel.set(0, 0);
              this.room.broadcastEvent({ type: 'sfx_vent', x: vent.x, y: vent.y });
              break;
            }
          }
        } else {
          // Exit or cycle vent
          const curVent = this.vents.find(v => v.id === player.ventId);
          if (curVent && curVent.connectsTo && curVent.connectsTo.length > 0) {
            // If movement direction pressed, jump to connected vent
            if (player.input.left || player.input.right || player.input.up || player.input.down) {
              const nextId = curVent.connectsTo[Math.floor(Math.random() * curVent.connectsTo.length)];
              const nextVent = this.vents.find(v => v.id === nextId);
              if (nextVent) {
                player.ventId = nextVent.id;
                player.pos.set(nextVent.x, nextVent.y);
                this.room.broadcastEvent({ type: 'sfx_vent', x: nextVent.x, y: nextVent.y });
              }
            } else {
              // Exit vent
              player.isVented = false;
              player.ventId = null;
              this.room.broadcastEvent({ type: 'sfx_vent', x: player.pos.x, y: player.pos.y });
            }
          } else {
            player.isVented = false;
          }
        }
      }
    }

    // 4. REPORT BODY OR EMERGENCY BUTTON -> 'report' or 'KeyR'
    if (player.input.report && this.gameState === 'playing') {
      // Check emergency button at cafeteria (0, 0)
      const distToButton = Math.hypot(player.pos.x, player.pos.y);
      let canReport = distToButton < 65;

      // Or check nearby dead bodies
      let reportedBody = null;
      for (const body of this.bodies) {
        const dist = Math.hypot(player.pos.x - body.x, player.pos.y - body.y);
        if (dist < 75) {
          canReport = true;
          reportedBody = body;
          break;
        }
      }

      if (canReport) {
        const callerName = (player && player.name) ? player.name : 'Bir Oyuncu';
        this.startEmergencyMeeting(callerName, reportedBody ? `Ceset Bulundu: ${reportedBody.name}` : 'Acil Durum Butonuna Basıldı!');
      }
    }
  }

  handleAction(playerId, actionData) {
    if (!actionData) return;

    if (actionData.type === 'start_match' || actionData.type === 'start_game' || actionData.type === 'restart_match' || actionData.type === 'toggle_match') {
      const player = this.room.players.get(playerId);
      const callerName = player ? player.name : 'Host';
      this.startMatch(callerName);
      return;
    }

    if (actionData.type === 'vote') {
      this.castVote(playerId, actionData.targetId);
    } else if (actionData.type === 'complete_task') {
      this.completeTask(playerId, actionData.taskId);
    } else if (actionData.type === 'emergency_meeting' || actionData.type === 'report') {
      const player = this.room.players.get(playerId);
      if (player && player.isAlive && !player.isSpectator && this.gameState === 'playing') {
        const callerName = player.name || 'Bir Oyuncu';
        this.startEmergencyMeeting(callerName, 'Acil Durum Butonuna Basıldı!');
      }
    }
  }

  completeTask(playerId, taskId) {
    const player = this.room.players.get(playerId);
    if (!player || player.isSpectator) return;

    const station = this.taskStations.find(s => s.id === taskId);
    if (!station) return;

    if (!player.completedTasksList) {
      player.completedTasksList = [];
    }

    if (!player.completedTasksList.includes(taskId)) {
      player.completedTasksList.push(taskId);
      this.recalculateTaskProgress();
      player.taskProgress = 0;

      this.room.broadcastEvent({
        type: 'sfx_task_complete',
        playerId: player.id,
        playerName: player.name || 'Oyuncu',
        taskName: station.name,
        x: station.x,
        y: station.y
      });

      if (this.gameState === 'playing') {
        this.checkWinConditions();
      }
    }
  }

  startEmergencyMeeting(reporterName, reason) {
    this.gameState = 'meeting';
    const finalReporter = reporterName || 'Bir Oyuncu';
    this.meetingReason = reason || 'Acil Durum Toplantısı!';
    this.meetingTimer = this.meetingDuration;
    this.votes.clear();
    this.bodies = []; // Clear bodies

    // Teleport all alive players to Cafeteria Table
    const players = Array.from(this.room.players.values());
    players.forEach(p => {
      this.spawnAtCafeteria(p);
      p.taskProgress = 0;
    });

    this.room.broadcastEvent({
      type: 'emergency_meeting',
      caller: finalReporter,
      reporter: finalReporter,
      reason: this.meetingReason
    });
  }

  castVote(voterId, targetId) {
    if (this.gameState !== 'meeting') return;
    const voter = this.room.players.get(voterId);
    if (!voter || !voter.isAlive || voter.isSpectator) return;

    this.votes.set(voterId, targetId);

    // Check if all alive players voted
    const aliveCount = Array.from(this.room.players.values()).filter(p => !p.isSpectator && p.isAlive).length;
    if (this.votes.size >= aliveCount) {
      this.resolveMeeting();
    }
  }

  resolveMeeting() {
    this.gameState = 'playing';
    this.meetingTimer = 0;

    // Tally votes
    const voteCounts = new Map(); // targetId -> count
    for (const [voter, target] of this.votes.entries()) {
      if (target) {
        voteCounts.set(target, (voteCounts.get(target) || 0) + 1);
      }
    }

    let maxVotes = 0;
    let ejectedId = null;
    let isTie = false;

    for (const [target, count] of voteCounts.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        ejectedId = target;
        isTie = false;
      } else if (count === maxVotes) {
        isTie = true;
      }
    }

    let resultMsg = 'Kimse atılmadı (Berabere / Pas Geçildi).';
    let ejectedPlayer = null;

    if (!isTie && ejectedId && ejectedId !== 'skip') {
      const targetPlayer = this.room.players.get(ejectedId);
      if (targetPlayer) {
        targetPlayer.isAlive = false;
        const allPlayers = Array.from(this.room.players.values()).filter(p => !p.isSpectator);
        const remainingImpostors = allPlayers.filter(p => p.isAlive && p.role === 'impostor').length;

        ejectedPlayer = {
          id: targetPlayer.id,
          name: targetPlayer.name,
          avatar: targetPlayer.avatar,
          color: targetPlayer.color,
          role: targetPlayer.role,
          wasImpostor: targetPlayer.role === 'impostor',
          impostorsLeft: remainingImpostors
        };

        if (ejectedPlayer.wasImpostor) {
          resultMsg = `${targetPlayer.name} uzay boşluğuna fırlatıldı! BİR CASUSTU! 🔪 (${remainingImpostors} Casus Kaldı)`;
        } else {
          resultMsg = `${targetPlayer.name} uzay boşluğuna fırlatıldı! Bir Mürettebattı 🛠️ (${remainingImpostors} Casus Kaldı)`;
        }
      }
    }

    this.room.broadcastEvent({
      type: 'meeting_result',
      ejected: ejectedPlayer,
      isTie: isTie,
      isSkip: ejectedId === 'skip',
      message: resultMsg
    });

    this.votes.clear();
    this.checkWinConditions();
  }

  checkWinConditions() {
    const players = Array.from(this.room.players.values()).filter(p => !p.isSpectator);
    if (players.length < 2) return;

    const aliveCrew = players.filter(p => p.isAlive && p.role === 'crew');
    const aliveImpostors = players.filter(p => p.isAlive && p.role === 'impostor');

    // 1. Crew wins by ejecting all impostors
    if (aliveImpostors.length === 0) {
      this.winner = 'crew';
      this.gameState = 'game_over';
      this.room.broadcastEvent({
        type: 'game_over',
        winner: 'crew',
        message: '🎉 MÜRETTEBAT KAZANDI! Tüm Casuslar Uzaya Fırlatıldı!'
      });
      setTimeout(() => this.resetGame(), 5000);
      return;
    }

    // 2. Crew wins by completing all tasks
    if (this.totalTasks > 0 && this.completedTasks >= this.totalTasks) {
      this.winner = 'crew';
      this.gameState = 'game_over';
      this.room.broadcastEvent({
        type: 'game_over',
        winner: 'crew',
        message: '🛠️ MÜRETTEBAT KAZANDI! Tüm Görevler Tamamlandı!'
      });
      setTimeout(() => this.resetGame(), 5000);
      return;
    }

    // 3. Impostors win if they equal or outnumber crew
    if (aliveImpostors.length >= aliveCrew.length) {
      this.winner = 'impostor';
      this.gameState = 'game_over';
      this.room.broadcastEvent({
        type: 'game_over',
        winner: 'impostor',
        message: '🔪 CASUSLAR KAZANDI! Gemi Ele Geçirildi!'
      });
      setTimeout(() => this.resetGame(), 5000);
      return;
    }
  }

  resetGame() {
    this.gameState = 'waiting';
    this.winner = null;
    this.completedTasks = 0;
    this.bodies = [];
    this.votes.clear();
    this.meetingReason = '';

    const players = Array.from(this.room.players.values());
    players.forEach(p => {
      p.isAlive = true;
      p.isVented = false;
      p.ventId = null;
      p.role = 'crew';
      p.completedTasksList = [];
      p.taskProgress = 0;
      this.spawnAtCafeteria(p);
    });

    this.recalculateTaskProgress();
    this.room.broadcastChat('Sistem', '🛸 Lobi moduna dönüldü. Gemide serbestçe dolaşabilir veya yeni oyunu başlatabilirsiniz.', '#38bdf8');
  }

  update(dt, secTimerTick) {
    if (this.gameState === 'meeting') {
      this.meetingTimer -= dt;
      if (this.meetingTimer <= 0) {
        this.resolveMeeting();
      }
      return;
    }

    const playerList = Array.from(this.room.players.values());

    for (let i = 0; i < playerList.length; i++) {
      const p1 = playerList[i];
      if (p1.isSpectator) continue;

      this.handlePlayerInput(p1);

      if (!p1.isVented) {
        this.applyPlayerMovement(p1, dt);
        p1.update(dt);

        // Wall collisions (only for alive players; dead players/ghosts can float through walls)
        if (p1.isAlive) {
          for (const wall of this.walls) {
            resolveSegmentCollision(p1, wall.p1, wall.p2, 0.4);
          }

          // Collisions between alive players
          for (let j = i + 1; j < playerList.length; j++) {
            const p2 = playerList[j];
            if (p2.isSpectator || !p2.isAlive || p2.isVented) continue;
            resolveCircleCollision(p1, p2);
          }
        }
      }
    }

    // Automatic Proximity Door Sensors
    const alivePlayers = playerList.filter(p => !p.isSpectator && p.isAlive && !p.isVented);
    if (this.doors) {
      for (const door of this.doors) {
        let someoneNear = false;
        for (const p of alivePlayers) {
          const dist = Math.hypot(p.x - door.x, p.y - door.y);
          if (dist < 100) {
            someoneNear = true;
            break;
          }
        }

        if (someoneNear) {
          door.isOpen = true;
          door.openTimer = 1.6;
        } else if (door.openTimer > 0) {
          door.openTimer -= dt;
          if (door.openTimer <= 0) {
            door.isOpen = false;
          }
        }
      }
    }
  }

  applyPlayerMovement(player, dt) {
    if (!player.input) return;
    const accel = 1.05 * (this.room.speedMultiplier || 1.0);
    const maxSpeed = (player.isAlive ? 5.2 : 6.0) * (this.room.speedMultiplier || 1.0);

    let ax = 0;
    let ay = 0;

    if (player.input.up) ay -= 1;
    if (player.input.down) ay += 1;
    if (player.input.left) ax -= 1;
    if (player.input.right) ax += 1;

    if (ax !== 0 && ay !== 0) {
      ax *= 0.7071;
      ay *= 0.7071;
    }

    player.vel.x += ax * accel;
    player.vel.y += ay * accel;

    const currentSpeed = Math.hypot(player.vel.x, player.vel.y);
    if (currentSpeed > maxSpeed) {
      player.vel.x = (player.vel.x / currentSpeed) * maxSpeed;
      player.vel.y = (player.vel.y / currentSpeed) * maxSpeed;
    }
  }

  getState() {
    const playerList = Array.from(this.room.players.values());
    const skipCount = Array.from(this.votes.values()).filter(v => v === 'skip').length;
    const aliveImpostors = playerList.filter(p => !p.isSpectator && p.role === 'impostor' && p.isAlive).length;
    const taskRatio = this.totalTasks > 0 ? Math.min(100, Math.round((this.completedTasks / this.totalTasks) * 100)) : 0;

    return {
      mode: 'space',
      width: this.width,
      height: this.height,
      gameState: this.gameState,
      meetingReason: this.meetingReason || 'Acil Durum Toplantısı',
      meetingTimer: Math.ceil(this.meetingTimer),
      totalTasks: this.totalTasks,
      completedTasks: this.completedTasks,
      taskProgressRatio: taskRatio,
      skipVotesCount: skipCount,
      impostorsLeft: aliveImpostors,
      bodies: this.bodies,
      rooms: this.roomsList,
      corridors: this.corridors,
      doors: this.doors,
      vents: this.vents,
      taskStations: this.taskStations,
      walls: this.walls.map(w => ({ p1: { x: w.p1.x, y: w.p1.y }, p2: { x: w.p2.x, y: w.p2.y } })),
      playersMeta: playerList.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        isAlive: p.isAlive,
        isVented: p.isVented,
        role: p.role,
        completedTasksList: p.completedTasksList || [],
        hasVoted: this.votes.has(p.id)
      }))
    };
  }
}
