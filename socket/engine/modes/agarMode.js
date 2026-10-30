import { Vec2, resolveCircleCollision, resolveSegmentCollision } from '../physics.js';
import { configDb } from '../../db/configDb.js';
import { BaseMode } from './BaseMode.js';

export class AgarMode extends BaseMode {
  constructor(room) {
    super(room);
    this.type = 'agar';
    this.name = 'Agar Bump & Feed';

    this.width = 1800;
    this.height = 1200;
    this.maxPellets = 140;
    this.pellets = [];
    this.ejectedPellets = []; // Array of PhysicsBody / Ejected Mass
    this.lastSplitTimes = new Map(); // playerId -> timestamp
    this.lastFeedTimes = new Map();  // playerId -> timestamp

    this.initMap();
    this.spawnPellets(this.maxPellets);
  }

  initMap() {
    const hw = this.width / 2;
    const hh = this.height / 2;

    this.segments = [
      { p1: new Vec2(-hw, -hh), p2: new Vec2(hw, -hh) },
      { p1: new Vec2(-hw, hh), p2: new Vec2(hw, hh) },
      { p1: new Vec2(-hw, -hh), p2: new Vec2(-hw, hh) },
      { p1: new Vec2(hw, -hh), p2: new Vec2(hw, hh) }
    ];
  }

  spawnPellets(count) {
    const hw = (this.width / 2) - 40;
    const hh = (this.height / 2) - 40;
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];

    for (let i = 0; i < count; i++) {
      this.pellets.push({
        id: 'pellet_' + Math.random().toString(36).substring(2, 9),
        x: (Math.random() * 2 - 1) * hw,
        y: (Math.random() * 2 - 1) * hh,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: 6,
        value: 1
      });
    }
  }

  onPlayerJoin(player) {
    player.score = 15;
    player.damping = 0.92;
    player.restitution = 0.5;

    const hw = (this.width / 2) - 150;
    const hh = (this.height / 2) - 150;
    const sx = (Math.random() * 2 - 1) * hw;
    const sy = (Math.random() * 2 - 1) * hh;

    player.pos.set(sx, sy);
    player.vel.set(0, 0);

    // Multi-cell array
    player.cells = [
      {
        id: `${player.id}_c0`,
        pos: new Vec2(sx, sy),
        vel: new Vec2(0, 0),
        score: 15,
        radius: this.calcRadius(15),
        canMergeAt: 0
      }
    ];
    player.radius = player.cells[0].radius;
  }

  calcRadius(score) {
    return Math.min(130, 16 + Math.sqrt(Math.max(1, score)) * 4.2);
  }

  onPlayerLeave(player) {
    this.lastSplitTimes.delete(player.id);
    this.lastFeedTimes.delete(player.id);
  }

  handlePlayerInput(player) {
    if (!player.input || player.isSpectator) return;
    const now = Date.now();

    // 1. Eject Mass (Feed) -> 'hold' or 'feed'
    if (player.input.hold) {
      const lastFeed = this.lastFeedTimes.get(player.id) || 0;
      if (now - lastFeed > 130) {
        this.lastFeedTimes.set(player.id, now);
        this.ejectMass(player);
      }
    }

    // 2. Split (Divide) -> 'kick' or 'split'
    if (player.input.kick) {
      const lastSplit = this.lastSplitTimes.get(player.id) || 0;
      if (now - lastSplit > 450) {
        this.lastSplitTimes.set(player.id, now);
        this.splitPlayer(player);
      }
    }
  }

  ejectMass(player) {
    if (!player.cells || player.cells.length === 0) return;

    for (const cell of player.cells) {
      if (cell.score >= 18) {
        cell.score -= 3;
        cell.radius = this.calcRadius(cell.score);

        // Direction based on cell velocity or player input
        let dirX = cell.vel.x;
        let dirY = cell.vel.y;
        if (player.input) {
          if (player.input.left) dirX = -1;
          if (player.input.right) dirX = 1;
          if (player.input.up) dirY = -1;
          if (player.input.down) dirY = 1;
        }
        if (dirX === 0 && dirY === 0) dirX = 1;
        const len = Math.hypot(dirX, dirY) || 1;
        const normX = dirX / len;
        const normY = dirY / len;

        const spawnDist = cell.radius + 10;
        this.ejectedPellets.push({
          id: 'ej_' + Math.random().toString(36).substring(2, 9),
          pos: new Vec2(cell.pos.x + normX * spawnDist, cell.pos.y + normY * spawnDist),
          vel: new Vec2(normX * 16, normY * 16),
          color: player.color || '#3b82f6',
          radius: 7,
          value: 3,
          ownerId: player.id,
          createdAt: Date.now()
        });

        this.room.broadcastEvent({
          type: 'sfx_eject',
          x: cell.pos.x,
          y: cell.pos.y,
          playerId: player.id
        });
      }
    }
  }

  splitPlayer(player) {
    if (!player.cells) return;
    if (player.cells.length >= 8) return; // Max 8 cells

    const now = Date.now();
    const newCells = [];
    const splitEvents = [];

    for (const cell of player.cells) {
      if (cell.score >= 18 && (player.cells.length + newCells.length < 8)) {
        const halfScore = Math.floor(cell.score / 2);
        cell.score -= halfScore;
        cell.radius = this.calcRadius(cell.score);
        cell.canMergeAt = now + 9000; // 9 seconds to merge

        let dirX = cell.vel.x;
        let dirY = cell.vel.y;
        if (player.input) {
          if (player.input.left) dirX = -1;
          if (player.input.right) dirX = 1;
          if (player.input.up) dirY = -1;
          if (player.input.down) dirY = 1;
        }
        if (dirX === 0 && dirY === 0) dirX = 1;
        const len = Math.hypot(dirX, dirY) || 1;
        const normX = dirX / len;
        const normY = dirY / len;

        const childCell = {
          id: `${player.id}_c${Math.random().toString(36).substring(2, 6)}`,
          pos: new Vec2(cell.pos.x + normX * (cell.radius + 15), cell.pos.y + normY * (cell.radius + 15)),
          vel: new Vec2(normX * 24, normY * 24),
          score: halfScore,
          radius: this.calcRadius(halfScore),
          canMergeAt: now + 9000
          ,splitUntil: now + 200
        };

        newCells.push(childCell);
        splitEvents.push({
          parentCellId: cell.id,
          childCellId: childCell.id,
          originX: Math.round(cell.pos.x),
          originY: Math.round(cell.pos.y),
          targetX: Math.round(childCell.pos.x),
          targetY: Math.round(childCell.pos.y),
          dirX: Math.round(normX * 100) / 100,
          dirY: Math.round(normY * 100) / 100,
          radius: Math.round(childCell.radius)
        });
      }
    }

    if (newCells.length > 0) {
      player.cells.push(...newCells);
      for (const ev of splitEvents) {
        this.room.broadcastEvent({
          type: 'sfx_split',
          playerId: player.id,
          playerName: player.name,
          color: player.color || '#3b82f6',
          ...ev
        });
      }
    }
  }

  update(dt, secTimerTick) {
    const now = Date.now();
    this.ejectedPellets = this.ejectedPellets.filter(p => now - p.createdAt < 60000).slice(-1000);

    // 1. Maintain map pellets
    if (this.pellets.length < this.maxPellets) {
      this.spawnPellets(this.maxPellets - this.pellets.length);
    }

    // 2. Update Ejected Pellets (movement & damping)
    for (let i = this.ejectedPellets.length - 1; i >= 0; i--) {
      const ep = this.ejectedPellets[i];
      ep.pos.x += ep.vel.x * dt * 60;
      ep.pos.y += ep.vel.y * dt * 60;
      ep.vel.x *= 0.93;
      ep.vel.y *= 0.93;

      // Keep within map boundaries
      const hw = (this.width / 2) - ep.radius;
      const hh = (this.height / 2) - ep.radius;
      if (ep.pos.x < -hw) { ep.pos.x = -hw; ep.vel.x = -ep.vel.x * 0.5; }
      if (ep.pos.x > hw) { ep.pos.x = hw; ep.vel.x = -ep.vel.x * 0.5; }
      if (ep.pos.y < -hh) { ep.pos.y = -hh; ep.vel.y = -ep.vel.y * 0.5; }
      if (ep.pos.y > hh) { ep.pos.y = hh; ep.vel.y = -ep.vel.y * 0.5; }
    }

    const playerList = Array.from(this.room.players.values());

    // 3. Process Player Inputs & Cell Simulation
    for (const player of playerList) {
      if (player.isSpectator) continue;
      this.handlePlayerInput(player);

      if (!player.cells || player.cells.length === 0) {
        this.onPlayerJoin(player);
      }

      // Movement & friction per cell
      for (const cell of player.cells) {
        this.applyCellMovement(cell, player.input, dt);

        cell.pos.x += cell.vel.x * dt * 60;
        cell.pos.y += cell.vel.y * dt * 60;
        cell.vel.x *= player.damping;
        cell.vel.y *= player.damping;

        // Boundaries
        const hw = (this.width / 2) - cell.radius;
        const hh = (this.height / 2) - cell.radius;
        if (cell.pos.x < -hw) { cell.pos.x = -hw; cell.vel.x = 0; }
        if (cell.pos.x > hw) { cell.pos.x = hw; cell.vel.x = 0; }
        if (cell.pos.y < -hh) { cell.pos.y = -hh; cell.vel.y = 0; }
        if (cell.pos.y > hh) { cell.pos.y = hh; cell.vel.y = 0; }

        // Eat map pellets
        for (let k = this.pellets.length - 1; k >= 0; k--) {
          const pellet = this.pellets[k];
          const dist = Math.hypot(cell.pos.x - pellet.x, cell.pos.y - pellet.y);
          if (dist < cell.radius + pellet.radius) {
            cell.score += pellet.value;
            cell.radius = this.calcRadius(cell.score);
            this.pellets.splice(k, 1);

            this.room.broadcastEvent({
              type: 'sfx_pickup',
              x: pellet.x,
              y: pellet.y,
              playerId: player.id
            });
          }
        }

        // Eat ejected pellets
        for (let k = this.ejectedPellets.length - 1; k >= 0; k--) {
          const ep = this.ejectedPellets[k];
          const dist = Math.hypot(cell.pos.x - ep.pos.x, cell.pos.y - ep.pos.y);
          // Only eat after 400ms or if not owner
          if (dist < cell.radius + ep.radius && (now - ep.createdAt > 350 || ep.ownerId !== player.id)) {
            cell.score += ep.value;
            cell.radius = this.calcRadius(cell.score);
            this.ejectedPellets.splice(k, 1);

            this.room.broadcastEvent({
              type: 'sfx_pickup',
              x: ep.pos.x,
              y: ep.pos.y,
              playerId: player.id
            });
          }
        }
      }

      // Recombine / Push cells of the SAME player
      for (let i = 0; i < player.cells.length; i++) {
        for (let j = i + 1; j < player.cells.length; j++) {
          const c1 = player.cells[i];
          const c2 = player.cells[j];
          const dx = c2.pos.x - c1.pos.x;
          const dy = c2.pos.y - c1.pos.y;
          const dist = Math.hypot(dx, dy);
          const minDist = c1.radius + c2.radius;

          if (dist < minDist) {
            // Check if ready to merge
            if (now >= c1.canMergeAt && now >= c2.canMergeAt) {
              // Merge!
              const fromX = Math.round(c2.pos.x);
              const fromY = Math.round(c2.pos.y);
              const toX = Math.round(c1.pos.x);
              const toY = Math.round(c1.pos.y);
              const absorbedId = c2.id;
              const absorbedR = Math.round(c2.radius);
              const targetId = c1.id;

              c1.score += c2.score;
              c1.radius = this.calcRadius(c1.score);
              player.cells.splice(j, 1);
              j--;

              this.room.broadcastEvent({
                type: 'sfx_merge',
                playerId: player.id,
                playerName: player.name,
                color: player.color || '#3b82f6',
                targetCellId: targetId,
                absorbedCellId: absorbedId,
                fromX,
                fromY,
                toX,
                toY,
                absorbedRadius: absorbedR,
                targetRadius: Math.round(c1.radius)
              });
            } else {
              // Elastic Push apart
              const overlap = minDist - dist;
              const nx = (dx / (dist || 1)) * overlap * 0.5;
              const ny = (dy / (dist || 1)) * overlap * 0.5;
              c1.pos.x -= nx;
              c1.pos.y -= ny;
              c2.pos.x += nx;
              c2.pos.y += ny;
            }
          }
        }
      }

      // Update player summary pos and total score
      let totalScore = 0;
      let primaryCell = player.cells[0];
      for (const c of player.cells) {
        totalScore += c.score;
        if (!primaryCell || c.score > primaryCell.score) {
          primaryCell = c;
        }
      }
      player.score = totalScore;
      if (primaryCell) {
        player.pos.set(primaryCell.pos.x, primaryCell.pos.y);
        player.vel.set(primaryCell.vel.x, primaryCell.vel.y);
        player.radius = primaryCell.radius;
      }
    }

    // 4. Inter-Player Cell Collisions & Swallowing
    for (let pIdx1 = 0; pIdx1 < playerList.length; pIdx1++) {
      const p1 = playerList[pIdx1];
      if (p1.isSpectator || !p1.cells) continue;

      for (let pIdx2 = pIdx1 + 1; pIdx2 < playerList.length; pIdx2++) {
        const p2 = playerList[pIdx2];
        if (p2.isSpectator || !p2.cells) continue;

        for (let i = p1.cells.length - 1; i >= 0; i--) {
          const c1 = p1.cells[i];
          if (!c1) continue;

          for (let j = p2.cells.length - 1; j >= 0; j--) {
            const c2 = p2.cells[j];
            if (!c2) continue;

            const dx = c2.pos.x - c1.pos.x;
            const dy = c2.pos.y - c1.pos.y;
            const dist = Math.hypot(dx, dy);

            // Swallowing condition: Size difference > 15% and distance inside
            if (c1.radius > c2.radius * 1.15 && dist < c1.radius - c2.radius * 0.3) {
              // C1 eats C2
              const fromX = Math.round(c2.pos.x);
              const fromY = Math.round(c2.pos.y);
              const toX = Math.round(c1.pos.x);
              const toY = Math.round(c1.pos.y);
              const preyR = Math.round(c2.radius);
              const preyColor = p2.color || '#ef4444';

              c1.score += c2.score;
              c1.radius = this.calcRadius(c1.score);
              p2.cells.splice(j, 1);

              this.room.broadcastEvent({
                type: 'sfx_eat_player',
                eater: p1.name,
                prey: p2.name,
                color: p1.color || '#3b82f6',
                preyColor,
                targetCellId: c1.id,
                fromX,
                fromY,
                toX,
                toY,
                absorbedRadius: preyR,
                targetRadius: Math.round(c1.radius),
                x: c1.pos.x,
                y: c1.pos.y
              });
            } else if (c2.radius > c1.radius * 1.15 && dist < c2.radius - c1.radius * 0.3) {
              // C2 eats C1
              const fromX = Math.round(c1.pos.x);
              const fromY = Math.round(c1.pos.y);
              const toX = Math.round(c2.pos.x);
              const toY = Math.round(c2.pos.y);
              const preyR = Math.round(c1.radius);
              const preyColor = p1.color || '#ef4444';

              c2.score += c1.score;
              c2.radius = this.calcRadius(c2.score);
              p1.cells.splice(i, 1);

              this.room.broadcastEvent({
                type: 'sfx_eat_player',
                eater: p2.name,
                prey: p1.name,
                color: p2.color || '#3b82f6',
                preyColor,
                targetCellId: c2.id,
                fromX,
                fromY,
                toX,
                toY,
                absorbedRadius: preyR,
                targetRadius: Math.round(c2.radius),
                x: c2.pos.x,
                y: c2.pos.y
              });
              break;
            } else if (dist < c1.radius + c2.radius) {
              // Equal or similar sizes: soft bounce
              const overlap = (c1.radius + c2.radius) - dist;
              const nx = (dx / (dist || 1)) * overlap * 0.3;
              const ny = (dy / (dist || 1)) * overlap * 0.3;
              c1.pos.x -= nx;
              c1.pos.y -= ny;
              c2.pos.x += nx;
              c2.pos.y += ny;
            }
          }
        }
      }
    }
  }

  applyCellMovement(cell, input, dt) {
    if (!input) return;
    const baseAccel = configDb.get('agar_player_base_accel') || 0.95;
    const baseMaxSpeed = configDb.get('agar_player_max_speed') || 5.5;

    // Speed scales inversely with cell radius
    const speedRatio = Math.max(0.4, 1.3 - (cell.radius - 16) * 0.012);
    const accel = baseAccel * speedRatio * (this.room.speedMultiplier || 1.0) * dt * 60;
    const maxSpeed = baseMaxSpeed * speedRatio * (this.room.speedMultiplier || 1.0) * (Date.now() < cell.splitUntil ? 5 : 1);

    let ax = 0;
    let ay = 0;

    if (input.up) ay -= 1;
    if (input.down) ay += 1;
    if (input.left) ax -= 1;
    if (input.right) ax += 1;

    if (ax !== 0 && ay !== 0) {
      ax *= 0.7071;
      ay *= 0.7071;
    }

    cell.vel.x += ax * accel;
    cell.vel.y += ay * accel;

    const currentSpeed = Math.hypot(cell.vel.x, cell.vel.y);
    if (currentSpeed > maxSpeed) {
      cell.vel.x = (cell.vel.x / currentSpeed) * maxSpeed;
      cell.vel.y = (cell.vel.y / currentSpeed) * maxSpeed;
    }
  }

  getLeaderboard() {
    const playerList = Array.from(this.room.players.values());
    return playerList
      .filter(p => !p.isSpectator)
      .map(p => ({
        id: p.id,
        name: p.name || 'Oyuncu',
        avatar: p.avatar || '👤',
        color: p.color || '#3b82f6',
        score: Math.floor(p.score || 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  getState() {
    const playerList = Array.from(this.room.players.values());
    const allCells = [];

    for (const p of playerList) {
      if (p.isSpectator || !p.cells) continue;
      for (const c of p.cells) {
        allCells.push({
          id: c.id,
          playerId: p.id,
          name: p.name,
          avatar: p.avatar,
          color: p.color,
          x: Math.round(c.pos.x * 10) / 10,
          y: Math.round(c.pos.y * 10) / 10,
          vx: Math.round(c.vel.x * 10) / 10,
          vy: Math.round(c.vel.y * 10) / 10,
          r: Math.round(c.radius * 10) / 10,
          score: c.score
        });
      }
    }

    return {
      mode: 'agar',
      width: this.width,
      height: this.height,
      pellets: this.pellets.map(p => ({
        id: p.id,
        x: Math.round(p.x),
        y: Math.round(p.y),
        c: p.color,
        r: p.radius
      })),
      ejectedPellets: this.ejectedPellets.map(p => ({
        id: p.id,
        x: Math.round(p.pos.x),
        y: Math.round(p.pos.y),
        c: p.color,
        r: p.radius
      })),
      cells: allCells,
      leaderboard: this.getLeaderboard()
    };
  }
}

