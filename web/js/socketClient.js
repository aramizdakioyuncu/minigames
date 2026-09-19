export class SocketClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.myPlayerId = null;
    this.handlers = {};
    this.ping = 0;
    this.pingInterval = null;

    const urlParams = new URLSearchParams(window.location.search);
    this.customSocket = urlParams.get('socket');
    this.retryCount = 0;
  }

  getCandidateUrls() {
    if (this.customSocket) {
      const proto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
      const host = window.location.hostname || 'localhost';
      return [this.customSocket.startsWith('ws') ? this.customSocket : `${proto}${host}:${this.customSocket}`];
    }

    const proto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const host = window.location.hostname || 'localhost';

    const list = [];
    // 1. Primary Nginx reverse proxy endpoint (/ws) - Standard for Coolify domain & SSL
    if (window.location.host) {
      list.push(`${proto}${window.location.host}/ws`);
    }

    // 2. Direct socket port fallback (for local standalone testing)
    if (host === 'localhost' || host === '127.0.0.1') {
      list.push(`${proto}${host}:5050`);
      list.push(`${proto}${host}:8080/ws`);
    }

    return list;
  }

  async connect() {
    const candidateUrls = this.getCandidateUrls();
    const url = candidateUrls[this.retryCount % candidateUrls.length];
    this.serverUrl = url;

    return new Promise((resolve, reject) => {
      try {
        console.log(`🔌 [SocketClient] WebSocket bağlantısı deneniyor (${(this.retryCount % candidateUrls.length) + 1}/${candidateUrls.length}): ${this.serverUrl}`);
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log(`✅ [SocketClient] WebSocket bağlantısı kuruldu: ${this.serverUrl}`);
          this.isConnected = true;
          this.startPingLoop();
          if (this.handlers.onConnect) this.handlers.onConnect();
          resolve();
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.stopPingLoop();
          if (this.handlers.onDisconnect) this.handlers.onDisconnect();
          
          this.retryCount++;
          const retryDelay = Math.min(2000, 500 * (this.retryCount % 4 + 1));
          setTimeout(() => this.connect(), retryDelay);
        };

        this.ws.onerror = (err) => {
          console.warn(`⚠️ [SocketClient] WebSocket hatası (${this.serverUrl}):`, err);
        };

        this.ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            this.handleMessage(data);
          } catch (e) {
            console.error('Socket parse error:', e);
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  handleMessage(data) {
    switch (data.type) {
      case 'init':
        this.myPlayerId = data.playerId;
        if (this.handlers.onInit) this.handlers.onInit(data);
        break;

      case 'rooms_list':
        if (this.handlers.onRoomsList) this.handlers.onRoomsList(data.rooms);
        break;

      case 'joined_room':
        if (this.handlers.onJoinedRoom) this.handlers.onJoinedRoom(data);
        break;

      case 'left_room':
        if (this.handlers.onLeftRoom) this.handlers.onLeftRoom(data);
        break;

      case 'game_state':
        if (this.handlers.onGameState) this.handlers.onGameState(data);
        break;

      case 'chat':
        if (this.handlers.onChat) this.handlers.onChat(data);
        break;

      case 'pong':
        this.ping = Math.max(1, Date.now() - data.clientTime);
        if (this.handlers.onPing) this.handlers.onPing(this.ping);
        break;

      case 'error':
        if (this.handlers.onError) this.handlers.onError(data.message);
        break;
    }
  }

  startPingLoop() {
    this.stopPingLoop();
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping', t: Date.now() });
      }
    }, 1500);
  }

  stopPingLoop() {
    if (this.pingInterval) clearInterval(this.pingInterval);
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  joinRoom(roomId, playerProfile) {
    this.send({
      type: 'join_room',
      roomId,
      name: playerProfile.name,
      color: playerProfile.color,
      avatar: playerProfile.avatar
    });
  }

  createRoom(roomConfig) {
    this.send({
      type: 'create_room',
      name: roomConfig.name,
      mode: roomConfig.mode,
      speedMultiplier: roomConfig.speedMultiplier || 1.0,
      matchDuration: roomConfig.matchDuration || 180,
      tackleEnabled: roomConfig.tackleEnabled !== undefined ? roomConfig.tackleEnabled : true,
      maxPlayers: roomConfig.maxPlayers,
      isPrivate: roomConfig.isPrivate
    });
  }

  leaveRoom() {
    this.send({ type: 'leave_room' });
  }

  sendInput(inputState) {
    this.send({
      type: 'input',
      input: inputState
    });
  }

  changeTeam(team) {
    this.send({
      type: 'change_team',
      team
    });
  }

  sendChat(text) {
    this.send({
      type: 'chat',
      text
    });
  }

  sendAction(actionData) {
    this.send({
      type: 'action',
      ...actionData
    });
  }

  on(event, cb) {
    this.handlers[event] = cb;
  }
}
