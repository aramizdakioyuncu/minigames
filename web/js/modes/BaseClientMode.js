// BaseClientMode.js - Base class for frontend game mode modules

export class BaseClientMode {
  constructor(name) {
    this.name = name;
  }

  /**
   * Called when entering a room with this mode.
   * @param {object} roomData
   * @param {import('../ui.js').UIController} ui
   */
  onActivate(roomData, ui) {}

  /**
   * Called when leaving the room.
   * @param {import('../ui.js').UIController} ui
   */
  onDeactivate(ui) {}

  /**
   * Whether this mode uses a centered fixed arena camera (e.g. Puck/Sumo) or player tracking (e.g. Space/Agar).
   * @returns {boolean}
   */
  isFixedArena() {
    return false;
  }

  /**
   * Gets the arena dimensions for camera calculation.
   * @param {object} gameState
   * @returns {{ width: number, height: number }}
   */
  getArenaDimensions(gameState) {
    const s = (gameState && gameState.modeState) || {};
    return {
      width: s.width || 1200,
      height: s.height || 700
    };
  }

  /**
   * Renders background, arena borders, lines and static environment.
   * @param {import('../renderer.js').GameRenderer} renderer
   * @param {PIXI.Graphics} g
   * @param {object} gameState
   */
  renderEnvironment(renderer, g, gameState) {}

  /**
   * Renders mode-specific dynamic entities (e.g. ball, pellets, viruses, dead bodies, vents, task stations).
   * @param {import('../renderer.js').GameRenderer} renderer
   * @param {PIXI.Graphics} g
   * @param {object} gameState
   * @param {Map} entities
   * @param {string} myPlayerId
   */
  renderEntities(renderer, g, gameState, entities, myPlayerId) {}

  /**
   * Updates mode-specific HTML HUD and overlays.
   * @param {import('../ui.js').UIController} ui
   * @param {object} gameState
   * @param {string} myPlayerId
   */
  updateHUD(ui, gameState, myPlayerId) {}

  /**
   * Handles mode-specific keypress or action triggers.
   * @param {import('../app.js').App} app
   * @param {KeyboardEvent} e
   */
  handleKeyDown(app, e) {}
}
