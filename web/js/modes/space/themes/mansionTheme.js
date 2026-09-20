// mansionTheme.js - Victorian Gothic Mystery Mansion, Wood Floors, Library, Greenhouse, and Chandeliers

export class MansionThemeRenderer {
  constructor() {
    this.rainDrops = Array.from({ length: 150 }, () => ({
      x: (Math.random() - 0.5) * 3200,
      y: (Math.random() - 0.5) * 2200,
      speed: 18 + Math.random() * 12,
      len: 22 + Math.random() * 24,
      alpha: 0.25 + Math.random() * 0.35
    }));
  }

  renderEnvironment(g, s, t, animTime) {
    // 1. Rainy Midnight Gothic Atmosphere
    g.beginFill(0x06070c);
    g.drawRect(-1800, -1300, 3600, 2600);
    g.endFill();

    // 2. Heavy Rain Effect Outside Mansion
    this.rainDrops.forEach(drop => {
      drop.y += drop.speed;
      if (drop.y > 1200) {
        drop.y = -1200;
        drop.x = (Math.random() - 0.5) * 3200;
      }
      g.lineStyle(1.5, 0x60a5fa, drop.alpha);
      g.moveTo(drop.x, drop.y);
      g.lineTo(drop.x - 4, drop.y + drop.len);
    });

    // 3. Victorian Mansion Outer Stone Walls
    g.lineStyle(24, 0x1c1917, 0.95);
    g.drawRoundedRect(-1080, -780, 2160, 1560, 48);

    g.lineStyle(6, 0x9a3412, 0.85);
    g.drawRoundedRect(-1080, -780, 2160, 1560, 48);

    // 4. Render Mansion Rooms
    this.renderMansionRooms(g, s.rooms || [], animTime);
    this.renderMansionDoors(g, s.doors || []);
    this.renderMansionTaskStations(g, s.taskStations || [], animTime);
  }

  renderMansionRooms(g, rooms, animTime) {
    rooms.forEach(r => {
      // Polished Mahogany Hardwood Floor
      g.lineStyle(2, 0x451a03, 0.9);
      g.beginFill(0x29140a, 0.95);
      g.drawRoundedRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 16);
      g.endFill();

      // Hardwood floor planks
      g.lineStyle(1, 0x1c0c04, 0.45);
      for (let y = r.y - r.h / 2 + 35; y < r.y + r.h / 2; y += 35) {
        g.moveTo(r.x - r.w / 2 + 6, y);
        g.lineTo(r.x + r.w / 2 - 6, y);
      }

      // Room Specific Decors
      if (r.id === 'grand_foyer' || r.id === 'cafeteria') {
        // Grand Crystal Chandelier in center
        const chandelierPulse = 1 + Math.sin(animTime * 3) * 0.08;
        g.lineStyle(3, 0xfacc15, 0.9);
        g.beginFill(0xfef08a, 0.25);
        g.drawCircle(r.x, r.y, 65 * chandelierPulse);
        g.endFill();

        g.lineStyle(2, 0xffffff, 0.95);
        g.drawCircle(r.x, r.y, 35);
        g.drawCircle(r.x, r.y, 18);
      } else if (r.id === 'library') {
        // Bookcase Shelves
        g.lineStyle(3, 0x78350f, 0.9);
        for (let x = r.x - 80; x <= r.x + 80; x += 30) {
          g.drawRect(x, r.y - 50, 18, 100);
        }
      } else if (r.id === 'greenhouse') {
        // Greenhouse Plants & Vines
        g.lineStyle(2, 0x15803d, 0.85);
        g.beginFill(0x166534, 0.5);
        g.drawCircle(r.x - 40, r.y, 28);
        g.drawCircle(r.x + 40, r.y, 28);
        g.endFill();
      }
    });
  }

  renderMansionDoors(g, doors) {
    doors.forEach(d => {
      const isH = d.orientation === 'h';
      const isLocked = !!d.isLocked;
      const isOpen = !!d.isOpen;
      const dw = d.w || (isH ? 130 : 28);
      const dh = d.h || (isH ? 28 : 110);

      if (isLocked) {
        // Chained Locked Double Door
        g.lineStyle(4, 0xdc2626, 0.95);
        g.beginFill(0x7f1d1d, 0.9);
        g.drawRoundedRect(d.x - dw / 2, d.y - dh / 2, dw, dh, 4);
        g.endFill();

        g.lineStyle(2, 0xffffff, 0.95);
        g.moveTo(d.x - 12, d.y - 12);
        g.lineTo(d.x + 12, d.y + 12);
        g.moveTo(d.x + 12, d.y - 12);
        g.lineTo(d.x - 12, d.y + 12);
      } else if (isOpen) {
        // Open Double French Door
        g.lineStyle(2, 0x10b981, 0.7);
        g.beginFill(0x064e3b, 0.25);
        g.drawRoundedRect(d.x - dw / 2, d.y - dh / 2, dw, dh, 4);
        g.endFill();
      } else {
        // Antique Walnut Door with Brass Knob
        g.lineStyle(3, 0x78350f, 0.95);
        g.beginFill(0x3f1d0b, 0.95);
        g.drawRoundedRect(d.x - dw / 2, d.y - dh / 2, dw, dh, 4);
        g.endFill();

        // Brass Knob
        g.beginFill(0xfacc15, 0.95);
        g.drawCircle(d.x - 6, d.y, 3.5);
        g.drawCircle(d.x + 6, d.y, 3.5);
        g.endFill();
      }
    });
  }

  renderMansionTaskStations(g, taskStations, animTime) {
    taskStations.forEach(ts => {
      const pulse = 1 + Math.sin(animTime * 4) * 0.15;
      g.lineStyle(2.5, 0xfacc15, 0.9);
      g.beginFill(0x78350f, 0.6);
      g.drawCircle(ts.x, ts.y, 22 * pulse);
      g.endFill();

      g.lineStyle(2, 0xfef08a, 1);
      g.beginFill(0xb45309, 0.95);
      g.drawCircle(ts.x, ts.y, 12);
      g.endFill();
    });
  }
}
