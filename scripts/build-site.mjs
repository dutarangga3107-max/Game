import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, listGames } from './games.mjs';

/**
 * Membangun semua game menjadi satu situs statis: dist-site/<id>/.
 *
 * Setiap game di-build dengan base relatif ('./'), jadi bundle yang sama bisa
 * disajikan dari subfolder GitHub Pages, dari itch.io, maupun dari dalam
 * WebView Capacitor tanpa perubahan konfigurasi.
 */

const OUT = join(ROOT, 'dist-site');
const games = listGames();

if (games.length === 0) {
  console.error('Tidak ada game untuk dibangun.');
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const game of games) {
  console.log(`\n▸ build ${game.id}`);
  execFileSync('npm', ['run', 'build', '--workspace', game.pkgName], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  const dist = join(game.dir, 'dist');
  if (!existsSync(dist)) throw new Error(`${game.id}: build tidak menghasilkan dist/`);
  cpSync(dist, join(OUT, game.id), { recursive: true });
}

const escape = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const cards = games
  .map(
    (g) => `      <a class="card" href="./${escape(g.id)}/" style="--accent:${escape(g.accent)}">
        <h2>${escape(g.title)}</h2>
        <p>${escape(g.blurb)}</p>
        <span class="play">Main &rarr;</span>
      </a>`,
  )
  .join('\n');

writeFileSync(
  join(OUT, 'index.html'),
  `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Game</title>
    <style>
      :root { color-scheme: dark; --bg:#0b0f14; --panel:#16202b; --line:#24303f; --text:#e6edf3; --dim:#8899a6; }
      * { box-sizing: border-box; }
      body {
        margin: 0; min-height: 100vh; padding: 64px 24px;
        background: var(--bg); color: var(--text);
        font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      main { max-width: 880px; margin: 0 auto; }
      h1 { font-size: 40px; margin: 0 0 8px; letter-spacing: -0.02em; }
      .sub { color: var(--dim); margin: 0 0 40px; font-size: 15px; }
      .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
      .card {
        display: block; padding: 22px; border-radius: 12px; text-decoration: none; color: inherit;
        background: var(--panel); border: 1px solid var(--line);
        transition: border-color .15s, transform .15s;
      }
      .card:hover { border-color: var(--accent); transform: translateY(-2px); }
      .card h2 { margin: 0 0 8px; font-size: 19px; color: var(--accent); }
      .card p { margin: 0 0 16px; font-size: 13px; line-height: 1.5; color: var(--dim); }
      .play { font-size: 13px; font-weight: 600; color: var(--accent); }
      footer { margin-top: 48px; font-size: 13px; color: var(--dim); }
      footer a { color: var(--dim); }
    </style>
  </head>
  <body>
    <main>
      <h1>Game</h1>
      <p class="sub">${games.length} game &middot; main langsung di browser, atau unduh APK-nya dari Releases.</p>
      <div class="grid">
${cards}
      </div>
      <footer>
        <a href="https://github.com/dutarangga3107-max/Game">Kode sumber di GitHub</a>
      </footer>
    </main>
  </body>
</html>
`,
);

console.log(`\n✓ dist-site/ siap — ${games.length} game + halaman indeks`);
