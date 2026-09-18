// High-Performance 60 FPS HTML5 Canvas Rendering Engine

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.camera = { x: 0, y: 0, zoom: 1.0 };
    this.particles = [];
    this.ballTrail = [];

    // Smooth Entity Interpolation Cache (id -> { x, y, angle, radius })
    this.entities = new Map();
    this.ballState = { x: 0, y: 0 };

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
  }

  // Camera smoothly tracks player
  updateCamera(targetX, targetY) {
    const lerpFactor = 0.08;
    this.camera.x += (targetX - this.camera.x) * lerpFactor;
    this.camera.y += (targetY - this.camera.y) * lerpFactor;
  }

  addKickSparks(x, y, color = '#38bdf8') {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        color,
        alpha: 1.0,
        decay: 0.04 + Math.random() * 0.03
      });
    }
  }

  addGoalCelebration(x, y) {
    const colors = ['#facc15', '#f43f5e', '#38bdf8', '#10b981', '#a855f7'];
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 10;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.015
      });
    }
  }

  render(gameState, myPlayerId) {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Clear Canvas
    ctx.fillStyle = '#070a13';
    ctx.fillRect(0, 0, this.width, this.height);

    if (!gameState) {
      ctx.restore();
      return;
    }

    // 1. Smooth Entity Updates using Velocity Extrapolation & Correction Blend
    let myPlayer = null;
    if (gameState.players) {
      for (const p of gameState.players) {
        let cached = this.entities.get(p.id);
        if (!cached) {
          cached = { x: p.x, y: p.y, vx: p.vx || 0, vy: p.vy || 0, r: p.r || 18 };
          this.entities.set(p.id, cached);
        } else {
          // Continuously advance position along velocity vector (prevents freeze between network ticks)
          const vx = p.vx !== undefined ? p.vx : 0;
          const vy = p.vy !== undefined ? p.vy : 0;
          cached.x += vx * 0.7;
          cached.y += vy * 0.7;

          // Smoothly blend towards latest authoritative server position
          cached.x += (p.x - cached.x) * 0.35;
          cached.y += (p.y - cached.y) * 0.35;
          cached.r = p.r || 18;
        }

        if (p.id === myPlayerId) {
          myPlayer = { ...p, x: cached.x, y: cached.y };
        }
      }
    }

    // 2. Smooth Ball Updates using Velocity Extrapolation & Correction Blend
    if (gameState.mode === 'puck' && gameState.modeState && gameState.modeState.ball) {
      const b = gameState.modeState.ball;
      if (this.ballState.x === 0 && this.ballState.y === 0) {
        this.ballState.x = b.x;
        this.ballState.y = b.y;
      } else {
        const bvx = b.vx !== undefined ? b.vx : 0;
        const bvy = b.vy !== undefined ? b.vy : 0;
        this.ballState.x += bvx * 0.7;
        this.ballState.y += bvy * 0.7;
        this.ballState.x += (b.x - this.ballState.x) * 0.4;
        this.ballState.y += (b.y - this.ballState.y) * 0.4;
      }
      this.ballState.r = b.r || 12;
    }

    // Camera follow smoothly
    if (myPlayer) {
      this.updateCamera(myPlayer.x, myPlayer.y);
    } else if (gameState.mode === 'puck' && gameState.modeState && gameState.modeState.ball) {
      this.updateCamera(this.ballState.x, this.ballState.y);
    }

    // Center world to camera
    const cx = this.width / 2;
    const cy = this.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Draw Map & Arena
    if (gameState.mode === 'puck') {
      this.renderPuckPitch(ctx, gameState.modeState);
    } else if (gameState.mode === 'sumo') {
      this.renderSumoRing(ctx, gameState.modeState);
    } else if (gameState.mode === 'agar') {
      this.renderAgarArena(ctx, gameState.modeState);
    } else if (gameState.mode === 'space') {
      this.renderSpaceShip(ctx, gameState.modeState);
    }

    // 2. Draw Particles
    this.renderParticles(ctx);

    // 3. Draw Interpolated Players / Agar Cells
    if (gameState.mode === 'agar' && gameState.modeState && gameState.modeState.cells) {
      for (const cell of gameState.modeState.cells) {
        const cached = this.entities.get(cell.id) || cell;
        const renderData = { ...cell, x: cached.x, y: cached.y };
        this.renderPlayer(ctx, renderData, cell.playerId === myPlayerId);
      }
    } else if (gameState.players) {
      for (const p of gameState.players) {
        if (!p.isSpectator && p.isAlive !== false) {
          const cached = this.entities.get(p.id) || p;
          const renderData = { ...p, x: cached.x, y: cached.y };
          this.renderPlayer(ctx, renderData, p.id === myPlayerId);
        }
      }
    }

    // 4. Draw Interpolated Ball if Puck Soccer Mode
    if (gameState.mode === 'puck' && gameState.modeState && gameState.modeState.ball) {
      this.renderBall(ctx, this.ballState);
    }

    ctx.restore();
    ctx.restore();
  }

  renderPuckPitch(ctx, modeState) {
    const w = modeState.width || 1200;
    const h = modeState.height || 650;
    const hw = w / 2;
    const hh = h / 2;
    const gh = (modeState.goalHeight || 160) / 2;
    const gd = modeState.goalDepth || 90;

    // Outer Stadium Concrete Floor & Spectator Tribune Area
    ctx.fillStyle = '#0a101d';
    ctx.fillRect(-hw - 100, -hh - 130, w + 200, h + 260);

    // Top Spectator Tribune (Tribün Alanı - Üst)
    ctx.fillStyle = '#111827';
    ctx.fillRect(-hw - 60, -hh - 110, w + 120, 85);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-hw - 60, -hh - 110, w + 120, 85);

    // Bottom Spectator Tribune (Tribün Alanı - Alt)
    ctx.fillStyle = '#111827';
    ctx.fillRect(-hw - 60, hh + 25, w + 120, 85);
    ctx.strokeRect(-hw - 60, hh + 25, w + 120, 85);

    // Tribune Label Markings
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('🏟️ İZLEYİCİ TRİBÜNÜ (SPECTATOR LOUNGE)', 0, -hh - 90);
    ctx.fillText('🏟️ YEDEK KULÜBESİ & TRİBÜN ALANI', 0, hh + 85);

    // Outer Pitch Turf Shadow
    ctx.fillStyle = '#0f291e';
    ctx.fillRect(-hw - 15, -hh - 15, w + 30, h + 30);

    // Pitch Grass Stripes
    const stripeCount = 12;
    const stripeW = w / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#143d2b' : '#113525';
      ctx.fillRect(-hw + i * stripeW, -hh, stripeW, h);
    }

    // Pitch Boundary Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.rect(-hw, -hh, w, h);
    ctx.stroke();

    // Center Line & Center Circle
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.lineTo(0, hh);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Goal Nets (Left / Red Goal)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.fillRect(-hw - gd, -gh, gd, gh * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-hw - gd, -gh, gd, gh * 2);

    // Goal Nets (Right / Blue Goal)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.fillRect(hw, -gh, gd, gh * 2);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeRect(hw, -gh, gd, gh * 2);

    // Goal Posts
    if (modeState.posts) {
      for (const post of modeState.posts) {
        ctx.beginPath();
        ctx.arc(post.x, post.y, post.r, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  renderSumoRing(ctx, modeState) {
    const ringRadius = modeState.ringRadius || 400;

    // Void / Outer Danger Zone
    ctx.fillStyle = '#1e111d';
    ctx.fillRect(-1000, -1000, 2000, 2000);

    // Outer Danger Glow Ring
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius + 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 14;
    ctx.stroke();

    // Sumo Platform
    const grad = ctx.createRadialGradient(0, 0, 20, 0, 0, ringRadius);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#0f172a');

    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Ring Border
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Center Markings
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  renderAgarArena(ctx, modeState) {
    const w = modeState.width || 1800;
    const h = modeState.height || 1200;
    const hw = w / 2;
    const hh = h / 2;

    // Arena Floor
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(-hw, -hh, w, h);

    // Subtle Grid Pattern
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = -hw; x <= hw; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, -hh);
      ctx.lineTo(x, hh);
      ctx.stroke();
    }
    for (let y = -hh; y <= hh; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-hw, y);
      ctx.lineTo(hw, y);
      ctx.stroke();
    }

    // Outer Neon Border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(-hw, -hh, w, h);

    // Food Pellets
    if (modeState.pellets) {
      for (const p of modeState.pellets) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.shadowColor = p.c;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Ejected Mass Pellets
    if (modeState.ejectedPellets) {
      for (const ep of modeState.ejectedPellets) {
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, ep.r, 0, Math.PI * 2);
        ctx.fillStyle = ep.c || '#38bdf8';
        ctx.shadowColor = ep.c || '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }

  renderSpaceShip(ctx, modeState) {
    const w = modeState.width || 1800;
    const h = modeState.height || 1200;
    const hw = w / 2;
    const hh = h / 2;

    // 1. Deep Space Floor
    ctx.fillStyle = '#050811';
    ctx.fillRect(-hw, -hh, w, h);

    // 2. Room Sectors Floor Styling
    if (modeState.rooms) {
      for (const room of modeState.rooms) {
        const rx = room.x - room.w / 2;
        const ry = room.y - room.h / 2;

        // Room metal floor
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(rx, ry, room.w, room.h);

        // Tech grid lines inside room
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
        ctx.lineWidth = 1;
        for (let gx = rx; gx <= rx + room.w; gx += 40) {
          ctx.beginPath();
          ctx.moveTo(gx, ry);
          ctx.lineTo(gx, ry + room.h);
          ctx.stroke();
        }
        for (let gy = ry; gy <= ry + room.h; gy += 40) {
          ctx.beginPath();
          ctx.moveTo(rx, gy);
          ctx.lineTo(rx + room.w, gy);
          ctx.stroke();
        }

        // Room Header Title Banner
        ctx.font = 'bold 12px Outfit, sans-serif';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.textAlign = 'center';
        ctx.fillText(`${room.icon} ${room.name}`, room.x, ry + 22);
      }
    }

    // 3. Central Cafeteria Meeting Table with Big Red Button
    ctx.beginPath();
    ctx.arc(0, 0, 65, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Red Emergency Button in center
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('EMERGENCY', 0, -2);
    ctx.fillText('[R] RAPOR', 0, 8);

    // 4. Interior & Exterior Metal Walls
    if (modeState.walls) {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      for (const wall of modeState.walls) {
        ctx.beginPath();
        ctx.moveTo(wall.p1.x, wall.p1.y);
        ctx.lineTo(wall.p2.x, wall.p2.y);
        ctx.stroke();
      }

      // Glowing inner accent line on walls
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      for (const wall of modeState.walls) {
        ctx.beginPath();
        ctx.moveTo(wall.p1.x, wall.p1.y);
        ctx.lineTo(wall.p2.x, wall.p2.y);
        ctx.stroke();
      }
    }

    // 5. Vents (Havalandırma Bacaları)
    if (modeState.vents) {
      for (const v of modeState.vents) {
        ctx.beginPath();
        ctx.arc(v.x, v.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Vent Grate Slits
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌀', v.x, v.y + 1);
      }
    }

    // 6. Task Stations (Görev İstasyonları)
    if (modeState.taskStations) {
      const pulse = (Math.sin(Date.now() / 300) + 1) * 0.5;
      for (const t of modeState.taskStations) {
        // Glowing Aura Pad
        ctx.beginPath();
        ctx.arc(t.x, t.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(250, 204, 21, ${0.15 + pulse * 0.15})`;
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icon & Label
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.icon, t.x, t.y);

        ctx.font = 'bold 9px Outfit, sans-serif';
        ctx.fillStyle = '#facc15';
        ctx.fillText('[E] GÖREV', t.x, t.y + 26);
      }
    }

    // 7. Dead Bodies (Cesetler)
    if (modeState.bodies) {
      for (const b of modeState.bodies) {
        // Half disc body
        ctx.beginPath();
        ctx.arc(b.x, b.y, 16, 0, Math.PI);
        ctx.fillStyle = b.color || '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Bone sticking out
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🦴', b.x, b.y - 4);

        ctx.font = 'bold 10px Outfit, sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`💀 ${b.name}`, b.x, b.y + 18);
      }
    }
  }

  renderPlayer(ctx, player, isMe) {
    const radius = player.r || 18;
    const isSpectator = !!player.isSpectator;
    const isVented = !!player.isVented;

    // In Space mode, vented players are completely hidden from other players
    if (isVented && !isMe && !isSpectator) {
      return;
    }

    ctx.save();
    if (isSpectator || (isVented && isMe)) {
      ctx.globalAlpha = 0.5;
    }

    // Glowing Pulse Beacon Ring under yourself
    if (isMe) {
      const pulseTime = Date.now() / 300;
      const pulseRadius = radius + 6 + Math.sin(pulseTime) * 3;

      ctx.beginPath();
      ctx.arc(player.x, player.y, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Space Task Progress Arc Meter (if completing task)
    if (player.taskProgress > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius + 8, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (player.taskProgress / 100)));
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Ball Hold Magnetic Tether Shield
    if (player.isHoldingBall) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Hold Cooldown Arc Meter (if on cooldown)
    if (player.holdCdRatio > 0 && !isSpectator) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius + 5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (1 - player.holdCdRatio)));
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Kick shockwave / Active Aura
    if (player.isKicking) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius + 12, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Player Shadow
    ctx.beginPath();
    ctx.arc(player.x + 2, player.y + 4, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    // Player Disc Body
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    
    // Team / Custom Color
    let fillColor = player.color || '#3b82f6';
    if (isSpectator) fillColor = '#475569';
    else if (player.team === 'red') fillColor = '#ef4444';
    else if (player.team === 'blue') fillColor = '#3b82f6';

    const grad = ctx.createRadialGradient(player.x - radius * 0.3, player.y - radius * 0.3, radius * 0.1, player.x, player.y, radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, fillColor);
    grad.addColorStop(1, '#0b0f19');

    ctx.fillStyle = grad;
    ctx.fill();

    // Disc Border
    ctx.strokeStyle = isMe ? '#facc15' : (isSpectator ? '#94a3b8' : 'rgba(255, 255, 255, 0.85)');
    ctx.lineWidth = isMe ? 3.5 : 2;
    ctx.stroke();

    // Avatar Emoji inside Disc
    ctx.font = `${Math.floor(radius * 0.95)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isSpectator ? '👁️' : (player.avatar || '⚽'), player.x, player.y + 1);

    // Player Nameplate & "SEN" Badge
    ctx.textAlign = 'center';
    if (isMe) {
      // Golden SEN badge
      ctx.font = 'bold 10px Outfit, sans-serif';
      ctx.fillStyle = '#facc15';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 6;
      ctx.fillText('▼ SEN', player.x, player.y - radius - 16);

      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(player.name, player.x, player.y - radius - 5);
      ctx.shadowBlur = 0;
    } else {
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.fillStyle = isSpectator ? '#94a3b8' : '#f8fafc';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(player.name, player.x, player.y - radius - 8);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  renderBall(ctx, ball) {
    // Ball Motion Trail
    this.ballTrail.push({ x: ball.x, y: ball.y, alpha: 0.5 });
    if (this.ballTrail.length > 6) this.ballTrail.shift();

    for (let i = 0; i < this.ballTrail.length; i++) {
      const t = this.ballTrail[i];
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.r * (0.5 + 0.5 * (i / this.ballTrail.length)), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 * (i / this.ballTrail.length)})`;
      ctx.fill();
    }

    // Ball Shadow
    ctx.beginPath();
    ctx.arc(ball.x + 3, ball.y + 5, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    // Ball Disc Body
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, ball.r * 0.1, ball.x, ball.y, ball.r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.7, '#e2e8f0');
    grad.addColorStop(1, '#94a3b8');

    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  renderParticles(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }
}
