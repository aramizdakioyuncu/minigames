import { Vec2, PhysicsBody, resolveCircleCollision, resolveSegmentCollision } from '../physics.js';
import { configDb } from '../../db/configDb.js';

export class PuckMode {
  constructor(room) {
    this.room = room;
    this.type = 'puck';
    this.name = 'Disk Futbolu Arena';

    // Pitch Dimensions
    this.width = 1200;
    this.height = 650;
    this.goalDepth = 90;
    this.goalHeight = 160;

    this.scoreRed = 0;
    this.scoreBlue = 0;
    this.timeRemaining = 180; // 3 minutes match
    this.state = 'playing'; // 'playing', 'goal_celebration', 'game_over'
    this.celebrationTimer = 0;
    this.lastScorer = null;
    this.lastScorerTeam = null;

    this.initMap();
    this.initBall();
  }

  initMap() {
    const hw = this.width / 2;
    const hh = this.height / 2;
    const gh = this.goalHeight / 2;
    const gd = this.goalDepth;

    // Static Goal Posts (discs for smooth bounce)
    this.posts = [
      // Left Goal Posts (Red goal)
      new PhysicsBody({ id: 'post_tl', x: -hw, y: -gh, radius: 8, mass: 0, isStatic: true, type: 'post' }),
      new PhysicsBody({ id: 'post_bl', x: -hw, y: gh, radius: 8, mass: 0, isStatic: true, type: 'post' }),
      // Right Goal Posts (Blue goal)
      new PhysicsBody({ id: 'post_tr', x: hw, y: -gh, radius: 8, mass: 0, isStatic: true, type: 'post' }),
      new PhysicsBody({ id: 'post_br', x: hw, y: gh, radius: 8, mass: 0, isStatic: true, type: 'post' })
    ];

    // Pitch Border Segments
    this.segments = [
      // Top pitch border
      { p1: new Vec2(-hw, -hh), p2: new Vec2(hw, -hh) },
      // Bottom pitch border
      { p1: new Vec2(-hw, hh), p2: new Vec2(hw, hh) },
      // Left border (above goal)
      { p1: new Vec2(-hw, -hh), p2: new Vec2(-hw, -gh) },
      // Left border (below goal)
      { p1: new Vec2(-hw, gh), p2: new Vec2(-hw, hh) },
      // Right border (above goal)
      { p1: new Vec2(hw, -hh), p2: new Vec2(hw, -gh) },
      // Right border (below goal)
      { p1: new Vec2(hw, gh), p2: new Vec2(hw, hh) },

      // Left Goal Net Segments
      { p1: new Vec2(-hw, -gh), p2: new Vec2(-hw - gd, -gh) },
      { p1: new Vec2(-hw - gd, -gh), p2: new Vec2(-hw - gd, gh) },
      { p1: new Vec2(-hw - gd, gh), p2: new Vec2(-hw, gh) },

      // Right Goal Net Segments
      { p1: new Vec2(hw, -gh), p2: new Vec2(hw + gd, -gh) },
      { p1: new Vec2(hw + gd, -gh), p2: new Vec2(hw + gd, gh) },
      { p1: new Vec2(hw + gd, gh), p2: new Vec2(hw, gh) }
    ];
  }

  initBall() {
    this.ball = new PhysicsBody({
      id: 'ball',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 12,
      mass: 0.8,
      damping: configDb.get('puck_ball_damping'),
      restitution: configDb.get('puck_ball_restitution'),
      type: 'ball'
    });
  }

  onPlayerJoin(player) {
    // Auto-balance teams: 'red' or 'blue'
    const redCount = this.room.getPlayersByTeam('red').length;
    const blueCount = this.room.getPlayersByTeam('blue').length;
    player.team = redCount <= blueCount ? 'red' : 'blue';
    player.radius = 18;
    player.mass = 2.0;
    player.damping = configDb.get('puck_player_damping');
    player.restitution = 0.5;
    player.kickRange = configDb.get('puck_kick_range');
    player.kickPower = configDb.get('puck_kick_power');
    player.isKicking = false;
    player.lastKickTime = 0;

    this.spawnPlayer(player);
  }

  spawnPlayer(player) {
    const hw = this.width / 2;
    const offsetX = player.team === 'red' ? -hw * 0.45 : hw * 0.45;
    const randY = (Math.random() - 0.5) * 200;
    player.pos.set(offsetX, randY);
    player.vel.set(0, 0);
  }

  resetPositions() {
    this.ball.pos.set(0, 0);
    this.ball.vel.set(0, 0);

    for (const player of this.room.players.values()) {
      this.spawnPlayer(player);
    }
  }

  update(dt, secTimerTick) {
    if (secTimerTick && this.state === 'playing') {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
      } else {
        this.state = 'game_over';
        this.room.broadcastEvent({
          type: 'game_over',
          winner: this.scoreRed > this.scoreBlue ? 'red' : (this.scoreBlue > this.scoreRed ? 'blue' : 'draw'),
          scoreRed: this.scoreRed,
          scoreBlue: this.scoreBlue
        });
      }
    }

    if (this.state === 'goal_celebration') {
      this.celebrationTimer -= dt;
      if (this.celebrationTimer <= 0) {
        this.state = 'playing';
        this.resetPositions();
        this.room.broadcastEvent({ type: 'kickoff' });
      }
    }

    // 4x Sub-stepping for Continuous Collision Detection (prevents high speed tunneling)
    const subSteps = 4;
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      this.physicsSubStep(subDt);
    }

    // Goal Detection
    if (this.state === 'playing') {
      this.checkGoal();
    }
  }

  physicsSubStep(dt) {
    const now = Date.now();

    // 1. Update Ball Physics
    this.ball.update(dt);

    // Collide Ball with pitch boundaries
    for (const seg of this.segments) {
      resolveSegmentCollision(this.ball, seg.p1, seg.p2, 0.85);
    }
    // Collide Ball with goal posts
    for (const post of this.posts) {
      resolveCircleCollision(this.ball, post);
    }

    // Strict Pitch Boundary Containment (Prevents ball tunneling)
    this.enforcePitchContainment(this.ball);

    // 2. Update Players, Skills & Collisions
    const playerList = Array.from(this.room.players.values());

    for (let i = 0; i < playerList.length; i++) {
      const p1 = playerList[i];

      // Spectators in Tribune
      if (p1.isSpectator) {
        this.applyPlayerMovement(p1, dt);
        p1.update(dt);
        this.enforceSpectatorContainment(p1);
        continue;
      }

      // Active Match Players
      this.applyPlayerMovement(p1, dt);
      p1.update(dt);

      // Collide player with field segments & posts
      for (const seg of this.segments) {
        resolveSegmentCollision(p1, seg.p1, seg.p2, 0.5);
      }
      for (const post of this.posts) {
        resolveCircleCollision(p1, post);
      }
      this.enforcePitchContainment(p1);

      // --- BALL HOLD / DRIBBLE SKILL (2sn Tutma, 5sn Bekleme) ---
      const distToBall = p1.pos.dist(this.ball.pos);
      const inBallReach = distToBall <= p1.radius + this.ball.radius + 20;

      if (p1.input && p1.input.hold && !p1.isHoldingBall) {
        const canHold = (p1.lastHoldEndTime === 0 || (now - p1.lastHoldEndTime >= (p1.holdCooldownMs || 5000)));
        if (canHold && inBallReach) {
          p1.isHoldingBall = true;
          p1.holdStartTime = now;
          this.room.broadcastEvent({
            type: 'sfx_hold_start',
            playerId: p1.id,
            x: p1.pos.x,
            y: p1.pos.y
          });
        }
      }

      if (p1.isHoldingBall) {
        const holdDuration = now - p1.holdStartTime;
        const kickPressed = p1.input && p1.input.kick;

        if (holdDuration >= (p1.maxHoldDurationMs || 2000) || kickPressed) {
          // Release / Kick out
          p1.isHoldingBall = false;
          p1.lastHoldEndTime = now;

          let dirX = p1.vel.x;
          let dirY = p1.vel.y;
          if (Math.hypot(dirX, dirY) < 0.1) {
            dirX = p1.team === 'red' ? 1 : -1;
            dirY = 0;
          }
          const len = Math.hypot(dirX, dirY) || 1;
          const releasePower = kickPressed ? (p1.kickPower * 1.3) : 10;

          this.ball.vel.set((dirX / len) * releasePower, (dirY / len) * releasePower);
          this.room.broadcastEvent({
            type: 'sfx_hold_release',
            playerId: p1.id,
            x: this.ball.pos.x,
            y: this.ball.pos.y
          });
        } else {
          // Glued to front of player
          let dirX = p1.vel.x;
          let dirY = p1.vel.y;
          if (Math.hypot(dirX, dirY) < 0.2) {
            dirX = (this.ball.pos.x - p1.pos.x);
            dirY = (this.ball.pos.y - p1.pos.y);
          }
          const len = Math.hypot(dirX, dirY) || 1;
          const targetDist = p1.radius + this.ball.radius + 2;

          this.ball.pos.set(
            p1.pos.x + (dirX / len) * targetDist,
            p1.pos.y + (dirY / len) * targetDist
          );
          this.ball.vel.set(p1.vel.x, p1.vel.y);
          p1.lastBallTouch = now;
          this.lastScorer = p1.name;
          this.lastScorerTeam = p1.team;
        }
      }

      // --- KICK & TACKLE MECHANIC ---
      if (p1.input && p1.input.kick && (now - p1.lastKickTime > 220) && !p1.isHoldingBall) {
        p1.isKicking = true;
        p1.lastKickTime = now;

        if (inBallReach) {
          // Kick the ball
          const dx = this.ball.pos.x - p1.pos.x;
          const dy = this.ball.pos.y - p1.pos.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = dx / len;
          const ny = dy / len;

          const kickPower = p1.kickPower * (this.room.speedMultiplier || 1.0);
          this.ball.vel.x += nx * kickPower;
          this.ball.vel.y += ny * kickPower;

          this.room.broadcastEvent({
            type: 'sfx_kick',
            x: this.ball.pos.x,
            y: this.ball.pos.y,
            playerId: p1.id
          });
        } else if (this.room.tackleEnabled) {
          // Tackle nearby opponent player if ball is not directly here
          for (const enemy of playerList) {
            if (enemy.id !== p1.id && !enemy.isSpectator && enemy.team !== p1.team) {
              const enemyDist = p1.pos.dist(enemy.pos);
              if (enemyDist <= p1.radius + enemy.radius + 22) {
                const edx = enemy.pos.x - p1.pos.x;
                const edy = enemy.pos.y - p1.pos.y;
                const elen = Math.hypot(edx, edy) || 1;

                enemy.applyImpulse((edx / elen) * 16, (edy / elen) * 16);

                // Break enemy ball hold if tackled!
                if (enemy.isHoldingBall) {
                  enemy.isHoldingBall = false;
                  enemy.lastHoldEndTime = now;
                }

                this.room.broadcastEvent({
                  type: 'sfx_tackle',
                  x: enemy.pos.x,
                  y: enemy.pos.y,
                  playerId: enemy.id
                });
              }
            }
          }
        }
      } else {
        p1.isKicking = false;
      }

      // Collide player with Ball
      if (!p1.isHoldingBall) {
        const collidedWithBall = resolveCircleCollision(p1, this.ball);
        if (collidedWithBall) {
          p1.lastBallTouch = now;
          this.lastScorer = p1.name;
          this.lastScorerTeam = p1.team;
        }
      }

      // Collide player with other players
      for (let j = i + 1; j < playerList.length; j++) {
        const p2 = playerList[j];
        if (p2.isSpectator) continue;
        resolveCircleCollision(p1, p2);
      }
    }
  }

  enforceSpectatorContainment(player) {
    const hw = this.width / 2 + 50;
    const hh = this.height / 2 + 100;

    // Keep spectators in spectator walkways/stands outside pitch
    if (player.pos.x < -hw) player.pos.x = -hw;
    if (player.pos.x > hw) player.pos.x = hw;
    if (player.pos.y < -hh) player.pos.y = -hh;
    if (player.pos.y > hh) player.pos.y = hh;

    // Prevent entering pitch area
    const pitchHw = this.width / 2;
    const pitchHh = this.height / 2;
    if (Math.abs(player.pos.x) < pitchHw && Math.abs(player.pos.y) < pitchHh) {
      if (player.pos.y < 0) {
        player.pos.y = -pitchHh - player.radius - 2;
      } else {
        player.pos.y = pitchHh + player.radius + 2;
      }
    }
  }

  enforcePitchContainment(body) {
    const hw = this.width / 2;
    const hh = this.height / 2;
    const gh = this.goalHeight / 2;
    const gd = this.goalDepth;
    const r = body.radius;

    // Top / Bottom Wall Clamping & Bounce
    if (body.pos.y < -hh + r) {
      body.pos.y = -hh + r;
      if (body.vel.y < 0) body.vel.y = -body.vel.y * 0.85;
    }
    if (body.pos.y > hh - r) {
      body.pos.y = hh - r;
      if (body.vel.y > 0) body.vel.y = -body.vel.y * 0.85;
    }

    // Left Side (Wall vs Goal Net)
    if (body.pos.x < -hw + r) {
      // If outside goal opening height
      if (Math.abs(body.pos.y) >= gh - r * 0.5) {
        body.pos.x = -hw + r;
        if (body.vel.x < 0) body.vel.x = -body.vel.x * 0.85;
      } else {
        // Inside left goal net
        if (body.pos.x < -hw - gd + r) {
          body.pos.x = -hw - gd + r;
          if (body.vel.x < 0) body.vel.x = -body.vel.x * 0.5;
        }
        if (body.pos.y < -gh + r) {
          body.pos.y = -gh + r;
          if (body.vel.y < 0) body.vel.y = -body.vel.y * 0.5;
        }
        if (body.pos.y > gh - r) {
          body.pos.y = gh - r;
          if (body.vel.y > 0) body.vel.y = -body.vel.y * 0.5;
        }
      }
    }

    // Right Side (Wall vs Goal Net)
    if (body.pos.x > hw - r) {
      // If outside goal opening height
      if (Math.abs(body.pos.y) >= gh - r * 0.5) {
        body.pos.x = hw - r;
        if (body.vel.x > 0) body.vel.x = -body.vel.x * 0.85;
      } else {
        // Inside right goal net
        if (body.pos.x > hw + gd - r) {
          body.pos.x = hw + gd - r;
          if (body.vel.x > 0) body.vel.x = -body.vel.x * 0.5;
        }
        if (body.pos.y < -gh + r) {
          body.pos.y = -gh + r;
          if (body.vel.y < 0) body.vel.y = -body.vel.y * 0.5;
        }
        if (body.pos.y > gh - r) {
          body.pos.y = gh - r;
          if (body.vel.y > 0) body.vel.y = -body.vel.y * 0.5;
        }
      }
    }
  }

  applyPlayerMovement(player, dt) {
    if (!player.input) return;
    const accel = configDb.get('puck_player_accel') * (this.room.speedMultiplier || 1.0);
    const maxSpeed = configDb.get('puck_player_max_speed') * (this.room.speedMultiplier || 1.0);

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

    // Server-Side Anti-Cheat Velocity Cap
    const currentSpeed = Math.hypot(player.vel.x, player.vel.y);
    if (currentSpeed > maxSpeed) {
      player.vel.x = (player.vel.x / currentSpeed) * maxSpeed;
      player.vel.y = (player.vel.y / currentSpeed) * maxSpeed;
    }
  }

  checkGoal() {
    const hw = this.width / 2;
    const gh = this.goalHeight / 2;

    // Left Goal (Scored by Blue team)
    if (this.ball.pos.x < -hw - this.ball.radius && Math.abs(this.ball.pos.y) < gh) {
      this.scoreBlue++;
      this.state = 'goal_celebration';
      this.celebrationTimer = 3.0;
      this.room.broadcastEvent({
        type: 'goal',
        team: 'blue',
        scorer: this.lastScorer || 'Blue Team',
        scoreRed: this.scoreRed,
        scoreBlue: this.scoreBlue
      });
    }
    // Right Goal (Scored by Red team)
    else if (this.ball.pos.x > hw + this.ball.radius && Math.abs(this.ball.pos.y) < gh) {
      this.scoreRed++;
      this.state = 'goal_celebration';
      this.celebrationTimer = 3.0;
      this.room.broadcastEvent({
        type: 'goal',
        team: 'red',
        scorer: this.lastScorer || 'Red Team',
        scoreRed: this.scoreRed,
        scoreBlue: this.scoreBlue
      });
    }
  }

  getState() {
    return {
      mode: 'puck',
      width: this.width,
      height: this.height,
      goalHeight: this.goalHeight,
      goalDepth: this.goalDepth,
      scoreRed: this.scoreRed,
      scoreBlue: this.scoreBlue,
      timeRemaining: this.timeRemaining,
      state: this.state,
      ball: {
        x: Math.round(this.ball.pos.x * 10) / 10,
        y: Math.round(this.ball.pos.y * 10) / 10,
        vx: Math.round(this.ball.vel.x * 10) / 10,
        vy: Math.round(this.ball.vel.y * 10) / 10,
        r: this.ball.radius
      },
      posts: this.posts.map(p => ({ x: p.pos.x, y: p.pos.y, r: p.radius }))
    };
  }
}
