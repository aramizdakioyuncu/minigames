import { Vec2, resolveCircleCollision } from '../physics.js';
import { configDb } from '../../db/configDb.js';

export class SumoMode {
  constructor(room) {
    this.room = room;
    this.type = 'sumo';
    this.name = 'Sumo Knockout Arena';

    this.initialRadius = 420;
    this.minRadius = 160;
    this.currentRadius = this.initialRadius;
    this.shrinkRate = 2.0; // Shrink pixels per second

    this.roundState = 'waiting'; // 'waiting', 'active', 'round_over'
    this.roundCountdown = 3;
    this.resetTimer = 0;
    this.winner = null;

    this.initRound();
  }

  initRound() {
    this.currentRadius = this.initialRadius;
    this.winner = null;

    const players = Array.from(this.room.players.values());
    const count = players.length;
    this.roundState = count >= 2 ? 'active' : 'waiting';
    const spawnDist = Math.min(180, this.currentRadius * 0.5);

    players.forEach((p, idx) => {
      p.isAlive = true;
      p.isSpectator = false;
      p.radius = 24;
      p.mass = 3.5;
      p.damping = 0.93;
      p.restitution = 0.85;
      p.dashCooldown = configDb.get('sumo_dash_cooldown_ms');
      p.lastDashTime = 0;

      const angle = count > 0 ? (idx / count) * Math.PI * 2 : 0;
      p.pos.set(Math.cos(angle) * spawnDist, Math.sin(angle) * spawnDist);
      p.vel.set(0, 0);
    });
  }

  onPlayerJoin(player) {
    player.isAlive = true;
    player.isSpectator = false;
    player.radius = 24;
    player.mass = 3.5;
    player.damping = 0.93;
    player.restitution = 0.85;
    player.dashCooldown = configDb.get('sumo_dash_cooldown_ms');
    player.lastDashTime = 0;

    const players = Array.from(this.room.players.values());
    if (players.length >= 2 && this.roundState === 'waiting') {
      this.initRound();
    } else {
      const randAngle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 100;
      player.pos.set(Math.cos(randAngle) * dist, Math.sin(randAngle) * dist);
      player.vel.set(0, 0);
    }
  }

  update(dt, secTimerTick) {
    const playerList = Array.from(this.room.players.values());
    const alivePlayers = playerList.filter(p => !p.isSpectator && p.isAlive);

    // Auto-start round if 2+ players and in waiting state
    if (playerList.filter(p => !p.isSpectator).length >= 2 && this.roundState === 'waiting') {
      this.initRound();
    }

    // Shrink ring only during active match
    if (this.roundState === 'active') {
      if (this.currentRadius > this.minRadius) {
        this.currentRadius = Math.max(this.minRadius, this.currentRadius - this.shrinkRate * dt);
      }
    } else if (this.roundState === 'waiting') {
      this.currentRadius = this.initialRadius;
    } else if (this.roundState === 'round_over') {
      this.resetTimer -= dt;
      if (this.resetTimer <= 0) {
        this.initRound();
      }
    }

    // Always simulate and move all alive players (even during warmup / waiting / active)
    for (let i = 0; i < playerList.length; i++) {
      const p1 = playerList[i];
      if (p1.isSpectator) continue;

      // Ensure player is flagged alive if in waiting/warmup mode
      if (this.roundState === 'waiting') {
        p1.isAlive = true;
      }

      if (!p1.isAlive) continue;

      // 1. Movement
      this.applyPlayerMovement(p1, dt);
      p1.update(dt);

      // 2. Dash Mechanic
      if (p1.input && p1.input.kick && (Date.now() - (p1.lastDashTime || 0) > (p1.dashCooldown || 1200))) {
        p1.lastDashTime = Date.now();
        let dx = (p1.input.right ? 1 : 0) - (p1.input.left ? 1 : 0);
        let dy = (p1.input.down ? 1 : 0) - (p1.input.up ? 1 : 0);
        if (dx === 0 && dy === 0) {
          dx = p1.vel.x;
          dy = p1.vel.y;
        }
        const len = Math.hypot(dx, dy) || 1;
        const dashSpeed = configDb.get('sumo_dash_power') || 20.0;
        p1.vel.x += (dx / len) * dashSpeed;
        p1.vel.y += (dy / len) * dashSpeed;

        this.room.broadcastEvent({
          type: 'sfx_dash',
          x: p1.pos.x,
          y: p1.pos.y,
          playerId: p1.id
        });
      }

      // 3. Ring Boundary & Elimination
      const distFromCenter = p1.pos.length();
      if (this.roundState === 'active') {
        if (distFromCenter > this.currentRadius + p1.radius * 0.5) {
          p1.isAlive = false;
          this.room.broadcastEvent({
            type: 'player_eliminated',
            playerId: p1.id,
            playerName: p1.name
          });
        }
      } else {
        // In waiting/warmup, softly contain player inside ring
        if (distFromCenter > this.initialRadius - p1.radius) {
          const normX = p1.pos.x / (distFromCenter || 1);
          const normY = p1.pos.y / (distFromCenter || 1);
          p1.pos.x = normX * (this.initialRadius - p1.radius);
          p1.pos.y = normY * (this.initialRadius - p1.radius);
          p1.vel.x *= -0.5;
          p1.vel.y *= -0.5;
        }
      }

      // 4. Elastic Collisions between players
      for (let j = i + 1; j < playerList.length; j++) {
        const p2 = playerList[j];
        if (p2.isSpectator || !p2.isAlive) continue;

        const collided = resolveCircleCollision(p1, p2);
        if (collided) {
          const bumpPower = Math.hypot(p1.vel.x - p2.vel.x, p1.vel.y - p2.vel.y);
          if (bumpPower > 5) {
            this.room.broadcastEvent({
              type: 'sfx_bump',
              x: (p1.pos.x + p2.pos.x) / 2,
              y: (p1.pos.y + p2.pos.y) / 2,
              power: bumpPower
            });
          }
        }
      }
    }

    // 5. Check Win Condition during active matches
    if (this.roundState === 'active') {
      const activeAlive = playerList.filter(p => !p.isSpectator && p.isAlive);
      const totalParticipants = playerList.filter(p => !p.isSpectator).length;

      if (totalParticipants >= 2 && activeAlive.length <= 1) {
        this.roundState = 'round_over';
        this.winner = activeAlive[0] ? activeAlive[0].name : 'Berabere';
        this.resetTimer = 3.5;
        this.room.broadcastEvent({
          type: 'round_winner',
          winner: this.winner
        });
      }
    }
  }

  applyPlayerMovement(player, dt) {
    if (!player.input) return;
    const accel = configDb.get('sumo_player_accel') * (this.room.speedMultiplier || 1.35);
    const maxSpeed = configDb.get('sumo_player_max_speed') * (this.room.speedMultiplier || 1.35);
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

    if (ax !== 0 && Math.sign(ax) !== Math.sign(player.vel.x) && Math.abs(player.vel.x) > 0.5) {
      player.vel.x *= 0.85;
    }
    if (ay !== 0 && Math.sign(ay) !== Math.sign(player.vel.y) && Math.abs(player.vel.y) > 0.5) {
      player.vel.y *= 0.85;
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
    return {
      mode: 'sumo',
      ringRadius: Math.round(this.currentRadius),
      maxRadius: this.initialRadius,
      roundState: this.roundState,
      winner: this.winner
    };
  }
}
