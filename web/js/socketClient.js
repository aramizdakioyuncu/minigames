export class SocketClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.myPlayerId = null;
    this.handlers = {};
    this.ping = 0;
    this.pingInterval = null;

    this.retryCount = 0;
  }

  getCandidateUrls() {
    const proto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    return [`${proto}${window.location.host}/ws`];
  }

  async connect() {
    if (this.isConnected) return;
    if (this.connectingPromise) return this.connectingPromise;
    clearTimeout(this.reconnectTimer);
    const candidateUrls = this.getCandidateUrls();
    const url = candidateUrls[this.retryCount % candidateUrls.length];
    this.serverUrl = url;

    this.connectingPromise = new Promise((resolve, reject) => {
      try {
        console.log(`🔌 [SocketClient] WebSocket bağlantısı deneniyor (${(this.retryCount % candidateUrls.length) + 1}/${candidateUrls.length}): ${this.serverUrl}`);
        this.ws = new WebSocket(this.serverUrl);
        const ws = this.ws;
        const timeout = setTimeout(() => { if (ws.readyState === WebSocket.CONNECTING) ws.close(); }, 5000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          console.log(`✅ [SocketClient] WebSocket bağlantısı kuruldu: ${this.serverUrl}`);
          this.isConnected = true;
          this.startPingLoop();
          if (this.handlers.onConnect) this.handlers.onConnect();
          resolve();
        };

        this.ws.onclose = () => {
          clearTimeout(timeout);
          this.connectingPromise = null;
          reject(new Error('Bağlantı kapandı'));
          this.isConnected = false;
          this.stopPingLoop();
          if (this.handlers.onDisconnect) this.handlers.onDisconnect();
          
          this.retryCount++;
          const retryDelay = Math.min(2000, 500 * (this.retryCount % 4 + 1));
          this.reconnectTimer = setTimeout(() => this.connect().catch(() => {}), retryDelay);
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
        this.connectingPromise = null;
        reject(err);
      }
    });
    return this.connectingPromise;
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

      case 'room_created':
        if (this.handlers.onRoomCreated) this.handlers.onRoomCreated(data.roomId);
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
      case 'auth_state':
        this.authenticated = data.authenticated === true;
        break;
      case 'auth_expired':
        this.authenticated = false;
        if (this.handlers.onAuthExpired) this.handlers.onAuthExpired();
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

  joinRoom(roomId, playerProfile, accessToken = null) {
    const payload = {
      type: 'join_room',
      roomId,
      name: playerProfile.name,
      color: playerProfile.color,
      avatar: playerProfile.avatar,
      ...(accessToken ? { accessToken } : {})
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send(payload);
    } else {
      this.connect().then(() => {
        this.send(payload);
      }).catch((err) => {
        console.error('joinRoom connection error:', err);
      });
    }
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
      ,mapTheme: roomConfig.mapTheme || 'spaceship'
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
    if (!actionData) return;
    const actType = actionData.type || actionData.action;
    this.send({
      ...actionData,
      type: 'action',
      action: actType
    });
  }

  on(event, cb) {
    this.handlers[event] = cb;
  }
}
