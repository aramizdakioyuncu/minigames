// castleTheme.js - Medieval Castle Keep, Torches, Throne Room, Cobblestones, and Dungeons

export class CastleThemeRenderer {
  constructor() {
    this.castleTorches = [
      { x: -300, y: -280 }, { x: 300, y: -280 },
      { x: -300, y: 220 }, { x: 300, y: 220 },
      { x: -680, y: -200 }, { x: -680, y: 200 },
      { x: 700, y: -200 }, { x: 700, y: 200 },
      { x: 0, y: -580 }, { x: 0, y: 580 },
      { x: 720, y: -580 }, { x: 720, y: 580 }
    ];
  }

  renderEnvironment(g, s, t, animTime) {
    // 1. Dark Medieval Night Sky / Castle Courtyard Base
    g.beginFill(0x050811);
    g.drawRect(-1800, -1300, 3600, 2600);
    g.endFill();

    // 2. Castle Outer Stone Moat & Battlements
    g.lineStyle(24, 0x1e293b, 0.95);
    g.drawRoundedRect(-1080, -780, 2160, 1560, 48);

    g.lineStyle(6, 0xd4af37, 0.85);
    g.drawRoundedRect(-1080, -780, 2160, 1560, 48);

    // 3. Render Castle Rooms & Cobblestones
    this.renderCastleRooms(g, s.rooms || [], animTime);
    this.renderCastleDoors(g, s.doors || []);
    this.renderCastleTorches(g, animTime);
    this.renderCastleTaskStations(g, s.taskStations || [], animTime);
  }

  renderCastleRooms(g, rooms, animTime) {
    rooms.forEach(r => {
      // Room floor tile: Cobblestone / flagstone pattern
      g.lineStyle(3, 0x334155, 0.95);
      g.beginFill(0x1a2234, 0.95);
      g.drawRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 16);
      g.endFill();

      // Stone flagstone grid
      g.lineStyle(1.2, 0x0f172a, 0.45);
      for (let x = r.x - r.w / 2 + 60; x < r.x + r.w / 2; x += 60) {
        g.moveTo(x, r.y - r.h / 2 + 6);
        g.lineTo(x, r.y + r.h / 2 - 6);
      }
      for (let y = r.y - r.h / 2 + 60; y < r.y + r.h / 2; y += 60) {
        g.moveTo(r.x - r.w / 2 + 6, y);
        g.lineTo(r.x + r.w / 2 - 6, y);
      }

      // Room Specific Castle Decors
      if (r.id === 'cafeteria' || r.id === 'throne') {
        // Grand Royal Banquet & Throne Chamber
        g.lineStyle(4, 0xd4af37, 0.9);
        g.beginFill(0x881337, 0.85); // Royal Red Velvet Carpet
        g.drawRoundedRect(r.x - 70, r.y - 120, 140, 240, 12);
        g.endFill();

        // King's Golden Throne
        g.lineStyle(3, 0xfacc15, 0.95);
        g.beginFill(0x713f12, 0.95);
        g.drawRoundedRect(r.x - 36, r.y - 100, 72, 45, 8);
        g.endFill();

        // Crown on throne
        g.lineStyle(2, 0xfef08a, 1);
        g.beginFill(0xf59e0b, 1);
        g.drawCircle(r.x, r.y - 80, 12);
        g.endFill();
      } else if (r.id === 'dungeon' || r.id === 'medbay') {
        // Dungeon Iron Bars
        g.lineStyle(3, 0x475569, 0.85);
        for (let x = r.x - 90; x <= r.x + 90; x += 25) {
          g.moveTo(x, r.y - 60);
          g.lineTo(x, r.y + 60);
        }
      } else if (r.id === 'armory' || r.id === 'weapons') {
        // Crossed Swords Crest
        g.lineStyle(3, 0x94a3b8, 0.9);
        g.moveTo(r.x - 30, r.y - 30);
        g.lineTo(r.x + 30, r.y + 30);
        g.moveTo(r.x + 30, r.y - 30);
        g.lineTo(r.x - 30, r.y + 30);
        // Shield center
        g.lineStyle(2, 0xd97706, 0.95);
        g.beginFill(0xb45309, 0.9);
        g.drawCircle(r.x, r.y, 16);
        g.endFill();
      }
    });
  }

  renderCastleDoors(g, doors) {
    doors.forEach(d => {
      const isH = d.orientation === 'h';
      const isLocked = !!d.isLocked;
      const isOpen = !!d.isOpen;
      const dw = d.w || (isH ? 130 : 28);
      const dh = d.h || (isH ? 28 : 110);

      if (isLocked) {
        // Heavy Iron Portcullis Spikes (Locked)
        g.lineStyle(4, 0xef4444, 0.95);
        g.beginFill(0x7f1d1d, 0.9);
        g.drawRoundedRect(d.x - dw / 2, d.y - dh / 2, dw, dh, 4);
        g.endFill();

        g.lineStyle(2, 0xffffff, 0.95);
        g.moveTo(d.x - 12, d.y - 12);
        g.lineTo(d.x + 12, d.y + 12);
        g.moveTo(d.x + 12, d.y - 12);
        g.lineTo(d.x - 12, d.y + 12);
      } else if (isOpen) {
        // Open Archway
        g.lineStyle(2, 0x10b981, 0.7);
        g.beginFill(0x064e3b, 0.25);
        g.drawRoundedRect(d.x - dw / 2, d.y - dh / 2, dw, dh, 4);
        g.endFill();
      } else {
        // Heavy Oak Castle Gate with Iron Studs
        g.lineStyle(3, 0x78350f, 0.95);
        g.beginFill(0x451a03, 0.95);
        g.drawRoundedRect(d.x - dw / 2, d.y - dh / 2, dw, dh, 4);
        g.endFill();

        // Iron Gate Studs
        g.beginFill(0x94a3b8, 0.9);
        g.drawCircle(d.x - 8, d.y, 3);
        g.drawCircle(d.x + 8, d.y, 3);
        g.endFill();
      }
    });
  }

  renderCastleTorches(g, animTime) {
    this.castleTorches.forEach(torch => {
      const flicker = 1 + Math.sin(animTime * 12 + torch.x) * 0.2;
      // Torch Sconce
      g.lineStyle(2, 0x78350f, 0.9);
      g.beginFill(0x292524, 0.9);
      g.drawRect(torch.x - 4, torch.y - 2, 8, 14);
      g.endFill();

      // Flame Glow
      g.beginFill(0xf97316, 0.25);
      g.drawCircle(torch.x, torch.y - 8, 28 * flicker);
      g.endFill();

      // Flame Core
      g.beginFill(0xfef08a, 0.95);
      g.drawCircle(torch.x, torch.y - 8, 7 * flicker);
      g.endFill();
    });
  }

  renderCastleTaskStations(g, taskStations, animTime) {
    taskStations.forEach(ts => {
      const pulse = 1 + Math.sin(animTime * 4) * 0.15;
      g.lineStyle(2.5, 0xfacc15, 0.9);
      g.beginFill(0x78350f, 0.6);
      g.drawCircle(ts.x, ts.y, 22 * pulse);
      g.endFill();

      g.lineStyle(2, 0xfef08a, 1);
      g.beginFill(0xd97706, 0.95);
      g.drawCircle(ts.x, ts.y, 12);
      g.endFill();
    });
  }
}
