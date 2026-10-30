import express from 'express';

const app = express();
const PORT = process.env.PORT || 4000;
const SOCKET_URL = '/ws';

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Server Statistics & System Health
const serverStartTime = Date.now();

const GAME_MODES = [
  {
    id: 'puck',
    name: '⚽ Disk Futbolu Arenası',
    badge: 'Takım Oyunu',
    color: '#3b82f6',
    description: '2D fizik tabanlı nostaljik futbol! Kırmızı ve Mavi takım diskiyle topa şut çek, çalım at, golleri sırala.',
    maxPlayers: 8,
    controls: ['WASD / Yön Tuşları: Hareket', 'Boşluk / Sol Tık: Şut & Pas', 'Shift / E / Sağ Tık: Top Tutma (Çalım)']
  },
  {
    id: 'sumo',
    name: '🥊 Sumo Knockout Arenası',
    badge: 'Battle Royale',
    color: '#ef4444',
    description: 'Düşmanlarını daralan çemberin dışına fırlat! Dash yeteneğinle rakiplerine sert çarpışmalar yap.',
    maxPlayers: 10,
    controls: ['WASD / Yön Tuşları: Hareket', 'Boşluk / Sol Tık: Ani Dash']
  },
  {
    id: 'agar',
    name: '🟢 Agar Büyüme Arenası',
    badge: 'Serbest Mod',
    color: '#10b981',
    description: 'Arenadaki enerji kürelerini yut, kütleni büyüt, bölünüp yem fırlatarak liderlik tablosunun zirvesine yerleş!',
    maxPlayers: 20,
    controls: ['WASD / Yön Tuşları: Hareket', 'Boşluk / Sol Tık: İkiye Bölün (Split)', 'E / F / Sağ Tık: Yem At (Feed)']
  },
  {
    id: 'space',
    name: '🚀 Uzay Casusu (Spaceship Impostor)',
    badge: 'Gizli Rol & Hayatta Kalma',
    color: '#a855f7',
    description: 'Uzay gemisinde görevleri tamamla ya da casus olarak mürettebatı gizlice avla! Havalandırmaları kullan, cesetleri bildir, acil toplantıda casusu oyla.',
    maxPlayers: 10,
    controls: ['WASD / Yön Tuşları: Hareket', 'E / F / Boşluk: Görev Yap / Buton Bas', 'Q: Öldür (Casus)', 'V: Havalandırma (Vent - Casus)', 'R: Ceset Bildir (Report)']
  },
  {
    id: 'vampire',
    name: '🧛 Vampir Köylü (Vampire & Villager)',
    badge: 'Sosyal Çıkarım & Gizli Rol',
    color: '#dc2626',
    description: 'Gece kasabaya sis çöktüğünde vampirler kurban arar! Doktor korur, kahin araştırır, gündüz köy meydanında şüpheliler darağacına gönderilir.',
    maxPlayers: 12,
    controls: ['WASD / Yön Tuşları: Köyde Gezinme', 'Gece / Mahkeme: Eylem ve İdam Oylaması', 'Enter: Köy Sohbeti']
  },
  {
    id: 'conquest',
    name: '🏰 Bil ve Fethet (Trivia Territory Conquest)',
    badge: 'Bilgi & Strateji',
    color: '#d97706',
    description: 'Tarih, coğrafya, bilim ve rekorlar hakkında klasik tahmin soruları! En yakın ve en hızlı cevabı veren Türkiye haritasındaki şehirleri fetheder.',
    maxPlayers: 8,
    controls: ['Klavye / Ekran Tuş Takımı: Sayısal Tahmin Girişi', 'Sol Tık: Haritadan Şehir Seç & Fethet', 'Enter: Cevabı Onayla']
  }
];

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    socketEndpoint: SOCKET_URL
  });
});

// Game Modes Meta
app.get('/api/modes', (req, res) => {
  res.json({ modes: GAME_MODES });
});

// Global Game Server Info
app.get('/api/config', (req, res) => {
  res.json({
    socketUrl: SOCKET_URL,
    version: '1.0.0',
    title: 'ARMOYU MiniGames Arcade'
  });
});

export const server = app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log(`🌐 [Backend API] REST Signalling API port ${PORT} üzerinde hazır!`);
});
