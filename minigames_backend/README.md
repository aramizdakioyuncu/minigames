# minigames_backend

Node.js 24+ / Express 5 kimlik servisi. Phatsa'nın [resmî dokümantasyonu](https://phatsa.com/docs) ve [makine tarafından okunabilir API tanımı](https://phatsa.com/docs.json) doğrultusunda **`@phatsa/client@0.6.2`** kullanır. `phatsa-sdk` adıyla yayımlanmış herkese açık npm paketi bulunmadığından resmî istemci seçildi.

## Kurulum

PowerShell, bu klasörde:

```powershell
npm.cmd ci
Copy-Item .env.example .env # Yalnızca .env henüz yoksa
# .env içindeki PHATSA_URL ve PHATSA_API_KEY alanlarını doldurun.
npm.cmd start
```

`PHATSA_URL`, uygulamanın Phatsa panel/proje adresidir (örneğin `https://proje.phatsa.com`); tanıtım sitesi `https://phatsa.com` değildir. `PHATSA_API_KEY` panelden alınan `pk_...` veya `sk_...` anahtarıdır. İhtiyaç duyulan erişime sahip anahtarı kullanın; anahtar yalnızca sunucuda kalır. `.env` Git'e ve Docker imajına alınmaz. Üretimde HTTPS proje adresi zorunludur.

Phatsa panelinde kimlik doğrulama için gerekli eklentiler açık olmalıdır. E-posta doğrulaması açıksa SMTP ve doğrulama bağlantısının dönüş adresi panelde yapılandırılmalıdır. Kullanıcı adıyla giriş için Phatsa paneli en az 0.8.20 ve Profiller eklentisi gerekir; e-postayla giriş bunlara bağlı değildir.

Kök klasörde `npm.cmd run install:all` ardından `npm.cmd start`, yeni servisi diğer oyun servisleriyle birlikte başlatır. Yerel gateway `/api/auth/*` isteklerini 4100 portuna iletir. Sadece kimlik servisi için kökten `npm.cmd run start:auth` kullanılabilir. Docker'da kök `.env` dosyasına veya dağıtım ortamına `PHATSA_URL`, `PHATSA_API_KEY`, gerekiyorsa `AUTH_ALLOWED_ORIGINS` verin; `docker compose up --build` dört servisi başlatır.

Panelden kopyalanan `/api/v1` veya `/api/v1/` ile biten proje API adresi de kabul edilir; SDK bu yolu kendisi eklediği için servis adresi origin'e dönüştürür. Kimlik ayarları yalnızca `minigames_backend/.env` içindeyse Docker'ı kökten `docker compose --env-file minigames_backend/.env up --build -d` ile başlatabilirsiniz.

## API

Başarılı yanıtlar `{ "data": ... }`, hatalar `{ "error": { "code", "message" }, "requestId" }` biçimindedir. POST gövdeleri `application/json` olmalıdır; bilinmeyen alanlar reddedilir. Kimlik bilgileri URL'ye yazılmamalıdır.

| Yöntem / yol | JSON gövdesi veya başlık | Sonuç |
| --- | --- | --- |
| `GET /api/auth/health` | — | `{status:"ok", authConfigured:boolean}` |
| `POST /api/auth/register` | `{email,password,fullName}` | 201: `{user,session,emailVerificationRequired}` |
| `POST /api/auth/login` | `{email,password}` veya `{username,password}` | `{access_token,refresh_token,expires_at,user}` |
| `GET /api/auth/me` | `Authorization: Bearer <access_token>` | `{user}` |
| `POST /api/auth/refresh` | `{refreshToken}` | Yenilenmiş oturum |
| `POST /api/auth/logout` | Bearer başlığı + `{everywhere:false}` | `{ok:true}`; `true` tüm cihazları kapatır |
| `POST /api/auth/verify-email` | `{token}` | `{verified:true,email}` |
| `POST /api/auth/resend-verification` | `{email}` | `{ok:true}` |

Örnek kayıt (yerel gateway):

```powershell
$payload = @{ email = 'oyuncu@example.com'; password = 'Uzun-ve-Benzersiz-Sifre123!'; fullName = 'Oyuncu Bir' } | ConvertTo-Json
Invoke-RestMethod http://localhost:8080/api/auth/register -Method Post -ContentType application/json -Body $payload
```

Örnek giriş ve doğrulama:

```powershell
$payload = @{ email = 'oyuncu@example.com'; password = 'Uzun-ve-Benzersiz-Sifre123!' } | ConvertTo-Json
$login = Invoke-RestMethod http://localhost:8080/api/auth/login -Method Post -ContentType application/json -Body $payload
$headers = @{ Authorization = "Bearer $($login.data.access_token)" }
Invoke-RestMethod http://localhost:8080/api/auth/me -Headers $headers
```

`expires_at` Unix milisaniyedir. Token yenilendiğinde yeni access/refresh token çiftini birlikte saklayın; aynı refresh token ile eşzamanlı yenileme istekleri göndermeyin. Çıkıştan sonra istemci kendi tokenlarını da silmelidir. Kayıt yanıtında `emailVerificationRequired:true` ve `session:null` varsa giriş yapılmış sayılmaz; kullanıcı e-postasını doğrulamalıdır. Bu servis çerez oluşturmaz; korunan uçlar Bearer token ister.

## Yapı ve güvenlik

- `src/routes/auth.js`: uçlar ve istek şemaları.
- `src/services/authService.js`: gerçek SDK çağrıları ve yanıt filtreleme. Her işlemde ayrı, yalnızca bellekte tutulan SDK istemcisi vardır. Otomatik yenileme kapalıdır.
- `src/middleware/`: Bearer doğrulama, JSON alan doğrulama, origin kontrolü, istek kimliği ve merkezi hata yönetimi.
- `src/config.js`: ortam değişkeni doğrulama; `src/app.js` uygulama; `src/server.js` HTTP yaşam döngüsü.

SDK'nin `auth.signUp`, `auth.signIn`, `auth.verifyEmail` ve `auth.resendVerification` metotları doğrudan kullanılır. SDK 0.6.2'de sunucudan token yüklemek için public `setSession` olmadığından `/me`, `/logout`, `/refresh` aynı SDK'nin `request` aktarımıyla çağrılır. Özel SDK alanlarına erişilmez veya sahte kullanıcı oturumu oluşturulmaz. SDK güncellemelerinde bu adaptör ve sözleşme testleri birlikte kontrol edilmelidir.

16 KB gövde sınırı, Helmet başlıkları, `no-store`, 8 saniye dış servis zaman aşımı ve dış yönlendirme engeli uygulanır. Alan doğrulama şifreyi kırpmaz; e-postayı normalize eder. Phatsa hata metinleri, şifreler, tokenlar ve API anahtarı loglara yazılmaz. `/me` ve `/logout` her istekte kullanıcıyı Phatsa'dan doğrular; yerel JWT çözümleme yetkilendirme sayılmaz.

Kimlik uçlarının tamamı IP başına 15 dakikada 300 istekle sınırlıdır; giriş/kayıt/yenileme/e-posta uçlarının ortak ek bütçesi varsayılan 30'dur (`AUTH_RATE_LIMIT`). Sağlık kontrolü bu limitlerden muaftır. Limit sayacı tek süreç belleğindedir; birden fazla kopya çalıştırılacaksa ortak Redis deposu veya gateway limiti eklenmelidir.

`AUTH_ALLOWED_ORIGINS` virgülle ayrılmış tam origin listesidir; boşsa yalnızca aynı origin tarayıcı istekleri kabul edilir. HTTPS ters vekil arkasında gerçek web origin'ini bu listeye ekleyin. `AUTH_TRUST_PROXY=1` yalnızca servise erişim güvenilen tek vekil üzerinden sağlandığında kullanılmalıdır; bağımsız çalışmada varsayılan `0` korunur. Docker servis portunu host'a açmaz; nginx ve yerel gateway gelen yönlendirme başlıklarını güvenilir değerlerle değiştirir.

## Testler ve doğrulama sınırı

```powershell
npm.cmd test
npm.cmd audit
```

Testler gerçek `@phatsa/client` paketini yerel HTTP Phatsa test sunucusuyla çalıştırır. Kayıt/e-posta doğrulama, giriş, token yenileme/çıkış, iptal edilen oturum, eşzamanlı kullanıcı izolasyonu, alan enjeksiyonu, gövde sınırı, CORS, istek limiti, proxy başlığı sahteciliği, zaman aşımı ve yönlendirmede anahtar sızıntısı kontrol edilir.

Gerçek proje adresi ve anahtarı olmadan canlı Phatsa hesabıyla giriş/kayıt doğrulanamaz. Eksik ayarlarda sağlık kontrolü `authConfigured:false` gösterir; kimlik işlemleri `503 phatsa_not_configured` döner. Sağlık kontrolü yalnızca süreç canlılığını ve ayarların varlığını bildirir; anahtarın geçerliliğini veya Phatsa erişilebilirliğini garanti etmez.

Minigames arayüzü bu HTTP servisine bağlıdır: misafir/giriş/kayıt ekranı, doğrulama ve yeniden gönderme, oturum yenileme ve çıkış bulunur. WebSocket sunucusu hesaplı oda katılımında `/me` üzerinden doğrulama yapar; sunucudaki oyuncu kaydına Phatsa kullanıcı kimliği bağlanır. Oyunlar misafir katılımını da destekler. Avatar/XP/istatistikler hesap başına yerel tarayıcı verisidir; kalıcı sunucu istatistiği henüz yoktur.

Tarayıcı tokenları sekmeye ait `sessionStorage` alanında tutar; API anahtarı ve şifre burada saklanmaz. Sayfa yenilemesinde kimlik uzaktan doğrulanır. Phatsa e-posta doğrulamasını uygulamaya yönlendirecekse panelde uygulama adresini Minigames origin'i yapın; `/verify-email?token=…` rotası gateway ve nginx tarafından karşılanır. E-posta akışı için ayrıca SMTP gerekir.

Socket servisi `AUTH_SERVICE_URL` üzerinden bu servise ulaşır. Aynı kaynak IP'den yapılan socket doğrulamaları ortak API istek sayacına dahildir; çok sayıda eşzamanlı hesap veya çok kopyalı dağıtım için ortak, kimliğe göre sınırlandırılmış bir doğrulama katmanı tasarlanmalıdır. Geliştirme kontrolleri mevcut tek sunuculu dağıtımı kapsar.
