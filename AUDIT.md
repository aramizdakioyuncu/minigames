# Teknik inceleme ve düzeltme raporu

Tarih: 30 Ekim 2026. Kapsam: web, oyun sunucusu, API, Docker, altı oyun modu ve üç Uzay Casusu haritası. Çalışma kaynak incelemesi, yerel çalıştırma, davranış testleri ve bağımlılık taramasıdır; bağımsız bir üretim penetrasyon testi veya sınırsız ölçek garantisi değildir.

## Bulgular ve uygulanan çözümler

| Öncelik | Bulgu / etkisi | Uygulanan çözüm |
| --- | --- | --- |
| Yüksek | Gizli roller ve özel olaylar tüm oyunculara yayınlanıyordu; istemci üzerinden rol öğrenilebiliyordu. | Alıcıya özel durum projeksiyonu; kendi rolü ve izin verilen takım bilgisi dışında rol alanları kaldırıldı. Kâhin sonucu ve rol olayları yalnız alıcıya iletilir. |
| Yüksek | Havalandırmadaki oyuncular, hayaletler ve görüş dışındaki konumlar ağda görülebiliyordu. | Uzay modunda konum, ceset ve öldürme/havalandırma olayları sunucuda görünürlük filtresinden geçirilir; katil kimliği yayımlanmaz. |
| Yüksek | Görev, rapor, sabotaj onarımı, rol eylemi ve takım değişiminde sunucu kontrolleri eksikti. | Rol, yaşam durumu, aşama, yakınlık, başlangıç/süre, tekrar ve hedef doğrulamaları. Duvar arkasından saldırı engeli; takım değiştirme yalnız futbolda. |
| Yüksek | Mesaj boyutu, oda/bağlantı sayısı, eylem sıklığı ve tarayıcı Origin sınırı yoktu. | 8 KiB mesaj limiti; bağlantı başına 150 mesaj/sn, 20 eylem/sn, 5 sohbet/10 sn; IP başına 3 oda/dk ve 64 bağlantı; toplam 512 bağlantı/64 oda sınırı; Origin kontrolü. |
| Yüksek | Kullanıcı verileri tutarsız temizleniyor, bazı rol panellerine HTML olarak aktarılıyordu. | İsim/avatar tür ve uzunluk kontrolleri, hex renk doğrulaması, HTML kaçışı, boolean girdi listesi, sonlu sayısal cevaplar. CSP, nosniff, frame ve referrer başlıkları. |
| Yüksek | Eksik UI/ses metotları olay zincirini kesiyor; aktif istemci modu doğru değişmiyordu. | Mod etkinleştirmesi, uygulama bağlamı, eksik ses/UI metotları ve modal kimlikleri düzeltildi. Altı oyunun giriş/çizim/çıkış akışları sınandı. |
| Orta | Uzay görev panelleri DOM ile uyuşmuyor; görev yüzdesi ve ceset çizimi yanlış alanları okuyordu. | Altı görev paneli gerçek öğelerle bağlandı; süre kontrollü tamamlama ve kapanışta temizleme. Görev yüzdesi, ceset verisi, sabotaj göstergesi ve başlangıç saldırı beklemesi düzeltildi. |
| Orta | Vampir başlatma, gece eylemi, kâhin sonucu, mahkeme ve Avcı atışında kopukluklar vardı. | En az üç oyuncu kuralı, özel rol teslimi, hedef/oy panelleri, gecede tek eylem, Avcıya tek atış ve 15 sn süre. Kazanma kararı son atışı bekler. |
| Orta | Fetihte tekrar cevap, geçersiz sayılar, tekrarlı bölge seçimi, eski zamanlayıcılar ve sıfırlanmayan skorlar vardı. | Tek sonlu cevap, aşama/aktif oyuncu kontrolü, tur zamanlarını simülasyon döngüsüne taşıma, tam sıfırlama, en fazla sekiz oyuncu. Uygulanmamış eski düello dalı kaldırıldı. |
| Orta | Kütle değişince ters kütle güncellenmiyor; aynı konumdaki çarpışmalar sorunluydu; futbol alt adımları ivmeyi katlıyordu. | Kütle erişimcisi, çakışma çözümü, sıfır süre kontrolü, zamana göre ivme. Top tutma tek oyuncuyla sınırlandı. |
| Orta | Sumo ayrılınca takılabiliyor; Agar bölünme yönü ve yemlerin ömrü sorunluydu. | Ayrılma/sonraki tur davranışı, dash hız penceresi, dururken bölünme/yem atma, birleşme doğrulaması, yem ömrü/sayısı ve oyuncu durum temizliği. |
| Orta | Eski zamanlayıcılar yeni maçta çalışabiliyor; ayrılan oyuncuların mod temizliği çağrılmıyordu. | Mod başına zamanlayıcı yönetimi; sıfırlama/yeniden başlatma/boşalma/yok etmede iptal. Ayrılma kancaları etkinleştirildi. |
| Orta | Özel oda kutusu etkisizdi; davet akışı yoktu. | Gizlilik sunucuya iletilir; oda listeden saklanır; menüden davet kopyalama ve profil sonrası doğrudan katılım. |
| Orta | Sahte Google/Facebook düğmeleri gerçek oturum izlenimi veriyordu. | Sahte giriş kaldırıldı; profil tarayıcıya yerel olarak tanımlandı. Bozuk eski profil değerleri sınırlandırıldı. |
| Orta | Docker portları/vekil ayarları tutarsızdı; Host portu kaybolabiliyordu. | Tek web girişi, dahili API/WS, dış Host portunu koruma, sağlık kontrolleri, Node 24, yetkisiz Node kullanıcısı, kilit dosyasıyla kurulum. |
| Orta | Web imajı yapılandırma dosyalarını da statik dizine kopyalıyordu. | Yalnız index/CSS/JS/varlıklar kopyalanır. Yerel geçit de aynı varlıkları sunar; gizli dosyalar ve dizin kaçışı engellenir. |
| Orta | Ayarlar her başlangıçta eziliyor, çalışma dizinine göre farklı yere yazılıyordu. | Sabit kalıcı dosya yolu, mevcut ayarları yükleme ve sayısal değer doğrulaması. |
| Orta | Yeniden bağlanma farklı eski portlara gidiyor; eski oda durumları ve basılı kalan girdiler vardı. | Aynı origin üzerinden yeniden bağlantı, tek bağlantı denemesi/zaman aşımı; eski oda paketini reddetme; bağlantı kaybında lobi; odak/dokunma iptali ve eskimiş girdileri temizleme. |
| Düşük | HUD düğmelerin üstüne biniyor; bazı modların Canvas2D çizimi boş kalıyordu. | HUD yerleşimi, mobil kaydırma, hedef düğmesi stilleri ve bütün modlarda Canvas2D çizimi. |
| Orta | Oyun alanına yayılan tıklama dinleyicisi cevap kutusunun odağını kaldırabiliyordu. | Odak temizliği yalnız oyun canvas'ına bağlandı; fetih testi gerçek kutu tıklaması ve tuşlarla yazmayı da kapsar. |
| Düşük | 60 Hz tam durum yayını, boş oda simülasyonu ve grafik nesnesi birikimi vardı. | 60 Hz simülasyon / 20 Hz durum yayını; boş odada durma; yavaş bağlantı kontrolü; grafik/metin/sohbet temizliği; 60 FPS çizim sınırı. |
| Düşük | Tekrarlanabilir kurulum, test altyapısı ve doğru çalışma belgesi yoktu. | npm kilitleri, tek komut yerel çalıştırma, Node/Playwright testleri, kısa yük kontrolü ve güncel README. |

## Doğrulama yaklaşımı

- Node: altı modda başlatma/simülasyon/ayrılma; gol/devre, tutma/şut, eleme, yem/bölünme/birleşme, saldırı/vent/sabotaj/onarım, görev, rol, oylama ve fetih kuralları.
- Harita: açık kapılarla üç haritanın bütün görev/menfezlerine oyuncu yarıçapını hesaba katan ızgara araması; menfez bağlantılarının geçerliliği.
- Ağ: gerçek WebSocket, bozuk/büyük paket, dolu/özel oda, oluşturma sınırı, düşmanca Origin; alıcıya göre rol ve görüş gizliliği.
- HTTP: sağlık/mod bilgisi, güvenlik başlıkları, statik varlıklar, gizli/yapılandırma dosyası ve yol kaçışı denemeleri.
- Tarayıcı: altı modda WebGL; Uzay görev/toplantı; dört istemcili Vampir gece/kâhin/mahkeme; Fetih soru/sonuç/harita; bağlantı kaybı; özel oda daveti; mobil dokunma ve WebGL kapalı çizim.
- Docker: izole `minigames-audit` projesinde derleme, servis sağlığı ve ortak giriş üzerinden HTTP/WebSocket doğrulaması.

## İlk genel incelemenin doğrulama sonuçları

| Kontrol | Sonuç |
| --- | --- |
| `npm run check` | 60 JavaScript dosyasında sözdizimi kontrolü geçti. |
| `npm test` | 41/41 test geçti; başarısız/atlanan test yok. |
| `npm run test:browser` | 13/13 geçti; son toplu çalışma 3,2 dakika. |
| Son arayüz düzeltmeleri | Fetihte tıklayarak cevap yazma ve mobil/dokunmatik/Canvas2D senaryoları yeniden çalıştırıldı: 2/2 geçti. |
| `npm run audit:all` | Kök, backend ve socket bağımlılıklarında bilinen açık: 0. |
| `npm run test:load` | 24 bağlantı, 6 mod, 4.918 ms; 1.896 durum paketi; 10.526.308 bayt; ping p95/maksimum 9/9 ms. |
| Docker | Üç imaj derlendi; API ve WS sağlıklı; tek girişten HTTP/WS ve altı mod kontrolü geçti. |
| `git diff --check` | Biçimsel diff hatası yok. |

Yük ölçümü kısa, aynı makinede ve yerel ağ yolundadır; üretim eşzamanlı oyuncu kapasitesi olarak yorumlanmamalıdır. npm audit sonucu özel oyun mantığı, vendored grafik kütüphanesi veya işletim sistemi imajı için açık bulunmadığı anlamına gelmez; uygulama mantığı ayrıca yukarıdaki testlerle sınandı.

## Casus oyunu takip düzeltmeleri

Kullanıcının görev renkleri, vent, görüş, jeneratör erişimi, maç öncesi görevler, PNG görseller, sonuç tablosu ve kendine oy verme bildirimleri üzerine:

| Bulgu | Çözüm ve doğrulama |
| --- | --- |
| Kablo düğmeleri renk değişkenini kullanmıyor, kalkan sınıfı CSS adıyla uyuşmuyordu. | Kablolar gerçek renk ve metinle gösterilir; eşleşen iki uç birlikte kilitlenir. Kalkanlar kırmızıdan maviye döner. Tarayıcıda hesaplanmış renkler ve yanlış eşleşmenin reddi sınanır. |
| Vent geçişi yönle birlikte yeniden V istiyor; kısa girdiler simülasyon örnekleri arasında kaybolabiliyordu. | V giriş/çıkış, tek yön girdisiyle bağlı vent seçimi, oda adlarıyla dokunmatik düğmeler. Kısa tuş basışları birden fazla ağ örneğinde korunur; hızlı ardışık düğme eylemleri bekleme süresine uyar. Sunucu bağlı hedef, rol, yaşam ve süreyi doğrular. |
| Görsel görüş çemberi duvarların arkasını aydınlatıyor, ağ ve çizim mesafeleri farklıydı. | Sunucu duvar/kapı ışın kesişimlerinden görüş çokgeni üretir; WebGL ve Canvas2D bunu çizer. Oyuncu/ceset/olay aktarımı aynı mesafe ve görüş kontrollerini kullanır. Kesinti ve açık/kapalı kapı testleri eklendi. |
| Jeneratör yolu çizim ile çarpışmada tutarlı değildi; eski erişim araması boş uzaydan dolaşabiliyordu. | Üç haritada bağlı koridorlar, gerçek kapı açıklıkları ve yürünebilir zemin sınırı. Jeneratör konumu sunucu/çizimde ortaktır. Erişim araması zemin içinde kalır; otomatik kapılar ve gerçek hareketle jeneratöre yürüyüş de test edilir. |
| Bekleme odasında basılı tuşla görev ilerletilebiliyordu. | Sunucuda başlangıç/tamamlama/basılı girdi yollarının tümünde oynanıyor aşaması gerekir. İstemci görev paneli ve eylem kontrolleri de maç başlayana kadar kapalıdır. |
| Maç sonucu kısa bir mesajdan sonra kayboluyordu. | Maç başlangıcındaki katılımcılar kaydedilir. Takım, kazanan/kaybeden ve görev sayısı tablosu yeni maça kadar korunur; ölen takım üyeleri de takımı kazandıysa kazanır. Kurucu yeni maç açabilir; sonuç tekrar açılabilir. |
| Toplantılarda kendine oy verilebiliyordu. | Kendi oy düğmesi kapalı; doğrudan ağ eylemi de sunucuda reddedilir. |
| Oyun çizimi farklı vektör kod yollarına ayrılmıştı. | Üç PNG harita ve on PNG karakter/nesne varlığı üretildi. WebGL, Canvas2D ve küçük harita aynı PNG dosyalarını kullanır. Geometri değişiminde `npm run assets:space` ile tekrar üretilebilir. |
| Harita/sabotaj düğmeleri üst katmanın tıklama engelini miras alıyordu; onarım düğmesi sürekli hareket ediyordu. | Eylem alanında tıklamalar açıldı; sabotaj uyarısı boyut değiştirmeden ışık etkisi verir. Gerçek düğme tıklamalarıyla sabotaj/onarım akışı test edilir. |

Takip doğrulamasında 66 JavaScript dosyasının sözdizimi kontrolü, 50/50 Node testi ve 14/14 tarayıcı senaryosu geçti (3,2 dakika). Tarayıcı testleri altı oyun, altı görev paneli, mobil Canvas2D, vent geçişi, elektrik onarımı ve iki istemcinin farklı maç sonuçlarını kapsar. Docker imajları yeniden derlendi; ortak giriş üzerinden HTTP/WS ve altı mod kontrolü geçti. Docker üzerinde gerçek tarayıcıyla PNG yükleme, maç başlatma, görüş, küçük harita ve mobil/masaüstü çizimi doğrulandı; çalışma zamanı/CSP hatası görülmedi.

Son görsel kontrolde küçük haritaya PNG vent/jeneratör işaretleri eklendi; dar ekranda sonuç tablosunun sütun aralıkları düzeltildi. Etkilenen mobil Canvas2D ve PNG/vent/sabotaj/sonuç senaryoları tekrar çalıştırıldı: 2/2 geçti. Güncel Docker sürümünün HTTP/WS dağıtım kontrolü ve `git diff --check` de geçti.

## Takım sonuçları, Casus renkleri ve kazanma kuralları

- Futbol: kurucunun maçı bitirmesi ve doğal süre sonu aynı sonuç kaydını üretir. Skor sıfırlanmaz; kırmızı/mavi kazanan belirlenir, eşitlik iki takım için beraberliktir. Katılımcıların maçtaki takımları ve ayrılmış oyuncular sonuçta korunur. Yetkisiz bitirme reddedilir; sonraki maç skoru/sonucu temizler.
- Ortak sonuç ekranı: kırmızı/mavi takım panoları, WINNER/LOSER etiketleri, yan yana karakter pozları, kazanan kadrosunda konfeti ve zafer sesi. Beraberlikte zafer konfeti/sesi yoktur. Hareket azaltma tercihi desteklenir. Oyuncu adları HTML olarak işlenmez; ekrana düz metinle yerleştirilir.
- Casus renkleri: sunucu boş renklerden rastgele atar; lobide 18 renkli seçim ve rastgele düğmesi vardır. Sosyal odalar 4–15 oyuncudur, dolayısıyla her oyuncuya farklı renk yeter. Başkasının rengi, palet dışı değer ve maç sırasında değişiklik reddedilir. Tercih yerel tarayıcıda saklanır; dolu tercih yeni odada rastgele atamayı bozmaz.
- Kablolar: kalıcı renkli bağlantı çizgileri, fare/dokunma sürükleme, yanlış uç kontrolü ve sırayla tıklama desteği. Panel kapatılırken dinleyiciler/gözlemci temizlenir. E'yi basılı tutarak mini oyunu atlama kaldırıldı.
- Kazanma: tek kişilik antrenman sonuç üretmez; sosyal maç en az dört kişiyle başlar. Tek görev veya tek oyuncunun görevlerinin bitmesi maçı bitirmez; hayaletler dahil ortak görev barı veya casusların tümünün elenmesi mürettebat zaferidir. Yaşayan casus/mürettebat eşitliği casus zaferidir. Kritik reaktör süresi biterse casuslar kazanır; iki ayrı panelde iki yaşayan oyuncuyla onarılır. Elektrik kendiliğinden düzelmez. Sabotaj sürerken acil buton kapalı, ceset bildirimi açıktır.
- Dayanak: [Innersloth'un temel takım hedefleri](https://www.innersloth.com/games/among-us/). Yeni rollerin ve tüm harita içeriklerinin eklenmesi bu değişikliğin kapsamı değildir.

Yeni davranışları kapsayan 58/58 Node testi ve 68 JavaScript dosyasının sözdizimi kontrolü geçti. Hedefli tarayıcı testlerinde host bitirme/beraberlik, renk seçimi, fare/dokunma kablo bağlama, reaktör onarımı ve süre sonu zaferi doğrulandı (3/3). Ardından toplu 16/16 tarayıcı senaryosu geçti (3,4 dakika). Yeni Docker sürümünde HTTP/WS, altı mod, gerçek host bitirme/beraberlik ekranı, renk seçimi ve antrenman başlangıcı da doğrulandı; çalışma zamanı/CSP hatası görülmedi.

Ek denetimde, host sıfırlamasının aktif reaktör sayacını ve kapı kilitlerini temizlemesi güvenceye alındı. Maç sonucu ödülü/zafer sesi, mevcut rol veya takım yerine sunucunun kayıtlı katılımcı sonucu üzerinden belirlenir; izleyiciye maç/zafer ödülü verilmez.

Son değişikliklerden sonra Casus maç akışı ve yeni geç-katılan izleyici testi tekrar çalıştırıldı: 2/2 geçti. Böylece toplam 17 farklı tarayıcı senaryosu doğrulandı. Güncel Docker dağıtım kontrolü ve `git diff --check` başarılı.

## Phatsa Express kimlik servisi — 2026-10-30

`minigames_backend` adlı ayrı Node.js/Express 5 projesi eklendi. Phatsa'nın resmî dokümanları (`https://phatsa.com/docs`, `https://phatsa.com/docs.json`) ve npm paketi incelendi; `@phatsa/client@0.6.2` ile kayıt, giriş, e-posta doğrulama, oturum doğrulama/yenileme ve çıkış servis edildi. Her SDK istemcisi isteğe özeldir; oturumlar farklı kullanıcılar arasında paylaşılmaz.

Middleware katmanında katı alan doğrulama, IP sınırları, origin kontrolü, Bearer doğrulama ve güvenli hata yanıtları bulunur. Dış istekler zaman aşımına tabidir; yönlendirmeler API anahtarı sızıntısını önlemek için izlenmez. JSON gövdesi 16 KB ile sınırlıdır, yanıtlar önbelleğe alınmaz; şifre/token/anahtar loglanmaz. Gateway ve nginx yeni `/api/auth/*` uçlarını ayrı servise iletir, dışarıdan gelen yönlendirme başlıklarını değiştirir. `.env` ve bağımlılık dizini Git'ten, `.env` ayrıca Docker imajından dışlanır.

Doğrulama: gerçek SDK + yerel HTTP Phatsa test sunucusuyla 17 yeni test; mevcut oyun testleriyle birlikte **75/75** geçti. **78** JavaScript dosyasının sözdizimi kontrolü geçti. Dört npm projesinin bağımlılık taraması **0 bilinen açık** bildirdi. Docker yeniden oluşturulup başlatıldı; kimlik API'si, oyun API'si ve altı modun nginx üzerinden HTTP/WebSocket dağıtım kontrolü geçti.

Canlı Phatsa proje adresi ve API anahtarı henüz sağlanmadı; gerçek hesapla giriş/kayıt doğrulanmadı. Eksik ayarlarda servis `503 phatsa_not_configured` döner, sağlık yanıtı `authConfigured:false` gösterir. Oyunların yerel misafir profilleri ve WebSocket oyuncu kimlikleri henüz Phatsa hesaplarına bağlanmış değildir. Kurulum ve API sözleşmesi `minigames_backend/README.md` içindedir.

## Canlı Phatsa bağlantı kontrolü — 2026-10-31

Kullanıcının yerel `.env` dosyasına girdiği ayarlar gizli değerler loglanmadan kontrol edildi. Panelden kopyalanan `/api/v1` son ekli adresin SDK tarafından iki kez eklenmesini önlemek için adres normalleştirme eklendi. Yalnız origin ve tam `/api/v1` yolu kabul edilir; diğer yollar, sorgular ve URL içindeki kimlik bilgileri reddedilmeye devam eder.

Gerçek SDK ile proje şeması isteği başarılı oldu; kurulu eklenti listesi boş döndü. Var olmayan rastgele bir kullanıcıyla yapılan giriş kontrolü Phatsa'dan `404 auth_not_installed` aldı. Yerel API bu durumu artık açıklayıcı `503 auth_not_installed` olarak döndürür; `identity_not_installed` için de aynı yaklaşım uygulanır. Canlı hesap oluşturulmadı ve başarılı kullanıcı oturumu henüz doğrulanmadı. Phatsa projesinde Kullanıcılar & Roller ve Kimlik Doğrulama eklentilerinin kurulup etkinleştirilmesi gerekiyor.

Docker kimlik servisi `minigames_backend/.env` ayarlarıyla yeniden oluşturuldu. Nginx üzerinden sağlık kontrolü `authConfigured:true`; canlı giriş kontrolü beklenen eksik eklenti hatasını verdi. **76/76** otomatik test ve altı modun HTTP/WebSocket dağıtım kontrolü geçti. `authConfigured:true`, ayarların varlığını belirtir; eksik Phatsa eklentilerini veya başarılı giriş yapıldığını göstermez.

### Eklentiler etkinleştirildikten sonraki canlı kontrol

Phatsa şeması `auth` 1.5.0 ve `identity` 1.2.0 eklentilerini doğruladı. Var olmayan kullanıcıyla giriş hem SDK hem Docker/nginx üzerinden beklenen `401 invalid_credentials` yanıtını verdi. Geçersiz e-postayla kayıt SDK üzerinden `400 invalid_email`, yerel API üzerinden `400 validation_error`; oturumsuz `/me` isteği `401 missing_token` döndürdü. Altı oyun modunun dağıtım kontrolü yeniden geçti.

Kullanıcının test hesabını oluşturmamızı istemesi üzerine rastgele güçlü şifre ve ayrılmış `.invalid` alan adında test adresi üretildi; bilgiler yalnız Git dışında tutulan `minigames_backend/.env` dosyasına yazıldı. Gerçek kayıt isteği `503 email_not_configured` ile reddedildi: projede e-posta doğrulaması zorunlu, SMTP yapılandırılmamış. Ardından aynı bilgilerle giriş `401 invalid_credentials` verdi; başarılı kayıt veya oturum oluştuğu doğrulanamadı. Açık API şemasında kullanıcı oluşturma veya SMTP ayarı yönetme işlemi bulunmuyor. Gerçek e-posta doğrulama testi yapılacaksa SMTP yanında erişilebilir bir test posta adresi de gerekir; üretilen `.invalid` adres posta almaz. Başarılı giriş, token yenileme ve çıkışın canlı doğrulaması bu nedenle bekliyor.

### Başarılı canlı kayıt ve oturum testi — 2026-10-31

Kullanıcının yeniden kontrol isteğiyle aynı yerel test hesabı bilgileri kullanılarak Docker/nginx üzerinden canlı akış tamamlandı. İlk giriş `401 invalid_credentials`, ardından kayıt `201` döndürdü. Kayıtta gerçek bir oturum verildi ve `emailVerificationRequired:false` görüldü; bu sonuç SMTP'nin veya e-posta teslimatının çalıştığını kanıtlamaz, mevcut ayarlarda e-posta doğrulamasının zorunlu olmadığını gösterir.

Kayıt oturumu kapatıldıktan sonra ayrı giriş `200`, kullanıcı doğrulama `/me` `200`, token yenileme `200` ve yeni tokenla `/me` `200` döndürdü. Aynı kullanıcı kimliği korundu, refresh token değişti. Çıkış `200` sonrasında erişim tokenı `401 invalid_token`, refresh token `401 invalid_refresh_token` ile reddedildi. Testte açılan oturumlar kapatıldı; test hesabı sonraki kontroller için korundu. Hesap bilgileri yalnız Git dışında tutulan `minigames_backend/.env` dosyasındadır; anahtar, şifre ve tokenlar çıktıya yazılmadı.

Önceki eksik eklenti ve kayıt engelleri bu canlı testte artık görülmedi. E-posta doğrulama/teslimat akışı ve oyun misafir profillerinin Phatsa hesabına bağlanması bu testin kapsamı dışındadır.

## Minigames arayüzü ve oyun hesabı entegrasyonu — 2026-10-31

Açılış ekranına Misafir / Giriş Yap / Kayıt Ol seçenekleri eklendi. Formlar gerçek `/api/auth` servislerini kullanır; şifre işlem sonunda temizlenir. Doğrulama gereken kayıtta oturum açılmış sayılmaz; yeniden e-posta gönderme ve `/verify-email?token=…` dönüşü desteklenir. Doğrulama tokenı URL'den kaldırılır; callback erişim kaydı kapalı ve Referrer-Policy `no-referrer` olarak ayarlıdır. Masaüstü ve mobil görünüm kontrol edildi.

Tarayıcıdaki oturum sekmeye ait `sessionStorage` alanındadır. Sayfa yenilemesinde kimlik `/me` üzerinden doğrulanır; yenilemeler aynı sekmede tek istekte birleştirilir. Oturum kapandıktan sonra tamamlanan eski bir yenileme cevabı oturumu geri açamaz. Misafir ve her Phatsa hesabı için yerel profil/istatistik alanı ayrıdır; hesaplar arasında XP aktarılmaz. Çıkış uzaktaki oturumu iptal eder, yerel tokenları siler ve aktif oyun odasından ayrılır; uzak servis ulaşılamazsa bu durum kullanıcıya bildirilir.

Socket sunucusu hesaplı katılımda Bearer tokenı backend `/me` ile doğrular ve hesap kimliğini yalnız sunucudaki oyuncuya bağlar. İstemcinin sahte kullanıcı/rol alanları dikkate alınmaz; geçersiz tokenla katılım misafir olarak devam etmez. Gecikmiş doğrulama sonuçları ayrılmış bağlantıyı yeniden odaya sokamaz. Oyun içi doğrulama en fazla beş dakika geçerlidir; istemci en geç dört dakikada tokenı yenileyerek doğrulamayı günceller. Token daha önce biterse o sınır uygulanır. Çıkış için upstream doğrulama bütçesi tüketilmez; deneme sınırına ulaşılmış olsa da oyuncu ayrılabilir. Başka cihazdan iptal, sonraki doğrulama veya süre sınırında fark edilir.

Doğrulama: **88/88 Node testi**, **84 dosyanın sözdizimi kontrolü**, **22/22 tarayıcı senaryosu** geçti. Son oturum akışı düzenlemesinden sonra 5 hesap arayüzü senaryosu, son çıkış sınırı düzeltmesinden sonra 6 socket kimlik testi ayrıca tekrar geçti. Docker/nginx üzerinden altı modun dağıtım kontrolü başarılı.

Gerçek Phatsa test hesabıyla tarayıcı arayüzünden giriş, doğrulanmış futbol odasına katılım, sayfa yenilemesiyle oturumun korunması, token dönüşümü, doğrulanmış Casus odasına katılım, çıkış ve ardından misafir olarak oynama sınandı; çalışma zamanı hatası görülmedi. Test oturumları kapatıldı. E-posta teslimatı gerçek SMTP ile sınanmadı; doğrulama akışı kontrollü Phatsa test sunucusuyla tarayıcıda test edildi. XP ve geçmiş istatistiklerin kalıcı sunucuya/cihazlar arasına taşınması bu entegrasyonun kapsamı dışındadır.

## Üretim kapsamı ve kalan ürün kararları

1. **Hesap/istatistik:** Phatsa oturumu ve oyun bağlantısında hesap doğrulaması vardır. XP ve istatistikler hesap başına yerel tarayıcı verisidir. Güvenilir kalıcı sıralama için sunucuda maç sonucu ve veritabanı gerekir. Arayüz yerel ilerlemeyi cihazlar arasında eşitleniyormuş gibi sunmaz.
2. **Kalıcılık/ölçek:** Odalar tek oyun sunucusunun RAM'indedir. Yeniden başlatmada maç devamı yoktur. Çok süreçli ölçek için oda yönlendirmesi, ortak lobi dizini ve gerekirse maç anlık görüntüleri tasarlanmalıdır. Kısa yük kontrolü internet gecikmesini, DDoS kapasitesini veya uzun süreli bellek davranışını kanıtlamaz.
3. **İnternet altyapısı:** TLS, alan adı, yedekleme/izleme ve hacimsel trafik koruması dağıtım ortamında yapılandırılmalıdır. IP sınırları ortak NAT kullanıcılarını birlikte sayar; öndeki vekilin gerçek IP zinciri doğru kurulmalıdır.
4. **Davet:** UUID bağlantısına sahip olan odaya katılabilir. Daha sıkı erişim için sunucuda süreli davet veya hesap üyeliği gerekir.
5. **Tarayıcı/CSP:** Mevcut PIXI derlemesi için `script-src 'unsafe-eval'` korunur; inline betik izni yoktur. Mevcut inline stiller için `style-src 'unsafe-inline'` vardır. Daha katı CSP için grafik derlemesi ve stiller birlikte dönüştürülmelidir. Otomasyon Edge/Chromium üzerindedir; gerçek iOS/Safari cihaz testi yapılmamıştır.
6. **İçerik/lisans:** Kale/malikâne görevleri ortak eşleştirme panelini kullanır; her tema için ayrı animasyon yapılmadı. Bot yoktur. Dağıtım lisansını proje sahibi belirlemelidir; üçüncü taraf bildirimleri korunmuştur.

Bu maddeler için çözüm yönü belirtilmiştir; harici kimlik sağlayıcısı, alan adı veya bulut hesabı kullanıcı adına oluşturulmadı ve üretime yayın yapılmadı.
