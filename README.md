# Seyir 3D – Kargo Takip Demosu

Gemiyle taşınan yükü 3D dünya küresinde ve oyun tarzı Süveyş Kanalı sahnesinde gösteren demo.
Veriler örnektir (`src/data/MockProvider.ts`); gemi konumu saate göre simüle edilir.

## Çalıştırma

```bash
npm install
npm run dev
```

- Tarayıcı: http://localhost:5173
- Telefondan denemek için (aynı Wi‑Fi): `npm run dev -- --host` ve terminaldeki ağ adresini aç.
- Performans paneli: adrese `?debug=1` ekle (FPS, kalite kademesi, draw call, yapay yük butonu).
- Demo numaraları: `SYR-24001` (kanalda), `SYR-24002` (Kızıldeniz), `SYR-24003` (varışa yakın).

## Mobil performans sistemi (`src/perf/`)

1. **DeviceTier**: açılışta GPU adı, çekirdek/bellek, mobil mi + 1 sn'lik GPU testi → `low / mid / high`. Sonuç cihazda saklanır.
2. **qualityPresets**: her kademede piksel oranı, FPS limiti, su detayı, nesne sayısı, gölge, sis mesafesi.
3. **QualityManager**: çalışırken FPS hedefin altına düşerse önce çözünürlüğü, sonra kademeyi düşürür; rahatlarsa geri yükseltir.
4. **FrameLoop**: tek render döngüsü; sekme gizliyken veya 3D alan ekranda değilken durur; zayıf cihazda 30 FPS.

Ek olarak: tüm konteyner/palmiye/binalar instanced (tek draw call), dalgalar GPU'da, Three.js ayrı pakette ve
sadece 3D açılınca yüklenir, WebGL olmayan cihazda 2D harita yedeği var.

## Gerçek veriye geçiş

`src/data/ShipmentProvider.ts` arayüzünü uygulayan yeni bir sağlayıcı (konteyner takip API'si + AIS) yazıp
`src/main.ts` içinde `MockProvider` yerine kullanmak yeterli.
