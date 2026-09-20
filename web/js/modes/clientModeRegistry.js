// clientModeRegistry.js - Factory and Active Mode Manager for Frontend Client

import { PuckClientMode } from './puckClient.js';
import { SumoClientMode } from './sumoClient.js';
import { AgarClientMode } from './agarClient.js';
import { SpaceClientMode } from './spaceClient.js';
import { VampireClientMode } from './vampireClient.js';
import { ConquestClientMode } from './conquestClient.js';

class ClientModeRegistry {
  constructor() {
    this.modes = new Map();
    this.activeMode = null;
    this.registerDefaults();
  }

  registerDefaults() {
    this.register('puck', new PuckClientMode());
    this.register('sumo', new SumoClientMode());
    this.register('agar', new AgarClientMode());
    this.register('space', new SpaceClientMode());
    this.register('vampire', new VampireClientMode());
    this.register('conquest', new ConquestClientMode());
  }

  register(modeType, modeInstance) {
    this.modes.set(modeType, modeInstance);
  }

  getMode(modeType) {
    return this.modes.get(modeType) || this.modes.get('puck');
  }

  activate(modeType, roomData, ui) {
    const targetMode = this.getMode(modeType);
    if (this.activeMode && this.activeMode !== targetMode && this.activeMode.onDeactivate) {
      this.activeMode.onDeactivate(ui);
    }
    this.activeMode = targetMode;
    if (this.activeMode && this.activeMode.onActivate) {
      this.activeMode.onActivate(roomData, ui);
    }
    return this.activeMode;
  }

  getActiveMode(modeType) {
    if (modeType && this.modes.has(modeType)) {
      return this.modes.get(modeType);
    }
    return this.activeMode || this.getMode('puck');
  }
}

export const clientModeRegistry = new ClientModeRegistry();
