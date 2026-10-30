import { Vec2, resolveCircleCollision, resolveSegmentCollision } from '../physics.js';
import { configDb } from '../../db/configDb.js';
import { BaseMode } from './BaseMode.js';
import { mapRegistry } from './maps/mapRegistry.js';
import { hasSight } from '../spaceVision.js';

export const SPACE_COLORS = [
  ['Kırmızı','#ef4444'],['Mavi','#2563eb'],['Yeşil','#16a34a'],['Pembe','#ec4899'],
  ['Turuncu','#f97316'],['Sarı','#facc15'],['Siyah','#374151'],['Beyaz','#e2e8f0'],
  ['Mor','#9333ea'],['Kahverengi','#92400e'],['Turkuaz','#22d3ee'],['Limon','#a3e635'],
  ['Bordo','#9f1239'],['Gül','#fda4af'],['Muz','#fef08a'],['Gri','#94a3b8'],
  ['Kum','#d6b98c'],['Mercan','#fb7185']
].map(([name,color])=>({name,color}));

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
    this.result = null;
    this.matchRoster = [];

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
    this.generator = { x: this.taskStations[0].x, y: this.taskStations[0].y - 90, room: this.taskStations[0].room };
    this.reactorPanels = [{id:'reactor_a',x:-1035,y:-140},{id:'reactor_b',x:-795,y:-140}];
  }

  onPlayerJoin(player) {
    this.chooseColor(player, null);
    player.radius = 18;
    player.mass = 2.5;
    player.damping = 0.92;
    player.restitution = 0.4;
    player.isAlive = true;
    player.isSpectator = !['waiting', 'game_over'].includes(this.gameState);
    player.role = 'crew'; // 'crew' or 'impostor'
    player.killCooldown = 18; // 18 seconds
    player.lastKillTime = Date.now();
    player.isVented = false;
    player.ventId = null;
    player.ventDirection = null;
    player.currentTask = null;
    player.isDoingTask = false;
    player.taskProgress = 0;
    player.previousVentInput = {};
    player.completedTasksList = [];

    // Spawn at Cafeteria Table
    this.spawnAtCafeteria(player);

    if (player.isSpectator) return;
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
    this.bodies = this.bodies.filter(b => b.playerId !== player.id);

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
    player.ventId = null;
    player.ventDirection = null;
    player.previousVentInput = {};
    player.isDoingTask = false;
    player.currentTask = null;
    player.taskProgress = 0;
  }

  startMatch(callerName = 'Host') {
    if (this.room.players.size > 1 && this.room.players.size < 4) {
      this.room.broadcastChat('Sistem','Sosyal maç için en az 4 oyuncu gerekir. Tek kişi görev antrenmanı yapabilir.','#facc15');
      return;
    }
    this.cancelTimers();
    this.gameState = 'playing';
    this.winner = null;
    this.result = null;
    this.lastMeetingAt = 0;
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

    const players = Array.from(this.room.players.values());
    players.forEach(p => {
      p.isSpectator = false;
      p.isAlive = true;
      p.isVented = false;
      p.ventId = null;
      p.isDoingTask = false;
      p.completedTasksList = [];
      p.taskProgress = 0;
      this.spawnAtCafeteria(p);
    });

    this.checkRolesDistribution();
    this.matchRoster = players.map(p => ({ id: p.id, name: p.name, color: p.color, avatar: p.avatar, role: p.role }));
    this.soloPractice = players.length === 1;
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
    const shuffled = [...players];
    for (let i=shuffled.length-1;i>0;i--) {const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
    for (let i = 0; i < impostorCount; i++) {
      shuffled[i].role = 'impostor';
      shuffled[i].lastKillTime = Date.now() - (shuffled[i].killCooldown - 5) * 1000;
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

  chooseColor(player, requested) {
    const used = new Set([...this.room.players.values()].filter(p=>p.id!==player.id).map(p=>p.color));
    const free = SPACE_COLORS.filter(c=>!used.has(c.color));
    if (requested !== null) {
      if (!free.some(c=>c.color===requested) && requested!==player.color) return;
      if (!SPACE_COLORS.some(c=>c.color===requested)) return;
      player.color=requested;
    } else {
      const available=free.length?free:SPACE_COLORS;
      player.color=available[Math.floor(Math.random()*available.length)].color;
    }
  }

  handlePlayerInput(player, dt = 1 / 60) {
    if (!player.input || player.isSpectator || !['waiting', 'playing'].includes(this.gameState)) return;
    const now = Date.now();

    // Tasks complete through their validated start/complete actions, never by holding E.
    if (!player.isAlive) return;

    // 2. KILL MECHANIC (Impostor only) -> 'kick' or 'kill'
    if (player.input.kick && player.role === 'impostor' && !player.isVented && this.gameState === 'playing') {
      const cdElapsed = (now - player.lastKillTime) / 1000;
      if (cdElapsed >= player.killCooldown) {
        // Find nearest alive crewmate
        const players = Array.from(this.room.players.values()).filter(p => p.id !== player.id && p.role === 'crew' && p.isAlive && !p.isSpectator && !p.isVented);
        for (const target of players) {
          const dist = Math.hypot(player.pos.x - target.pos.x, player.pos.y - target.pos.y);
          if (dist < 60 && this.hasLineOfSight(player.pos, target.pos)) {
            // Kill target!
            target.isAlive = false;
            player.lastKillTime = now;

            // Leave Dead Body
            this.bodies.push({
              id: 'body_' + Math.random().toString(36).substring(2, 8),
              playerId: target.id,
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

    this.handleVentInput(player, now);

    // 4. REPORT BODY OR EMERGENCY BUTTON -> 'report' or 'KeyR'
    if (player.input.report && !player.isVented && this.gameState === 'playing') {
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

      if (canReport && (reportedBody || !this.sabotage.active)) {
        const callerName = (player && player.name) ? player.name : 'Bir Oyuncu';
        this.startEmergencyMeeting(callerName, reportedBody ? `Ceset Bulundu: ${reportedBody.name}` : 'Acil Durum Butonuna Basıldı!');
      }
    }
  }

  handleAction(playerId, actionData) {
    if (!actionData) return;

    if (actionData.type === 'stop_match' || (actionData.type === 'toggle_match' && !['waiting', 'game_over'].includes(this.gameState))) {
      this.resetGame(); return;
    }
    if (actionData.type === 'start_match' || actionData.type === 'start_game' || actionData.type === 'restart_match' || actionData.type === 'toggle_match') {
      const player = this.room.players.get(playerId);
      const callerName = player ? player.name : 'Host';
      this.startMatch(callerName);
      return;
    }

    const player = this.room.players.get(playerId);
    if (!player) return;

    if (actionData.type === 'choose_color') {
      if (['waiting','game_over'].includes(this.gameState)) this.chooseColor(player,actionData.color===null?null:actionData.color);
      return;
    }

    if (actionData.type === 'start_task') {
      const station = this.taskStations.find(s => s.id === actionData.taskId);
      if (!this.canDoTask(player, station)) return;
      player.isDoingTask = true;
      player.currentTask = station.id;
      player.taskStartedAt = Date.now();
      player.vel.set(0, 0);
      return;
    }

    if (actionData.type === 'stop_task') {
      player.isDoingTask = false;
      player.currentTask = null;
      return;
    }

    if (actionData.type === 'vent_travel') { this.travelVent(player, actionData.targetId); return; }
    if (actionData.type === 'vent_exit') { this.exitVent(player); return; }

    if (actionData.type === 'sabotage') {
      if (player.role !== 'impostor' || !player.isAlive || player.isSpectator || this.gameState !== 'playing') return;
      if (this.sabotage.cooldown > 0 || this.sabotage.active) return;

      const sType = actionData.sabotageType;

      if (sType === 'reactor') {
        this.sabotage={type:'reactor',active:true,timer:30,duration:30,cooldown:40,repairCount:0};
        this.room.broadcastEvent({type:'sabotage_start',sabotageType:'reactor',message:'Reaktör kritik! İki panelde aynı anda E tuşunu basılı tutun.'});
      } else if (sType === 'lights') {
        this.sabotage = {
          type: 'lights',
          active: true,
          timer: 0,
          duration: 0,
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
      const station = this.generator;
      if (!player.isAlive || player.isSpectator || player.isVented || this.gameState !== 'playing' || !station || Math.hypot(player.pos.x - station.x, player.pos.y - station.y) > 120 || !this.hasLineOfSight(player.pos,station)) return;
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
      if (player.isAlive && !player.isSpectator && !player.isVented && this.gameState === 'playing') {
        const body = this.bodies.find(b => Math.hypot(player.pos.x - b.x, player.pos.y - b.y) < 75);
        if (body || (!this.sabotage.active && Math.hypot(player.pos.x, player.pos.y) < 65)) this.startEmergencyMeeting(player.name, body ? `Ceset Bulundu: ${body.name}` : 'Acil Durum Butonuna Basıldı!');
      }
    }
  }

  completeTask(playerId, taskId) {
    const player = this.room.players.get(playerId);
    const station = this.taskStations.find(s => s.id === taskId);
    if (!this.canDoTask(player, station) || !player.isDoingTask || player.currentTask !== taskId || Date.now() - player.taskStartedAt < station.duration * 1000) return;
    player.isDoingTask = false;
    player.currentTask = null;

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

      this.checkWinConditions();
    }
  }

  startEmergencyMeeting(reporterName, reason) {
    if (Date.now() - (this.lastMeetingAt || 0) < 15000) return;
    this.lastMeetingAt = Date.now();
    if (this.sabotage.type==='reactor') {this.sabotage.active=false;this.sabotage.type=null;this.sabotage.timer=0;}
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
    if (targetId === voterId) return;
    const target = this.room.players.get(targetId);
    if (targetId !== 'skip' && (!target || !target.isAlive || target.isSpectator)) return;

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

  finishGame(winner, reason) {
    if (this.gameState === 'game_over') return;
    this.sabotage.active=false;this.sabotage.type=null;this.sabotage.timer=0;
    this.winner = winner;
    this.gameState = 'game_over';
    this.result = {
      id: this.room.id + ':' + Date.now(), winner, reason,
      players: this.matchRoster.map(entry => {
        const p = this.room.players.get(entry.id);
        return { ...entry, outcome: entry.role === winner ? 'winner' : 'loser',
          isAlive: p?.isAlive ?? false, disconnected: !p,
          tasks: p?.completedTasksList?.length || 0 };
      })
    };
    for (const p of this.room.players.values()) { p.vel.set(0,0); p.isDoingTask=false; p.taskProgress=0; }
    this.room.broadcastEvent({ type: 'game_over', winner, message: reason });
  }

  checkWinConditions() {
    if (!['playing', 'meeting'].includes(this.gameState)) return;
    // Practice has no opponent and never awards a competitive win/loss.
    if (this.soloPractice) return;
    const players = [...this.room.players.values()].filter(p => !p.isSpectator);
    if (this.totalTasks > 0 && this.completedTasks >= this.totalTasks && !(this.sabotage.active && this.sabotage.type==='reactor')) {
      this.finishGame('crew', 'Tüm görevler tamamlandı.'); return;
    }
    const crew = players.filter(p => p.isAlive && p.role === 'crew');
    const impostors = players.filter(p => p.isAlive && p.role === 'impostor');
    if (!impostors.length) this.finishGame('crew', 'Tüm casuslar elendi.');
    else if (impostors.length >= crew.length) this.finishGame('impostor', 'Casuslar geminin kontrolünü ele geçirdi.');
  }

  handleVentInput(player, now) {
    if (player.role !== 'impostor' || !player.isAlive || player.isSpectator || this.gameState !== 'playing') return;
    const keys=player.input, previous=player.previousVentInput || {};
    const ventPressed=keys.vent && !previous.vent;
    const dx=Number(!!keys.right)-Number(!!keys.left), dy=Number(!!keys.down)-Number(!!keys.up);
    const direction=dx+','+dy;
    if(!dx&&!dy) player.ventDirection=null;
    player.previousVentInput={...keys};
    if (ventPressed) {
      if (player.isVented) this.exitVent(player,now);
      else {
        const vent=this.vents.find(v=>Math.hypot(player.pos.x-v.x,player.pos.y-v.y)<50 && this.hasLineOfSight(player.pos,v));
        if (vent && now-(player.lastVentToggle||0)>=450) {
          player.isVented=true; player.ventId=vent.id; player.lastVentToggle=now; player.ventDirection=null;
          player.pos.set(vent.x,vent.y); player.vel.set(0,0);
          this.room.broadcastEvent({type:'sfx_vent',x:vent.x,y:vent.y});
        }
      }
    } else if (player.isVented && (dx||dy) && player.ventDirection!==direction && now-(player.lastVentToggle||0)>=450) {
      const vent=this.vents.find(v=>v.id===player.ventId);
      const options=(vent?.connectsTo||[]).map(id=>this.vents.find(v=>v.id===id)).filter(Boolean);
      options.sort((a,b)=>((b.x-vent.x)*dx+(b.y-vent.y)*dy)/Math.hypot(b.x-vent.x,b.y-vent.y)-((a.x-vent.x)*dx+(a.y-vent.y)*dy)/Math.hypot(a.x-vent.x,a.y-vent.y));
      if(options[0]) {this.travelVent(player,options[0].id,now);player.ventDirection=direction;}
    }
  }

  travelVent(player, targetId, now=Date.now()) {
    if(this.gameState!=='playing'||!player.isAlive||player.isSpectator||player.role!=='impostor'||!player.isVented||now-(player.lastVentToggle||0)<450) return;
    const current=this.vents.find(v=>v.id===player.ventId), target=this.vents.find(v=>v.id===targetId);
    if(!target||!current?.connectsTo.includes(targetId)) return;
    player.ventId=target.id; player.pos.set(target.x,target.y); player.vel.set(0,0); player.lastVentToggle=now;
    this.room.broadcastEvent({type:'sfx_vent',x:target.x,y:target.y});
  }

  exitVent(player, now=Date.now()) {
    if(this.gameState!=='playing'||!player.isAlive||player.isSpectator||player.role!=='impostor'||!player.isVented||now-(player.lastVentToggle||0)<450) return;
    player.isVented=false; player.ventId=null; player.lastVentToggle=now;
    this.room.broadcastEvent({type:'sfx_vent',x:player.pos.x,y:player.pos.y});
  }

  resetGame() {
    this.cancelTimers();
    this.phaseTimer = 0;
    this.gameState = 'waiting';
    this.winner = null;
    this.result = null;
    this.soloPractice = false;
    this.matchRoster = [];
    this.sabotage = {type:null,active:false,timer:0,duration:0,cooldown:0};
    for(const door of this.doors) {door.isLocked=false;door.lockTimer=0;}
    this.completedTasks = 0;
    this.bodies = [];
    this.votes.clear();
    this.meetingReason = '';

    const players = Array.from(this.room.players.values());
    players.forEach(p => {
      p.isSpectator = false;
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
    if (this.gameState === 'game_over') return;
    if (this.gameState === 'meeting') {
      this.meetingTimer -= dt;
      if (this.meetingTimer <= 0) {
        this.resolveMeeting();
      }
      return;
    }

    // Update Sabotage Timers
    if (this.sabotage) {
      if (this.sabotage.active && this.sabotage.type==='reactor') {
        const holders=[...this.room.players.values()].filter(p=>p.isAlive&&!p.isSpectator&&!p.isVented&&p.input?.hold);
        const occupied=this.reactorPanels.map(panel=>holders.find(p=>Math.hypot(p.pos.x-panel.x,p.pos.y-panel.y)<85&&this.hasLineOfSight(p.pos,panel)));
        this.sabotage.repairCount=occupied.filter(Boolean).length;
        if (occupied[0]&&occupied[1]&&occupied[0].id!==occupied[1].id) {
          this.sabotage.active=false;this.sabotage.type=null;this.sabotage.timer=0;
          this.room.broadcastEvent({type:'sabotage_fixed',sabotageType:'reactor',message:'Reaktör dengelendi.'});
          this.checkWinConditions();
        }
      }
      if (this.sabotage.cooldown > 0) {
        this.sabotage.cooldown = Math.max(0, this.sabotage.cooldown - dt);
      }
      if (this.sabotage.active && this.sabotage.timer > 0) {
        this.sabotage.timer -= dt;
        if (this.sabotage.timer <= 0) {
          if (this.sabotage.type==='reactor') {this.finishGame('impostor','Kritik reaktör sabotajı zamanında onarılamadı.');return;}
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

      this.handlePlayerInput(p1, dt);

      if (!p1.isVented) {
        const previousPosition = {x:p1.pos.x,y:p1.pos.y};
        this.applyPlayerMovement(p1, dt);
        p1.update(dt);

        // Wall & Closed Door collisions (only for alive players; dead players/ghosts can float through walls)
        if (p1.isAlive) {
          if (!this.isWalkable(p1.pos.x,p1.pos.y,p1.radius)) {
            p1.pos.set(previousPosition.x,previousPosition.y); p1.vel.set(0,0);
          }
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
      soloPractice: !!this.soloPractice,
      colorPalette: SPACE_COLORS,
      result: this.result,
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
      generator: this.generator,
      reactorPanels: this.reactorPanels,
      walls: this.walls.map(w => ({ p1: { x: w.p1.x, y: w.p1.y }, p2: { x: w.p2.x, y: w.p2.y } })),
      playersMeta: playerList.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        isAlive: p.isAlive,
        isSpectator: p.isSpectator,
        isVented: p.isVented,
        ventId: p.ventId,
        ventCooldownMs: Math.max(0,450-(Date.now()-(p.lastVentToggle||0))),
        isDoingTask: !!p.isDoingTask,
        taskProgress: p.taskProgress || 0,
        role: p.role,
        completedTasksList: p.completedTasksList || [],
        hasVoted: this.votes.has(p.id)
      }))
    };
  }

  canDoTask(player, station) {
    return !!(player && station && !player.isSpectator && !player.isVented && player.role === 'crew' &&
      this.gameState === 'playing' && !player.completedTasksList.includes(station.id) &&
      Math.hypot(player.pos.x - station.x, player.pos.y - station.y) < 80 &&
      (!player.isAlive || this.hasLineOfSight(player.pos,station)));
  }

  hasLineOfSight(a, b) {
    return hasSight(this,a,b);
  }

  isWalkable(x,y,radius=18) {
    return [[x,y],[x-radius,y],[x+radius,y],[x,y-radius],[x,y+radius]].every(([px,py]) =>
      [...this.roomsList,...this.corridors].some(r=>Math.abs(px-r.x)<=r.w/2 && Math.abs(py-r.y)<=r.h/2));
  }

}
