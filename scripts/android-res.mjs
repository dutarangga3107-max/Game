import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { hexToRgb, readPngSize } from './png.mjs';
import { renderAdaptiveForeground, renderIcon, renderRoundIcon } from './icon-art.mjs';
import { findGame } from './games.mjs';

/**
 * Menulis ikon & splash ke proyek Android hasil generate Capacitor.
 *
 * Menggantikan @capacitor/assets, yang menarik `sharp` — dependency native
 * dengan kerentanan libvips yang diwarisi — hanya untuk mengubah ukuran gambar
 * yang sudah kita render sendiri.
 *
 * Pendekatannya tahan perubahan template: alih-alih menghardcode tabel densitas
 * Android, script menelusuri res/ dan mengganti setiap PNG yang sudah ada
 * dengan render baru **pada dimensi aslinya**. Kalau Capacitor menambah atau
 * mengubah densitas, langkah ini ikut menyesuaikan sendiri.
 */

const RENDERERS = {
  'ic_launcher.png': (w, h, opts) => renderIcon(w, h, opts),
  'ic_launcher_round.png': (w, _h, opts) => renderRoundIcon(w, opts),
  'ic_launcher_foreground.png': (w, _h, opts) => renderAdaptiveForeground(w, opts),
  'splash.png': (w, h, opts) => renderIcon(w, h, opts),
};

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

export function writeAndroidResources(game) {
  const resDir = join(game.dir, 'android', 'app', 'src', 'main', 'res');
  if (!existsSync(resDir)) {
    throw new Error(`Tidak ada ${resDir} — jalankan \`npx cap add android\` dulu`);
  }

  const opts = { accent: hexToRgb(game.accent), background: hexToRgb(game.background) };
  let written = 0;

  for (const file of walk(resDir)) {
    const name = file.slice(file.lastIndexOf('/') + 1);
    const render = RENDERERS[name];
    if (!render) continue;

    const [width, height] = readPngSize(readFileSync(file));
    writeFileSync(file, render(width, height, opts).toPng());
    written++;
  }

  if (written === 0) {
    throw new Error(
      `Tidak ada ikon/splash yang dikenali di ${resDir}. ` +
        'Template Capacitor mungkin berubah — periksa nama berkas di RENDERERS.',
    );
  }

  // Warna latar adaptive icon ikut warna game.
  const valuesDir = join(resDir, 'values');
  mkdirSync(valuesDir, { recursive: true });
  writeFileSync(
    join(valuesDir, 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${game.background}</color>
</resources>
`,
  );

  console.log(`ikon Android: ${written} berkas ditulis ulang di res/`);
  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const id = process.argv[2];
  if (!id) {
    console.error('Pemakaian: node scripts/android-res.mjs <game-id>');
    process.exit(1);
  }
  writeAndroidResources(findGame(id));
}
