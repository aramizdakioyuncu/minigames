// BaseMode.js - Abstract Base Class for all Server Game Modes

export class BaseMode {
  /**
   * @param {import('../room.js').Room} room
   */
  constructor(room) {
    this.room = room;
    this.name = 'base';
    this.width = 1200;
    this.height = 700;
  }

  /**
   * Called when the mode is initialized or restarted.
   */
  init() {}

  /**
   * Called when a player joins the room.
   * @param {object} player
   */
  onPlayerJoin(player) {
    this.spawnPlayer(player);
  }

  /**
   * Called when a player leaves the room.
   * @param {object} player
   */
  onPlayerLeave(player) {}

  /**
   * Spawns or resets a player's position and attributes.
   * @param {object} player
   */
  spawnPlayer(player) {
    player.pos.set((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
    player.vel.set(0, 0);
  }

  /**
   * Handles per-frame continuous or triggered player input.
   * @param {object} player
   */
  handlePlayerInput(player) {}

  /**
   * Handles discrete network actions sent by a client (e.g. vote, report, task complete).
   * @param {string} playerId
   * @param {object} actionData
   */
  handleAction(playerId, actionData) {}

  /**
   * Physics / logic update loop called at 60Hz.
   * @param {number} dt Delta time in seconds.
   * @param {boolean} secTick True once per second.
   */
  update(dt, secTick) {}

  /**
   * Returns mode-specific state serialized for network broadcast.
   * @returns {object}
   */
  getState() {
    return {
      mode: this.name,
      width: this.width,
      height: this.height
    };
  }

  /**
   * Restarts the match state.
   * @param {string} callerName Name of user triggering restart.
   */
  restart(callerName = 'Host') {
    this.init();
  }

  /**
   * Checks whether team switching is permitted in current match phase.
   * @param {object} player
   * @returns {boolean}
   */
  canChangeTeam(player) {
    return true;
  }

  /**
   * Broadcasts a gameplay event to all players in the room.
   * @param {object} event
   */
  broadcastEvent(event) {
    this.room.broadcastEvent(event);
  }

  /**
   * Broadcasts a system/chat message to all players in the room.
   * @param {string} sender
   * @param {string} message
   * @param {string} color
   */
  broadcastChat(sender, message, color = '#ffffff') {
    this.room.broadcastChat(sender, message, color);
  }
}
