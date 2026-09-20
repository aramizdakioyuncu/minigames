import { Vec2, resolveCircleCollision, resolveSegmentCollision } from '../physics.js';
import { configDb } from '../../db/configDb.js';
import { BaseMode } from './BaseMode.js';
import { mapRegistry } from './maps/mapRegistry.js';

export class SpaceMode extends BaseMode {
  constructor(room, options = {}) {
    super(room);
    this.type = 'space';
    this.name = 'Uzay Casusu (Spaceship Infiltration)';

    // Spaceship Map Dimensions
    this.width = 2800;
    this.height = 1800;

    this.mapTheme = options.mapTheme || (room && room.options && room.options.mapTheme) || 'spaceship';

    this.gameState = 'waiting'; // 'waiting' (Lobi Serbest Dolaşma), 'playing', 'meeting', 'game_over'
    this.meetingTimer = 0;
    this.meetingDuration = 30; // 30 seconds voting
    this.ejectedPlayer = null;
    this.winner = null; // 'crew' or 'impostor'

    this.totalTasks = 0;
    this.completedTasks = 0;
    this.bodies = []; // Array of { id, x, y, color, avatar, name, killerId }
    this.votes = new Map(); // voterId -> targetId ('skip' or playerId)

    // Impostor Sabotage System
    this.sabotage = {
      type: null, // null, 'lights', 'doors'
      active: false,
      timer: 0,
      duration: 0,
      cooldown: 0
    };

    this.loadMapLayout();
  }

  loadMapLayout() {
    const hw = this.width / 2;
    const hh = this.height / 2;
    const mapData = mapRegistry.getMap(this.mapTheme, hw, hh);

    this.mapName = mapData.name;
    this.mapIcon = mapData.icon;
    this.mapAccent = mapData.accentColor;
    this.walls = mapData.walls;
    this.roomsList = mapData.roomsList;
    this.doors = mapData.doors;
    this.corridors = mapData.corridors;
    this.vents = mapData.vents;
    this.taskStations = mapData.taskStations;
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
    player.isDoingTask = false;
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
    player.isDoingTask = false;
    player.taskProgress = 0;
  }

  startMatch(callerName = 'Host') {
    this.gameState = 'playing';
    this.winner = null;
    this.bodies = [];
    this.votes.clear();
    this.meetingReason = '';

    // Reset Sabotage State
    this.sabotage = {
      type: null,
      active: false,
      timer: 0,
      duration: 0,
      cooldown: 8 // 8s initial grace cooldown
    };

    if (this.doors) {
      this.doors.forEach(d => {
        d.isOpen = false;
        d.isLocked = false;
        d.lockTimer = 0;
        d.openTimer = 0;
      });
    }

    const players = Array.from(this.room.players.values()).filter(p => !p.isSpectator);
    players.forEach(p => {
      p.isAlive = true;
      p.isVented = false;
      p.ventId = null;
      p.isDoingTask = false;
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

    const player = this.room.players.get(playerId);
    if (!player) return;

    if (actionData.type === 'start_task') {
      player.isDoingTask = true;
      player.vel.set(0, 0);
      return;
    }

    if (actionData.type === 'stop_task') {
      player.isDoingTask = false;
      return;
    }

    if (actionData.type === 'sabotage') {
      if (player.role !== 'impostor' || !player.isAlive || player.isSpectator || this.gameState !== 'playing') return;
      if (this.sabotage.cooldown > 0) return;

      const sType = actionData.sabotageType;

      if (sType === 'lights') {
        this.sabotage = {
          type: 'lights',
          active: true,
          timer: 20,
          duration: 20,
          cooldown: 25
        };

        this.room.broadcastEvent({
          type: 'sabotage_start',
          sabotageType: 'lights',
          message: '⚠️ ELEKTRİK SABOTAJI! Işıklar kesildi! Elektrik odasında (⚡) şalteri kaldırın!'
        });
        this.room.broadcastChat('🚨 ALARM', 'Elektrikler kesildi! Görüş alanı daraldı. Elektrik odasında (⚡) jeneratörü onarın!', '#f43f5e');
      } else if (sType === 'doors') {
        this.sabotage = {
          type: 'doors',
          active: true,
          timer: 10,
          duration: 10,
          cooldown: 22
        };

        if (this.doors) {
          this.doors.forEach(d => {
            d.isLocked = true;
            d.lockTimer = 10;
            d.isOpen = false;
          });
        }

        this.room.broadcastEvent({
          type: 'sabotage_start',
          sabotageType: 'doors',
          message: '🔒 HAVA KİLİTLERİ KAPATILDI! 10 saniye boyunca tüm kapılar kilitlendi!'
        });
        this.room.broadcastChat('🚨 ALARM', 'Tüm kapılar karantinaya alındı! 10 saniye boyunca hava kilitleri açılamaz.', '#f43f5e');
      }
      return;
    }

    if (actionData.type === 'fix_sabotage') {
      if (this.sabotage.active && this.sabotage.type === 'lights') {
        this.sabotage.active = false;
        this.sabotage.type = null;
        this.sabotage.timer = 0;

        this.room.broadcastEvent({
          type: 'sabotage_fixed',
          sabotageType: 'lights',
          message: '💡 Elektrik onarıldı! Işıklar normale döndü.'
        });
        this.room.broadcastChat('Sistem', 'Elektrikler onarıldı, görüş mesafesi normale döndü.', '#10b981');
      }
      return;
    }

    if (actionData.type === 'vote') {
      this.castVote(playerId, actionData.targetId);
    } else if (actionData.type === 'complete_task') {
      this.completeTask(playerId, actionData.taskId);
    } else if (actionData.type === 'emergency_meeting' || actionData.type === 'report') {
      if (player && player.isAlive && !player.isSpectator && this.gameState === 'playing') {
        const callerName = player.name || 'Bir Oyuncu';
        this.startEmergencyMeeting(callerName, 'Acil Durum Butonuna Basıldı!');
      }
    }
  }

  completeTask(playerId, taskId) {
    const player = this.room.players.get(playerId);
    if (!player || player.isSpectator) return;
    player.isDoingTask = false;

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

      if (this.totalTasks > 0 && this.completedTasks >= this.totalTasks) {
        if (this.gameState === 'playing') {
          this.checkWinConditions();
        } else {
          this.room.broadcastEvent({
            type: 'game_over',
            winner: 'crew',
            message: '🛠️ MÜRETTEBAT ZAFERİ! Tüm Görevler Tamamlandı!'
          });
          this.room.broadcastChat('Sistem', '🎉 Tebrikler! Tüm görevler %100 tamamlandı! Maçta bu durumda Mürettebat doğrudan ZAFER kazanır.', '#10b981');
        }
      } else if (this.gameState === 'playing') {
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
    if (players.length < 2 && this.completedTasks < this.totalTasks) return;

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

    // Update Sabotage Timers
    if (this.sabotage) {
      if (this.sabotage.cooldown > 0) {
        this.sabotage.cooldown = Math.max(0, this.sabotage.cooldown - dt);
      }
      if (this.sabotage.active && this.sabotage.timer > 0) {
        this.sabotage.timer -= dt;
        if (this.sabotage.timer <= 0) {
          if (this.sabotage.type === 'lights') {
            this.room.broadcastEvent({
              type: 'sabotage_fixed',
              sabotageType: 'lights',
              message: '💡 Yedek jeneratör devreye girdi! Işıklar normale döndü.'
            });
          }
          this.sabotage.active = false;
          this.sabotage.type = null;
        }
      }
    }

    // Update Door Lock Timers
    if (this.doors) {
      for (const door of this.doors) {
        if (door.lockTimer > 0) {
          door.lockTimer -= dt;
          if (door.lockTimer <= 0) {
            door.isLocked = false;
          }
        }
      }
    }

    const playerList = Array.from(this.room.players.values());
    const alivePlayers = playerList.filter(p => !p.isSpectator && p.isAlive && !p.isVented);

    // Automatic Proximity Door Sensors (Only unlocked doors open on proximity)
    if (this.doors) {
      for (const door of this.doors) {
        if (door.isLocked) {
          door.isOpen = false;
          continue;
        }

        let someoneNear = false;
        for (const p of alivePlayers) {
          const px = p.pos ? p.pos.x : (p.x || 0);
          const py = p.pos ? p.pos.y : (p.y || 0);
          const dist = Math.hypot(px - door.x, py - door.y);
          if (dist < 130) {
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

    for (let i = 0; i < playerList.length; i++) {
      const p1 = playerList[i];
      if (p1.isSpectator) continue;

      this.handlePlayerInput(p1);

      if (!p1.isVented) {
        this.applyPlayerMovement(p1, dt);
        p1.update(dt);

        // Wall & Closed Door collisions (only for alive players; dead players/ghosts can float through walls)
        if (p1.isAlive) {
          for (const wall of this.walls) {
            resolveSegmentCollision(p1, wall.p1, wall.p2, 0.4);
          }

          // Closed or Locked Door Collisions
          if (this.doors) {
            for (const door of this.doors) {
              if (!door.isOpen || door.isLocked) {
                const isH = door.orientation === 'h';
                const dw = door.w || (isH ? 130 : 28);
                const dh = door.h || (isH ? 28 : 110);
                const p1Door = isH ? new Vec2(door.x - dw / 2, door.y) : new Vec2(door.x, door.y - dh / 2);
                const p2Door = isH ? new Vec2(door.x + dw / 2, door.y) : new Vec2(door.x, door.y + dh / 2);
                resolveSegmentCollision(p1, p1Door, p2Door, 0.4);
              }
            }
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
  }

  applyPlayerMovement(player, dt) {
    if (!player.input) return;

    // Crewmate freeze completely while performing a task (cannot move)
    if (player.isDoingTask || player.taskProgress > 0) {
      player.vel.set(0, 0);
      return;
    }

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
      mapTheme: this.mapTheme || 'spaceship',
      mapName: this.mapName || 'Uzay Gemisi',
      mapIcon: this.mapIcon || '🚀',
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
      sabotage: this.sabotage || { type: null, active: false, timer: 0, duration: 0, cooldown: 0 },
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
        isDoingTask: !!p.isDoingTask,
        taskProgress: p.taskProgress || 0,
        role: p.role,
        completedTasksList: p.completedTasksList || [],
        hasVoted: this.votes.has(p.id)
      }))
    };
  }
}
