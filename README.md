# CepHarçlık 🪙

Kart ekstresi büyük harcamaları gösterir; gün içindeki küçük kahve, dolmuş, market harcamaları toplamda kaybolur. CepHarçlık bu küçük harcamaları 2 dokunuşla kaydeder ve "param nereye gitti" sorusuna anında cevap verir.

## Kullanım

Kurulum yok: `index.html` dosyasını tarayıcıda aç. Telefonda kullanmak için dosyaları herhangi bir statik hosta koyup (GitHub Pages yeter) tarayıcıdan "Ana ekrana ekle" demek yeterli.

Akış:

1. Tutarı yaz (örn. `47,50`).
2. Kategoriye dokun — kayıt tamam, "bugün kalan" anında güncellenir.

- **Günlük limit:** Üst karttaki "Günlük limit belirle" ile ayarlanır; aşınca tutar kırmızıya döner.
- **Özet sekmesi:** Aylık toplam, harcama yapılan gün sayısı, günlük ortalama ve kategori dökümü.
- **Silme:** Kayıt yanındaki ✕ — onay sorusu yok, 5 saniye "Geri al" hakkı var.
- **Yedek:** Özet sekmesinden JSON indir / yükle (cihaz değiştirirken).

## Teknik kararlar

- **Backend yok, bilerek.** Tek kullanıcı + tek cihaz + paylaşımsız veri için localStorage yeterli; sunucu eklemek süs olurdu. Cihaz değiştirme ihtiyacı JSON dışa/içe aktarma ile çözüldü.
- **Para integer kuruş olarak saklanır** (`amountKurus`), float değil — yuvarlama hatası birikmesin diye. Gösterim `Intl.NumberFormat('tr-TR')` ile.
- **localStorage'da bile şema var:** `schema_version` alanı tutulur; bozuk/eski veri sessizce patlamak yerine temiz duruma döner, içe aktarmada sürüm doğrulanır.
- **Motion bilinçli sınırlı:** İki micro-interaction var (kalan tutarın sayaç geçişi, limit aşımında renk dönüşü) + kayıt satırının girişi; hepsi 150-300ms, `prefers-reduced-motion` tercihine tamamen uyar.
- **Mobil öncelikli:** 360px'e göre tasarlandı; sayısal klavye (`inputmode="decimal"`), 44px+ dokunma hedefleri, başparmak bölgesinde kategori butonları, onay dialogu yerine undo.
- **Bağımlılık sıfır:** Framework/kütüphane yok; üç dosya (`index.html`, `style.css`, `app.js`), koyu tema sistem tercihiyle otomatik.

## Bilinen sınırlar ve sonraki adımlar

- Veri sadece bu cihazda/tarayıcıda; senkron yok (bilinçli — ihtiyaç doğarsa küçük bir API eklenir).
- Kategoriler sabit altı adet; özelleştirme ilk gerçek istekte eklenecek.
- Sabit harcamaların ay başında otomatik eklenmesi ve haftalık özet kartı aday listesinde.
