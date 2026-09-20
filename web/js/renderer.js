import { clientModeRegistry } from './modes/clientModeRegistry.js';

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

    // Static Arena Cache key to prevent rebuilding background every frame
    this.cachedArenaKey = null;

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
    this.entitiesGraphics = new PIXI.Graphics();
    this.entitiesTextContainer = new PIXI.Container();
    this.ballGraphics = new PIXI.Graphics();
    this.particlesGraphics = new PIXI.Graphics();

    this.world.addChild(this.bgGraphics);
    this.world.addChild(this.envGraphics);
    this.world.addChild(this.pelletsGraphics);
    this.world.addChild(this.entitiesGraphics);
    this.world.addChild(this.entitiesTextContainer);
    this.world.addChild(this.ballGraphics);
    this.world.addChild(this.particlesGraphics);

    // Text & Sprite Pooling
    this.textPool = new Map();
  }

  initCanvas2D(canvas) {
    this.ctx = canvas.getContext('2d', { alpha: false });
  }

  reset() {
    this.entities.clear();
    this.ballTrail = [];
    this.particles = [];
    this.camera = { x: 0, y: 0, zoom: 1.0 };
    this.cachedArenaKey = null;

    if (this.isWebGL && this.app) {
      if (this.bgGraphics) this.bgGraphics.clear();
      if (this.envGraphics) this.envGraphics.clear();
      if (this.pelletsGraphics) this.pelletsGraphics.clear();
      if (this.entitiesGraphics) this.entitiesGraphics.clear();
      if (this.ballGraphics) this.ballGraphics.clear();
      if (this.particlesGraphics) this.particlesGraphics.clear();

      if (this.textPool) {
        for (const [id, textObj] of this.textPool.entries()) {
          if (this.entitiesTextContainer) {
            this.entitiesTextContainer.removeChild(textObj);
          }
        }
        this.textPool.clear();
      }
    } else if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.cachedArenaKey = null; // force redraw on resize

    if (this.isWebGL && this.app) {
      this.app.renderer.resize(this.width, this.height);
    } else if (this.canvas) {
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
    }
  }

  // Frame-Rate Independent Camera Tracking
  updateCamera(targetX, targetY, dt = 0.016, isFixedArena = false, arenaW = 1200, arenaH = 650) {
    if (isFixedArena) {
      // In Puck/Sumo mode: keep camera stable and centered on the pitch like Haxball (no jitter!)
      const margin = 160;
      const zoomX = this.width / (arenaW + margin * 2);
      const zoomY = this.height / (arenaH + margin * 2);
      const targetZoom = Math.min(zoomX, zoomY, 1.25);

      const zoomBlend = 1 - Math.exp(-12 * dt);
      const posBlend = 1 - Math.exp(-24 * dt);
      this.camera.zoom += (targetZoom - this.camera.zoom) * zoomBlend;
      this.camera.x += (0 - this.camera.x) * posBlend;
      this.camera.y += (0 - this.camera.y) * posBlend;
    } else {
      // In Space/Agar mode: tightly follow player without slow laggy spring
      const camBlend = 1 - Math.exp(-22 * dt);
      this.camera.zoom = 1.0;
      this.camera.x += (targetX - this.camera.x) * camBlend;
      this.camera.y += (targetY - this.camera.y) * camBlend;
    }
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
    // 1. Rock-Solid Delta-Time Exponential Interpolation (Zero Jitter)
    const blend = 1 - Math.exp(-28 * dt);

    let myPlayer = null;
    if (gameState && gameState.players) {
      for (const p of gameState.players) {
        let cached = this.entities.get(p.id);
        if (!cached) {
          cached = { x: p.x, y: p.y, vx: p.vx || 0, vy: p.vy || 0, r: p.r || 18 };
          this.entities.set(p.id, cached);
        } else {
          // If distance is large (e.g. respawn/goal reset), snap instantly without flying
          const dist = Math.hypot(p.x - cached.x, p.y - cached.y);
          if (dist > 160) {
            cached.x = p.x;
            cached.y = p.y;
          } else {
            // Smooth direct lerp without artificial forward overshooting
            cached.x += (p.x - cached.x) * blend;
            cached.y += (p.y - cached.y) * blend;
          }
          cached.vx = p.vx || 0;
          cached.vy = p.vy || 0;
          cached.r = p.r || 18;
        }

        if (p.id === myPlayerId) {
          myPlayer = { ...p, x: cached.x, y: cached.y };
        }
      }
    }

    // 2. Camera Tracking via Active Client Mode
    const activeMode = clientModeRegistry.getActiveMode(gameState ? gameState.mode : null);
    const isFixedArena = activeMode ? activeMode.isFixedArena() : false;
    const dims = activeMode ? activeMode.getArenaDimensions(gameState) : { width: 1200, height: 650 };

    if (isFixedArena) {
      this.updateCamera(0, 0, dt, true, dims.width, dims.height);
    } else if (myPlayer) {
      this.updateCamera(myPlayer.x, myPlayer.y, dt, false);
    } else if (gameState && gameState.mode === 'puck' && gameState.modeState && gameState.modeState.ball) {
      const b = gameState.modeState.ball;
      this.updateCamera(b.x || 0, b.y || 0, dt, true, dims.width, dims.height);
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

    this.envGraphics.clear();
    this.pelletsGraphics.clear();
    this.ballGraphics.clear();
    this.particlesGraphics.clear();

    if (!gameState) return;

    // Render Mode-Specific Environment & Entities
    const activeMode = clientModeRegistry.getActiveMode(gameState.mode);
    if (activeMode) {
      activeMode.renderEnvironment(this, this.envGraphics, gameState);
      activeMode.renderEntities(this, this.ballGraphics, gameState, this.entities, myPlayerId);
    }

    // Global Entities (Players, Avatars, Spectators)
    this.renderWebGLEntities(gameState, myPlayerId);

    // Global Particles (Sparks, Celebrations)
    this.renderWebGLParticles(dt);
  }
  renderWebGLEntities(gameState, myPlayerId) {
    const g = this.entitiesGraphics;
    g.clear();

    const entities = gameState.mode === 'agar' && gameState.modeState && gameState.modeState.cells
      ? gameState.modeState.cells
      : (gameState.players || []);

    const activeIds = new Set();
    const myP = (gameState.players || []).find(p => p.id === myPlayerId);
    const isSpaceMode = gameState.mode === 'space';
    const isSpaceMeeting = isSpaceMode && gameState.modeState && gameState.modeState.gameState === 'meeting';
    const isSpaceLobby = isSpaceMode && gameState.modeState && gameState.modeState.gameState === 'waiting';
    const isImpostor = myP && myP.role === 'impostor';
    const isMeDead = myP && !myP.isAlive;
    const spaceVisionRadius = (isMeDead || isSpaceMeeting) ? 2200 : (isSpaceLobby ? 440 : (isImpostor ? 370 : 290));

    for (const p of entities) {
      if (p.isAlive === false) continue;
      activeIds.add(p.id);

      const isSpectator = !!p.isSpectator;
      const cached = this.entities.get(p.id) || p;
      const isMe = p.id === myPlayerId || p.playerId === myPlayerId;
      const isVented = !!p.isVented;
      if (isVented && !isMe) continue;

      // Fog of War Visibility Filter in Space Mode
      if (isSpaceMode && !isSpaceMeeting && !isMeDead && !isMe && myP) {
        const distToMe = Math.hypot(cached.x - myP.x, cached.y - myP.y);
        if (distToMe > spaceVisionRadius + 35) {
          const t = this.textPool.get(p.id);
          if (t) t.visible = false;
          continue; // Hidden in space darkness
        }
      }

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
        // Determine Team-Based Border & Indicator Colors
        let borderColor = 0xffffff;
        let pulseColor = 0xfacc15;

        if (p.team === 'red') {
          borderColor = isMe ? 0xff3344 : 0xef4444;
          pulseColor = 0xff4d4d;
        } else if (p.team === 'blue') {
          borderColor = isMe ? 0x38bdf8 : 0x3b82f6;
          pulseColor = 0x60a5fa;
        } else if (isMe) {
          borderColor = 0xfacc15;
          pulseColor = 0xfacc15;
        }

        // Pulse ring for self
        if (isMe) {
          const pulseRadius = radius + 6 + Math.sin(Date.now() / 300) * 3;
          g.lineStyle(2.5, pulseColor, 0.95);
          g.drawCircle(cached.x, cached.y, pulseRadius);
        }

        // Ball Hold Shield
        if (p.isHoldingBall) {
          g.lineStyle(3, 0x38bdf8, 1.0);
          g.drawCircle(cached.x, cached.y, radius + 8);
        }

        // Player Disc Body (Border matches Red/Blue Team Color)
        g.lineStyle(isMe ? 4.0 : 2.5, borderColor, 1.0);
        g.beginFill(hexColor, isVented ? 0.5 : 1.0);
        g.drawCircle(cached.x, cached.y, radius);
        g.endFill();
      }

      // Text and Avatar Overlay via Pooled Pixi Text
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
        this.entitiesTextContainer.addChild(textObj);
      } else {
        if (textObj.text !== labelText) {
          textObj.text = labelText;
        }
        textObj.style.fill = isSpectator ? (isMe ? 0x38bdf8 : 0x94a3b8) : 0xffffff;
      }
      textObj.position.set(cached.x, cached.y - (radius > 25 ? 0 : 2));
      textObj.alpha = isVented ? 0.5 : 1.0;
      textObj.visible = true;
    }

    // Clean up disconnected players' text objects
    for (const [id, textObj] of this.textPool.entries()) {
      if (!activeIds.has(id)) {
        textObj.visible = false;
        this.entitiesTextContainer.removeChild(textObj);
        this.textPool.delete(id);
      }
    }
  }

  renderWebGLParticles(dt) {
    const g = this.particlesGraphics;
    if (!g) return;
    g.clear();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay * (dt * 60);

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const hexColor = p.hexColor || this.parseColorToHex(p.color);
      g.beginFill(hexColor, Math.max(0, Math.min(1, p.alpha)));
      g.drawCircle(p.x, p.y, p.radius);
      g.endFill();
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

    const isSecondHalf = modeState && (modeState.matchPhase === 'second_half');
    ctx.fillStyle = isSecondHalf ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    ctx.fillRect(-hw - gd, -gh, gd, gh * 2);
    ctx.fillStyle = isSecondHalf ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)';
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
    let borderColor = isMe ? '#facc15' : '#ffffff';
    let pulseColor = '#facc15';

    if (player.team === 'red') {
      borderColor = isMe ? '#ff3344' : '#ef4444';
      pulseColor = '#ff4d4d';
    } else if (player.team === 'blue') {
      borderColor = isMe ? '#38bdf8' : '#3b82f6';
      pulseColor = '#60a5fa';
    }

    if (isMe) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = pulseColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color || (player.team === 'red' ? '#ef4444' : '#3b82f6');
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isMe ? 4 : 2.5;
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
