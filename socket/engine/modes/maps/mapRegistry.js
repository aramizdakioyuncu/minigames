// mapRegistry.js - Modular Map Registry for Game Modes

import { getSpaceshipMap } from './spaceshipMap.js';
import { getCastleMap } from './castleMap.js';
import { getMansionMap } from './mansionMap.js';

class MapRegistry {
  constructor() {
    this.mapProviders = new Map();
    this.registerDefaults();
  }

  registerDefaults() {
    this.register('spaceship', getSpaceshipMap);
    this.register('castle', getCastleMap);
    this.register('mansion', getMansionMap);
  }

  register(theme, providerFn) {
    this.mapProviders.set(theme, providerFn);
  }

  getMap(theme = 'spaceship', hw = 1400, hh = 900) {
    const provider = this.mapProviders.get(theme) || this.mapProviders.get('spaceship');
    return provider(hw, hh);
  }

  getAvailableThemes() {
    return Array.from(this.mapProviders.keys());
  }
}

export const mapRegistry = new MapRegistry();
