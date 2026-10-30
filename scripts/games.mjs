import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const GAMES_DIR = join(ROOT, 'games');

/**
 * Metadata tiap game dibaca dari field "game" di package.json-nya, jadi tidak
 * ada daftar terpusat yang bisa basi saat game baru ditambahkan.
 */
export function listGames() {
  if (!existsSync(GAMES_DIR)) return [];

  return readdirSync(GAMES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const dir = join(GAMES_DIR, e.name);
      const pkgPath = join(dir, 'package.json');
      if (!existsSync(pkgPath)) return null;

      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      const meta = pkg.game;
      if (!meta) return null;

      for (const field of ['id', 'title', 'appId']) {
        if (!meta[field]) {
          throw new Error(`games/${e.name}/package.json: field "game.${field}" wajib diisi`);
        }
      }
      if (meta.id !== e.name) {
        throw new Error(`games/${e.name}/package.json: game.id ("${meta.id}") harus sama dengan nama folder`);
      }

      return {
        dir,
        folder: e.name,
        pkgName: pkg.name,
        version: pkg.version ?? '0.0.0',
        id: meta.id,
        title: meta.title,
        blurb: meta.blurb ?? '',
        appId: meta.appId,
        accent: meta.accent ?? '#55c8f0',
        background: meta.background ?? '#0b0f14',
      };
    })
    .filter((g) => g !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function findGame(id) {
  const game = listGames().find((g) => g.id === id);
  if (!game) {
    const available = listGames().map((g) => g.id).join(', ') || '(belum ada)';
    throw new Error(`Game "${id}" tidak ditemukan. Yang tersedia: ${available}`);
  }
  return game;
}
