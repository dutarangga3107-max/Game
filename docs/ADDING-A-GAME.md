# Menambah game baru

Perkiraan waktu: 10 menit sampai game kosong bisa jalan, lengkap dengan CI dan
pipeline APK-nya.

## 1. Buat paketnya

```bash
mkdir -p games/teka-teki-silang/src
```

`games/teka-teki-silang/package.json`:

```json
{
  "name": "@game/teka-teki-silang",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "game": {
    "id": "teka-teki-silang",
    "title": "Teka-Teki Silang",
    "blurb": "Satu kalimat yang muncul di halaman indeks.",
    "appId": "io.github.dutarangga.tts",
    "accent": "#f2c14e",
    "background": "#0b0f14"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --build"
  },
  "dependencies": {
    "@capacitor/android": "^8.6.0",
    "@capacitor/core": "^8.6.0",
    "@game/core": "*"
  },
  "devDependencies": {
    "@capacitor/cli": "^8.6.0"
  }
}
```

Aturan yang dijaga oleh script: **`game.id` harus sama dengan nama foldernya**,
dan `game.appId` harus unik di seluruh repo — itu yang jadi identitas aplikasi di
Play Store dan tidak bisa diubah setelah rilis pertama.

## 2. Salin berkas pendukung

Paling cepat: contek dari `games/tower-defense/`.

- `tsconfig.json` — extend `../../tsconfig.base.json`, reference ke `packages/core`
- `vite.config.ts` — **`base: './'` wajib**, supaya bundle yang sama jalan di
  GitHub Pages, itch.io, dan WebView Capacitor
- `capacitor.config.ts` — `appId` dan `appName` samakan dengan field `game`
- `index.html`

## 3. Daftarkan ke typecheck

Tambahkan ke `references` di `tsconfig.json` root:

```json
{ "path": "./games/teka-teki-silang" }
```

## 4. Pasang dan jalankan

```bash
npm install
npm run games    # game baru harus muncul di daftar
npm run dev --workspace @game/teka-teki-silang
```

## 5. Selesai

Tidak ada langkah berikutnya. CI otomatis menemukan game baru lewat
`scripts/list-games.mjs`, jadi PR berikutnya langsung ikut:

- masuk matrix build APK debug,
- muncul di halaman indeks GitHub Pages,
- bisa dirilis dengan tag `teka-teki-silang-v0.1.0`.

## Yang sebaiknya diikuti

- Pakai `@game/core` untuk rekor (`createScoreStore('<id>')`), jangan menyentuh
  `localStorage` langsung — namespace-nya menjaga agar game tidak saling menimpa
  rekor saat disajikan dari satu domain yang sama.
- Taruh seluruh angka balance di `src/config/` dan beri test yang memvalidasinya.
  Di Tower Defense, test seperti itulah yang menemukan dua bug timing.
- Gambar grafis secara procedural kalau memungkinkan. Ikon APK digenerate dari
  `game.accent` dan `game.background` oleh `scripts/android-res.mjs`, jadi
  cukup pilih dua warna itu dan game baru langsung punya ikon yang layak.
  Kalau nanti ada seni asli, taruh di `games/<id>/branding/` (`icon.png`
  1024×1024, `splash.png` 2732×2732).
