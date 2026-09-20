// spaceshipMap.js - Spaceship (Skeld Station) Map Template

import { Vec2 } from '../../physics.js';

export function getSpaceshipMap(hw, hh) {
  return {
    theme: 'spaceship',
    name: 'Uzay Gemisi (Skeld)',
    icon: '🚀',
    accentColor: '#38bdf8',
    walls: [
      // Outer Ship Hull
      { p1: new Vec2(-hw, -hh), p2: new Vec2(hw, -hh) },
      { p1: new Vec2(-hw, hh), p2: new Vec2(hw, hh) },
      { p1: new Vec2(-hw, -hh), p2: new Vec2(-hw, hh) },
      { p1: new Vec2(hw, -hh), p2: new Vec2(hw, hh) },

      // Cafeteria (Center / Toplantı Masası)
      { p1: new Vec2(-340, -300), p2: new Vec2(-65, -300) },
      { p1: new Vec2(65, -300), p2: new Vec2(340, -300) },
      { p1: new Vec2(-340, 240), p2: new Vec2(-65, 240) },
      { p1: new Vec2(65, 240), p2: new Vec2(340, 240) },
      { p1: new Vec2(-340, -300), p2: new Vec2(-340, -55) },
      { p1: new Vec2(-340, 55), p2: new Vec2(-340, 240) },
      { p1: new Vec2(340, -300), p2: new Vec2(340, -55) },
      { p1: new Vec2(340, 55), p2: new Vec2(340, 240) },

      // Reactor & Engine (Left Room)
      { p1: new Vec2(-1150, -450), p2: new Vec2(-680, -450) },
      { p1: new Vec2(-680, -450), p2: new Vec2(-680, -60) },
      { p1: new Vec2(-680, 60), p2: new Vec2(-680, 450) },
      { p1: new Vec2(-1150, 450), p2: new Vec2(-680, 450) },

      // Electrical (Bottom Left)
      { p1: new Vec2(-950, 360), p2: new Vec2(-520, 360) },
      { p1: new Vec2(-520, 360), p2: new Vec2(-520, 490) },
      { p1: new Vec2(-520, 600), p2: new Vec2(-520, 750) },

      // Cockpit / Navigation (Right Room)
      { p1: new Vec2(700, -450), p2: new Vec2(1180, -450) },
      { p1: new Vec2(700, -450), p2: new Vec2(700, -60) },
      { p1: new Vec2(700, 60), p2: new Vec2(700, 450) },
      { p1: new Vec2(700, 450), p2: new Vec2(1180, 450) },

      // MedBay / Revir (Top Room)
      { p1: new Vec2(-300, -780), p2: new Vec2(300, -780) },
      { p1: new Vec2(-300, -780), p2: new Vec2(-300, -460) },
      { p1: new Vec2(300, -780), p2: new Vec2(300, -460) },
      { p1: new Vec2(-300, -460), p2: new Vec2(-65, -460) },
      { p1: new Vec2(65, -460), p2: new Vec2(300, -460) },

      // Security / Kalkan (Bottom Room)
      { p1: new Vec2(-280, 460), p2: new Vec2(-65, 460) },
      { p1: new Vec2(65, 460), p2: new Vec2(280, 460) },
      { p1: new Vec2(-280, 460), p2: new Vec2(-280, 780) },
      { p1: new Vec2(280, 460), p2: new Vec2(280, 780) },

      // O2 / Yaşam Destek (Top Right Room)
      { p1: new Vec2(520, -750), p2: new Vec2(920, -750) },
      { p1: new Vec2(520, -750), p2: new Vec2(520, -660) },
      { p1: new Vec2(520, -560), p2: new Vec2(520, -480) },
      { p1: new Vec2(920, -750), p2: new Vec2(920, -480) },

      // Storage / Depo (Bottom Right Room)
      { p1: new Vec2(500, 460), p2: new Vec2(950, 460) },
      { p1: new Vec2(500, 460), p2: new Vec2(500, 580) },
      { p1: new Vec2(500, 680), p2: new Vec2(500, 800) },
      { p1: new Vec2(950, 460), p2: new Vec2(950, 800) }
    ],
    roomsList: [
      { id: 'cafeteria', name: 'Kafeterya (Merkez)', x: 0, y: -30, w: 640, h: 500, icon: '☕' },
      { id: 'reactor', name: 'Reaktör & Motor Odası', x: -910, y: 0, w: 420, h: 840, icon: '⚛️' },
      { id: 'electrical', name: 'Elektrik & Jeneratör', x: -730, y: 550, w: 400, h: 360, icon: '⚡' },
      { id: 'medbay', name: 'Revir (MedBay)', x: 0, y: -620, w: 560, h: 280, icon: '💊' },
      { id: 'cockpit', name: 'Kokpit & Seyir / Navigasyon', x: 940, y: 0, w: 440, h: 840, icon: '🚀' },
      { id: 'security', name: 'Güvenlik & Kalkan', x: 0, y: 620, w: 520, h: 300, icon: '🛡️' },
      { id: 'o2', name: 'O2 & Yaşam Destek', x: 720, y: -610, w: 380, h: 260, icon: '🍃' },
      { id: 'storage', name: 'Depo & Kargo Bölümü', x: 720, y: 630, w: 420, h: 320, icon: '📦' }
    ],
    doors: [
      { id: 'door_cafe_north', name: 'Kafeterya Kuzey Kapısı', x: 0, y: -300, w: 130, h: 28, orientation: 'h', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_cafe_south', name: 'Kafeterya Güney Kapısı', x: 0, y: 240, w: 130, h: 28, orientation: 'h', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_cafe_west', name: 'Kafeterya Batı Kapısı', x: -340, y: 0, w: 28, h: 110, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_cafe_east', name: 'Kafeterya Doğu Kapısı', x: 340, y: 0, w: 28, h: 110, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_medbay', name: 'Revir Kapısı', x: 0, y: -460, w: 130, h: 28, orientation: 'h', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_security', name: 'Güvenlik Kapısı', x: 0, y: 460, w: 130, h: 28, orientation: 'h', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_reactor', name: 'Reaktör Kapısı', x: -680, y: 0, w: 28, h: 120, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_cockpit', name: 'Kokpit Kapısı', x: 700, y: 0, w: 28, h: 120, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_electrical', name: 'Elektrik Kapısı', x: -520, y: 545, w: 28, h: 110, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_storage', name: 'Depo Kapısı', x: 500, y: 630, w: 28, h: 110, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 },
      { id: 'door_o2', name: 'O2 Kapısı', x: 520, y: -610, w: 28, h: 100, orientation: 'v', isOpen: false, openTimer: 0, isLocked: false, lockTimer: 0 }
    ],
    corridors: [
      { id: 'corr_north', name: 'Kuzey Koridoru (Revir Yolu)', x: 0, y: -380, w: 130, h: 160 },
      { id: 'corr_south', name: 'Güney Koridoru (Güvenlik Yolu)', x: 0, y: 350, w: 130, h: 160 },
      { id: 'corr_west', name: 'Batı Ana Koridoru (Reaktör Yolu)', x: -510, y: 0, w: 340, h: 110 },
      { id: 'corr_east', name: 'Doğu Ana Koridoru (Kokpit Yolu)', x: 520, y: 0, w: 360, h: 110 },
      { id: 'corr_ne', name: 'Kuzeydoğu Koridoru (O2 Geçişi)', x: 430, y: -450, w: 120, h: 120 },
      { id: 'corr_se', name: 'Güneydoğu Koridoru (Depo Geçişi)', x: 420, y: 450, w: 120, h: 120 },
      { id: 'corr_sw', name: 'Güneybatı Koridoru (Elektrik Geçişi)', x: -430, y: 450, w: 120, h: 120 }
    ],
    vents: [
      { id: 'vent_elec', room: 'electrical', x: -750, y: 580, connectsTo: ['vent_react', 'vent_sec'] },
      { id: 'vent_react', room: 'reactor', x: -940, y: -260, connectsTo: ['vent_elec', 'vent_med'] },
      { id: 'vent_med', room: 'medbay', x: -180, y: -640, connectsTo: ['vent_react', 'vent_cafe'] },
      { id: 'vent_cafe', room: 'cafeteria', x: 250, y: -220, connectsTo: ['vent_med', 'vent_o2'] },
      { id: 'vent_o2', room: 'o2', x: 760, y: -620, connectsTo: ['vent_cafe', 'vent_cockpit'] },
      { id: 'vent_cockpit', room: 'cockpit', x: 960, y: -240, connectsTo: ['vent_o2', 'vent_storage'] },
      { id: 'vent_storage', room: 'storage', x: 760, y: 640, connectsTo: ['vent_cockpit', 'vent_sec'] },
      { id: 'vent_sec', room: 'security', x: 160, y: 640, connectsTo: ['vent_storage', 'vent_elec'] }
    ],
    taskStations: [
      { id: 'task_wires_elec', room: 'electrical', name: 'Kabloları Onar', x: -800, y: 600, duration: 4.5, icon: '🔌' },
      { id: 'task_align_engine', room: 'reactor', name: 'Motorları Hizala', x: -950, y: 150, duration: 5.0, icon: '⚙️' },
      { id: 'task_download_data', room: 'cockpit', name: 'Seyir Verilerini İndir', x: 1000, y: -100, duration: 6.0, icon: '💾' },
      { id: 'task_med_scan', room: 'medbay', name: 'Biyo-Tarama Yap', x: 60, y: -610, duration: 5.5, icon: '🧬' },
      { id: 'task_prime_shields', room: 'security', name: 'Kalkan Gücünü Dengele', x: -120, y: 620, duration: 4.5, icon: '🛡️' },
      { id: 'task_clean_filter', room: 'o2', name: 'Oksijen Filtresini Temizle', x: 720, y: -620, duration: 4.0, icon: '🍃' },
      { id: 'task_fuel_engines', room: 'storage', name: 'Yakıt Bidonlarını Doldur', x: 720, y: 620, duration: 5.0, icon: '⛽' },
      { id: 'task_swipe_card', room: 'cafeteria', name: 'Yönetici Kartını Oku', x: -100, y: -180, duration: 3.5, icon: '💳' }
    ]
  };
}
