# Game

Monorepo berisi beberapa game. Masing-masing berdiri sendiri, punya versinya
sendiri, dan dirilis sebagai **APK terpisah** — dikerjakan end-to-end di GitHub.

| Game | Status | Stack |
|---|---|---|
| [Tower Defense](games/tower-defense/) | ✅ bisa dimainkan, 20 wave | Phaser 3 + TypeScript |

## Mulai

```bash
npm install                                     # sekali, dari root
npm run dev --workspace @game/tower-defense     # jalankan satu game
```

```bash
npm test          # vitest, seluruh workspace
npm run typecheck # tsc --build, strict, seluruh workspace
npm run site      # build semua game ke dist-site/ + halaman indeks
npm run games     # daftar game beserta appId-nya
```

## Struktur

```
games/<id>/          satu folder = satu game = satu APK
packages/core/       utilitas yang dipakai bersama (storage, rekor)
scripts/             build Android, generator ikon, builder situs
docs/                panduan menambah game & merilis
.github/workflows/   CI, rilis Android, deploy Pages
```

Tidak ada daftar game terpusat. Metadata tiap game dibaca dari field `game` di
`games/<id>/package.json`, jadi CI dan builder situs otomatis ikut saat ada game
baru — tidak ada satu file pun yang perlu diingat untuk diperbarui.

## Alur di GitHub

| Pemicu | Yang terjadi |
|---|---|
| PR / push | Typecheck, test, build web, **dan build APK debug tiap game** |
| Push ke `main` | Semua game dideploy ke GitHub Pages |
| Tag `<game>-v<versi>` | APK + AAB bertanda tangan → GitHub Release, web → itch.io |

APK debug ikut dibangun di setiap PR dengan sengaja: rantai web → Capacitor →
Gradle terbukti utuh sebelum kode masuk, tanpa perlu menyentuh satu pun secret
signing.

## Prinsip yang dipegang

- **Tanpa aset biner.** Grafis game digambar procedural saat runtime; ikon dan
  splash APK digenerate dari warna tiap game. Repo ini memakai encoder PNG
  sendiri (`scripts/png.mjs`, ~100 baris) alih-alih `@capacitor/assets`, yang
  menarik `sharp` — dependency native dengan kerentanan libvips turunan — hanya
  untuk mengubah ukuran gambar yang sudah kita render sendiri. Hasilnya:
  `npm audit` bersih dan CI tanpa build native. Seni asli buatan tangan, kalau
  nanti ada, ditaruh di `games/<id>/branding/`.
- **Proyek native tidak di-commit.** `android/` digenerate ulang tiap build, jadi
  tidak pernah ada hasil build basi yang ikut terbawa.
- **Angka balance terpisah dari logika.** Tiap game menaruh seluruh angkanya di
  `config/` supaya bisa di-tuning tanpa menyentuh kode.
- **Script yang sama dipakai lokal dan CI.** Kegagalan CI selalu bisa
  direproduksi dengan satu perintah.

## Dokumentasi

- [Menambah game baru](docs/ADDING-A-GAME.md)
- [Merilis ke Play Store, GitHub Releases, dan itch.io](docs/RELEASING.md)

## Catatan soal game multiplayer

Rencana jangka panjang mencakup MMORPG dan battlefield. Keduanya **bukan sekadar
game lain di folder ini**: keduanya butuh server otoritatif yang jalan terus,
database, dan netcode, dengan biaya bulanan yang berjalan — APK hanya client-nya.
Phaser juga bukan pilihan tepat untuk 3D.

Urutan yang dipakai di repo ini: matangkan dulu pipeline rilis lewat game
single-player, baru naik ke multiplayer. Saat itu tiba, satu-satunya variabel
baru tinggal netcode-nya.
