// modeRegistry.js - Factory and Registry for Game Modes

import { PuckMode } from './puckMode.js';
import { SumoMode } from './sumoMode.js';
import { AgarMode } from './agarMode.js';
import { SpaceMode } from './spaceMode.js';
import { VampireMode } from './vampireMode.js';
import { ConquestMode } from './conquestMode.js';

class ModeRegistry {
  constructor() {
    this.modes = new Map();
    this.registerDefaults();
  }

  registerDefaults() {
    this.register('puck', PuckMode);
    this.register('sumo', SumoMode);
    this.register('agar', AgarMode);
    this.register('space', SpaceMode);
    this.register('vampire', VampireMode);
    this.register('conquest', ConquestMode);
  }

  /**
   * Registers a game mode class.
   * @param {string} modeType
   * @param {typeof import('./BaseMode.js').BaseMode} ModeClass
   */
  register(modeType, ModeClass) {
    this.modes.set(modeType, ModeClass);
  }

  /**
   * Instantiates a game mode for the given room.
   * @param {string} modeType
   * @param {import('../room.js').Room} room
   * @param {object} [options]
   * @returns {import('./BaseMode.js').BaseMode}
   */
  createMode(modeType, room, options = {}) {
    const ModeClass = this.modes.get(modeType) || this.modes.get('puck');
    return new ModeClass(room, options);
  }

  /**
   * Returns list of registered mode names.
   * @returns {string[]}
   */
  getAvailableModes() {
    return Array.from(this.modes.keys());
  }
}

export const modeRegistry = new ModeRegistry();
