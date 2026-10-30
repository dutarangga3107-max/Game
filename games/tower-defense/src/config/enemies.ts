import type { EnemyKind } from '../types';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  /** Pixel per detik. */
  speed: number;
  /** Pengurangan damage flat; damage minimum selalu 1. */
  armor: number;
  bounty: number;
  /** Nyawa yang hilang kalau musuh ini sampai ke base. */
  damageToBase: number;
  flying: boolean;
  texture: string;
  tint: number;
  scale: number;
  /** Lebar health bar (pixel). */
  barWidth: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  grunt: {
    kind: 'grunt',
    name: 'Grunt',
    hp: 70,
    speed: 80,
    armor: 0,
    bounty: 7,
    damageToBase: 1,
    flying: false,
    texture: 'enemy-grunt',
    tint: 0xe0786a,
    scale: 1,
    barWidth: 24,
  },
  runner: {
    kind: 'runner',
    name: 'Runner',
    hp: 48,
    speed: 170,
    armor: 0,
    bounty: 8,
    damageToBase: 1,
    flying: false,
    texture: 'enemy-runner',
    tint: 0xf0d06a,
    scale: 0.95,
    barWidth: 22,
  },
  tank: {
    kind: 'tank',
    name: 'Tank',
    hp: 340,
    speed: 52,
    armor: 7,
    bounty: 22,
    damageToBase: 2,
    flying: false,
    texture: 'enemy-tank',
    tint: 0x8e9aa8,
    scale: 1.15,
    barWidth: 32,
  },
  flyer: {
    kind: 'flyer',
    name: 'Flyer',
    hp: 95,
    speed: 85,
    armor: 1,
    bounty: 13,
    damageToBase: 1,
    flying: true,
    texture: 'enemy-flyer',
    tint: 0xb48ce8,
    scale: 1,
    barWidth: 26,
  },
  boss: {
    kind: 'boss',
    name: 'Juggernaut',
    hp: 2800,
    speed: 46,
    armor: 14,
    bounty: 200,
    damageToBase: 10,
    flying: false,
    texture: 'enemy-boss',
    tint: 0xff5577,
    scale: 1,
    barWidth: 46,
  },
};
