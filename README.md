# CepHarçlık 🪙

Kart ekstresi büyük harcamaları gösterir; gün içindeki küçük kahve, dolmuş, market harcamaları toplamda kaybolur. CepHarçlık bu küçük harcamaları 2 dokunuşla kaydeder ve "param nereye gitti" sorusuna anında cevap verir.

**Canlı demo:** https://irembayraktar.github.io/cepharclik/

## Çalıştırma

Kurulum ve build yok: `index.html` dosyasını tarayıcıda açman yeterli. Framework, paket, sunucu — hiçbiri gerekmiyor.

Akış:

1. Tutarı yaz (örn. `47,50`).
2. Kategoriye dokun — kayıt tamam, "bugün kalan" anında güncellenir.

- **Günlük limit:** Üst karttaki "Günlük limit belirle" ile ayarlanır; aşınca tutar kırmızıya döner.
- **Özet sekmesi:** Aylık toplam, harcama yapılan gün sayısı, günlük ortalama, kategori dökümü ve gün gün açılır günlük döküm.
- **Silme:** Kayıt yanındaki ✕ — onay sorusu yok, 5 saniye "Geri al" hakkı var.
- **Geçmiş kalıcıdır:** Gün değişince hiçbir şey silinmez; "Bugün" sekmesi sadece bugünü gösterir, tüm kayıtlar cihazda saklanır ve Özet'teki günlük dökümden görülür.
- **Yedek:** Özet sekmesinden JSON indir / yükle. Günlük kullanımda gerekmez; sadece telefon değiştirirken veya tarayıcı verisini sıfırlamadan önce.

## iPhone'a ekleme (PWA)

1. Safari'de https://irembayraktar.github.io/cepharclik/ adresini aç.
2. Alt ortadaki **Paylaş** (⬆️) ikonuna dokun.
3. Menüde **"Ana Ekrana Ekle"** seçeneğine dokun → sağ üstten **Ekle**.
4. Ana ekrandaki 🪙 ikon artık uygulama gibi tam ekran açılır; service worker sayesinde **internet yokken de çalışır**.

Android'de: Chrome → ⋮ menü → "Ana ekrana ekle".

## Yayınlama

Uygulama GitHub Pages'te yayınlanır; yayın kaynağı `gh-pages` dalıdır. Değişiklik sonrası:

```powershell
git add .
git commit -m "degisiklik aciklamasi"
git push origin main            # kod deposu
git push origin main:gh-pages   # yayın (1-2 dk içinde canlıya çıkar)
```

Not: Uygulama kabuğu service worker ile önbelleklenir; yayın sonrası güncellemenin telefona inmesi için `sw.js` içindeki `CACHE` sürümünü artır (örn. `cepharclik-v1` → `v2`) — aksi halde eski sürüm bir açılış daha yaşayabilir.

## Teknik kararlar

- **Backend yok, bilerek.** Tek kullanıcı + tek cihaz + paylaşımsız veri için localStorage yeterli; sunucu eklemek süs olurdu. Cihaz değiştirme ihtiyacı JSON dışa/içe aktarma ile çözüldü.
- **Para integer kuruş olarak saklanır** (`amountKurus`), float değil — yuvarlama hatası birikmesin diye. Gösterim `Intl.NumberFormat('tr-TR')` ile.
- **localStorage'da bile şema var:** `schema_version` alanı tutulur; bozuk/eski veri sessizce patlamak yerine temiz duruma döner, içe aktarmada sürüm doğrulanır.
- **PWA katmanı ince tutuldu:** manifest + ağ-öncelikli service worker (güncelleme anında gelir, çevrimdışında önbellek devreye girer). Service worker yalnızca HTTPS'te kayıt olur; dosyayı lokalde açmak aynen çalışmaya devam eder.
- **Motion bilinçli sınırlı:** İki micro-interaction (kalan tutarın sayaç geçişi, limit aşımında renk dönüşü) + kayıt satırının girişi; hepsi 150-300ms, `prefers-reduced-motion` tercihine tamamen uyar.
- **Mobil öncelikli:** 360px'e göre tasarlandı; sayısal klavye (`inputmode="decimal"`), 44px+ dokunma hedefleri, başparmak bölgesinde kategori butonları, onay dialogu yerine undo.
- **Bağımlılık sıfır:** Framework/kütüphane yok; koyu tema sistem tercihiyle otomatik. İkonlar dahil her şey repoda, dış istek yok.

## Bilinen sınırlar ve sonraki adımlar

- Veri sadece bu cihazda/tarayıcıda; senkron yok (bilinçli — ihtiyaç doğarsa küçük bir API eklenir).
- Kategoriler sabit altı adet; özelleştirme ilk gerçek istekte eklenecek.
- Sabit harcamaların ay başında otomatik eklenmesi ve haftalık özet kartı aday listesinde.
