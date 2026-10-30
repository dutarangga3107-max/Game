import { readNumber, writeStorage } from './storage';

export interface ScoreStore {
  /** Rekor tertinggi yang tersimpan untuk metrik ini; 0 kalau belum ada. */
  best(metric: string): number;
  /**
   * Catat hasil satu sesi.
   * @returns rekor setelah pembaruan — sama dengan `value` kalau ini rekor baru.
   */
  submit(metric: string, value: number): number;
}

/**
 * Rekor per game, dipisah namespace supaya game yang satu tidak menimpa
 * rekor game lain saat keduanya dibuka dari origin yang sama (misalnya di
 * GitHub Pages, tempat semua game berbagi satu domain).
 */
export function createScoreStore(gameId: string): ScoreStore {
  const keyFor = (metric: string) => `${gameId}:best:${metric}`;

  return {
    best(metric) {
      return readNumber(keyFor(metric), 0);
    },
    submit(metric, value) {
      const key = keyFor(metric);
      const best = Math.max(readNumber(key, 0), value);
      writeStorage(key, String(best));
      return best;
    },
  };
}
