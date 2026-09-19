import fs from 'fs';
import path from 'path';

// Server-Side Authoritative Game Physics Settings (Anti-Cheat / DB Store)
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'game_config.json');

// Perfectly Balanced & Calibrated Classic Disk Futbolu (Puck) / Sumo / Agar Constants
const DEFAULT_CONFIG = {
  // Disk Futbolu (Puck) Mode Settings
  puck_player_accel: 0.50,       // Progressive smooth acceleration
  puck_player_max_speed: 5.5,    // Calibrated top speed
  puck_player_damping: 0.968,    // Natural turf glide & drift inertia (does not stop dead)
  puck_kick_power: 14.5,         // Controlled kick impulse
  puck_kick_range: 34,           // Reach radius for kick
  puck_ball_damping: 0.990,      // Realistic gliding puck
  puck_ball_restitution: 0.88,   // Bounciness off posts and walls

  // Sumo Mode Settings
  sumo_player_accel: 1.05,
  sumo_player_max_speed: 6.2,
  sumo_dash_power: 20.0,
  sumo_dash_cooldown_ms: 1400,

  // Agar Mode Settings
  agar_player_base_accel: 0.90,
  agar_player_max_speed: 5.5,

  // Global Tick
  server_tick_rate: 60
};

class ConfigDatabase {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      // Overwrite with calibrated balanced config
      this.config = { ...DEFAULT_CONFIG };
      this.save();
      console.log('⚖️ [Config DB] Dengeli ve Optimize Fizik Ayarları Veritabanına Yazıldı.');
    } catch (err) {
      console.error('Config DB init error, using defaults:', err);
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  get(key) {
    return this.config[key] !== undefined ? this.config[key] : DEFAULT_CONFIG[key];
  }

  set(key, value) {
    this.config[key] = Number(value);
    this.save();
  }

  getAll() {
    return { ...this.config };
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      console.error('Config DB save error:', err);
    }
  }
}

export const configDb = new ConfigDatabase();
