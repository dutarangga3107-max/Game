import { createScoreStore } from '@game/core';

/**
 * Satu-satunya tempat game ini menyentuh penyimpanan rekor. Namespace-nya
 * dipisah per game supaya tidak bentrok saat semua game disajikan dari satu
 * domain di GitHub Pages.
 */
export const scores = createScoreStore('tower-defense');
