import { Canvas } from './png.mjs';

/**
 * Satu definisi gambar untuk semua ukuran ikon dan splash.
 *
 * Semua ukuran dinyatakan relatif terhadap sisi terpendek kanvas, jadi bentuk
 * yang sama tetap proporsional dari 48px sampai 2732px.
 */

/**
 * @param scale  Pengecil mark. Adaptive icon Android memangkas hingga ~66%
 *               dari layer foreground, jadi layer itu digambar lebih kecil.
 * @param withBackground  false menghasilkan mark di atas latar transparan.
 */
export function drawIcon(canvas, { accent, background, scale = 1, withBackground = true }) {
  const s = canvas.size * scale;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  if (withBackground) {
    canvas.fill(background);
    // Dua lingkaran samar supaya ikon tidak terlihat datar di launcher terang.
    canvas.circle(cx, cy, canvas.size * 0.52, accent, 0.06);
    canvas.circle(cx, cy, canvas.size * 0.42, accent, 0.06);
  }

  canvas.ring(cx, cy, s * 0.26, s * 0.045, accent, 1);
  canvas.ring(cx, cy, s * 0.17, s * 0.03, accent, 0.65);
  canvas.circle(cx, cy, s * 0.075, accent, 1);

  // Empat penanda arah: terbaca sebagai "pertahanan" bahkan di 48px.
  const arm = s * 0.055;
  const span = s * 0.335;
  for (const [dx, dy] of [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ]) {
    canvas.roundedRect(
      cx + dx * span,
      cy + dy * span,
      dx === 0 ? arm : arm * 2.1,
      dy === 0 ? arm : arm * 2.1,
      arm * 0.35,
      accent,
      0.9,
    );
  }
}

export function renderIcon(width, height, opts) {
  const canvas = new Canvas(width, height);
  drawIcon(canvas, opts);
  return canvas;
}

/** Ikon bulat untuk launcher yang memintanya. */
export function renderRoundIcon(size, opts) {
  const canvas = renderIcon(size, size, opts);
  canvas.maskCircle(size / 2, size / 2, size / 2);
  return canvas;
}

/**
 * Layer foreground adaptive icon: latar transparan, mark dikecilkan agar tetap
 * utuh saat dipangkas mask berbentuk apa pun oleh launcher.
 */
export function renderAdaptiveForeground(size, opts) {
  return renderIcon(size, size, { ...opts, withBackground: false, scale: 0.62 });
}
