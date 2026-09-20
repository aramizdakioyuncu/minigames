// spaceClient.js - Frontend Client Module for Uzay Casusu (Space Infiltration)

import { BaseClientMode } from './BaseClientMode.js';

export class SpaceClientMode extends BaseClientMode {
  constructor() {
    super('space');
    this.beaconPulse = 0;
    this.fogTime = 0;
    this.animTime = 0;
    // Ambient cosmic mist particles
    this.mistParticles = Array.from({ length: 45 }, () => ({
      x: (Math.random() - 0.5) * 2600,
      y: (Math.random() - 0.5) * 1600,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.3,
      r: 40 + Math.random() * 60,
      alpha: 0.08 + Math.random() * 0.12
    }));
  }

  isFixedArena() {
    return false;
  }

  getArenaDimensions(gameState) {
    const s = (gameState && gameState.modeState) || {};
    return {
      width: s.width || 2800,
      height: s.height || 1800
    };
  }

  onActivate(roomData, ui) {
    if (ui.hudPuck) ui.hudPuck.classList.add('hidden');
    if (ui.hudSumo) ui.hudSumo.classList.add('hidden');
    if (ui.hudAgar) ui.hudAgar.classList.add('hidden');
    if (ui.hudSpace) ui.hudSpace.classList.remove('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.add('hidden');
    if (ui.hudTeamSwitcher) ui.hudTeamSwitcher.classList.add('hidden');
    if (ui.hudChat) ui.hudChat.classList.add('hidden');
  }

  onDeactivate(ui) {
    if (ui.hudSpace) ui.hudSpace.classList.add('hidden');
    if (ui.modalMeeting) ui.modalMeeting.classList.add('hidden');
    if (ui.modalTaskInteractive) ui.modalTaskInteractive.classList.add('hidden');
    if (ui.hudChat) ui.hudChat.classList.remove('hidden');
  }

  renderEnvironment(renderer, g, gameState) {
    const s = (gameState && gameState.modeState) || {};
    const w = s.width || 2800;
    const h = s.height || 1800;
    const hw = w / 2;
    const hh = h / 2;
    const rooms = s.rooms || [];
    const walls = s.walls || [];
    this.animTime += 0.04;

    // 1. Deep Space Background Void
    g.beginFill(0x02040a);
    g.drawRect(-hw - 300, -hh - 300, w + 600, h + 600);
    g.endFill();

    // Starfield Points
    for (let i = -hw; i < hw; i += 280) {
      for (let j = -hh; j < hh; j += 280) {
        g.beginFill(0xffffff, 0.25);
        g.drawCircle(i + (Math.sin(i * 13 + j) * 80), j + (Math.cos(j * 17 + i) * 80), 1.5);
        g.endFill();
      }
    }

    // 2. Spaceship Floor Deck Plate
    g.beginFill(0x090e1a);
    g.drawRoundedRect(-hw + 30, -hh + 30, w - 60, h - 60, 32);
    g.endFill();

    // Corridor Gridlines
    g.lineStyle(1, 0x1e293b, 0.3);
    for (let x = -hw + 100; x < hw - 100; x += 120) {
      g.moveTo(x, -hh + 50); g.lineTo(x, hh - 50);
    }
    for (let y = -hh + 100; y < hh - 100; y += 120) {
      g.moveTo(-hw + 50, y); g.lineTo(hw - 50, y);
    }

    // 3. Themed Room Floor Plates
    rooms.forEach(r => {
      let roomColor = 0x131c2e;
      let borderColor = 0x0284c7;

      if (r.id === 'reactor') { roomColor = 0x142820; borderColor = 0x10b981; }
      else if (r.id === 'electrical') { roomColor = 0x241d13; borderColor = 0xf59e0b; }
      else if (r.id === 'medbay') { roomColor = 0x0f2428; borderColor = 0x06b6d4; }
      else if (r.id === 'cockpit') { roomColor = 0x161c33; borderColor = 0x6366f1; }
      else if (r.id === 'security') { roomColor = 0x24151e; borderColor = 0xf43f5e; }
      else if (r.id === 'o2') { roomColor = 0x10281b; borderColor = 0x22c55e; }
      else if (r.id === 'storage') { roomColor = 0x201c18; borderColor = 0xd97706; }

      g.beginFill(roomColor, 0.65);
      g.drawRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 16);
      g.endFill();

      // Subtle Room Border
      g.lineStyle(2, borderColor, 0.45);
      g.drawRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 16);
    });

    // 4. Room Props & Furniture Decorations
    this.renderRoomDecorations(g, s);

    // 5. Cafeteria Center Meeting Table
    g.lineStyle(4, 0x0284c7, 0.95);
    g.beginFill(0x0f172a, 0.95);
    g.drawCircle(0, -30, 60);
    g.endFill();

    // Emergency Red Button on Center Table
    g.lineStyle(2.5, 0xef4444, 1);
    g.beginFill(0xdc2626, 0.95);
    g.drawCircle(0, -30, 18);
    g.endFill();

    // 5. Automatic Sliding Airlock Doors
    const doors = s.doors || [];
    doors.forEach(d => {
      const isH = d.orientation === 'h';
      const isOpen = d.isOpen;
      const dw = d.w || (isH ? 180 : 28);
      const dh = d.h || (isH ? 28 : 160);

      // Outer Frame
      g.lineStyle(2, isOpen ? 0x10b981 : 0xef4444, 0.85);
      g.beginFill(0x0f172a, 0.9);
      g.drawRect(d.x - dw / 2, d.y - dh / 2, dw, dh);
      g.endFill();

      // Sliding blast panels
      if (!isOpen) {
        g.lineStyle(2, 0x64748b, 0.9);
        g.beginFill(0x334155, 0.95);
        g.drawRect(d.x - dw / 2 + 2, d.y - dh / 2 + 2, dw - 4, dh - 4);
        g.endFill();

        // Center seam & Hazard Stripes
        g.lineStyle(2, 0xfacc15, 0.8);
        if (isH) {
          g.moveTo(d.x, d.y - dh / 2 + 2);
          g.lineTo(d.x, d.y + dh / 2 - 2);
        } else {
          g.moveTo(d.x - dw / 2 + 2, d.y);
          g.lineTo(d.x + dw / 2 - 2, d.y);
        }
      } else {
        // Open sliding state (split panels on sides)
        g.lineStyle(1, 0x10b981, 0.7);
        g.beginFill(0x1e293b, 0.7);
        if (isH) {
          g.drawRect(d.x - dw / 2, d.y - dh / 2, 24, dh);
          g.drawRect(d.x + dw / 2 - 24, d.y - dh / 2, 24, dh);
        } else {
          g.drawRect(d.x - dw / 2, d.y - dh / 2, dw, 24);
          g.drawRect(d.x - dw / 2, d.y + dh / 2 - 24, dw, 24);
        }
        g.endFill();
      }

      // Status LED indicator
      g.lineStyle(0);
      g.beginFill(isOpen ? 0x22c55e : 0xef4444, 1);
      g.drawCircle(d.x, d.y, 4);
      g.endFill();
    });

    // 6. Starship Hull & Room Walls
    g.lineStyle(7, 0x334155, 1);
    walls.forEach(w => {
      if (w.p1 && w.p2) {
        g.moveTo(w.p1.x, w.p1.y);
        g.lineTo(w.p2.x, w.p2.y);
      }
    });

    // Outer hull glowing neon seam
    g.lineStyle(2, 0x38bdf8, 0.55);
    walls.forEach(w => {
      if (w.p1 && w.p2) {
        g.moveTo(w.p1.x, w.p1.y);
        g.lineTo(w.p2.x, w.p2.y);
      }
    });
  }

  renderRoomDecorations(g, s) {
    const t = this.animTime;

    // ==========================================
    // 1. REVİR / MEDBAY (Revir Yatakları & Tıbbi Cihazlar)
    // ==========================================
    // Medical Cross Logo on MedBay Floor
    g.lineStyle(0);
    g.beginFill(0x06b6d4, 0.18);
    g.drawRect(-15, -635, 30, 10);
    g.drawRect(-5, -645, 10, 30);
    g.endFill();

    // 3 Detailed Hospital Beds (Revir Yatakları)
    const beds = [
      { x: -170, y: -690 },
      { x: -75, y: -690 },
      { x: 170, y: -690 }
    ];

    beds.forEach((bed, idx) => {
      // Bed Soft Shadow
      g.lineStyle(0);
      g.beginFill(0x000000, 0.45);
      g.drawRoundedRect(bed.x - 24, bed.y - 36, 48, 76, 6);
      g.endFill();

      // Bed Steel Chassis Frame
      g.lineStyle(2, 0x475569, 1);
      g.beginFill(0x1e293b, 1);
      g.drawRoundedRect(bed.x - 22, bed.y - 35, 44, 70, 5);
      g.endFill();

      // Mattress Base
      g.lineStyle(1, 0x38bdf8, 0.7);
      g.beginFill(0x0f172a, 1);
      g.drawRoundedRect(bed.x - 19, bed.y - 32, 38, 64, 4);
      g.endFill();

      // Fluffy White Pillow (Yastık)
      g.lineStyle(1, 0xcfd8dc, 0.9);
      g.beginFill(0xf8fafc, 1);
      g.drawRoundedRect(bed.x - 14, bed.y - 28, 28, 14, 3);
      g.endFill();

      // Hospital Blanket Fold (Yatak Örtüsü/Battaniye)
      g.lineStyle(1, 0x0284c7, 0.9);
      g.beginFill(0x0369a1, 0.85);
      g.drawRoundedRect(bed.x - 17, bed.y - 8, 34, 36, 3);
      g.endFill();

      // Medical IV Drip Pole (Serum Askısı)
      g.lineStyle(2, 0x94a3b8, 0.9);
      g.moveTo(bed.x + 25, bed.y - 15);
      g.lineTo(bed.x + 25, bed.y - 35);
      // IV Fluid Bag
      g.lineStyle(1, 0x38bdf8, 1);
      g.beginFill(0x38bdf8, 0.75);
      g.drawRoundedRect(bed.x + 22, bed.y - 32, 6, 10, 2);
      g.endFill();

      // Vital Sign EKG Wall Monitor above Bed (EKG Nabız Monitörü)
      g.lineStyle(1.5, 0x06b6d4, 0.9);
      g.beginFill(0x020617, 1);
      g.drawRoundedRect(bed.x - 16, bed.y - 54, 32, 15, 3);
      g.endFill();

      // Animated ECG heartbeat waveform (Yeşil Kalp Grafiği)
      g.lineStyle(1.2, 0x22c55e, 0.95);
      g.moveTo(bed.x - 12, bed.y - 46);
      g.lineTo(bed.x - 6, bed.y - 46);
      g.lineTo(bed.x - 3, bed.y - 50 - Math.sin(t * 5 + idx) * 2);
      g.lineTo(bed.x, bed.y - 42 + Math.sin(t * 5 + idx) * 2);
      g.lineTo(bed.x + 4, bed.y - 46);
      g.lineTo(bed.x + 12, bed.y - 46);
    });

    // MedBay Bio-Scan Diagnostic Chamber (Biyolojik Tarama Platformu)
    const scanX = 65, scanY = -610;
    // Scanner Pad Base
    g.lineStyle(3, 0x06b6d4, 0.9);
    g.beginFill(0x083344, 0.9);
    g.drawCircle(scanX, scanY, 34);
    g.endFill();

    // Concentric Holo Scan Ring with Pulse
    const scanPulse = 16 + Math.sin(t * 3) * 8;
    g.lineStyle(2, 0x38bdf8, 0.6 + Math.sin(t * 3) * 0.3);
    g.drawCircle(scanX, scanY, scanPulse);

    // Rotating Holographic Scan Line
    const scanAngle = t * 2.5;
    g.lineStyle(2, 0x22d3ee, 0.85);
    g.moveTo(scanX, scanY);
    g.lineTo(scanX + Math.cos(scanAngle) * 30, scanY + Math.sin(scanAngle) * 30);

    // First Aid Wall Cabinet (İlk Yardım Dolabı)
    g.lineStyle(2, 0xe2e8f0, 0.8);
    g.beginFill(0x1e293b, 1);
    g.drawRoundedRect(-255, -640, 28, 38, 4);
    g.endFill();
    // Red Cross Symbol
    g.lineStyle(0);
    g.beginFill(0xef4444, 1);
    g.drawRect(-245, -623, 8, 4);
    g.drawRect(-243, -625, 4, 8);
    g.endFill();

    // ==========================================
    // 2. KAFETERYA (Cafeteria: Yemek Masaları & Otomatlar)
    // ==========================================
    const cafeTables = [
      { x: -190, y: -160 },
      { x: 190, y: -160 }
    ];

    cafeTables.forEach(tab => {
      // Upper Bench
      g.lineStyle(1, 0x475569, 1);
      g.beginFill(0x1e293b, 1);
      g.drawRoundedRect(tab.x - 45, tab.y - 32, 90, 10, 3);
      // Lower Bench
      g.drawRoundedRect(tab.x - 45, tab.y + 22, 90, 10, 3);
      g.endFill();

      // Table Surface
      g.lineStyle(2, 0x0284c7, 0.85);
      g.beginFill(0x0f172a, 1);
      g.drawRoundedRect(tab.x - 50, tab.y - 18, 100, 36, 5);
      g.endFill();

      // Coffee Cups / Trays on Table
      g.lineStyle(0);
      g.beginFill(0x38bdf8, 0.85);
      g.drawCircle(tab.x - 20, tab.y, 4);
      g.drawCircle(tab.x + 20, tab.y, 4);
      g.beginFill(0xf59e0b, 0.85);
      g.drawRect(tab.x - 6, tab.y - 5, 12, 10);
      g.endFill();
    });

    // Vending / Snack Machines at Cafeteria Top Wall
    const vendings = [
      { x: -260, y: -260, col: 0x3b82f6 },
      { x: 260, y: -260, col: 0xec4899 }
    ];
    vendings.forEach(v => {
      g.lineStyle(2, v.col, 0.9);
      g.beginFill(0x111827, 1);
      g.drawRoundedRect(v.x - 20, v.y - 15, 40, 30, 4);
      g.endFill();
      // Glowing Glass Front
      g.lineStyle(1, v.col, 0.5);
      g.beginFill(v.col, 0.3 + Math.sin(t * 2 + v.x) * 0.1);
      g.drawRect(v.x - 15, v.y - 10, 30, 15);
      g.endFill();
    });

    // Swivel Chairs around Emergency Meeting Table (x: 0, y: -30)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const cx = Math.cos(a) * 85;
      const cy = -30 + Math.sin(a) * 85;
      g.lineStyle(1.5, 0x38bdf8, 0.7);
      g.beginFill(0x1e293b, 1);
      g.drawCircle(cx, cy, 9);
      g.endFill();
    }

    // ==========================================
    // 3. REAKTÖR & MOTOR (Reactor: Plazma Çekirdeği & Bobinler)
    // ==========================================
    const rCoreX = -910, rCoreY = 0;
    // Outer Containment Ring
    g.lineStyle(5, 0x334155, 1);
    g.beginFill(0x064e3b, 0.7);
    g.drawCircle(rCoreX, rCoreY, 65);
    g.endFill();

    // Hazard Stripes Rim
    g.lineStyle(3, 0xfacc15, 0.75);
    g.drawCircle(rCoreX, rCoreY, 52);

    // Glowing Plasma Vortex
    const corePulse = 28 + Math.sin(t * 4) * 6;
    g.lineStyle(3, 0x34d399, 0.9);
    g.beginFill(0x10b981, 0.4 + Math.sin(t * 4) * 0.2);
    g.drawCircle(rCoreX, rCoreY, corePulse);
    g.endFill();

    // Spinning Magnetic Flux Nodes
    for (let k = 0; k < 4; k++) {
      const nodeAng = t * 1.8 + (k * Math.PI / 2);
      const nx = rCoreX + Math.cos(nodeAng) * 42;
      const ny = rCoreY + Math.sin(nodeAng) * 42;
      g.lineStyle(0);
      g.beginFill(0x6ee7b7, 1);
      g.drawCircle(nx, ny, 5);
      g.endFill();
    }

    // Coolant Manifolds & Conduit Pipes
    const manifolds = [{ y: -300 }, { y: 300 }];
    manifolds.forEach(m => {
      g.lineStyle(3, 0x10b981, 0.8);
      g.beginFill(0x1e293b, 1);
      g.drawRoundedRect(rCoreX - 60, m.y - 25, 120, 50, 6);
      g.endFill();

      // Conduit Glow Bars
      g.lineStyle(2, 0x34d399, 0.7);
      g.moveTo(rCoreX - 45, m.y);
      g.lineTo(rCoreX + 45, m.y);
    });

    // ==========================================
    // 4. ELEKTRİK (Electrical: Jeneratör & Sigortalar)
    // ==========================================
    // Heavy Generator Unit (x: -830, y: 640)
    g.lineStyle(3, 0xf59e0b, 0.9);
    g.beginFill(0x1f2937, 1);
    g.drawRoundedRect(-870, 605, 80, 70, 6);
    g.endFill();

    // Generator Cooling Slits
    g.lineStyle(1.5, 0xfbbf24, 0.7);
    for (let cy = 618; cy <= 660; cy += 10) {
      g.moveTo(-860, cy);
      g.lineTo(-800, cy);
    }

    // Breaker Panels on Top Wall (-640, 400)
    g.lineStyle(2, 0xd97706, 0.8);
    g.beginFill(0x111827, 1);
    g.drawRoundedRect(-670, 385, 60, 30, 4);
    g.endFill();
    const fuseColors = [0xef4444, 0x3b82f6, 0xeab308, 0x10b981];
    fuseColors.forEach((fc, fi) => {
      g.lineStyle(0);
      g.beginFill(fc, 0.9);
      g.drawRect(-662 + fi * 12, 395, 6, 10);
      g.endFill();
    });

    // Floor Cable Bundles (Kablolar)
    g.lineStyle(2.5, 0xef4444, 0.65);
    g.moveTo(-640, 415);
    g.quadraticCurveTo(-660, 500, -830, 605);
    g.lineStyle(2.5, 0x3b82f6, 0.65);
    g.moveTo(-630, 415);
    g.quadraticCurveTo(-620, 520, -730, 620);

    // ==========================================
    // 5. KOKPİT & SEYİR (Cockpit: Hologram & Pilot Konsolları)
    // ==========================================
    // Holographic Star Chart Galaxy Projector (x: 960, y: 0)
    const holoX = 960, holoY = 0;
    g.lineStyle(2, 0x818cf8, 0.8);
    g.beginFill(0x1e1b4b, 0.9);
    g.drawCircle(holoX, holoY, 26);
    g.endFill();

    // Rotating 3D Planetary Orbit Rings
    g.lineStyle(1.5, 0x6366f1, 0.6 + Math.sin(t * 3) * 0.3);
    g.drawEllipse(holoX, holoY, 20, 9);
    g.drawEllipse(holoX, holoY, 9, 20);

    // Orbiting Satellite dot
    const satAng = t * 2;
    g.lineStyle(0);
    g.beginFill(0xa5b4fc, 1);
    g.drawCircle(holoX + Math.cos(satAng) * 20, holoY + Math.sin(satAng) * 9, 3);
    g.endFill();

    // Pilot Flight Consoles
    const consoles = [{ x: 1080, y: -160 }, { x: 1080, y: 160 }];
    consoles.forEach(con => {
      g.lineStyle(2, 0x6366f1, 0.9);
      g.beginFill(0x0f172a, 1);
      g.drawRoundedRect(con.x - 30, con.y - 45, 60, 90, 6);
      g.endFill();

      // Flight Displays
      g.lineStyle(1, 0x38bdf8, 0.8);
      g.beginFill(0x0284c7, 0.3);
      g.drawRect(con.x - 22, con.y - 36, 44, 28);
      g.drawRect(con.x - 22, con.y + 2, 44, 28);
      g.endFill();
    });

    // Captain's Command Chair (x: 830, y: 0)
    g.lineStyle(2, 0x6366f1, 0.9);
    g.beginFill(0x312e81, 1);
    g.drawCircle(830, 0, 16);
    g.endFill();
    g.lineStyle(2, 0x4f46e5, 1);
    g.drawRoundedRect(820, -18, 20, 6, 2);
    g.drawRoundedRect(820, 12, 20, 6, 2);

    // ==========================================
    // 6. GÜVENLİK (Security: CCTV Masası & Serverlar)
    // ==========================================
    // CCTV Security Desk with 4 Monitors (x: 0, y: 530)
    g.lineStyle(2, 0xf43f5e, 0.85);
    g.beginFill(0x1e293b, 1);
    g.drawRoundedRect(-60, 515, 120, 32, 4);
    g.endFill();

    // 4 Camera Screens
    for (let m = 0; m < 4; m++) {
      const sx = -48 + m * 26;
      g.lineStyle(1, 0xf43f5e, 0.7);
      g.beginFill(0x18181b, 1);
      g.drawRect(sx, 520, 20, 14);
      g.endFill();
      g.lineStyle(1, 0x22c55e, 0.6);
      g.moveTo(sx + 3, 527);
      g.lineTo(sx + 17, 527);
    }

    // Mainframe Server Racks (x: -180, y: 620 & 700)
    const servers = [{ x: -180, y: 610 }, { x: -180, y: 690 }];
    servers.forEach(srv => {
      g.lineStyle(2, 0x64748b, 0.9);
      g.beginFill(0x0f172a, 1);
      g.drawRoundedRect(srv.x - 20, srv.y - 25, 40, 50, 4);
      g.endFill();

      // Blinking Server LEDs
      for (let ly = srv.y - 18; ly <= srv.y + 18; ly += 9) {
        const ledCol = Math.sin(t * 5 + ly) > 0 ? 0x22c55e : (Math.sin(t * 3 + ly) > 0 ? 0xeab308 : 0xef4444);
        g.lineStyle(0);
        g.beginFill(ledCol, 1);
        g.drawCircle(srv.x - 10, ly, 2.5);
        g.drawCircle(srv.x, ly, 2.5);
        g.drawCircle(srv.x + 10, ly, 2.5);
        g.endFill();
      }
    });

    // ==========================================
    // 7. O2 & YAŞAM DESTEK (O2: Oksijen Tankları & Sera)
    // ==========================================
    const tanks = [{ x: 610, y: -680 }, { x: 670, y: -680 }];
    tanks.forEach(tk => {
      g.lineStyle(2, 0x22c55e, 0.9);
      g.beginFill(0x064e3b, 1);
      g.drawRoundedRect(tk.x - 14, tk.y - 25, 28, 50, 10);
      g.endFill();

      // Pressure Gauge
      g.lineStyle(1.5, 0xffffff, 0.8);
      g.drawCircle(tk.x, tk.y - 12, 5);
    });

    // Hydroponic Plant Bio-Dome (x: 820, y: -610)
    g.lineStyle(3, 0x22c55e, 0.8);
    g.beginFill(0x064e3b, 0.5);
    g.drawCircle(820, -610, 40);
    g.endFill();

    // Plants / Foliage Inside
    g.lineStyle(0);
    g.beginFill(0x10b981, 0.9);
    g.drawCircle(812, -615, 12);
    g.drawCircle(828, -610, 14);
    g.drawCircle(818, -602, 10);
    g.endFill();

    // ==========================================
    // 8. DEPO & KARGO (Storage: Kasalar & Variller)
    // ==========================================
    const crates = [
      { x: 620, y: 700, w: 60, h: 50, col: 0xd97706 },
      { x: 810, y: 700, w: 65, h: 55, col: 0x0284c7 }
    ];
    crates.forEach(cr => {
      g.lineStyle(2, cr.col, 0.9);
      g.beginFill(0x1e293b, 1);
      g.drawRoundedRect(cr.x - cr.w / 2, cr.y - cr.h / 2, cr.w, cr.h, 4);
      g.endFill();

      // Cross Bracing
      g.lineStyle(1.5, cr.col, 0.7);
      g.moveTo(cr.x - cr.w / 2 + 4, cr.y - cr.h / 2 + 4);
      g.lineTo(cr.x + cr.w / 2 - 4, cr.y + cr.h / 2 - 4);
      g.moveTo(cr.x + cr.w / 2 - 4, cr.y - cr.h / 2 + 4);
      g.lineTo(cr.x - cr.w / 2 + 4, cr.y + cr.h / 2 - 4);
    });

    // Fuel Hazard Barrels (x: 840, y: 540)
    const barrels = [
      { x: 830, y: 535, col: 0xef4444 },
      { x: 855, y: 535, col: 0xf59e0b },
      { x: 842, y: 555, col: 0xef4444 }
    ];
    barrels.forEach(br => {
      g.lineStyle(1.5, br.col, 0.9);
      g.beginFill(0x1f2937, 1);
      g.drawCircle(br.x, br.y, 11);
      g.endFill();
      g.lineStyle(0);
      g.beginFill(br.col, 0.85);
      g.drawCircle(br.x, br.y, 4);
      g.endFill();
    });
  }

  renderEntities(renderer, g, gameState, entities, myPlayerId) {
    const s = (gameState && gameState.modeState) || {};
    this.beaconPulse += 0.06;
    this.fogTime += 0.02;

    const myPlayer = (gameState.players || []).find(p => p.id === myPlayerId);
    const myPos = myPlayer ? { x: myPlayer.x, y: myPlayer.y } : { x: 0, y: 0 };
    const isMeeting = s.gameState === 'meeting';
    const isLobby = s.gameState === 'waiting';
    const isImpostor = myPlayer && myPlayer.role === 'impostor';
    const isDead = myPlayer && !myPlayer.isAlive;

    // Vision radius: Crewmate 280px, Impostor 360px, Ghost/Meeting full
    const visionRadius = (isDead || isMeeting) ? 2200 : (isLobby ? 420 : (isImpostor ? 360 : 280));

    // 1. Task Station Holographic Beacons
    const stations = s.taskStations || [];
    const myPlayerMeta = (s.playersMeta || []).find(p => p.id === myPlayerId);
    const completedList = (myPlayerMeta && myPlayerMeta.completedTasksList) || [];

    stations.forEach(st => {
      const isDone = completedList.includes(st.id);
      const beaconColor = isDone ? 0x10b981 : 0xeab308;
      const pulseSize = 14 + Math.sin(this.beaconPulse + st.x) * 3.5;

      // Glow Ring
      g.lineStyle(2, beaconColor, isDone ? 0.4 : 0.85);
      g.beginFill(beaconColor, isDone ? 0.1 : 0.25);
      g.drawCircle(st.x, st.y, pulseSize);
      g.endFill();

      // Station Base
      g.lineStyle(1.5, 0xffffff, 0.7);
      g.beginFill(0x1e293b);
      g.drawRect(st.x - 12, st.y - 12, 24, 24);
      g.endFill();
    });

    // 2. Vents (Visible to Impostor with red glow, or normal grate for crew)
    const vents = s.vents || [];
    vents.forEach(v => {
      const ventGlow = isImpostor ? 0xef4444 : 0x64748b;
      g.lineStyle(2, ventGlow, isImpostor ? 0.9 : 0.7);
      g.beginFill(0x0f172a, 0.9);
      g.drawRoundedRect(v.x - 18, v.y - 14, 36, 28, 5);
      g.endFill();

      // Grate Lines
      g.lineStyle(1.5, isImpostor ? 0xf87171 : 0x94a3b8, 0.7);
      g.moveTo(v.x - 10, v.y - 7); g.lineTo(v.x - 10, v.y + 7);
      g.moveTo(v.x, v.y - 7); g.lineTo(v.x, v.y + 7);
      g.moveTo(v.x + 10, v.y - 7); g.lineTo(v.x + 10, v.y + 7);
    });

    // 3. Dead Bodies
    const bodies = s.bodies || [];
    bodies.forEach(b => {
      const dist = Math.hypot(b.x - myPos.x, b.y - myPos.y);
      if (!isDead && !isMeeting && dist > visionRadius + 60) return; // Hidden in fog

      const color = parseInt((b.color || '#ef4444').replace('#', '0x'), 16) || 0xef4444;
      g.lineStyle(2, 0x000000, 0.85);
      g.beginFill(color, 0.9);
      g.drawEllipse(b.x, b.y, 18, 12);
      g.endFill();

      // Bone detail
      g.lineStyle(2.5, 0xffffff, 0.95);
      g.moveTo(b.x - 5, b.y);
      g.lineTo(b.x + 5, b.y);
    });

    // 4. ATMOSPHERIC FOG OF WAR (Sis & Görüş Alanı)
    if (!isDead && !isMeeting) {
      // Shroud outer space outside vision circle
      const outerR = 1800;
      const stepCount = 8;
      for (let i = 0; i < stepCount; i++) {
        const ringInner = visionRadius * (0.75 + (i * 0.1));
        const ringThickness = visionRadius * 0.12;
        const ringAlpha = (i / (stepCount - 1)) * 0.88;

        g.lineStyle(ringThickness, 0x030712, ringAlpha);
        g.drawCircle(myPos.x, myPos.y, ringInner + ringThickness / 2);
      }

      // Outer Absolute Darkness Mask
      g.lineStyle(outerR, 0x030712, 0.97);
      g.drawCircle(myPos.x, myPos.y, visionRadius * 1.55 + outerR / 2);

      // Subtle Flashlight / Vision Edge Halo
      g.lineStyle(3, isImpostor ? 0xef4444 : 0x38bdf8, 0.25);
      g.drawCircle(myPos.x, myPos.y, visionRadius * 0.95);

      // 5. Dynamic Cosmic Mist / Floating Space Fog Particles
      this.mistParticles.forEach((m, idx) => {
        m.x += m.vx;
        m.y += m.vy;
        if (m.x < -1400) m.x = 1400;
        if (m.x > 1400) m.x = -1400;
        if (m.y < -900) m.y = 900;
        if (m.y > 900) m.y = -900;

        const pDist = Math.hypot(m.x - myPos.x, m.y - myPos.y);
        if (pDist <= visionRadius + 120) {
          const pulse = Math.sin(this.fogTime + idx) * 0.05;
          g.lineStyle(0);
          g.beginFill(0x1e293b, Math.max(0.04, m.alpha + pulse));
          g.drawCircle(m.x, m.y, m.r);
          g.endFill();
        }
      });
    }
  }

  updateHUD(ui, gameState, myPlayerId) {
    if (!ui) return;

    if (ui.hudPuck) ui.hudPuck.classList.add('hidden');
    if (ui.hudSumo) ui.hudSumo.classList.add('hidden');
    if (ui.hudAgar) ui.hudAgar.classList.add('hidden');
    if (ui.hudSpace) ui.hudSpace.classList.remove('hidden');
    if (ui.hudLeaderboard) ui.hudLeaderboard.classList.add('hidden');
    if (ui.hudTeamSwitcher) ui.hudTeamSwitcher.classList.add('hidden');
    if (ui.hudChat) ui.hudChat.classList.add('hidden');

    const s = gameState.modeState || {};
    const myPlayer = (gameState.players || []).find(p => p.id === myPlayerId);
    const isLobby = s.gameState === 'waiting';
    const isImpostor = !isLobby && myPlayer && myPlayer.role === 'impostor';

    // Update Task Bar
    const taskRatio = s.taskProgressRatio || 0;
    if (ui.taskProgressFill) ui.taskProgressFill.style.width = `${taskRatio}%`;
    if (ui.taskPercentText) ui.taskPercentText.textContent = `${taskRatio}%`;

    // Update Role Badge
    if (ui.spaceRoleBadge) {
      if (isLobby) {
        ui.spaceRoleBadge.textContent = '🛸 LOBİ (Isınma & Serbest Gezinti)';
        ui.spaceRoleBadge.className = 'space-role-pill space-role-lobby';
      } else if (isImpostor) {
        ui.spaceRoleBadge.textContent = '🔪 CASUS (IMPOSTOR)';
        ui.spaceRoleBadge.className = 'space-role-pill space-role-impostor';
      } else {
        ui.spaceRoleBadge.textContent = '🛠️ MÜRETTEBAT (CREW)';
        ui.spaceRoleBadge.className = 'space-role-pill';
      }
    }

    // Hints & Mobile Buttons
    if (isLobby) {
      if (ui.hintAction) ui.hintAction.innerHTML = '🛸 <b>Lobi:</b> Gemide serbestçe dolaşabilir, görevleri test edebilirsiniz.';
      if (ui.hintHold) ui.hintHold.innerHTML = '⚡ <b>E / F:</b> Görevleri Dene';
      if (ui.hintExtra) ui.hintExtra.classList.add('hidden');
      if (ui.btnTouchAction) ui.btnTouchAction.textContent = '🛠️ TEST ET';
      if (ui.btnTouchHold) ui.btnTouchHold.classList.add('hidden');
      if (ui.btnTouchVent) ui.btnTouchVent.classList.add('hidden');
      if (ui.btnTouchReport) ui.btnTouchReport.classList.add('hidden');
    } else if (isImpostor) {
      if (ui.hintAction) ui.hintAction.innerHTML = '🔪 <b>Boşluk / Q:</b> Avla (Kill)';
      if (ui.hintHold) ui.hintHold.innerHTML = '🌀 <b>V:</b> Havalandırma (Vent)';
      if (ui.hintExtra) {
        ui.hintExtra.innerHTML = '🚨 <b>R:</b> Acil Rapor';
        ui.hintExtra.classList.remove('hidden');
      }
      if (ui.btnTouchAction) ui.btnTouchAction.textContent = '🔪 ÖLDÜR';
      if (ui.btnTouchHold) ui.btnTouchHold.classList.add('hidden');
      if (ui.btnTouchVent) ui.btnTouchVent.classList.remove('hidden');
      if (ui.btnTouchReport) ui.btnTouchReport.classList.remove('hidden');
    } else {
      if (ui.hintAction) ui.hintAction.innerHTML = '🛠️ <b>E / F:</b> Görev Yap (Task)';
      if (ui.hintHold) ui.hintHold.innerHTML = '🚨 <b>R:</b> Ceset Raporla';
      if (ui.hintExtra) ui.hintExtra.classList.add('hidden');
      if (ui.btnTouchAction) ui.btnTouchAction.textContent = '🛠️ GÖREV';
      if (ui.btnTouchHold) ui.btnTouchHold.classList.add('hidden');
      if (ui.btnTouchVent) ui.btnTouchVent.classList.add('hidden');
      if (ui.btnTouchReport) ui.btnTouchReport.classList.remove('hidden');
    }

    // Emergency Meeting Modal Toggle
    if (s.gameState === 'meeting') {
      if (ui.modalMeeting && ui.modalMeeting.classList.contains('hidden')) {
        ui.modalMeeting.classList.remove('hidden');
        ui.closeTaskMiniGame(); // Close task if meeting starts
      }
      if (ui.meetingTimerText) ui.meetingTimerText.textContent = s.meetingTimer !== undefined ? s.meetingTimer : 30;
      if (ui.meetingReasonText && s.meetingReason) ui.meetingReasonText.textContent = s.meetingReason;
      if (ui.skipVoteCount) ui.skipVoteCount.textContent = s.skipVotesCount || 0;

      const myPlayerMeta = (s.playersMeta || []).find(p => p.id === myPlayerId);
      const iHaveVoted = myPlayerMeta ? myPlayerMeta.hasVoted : false;
      const isMeDead = myPlayerMeta ? !myPlayerMeta.isAlive : false;

      if (ui.btnSkipVote) {
        if (iHaveVoted) {
          ui.btnSkipVote.disabled = true;
          ui.btnSkipVote.classList.add('voted-disabled');
          ui.btnSkipVote.innerHTML = `<span>✓ Oyunu Kullandın</span> <span class="skip-count-badge" id="skip-vote-count">${s.skipVotesCount || 0}</span>`;
        } else if (isMeDead) {
          ui.btnSkipVote.disabled = true;
          ui.btnSkipVote.classList.add('voted-disabled');
          ui.btnSkipVote.innerHTML = `<span>💀 Ölüler Oy Kullanamaz</span> <span class="skip-count-badge" id="skip-vote-count">${s.skipVotesCount || 0}</span>`;
        } else {
          ui.btnSkipVote.disabled = false;
          ui.btnSkipVote.classList.remove('voted-disabled');
          ui.btnSkipVote.innerHTML = `<span>Pas Geç (Oy Kullanma)</span> <span class="skip-count-badge" id="skip-vote-count">${s.skipVotesCount || 0}</span>`;
        }
      }

      ui.renderMeetingPlayers(s.playersMeta || [], myPlayerId);
    } else {
      if (ui.modalMeeting) ui.modalMeeting.classList.add('hidden');
    }
  }

  checkTaskInteraction(app) {
    if (!app || !app.lastGameState || app.lastGameState.mode !== 'space') return;
    const s = app.lastGameState.modeState || {};
    if (s.gameState === 'meeting') return;
    if (app.ui.modalTaskInteractive && !app.ui.modalTaskInteractive.classList.contains('hidden')) return;

    const myP = (app.lastGameState.players || []).find(p => p.id === app.socket.myPlayerId);
    if (!myP) return;

    const stations = s.taskStations || [];
    const playerMeta = (s.playersMeta || []).find(p => p.id === app.socket.myPlayerId);
    const completedList = (playerMeta && playerMeta.completedTasksList) || [];

    for (const st of stations) {
      if (completedList.includes(st.id)) continue;
      const dist = Math.hypot(myP.x - st.x, myP.y - st.y);
      if (dist <= 85) {
        app.ui.openTaskMiniGame(st, (taskId) => {
          app.socket.sendAction({ type: 'complete_task', taskId });
        });
        break;
      }
    }
  }

  toggleMinimap(ui, gameState, myPlayerId) {
    const modal = document.getElementById('modal-space-minimap');
    if (!modal) return;

    if (!modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
    } else {
      modal.classList.remove('hidden');
      this.drawMinimapCanvas(gameState, myPlayerId);
    }
  }

  drawMinimapCanvas(gameState, myPlayerId) {
    const canvas = document.getElementById('space-minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const s = (gameState && gameState.modeState) || {};
    const mapW = s.width || 2800;
    const mapH = s.height || 1800;

    // Scale world (-1400..1400, -900..900) to canvas (padding 30px)
    const pad = 35;
    const scaleX = (cw - pad * 2) / mapW;
    const scaleY = (ch - pad * 2) / mapH;
    const toScreenX = (wx) => cw / 2 + wx * scaleX;
    const toScreenY = (wy) => ch / 2 + wy * scaleY;

    // 1. Radar Grid Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < cw; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
    }
    for (let y = 0; y < ch; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }

    // 2. Corridors Paths
    const corridors = s.corridors || [];
    corridors.forEach(corr => {
      const rx = toScreenX(corr.x - corr.w / 2);
      const ry = toScreenY(corr.y - corr.h / 2);
      const rw = corr.w * scaleX;
      const rh = corr.h * scaleY;

      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.fillRect(rx, ry, rw, rh);

      // Corridor Label
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(corr.name, toScreenX(corr.x), toScreenY(corr.y) + 3);
    });

    // 3. Rooms Layout
    const rooms = s.rooms || [];
    rooms.forEach(r => {
      const rx = toScreenX(r.x - r.w / 2);
      const ry = toScreenY(r.y - r.h / 2);
      const rw = r.w * scaleX;
      const rh = r.h * scaleY;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);

      // Room Title & Icon
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${r.icon || '🛸'} ${r.name}`, toScreenX(r.x), toScreenY(r.y) - 6);
    });

    // 4. Doors
    const doors = s.doors || [];
    doors.forEach(d => {
      const dx = toScreenX(d.x);
      const dy = toScreenY(d.y);
      ctx.fillStyle = d.isOpen ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.arc(dx, dy, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Tasks (Yellow Exclamation Marks)
    const stations = s.taskStations || [];
    const myPlayerMeta = (s.playersMeta || []).find(p => p.id === myPlayerId);
    const completedList = (myPlayerMeta && myPlayerMeta.completedTasksList) || [];

    stations.forEach(st => {
      const isDone = completedList.includes(st.id);
      const sx = toScreenX(st.x);
      const sy = toScreenY(st.y);

      ctx.fillStyle = isDone ? '#10b981' : '#facc15';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isDone ? '✓' : '!', sx, sy);
    });

    // 6. Current Player Beacon
    const myPlayer = (gameState.players || []).find(p => p.id === myPlayerId);
    if (myPlayer) {
      const px = toScreenX(myPlayer.x);
      const py = toScreenY(myPlayer.y);

      // Pulse ring
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('SEN', px, py - 16);
    }
  }
}
