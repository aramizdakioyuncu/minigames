// High-Performance WebGL (PixiJS) & Hardware-Accelerated Rendering Engine

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.isWebGL = typeof window.PIXI !== 'undefined';
    
    this.camera = { x: 0, y: 0, zoom: 1.0 };
    this.particles = [];
    this.ballTrail = [];

    // Smooth Entity Interpolation Cache (id -> { x, y, vx, vy, r })
    this.entities = new Map();
    this.ballState = { x: 0, y: 0, vx: 0, vy: 0, r: 12 };

    if (this.isWebGL) {
      try {
        this.initPixi(canvas);
      } catch (e) {
        console.warn('WebGL init failed, falling back to Canvas 2D:', e);
        this.isWebGL = false;
        this.initCanvas2D(canvas);
      }
    } else {
      this.initCanvas2D(canvas);
    }

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  initPixi(canvas) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.app = new PIXI.Application({
      view: canvas,
      width: this.width,
      height: this.height,
      autoDensity: true,
      resolution: this.dpr,
      backgroundColor: 0x070a13,
      antialias: true,
      powerPreference: 'high-performance'
    });

    // Layer Container Hierarchy
    this.stage = this.app.stage;
    this.world = new PIXI.Container();
    this.stage.addChild(this.world);

    this.bgGraphics = new PIXI.Graphics();
    this.envGraphics = new PIXI.Graphics();
    this.pelletsGraphics = new PIXI.Graphics();
    this.entitiesContainer = new PIXI.Container();
    this.ballGraphics = new PIXI.Graphics();
    this.particlesGraphics = new PIXI.Graphics();

    this.world.addChild(this.bgGraphics);
    this.world.addChild(this.envGraphics);
    this.world.addChild(this.pelletsGraphics);
    this.world.addChild(this.entitiesContainer);
    this.world.addChild(this.ballGraphics);
    this.world.addChild(this.particlesGraphics);

    // Text & Sprite Pooling
    this.textPool = new Map();
  }

  initCanvas2D(canvas) {
    this.ctx = canvas.getContext('2d', { alpha: false });
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    if (this.isWebGL && this.app) {
      this.app.renderer.resize(this.width, this.height);
    } else if (this.canvas) {
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
    }
  }

  // Frame-Rate Independent Camera Tracking
  updateCamera(targetX, targetY, dt = 0.016) {
    const camBlend = 1 - Math.exp(-9 * dt);
    this.camera.x += (targetX - this.camera.x) * camBlend;
    this.camera.y += (targetY - this.camera.y) * camBlend;
  }

  addKickSparks(x, y, color = '#38bdf8') {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        color,
        hexColor: this.parseColorToHex(color),
        alpha: 1.0,
        decay: 0.04 + Math.random() * 0.03
      });
    }
  }

  addGoalCelebration(x, y) {
    const colors = ['#facc15', '#f43f5e', '#38bdf8', '#10b981', '#a855f7'];
    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 11;
      const c = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 4,
        color: c,
        hexColor: this.parseColorToHex(c),
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.015
      });
    }
  }

  parseColorToHex(colorStr) {
    if (!colorStr) return 0x38bdf8;
    if (colorStr.startsWith('#')) {
      return parseInt(colorStr.slice(1), 16);
    }
    return 0x38bdf8;
  }

  render(gameState, myPlayerId, dt = 0.016) {
    // 1. Delta-Time Smooth Exponential Spring Interpolation
    const blend = 1 - Math.exp(-22 * dt);

    let myPlayer = null;
    if (gameState && gameState.players) {
      for (const p of gameState.players) {
        let cached = this.entities.get(p.id);
        if (!cached) {
          cached = { x: p.x, y: p.y, vx: p.vx || 0, vy: p.vy || 0, r: p.r || 18 };
          this.entities.set(p.id, cached);
        } else {
          const vx = p.vx !== undefined ? p.vx : 0;
          const vy = p.vy !== undefined ? p.vy : 0;
          // Target with smooth latency prediction
          const targetX = p.x + (vx * 0.3);
          const targetY = p.y + (vy * 0.3);
          cached.x += (targetX - cached.x) * blend;
          cached.y += (targetY - cached.y) * blend;
          cached.r = p.r || 18;
        }

        if (p.id === myPlayerId) {
          myPlayer = { ...p, x: cached.x, y: cached.y };
        }
      }
    }

    // 2. Smooth Ball Updates
    if (gameState && gameState.mode === 'puck' && gameState.modeState && gameState.modeState.ball) {
      const b = gameState.modeState.ball;
      if (this.ballState.x === 0 && this.ballState.y === 0) {
        this.ballState.x = b.x;
        this.ballState.y = b.y;
      } else {
        const bvx = b.vx !== undefined ? b.vx : 0;
        const bvy = b.vy !== undefined ? b.vy : 0;
        const ballBlend = 1 - Math.exp(-24 * dt);
        const ballTargetX = b.x + (bvx * 0.3);
        const ballTargetY = b.y + (bvy * 0.3);
        this.ballState.x += (ballTargetX - this.ballState.x) * ballBlend;
        this.ballState.y += (ballTargetY - this.ballState.y) * ballBlend;
      }
      this.ballState.r = b.r || 12;
    }

    // 3. Camera Smooth Following
    if (myPlayer) {
      this.updateCamera(myPlayer.x, myPlayer.y, dt);
    } else if (gameState && gameState.mode === 'puck' && gameState.modeState && gameState.modeState.ball) {
      this.updateCamera(this.ballState.x, this.ballState.y, dt);
    }

    // Dispatch to WebGL or Canvas 2D
    if (this.isWebGL && this.app) {
      this.renderWebGL(gameState, myPlayerId, dt);
    } else {
      this.renderCanvas2D(gameState, myPlayerId, dt);
    }
  }

  // --- WebGL / PixiJS High Performance Renderer ---

  renderWebGL(gameState, myPlayerId, dt) {
    const cx = this.width / 2;
    const cy = this.height / 2;

    this.world.position.set(cx, cy);
    this.world.scale.set(this.camera.zoom, this.camera.zoom);
    this.world.pivot.set(this.camera.x, this.camera.y);

    this.bgGraphics.clear();
    this.envGraphics.clear();
    this.pelletsGraphics.clear();
    this.ballGraphics.clear();
    this.particlesGraphics.clear();

    if (!gameState) return;

    // Render Mode Arena via WebGL
    if (gameState.mode === 'puck') {
      this.renderWebGLPuckPitch(gameState.modeState);
    } else if (gameState.mode === 'sumo') {
      this.renderWebGLSumoRing(gameState.modeState);
    } else if (gameState.mode === 'agar') {
      this.renderWebGLAgarArena(gameState.modeState);
    } else if (gameState.mode === 'space') {
      this.renderWebGLSpaceShip(gameState.modeState);
    }

    // Render WebGL Particles
    this.renderWebGLParticles(dt);

    // Render Entities
    this.renderWebGLEntities(gameState, myPlayerId);

    // Render Ball
    if (gameState.mode === 'puck' && gameState.modeState && gameState.modeState.ball) {
      this.renderWebGLBall(this.ballState);
    }
  }

  renderWebGLPuckPitch(modeState) {
    const w = modeState.width || 1200;
    const h = modeState.height || 650;
    const hw = w / 2;
    const hh = h / 2;
    const gh = (modeState.goalHeight || 160) / 2;
    const gd = modeState.goalDepth || 90;

    const bg = this.bgGraphics;
    const env = this.envGraphics;

    // 1. Outer Stadium Concrete Deck
    bg.beginFill(0x070b14);
    bg.drawRect(-hw - 120, -hh - 150, w + 240, h + 300);
    bg.endFill();

    // 2. Top Spectator Tribune (Kuzey Tribünü)
    const tribuneH = 110;
    bg.beginFill(0x0f172a);
    bg.lineStyle(2, 0x38bdf8, 0.3);
    bg.drawRoundedRect(-hw - 80, -hh - 135, w + 160, tribuneH, 8);
    bg.endFill();

    // Top Tribune Stadium Chairs (Koltuk Sıraları)
    const seatCols = Math.floor((w + 140) / 26);
    for (let r = 0; r < 3; r++) {
      const seatY = -hh - 120 + r * 28;
      for (let c = 0; c < seatCols; c++) {
        if (c % 12 === 5 || c % 12 === 6) continue; // Aisle walkway gap
        const seatX = -hw - 70 + c * 26;
        const chairColor = (c + r) % 2 === 0 ? 0x1e3a8a : 0x991b1b;
        bg.lineStyle(1, 0x334155, 0.7);
        bg.beginFill(chairColor, 0.85);
        bg.drawRoundedRect(seatX, seatY, 18, 16, 3);
        bg.endFill();
      }
    }

    // 3. Bottom Spectator Tribune (Güney Tribünü)
    bg.beginFill(0x0f172a);
    bg.lineStyle(2, 0x38bdf8, 0.3);
    bg.drawRoundedRect(-hw - 80, hh + 25, w + 160, tribuneH, 8);
    bg.endFill();

    // Bottom Tribune Stadium Chairs
    for (let r = 0; r < 3; r++) {
      const seatY = hh + 40 + r * 28;
      for (let c = 0; c < seatCols; c++) {
        if (c % 12 === 5 || c % 12 === 6) continue; // Aisle walkway gap
        const seatX = -hw - 70 + c * 26;
        const chairColor = (c + r) % 2 === 0 ? 0x991b1b : 0x1e3a8a;
        bg.lineStyle(1, 0x334155, 0.7);
        bg.beginFill(chairColor, 0.85);
        bg.drawRoundedRect(seatX, seatY, 18, 16, 3);
        bg.endFill();
      }
    }

    // Glass Safety Railings (Tribün Cam Korkulukları)
    env.lineStyle(3, 0x38bdf8, 0.7);
    env.moveTo(-hw - 80, -hh - 22);
    env.lineTo(hw + 80, -hh - 22);
    env.moveTo(-hw - 80, hh + 22);
    env.lineTo(hw + 80, hh + 22);

    // 4. Pitch Outer Turf Border
    bg.lineStyle(0);
    bg.beginFill(0x0d281a);
    bg.drawRect(-hw - 15, -hh - 15, w + 30, h + 30);
    bg.endFill();

    // 5. Pitch Green Stripes
    const stripeCount = 12;
    const stripeW = w / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      bg.beginFill(i % 2 === 0 ? 0x143d2b : 0x113525);
      bg.drawRect(-hw + i * stripeW, -hh, stripeW, h);
      bg.endFill();
    }

    // 6. White Pitch Boundary Lines
    env.lineStyle(4, 0xffffff, 0.85);
    env.drawRect(-hw, -hh, w, h);

    // Center Line & Circle
    env.moveTo(0, -hh);
    env.lineTo(0, hh);
    env.drawCircle(0, 0, 90);
    
    env.lineStyle(0);
    env.beginFill(0xffffff);
    env.drawCircle(0, 0, 4);
    env.endFill();

    // Penalty Areas (Ceza Sahaları)
    env.lineStyle(3, 0xffffff, 0.7);
    env.drawRect(-hw, -gh - 30, gd + 40, (gh + 30) * 2);
    env.drawRect(hw - gd - 40, -gh - 30, gd + 40, (gh + 30) * 2);

    // Goals (Red / Blue)
    env.lineStyle(3, 0xef4444, 0.9);
    env.beginFill(0xef4444, 0.18);
    env.drawRect(-hw - gd, -gh, gd, gh * 2);
    env.endFill();

    env.lineStyle(3, 0x3b82f6, 0.9);
    env.beginFill(0x3b82f6, 0.18);
    env.drawRect(hw, -gh, gd, gh * 2);
    env.endFill();

    // Goal Posts
    if (modeState.posts) {
      for (const post of modeState.posts) {
        env.lineStyle(2, 0x64748b);
        env.beginFill(0xe2e8f0);
        env.drawCircle(post.x, post.y, post.r);
        env.endFill();
      }
    }
  }

  renderWebGLSumoRing(modeState) {
    const ringRadius = modeState.ringRadius || 400;
    const bg = this.bgGraphics;
    const env = this.envGraphics;

    // Void / Danger Floor
    bg.beginFill(0x1e111d);
    bg.drawRect(-1200, -1200, 2400, 2400);
    bg.endFill();

    // Glowing Danger Ring
    bg.lineStyle(14, 0xef4444, 0.35);
    bg.drawCircle(0, 0, ringRadius + 12);

    // Sumo Platform
    bg.lineStyle(0);
    bg.beginFill(0x131c2e);
    bg.drawCircle(0, 0, ringRadius);
    bg.endFill();

    // Border
    env.lineStyle(5, 0xf43f5e, 1.0);
    env.drawCircle(0, 0, ringRadius);

    // Center Circle
    env.lineStyle(3, 0xf43f5e, 0.3);
    env.drawCircle(0, 0, 50);
  }

  renderWebGLAgarArena(modeState) {
    const w = modeState.width || 1800;
    const h = modeState.height || 1200;
    const hw = w / 2;
    const hh = h / 2;

    const bg = this.bgGraphics;
    const env = this.envGraphics;
    const pellets = this.pelletsGraphics;

    // Arena Floor
    bg.beginFill(0x0a0f1d);
    bg.drawRect(-hw, -hh, w, h);
    bg.endFill();

    // Neon Grid
    bg.lineStyle(1, 0x38bdf8, 0.08);
    const gridSize = 60;
    for (let x = -hw; x <= hw; x += gridSize) {
      bg.moveTo(x, -hh);
      bg.lineTo(x, hh);
    }
    for (let y = -hh; y <= hh; y += gridSize) {
      bg.moveTo(-hw, y);
      bg.lineTo(hw, y);
    }

    // Border
    env.lineStyle(4, 0x38bdf8, 1.0);
    env.drawRect(-hw, -hh, w, h);

    // Batch Pellets
    if (modeState.pellets) {
      for (const p of modeState.pellets) {
        const hex = this.parseColorToHex(p.c);
        pellets.beginFill(hex, 0.95);
        pellets.drawCircle(p.x, p.y, p.r);
        pellets.endFill();
      }
    }

    // Ejected Mass Pellets
    if (modeState.ejectedPellets) {
      for (const ep of modeState.ejectedPellets) {
        const hex = this.parseColorToHex(ep.c);
        pellets.lineStyle(1.5, 0xffffff, 1.0);
        pellets.beginFill(hex, 1.0);
        pellets.drawCircle(ep.x, ep.y, ep.r);
        pellets.endFill();
      }
    }
  }

  renderWebGLSpaceShip(modeState) {
    const w = modeState.width || 1800;
    const h = modeState.height || 1200;
    const hw = w / 2;
    const hh = h / 2;

    const bg = this.bgGraphics;
    const env = this.envGraphics;

    // Deep Space
    bg.beginFill(0x050811);
    bg.drawRect(-hw, -hh, w, h);
    bg.endFill();

    // Rooms Metal Floors
    if (modeState.rooms) {
      for (const room of modeState.rooms) {
        const rx = room.x - room.w / 2;
        const ry = room.y - room.h / 2;

        bg.beginFill(0x0f172a);
        bg.drawRect(rx, ry, room.w, room.h);
        bg.endFill();

        bg.lineStyle(1, 0x38bdf8, 0.06);
        for (let gx = rx; gx <= rx + room.w; gx += 40) {
          bg.moveTo(gx, ry);
          bg.lineTo(gx, ry + room.h);
        }
        for (let gy = ry; gy <= ry + room.h; gy += 40) {
          bg.moveTo(rx, gy);
          bg.lineTo(rx + room.w, gy);
        }
      }
    }

    // Cafeteria Table
    env.lineStyle(3, 0x38bdf8, 1.0);
    env.beginFill(0x1e293b);
    env.drawCircle(0, 0, 65);
    env.endFill();

    // Emergency Red Button
    env.lineStyle(2, 0xf87171, 1.0);
    env.beginFill(0xef4444);
    env.drawCircle(0, 0, 24);
    env.endFill();

    // Walls
    if (modeState.walls) {
      env.lineStyle(8, 0x475569, 1.0);
      for (const wall of modeState.walls) {
        env.moveTo(wall.p1.x, wall.p1.y);
        env.lineTo(wall.p2.x, wall.p2.y);
      }
      env.lineStyle(2, 0x38bdf8, 0.9);
      for (const wall of modeState.walls) {
        env.moveTo(wall.p1.x, wall.p1.y);
        env.lineTo(wall.p2.x, wall.p2.y);
      }
    }

    // Vents
    if (modeState.vents) {
      for (const v of modeState.vents) {
        env.lineStyle(2.5, 0x94a3b8);
        env.beginFill(0x1e293b);
        env.drawCircle(v.x, v.y, 18);
        env.endFill();
      }
    }

    // Task Stations Glowing Aura
    if (modeState.taskStations) {
      const pulse = (Math.sin(Date.now() / 300) + 1) * 0.5;
      for (const t of modeState.taskStations) {
        env.lineStyle(2, 0xfacc15, 1.0);
        env.beginFill(0xfacc15, 0.15 + pulse * 0.15);
        env.drawCircle(t.x, t.y, 22);
        env.endFill();
      }
    }
  }

  renderWebGLParticles(dt) {
    const pG = this.particlesGraphics;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay * (dt * 60);

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      pG.lineStyle(0);
      pG.beginFill(p.hexColor || 0x38bdf8, p.alpha);
      pG.drawCircle(p.x, p.y, p.radius);
      pG.endFill();
    }
  }

  renderWebGLBall(ball) {
    const bG = this.ballGraphics;

    // Ball Trail
    this.ballTrail.push({ x: ball.x, y: ball.y, alpha: 0.5 });
    if (this.ballTrail.length > 6) this.ballTrail.shift();

    for (let i = 0; i < this.ballTrail.length; i++) {
      const t = this.ballTrail[i];
      bG.beginFill(0xffffff, 0.1 * (i / this.ballTrail.length));
      bG.drawCircle(t.x, t.y, ball.r * (0.5 + 0.5 * (i / this.ballTrail.length)));
      bG.endFill();
    }

    // Ball Disc Body
    bG.lineStyle(1.5, 0x1e293b, 1.0);
    bG.beginFill(0xf1f5f9);
    bG.drawCircle(ball.x, ball.y, ball.r);
    bG.endFill();
  }

  renderWebGLEntities(gameState, myPlayerId) {
    this.entitiesContainer.removeChildren();

    const entities = gameState.mode === 'agar' && gameState.modeState && gameState.modeState.cells
      ? gameState.modeState.cells
      : (gameState.players || []);

    for (const p of entities) {
      if (p.isAlive === false) continue;
      const isSpectator = !!p.isSpectator;
      const cached = this.entities.get(p.id) || p;
      const isMe = p.id === myPlayerId || p.playerId === myPlayerId;
      const isVented = !!p.isVented;
      if (isVented && !isMe) continue;

      const g = new PIXI.Graphics();
      const radius = isSpectator ? 16 : (p.r || 18);
      const hexColor = isSpectator ? 0x1e293b : this.parseColorToHex(p.color || (p.team === 'red' ? '#ef4444' : '#3b82f6'));

      if (isSpectator) {
        // Spectator Disc in Tribune
        g.lineStyle(isMe ? 2.5 : 1.5, isMe ? 0x38bdf8 : 0x64748b, isMe ? 0.95 : 0.6);
        g.beginFill(0x0f172a, isMe ? 0.85 : 0.6);
        g.drawCircle(cached.x, cached.y, radius);
        g.endFill();

        if (isMe) {
          const pulseRadius = radius + 6 + Math.sin(Date.now() / 250) * 3;
          g.lineStyle(2, 0x38bdf8, 0.8);
          g.drawCircle(cached.x, cached.y, pulseRadius);
        }
      } else {
        // Pulse ring for self
        if (isMe) {
          const pulseRadius = radius + 6 + Math.sin(Date.now() / 300) * 3;
          g.lineStyle(2.5, 0xfacc15, 0.9);
          g.drawCircle(cached.x, cached.y, pulseRadius);
        }

        // Ball Hold Shield
        if (p.isHoldingBall) {
          g.lineStyle(3, 0x38bdf8, 1.0);
          g.drawCircle(cached.x, cached.y, radius + 8);
        }

        // Player Disc Body
        g.lineStyle(isMe ? 3.5 : 2, isMe ? 0xfacc15 : 0xffffff, 0.9);
        g.beginFill(hexColor, isVented ? 0.5 : 1.0);
        g.drawCircle(cached.x, cached.y, radius);
        g.endFill();
      }

      // Text and Avatar Overlay via Pixi Text
      let textObj = this.textPool.get(p.id);
      const labelText = isSpectator
        ? `${isMe ? '👁️' : (p.avatar || '👁️')}\n${isMe ? '▼ TRİBÜNDESİN' : (p.name || 'İzleyici')}`
        : `${p.avatar || '⚽'}\n${p.name || ''}`;

      if (!textObj) {
        textObj = new PIXI.Text(labelText, {
          fontFamily: 'Outfit, sans-serif',
          fontSize: Math.max(10, Math.floor(radius * 0.8)),
          fill: isSpectator ? 0x38bdf8 : 0xffffff,
          align: 'center',
          fontWeight: 'bold',
          dropShadow: true,
          dropShadowColor: 0x000000,
          dropShadowBlur: 4,
          dropShadowDistance: 0
        });
        textObj.anchor.set(0.5, 0.5);
        this.textPool.set(p.id, textObj);
      } else {
        textObj.text = labelText;
        textObj.style.fill = isSpectator ? (isMe ? 0x38bdf8 : 0x94a3b8) : 0xffffff;
      }
      textObj.position.set(cached.x, cached.y - (radius > 25 ? 0 : 2));
      textObj.alpha = isVented ? 0.5 : 1.0;

      this.entitiesContainer.addChild(g);
      this.entitiesContainer.addChild(textObj);
    }
  }

  // --- Fallback Canvas 2D Renderer (For legacy environments) ---

  renderCanvas2D(gameState, myPlayerId, dt) {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.fillStyle = '#070a13';
    ctx.fillRect(0, 0, this.width, this.height);

    if (!gameState) {
      ctx.restore();
      return;
    }

    const cx = this.width / 2;
    const cy = this.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    if (gameState.mode === 'puck') {
      this.renderCanvasPuckPitch(ctx, gameState.modeState);
    } else if (gameState.mode === 'sumo') {
      this.renderCanvasSumoRing(ctx, gameState.modeState);
    } else if (gameState.mode === 'agar') {
      this.renderCanvasAgarArena(ctx, gameState.modeState);
    } else if (gameState.mode === 'space') {
      this.renderCanvasSpaceShip(ctx, gameState.modeState);
    }

    this.renderCanvasParticles(ctx, dt);

    if (gameState.players) {
      for (const p of gameState.players) {
        if (!p.isSpectator && p.isAlive !== false) {
          const cached = this.entities.get(p.id) || p;
          this.renderCanvasPlayer(ctx, { ...p, x: cached.x, y: cached.y }, p.id === myPlayerId);
        }
      }
    }

    if (gameState.mode === 'puck' && gameState.modeState && gameState.modeState.ball) {
      this.renderCanvasBall(ctx, this.ballState);
    }

    ctx.restore();
    ctx.restore();
  }

  renderCanvasPuckPitch(ctx, modeState) {
    const w = modeState.width || 1200;
    const h = modeState.height || 650;
    const hw = w / 2;
    const hh = h / 2;
    const gh = (modeState.goalHeight || 160) / 2;
    const gd = modeState.goalDepth || 90;

    ctx.fillStyle = '#0a101d';
    ctx.fillRect(-hw - 100, -hh - 130, w + 200, h + 260);

    ctx.fillStyle = '#111827';
    ctx.fillRect(-hw - 60, -hh - 110, w + 120, 85);
    ctx.fillRect(-hw - 60, hh + 25, w + 120, 85);

    ctx.fillStyle = '#0f291e';
    ctx.fillRect(-hw - 15, -hh - 15, w + 30, h + 30);

    const stripeCount = 12;
    const stripeW = w / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#143d2b' : '#113525';
      ctx.fillRect(-hw + i * stripeW, -hh, stripeW, h);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 4;
    ctx.strokeRect(-hw, -hh, w, h);

    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.lineTo(0, hh);
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.fillRect(-hw - gd, -gh, gd, gh * 2);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.fillRect(hw, -gh, gd, gh * 2);
  }

  renderCanvasSumoRing(ctx, modeState) {
    const ringRadius = modeState.ringRadius || 400;
    ctx.fillStyle = '#1e111d';
    ctx.fillRect(-1000, -1000, 2000, 2000);

    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#131c2e';
    ctx.fill();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  renderCanvasAgarArena(ctx, modeState) {
    const w = modeState.width || 1800;
    const h = modeState.height || 1200;
    const hw = w / 2;
    const hh = h / 2;

    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(-hw, -hh, w, h);

    if (modeState.pellets) {
      for (const p of modeState.pellets) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.fill();
      }
    }
  }

  renderCanvasSpaceShip(ctx, modeState) {
    const w = modeState.width || 1800;
    const h = modeState.height || 1200;
    const hw = w / 2;
    const hh = h / 2;

    ctx.fillStyle = '#050811';
    ctx.fillRect(-hw, -hh, w, h);

    if (modeState.walls) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      for (const wall of modeState.walls) {
        ctx.beginPath();
        ctx.moveTo(wall.p1.x, wall.p1.y);
        ctx.lineTo(wall.p2.x, wall.p2.y);
        ctx.stroke();
      }
    }
  }

  renderCanvasPlayer(ctx, player, isMe) {
    const radius = player.r || 18;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color || '#3b82f6';
    ctx.fill();
    ctx.strokeStyle = isMe ? '#facc15' : '#ffffff';
    ctx.lineWidth = isMe ? 3.5 : 2;
    ctx.stroke();

    ctx.font = `${Math.floor(radius * 0.95)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.avatar || '⚽', player.x, player.y);
  }

  renderCanvasBall(ctx, ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  renderCanvasParticles(ctx, dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay * (dt * 60);

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
