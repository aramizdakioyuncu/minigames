# ⚽ PuckArena - Çok Oyunculu 2D Disk Futbolu & Arcade Mini Oyunlar Platformu

<div align="center">

![PuckArena Banner](https://img.shields.io/badge/PuckArena-v1.0.0-3b82f6?style=for-the-badge&logo=game-and-watch&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-Native%2060Hz-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Coolify%20Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)

<p align="center">
  <b>Tarayıcı üzerinde hiçbir eklenti veya yükleme gerektirmeden çalışan, düşük gecikmeli, sunucu yetkili (server-authoritative) 2D fizik motoruna sahip çok oyunculu arcade mini oyun platformu.</b>
</p>

[🎮 Oyun Modları](#-oyun-modları) • [✨ Öne Çıkan Özellikler](#-öne-çıkan-özellikler) • [⌨️ Kontroller](#️-kontroller-ve-kısayollar) • [🚀 Kurulum ve Docker](#-kurulum-ve-çalıştırma) • [☁️ Coolify Dağıtımı](#️-coolify-üzerinde-tek-tık-canlıya-alma) • [📐 Mimari](#-sistem-mimarisi)

---

</div>

## 🎮 Oyun Modları

### 1. ⚽ Disk Futbolu (Puck Soccer Arena)
* **2D Fizik & Şut Dinamiği:** İki takım (🔴 Kırmızı ve 🔵 Mavi) kalesine gol atmak için yarışır. Gerçekçi top sürtünmesi, kale direği sekmeleri ve hassas şut ivmesi.
* **🧲 Top Tutma & Çalım Yeteneği (Hold Skill):** Topu `Shift`, `E` veya `Sağ Tık` ile diskinize kilitleyerek 2 saniye boyunca sürebilir, ardından rakiplerinizi ters ayakta bırakıp şut çekebilirsiniz (5 saniye cooldown süresi).
* **🥊 Sert Müdahale (Tackle / Faul Açık/Kapalı):** Oda açarken seçilebilen gövde gösterisi ve itişme mekaniği.
* **👁️ Tribün / İzleyici Alanı (Spectator Lounge):** "İzle" seçildiğinde oyuncu saha çizgisinin dışındaki tribün alanında serbestçe gezinebilir, maça müdahale etmeden heyecanı yakından izleyebilir.
* **Otomatik Hakem:** Gol algılama, gol kutlaması, skorbord ve maç süresi sayacı.

### 2. 🥊 Sumo Knockout (Battle Royale)
* **Daralan Ölüm Çemberi:** Zaman geçtikçe daralan çemberin içinde kalın.
* **⚡ Ani Dash Yeteneği:** `Boşluk` veya `Sol Tık` ile rakiplerinize ani hızla çarparak onları ring dışına savurun.
* **Hayatta Kalan Kazanır:** Ringin dışına çıkan diskler elenir, son kalan oyuncu taç giyer 👑.

### 3. 🟢 Agar Bump & Feed (Büyüme Arenası)
* **Besin Toplama & Büyüme:** Haritadaki renkli enerji kürelerini yiyerek kütlenizi ve çapınızı büyütün.
* **✂️ İkiye Bölünme (Split):** `Boşluk (Space)` veya `Sol Tık` ile diskinizi ileri doğru ikiye fırlatıp rakipleri yutabilir veya hızlı hamle yapabilirsiniz (Hücreler bir süre sonra otomatik birleşir).
* **🍇 Yem Fırlatma (Eject Mass / Feed):** `E`, `W`, `F` veya `Sağ Tık` ile ileriye enerji yemi atarak kütle transferi yapabilir veya takım arkadaşlarınızı besleyebilirsiniz.
* **🏆 Canlı Liderlik Tablosu (Leaderboard / Scoreboard):** En yüksek kütleye sahip ilk 10 oyuncu sağ üstteki cam efektli tabloda anlık sıralanır.

### 4. 🚀 Uzay Casusu (Spaceship Impostor)
* **🛸 Uzay Gemisi Haritası:** Kafeterya, Reaktör, Elektrik, Revir, Kokpit ve Güvenlik odalarından oluşan geniş uzay gemisinde keşif yapın.
* **🔧 Mürettebat Görevleri:** Kablo onarımı, Reaktör soğutma, Biyometrik tarama, Rota belirleme, Kalkan ayarlama ve Çöp boşaltma istasyonlarına yaklaşarak (`E` veya `Boşluk` basılı tutarak) görevleri tamamlayın.
* **🔪 Casus Yetenekleri:** 
  * `Q` tuşuyla yakındaki mürettebatı gizlice avlayın (18 saniye bekleme süresi).
  * `V` tuşuyla havalandırma mazgallarına (Vent) girin ve gemi içinde görünmez şekilde odalar arası ışınlanın.
* **🚨 Acil Durum & Ceset Bildirimi (Report):**
  * `R` tuşuyla yerde bulunan bir cesedi bildirin veya Kafeterya ortasındaki acil durum butonuna basın.
  * Tüm oyuncular toplantı masasına toplanır, canlı oylama ekranında şüphelileri tartışıp oylarını verir (`At / Pas Geç`).
  * En çok oyu alan oyuncu uzay boşluğuna fırlatılır!

---

## ✨ Öne Çıkan Özellikler

- ⚡ **60 Hz Sunucu Yetkili (Server-Authoritative) Fizik:** İstemci taraflı hileleri engeller; tüm çarpışma, hız, bölünme, havalandırma ve temas hesaplamaları sunucuda gerçekleşir.
- 🎯 **Dead-Reckoning & Hız Ekstrapolasyonu:** Ağ gecikmesinde bile pürüzsüz 60/120 FPS akıcı disk hareketleri ve top süzülmesi.
- 🔊 **Prosedürel Web Audio API:** Dış ses dosyasına gerek kalmadan şut, bölünme, yem atma, yutma, acil durum sireni, cinayet, havalandırma ve görev tamamlama efektleri.
- 📱 **Tam Mobil Dokunmatik Desteği:** Sanal joystick, dinamik aksiyon butonları (`Şut`, `Bölün`, `Öldür`, `Vent`, `Bildir`) ile mobil tarayıcılarda kusursuz deneyim.
- 🎨 **Modern Glassmorphic UI:** Canlı renk paleti, karanlık tema, oylama arayüzü ve Türkçe arayüz.
- 💬 **Oyun İçi Gerçek Zamanlı Sohbet:** Lobi, maç ve oylama toplantısı sırasında diğer oyuncularla iletişim.
- 🔒 **Özelleştirilebilir Odalar:** Hız çarpanı (1.0x - 2.0x Turbo), maç süresi, kişi sayısı ve gizli oda desteği.

---

## ⌨️ Kontroller ve Kısayollar

| Aksiyon | Disk Futbolu | Sumo Arenası | Agar Büyüme Modu | Uzay Casusu (Spaceship) | Dokunmatik (Mobil) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hareket** | `WASD` / `Yönler` | `WASD` / `Yönler` | `WASD` / `Yönler` | `WASD` / `Yönler` | Sol Sanal Joystick |
| **Ana Aksiyon 1** | `Boşluk` / `Sol Tık`: **Şut** | `Boşluk`: **Dash** | `Boşluk`: **Bölün** | `E` / `Boşluk`: **Görev Yap / Buton** | ⚡ Sağ Birincil Buton |
| **Özel Yetenek** | `Shift` / `E`: **Top Tut** | — | `E` / `W`: **Yem At** | `Q`: **Öldür (Casus)** | 🔪 / 🍇 İkincil Buton |
| **Havalandırma** | — | — | — | `V`: **Vent Gir / Değiştir** | 🌀 Vent Butonu |
| **Ceset Bildir** | — | — | — | `R`: **Report (Bildir)** | 🚨 Report Butonu |
| **Sohbet** | `Enter` | `Enter` | `Enter` | `Enter` | Sohbet Giriş Kutusu |

---

## 📐 Sistem Mimarisi

```
                           [ İnternet / Kullanıcılar ]
                                        │
                                        ▼ (Tek Port Girişi: 80 / 8080)
                     ┌──────────────────────────────────────┐
                     │          Nginx Reverse Proxy         │
                     │          (web container : 80)        │
                     └───────────────┬──────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
     (HTTP /api/* rotaları)                    (WebSocket /ws rotası)
                 │                                       │
                 ▼                                       ▼
    ┌─────────────────────────┐             ┌─────────────────────────┐
    │     Backend REST API    │             │   WebSocket Oyun Motoru │
    │   (Node.js / Express)   │             │     (60Hz Physics Loop) │
    │   İç Port: 4000 (Gizli) │             │   İç Port: 5050 (Gizli) │
    └─────────────────────────┘             └─────────────────────────┘
                 ▲                                       ▲
                 └───────────────────┬───────────────────┘
                                     │
                     ┌───────────────────────────────┐
                     │    İzole Docker Bridge Ağı    │
                     │         (ball_net)            │
                     └───────────────────────────────┘
```

> [!NOTE]
> **Güvenli ve İzole Ağ:** Sadece `web` servisi dış dünyaya port açar. Backend API (`4000`) ve WebSocket Sunucusu (`5050`) sadece dahili Docker ağı üzerinden iletişim kurar. Bu sayede sunucunuzdaki veya macOS sisteminizdeki diğer servislerle (PostgreSQL, MinIO, Redis, AirPlay vb.) hiçbir port çakışması yaşanmaz.

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- [Docker](https://www.docker.com/) ve [Docker Compose](https://docs.docker.com/compose/)
- *(İsteğe bağlı)* Node.js 18+ (Yerel geliştirme için)

### Docker ile Tek Komutla Başlatma

```bash
# Projeyi klonlayın
git clone https://github.com/kullanici-adiniz/puckarena.git
cd puckarena

# Konteynerleri derleyin ve arka planda başlatın
docker compose up -d --build
```

Tarayıcınızdan **`http://localhost:8080`** adresine giderek oyuna anında katılabilirsiniz!

---

## ☁️ Coolify Üzerinde Tek Tık Canlıya Alma

PuckArena, **Coolify** gibi modern PaaS panelleri için %100 uyumlu olarak yapılandırılmıştır:

1. Coolify panelinizde **New Resource** ➔ **Docker Compose** seçeneğini seçin.
2. GitHub deponuzu bağlayın.
3. Ortam değişkenlerinde (Environment Variables) dilerseniz `WEB_PORT` değerini belirleyin (Varsayılan: `8080`).
4. **Deploy** butonuna tıklayın.
5. Coolify otomatik olarak SSL sertifikasını bağlayacak ve Nginx üzerindeki `/ws` ve `/api` rotalarını yönlendirecektir.

---

## 🛠️ Yerel Geliştirme (Local Development)

Docker olmadan her servisi bağımsız çalıştırmak için:

```bash
# 1. Bağımlılıkları yükleyin
npm run install:all

# 2. WebSocket sunucusunu başlatın (Terminal 1)
npm run start:socket

# 3. Backend REST API'yi başlatın (Terminal 2)
npm run start:backend

# 4. Web klasörünü herhangi bir statik sunucuyla açın (Terminal 3)
npx serve web
```

---

## 📁 Dizin Yapısı

```
puckarena/
├── docker-compose.yml       # Coolify & Docker Compose orkestrasyonu
├── package.json             # Kök monorepo betikleri
├── web/                     # Frontend İstemcisi
│   ├── index.html           # Arayüz ve Canvas katmanı
│   ├── style.css            # Glassmorphic stil dosyası
│   ├── nginx.conf           # Reverse Proxy & WebSocket yönlendirici
│   ├── Dockerfile           # Web Dockerfile (Alpine Nginx)
│   └── js/
│       ├── app.js           # Ana uygulama yaşam döngüsü
│       ├── renderer.js      # HTML5 Canvas 60/120 FPS çizim motoru
│       ├── socketClient.js  # WebSocket istemci iletişimi
│       ├── physicsClient.js # İstemci tahmin ve enterpolasyon
│       ├── input.js         # Klavye, Fare ve Mobil dokunmatik yöneticisi
│       ├── audio.js         # Web Audio API ses efektleri sentezleyici
│       └── ui.js            # DOM & HUD yöneticisi
├── socket/                  # WebSocket Oyun Sunucusu
│   ├── server.js            # WS sunucu yöneticisi & oda kaydı
│   ├── Dockerfile           # Socket Dockerfile (Node.js Alpine)
│   ├── db/
│   │   └── configDb.js      # Sunucu taraflı kalibre edilmiş fizik sabitleri
│   └── engine/
│       ├── physics.js       # 2D Vektör & Daire çarpışma motoru
│       ├── room.js          # 60Hz oda simülasyon döngüsü
│       └── modes/
│           ├── puckMode.js  # Disk Futbolu maç kuralları & top tutma yeteneği
│           ├── sumoMode.js  # Sumo daralan çember & dash mekaniği
│           └── agarMode.js  # Agar büyüme & enerji küreleri
└── backend/                 # REST API Servisi
    ├── server.js            # Express API, sağlık kontrolü ve mod listesi
    └── Dockerfile           # Backend Dockerfile (Node.js Alpine)
```

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır. Dilediğiniz gibi geliştirebilir, özelleştirebilir ve yayınlayabilirsiniz.
