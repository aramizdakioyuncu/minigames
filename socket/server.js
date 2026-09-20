import { WebSocketServer } from 'ws';
import { Room } from './engine/room.js';
import { configDb } from './db/configDb.js';
import { modeRegistry } from './engine/modes/modeRegistry.js';

const PORT = process.env.PORT || 5050;
const wss = new WebSocketServer({ port: PORT });

// Global Room Registry
export const rooms = new Map();

// Initialize Default Public Rooms
function initDefaultRooms() {
  const defaultRooms = [
    { id: 'puck-1', name: '⚽ Disk Futbolu Türkiye Sunucusu', mode: 'puck', max: 8, speed: 1.0 },
    { id: 'space-1', name: '🚀 Uzay Casusu / Skeld Gemisi', mode: 'space', max: 10, speed: 1.0 },
    { id: 'vampire-1', name: '🧛 Vampir Köylü / Kasaba Meydanı', mode: 'vampire', max: 12, speed: 1.0 },
    { id: 'conquest-1', name: '🏰 Bil ve Fethet / Anadolu Seferi', mode: 'conquest', max: 8, speed: 1.0 },
    { id: 'puck-2', name: '⚡ Disk Futbolu 1v1 Hızlı Düello', mode: 'puck', max: 2, speed: 1.15 },
    { id: 'sumo-1', name: '🥊 Sumo Knockout Arenası', mode: 'sumo', max: 10, speed: 1.0 },
    { id: 'agar-1', name: '🟢 Agar Büyüme Arenası', mode: 'agar', max: 20, speed: 1.0 }
  ];

  for (const r of defaultRooms) {
    rooms.set(r.id, new Room(r.id, r.name, r.mode, { maxPlayers: r.max, speedMultiplier: r.speed }));
  }
}

const GAME_MODES_META = [
  {
    id: 'puck',
    name: '⚽ Disk Futbolu',
    badge: 'Takım Oyunu',
    color: '#3b82f6',
    description: '2D fizik tabanlı nostaljik futbol! Kırmızı ve Mavi takım diskiyle topa şut çek, çalım at, golleri sırala.',
    maxPlayers: 8
  },
  {
    id: 'space',
    name: '🚀 Uzay Casusu',
    badge: 'Gizli Rol & Hayatta Kalma',
    color: '#a855f7',
    description: 'Uzay gemisinde görevleri tamamla ya da casus olarak mürettebatı gizlice avla! Havalandırmaları kullan, cesetleri bildir.',
    maxPlayers: 10
  },
  {
    id: 'vampire',
    name: '🧛 Vampir Köylü',
    badge: 'Sosyal Çıkarım',
    color: '#ef4444',
    description: 'Gece kasabaya sis çöktüğünde vampirler kurban arar! Doktor korur, kahin araştırır, gündüz şüpheliler darağacına gönderilir.',
    maxPlayers: 12
  },
  {
    id: 'conquest',
    name: '🏰 Bil ve Fethet',
    badge: 'Bilgi & Strateji',
    color: '#f59e0b',
    description: 'Tarih, coğrafya, bilim ve rekorlar tahmin soruları! En yakın ve en hızlı cevabı veren şehirleri fetheder.',
    maxPlayers: 8
  },
  {
    id: 'sumo',
    name: '🥊 Sumo Knockout',
    badge: 'Battle Royale',
    color: '#ef4444',
    description: 'Düşmanlarını daralan çemberin dışına fırlat! Dash yeteneğinle rakiplerine sert darbeler indir.',
    maxPlayers: 10
  },
  {
    id: 'agar',
    name: '🟢 Agar Büyüme',
    badge: 'Büyüme & Kaos',
    color: '#10b981',
    description: 'Arenadaki enerji kürelerini yut, kütleni büyüt, bölünüp yem fırlatarak liderlik tablosunun zirvesine yerleş!',
    maxPlayers: 20
  }
];

initDefaultRooms();

console.log(`🚀 [Socket Server] WebSocket Oyun Sunucusu port ${PORT} üzerinde dinlemede...`);

wss.on('connection', (ws) => {
  const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
  let currentRoom = null;
  let playerRef = null;

  // Send initial room list & modes metadata
  send(ws, {
    type: 'init',
    playerId,
    rooms: getPublicRoomsList(),
    modes: GAME_MODES_META
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

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
          const roomName = (data.roomName || data.name || 'Özel Oda').substring(0, 24);
          const availableModes = modeRegistry.getAvailableModes();
          const mode = availableModes.includes(data.mode) ? data.mode : 'puck';
          const maxPlayers = Math.min(Math.max(parseInt(data.maxPlayers) || 8, 2), 24);
          const speedMultiplier = Math.min(Math.max(parseFloat(data.speedMultiplier) || 1.35, 0.8), 2.5);
          const matchDuration = Math.min(Math.max(parseInt(data.matchDuration) || 180, 60), 1200);
          const isPrivate = !!data.isPrivate;
          const mapTheme = (data.mapTheme && ['spaceship', 'castle', 'mansion'].includes(data.mapTheme)) ? data.mapTheme : 'spaceship';

          const newRoom = new Room(roomId, roomName, mode, {
            maxPlayers,
            isPrivate,
            speedMultiplier,
            matchDuration,
            mapTheme
          });
          rooms.set(roomId, newRoom);

          send(ws, {
            type: 'room_created',
            roomId
          });

          // Broadcast updated rooms list to all lobby clients
          const pubRooms = getPublicRoomsList();
          wss.clients.forEach(client => {
            if (client.readyState === 1) {
              send(client, {
                type: 'rooms_list',
                rooms: pubRooms
              });
            }
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
        case 'report':
        case 'conquest_submit_answer':
        case 'submit_answer':
        case 'conquest_claim_territory':
        case 'claim_territory':
        case 'conquest_attack_territory':
        case 'attack_territory':
        case 'sabotage':
        case 'fix_sabotage':
        case 'vampire_vote':
        case 'doctor_heal':
        case 'seer_investigate': {
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
            // In Space mode, chat is closed during active gameplay and only allowed during emergency meetings / lobby
            if (currentRoom.modeType === 'space' && currentRoom.mode && currentRoom.mode.gameState === 'playing') {
              send(ws, {
                type: 'chat',
                id: 'sys_' + Math.random().toString(36).substring(2, 7),
                sender: 'Sistem',
                text: '🤫 Uzay Casusunda oyun esnasında telsiz sessizliği geçerlidir! Sadece Acil Durum Toplantısında konuşabilirsiniz.',
                color: '#ef4444',
                time: Date.now()
              });
              break;
            }

            // In Vampire mode, night chat is reserved exclusively for the secret Vampire frequency
            if (currentRoom.modeType === 'vampire' && currentRoom.mode && currentRoom.mode.gameState === 'night') {
              if (playerRef.role === 'vampire') {
                const cleanText = data.text.trim().substring(0, 100);
                if (cleanText.length > 0) {
                  for (const p of currentRoom.players.values()) {
                    if (p.role === 'vampire' && p.ws && p.ws.readyState === 1) {
                      send(p.ws, {
                        type: 'chat',
                        id: 'vamp_' + Math.random().toString(36).substring(2, 7),
                        sender: `🧛 [Vampir] ${playerRef.name}`,
                        text: cleanText,
                        color: '#ef4444',
                        time: Date.now()
                      });
                    }
                  }
                }
                break;
              } else {
                send(ws, {
                  type: 'chat',
                  id: 'sys_' + Math.random().toString(36).substring(2, 7),
                  sender: 'Sistem',
                  text: '🌙 Gece vakti köylüler uykuda! Konuşmak için sabah köy çanını bekleyin.',
                  color: '#818cf8',
                  time: Date.now()
                });
                break;
              }
            }

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
