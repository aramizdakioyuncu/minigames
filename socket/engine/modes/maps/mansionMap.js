// mansionMap.js - Haunted Gothic Mansion & Estate Map Template

import { Vec2 } from '../../physics.js';

export function getMansionMap(hw, hh) {
  return {
    theme: 'mansion',
    name: 'Karanlık Malikane & Ev',
    icon: '🏚️',
    accentColor: '#e11d48',
    walls: [
      // Outer Estate Boundary Walls
      { p1: new Vec2(-hw, -hh), p2: new Vec2(hw, -hh) },
      { p1: new Vec2(-hw, hh), p2: new Vec2(hw, hh) },
      { p1: new Vec2(-hw, -hh), p2: new Vec2(-hw, hh) },
      { p1: new Vec2(hw, -hh), p2: new Vec2(hw, hh) },

      // Grand Fireplace Living Room (Center / Şömineli Büyük Salon)
      { p1: new Vec2(-340, -300), p2: new Vec2(-65, -300) },
      { p1: new Vec2(65, -300), p2: new Vec2(340, -300) },
      { p1: new Vec2(-340, 240), p2: new Vec2(-65, 240) },
      { p1: new Vec2(65, 240), p2: new Vec2(340, 240) },
      { p1: new Vec2(-340, -300), p2: new Vec2(-340, -55) },
      { p1: new Vec2(-340, 55), p2: new Vec2(-340, 240) },
      { p1: new Vec2(340, -300), p2: new Vec2(340, -55) },
      { p1: new Vec2(340, 55), p2: new Vec2(340, 240) },

      // Secret Cellar & Wine Vault (Left Room / Şarap Mahzeni)
      { p1: new Vec2(-1150, -450), p2: new Vec2(-680, -450) },
      { p1: new Vec2(-680, -450), p2: new Vec2(-680, -60) },
      { p1: new Vec2(-680, 60), p2: new Vec2(-680, 450) },
      { p1: new Vec2(-1150, 450), p2: new Vec2(-680, 450) },

      // Garage & Workshop (Bottom Left / Garaj & Atölye)
      { p1: new Vec2(-950, 360), p2: new Vec2(-520, 360) },
      { p1: new Vec2(-520, 360), p2: new Vec2(-520, 490) },
      { p1: new Vec2(-520, 600), p2: new Vec2(-520, 750) },

      // Study Room & Library (Right Room / Çalışma Odası)
      { p1: new Vec2(700, -450), p2: new Vec2(1180, -450) },
      { p1: new Vec2(700, -450), p2: new Vec2(700, -60) },
      { p1: new Vec2(700, 60), p2: new Vec2(700, 450) },
      { p1: new Vec2(700, 450), p2: new Vec2(1180, 450) },

      // Master Bedroom (Top Room / Ana Yatak Odası)
      { p1: new Vec2(-300, -780), p2: new Vec2(300, -780) },
      { p1: new Vec2(-300, -780), p2: new Vec2(-300, -460) },
      { p1: new Vec2(300, -780), p2: new Vec2(300, -460) },
      { p1: new Vec2(-300, -460), p2: new Vec2(-65, -460) },
      { p1: new Vec2(65, -460), p2: new Vec2(300, -460) },

      // Kitchen & Dining (Bottom Room / Mutfak & Yemek)
      { p1: new Vec2(-280, 460), p2: new Vec2(-65, 460) },
      { p1: new Vec2(65, 460), p2: new Vec2(280, 460) },
      { p1: new Vec2(-280, 460), p2: new Vec2(-280, 780) },
      { p1: new Vec2(280, 460), p2: new Vec2(280, 780) },

      // Winter Garden & Greenhouse (Top Right Room / Kış Bahçesi)
      { p1: new Vec2(520, -750), p2: new Vec2(920, -750) },
      { p1: new Vec2(520, -750), p2: new Vec2(520, -660) },
      { p1: new Vec2(520, -560), p2: new Vec2(520, -480) },
      { p1: new Vec2(920, -750), p2: new Vec2(920, -480) },

      // Attic & Storage Chests (Bottom Right Room / Çatı Katı & Sandıklar)
      { p1: new Vec2(500, 460), p2: new Vec2(950, 460) },
      { p1: new Vec2(500, 460), p2: new Vec2(500, 580) },
      { p1: new Vec2(500, 680), p2: new Vec2(500, 800) },
      { p1: new Vec2(950, 460), p2: new Vec2(950, 800) }
    ],
    roomsList: [
      { id: 'livingroom', name: 'Şömineli Büyük Salon (Merkez)', x: 0, y: -30, w: 640, h: 500, icon: '🛋️' },
      { id: 'cellar', name: 'Gizli Kiler & Şarap Mahzeni', x: -910, y: 0, w: 420, h: 840, icon: '🍷' },
      { id: 'garage', name: 'Garaj & Jeneratör Atölyesi', x: -730, y: 550, w: 400, h: 360, icon: '🔧' },
      { id: 'bedroom', name: 'Ana Yatak Odası', x: 0, y: -620, w: 560, h: 280, icon: '🛏️' },
      { id: 'study', name: 'Çalışma Odası & Kütüphane', x: 940, y: 0, w: 440, h: 840, icon: '📖' },
      { id: 'kitchen', name: 'Mutfak & Yemek Masası', x: 0, y: 620, w: 520, h: 300, icon: '🍳' },
      { id: 'garden', name: 'Kış Bahçesi & Sera', x: 720, y: -610, w: 380, h: 260, icon: '🌿' },
      { id: 'attic', name: 'Çatı Katı & Sandık Odası', x: 720, y: 630, w: 420, h: 320, icon: '📦' }
    ],
    doors: [
      { id: 'door_living_north', name: 'Salon Kuzey Kapısı', x: 0, y: -300, w: 130, h: 28, orientation: 'h', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_living_south', name: 'Mutfak Kapısı', x: 0, y: 240, w: 130, h: 28, orientation: 'h', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_living_west', name: 'Bodrum Kapısı', x: -340, y: 0, w: 28, h: 110, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_living_east', name: 'Çalışma Odası Kapısı', x: 340, y: 0, w: 28, h: 110, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_bedroom', name: 'Yatak Odası Masif Kapısı', x: 0, y: -460, w: 130, h: 28, orientation: 'h', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_kitchen', name: 'Mutfak Servis Kapısı', x: 0, y: 460, w: 130, h: 28, orientation: 'h', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_cellar', name: 'Kiler Ağır Kapısı', x: -680, y: 0, w: 28, h: 120, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_study', name: 'Kütüphane Çift Kanat Kapısı', x: 700, y: 0, w: 28, h: 120, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_garage', name: 'Garaj Giriş Kapısı', x: -520, y: 545, w: 28, h: 110, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_attic', name: 'Çatı Katı Kapısı', x: 500, y: 630, w: 28, h: 110, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_garden', name: 'Sera Cam Kapısı', x: 520, y: -610, w: 28, h: 100, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 }
    ],
    corridors: [
      { id: 'corr_north', name: 'Kuzey Üst Koridoru', x: 0, y: -380, w: 130, h: 160 },
      { id: 'corr_south', name: 'Güney Holü', x: 0, y: 350, w: 130, h: 160 },
      { id: 'corr_west', name: 'Batı Kiler Koridoru', x: -510, y: 0, w: 340, h: 110 },
      { id: 'corr_east', name: 'Doğu Galeri Koridoru', x: 520, y: 0, w: 360, h: 110 },
      { id: 'corr_ne', name: 'Kış Bahçesi Geçidi', x: 430, y: -450, w: 120, h: 120 },
      { id: 'corr_se', name: 'Çatı Katı Merdiven Holü', x: 420, y: 450, w: 120, h: 120 },
      { id: 'corr_sw', name: 'Garaj Geçiş Holü', x: -430, y: 450, w: 120, h: 120 }
    ],
    vents: [
      { id: 'vent_garage', room: 'garage', x: -750, y: 580, connectsTo: ['vent_cellar', 'vent_kitchen'] },
      { id: 'vent_cellar', room: 'cellar', x: -940, y: -260, connectsTo: ['vent_garage', 'vent_bed'] },
      { id: 'vent_bed', room: 'bedroom', x: -180, y: -640, connectsTo: ['vent_cellar', 'vent_living'] },
      { id: 'vent_living', room: 'livingroom', x: 250, y: -220, connectsTo: ['vent_bed', 'vent_garden'] },
      { id: 'vent_garden', room: 'garden', x: 760, y: -620, connectsTo: ['vent_living', 'vent_study'] },
      { id: 'vent_study', room: 'study', x: 960, y: -240, connectsTo: ['vent_garden', 'vent_attic'] },
      { id: 'vent_attic', room: 'attic', x: 760, y: 640, connectsTo: ['vent_study', 'vent_kitchen'] },
      { id: 'vent_kitchen', room: 'kitchen', x: 160, y: 640, connectsTo: ['vent_attic', 'vent_garage'] }
    ],
    taskStations: [
      { id: 'task_fix_fuse', room: 'garage', name: 'Sigorta Panelini Değiştir', x: -800, y: 600, duration: 4.5, icon: '💡' },
      { id: 'task_sort_wine', room: 'cellar', name: 'Şarap Şişelerini Diz', x: -950, y: 150, duration: 5.0, icon: '🍾' },
      { id: 'task_type_report', room: 'study', name: 'Daktiloda Mektup Yaz', x: 1000, y: -100, duration: 6.0, icon: '📜' },
      { id: 'task_make_bed', room: 'bedroom', name: 'Yatağı Düzelt', x: 60, y: -610, duration: 5.5, icon: '🛏️' },
      { id: 'task_cook_soup', room: 'kitchen', name: 'Fırında Çorba Isıt', x: -120, y: 620, duration: 4.5, icon: '🍲' },
      { id: 'task_water_plants', room: 'garden', name: 'Bitkileri Sula', x: 720, y: -620, duration: 4.0, icon: '💧' },
      { id: 'task_dust_chest', room: 'attic', name: 'Sandıkların Tozunu Al', x: 720, y: 620, duration: 5.0, icon: '🧹' },
      { id: 'task_fire_wood', room: 'livingroom', name: 'Şömineye Odun At', x: -100, y: -180, duration: 3.5, icon: '🪵' }
    ]
  };
}
