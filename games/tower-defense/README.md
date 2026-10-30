# Tower Defense

Game tower defense berbasis grid, dibangun dengan **Phaser 3 + TypeScript + Vite**.
Semua grafis digenerate procedural saat runtime — repo ini tidak menyimpan satu pun aset biner.

![stack](https://img.shields.io/badge/Phaser-3.90-blue) ![stack](https://img.shields.io/badge/TypeScript-5.9-blue) ![stack](https://img.shields.io/badge/Vite-7-purple)

## Menjalankan

Semua perintah dijalankan dari **root monorepo**:

```bash
npm install
npm run dev --workspace @game/tower-defense   # http://localhost:5173
```

```bash
npm test                                       # vitest, seluruh workspace
npm run typecheck                              # tsc --build, strict
npm run build --workspace @game/tower-defense  # bundle ke games/tower-defense/dist/
node scripts/build-android.mjs tower-defense   # APK debug (butuh Android SDK)
```

Lihat [`docs/RELEASING.md`](../../docs/RELEASING.md) untuk alur rilis APK/AAB.

## Cara main

Tahan 20 wave dengan 20 nyawa. Musuh yang lolos ke base mengurangi nyawa
(boss memotong 10 sekaligus). Habis nyawa = kalah.

| Input | Aksi |
|---|---|
| `1` `2` `3` `4` | Pilih tower untuk dibangun |
| Klik kiri | Bangun di tile terpilih / pilih tower yang sudah ada |
| Klik kanan / `Esc` | Batalkan mode bangun & batal pilih |
| `U` | Upgrade tower terpilih |
| `X` | Jual tower terpilih (balik 70% total investasi) |
| `T` | Ganti prioritas target tower |
| `Space` | Panggil wave berikutnya lebih cepat (+2 gold per detik sisa) |
| `F` | Kecepatan 1x / 2x / 3x |
| `P` | Pause |

Prioritas target: **Terdepan** (paling dekat base), **Terbelakang**, **Terkuat** (HP tertinggi), **Terdekat**.

### Tower

| Tower | Harga | Karakter | Udara |
|---|---|---|---|
| **Archer** | 60g | Rate tinggi, serba bisa. Level 3 dapat pierce. | ✅ |
| **Mortar** | 110g | Damage area dengan falloff, memimpin target. | ❌ |
| **Cryo** | 90g | Damage kecil tapi memperlambat musuh. | ✅ |
| **Tesla** | 170g | Petir berantai, damage −20% tiap lompatan. | ✅ |

Tiap tower punya 3 level. Musuh udara (*Flyer*) mengabaikan jalur darat dan
terbang lewat rute diagonalnya sendiri — Mortar tidak bisa menyentuhnya, jadi
komposisi pertahanan harus campur.

## Arsitektur

```
games/tower-defense/
├── main.ts              # bootstrap Phaser
├── types.ts             # tipe lintas-modul
├── scores.ts            # rekor, lewat @game/core
├── config/              # DATA — tidak ada logika di sini
│   ├── constants.ts     #   dimensi grid, ekonomi, palet warna, depth layer
│   ├── towers.ts        #   definisi tower + tabel 3 level
│   ├── enemies.ts       #   stat musuh
│   └── level.ts         #   layout peta, rute udara, 20 wave
├── core/
│   ├── Grid.ts          # parsing layout, konversi tile <-> world, okupansi
│   ├── Pathfinder.ts    # BFS spawn -> base
│   ├── WaveManager.ts   # state machine: break -> spawning -> clearing
│   ├── GameState.ts     # gold & nyawa, satu-satunya sumber kebenaran
│   ├── EventBus.ts      # jembatan GameScene <-> HudScene
│   ├── Combat.ts        # kontrak yang dipakai Tower untuk menembak
│   └── __tests__/       # vitest: state machine wave + validasi data config
├── entities/            # Enemy, Tower, Projectile (pooled)
├── scenes/              # Boot (generate texture), Menu, Game, Hud, GameOver
└── ui/Button.ts
```

Beberapa keputusan yang perlu diketahui sebelum ikut ngoprek:

- **Semua timing pakai `dt` yang sudah diskalakan game speed**, bukan `scene.time`.
  Jadi tombol 3x mempercepat spawn, cooldown tower, dan projectile secara konsisten —
  bukan cuma animasi. Entity tidak memakai `runChildUpdate`; `GameScene.update()`
  yang memanggil `tick(dt)` satu per satu.
- **Enemy dan Projectile di-pool** (`enemyPool` / `projectilePool`). Objek mati
  di-`recycle()` lalu dipakai ulang, bukan `destroy()` — menghindari GC spike
  saat wave besar.
- **Health bar dan efek visual digambar di satu `Graphics` per layer**, bukan satu
  objek per musuh. `drawHpBars()` dan `drawFx()` clear-and-redraw tiap frame.
- **Damage dan gold terpusat di `GameScene`**. `Tower` hanya memilih target dan
  memanggil `Combat`; projectile hanya membawa data. Tidak ada entity yang
  menyentuh `GameState` langsung.
- **HUD adalah scene terpisah** yang cuma bicara lewat `EventBus`. Tidak ada
  referensi langsung antara UI dan logika game.
- **Grafis procedural**: `BootScene` menggambar tiap bentuk dengan `Graphics`
  lalu `generateTexture()`. Bentuk musuh digambar putih dan diwarnai via `setTint`.

## Tuning balance

Semua angka ada di `src/config/` dan tidak tersebar di logika:

- Harga, damage, range, fire rate tower → `towers.ts`
- HP, kecepatan, armor, bounty musuh → `enemies.ts`
- Komposisi 20 wave, hadiah, layout peta, rute udara → `level.ts`
- Gold awal, nyawa, refund jual, durasi jeda wave, scaling HP → `constants.ts`

`npm test` memvalidasi hal-hal yang gampang rusak saat tuning: dimensi layout,
konektivitas jalur spawn→base, rute udara, tidak ada wave kosong, dan stat tower
yang menaik tiap level. Jalankan setelah mengubah isi `config/`.

Mengubah peta cukup mengedit array `layout` di `level.ts` (`.` tanah, `#` jalur,
`S` spawn, `B` base, `x` blokir). Pathfinder akan menghitung ulang rute darat
otomatis; `Grid` memvalidasi dimensi dan melempar error kalau barisnya tidak pas.

## Roadmap

- [ ] Multi-map + layar pilih level
- [ ] Tower keempat jalur upgrade bercabang (bukan linear 3 level)
- [ ] Efek status tambahan: burn, armor shred
- [ ] Simpan/muat progres run
- [ ] Mode endless dengan scaling tak terbatas
