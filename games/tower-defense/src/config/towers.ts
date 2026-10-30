import type { TowerKind } from '../types';
import { COLORS } from './constants';

export interface TowerLevel {
  /** Harga untuk mencapai level ini (level 1 = harga bangun). */
  cost: number;
  damage: number;
  /** Jangkauan dalam pixel. */
  range: number;
  /** Tembakan per detik. */
  fireRate: number;
  /** Radius ledakan (pixel) untuk projectile ledak. */
  splash?: number;
  /** Pengali kecepatan musuh saat terkena efek lambat (0..1). */
  slowFactor?: number;
  slowDurationMs?: number;
  /** Jumlah target tambahan yang disambar petir. */
  chain?: number;
  /** Jumlah musuh tambahan yang bisa ditembus satu peluru. */
  pierce?: number;
}

export type ProjectileStyle = 'bullet' | 'shell' | 'beam' | 'chain';

export interface TowerDef {
  kind: TowerKind;
  name: string;
  blurb: string;
  hotkey: string;
  canHitAir: boolean;
  projectile: ProjectileStyle;
  tint: number;
  turretTexture: string;
  /** Selalu 3 level. */
  levels: [TowerLevel, TowerLevel, TowerLevel];
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  arrow: {
    kind: 'arrow',
    name: 'Archer',
    blurb: 'Serba bisa, rate tinggi. Kena udara.',
    hotkey: '1',
    canHitAir: true,
    projectile: 'bullet',
    tint: COLORS.arrow,
    turretTexture: 'turret-arrow',
    levels: [
      { cost: 60, damage: 11, range: 150, fireRate: 2.2 },
      { cost: 70, damage: 19, range: 165, fireRate: 2.6 },
      { cost: 110, damage: 32, range: 185, fireRate: 3.0, pierce: 1 },
    ],
  },
  cannon: {
    kind: 'cannon',
    name: 'Mortar',
    blurb: 'Damage area besar. Darat saja.',
    hotkey: '2',
    canHitAir: false,
    projectile: 'shell',
    tint: COLORS.cannon,
    turretTexture: 'turret-cannon',
    levels: [
      { cost: 110, damage: 30, range: 160, fireRate: 0.75, splash: 52 },
      { cost: 130, damage: 52, range: 175, fireRate: 0.85, splash: 62 },
      { cost: 200, damage: 88, range: 195, fireRate: 0.95, splash: 74 },
    ],
  },
  frost: {
    kind: 'frost',
    name: 'Cryo',
    blurb: 'Memperlambat musuh. Kena udara.',
    hotkey: '3',
    canHitAir: true,
    projectile: 'beam',
    tint: COLORS.frost,
    turretTexture: 'turret-frost',
    levels: [
      { cost: 90, damage: 6, range: 140, fireRate: 1.6, slowFactor: 0.55, slowDurationMs: 1200 },
      { cost: 110, damage: 10, range: 155, fireRate: 1.8, slowFactor: 0.45, slowDurationMs: 1500 },
      { cost: 170, damage: 16, range: 175, fireRate: 2.0, slowFactor: 0.35, slowDurationMs: 1800 },
    ],
  },
  tesla: {
    kind: 'tesla',
    name: 'Tesla',
    blurb: 'Petir berantai. Kena udara.',
    hotkey: '4',
    canHitAir: true,
    projectile: 'chain',
    tint: COLORS.tesla,
    turretTexture: 'turret-tesla',
    levels: [
      { cost: 170, damage: 22, range: 135, fireRate: 1.2, chain: 2 },
      { cost: 200, damage: 36, range: 150, fireRate: 1.4, chain: 3 },
      { cost: 300, damage: 58, range: 170, fireRate: 1.6, chain: 4 },
    ],
  },
};

export const TOWER_ORDER: readonly TowerKind[] = ['arrow', 'cannon', 'frost', 'tesla'];

/** Jarak maksimum lompatan petir antar musuh. */
export const CHAIN_JUMP_RANGE = 110;
