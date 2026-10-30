# PuckArena / ARMOYU MiniGames

Türkçe arayüzlü, altı mod içeren çok oyunculu tarayıcı oyunu. Fizik ve oyun kuralları Node.js WebSocket sunucusunda hesaplanır. İstemci PIXI/WebGL kullanır; WebGL yoksa Canvas2D çizimine geçer.

## Çalıştırma

Node.js 24+ gerekir. Proje kökünde:

```sh
npm run install:all
npm start
```

Adres: **http://localhost:8080**. PowerShell yürütme ilkesi `npm.ps1` dosyasını engellerse komutlarda `npm.cmd` kullanın.

Geliştirme komutu oyun API'sini `127.0.0.1:4000`, kimlik servisini `127.0.0.1:4100`, oyun sunucusunu `127.0.0.1:5050`, ortak HTTP/WebSocket girişini `127.0.0.1:8080` üzerinde başlatır. `WEB_PORT`, `BACKEND_PORT`, `AUTH_PORT`, `SOCKET_PORT` ortam değişkenleriyle portlar değiştirilebilir. `Ctrl+C` servisleri durdurur. Yerel çalıştırıcı kök `.env` dosyasını otomatik okumaz; portları kabuğunuzda tanımlayın. Kimlik servisi kendi `minigames_backend/.env` dosyasını okur.

## Phatsa kimlik servisi

`minigames_backend`, Express 5 ve Phatsa'nın resmî `@phatsa/client` SDK'sıyla giriş/kayıt sunar. `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout` ve e-posta doğrulama uçları yerel gateway ve Docker nginx üzerinden erişilebilir. Middleware katmanları alan doğrulama, Bearer doğrulama, istek limiti, origin kontrolü ve merkezi hata yönetimini uygular.

Yerelde `minigames_backend/.env.example` dosyasını `.env` olarak kopyalayıp `PHATSA_URL` ve `PHATSA_API_KEY` alanlarını doldurun. Docker'da bu alanları kök `.env` veya dağıtım ortamında tanımlayın; ayarlar servis klasöründeyse `docker compose --env-file minigames_backend/.env up --build -d` kullanın. Bilgiler yoksa misafir oyunları çalışmaya devam eder; kimlik uçları `503 phatsa_not_configured`, sağlık kontrolü `authConfigured:false` döner. API örnekleri, ortam ayarları ve test kapsamı: [kimlik servisi belgesi](minigames_backend/README.md).

Açılış ekranında **Misafir**, **Giriş Yap**, **Kayıt Ol** seçenekleri vardır. Kayıt doğrulama gerektiriyorsa kullanıcı e-postaya yönlendirilir; doğrulama e-postası yeniden gönderilebilir. Phatsa'nın uygulama adresi Minigames origin'i olduğunda `/verify-email?token=…` bağlantısı desteklenir; token adres çubuğundan hemen kaldırılır ve Referer başlığında gönderilmez. Şifre alanı işlemden sonra temizlenir.

Oturum bu sekmenin `sessionStorage` alanında saklanır; sayfa yenilenince `/me` ile doğrulanır. Refresh token yenilemeleri aynı sekmede tek istekte birleştirilir. Hesap başına yerel profil/istatistik ayrıdır; misafir verileri hesaba aktarılmaz. Çıkış sunucudaki mevcut oturumu kapatır, tarayıcıdaki tokenları siler ve oyuncuyu odadan çıkarır. Bağlantı kesintisinde uzak çıkış başarısız olursa kullanıcıya bildirilir.

Oyun sunucusu hesaplı oda katılımında tokenı kimlik servisinden doğrular; istemcinin gönderdiği kullanıcı kimliği/rolü yetki sayılmaz. Doğrulanmış hesap kimliği yalnız sunucuda tutulur, diğer oyunculara e-posta veya token gönderilmez. Oyun oturumunun doğrulaması en fazla beş dakika geçerlidir (token daha önce bitiyorsa daha kısa); istemci en geç dört dakikada tokenı yenileyip yeniden doğrulatır. Süresi dolan veya reddedilen oyun oturumu odadan çıkarılır. Phatsa'da dışarıdan iptal edilen bir oturum oyun sunucusunda sonraki doğrulamada fark edilir. Bağımsız socket servisinde `AUTH_SERVICE_URL` kullanılabilir; yerel çalıştırıcı ve Docker bunu otomatik ayarlar.

## Docker

```sh
docker compose up --build -d
docker compose ps
docker compose logs --tail 50
docker compose down
```

Varsayılan adres yine **http://localhost:8080**. Başka port için `.env.example` dosyasını `.env` olarak kopyalayıp `WEB_PORT` değerini ayarlayın. Yalnız web servisi dışarı açılır; API ve WebSocket servisleri Docker ağı içinde kalır. API ve oyun sunucusu sağlıklı olmadan web başlamaz. Node servisleri `node` kullanıcısıyla çalışır. `socket_data` birimi oyun ayarlarını saklar; aktif maçlar ve odalar RAM'dedir.

İnternet yayını için alan adı ve TLS sonlandırması sağlayan bir ters vekil gerekir. `ALLOWED_ORIGINS=https://oyun.example.com` biçiminde kesin tarayıcı origin'i tanımlanabilir; birden fazlası virgülle ayrılır. Boş bırakıldığında Origin ile gelen Host eşleşmelidir. Vekil dış host ve portu korumalıdır. `TRUST_PROXY=1`, yalnız doğrudan erişilemeyen ve `X-Real-IP` başlığını kendisi yazan vekilin arkasında kullanılmalıdır; Compose bunu dahili ağda uygular.

## Oyunlar

| Mod | Temel akış | Oyuncu gereksinimi |
| --- | --- | --- |
| Disk Futbolu | Şut, top tutma, takım seçimi, iki devre ve skor | Tek kişi antrenman; rakip için 2+ |
| Sumo | Dash, daralan arena, eleme ve sonraki tur | Rekabetçi tur için 2+ |
| Agar | Yem toplama/atma, bölünme, birleşme, rakip yutma | Tek kişi veya çok oyunculu |
| Uzay Casusu | Görevler, casus, havalandırma, sabotaj, rapor ve oylama | Tek kişi antrenman; sosyal maç 4–15 oyuncu |
| Vampir Köylü | Gizli rol, gece eylemi, gündüz tartışması, mahkeme | En az 3; Avcı 6+ oyuncuda |
| Bil ve Fethet | Sayısal tahmin, sonuç sıralaması, şehir seçimi | 1–8; rekabet için 2+ |

Uzay Casusu'nda uzay gemisi, kale ve malikâne haritaları vardır. Kale ve malikânedeki temalı görevler ortak eşleştirme panelini kullanır. Oda kurucusu oyunu başlatabilir/durdurabilir; bekleme aşamasında oyuncular başlatma oyu verebilir. Devam eden gizli rol veya fetih maçına gelen kişi sonraki maça kadar izleyicidir.

Casus görevleri, tek kişilik antrenmanda da **Oyunu Başlat** düğmesinden sonra yapılabilir. Elektrik/jeneratör odasına kafeteryanın sol koridorundan aşağı inerek ulaşılır; haritada sarı kesikli yol gösterilir. Duvarlar ve kapalı kapılar görüşü keser. Normal görüş mürettebatta 300, casusta 380 dünya birimidir; elektrik kesilince sırasıyla 120 ve 320 olur. Görüş dışında kalan oyuncuların konumu istemciye gönderilmez. Toplantılarda kendine oy verilemez. Maç bitince bütün katılımcıların kazanan/kaybeden durumu tabloda gösterilir; sonuçlar oda sahibi yeni maçı başlatana kadar korunur.

Futbolda kurucunun **Maçı Bitir** eylemi mevcut skoru koruyarak kırmızı/mavi takım sonuç ekranını açar. Süre dolunca da aynı ekran gösterilir; eşit skor beraberliktir. Futbol ve Casus sonuçlarında kazanan kadro yan yana poz verir; konfeti, takım renkleri ve WINNER/LOSER tablosu kullanılır. Hareket azaltma tercihi açıkken konfeti gösterilmez.

Casus'ta tek bir görev veya tek bir oyuncunun görevlerini bitirmesi zafer değildir: yaşayan ve ölü mürettebatın ortak görev barı tamamlanmalı veya tüm casuslar elenmelidir. Yaşayan casuslar mürettebat sayısına ulaşırsa casuslar kazanır. Kritik reaktör sabotajı 30 saniyede onarılmazsa da casuslar kazanır; reaktördeki iki farklı panelde iki yaşayan oyuncu aynı anda **E** tuşunu veya onarım düğmesini basılı tutmalıdır. Elektrik kesintisi jeneratör onarılana kadar sürer. Aktif sabotajda acil toplantı butonu kullanılamaz; ceset bildirimi yapılabilir. Tek kişilik antrenman görevlerle zafer/mağlubiyet üretmez. Temel takım hedefleri [resmî Among Us açıklaması](https://www.innersloth.com/games/among-us/) ile uyumludur; ürün tüm Among Us harita/rol/içeriklerinin kopyası değildir.

Casus oyuncularına boş paletten rastgele renk verilir. Lobideki **Renk Seç** panelinden boş bir renk seçilebilir veya tekrar rastgele atanabilir; seçim maç sırasında kilitlidir. Kablo görevinde eşleşen uçlar fareyle/dokunarak sürüklenir veya sırayla seçilir; bağlantılar kablo çizgisi olarak görünür. Yalnız E'yi basılı tutarak görev atlama kaldırılmıştır.

Özel oda genel listede görünmez. Oyun menüsündeki **Oda Davetini Kopyala** düğmesi `?room=...` bağlantısı üretir. Bağlantıyı alan kişi profil ekranından lobiye geçince odaya katılır. Bağlantıya sahip herkes katılabilir; parola korumalı hesap yetkilendirmesi yoktur. Özel odanın son oyuncusu ayrıldığında oda silinir.

## Kontroller

| Eylem | Kontrol |
| --- | --- |
| Hareket | WASD / yön tuşları; mobilde joystick |
| Futbolda şut / Sumo dash / Agar bölünme | Boşluk / sol tık |
| Futbolda top tutma / Agar yem atma | E / F / Shift / sağ tık |
| Uzay görevi | İstasyona yaklaş, E/F ile paneli aç ve işlemi tamamla |
| Casus saldırısı | Q; yakın hedef ve dolmuş bekleme süresi gerekir |
| Havalandırma | Yakınında V ile gir/çık; içeride WASD/yön tuşları veya oda düğmeleriyle geçiş yap |
| Ceset bildirimi / acil toplantı | Ceset veya merkez butonu yakınında R |
| Uzay haritası / sabotaj | M / B |
| Menü / sohbet | ESC / Enter |
| Vampir eylemleri ve fetih | Panelde hedef/cevap seç; fetih sırasında haritaya tıkla |

Mobilde ilgili modun dokunmatik düğmeleri kullanılır. Sohbete veya cevap alanına yazarken hareket girdisi gönderilmez.

## Doğrulama

```sh
npm run check
npm test
npm run test:browser
npm run test:load
npm run audit:all
```

Çalışmakta olan yerel/Docker dağıtımını HTTP ve gerçek WebSocket üzerinden sınamak için `npm run test:deployment -- http://localhost:8080` kullanılabilir.

`npm test`, fizik, maç akışları, üç uzay haritasının erişilebilirliği, rol gizliliği, HTTP ve gerçek WebSocket protokolünü sınar. `test:browser`, Playwright ile gerçek arayüz işlemlerini sınar. Windows'ta kurulu Microsoft Edge kullanılır. Diğer sistemlerde önce `npx playwright install chromium` çalıştırın; `PLAYWRIGHT_CHANNEL` ile kanal değiştirilebilir. Tarayıcı testleri 14000/15050/18080 portlarını kullanır; bu portların boş olması gerekir. Başarısız test görüntüleri ve iz kayıtları `test-results/` altında oluşur.

`test:load`, yerel ortamda 24 bağlantıyla altı modun veri iletimini kısa süre ölçer; üretim kapasitesi ölçümü değildir. Testler görev konumlarını ve aşama zamanlarını yalnız test sürecindeki sunucu nesneleri üzerinden ayarlar; uygulamada bunun için yönetim API'si yoktur.

Casus haritaları, karakterler, görev işaretleri, jeneratör, kapılar ve menfezler PNG dosyalarından çizilir; WebGL ve Canvas2D aynı varlıkları kullanır. Harita geometrisi değişirse `npm run assets:space` ile `web/assets/space/png/` dosyalarını yeniden üretin. Bu komut da tarayıcı testleriyle aynı Edge/Chromium kurulumunu kullanır.

## Yapı ve kapsam

- `web/`: arayüz, oyun istemcileri, yerel PIXI ve çizim.
- `socket/`: odalar, fizik, modlar, alıcıya özel durum paketleri ve bağlantı sınırları.
- `backend/`: salt okunur `/api/health`, `/api/modes`, `/api/config`.
- `scripts/`: yerel çalıştırıcı, HTTP/WS geçidi, sözdizimi ve yük kontrolü.
- `tests/`: otomatik regresyon testleri.

Phatsa ile gerçek hesap girişi ve oyun bağlantısında hesap doğrulaması vardır. XP, avatar ve geçmiş istatistikler hesap başına bu tarayıcının `localStorage` alanındadır; cihazlar arası ilerleme ve doğrulanmış kalıcı sıralama uygulanmamıştır. Maç içindeki skor ve yetkiler oyun sunucusundan gelir. Kaynak depoda uygulamaya ait lisans dosyası bulunmadığından MIT lisanslı olduğu iddiası kaldırılmıştır; dağıtım lisansını proje sahibi belirlemelidir.

Tespitler, düzeltmeler ve doğrulama sınırları: [AUDIT.md](AUDIT.md).
