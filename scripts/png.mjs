import { deflateSync } from 'node:zlib';

/**
 * Encoder PNG minimal (RGBA, 8-bit, tanpa interlace).
 *
 * Ada supaya repo tidak perlu menyimpan aset biner maupun menarik dependency
 * image-processing hanya untuk membuat ikon placeholder. Hasilnya deterministik:
 * input yang sama selalu menghasilkan byte yang sama.
 */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

export function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const dst = y * (stride + 1);
    raw[dst] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, dst + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Warna hex tidak valid: "${hex}" (harap pakai format #rrggbb)`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Kanvas RGBA sederhana dengan anti-aliasing analitik. */
export class Canvas {
  constructor(width, height = width) {
    this.width = width;
    this.height = height;
    // Mulai transparan penuh; adaptive icon foreground mengandalkan ini.
    this.data = new Uint8Array(width * height * 4);
  }

  /** Sisi terpendek — dipakai menskalakan bentuk agar muat di kanvas non-persegi. */
  get size() {
    return Math.min(this.width, this.height);
  }

  fill([r, g, b]) {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
      this.data[i + 3] = 255;
    }
  }

  /** Komposit source-over satu pixel dengan coverage 0..1. */
  blend(x, y, [r, g, b], coverage) {
    if (coverage <= 0 || x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const src = Math.min(1, coverage);
    const i = (y * this.width + x) * 4;
    const dst = this.data[i + 3] / 255;
    const out = src + dst * (1 - src);
    if (out <= 0) return;

    const mix = (channel, value) =>
      Math.round((value * src + channel * dst * (1 - src)) / out);

    this.data[i] = mix(this.data[i], r);
    this.data[i + 1] = mix(this.data[i + 1], g);
    this.data[i + 2] = mix(this.data[i + 2], b);
    this.data[i + 3] = Math.round(out * 255);
  }

  /** Buat seluruh pixel di luar lingkaran jadi transparan (untuk ikon bulat). */
  maskCircle(cx, cy, radius) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - radius;
        const keep = Math.min(1, Math.max(0, 0.5 - d));
        const i = (y * this.width + x) * 4;
        this.data[i + 3] = Math.round(this.data[i + 3] * keep);
      }
    }
  }

  /** Jalankan fn(x, y) -> jarak bertanda; negatif = di dalam bentuk. */
  shape(bounds, color, signedDistance, alpha = 1) {
    const limit = [this.width, this.height];
    const [x0, y0, x1, y1] = bounds.map((v, i) =>
      i < 2 ? Math.max(0, Math.floor(v)) : Math.min(limit[i - 2], Math.ceil(v)),
    );
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        // Coverage dari jarak bertanda memberi tepi halus tanpa supersampling.
        const coverage = Math.min(1, Math.max(0, 0.5 - signedDistance(x + 0.5, y + 0.5)));
        this.blend(x, y, color, coverage * alpha);
      }
    }
  }

  circle(cx, cy, radius, color, alpha = 1) {
    const pad = 2;
    this.shape(
      [cx - radius - pad, cy - radius - pad, cx + radius + pad, cy + radius + pad],
      color,
      (x, y) => Math.hypot(x - cx, y - cy) - radius,
      alpha,
    );
  }

  ring(cx, cy, radius, thickness, color, alpha = 1) {
    const pad = thickness + 2;
    const half = thickness / 2;
    this.shape(
      [cx - radius - pad, cy - radius - pad, cx + radius + pad, cy + radius + pad],
      color,
      (x, y) => Math.abs(Math.hypot(x - cx, y - cy) - radius) - half,
      alpha,
    );
  }

  roundedRect(cx, cy, w, h, radius, color, alpha = 1) {
    const hw = w / 2 - radius;
    const hh = h / 2 - radius;
    const pad = 2;
    this.shape(
      [cx - w / 2 - pad, cy - h / 2 - pad, cx + w / 2 + pad, cy + h / 2 + pad],
      color,
      (x, y) => {
        const dx = Math.max(Math.abs(x - cx) - hw, 0);
        const dy = Math.max(Math.abs(y - cy) - hh, 0);
        return Math.hypot(dx, dy) - radius;
      },
      alpha,
    );
  }

  toPng() {
    return encodePng(this.width, this.height, this.data);
  }
}

/** Baca [width, height] dari header IHDR sebuah PNG. */
export function readPngSize(buffer) {
  if (buffer.length < 24 || buffer.readUInt32BE(12) !== 0x49484452) {
    throw new Error('Bukan berkas PNG yang valid');
  }
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}
