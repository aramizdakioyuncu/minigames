// vampireMode.js - Server Game Mode for Vampir Köylü (Vampire & Villager)

import { Vec2, resolveCircleCollision, resolveSegmentCollision } from '../physics.js';
import { BaseMode } from './BaseMode.js';

export class VampireMode extends BaseMode {
  constructor(room) {
    super(room);
    this.type = 'vampire';
    this.name = 'Vampir Köylü (Vampire & Villager)';

    // Village Map Dimensions
    this.width = 1800;
    this.height = 1200;

    // Game Phases: 'waiting', 'role_reveal', 'night', 'day', 'voting', 'game_over'
    this.gameState = 'waiting';
    this.phaseTimer = 0;
    this.dayCount = 1;

    // Durations in seconds
    this.roleRevealDuration = 5;
    this.nightDuration = 25;
    this.dayDuration = 35;
    this.votingDuration = 25;

    // State trackers
    this.nightActions = {
      vampireVotes: new Map(), // voterId -> targetId
      doctorTarget: null,      // targetId
      doctorLastTarget: null,  // last targetId to prevent consecutive self-heal
      seerTarget: null,        // targetId
      hunterTarget: null       // targetId (if revenge triggered)
    };

    this.trialVotes = new Map(); // voterId -> targetId ('skip' or playerId)
    this.lastNightReport = null; // { deaths: [], healed: boolean, message: '' }
    this.lastTrialReport = null; // { executed: null, role: null, isTie: false, isSkip: false }
    this.winner = null;          // 'villagers' or 'vampires'

    this.initMap();
  }

  initMap() {
    const hw = this.width / 2;
    const hh = this.height / 2;

    // Village boundaries and structures
    this.walls = [
      // Outer Village Boundaries
      { p1: new Vec2(-hw, -hh), p2: new Vec2(hw, -hh) },
      { p1: new Vec2(-hw, hh), p2: new Vec2(hw, hh) },
      { p1: new Vec2(-hw, -hh), p2: new Vec2(-hw, hh) },
      { p1: new Vec2(hw, -hh), p2: new Vec2(hw, hh) },

      // Town Center Fountain Perimeter
      { p1: new Vec2(-90, -90), p2: new Vec2(90, -90) },
      { p1: new Vec2(90, -90), p2: new Vec2(90, 90) },
      { p1: new Vec2(90, 90), p2: new Vec2(-90, 90) },
      { p1: new Vec2(-90, 90), p2: new Vec2(-90, -90) },

      // Village Tavern (Top Left)
      { p1: new Vec2(-750, -480), p2: new Vec2(-420, -480) },
      { p1: new Vec2(-420, -480), p2: new Vec2(-420, -220) },
      { p1: new Vec2(-750, -220), p2: new Vec2(-420, -220) },
      { p1: new Vec2(-750, -480), p2: new Vec2(-750, -220) },

      // Church & Clock Tower (Top Right)
      { p1: new Vec2(420, -480), p2: new Vec2(750, -480) },
      { p1: new Vec2(750, -480), p2: new Vec2(750, -220) },
      { p1: new Vec2(420, -220), p2: new Vec2(750, -220) },
      { p1: new Vec2(420, -480), p2: new Vec2(420, -220) },

      // Mayor's House (Bottom Left)
      { p1: new Vec2(-750, 220), p2: new Vec2(-420, 220) },
      { p1: new Vec2(-420, 220), p2: new Vec2(-420, 480) },
      { p1: new Vec2(-750, 480), p2: new Vec2(-420, 480) },
      { p1: new Vec2(-750, 220), p2: new Vec2(-750, 480) },

      // Cemetery & Mausoleum (Bottom Right)
      { p1: new Vec2(420, 220), p2: new Vec2(750, 220) },
      { p1: new Vec2(750, 220), p2: new Vec2(750, 480) },
      { p1: new Vec2(420, 480), p2: new Vec2(750, 480) },
      { p1: new Vec2(420, 220), p2: new Vec2(420, 480) }
    ];

    this.landmarks = [
      { id: 'fountain', name: 'Köy Çeşmesi & Meydan', x: 0, y: 0, icon: '⛲' },
      { id: 'tavern', name: 'Han & Meyhane', x: -585, y: -350, icon: '🍺' },
      { id: 'church', name: 'Kilise & Çan Kulesi', x: 585, y: -350, icon: '⛪' },
      { id: 'house', name: 'Muhtar Konağı', x: -585, y: 350, icon: '🏡' },
      { id: 'cemetery', name: 'Mezarlık & Türbe', x: 585, y: 350, icon: '🪦' },
      { id: 'gallows', name: 'Darağacı & Mahkeme Kürsüsü', x: 0, y: 220, icon: '⚖️' }
    ];
  }

  onPlayerJoin(player) {
    player.radius = 18;
    player.mass = 2.5;
    player.damping = 0.92;
    player.restitution = 0.4;
    player.isAlive = true;
    player.isSpectator = !['waiting', 'game_over'].includes(this.gameState);
    player.role = 'villager'; // 'vampire', 'doctor', 'seer', 'hunter', 'villager'
    player.hasActed = false;
    player.hunterRevengeAvailable = false;

    // Spawn around town square fountain
    this.spawnAtTownSquare(player);

    if (this.gameState === 'waiting') {
      this.resetRoundState();
    }
  }

  onPlayerLeave(player) {
    // Clear votes if voting or night is active
    if (this.trialVotes.has(player.id)) {
      this.trialVotes.delete(player.id);
    }
    if (this.nightActions.vampireVotes.has(player.id)) {
      this.nightActions.vampireVotes.delete(player.id);
    }

    if (this.gameState !== 'waiting' && this.gameState !== 'game_over') {
      this.checkWinConditions();
    }
  }

  spawnAtTownSquare(player) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 110 + Math.random() * 90;
    player.pos.set(Math.cos(angle) * dist, Math.sin(angle) * dist);
    player.vel.set(0, 0);
  }

  resetRoundState() {
    this.nightActions.vampireVotes.clear();
    this.nightActions.doctorTarget = null;
    this.nightActions.seerTarget = null;
    this.nightActions.hunterTarget = null;
    this.trialVotes.clear();
  }

  startMatch(callerName = 'Host') {
    if (this.room.players.size < 3) {
      this.room.broadcastChat('Sistem', 'Vampir Köylü için en az 3 oyuncu gerekli.', '#facc15');
      return;
    }
    this.cancelTimers();
    this.dayCount = 1;
    this.winner = null;
    this.lastNightReport = null;
    this.lastTrialReport = null;
    this.resetRoundState();

    const players = Array.from(this.room.players.values());
    players.forEach(p => {
      p.isSpectator = false;
      p.hunterRevengeAvailable = false;
      p.isAlive = true;
      p.hasActed = false;
      this.spawnAtTownSquare(p);
    });

    this.assignRoles(players);

    this.gameState = 'role_reveal';
    this.phaseTimer = this.roleRevealDuration;

    this.room.broadcastEvent({
      type: 'vampire_match_started',
      caller: callerName,
      message: '🧛 VAMPİR KÖYLÜ BAŞLADI! Rolünüz belirleniyor...'
    });
    this.room.broadcastEvent({ type: 'sfx_round_start' });
    this.room.broadcastChat('Sistem', `🏰 Oyun ${callerName} tarafından başlatıldı! Köyün üzerine karanlık çöküyor...`, '#ef4444');
  }

  assignRoles(players) {
    const count = players.length;
    if (count === 0) return;

    // Role balancing based on player count
    let vampireCount = 1;
    let hasDoctor = count >= 3;
    let hasSeer = count >= 4;
    let hasHunter = count >= 6;

    if (count >= 7) vampireCount = 2;
    if (count >= 12) vampireCount = 3;

    // Reset all to villager first
    players.forEach(p => p.role = 'villager');

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    let idx = 0;

    // Assign Vampires
    for (let v = 0; v < vampireCount && idx < shuffled.length; v++) {
      shuffled[idx++].role = 'vampire';
    }

    // Assign Doctor
    if (hasDoctor && idx < shuffled.length) {
      shuffled[idx++].role = 'doctor';
    }

    // Assign Seer
    if (hasSeer && idx < shuffled.length) {
      shuffled[idx++].role = 'seer';
    }

    // Assign Hunter
    if (hasHunter && idx < shuffled.length) {
      shuffled[idx++].role = 'hunter';
    }

    // Remaining are villagers
    while (idx < shuffled.length) {
      shuffled[idx++].role = 'villager';
    }

    // Send private role notification to each player
    for (const p of players) {
      this.room.sendToPlayer(p.id, {
        type: 'vampire_role_assigned',
        role: p.role,
        vampireTeam: p.role === 'vampire' 
          ? players.filter(pl => pl.role === 'vampire').map(pl => ({ id: pl.id, name: pl.name, avatar: pl.avatar }))
          : []
      });
    }
  }

  startNightPhase() {
    this.gameState = 'night';
    this.phaseTimer = this.nightDuration;
    this.resetRoundState();

    const players = Array.from(this.room.players.values());
    players.forEach(p => p.hasActed = false);

    this.room.broadcastEvent({
      type: 'vampire_night_started',
      dayCount: this.dayCount,
      timer: this.nightDuration
    });
    this.room.broadcastEvent({ type: 'sfx_wolf_howl' });
    this.room.broadcastChat('Sistem', `🌙 ${this.dayCount}. Gece Çöktü! Köy halkı derin bir uykuya daldı...`, '#818cf8');
  }

  startDayPhase() {
    this.gameState = 'day';
    this.phaseTimer = this.dayDuration;
    this.trialVotes.clear();

    this.room.broadcastEvent({
      type: 'vampire_day_started',
      dayCount: this.dayCount,
      timer: this.dayDuration,
      report: this.lastNightReport
    });
    this.room.broadcastEvent({ type: 'sfx_village_bell' });

    if (this.lastNightReport && this.lastNightReport.deaths.length > 0) {
      const names = this.lastNightReport.deaths.map(d => d.name).join(', ');
      this.room.broadcastChat('Köy Çanı', `☀️ Gün Ağardı! Gece katledilen köylüler: ${names}`, '#ef4444');
    } else {
      this.room.broadcastChat('Köy Çanı', `☀️ Gün Ağardı! Mucize eseri bu gece kimse ölmedi!`, '#10b981');
    }

    // Check if game ended right after night
    this.checkWinConditions();
  }

  startVotingPhase() {
    this.gameState = 'voting';
    this.phaseTimer = this.votingDuration;
    this.trialVotes.clear();

    const alivePlayers = Array.from(this.room.players.values()).filter(p => !p.isSpectator && p.isAlive);

    this.room.broadcastEvent({
      type: 'vampire_trial_started',
      dayCount: this.dayCount,
      timer: this.votingDuration,
      candidates: alivePlayers.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color }))
    });
    this.room.broadcastEvent({ type: 'sfx_gavel' });
    this.room.broadcastChat('Mahkeme', `⚖️ Köy Meydanında Mahkeme Başladı! Şüphelinizi oylayın.`, '#facc15');
  }

  handleAction(playerId, actionData) {
    if (!actionData || !actionData.type) return;

    if (actionData.type === 'stop_match' || (actionData.type === 'toggle_match' && !['waiting', 'game_over'].includes(this.gameState))) {
      this.resetGame(); return;
    }
    if (['start_match', 'start_game', 'toggle_match'].includes(actionData.type)) {
      const player = this.room.players.get(playerId);
      const callerName = player ? player.name : 'Host';
      this.startMatch(callerName);
      return;
    }

    // 1. NIGHT ACTIONS
    if (this.gameState === 'night' && ['vampire_vote', 'doctor_heal', 'seer_investigate'].includes(actionData.type)) {
      const player = this.room.players.get(playerId);
      if (!player || !player.isAlive || player.isSpectator) return;
      if (player.hasActed) return;
      const target = this.room.players.get(actionData.targetId);
      if (actionData.targetId !== 'skip' && (!target || !target.isAlive || target.isSpectator)) return;
      if (actionData.targetId === 'skip') { player.hasActed = true; return; }

      if (actionData.type === 'vampire_vote' && player.role === 'vampire') {
        if (target.role === 'vampire') return;
        this.nightActions.vampireVotes.set(playerId, actionData.targetId);
        player.hasActed = true;

        // Notify other vampires of the chosen vote
        const targetPlayer = this.room.players.get(actionData.targetId);
        const vampires = Array.from(this.room.players.values()).filter(p => p.role === 'vampire');
        vampires.forEach(v => {
          this.room.sendToPlayer(v.id, {
            type: 'vampire_vote_update',
            voterName: player.name,
            targetName: targetPlayer ? targetPlayer.name : 'Pas'
          });
        });
      } else if (actionData.type === 'doctor_heal' && player.role === 'doctor') {
        // Doctor can heal anyone
        this.nightActions.doctorTarget = actionData.targetId;
        this.nightActions.doctorLastTarget = actionData.targetId;
        player.hasActed = true;
      } else if (actionData.type === 'seer_investigate' && player.role === 'seer') {
        if (actionData.targetId === playerId) return;
        const target = this.room.players.get(actionData.targetId);
        if (target) {
          this.nightActions.seerTarget = target.id;
          player.hasActed = true;
          const isVampire = target.role === 'vampire';
          this.room.sendToPlayer(playerId, {
            type: 'vampire_seer_result',
            targetId: target.id,
            targetName: target.name,
            targetAvatar: target.avatar,
            isVampire
          });
        }
      }
    }

    // 2. TRIAL VOTING ACTIONS
    if (this.gameState === 'voting' && actionData.type === 'trial_vote') {
      const player = this.room.players.get(playerId);
      if (!player || !player.isAlive || player.isSpectator) return;

      if (actionData.type === 'trial_vote') {
        const target = this.room.players.get(actionData.targetId);
        if (actionData.targetId !== 'skip' && (!target || !target.isAlive || target.isSpectator)) return;
        this.trialVotes.set(playerId, actionData.targetId); // 'skip' or candidate playerId
        player.hasActed = true;

        // Broadcast current vote tallies
        this.broadcastVoteCounts();
      }
    }

    // 3. HUNTER REVENGE SHOT
    if (actionData.type === 'hunter_revenge') {
      const player = this.room.players.get(playerId);
      if (player && player.role === 'hunter' && !player.isAlive && player.hunterRevengeAvailable && !['waiting', 'game_over'].includes(this.gameState)) {
        const target = this.room.players.get(actionData.targetId);
        if (target && target.isAlive && !target.isSpectator) {
          player.hunterRevengeAvailable = false;
          target.isAlive = false;
          this.room.broadcastEvent({
            type: 'vampire_hunter_revenge_result',
            hunterName: player.name,
            victimName: target.name,
            victimRole: target.role
          });
          this.room.broadcastChat('Avcı', `🏹 Avcı ${player.name} son nefesinde ${target.name} adlı oyuncuyu vurdu! (${target.role.toUpperCase()})`, '#ef4444');
          this.checkWinConditions();
        }
      }
    }
  }

  broadcastVoteCounts() {
    const counts = {};
    let skipCount = 0;
    for (const targetId of this.trialVotes.values()) {
      if (targetId === 'skip') {
        skipCount++;
      } else {
        counts[targetId] = (counts[targetId] || 0) + 1;
      }
    }

    this.room.broadcastEvent({
      type: 'vampire_vote_counts_update',
      counts,
      skipCount,
      totalVotesCast: this.trialVotes.size
    });
  }

  resolveNight() {
    const deaths = [];

    // Tally Vampire Votes
    const voteTally = {};
    for (const targetId of this.nightActions.vampireVotes.values()) {
      if (targetId && targetId !== 'skip') {
        voteTally[targetId] = (voteTally[targetId] || 0) + 1;
      }
    }

    let maxVotes = 0;
    let vampireTargetId = null;
    for (const [tId, count] of Object.entries(voteTally)) {
      if (count > maxVotes) {
        maxVotes = count;
        vampireTargetId = tId;
      }
    }

    const doctorTargetId = this.nightActions.doctorTarget;
    let wasHealed = false;

    if (vampireTargetId) {
      if (doctorTargetId && doctorTargetId === vampireTargetId) {
        wasHealed = true;
      } else {
        const victim = this.room.players.get(vampireTargetId);
        if (victim && victim.isAlive) {
          victim.isAlive = false;
          deaths.push({
            id: victim.id,
            name: victim.name,
            avatar: victim.avatar,
            role: victim.role
          });

          // If victim is hunter, prompt for revenge shot
          if (victim.role === 'hunter') {
            this.grantHunterRevenge(victim);
            this.room.sendToPlayer(victim.id, {
              type: 'vampire_hunter_prompt',
              message: 'Avlandın! Son bir kişiyi yanında götürmek için hedef seç.'
            });
          }
        }
      }
    }

    this.lastNightReport = {
      deaths,
      healed: wasHealed,
      message: wasHealed ? 'Doktor bu gece bir köylüyü kurtardı!' : (deaths.length > 0 ? `${deaths[0].name} katledildi!` : 'Bu gece sakin geçti.')
    };

    this.startDayPhase();
  }

  resolveTrial() {
    const counts = {};
    let skipCount = 0;

    for (const targetId of this.trialVotes.values()) {
      if (targetId === 'skip') {
        skipCount++;
      } else {
        counts[targetId] = (counts[targetId] || 0) + 1;
      }
    }

    let maxVotes = 0;
    let targetId = null;
    let isTie = false;

    for (const [id, count] of Object.entries(counts)) {
      if (count > maxVotes) {
        maxVotes = count;
        targetId = id;
        isTie = false;
      } else if (count === maxVotes) {
        isTie = true;
      }
    }

    const alivePlayersCount = Array.from(this.room.players.values()).filter(p => !p.isSpectator && p.isAlive).length;
    const requiredVotes = Math.floor(alivePlayersCount / 2) + 1;

    let executedPlayer = null;

    if (!isTie && targetId && maxVotes >= requiredVotes && maxVotes > skipCount) {
      executedPlayer = this.room.players.get(targetId);
      if (executedPlayer && executedPlayer.isAlive) {
        executedPlayer.isAlive = false;

        // If hunter is executed, allow revenge shot
        if (executedPlayer.role === 'hunter') {
          this.grantHunterRevenge(executedPlayer);
          this.room.sendToPlayer(executedPlayer.id, {
            type: 'vampire_hunter_prompt',
            message: 'İdam edildin! Son kurşununla birini vurmak için hedef seç.'
          });
        }
      }
    }

    this.lastTrialReport = {
      executed: executedPlayer ? { id: executedPlayer.id, name: executedPlayer.name, avatar: executedPlayer.avatar } : null,
      role: executedPlayer ? executedPlayer.role : null,
      isTie,
      isSkip: !executedPlayer && skipCount >= maxVotes
    };

    this.room.broadcastEvent({
      type: 'vampire_trial_result',
      report: this.lastTrialReport
    });

    if (executedPlayer) {
      this.room.broadcastChat('Mahkeme', `⚖️ Mahkeme Kararı: ${executedPlayer.name} idam edildi! (Rolü: ${executedPlayer.role.toUpperCase()})`, '#ef4444');
    } else {
      this.room.broadcastChat('Mahkeme', `⚖️ Yeterli çoğunluk sağlanamadı veya pas geçildi. Kimse idam edilmedi.`, '#38bdf8');
    }

    if (!this.checkWinConditions()) {
      this.gameState = 'trial_result';
      this.dayCount++;
      this.schedule(() => {
        if (this.gameState !== 'game_over') {
          this.startNightPhase();
        }
      }, executedPlayer?.hunterRevengeAvailable ? 15500 : 4000);
    }
  }

  grantHunterRevenge(player) {
    player.hunterRevengeAvailable = true;
    this.schedule(() => {
      player.hunterRevengeAvailable = false;
      this.checkWinConditions();
    }, 15000);
  }

  checkWinConditions() {
    if (this.gameState === 'waiting' || this.gameState === 'game_over') return false;
    // The last shot can change the winner. A disconnected or idle hunter cannot stall indefinitely.
    if ([...this.room.players.values()].some(p => p.hunterRevengeAvailable)) return false;

    const alivePlayers = Array.from(this.room.players.values()).filter(p => !p.isSpectator && p.isAlive);
    const aliveVampires = alivePlayers.filter(p => p.role === 'vampire');
    const aliveInnocents = alivePlayers.filter(p => p.role !== 'vampire');

    // 1. All Vampires Eliminated -> Villagers Win
    if (aliveVampires.length === 0) {
      this.winner = 'villagers';
      this.gameState = 'game_over';
      this.room.broadcastEvent({
        type: 'game_over',
        winner: 'villagers',
        message: '🎉 KÖYLÜLER KAZANDI! Tüm Vampirler Ortadan Kaldırıldı!'
      });
      this.room.broadcastChat('Sistem', '🏆 KÖYLÜLER KAZANDI! Köy karanlıktan kurtuldu.', '#10b981');
      this.schedule(() => this.resetGame(), 6000);
      return true;
    }

    // 2. Vampires Equal or Outnumber Innocents -> Vampires Win
    if (aliveVampires.length >= aliveInnocents.length) {
      this.winner = 'vampires';
      this.gameState = 'game_over';
      this.room.broadcastEvent({
        type: 'game_over',
        winner: 'vampires',
        message: '🩸 VAMPİRLER KAZANDI! Köy Tamamen Karanlığa Gömüldü!'
      });
      this.room.broadcastChat('Sistem', '🏆 VAMPİRLER KAZANDI! Köyün kontrolü vampirlerin eline geçti.', '#ef4444');
      this.schedule(() => this.resetGame(), 6000);
      return true;
    }

    return false;
  }

  resetGame() {
    this.cancelTimers();
    this.phaseTimer = 0;
    this.gameState = 'waiting';
    this.winner = null;
    this.dayCount = 1;
    this.resetRoundState();

    const players = Array.from(this.room.players.values());
    players.forEach(p => {
      p.isSpectator = false;
      p.hunterRevengeAvailable = false;
      p.isAlive = true;
      p.role = 'villager';
      p.hasActed = false;
      this.spawnAtTownSquare(p);
    });

    this.room.broadcastChat('Sistem', '🏰 Lobi moduna dönüldü. Köy meydanında dolaşabilir veya yeni oyunu başlatabilirsiniz.', '#38bdf8');
  }

  update(dt, secTimerTick) {
    if (this.phaseTimer > 0) {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.phaseTimer = 0;
        this.handlePhaseTimeout();
      }
    }

    // Process player roaming movement & collision
    const playerList = Array.from(this.room.players.values());
    for (const player of playerList) {
      if (player.isSpectator || !player.isAlive) continue;

      this.handlePlayerInput(player);

      player.pos.x += player.vel.x * dt * 60;
      player.pos.y += player.vel.y * dt * 60;
      player.vel.x *= player.damping;
      player.vel.y *= player.damping;

      for (const wall of this.walls) {
        resolveSegmentCollision(player, wall.p1, wall.p2);
      }
    }

    for (let i = 0; i < playerList.length; i++) {
      const p1 = playerList[i];
      if (p1.isSpectator || !p1.isAlive) continue;

      for (let j = i + 1; j < playerList.length; j++) {
        const p2 = playerList[j];
        if (p2.isSpectator || !p2.isAlive) continue;

        resolveCircleCollision(p1, p2);
      }
    }
  }

  handlePhaseTimeout() {
    if (this.gameState === 'role_reveal') {
      this.startNightPhase();
    } else if (this.gameState === 'night') {
      this.resolveNight();
    } else if (this.gameState === 'day') {
      this.startVotingPhase();
    } else if (this.gameState === 'voting') {
      this.resolveTrial();
    }
  }

  handlePlayerInput(player) {
    if (!player.input || !player.isAlive || player.isSpectator) return;
    const accel = 1.05 * (this.room.speedMultiplier || 1.0);
    const maxSpeed = 4.5 * (this.room.speedMultiplier || 1.0);

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
    const alivePlayers = playerList.filter(p => !p.isSpectator && p.isAlive);
    const aliveVampires = alivePlayers.filter(p => p.role === 'vampire').length;
    const aliveInnocents = alivePlayers.filter(p => p.role !== 'vampire').length;

    return {
      mode: 'vampire',
      width: this.width,
      height: this.height,
      gameState: this.gameState,
      dayCount: this.dayCount,
      phaseTimer: Math.ceil(this.phaseTimer),
      aliveVampires,
      aliveInnocents,
      totalAlive: alivePlayers.length,
      landmarks: this.landmarks,
      walls: this.walls.map(w => ({ p1: { x: w.p1.x, y: w.p1.y }, p2: { x: w.p2.x, y: w.p2.y } })),
      lastNightReport: this.lastNightReport,
      lastTrialReport: this.lastTrialReport,
      playersMeta: playerList.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        isAlive: p.isAlive,
        isSpectator: p.isSpectator,
        role: p.role,
        hunterRevengeAvailable: !!p.hunterRevengeAvailable,
        hasActed: p.hasActed
      }))
    };
  }
}
