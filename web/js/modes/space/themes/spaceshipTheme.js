// spaceshipTheme.js - Sci-Fi Spaceship Hull, Reactors, Medbay, and Starfield Renderer

export class SpaceshipThemeRenderer {
  constructor() {
    this.mistParticles = Array.from({ length: 45 }, () => ({
      x: (Math.random() - 0.5) * 2600,
      y: (Math.random() - 0.5) * 1600,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.3,
      r: 40 + Math.random() * 60,
      alpha: 0.08 + Math.random() * 0.12
    }));

    const starColors = [0xffffff, 0x7dd3fc, 0xbae6fd, 0xc084fc, 0xfef08a];
    this.stars = Array.from({ length: 320 }, () => ({
      x: (Math.random() - 0.5) * 3600,
      y: (Math.random() - 0.5) * 2400,
      size: 0.8 + Math.random() * 2.2,
      baseAlpha: 0.35 + Math.random() * 0.65,
      speed: 1.5 + Math.random() * 4,
      phase: Math.random() * Math.PI * 2,
      color: starColors[Math.floor(Math.random() * starColors.length)]
    }));

    this.majorStars = Array.from({ length: 18 }, () => ({
      x: (Math.random() - 0.5) * 3400,
      y: (Math.random() - 0.5) * 2200,
      size: 3 + Math.random() * 3,
      color: 0x38bdf8,
      phase: Math.random() * Math.PI * 2
    }));

    this.asteroids = [
      { x: -1280, y: -650, r: 36, rot: 0.4, rotSpeed: 0.003, verts: this.createAsteroidVerts(36) },
      { x: -1350, y: -400, r: 24, rot: 1.2, rotSpeed: -0.004, verts: this.createAsteroidVerts(24) },
      { x: -1250, y: 550, r: 30, rot: 2.1, rotSpeed: 0.002, verts: this.createAsteroidVerts(30) },
      { x: 1280, y: 620, r: 40, rot: 0.8, rotSpeed: -0.003, verts: this.createAsteroidVerts(40) },
      { x: 1320, y: 380, r: 22, rot: 2.9, rotSpeed: 0.005, verts: this.createAsteroidVerts(22) },
      { x: -400, y: -820, r: 28, rot: 1.5, rotSpeed: 0.002, verts: this.createAsteroidVerts(28) },
      { x: 420, y: 840, r: 34, rot: 0.2, rotSpeed: -0.002, verts: this.createAsteroidVerts(34) },
      { x: 1300, y: -450, r: 26, rot: 3.4, rotSpeed: 0.004, verts: this.createAsteroidVerts(26) }
    ];

    this.shootingStar = {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      len: 0,
      alpha: 0,
      timer: 2
    };

    this.bedSprites = [];
    this.reactorSprite = null;
    this.crateSprites = [];
  }

  createAsteroidVerts(radius) {
    const numPoints = 8;
    const verts = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const rad = radius * (0.75 + Math.random() * 0.45);
      verts.push({ x: Math.cos(angle) * rad, y: Math.sin(angle) * rad });
    }
    return verts;
  }

  setupSprites(propsContainer) {
    if (!propsContainer || typeof window.PIXI === 'undefined') return;

    const bedTex = PIXI.Texture.from('assets/space/bed.png');
    const reactorTex = PIXI.Texture.from('assets/space/reactor_core.png');
    const crateTex = PIXI.Texture.from('assets/space/crate.png');

    const bedPositions = [
      { x: -170, y: -690 },
      { x: -75, y: -690 },
      { x: 170, y: -690 }
    ];
    this.bedSprites = bedPositions.map(pos => {
      const sp = new PIXI.Sprite(bedTex);
      sp.anchor.set(0.5, 0.5);
      sp.x = pos.x;
      sp.y = pos.y;
      sp.width = 54;
      sp.height = 84;
      propsContainer.addChild(sp);
      return sp;
    });

    this.reactorSprite = new PIXI.Sprite(reactorTex);
    this.reactorSprite.anchor.set(0.5, 0.5);
    this.reactorSprite.x = -910;
    this.reactorSprite.y = 0;
    this.reactorSprite.width = 136;
    this.reactorSprite.height = 136;
    propsContainer.addChild(this.reactorSprite);

    const cratePositions = [
      { x: 620, y: 700, w: 64, h: 54 },
      { x: 810, y: 700, w: 68, h: 58 }
    ];
    this.crateSprites = cratePositions.map(c => {
      const sp = new PIXI.Sprite(crateTex);
      sp.anchor.set(0.5, 0.5);
      sp.x = c.x;
      sp.y = c.y;
      sp.width = c.w;
      sp.height = c.h;
      propsContainer.addChild(sp);
      return sp;
    });
  }

  renderEnvironment(g, s, t, animTime) {
    // 1. Deep Space Cosmic Background
    g.beginFill(0x02040a);
    g.drawRect(-1800, -1300, 3600, 2600);
    g.endFill();

    // 2. Cosmic Nebula Clouds
    const nebulas = [
      { x: -900, y: -600, r: 520, color: 0x4f46e5, alpha: 0.08 },
      { x: 850, y: -500, r: 480, color: 0x06b6d4, alpha: 0.07 },
      { x: 600, y: 700, r: 550, color: 0x7c3aed, alpha: 0.08 },
      { x: -800, y: 650, r: 460, color: 0xdb2777, alpha: 0.06 },
      { x: 0, y: 0, r: 600, color: 0x1e1b4b, alpha: 0.12 }
    ];
    nebulas.forEach(neb => {
      g.beginFill(neb.color, neb.alpha);
      g.drawCircle(neb.x, neb.y, neb.r);
      g.beginFill(neb.color, neb.alpha * 0.5);
      g.drawCircle(neb.x, neb.y, neb.r * 1.5);
      g.endFill();
    });

    // 3. Twinkling Stars
    this.stars.forEach(st => {
      const alpha = st.baseAlpha + Math.sin(animTime * st.speed + st.phase) * 0.35;
      g.beginFill(st.color, Math.max(0.1, Math.min(1, alpha)));
      g.drawCircle(st.x, st.y, st.size);
      g.endFill();
    });

    // 4. Major Bright Stars with Spikes
    this.majorStars.forEach(mst => {
      const pulse = 1 + Math.sin(animTime * 3 + mst.phase) * 0.25;
      g.lineStyle(1.2, 0xffffff, 0.7 * pulse);
      g.moveTo(mst.x - 10 * pulse, mst.y);
      g.lineTo(mst.x + 10 * pulse, mst.y);
      g.moveTo(mst.x, mst.y - 10 * pulse);
      g.lineTo(mst.x, mst.y + 10 * pulse);
      g.lineStyle(0);
      g.beginFill(0xffffff, 0.95);
      g.drawCircle(mst.x, mst.y, mst.size * 0.6);
      g.endFill();
    });

    // 5. Floating Asteroids
    this.asteroids.forEach(ast => {
      ast.rot += ast.rotSpeed;
      g.lineStyle(2, 0x475569, 0.7);
      g.beginFill(0x1e293b, 0.9);
      if (ast.verts && ast.verts.length > 0) {
        const cos = Math.cos(ast.rot);
        const sin = Math.sin(ast.rot);
        const transformed = ast.verts.map(v => ({
          x: ast.x + (v.x * cos - v.y * sin),
          y: ast.y + (v.x * sin + v.y * cos)
        }));
        g.moveTo(transformed[0].x, transformed[0].y);
        for (let i = 1; i < transformed.length; i++) {
          g.lineTo(transformed[i].x, transformed[i].y);
        }
        g.lineTo(transformed[0].x, transformed[0].y);
      } else {
        g.drawCircle(ast.x, ast.y, ast.r);
      }
      g.endFill();
    });

    // 6. Hull Outer Shell & Bevel
    g.lineStyle(24, 0x0f172a, 0.9);
    g.drawRoundedRect(-1080, -780, 2160, 1560, 48);

    g.lineStyle(6, 0x38bdf8, 0.85);
    g.drawRoundedRect(-1080, -780, 2160, 1560, 48);

    // 7. Render Room Zones
    this.renderRooms(g, s.rooms || [], t, animTime);
    this.renderDoors(g, s.doors || [], t);
    this.renderVents(g, s.vents || [], t, animTime);
    this.renderTaskStations(g, s.taskStations || [], animTime);
  }

  renderRooms(g, rooms, t, animTime) {
    rooms.forEach(r => {
      // Room floor tile
      g.lineStyle(2, 0x1e293b, 0.9);
      g.beginFill(0x0f172a, 0.95);
      g.drawRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 16);
      g.endFill();

      // Floor grid tiles
      g.lineStyle(1, 0x1e293b, 0.35);
      for (let x = r.x - r.w / 2 + 50; x < r.x + r.w / 2; x += 50) {
        g.moveTo(x, r.y - r.h / 2 + 6);
        g.lineTo(x, r.y + r.h / 2 - 6);
      }
      for (let y = r.y - r.h / 2 + 50; y < r.y + r.h / 2; y += 50) {
        g.moveTo(r.x - r.w / 2 + 6, y);
        g.lineTo(r.x + r.w / 2 - 6, y);
      }

      // Room Specific Sci-Fi Decors
      if (r.id === 'cafeteria') {
        // Cafeteria Central Emergency Meeting Table
        const tablePulse = 1 + Math.sin(animTime * 3) * 0.05;
        g.lineStyle(4, 0xef4444, 0.85);
        g.beginFill(0x1e293b, 0.95);
        g.drawCircle(0, 0, 75);
        g.endFill();

        g.lineStyle(3, 0xef4444, 0.9);
        g.beginFill(0xdc2626, 0.95);
        g.drawCircle(0, 0, 32 * tablePulse);
        g.endFill();

        g.lineStyle(2, 0xfacc15, 0.9);
        g.drawCircle(0, 0, 48);
      } else if (r.id === 'reactor') {
        // Reactor Glow
        const pulse = 68 + Math.sin(animTime * 6) * 12;
        g.lineStyle(3, 0x06b6d4, 0.9);
        g.beginFill(0x0891b2, 0.3);
        g.drawCircle(r.x, r.y, pulse);
        g.endFill();
      } else if (r.id === 'shields') {
        // Shields Hex Core
        g.lineStyle(3, 0x06b6d4, 0.85);
        g.drawCircle(r.x, r.y, 45);
        g.drawCircle(r.x, r.y, 65);
      }
    });
  }

  renderDoors(g, doors, t) {
    doors.forEach(d => {
      const isH = d.orientation === 'h';
      const isLocked = !!d.isLocked;
      const isOpen = !!d.isOpen;
      const dw = d.w || (isH ? 130 : 28);
      const dh = d.h || (isH ? 28 : 110);

      if (isLocked) {
        // Red locked laser barrier
        g.lineStyle(4, 0xef4444, 0.95);
        g.beginFill(0xdc2626, 0.85);
        g.drawRoundedRect(d.x - dw / 2, d.y - dh / 2, dw, dh, 4);
        g.endFill();

        // Lock X cross
        g.lineStyle(2.5, 0xffffff, 0.95);
        g.moveTo(d.x - 12, d.y - 12);
        g.lineTo(d.x + 12, d.y + 12);
        g.moveTo(d.x + 12, d.y - 12);
        g.lineTo(d.x - 12, d.y + 12);
      } else if (isOpen) {
        // Open sliding door frame
        g.lineStyle(2, 0x10b981, 0.7);
        g.beginFill(0x064e3b, 0.3);
        g.drawRoundedRect(d.x - dw / 2, d.y - dh / 2, dw, dh, 4);
        g.endFill();

        // Green pass light
        g.beginFill(0x10b981, 0.9);
        g.drawCircle(d.x, d.y, 4);
        g.endFill();
      } else {
        // Closed steel sliding blast door
        g.lineStyle(3, 0x475569, 0.9);
        g.beginFill(0x334155, 0.95);
        g.drawRoundedRect(d.x - dw / 2, d.y - dh / 2, dw, dh, 4);
        g.endFill();

        // Door center stripe
        g.lineStyle(2, 0x0284c7, 0.8);
        if (isH) {
          g.moveTo(d.x - dw / 2 + 6, d.y);
          g.lineTo(d.x + dw / 2 - 6, d.y);
        } else {
          g.moveTo(d.x, d.y - dh / 2 + 6);
          g.lineTo(d.x, d.y + dh / 2 - 6);
        }
      }
    });
  }

  renderVents(g, vents, t, animTime) {
    vents.forEach(v => {
      g.lineStyle(2, 0x64748b, 0.85);
      g.beginFill(0x1e293b, 0.9);
      g.drawRoundedRect(v.x - 22, v.y - 18, 44, 36, 6);
      g.endFill();

      // Vent steel grills
      g.lineStyle(2, 0x94a3b8, 0.9);
      for (let y = v.y - 10; y <= v.y + 10; y += 7) {
        g.moveTo(v.x - 15, y);
        g.lineTo(v.x + 15, y);
      }
    });
  }

  renderTaskStations(g, taskStations, animTime) {
    taskStations.forEach(ts => {
      const pulse = 1 + Math.sin(animTime * 4) * 0.15;
      g.lineStyle(2.5, 0xfacc15, 0.85);
      g.beginFill(0x78350f, 0.6);
      g.drawCircle(ts.x, ts.y, 22 * pulse);
      g.endFill();

      g.lineStyle(2, 0xfef08a, 0.95);
      g.beginFill(0xf59e0b, 0.95);
      g.drawCircle(ts.x, ts.y, 12);
      g.endFill();
    });
  }
}
