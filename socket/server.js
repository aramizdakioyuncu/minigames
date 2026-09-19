import { WebSocketServer } from 'ws';
import { Room } from './engine/room.js';
import { configDb } from './db/configDb.js';

const PORT = process.env.PORT || 5050;
const wss = new WebSocketServer({ port: PORT });

// Global Room Registry
export const rooms = new Map();

// Initialize Default Public Rooms
function initDefaultRooms() {
  const defaultRooms = [
    { id: 'puck-1', name: '⚽ Disk Futbolu Türkiye Sunucusu', mode: 'puck', max: 8, speed: 1.0 },
    { id: 'space-1', name: '🚀 Uzay Casusu / Skeld Gemisi', mode: 'space', max: 10, speed: 1.0 },
    { id: 'puck-2', name: '⚡ Disk Futbolu 1v1 Hızlı Düello', mode: 'puck', max: 2, speed: 1.15 },
    { id: 'sumo-1', name: '🥊 Sumo Knockout Arenası', mode: 'sumo', max: 10, speed: 1.0 },
    { id: 'agar-1', name: '🟢 Agar Büyüme Arenası', mode: 'agar', max: 20, speed: 1.0 }
  ];

  for (const r of defaultRooms) {
    rooms.set(r.id, new Room(r.id, r.name, r.mode, { maxPlayers: r.max, speedMultiplier: r.speed }));
  }
}

initDefaultRooms();

console.log(`🚀 [Socket Server] WebSocket Oyun Sunucusu port ${PORT} üzerinde dinlemede...`);

wss.on('connection', (ws) => {
  const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
  let currentRoom = null;
  let playerRef = null;

  // Send initial room list
  send(ws, {
    type: 'init',
    playerId,
    rooms: getPublicRoomsList()
  });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      switch (data.type) {
        case 'get_rooms': {
          send(ws, {
            type: 'rooms_list',
            rooms: getPublicRoomsList()
          });
          break;
        }

        case 'create_room': {
          const roomId = 'rm_' + Math.random().toString(36).substring(2, 8);
          const roomName = (data.name || 'Özel Oda').substring(0, 24);
          const mode = ['puck', 'sumo', 'agar', 'space'].includes(data.mode) ? data.mode : 'puck';
          const maxPlayers = Math.min(Math.max(parseInt(data.maxPlayers) || 8, 2), 24);
          const speedMultiplier = Math.min(Math.max(parseFloat(data.speedMultiplier) || 1.35, 0.8), 2.5);
          const matchDuration = Math.min(Math.max(parseInt(data.matchDuration) || 180, 60), 1200);
          const isPrivate = !!data.isPrivate;

          const newRoom = new Room(roomId, roomName, mode, {
            maxPlayers,
            isPrivate,
            speedMultiplier,
            matchDuration
          });
          rooms.set(roomId, newRoom);

          send(ws, {
            type: 'room_created',
            roomId
          });
          break;
        }

        case 'join_room': {
          if (currentRoom) {
            currentRoom.removePlayer(playerId);
            currentRoom = null;
          }

          const targetRoom = rooms.get(data.roomId);
          if (!targetRoom) {
            send(ws, { type: 'error', message: 'Oda bulunamadı veya kapatılmış.' });
            return;
          }

          currentRoom = targetRoom;
          playerRef = targetRoom.addPlayer(
            playerId,
            data.name,
            data.color,
            data.avatar,
            ws
          );

          send(ws, {
            type: 'joined_room',
            roomId: targetRoom.id,
            roomName: targetRoom.name,
            mode: targetRoom.modeType,
            playerId: playerId,
            team: playerRef.team
          });
          break;
        }

        case 'leave_room': {
          if (currentRoom) {
            currentRoom.removePlayer(playerId);
            currentRoom = null;
            playerRef = null;
          }
          send(ws, {
            type: 'left_room',
            rooms: getPublicRoomsList()
          });
          break;
        }

        case 'input': {
          if (currentRoom && data.input) {
            currentRoom.handlePlayerInput(playerId, data.input);
          }
          break;
        }

        case 'action':
        case 'start_match':
        case 'start_game':
        case 'stop_match':
        case 'toggle_match':
        case 'restart_match':
        case 'vote_start':
        case 'vote_restart':
        case 'vote':
        case 'complete_task':
        case 'emergency_meeting':
        case 'report': {
          if (currentRoom) {
            const actionPayload = {
              ...data,
              type: data.action || data.actionType || data.type
            };
            currentRoom.handlePlayerAction(playerId, actionPayload);
          }
          break;
        }

        case 'change_team': {
          if (currentRoom && data.team) {
            currentRoom.handleTeamChange(playerId, data.team);
          }
          break;
        }

        case 'chat': {
          if (currentRoom && data.text && playerRef) {
            const cleanText = data.text.trim().substring(0, 100);
            if (cleanText.length > 0) {
              currentRoom.broadcastChat(playerRef.name, cleanText, playerRef.color);
            }
          }
          break;
        }

        case 'ping': {
          const clientTime = data.t;
          if (playerRef) {
            playerRef.ping = Math.max(1, Date.now() - clientTime);
          }
          send(ws, { type: 'pong', clientTime, serverTime: Date.now() });
          break;
        }
      }
    } catch (err) {
      console.error('Socket message parse error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      currentRoom.removePlayer(playerId);
      // Clean up empty custom/private rooms (keep default rooms open)
      if (currentRoom.players.size === 0 && currentRoom.id.startsWith('rm_')) {
        currentRoom.destroy();
        rooms.delete(currentRoom.id);
      }
    }
  });
});

function getPublicRoomsList() {
  const list = [];
  for (const r of rooms.values()) {
    if (!r.isPrivate) {
      list.push(r.getInfo());
    }
  }
  return list;
}

function send(ws, msg) {
  if (ws.readyState === 1) { // OPEN
    ws.send(JSON.stringify(msg));
  }
}
