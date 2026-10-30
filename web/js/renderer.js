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
    this.app.ticker.maxFPS = 60;

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
            textObj.destroy();
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

  // Coordinate Transformations
  screenToWorld(screenX, screenY) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const zoom = this.camera.zoom || 1.0;
    const camX = this.camera.x || 0;
    const camY = this.camera.y || 0;

    return {
      x: (screenX - cx) / zoom + camX,
      y: (screenY - cy) / zoom + camY
    };
  }

  worldToScreen(worldX, worldY) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const zoom = this.camera.zoom || 1.0;
    const camX = this.camera.x || 0;
    const camY = this.camera.y || 0;

    return {
      x: (worldX - camX) * zoom + cx,
      y: (worldY - camY) * zoom + cy
    };
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
        type: 'spark',
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

  addSplitEffect(originX, originY, targetX, targetY, dirX = 1, dirY = 0, color = '#38bdf8', radius = 24, childCellId = null, parentCellId = null) {
    const hexColor = this.parseColorToHex(color);

    // 1. Expanding Shockwave Ring at split origin
    this.particles.push({
      type: 'ring',
      x: originX,
      y: originY,
      radius: Math.max(10, radius * 0.4),
      growth: 3.8,
      lineWidth: 3.5,
      color,
      hexColor,
      alpha: 1.0,
      decay: 0.045
    });

    // 2. Rupture Shockwave Ring at spawn target
    this.particles.push({
      type: 'ring',
      x: targetX,
      y: targetY,
      radius: Math.max(8, radius * 0.3),
      growth: 2.8,
      lineWidth: 2.5,
      color,
      hexColor,
      alpha: 0.85,
      decay: 0.05
    });

    // 3. Directional High-Velocity Ejection Sparks & Bubbles
    const count = 22;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.3;
      const vx = (dirX + spread * -dirY) * (4 + Math.random() * 9);
      const vy = (dirY + spread * dirX) * (4 + Math.random() * 9);
      this.particles.push({
        type: 'spark',
        x: originX + (Math.random() - 0.5) * 16,
        y: originY + (Math.random() - 0.5) * 16,
        vx,
        vy,
        radius: 2 + Math.random() * 3.5,
        color,
        hexColor,
        alpha: 1.0,
        decay: 0.035 + Math.random() * 0.03
      });
    }

    // 4. Set Cell Spring/Spawn Animation in this.entities
    if (childCellId) {
      let childCached = this.entities.get(childCellId);
      if (!childCached) {
        childCached = {
          x: originX,
          y: originY,
          vx: dirX * 18,
          vy: dirY * 18,
          r: radius,
          scaleBounce: 1.25,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleIntensity: 1.0
        };
        this.entities.set(childCellId, childCached);
      }
      childCached.spawnAnim = {
        fromX: originX,
        fromY: originY,
        progress: 0
      };
      childCached.scaleBounce = 1.25;
      childCached.wobbleIntensity = 1.0;
    }

    if (parentCellId) {
      const parentCached = this.entities.get(parentCellId);
      if (parentCached) {
        parentCached.scaleBounce = 0.76; // Recoil squeeze
        parentCached.wobbleIntensity = 1.0;
      }
    }
  }

  addMergeEffect(fromX, fromY, toX, toY, targetRadius = 30, absorbedRadius = 20, color = '#38bdf8', targetCellId = null, absorbedCellId = null) {
    const hexColor = this.parseColorToHex(color);

    // 1. Suction Ghost Orb (absorbed cell animated being sucked into target core)
    this.particles.push({
      type: 'suction_orb',
      x: fromX,
      y: fromY,
      targetX: toX,
      targetY: toY,
      currentRadius: Math.max(10, absorbedRadius),
      color,
      hexColor,
      progress: 0,
      alpha: 0.95,
      decay: 0.045
    });

    // 2. Fusion Flash Ring at receiver cell
    this.particles.push({
      type: 'ring',
      x: toX,
      y: toY,
      radius: Math.max(12, targetRadius * 0.5),
      growth: 4.2,
      lineWidth: 4.0,
      color: '#ffffff',
      hexColor: 0xffffff,
      alpha: 1.0,
      decay: 0.04
    });

    this.particles.push({
      type: 'ring',
      x: toX,
      y: toY,
      radius: Math.max(16, targetRadius * 0.8),
      growth: 3.2,
      lineWidth: 3.0,
      color,
      hexColor,
      alpha: 0.9,
      decay: 0.035
    });

    // 3. Exploding fusion glitter & swirling sparkles
    const count = 28;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      const isGlitter = Math.random() > 0.4;
      this.particles.push({
        type: 'spark',
        x: toX,
        y: toY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: isGlitter ? (2 + Math.random() * 3) : (3 + Math.random() * 4),
        color: isGlitter ? '#ffffff' : color,
        hexColor: isGlitter ? 0xffffff : hexColor,
        alpha: 1.0,
        decay: 0.025 + Math.random() * 0.025
      });
    }

    // 4. Elastic Swell Bounce on Receiver Cell
    if (targetCellId) {
      const targetCached = this.entities.get(targetCellId);
      if (targetCached) {
        targetCached.scaleBounce = 1.35; // Expands with bounce
        targetCached.wobbleIntensity = 1.0;
      }
    }
  }

  addGoalCelebration(x, y) {
    const colors = ['#facc15', '#f43f5e', '#38bdf8', '#10b981', '#a855f7'];
    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 11;
      const c = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        type: 'spark',
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
    const isAgar = gameState && gameState.mode === 'agar' && gameState.modeState && gameState.modeState.cells;
    const rawEntities = isAgar ? gameState.modeState.cells : (gameState ? (gameState.players || []) : []);

    for (const p of rawEntities) {
      let cached = this.entities.get(p.id);
      if (!cached) {
        cached = {
          x: p.x,
          y: p.y,
          vx: p.vx || 0,
          vy: p.vy || 0,
          r: p.r || 18,
          scaleBounce: 1.0,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleIntensity: 0
        };
        this.entities.set(p.id, cached);
      } else {
        // Handle spawn animation transition if active
        if (cached.spawnAnim) {
          cached.spawnAnim.progress += dt * 3.5;
          if (cached.spawnAnim.progress >= 1) {
            cached.spawnAnim = null;
          }
        }

        const dist = Math.hypot(p.x - cached.x, p.y - cached.y);
        if (dist > 180 && !cached.spawnAnim) {
          cached.x = p.x;
          cached.y = p.y;
        } else {
          // Smooth direct lerp without artificial forward overshooting
          cached.x += (p.x - cached.x) * blend;
          cached.y += (p.y - cached.y) * blend;
        }
        cached.vx = p.vx || 0;
        cached.vy = p.vy || 0;
        cached.r += ((p.r || 18) - cached.r) * blend;
      }

      // Smoothly spring scaleBounce back to 1.0
      if (cached.scaleBounce !== undefined && cached.scaleBounce !== 1.0) {
        cached.scaleBounce += (1.0 - cached.scaleBounce) * (1 - Math.exp(-12 * dt));
        if (Math.abs(cached.scaleBounce - 1.0) < 0.005) cached.scaleBounce = 1.0;
      }

      // Smoothly decay wobble
      if (cached.wobbleIntensity > 0) {
        cached.wobbleIntensity -= dt * 2.0;
        if (cached.wobbleIntensity < 0) cached.wobbleIntensity = 0;
      }

      if (p.id === myPlayerId || p.playerId === myPlayerId) {
        if (!myPlayer || (p.score && myPlayer.score && p.score > myPlayer.score)) {
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
    if(gameState.mode==='space') {
      for(const text of this.textPool.values()) text.visible=false;
      return;
    }

    const isAgar = gameState.mode === 'agar' && gameState.modeState && gameState.modeState.cells;
    const entities = isAgar
      ? gameState.modeState.cells
      : (gameState.players || []);

    const activeIds = new Set();

    // In Agar mode, draw merging bridges between touching cells of the same player
    if (isAgar && entities.length > 1) {
      for (let i = 0; i < entities.length; i++) {
        const e1 = entities[i];
        const c1 = this.entities.get(e1.id) || e1;
        for (let j = i + 1; j < entities.length; j++) {
          const e2 = entities[j];
          if (e1.playerId === e2.playerId) {
            const c2 = this.entities.get(e2.id) || e2;
            const dist = Math.hypot(c2.x - c1.x, c2.y - c1.y);
            const r1 = c1.r || 18;
            const r2 = c2.r || 18;
            if (dist < (r1 + r2) * 1.05 && dist > 1) {
              const hexColor = this.parseColorToHex(e1.color || '#3b82f6');
              const bridgeWidth = Math.min(r1, r2) * (1 - dist / ((r1 + r2) * 1.15));
              if (bridgeWidth > 2) {
                g.lineStyle(bridgeWidth, hexColor, 0.45);
                g.moveTo(c1.x, c1.y);
                g.lineTo(c2.x, c2.y);
              }
            }
          }
        }
      }
    }

    for (const p of entities) {
      if (p.isAlive === false) continue;
      activeIds.add(p.id);

      const isSpectator = !!p.isSpectator;
      const cached = this.entities.get(p.id) || p;
      const isMe = p.id === myPlayerId || p.playerId === myPlayerId;
      const isVented = !!p.isVented;
      if (isVented && !isMe) continue;

      // Base radius with animated scale bounce and spawn animation
      let radius = isSpectator ? 16 : (cached.r || p.r || 18);
      if (cached.scaleBounce) {
        radius *= cached.scaleBounce;
      }
      if (cached.spawnAnim) {
        const prog = cached.spawnAnim.progress;
        const spawnScale = 0.35 + 0.65 * (prog * (2 - prog)); // easeOutQuad
        radius *= Math.max(0.35, Math.min(1.15, spawnScale));
      }

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
      } else if (isAgar) {
        // --- Agar Organic Blob Cell Rendering ---
        const timeNow = Date.now() / 1000;
        const wobbleMag = (cached.wobbleIntensity || 0) * 2.5 + Math.min(3, (Math.hypot(cached.vx, cached.vy) || 0) * 0.15);

        // 1. Soft Outer Bioluminescent Membrane Glow
        g.lineStyle(isMe ? 3.5 : 2.0, isMe ? 0xfacc15 : 0xffffff, isMe ? 0.95 : 0.7);
        g.beginFill(hexColor, 0.85);

        if (wobbleMag > 0.5) {
          // Organic Wobble Polygon
          const points = 16;
          const step = (Math.PI * 2) / points;
          let firstX = 0;
          let firstY = 0;

          for (let i = 0; i < points; i++) {
            const angle = i * step;
            const wave = Math.sin(angle * 4 + timeNow * 6 + (cached.wobblePhase || 0)) * wobbleMag;
            const rPoint = Math.max(8, radius + wave);
            const px = cached.x + Math.cos(angle) * rPoint;
            const py = cached.y + Math.sin(angle) * rPoint;

            if (i === 0) {
              firstX = px;
              firstY = py;
              g.moveTo(px, py);
            } else {
              g.lineTo(px, py);
            }
          }
          g.lineTo(firstX, firstY);
          g.closePath();
          g.endFill();
        } else {
          // Smooth circle
          g.drawCircle(cached.x, cached.y, radius);
          g.endFill();
        }

        // 2. Inner Glowing Nucleus Core
        g.lineStyle(0);
        g.beginFill(0xffffff, 0.22);
        g.drawCircle(cached.x - radius * 0.2, cached.y - radius * 0.2, radius * 0.45);
        g.endFill();

        // 3. Pulse ring for self
        if (isMe) {
          const pulseRadius = radius + 6 + Math.sin(Date.now() / 300) * 3;
          g.lineStyle(2.5, 0xfacc15, 0.95);
          g.drawCircle(cached.x, cached.y, pulseRadius);
        }
      } else {
        // Standard Disc Body (Puck Football, Sumo, Space)
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
        : (isAgar ? `${p.name || ''}\n${Math.floor(p.score || 0)}` : `${p.avatar || '⚽'}\n${p.name || ''}`);

      if (!textObj) {
        textObj = new PIXI.Text(labelText, {
          fontFamily: 'Outfit, sans-serif',
          fontSize: Math.max(10, Math.floor(radius * 0.75)),
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
        textObj.destroy();
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

      if (p.type === 'ring') {
        p.radius += (p.growth || 3) * (dt * 60);
        p.alpha -= p.decay * (dt * 60);
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        g.lineStyle(p.lineWidth || 2.5, p.hexColor, Math.max(0, Math.min(1, p.alpha)));
        g.drawCircle(p.x, p.y, p.radius);
      } else if (p.type === 'suction_orb') {
        p.progress += (p.decay || 0.045) * (dt * 60);
        if (p.progress >= 1) {
          this.particles.splice(i, 1);
          continue;
        }
        // Smooth cubic easing towards target
        const t = p.progress;
        const ease = t * t * (3 - 2 * t);
        const curX = p.x + (p.targetX - p.x) * ease;
        const curY = p.y + (p.targetY - p.y) * ease;
        const curR = Math.max(3, p.currentRadius * (1 - ease * 0.82));
        const alpha = Math.max(0, 1 - ease * 0.65);

        // Suction tail line to target
        g.lineStyle(2, p.hexColor, alpha * 0.5);
        g.moveTo(curX, curY);
        g.lineTo(p.targetX, p.targetY);

        // Ghost orb
        g.lineStyle(2, 0xffffff, alpha * 0.85);
        g.beginFill(p.hexColor, alpha * 0.7);
        g.drawCircle(curX, curY, curR);
        g.endFill();
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay * (dt * 60);

        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        const hexColor = p.hexColor || this.parseColorToHex(p.color);
        g.lineStyle(0);
        g.beginFill(hexColor, Math.max(0, Math.min(1, p.alpha)));
        g.drawCircle(p.x, p.y, p.radius);
        g.endFill();
      }
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

    if(gameState.mode==='space') {
      clientModeRegistry.getActiveMode('space').renderCanvas(this,ctx,gameState,myPlayerId);
      ctx.restore();ctx.restore();return;
    }

    if (gameState.mode === 'puck') {
      this.renderCanvasPuckPitch(ctx, gameState.modeState);
    } else if (gameState.mode === 'sumo') {
      this.renderCanvasSumoRing(ctx, gameState.modeState);
    } else if (gameState.mode === 'agar') {
      this.renderCanvasAgarArena(ctx, gameState.modeState);
    } else if (gameState.mode === 'space') {
      this.renderCanvasSpaceShip(ctx, gameState.modeState);
    } else if (gameState.mode === 'vampire') {
      this.renderCanvasSpaceShip(ctx, gameState.modeState);
      for (const landmark of gameState.modeState.landmarks || []) {
        ctx.fillStyle = '#cbd5e1'; ctx.font = '16px sans-serif';
        ctx.fillText(`${landmark.icon} ${landmark.name}`, landmark.x - 60, landmark.y);
      }
    } else if (gameState.mode === 'conquest') {
      const mode = gameState.modeState;
      ctx.fillStyle = '#122035'; ctx.fillRect(-mode.width / 2, -mode.height / 2, mode.width, mode.height);
      for (const territory of mode.territories || []) {
        ctx.beginPath(); ctx.arc(territory.x, territory.y, 28, 0, Math.PI * 2);
        ctx.fillStyle = territory.color; ctx.fill();
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(territory.name, territory.x, territory.y - 36);
        ctx.fillText(String(territory.points), territory.x, territory.y + 5);
      }
    }

    this.renderCanvasParticles(ctx, dt);

    if (gameState.players && gameState.mode !== 'conquest') {
      const entities = gameState.mode === 'agar' ? gameState.modeState.cells : gameState.players;
      for (const p of entities || []) {
        if (!p.isVented && (p.isAlive !== false || p.id === myPlayerId)) {
          const cached = this.entities.get(p.id) || p;
          this.renderCanvasPlayer(ctx, { ...p, x: cached.x, y: cached.y }, (p.playerId || p.id) === myPlayerId);
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
    ctx.font = '18px sans-serif'; ctx.textAlign = 'center';
    for (const station of modeState.taskStations || []) {
      ctx.fillStyle = '#facc15'; ctx.fillText(station.icon || '⚙️', station.x, station.y);
    }
    for (const body of modeState.bodies || []) {
      ctx.fillStyle = '#ef4444'; ctx.fillText('💀', body.x, body.y);
    }
    for (const vent of modeState.vents || []) {
      ctx.fillStyle = '#475569'; ctx.fillRect(vent.x - 15, vent.y - 10, 30, 20);
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
