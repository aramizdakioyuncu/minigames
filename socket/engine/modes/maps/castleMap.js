// castleMap.js - Medieval Castle Citadel & Dungeon Map Template

import { Vec2 } from '../../physics.js';

export function getCastleMap(hw, hh) {
  return {
    theme: 'castle',
    name: 'Ortaçağ Kalesi & Zindan',
    icon: '🏰',
    accentColor: '#f59e0b',
    walls: [
      // Outer Castle Citadel Walls
      { p1: new Vec2(-hw, -hh), p2: new Vec2(hw, -hh) },
      { p1: new Vec2(-hw, hh), p2: new Vec2(hw, hh) },
      { p1: new Vec2(-hw, -hh), p2: new Vec2(-hw, hh) },
      { p1: new Vec2(hw, -hh), p2: new Vec2(hw, hh) },

      // Great Throne Hall (Center / Taht Salonu)
      { p1: new Vec2(-340, -300), p2: new Vec2(-65, -300) },
      { p1: new Vec2(65, -300), p2: new Vec2(340, -300) },
      { p1: new Vec2(-340, 240), p2: new Vec2(-65, 240) },
      { p1: new Vec2(65, 240), p2: new Vec2(340, 240) },
      { p1: new Vec2(-340, -300), p2: new Vec2(-340, -55) },
      { p1: new Vec2(-340, 55), p2: new Vec2(-340, 240) },
      { p1: new Vec2(340, -300), p2: new Vec2(340, -55) },
      { p1: new Vec2(340, 55), p2: new Vec2(340, 240) },

      // Dungeon & Cells (Left Room / Zindanlar)
      { p1: new Vec2(-1150, -450), p2: new Vec2(-680, -450) },
      { p1: new Vec2(-680, -450), p2: new Vec2(-680, -60) },
      { p1: new Vec2(-680, 60), p2: new Vec2(-680, 450) },
      { p1: new Vec2(-1150, 450), p2: new Vec2(-680, 450) },

      // Armory & Forge (Bottom Left / Silahhane & Demirhane)
      { p1: new Vec2(-950, 360), p2: new Vec2(-520, 360) },
      { p1: new Vec2(-520, 360), p2: new Vec2(-520, 490) },
      { p1: new Vec2(-520, 600), p2: new Vec2(-520, 750) },

      // Watchtower & Barracks (Right Room / Gözetleme Kulesi)
      { p1: new Vec2(700, -450), p2: new Vec2(1180, -450) },
      { p1: new Vec2(700, -450), p2: new Vec2(700, -60) },
      { p1: new Vec2(700, 60), p2: new Vec2(700, 450) },
      { p1: new Vec2(700, 450), p2: new Vec2(1180, 450) },

      // Alchemy & Sorcery Lab (Top Room / Simya Laboratuvarı)
      { p1: new Vec2(-300, -780), p2: new Vec2(300, -780) },
      { p1: new Vec2(-300, -780), p2: new Vec2(-300, -460) },
      { p1: new Vec2(300, -780), p2: new Vec2(300, -460) },
      { p1: new Vec2(-300, -460), p2: new Vec2(-65, -460) },
      { p1: new Vec2(65, -460), p2: new Vec2(300, -460) },

      // Courtyard & Stone Well (Bottom Room / İç Avlu & Kuyu)
      { p1: new Vec2(-280, 460), p2: new Vec2(-65, 460) },
      { p1: new Vec2(65, 460), p2: new Vec2(280, 460) },
      { p1: new Vec2(-280, 460), p2: new Vec2(-280, 780) },
      { p1: new Vec2(280, 460), p2: new Vec2(280, 780) },

      // Ancient Library & Archives (Top Right Room / Kadim Kütüphane)
      { p1: new Vec2(520, -750), p2: new Vec2(920, -750) },
      { p1: new Vec2(520, -750), p2: new Vec2(520, -660) },
      { p1: new Vec2(520, -560), p2: new Vec2(520, -480) },
      { p1: new Vec2(920, -750), p2: new Vec2(920, -480) },

      // Crypt & Treasury (Bottom Right Room / Yeraltı Mahzeni & Hazine)
      { p1: new Vec2(500, 460), p2: new Vec2(950, 460) },
      { p1: new Vec2(500, 460), p2: new Vec2(500, 580) },
      { p1: new Vec2(500, 680), p2: new Vec2(500, 800) },
      { p1: new Vec2(950, 460), p2: new Vec2(950, 800) }
    ],
    roomsList: [
      { id: 'throne', name: 'Büyük Taht Salonu (Merkez)', x: 0, y: -30, w: 640, h: 500, icon: '👑' },
      { id: 'dungeon', name: 'Zindanlar & Demir Hücreler', x: -910, y: 0, w: 420, h: 840, icon: '⛓️' },
      { id: 'armory', name: 'Silahhane & Demirhane', x: -730, y: 550, w: 400, h: 360, icon: '⚔️' },
      { id: 'alchemy', name: 'Simya & İksir Laboratuvarı', x: 0, y: -620, w: 560, h: 280, icon: '🧪' },
      { id: 'watchtower', name: 'Gözetleme Kulesi & Muhafız', x: 940, y: 0, w: 440, h: 840, icon: '🏹' },
      { id: 'courtyard', name: 'Şato Avlusu & Su Kuyusu', x: 0, y: 620, w: 520, h: 300, icon: '⛲' },
      { id: 'library', name: 'Kadim Kütüphane & Parşömenler', x: 720, y: -610, w: 380, h: 260, icon: '📜' },
      { id: 'crypt', name: 'Yeraltı Mahzeni & Hazine', x: 720, y: 630, w: 420, h: 320, icon: '🕯️' }
    ],
    doors: [
      { id: 'door_throne_north', name: 'Kuzey Kale Kapısı', x: 0, y: -300, w: 130, h: 28, orientation: 'h', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_throne_south', name: 'Güney Avlu Kapısı', x: 0, y: 240, w: 130, h: 28, orientation: 'h', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_throne_west', name: 'Zindan Giriş Kapısı', x: -340, y: 0, w: 28, h: 110, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_throne_east', name: 'Kule Geçit Kapısı', x: 340, y: 0, w: 28, h: 110, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_alchemy', name: 'Simya Odası Kapısı', x: 0, y: -460, w: 130, h: 28, orientation: 'h', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_courtyard', name: 'Avlu Parmaklık Kapısı', x: 0, y: 460, w: 130, h: 28, orientation: 'h', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_dungeon', name: 'Büyük Zindan Kapısı', x: -680, y: 0, w: 28, h: 120, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_watchtower', name: 'Kule Ağır Kapısı', x: 700, y: 0, w: 28, h: 120, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_armory', name: 'Silahhane Kapısı', x: -520, y: 545, w: 28, h: 110, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_crypt', name: 'Mahzen Demir Kapısı', x: 500, y: 630, w: 28, h: 110, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_library', name: 'Kütüphane Kapısı', x: 520, y: -610, w: 28, h: 100, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 }
    ],
    corridors: [
      { id: 'corr_north', name: 'Kuzey Simya Koridoru', x: 0, y: -380, w: 130, h: 160 },
      { id: 'corr_south', name: 'Güney Avlu Yolu', x: 0, y: 350, w: 130, h: 160 },
      { id: 'corr_west', name: 'Batı Zindan Geçidi', x: -510, y: 0, w: 340, h: 110 },
      { id: 'corr_east', name: 'Doğu Kule Geçidi', x: 520, y: 0, w: 360, h: 110 },
      { id: 'corr_ne', name: 'Kütüphane Revakı', x: 430, y: -450, w: 120, h: 120 },
      { id: 'corr_se', name: 'Mahzen İnişi', x: 420, y: 450, w: 120, h: 120 },
      { id: 'corr_sw', name: 'Silahhane Yolu', x: -430, y: 450, w: 120, h: 120 }
    ],
    vents: [
      { id: 'vent_armory', room: 'armory', x: -750, y: 580, connectsTo: ['vent_dungeon', 'vent_court'] },
      { id: 'vent_dungeon', room: 'dungeon', x: -940, y: -260, connectsTo: ['vent_armory', 'vent_alchemy'] },
      { id: 'vent_alchemy', room: 'alchemy', x: -180, y: -640, connectsTo: ['vent_dungeon', 'vent_throne'] },
      { id: 'vent_throne', room: 'throne', x: 250, y: -220, connectsTo: ['vent_alchemy', 'vent_library'] },
      { id: 'vent_library', room: 'library', x: 760, y: -620, connectsTo: ['vent_throne', 'vent_tower'] },
      { id: 'vent_tower', room: 'watchtower', x: 960, y: -240, connectsTo: ['vent_library', 'vent_crypt'] },
      { id: 'vent_crypt', room: 'crypt', x: 760, y: 640, connectsTo: ['vent_tower', 'vent_court'] },
      { id: 'vent_court', room: 'courtyard', x: 160, y: 640, connectsTo: ['vent_crypt', 'vent_armory'] }
    ],
    taskStations: [
      { id: 'task_sharpen_sword', room: 'armory', name: 'Kılıçları Bileyle', x: -800, y: 600, duration: 4.5, icon: '⚔️' },
      { id: 'task_lock_chain', room: 'dungeon', name: 'Zindan Parmaklığını Kilitle', x: -950, y: 150, duration: 5.0, icon: '⛓️' },
      { id: 'task_arrow_defense', room: 'watchtower', name: 'Okçu Mazgallarını Doldur', x: 1000, y: -100, duration: 6.0, icon: '🏹' },
      { id: 'task_brew_potion', room: 'alchemy', name: 'Şifa İksirini Kaynat', x: 60, y: -610, duration: 5.5, icon: '🧪' },
      { id: 'task_draw_well_water', room: 'courtyard', name: 'Kuyudan Su Çek', x: -120, y: 620, duration: 4.5, icon: '🪣' },
      { id: 'task_restore_scroll', room: 'library', name: 'Kadim Parşömeni Onar', x: 720, y: -620, duration: 4.0, icon: '📜' },
      { id: 'task_light_torch', room: 'crypt', name: 'Mahzen Meşalelerini Yak', x: 720, y: 620, duration: 5.0, icon: '🔥' },
      { id: 'task_royal_seal', room: 'throne', name: 'Kraliyet Mührünü Bas', x: -100, y: -180, duration: 3.5, icon: '👑' }
    ]
  };
}
