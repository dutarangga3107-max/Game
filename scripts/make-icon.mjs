import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hexToRgb } from './png.mjs';
import { renderIcon } from './icon-art.mjs';
import { findGame, listGames } from './games.mjs';

/**
 * Menyiapkan assets/icon.png dan assets/splash.png — dipakai untuk store
 * listing, README, dan pratinjau.
 *
 * Ikon di dalam APK ditulis terpisah oleh scripts/android-res.mjs langsung ke
 * res/ Android. Kalau game punya seni asli di branding/, file itu yang dipakai;
 * kalau belum, digambar placeholder dari warna game tersebut. assets/ sengaja
 * digitignore: isinya selalu bisa dibuat ulang, jadi repo tetap bebas file biner.
 */

function build(game, { force }) {
  const assetsDir = join(game.dir, 'assets');
  const brandingDir = join(game.dir, 'branding');
  mkdirSync(assetsDir, { recursive: true });

  const accent = hexToRgb(game.accent);
  const bg = hexToRgb(game.background);

  for (const [name, size] of [
    ['icon.png', 1024],
    ['splash.png', 2732],
  ]) {
    const out = join(assetsDir, name);
    const handmade = join(brandingDir, name);

    if (existsSync(handmade)) {
      copyFileSync(handmade, out);
      console.log(`${game.id}: ${name} <- branding/${name} (seni asli)`);
      continue;
    }
    if (existsSync(out) && !force) {
      console.log(`${game.id}: ${name} sudah ada, dilewati (pakai --force untuk menimpa)`);
      continue;
    }

    const png = renderIcon(size, size, { accent, background: bg }).toPng();
    writeFileSync(out, png);
    console.log(`${game.id}: ${name} ${size}x${size} (${(png.length / 1024).toFixed(1)} kB) digenerate`);
  }
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const ids = args.filter((a) => !a.startsWith('--'));
const targets = ids.length > 0 ? ids.map(findGame) : listGames();

if (targets.length === 0) {
  console.error('Tidak ada game untuk diproses.');
  process.exit(1);
}
for (const game of targets) build(game, { force });
