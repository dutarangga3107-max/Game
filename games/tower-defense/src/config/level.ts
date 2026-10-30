import type { EnemyKind, TileCoord } from '../types';

export interface WaveGroup {
  kind: EnemyKind;
  count: number;
  /** Jeda antar unit dalam grup (ms). */
  spacing: number;
  /** Jeda sebelum grup mulai spawn, dihitung dari awal wave (ms). */
  delay: number;
}

export interface WaveDef {
  /** Bonus gold saat wave selesai dibersihkan. */
  reward: number;
  groups: WaveGroup[];
}

export interface LevelDef {
  name: string;
  /**
   * Layout grid, satu string per baris, panjang tiap baris harus = COLS.
   *   '.' tanah (bisa dibangun)  '#' jalur darat
   *   'S' titik spawn            'B' base yang dipertahankan
   *   'x' blokir (tidak bisa dibangun, bukan jalur)
   */
  layout: string[];
  /** Rute terbang, dalam koordinat tile. Musuh udara mengabaikan jalur darat. */
  airRoute: TileCoord[];
  waves: WaveDef[];
}

export const LEVEL: LevelDef = {
  name: 'Serpentine Pass',
  layout: [
    '.....................',
    'S###################.',
    '...................#.',
    '...................#.',
    '.###################.',
    '.#...................',
    '.#...................',
    '.###################.',
    '...................#.',
    '...................#.',
    '.###################.',
    '.#...................',
    '.#...................',
    '.#########B..........',
    '.....................',
  ],
  airRoute: [
    { col: 0, row: 1 },
    { col: 18, row: 2 },
    { col: 2, row: 8 },
    { col: 18, row: 11 },
    { col: 10, row: 13 },
  ],
  waves: [
    { reward: 25, groups: [{ kind: 'grunt', count: 8, spacing: 950, delay: 0 }] },
    { reward: 28, groups: [{ kind: 'grunt', count: 12, spacing: 800, delay: 0 }] },
    {
      reward: 32,
      groups: [
        { kind: 'grunt', count: 8, spacing: 800, delay: 0 },
        { kind: 'runner', count: 5, spacing: 550, delay: 4500 },
      ],
    },
    { reward: 36, groups: [{ kind: 'runner', count: 14, spacing: 450, delay: 0 }] },
    {
      reward: 44,
      groups: [
        { kind: 'grunt', count: 10, spacing: 650, delay: 0 },
        { kind: 'tank', count: 2, spacing: 2600, delay: 5000 },
      ],
    },
    { reward: 48, groups: [{ kind: 'flyer', count: 8, spacing: 800, delay: 0 }] },
    {
      reward: 54,
      groups: [
        { kind: 'tank', count: 4, spacing: 2400, delay: 0 },
        { kind: 'grunt', count: 12, spacing: 600, delay: 1200 },
      ],
    },
    {
      reward: 60,
      groups: [
        { kind: 'runner', count: 18, spacing: 350, delay: 0 },
        { kind: 'flyer', count: 6, spacing: 900, delay: 5000 },
      ],
    },
    {
      reward: 68,
      groups: [
        { kind: 'tank', count: 5, spacing: 1900, delay: 0 },
        { kind: 'flyer', count: 10, spacing: 700, delay: 2000 },
      ],
    },
    {
      reward: 150,
      groups: [
        { kind: 'boss', count: 1, spacing: 0, delay: 0 },
        { kind: 'grunt', count: 16, spacing: 500, delay: 3000 },
      ],
    },
    {
      reward: 74,
      groups: [
        { kind: 'grunt', count: 20, spacing: 480, delay: 0 },
        { kind: 'tank', count: 4, spacing: 2000, delay: 4000 },
      ],
    },
    {
      reward: 80,
      groups: [
        { kind: 'flyer', count: 14, spacing: 600, delay: 0 },
        { kind: 'runner', count: 14, spacing: 400, delay: 3000 },
      ],
    },
    {
      reward: 86,
      groups: [
        { kind: 'tank', count: 7, spacing: 1700, delay: 0 },
        { kind: 'runner', count: 16, spacing: 380, delay: 2500 },
      ],
    },
    {
      reward: 92,
      groups: [
        { kind: 'flyer', count: 16, spacing: 520, delay: 0 },
        { kind: 'tank', count: 5, spacing: 1800, delay: 4000 },
      ],
    },
    {
      reward: 100,
      groups: [
        { kind: 'boss', count: 1, spacing: 0, delay: 0 },
        { kind: 'flyer', count: 12, spacing: 600, delay: 2500 },
        { kind: 'runner', count: 18, spacing: 350, delay: 6000 },
      ],
    },
    {
      reward: 108,
      groups: [
        { kind: 'tank', count: 9, spacing: 1500, delay: 0 },
        { kind: 'grunt', count: 24, spacing: 420, delay: 2000 },
      ],
    },
    {
      reward: 116,
      groups: [
        { kind: 'runner', count: 28, spacing: 300, delay: 0 },
        { kind: 'flyer', count: 14, spacing: 520, delay: 3000 },
      ],
    },
    {
      reward: 124,
      groups: [
        { kind: 'tank', count: 10, spacing: 1400, delay: 0 },
        { kind: 'flyer', count: 18, spacing: 480, delay: 2500 },
      ],
    },
    {
      reward: 140,
      groups: [
        { kind: 'boss', count: 2, spacing: 9000, delay: 0 },
        { kind: 'tank', count: 8, spacing: 1600, delay: 3000 },
      ],
    },
    {
      reward: 400,
      groups: [
        { kind: 'boss', count: 3, spacing: 7000, delay: 0 },
        { kind: 'tank', count: 12, spacing: 1300, delay: 2000 },
        { kind: 'flyer', count: 20, spacing: 450, delay: 4000 },
        { kind: 'runner', count: 30, spacing: 280, delay: 8000 },
      ],
    },
  ],
};
