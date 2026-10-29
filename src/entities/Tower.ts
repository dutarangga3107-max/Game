import Phaser from 'phaser';
import { DEPTH, SELL_REFUND } from '../config/constants';
import { TOWERS, type TowerDef, type TowerLevel } from '../config/towers';
import type { Combat } from '../core/Combat';
import type { TargetMode, TowerKind } from '../types';
import type { Enemy } from './Enemy';

/** Durasi animasi hentakan turret setelah menembak (ms). */
const RECOIL_MS = 90;

export class Tower extends Phaser.GameObjects.Container {
  readonly def: TowerDef;
  readonly col: number;
  readonly row: number;

  /** 0-based: 0 = level 1. */
  level = 0;
  targetMode: TargetMode = 'first';
  invested: number;

  private readonly turret: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Image;
  private cooldown = 0;
  private recoil = 0;
  private turretScale = 1;

  constructor(scene: Phaser.Scene, kind: TowerKind, col: number, row: number, x: number, y: number) {
    super(scene, x, y);
    this.def = TOWERS[kind];
    this.col = col;
    this.row = row;
    this.invested = this.def.levels[0].cost;

    const base = scene.add.image(0, 0, 'tower-base');
    this.ring = scene.add.image(0, 0, 'tower-ring').setTint(this.def.tint).setAlpha(0.9);
    this.turret = scene.add.image(0, 0, this.def.turretTexture).setTint(this.def.tint);

    this.add([base, this.ring, this.turret]);
    this.setDepth(DEPTH.tower);
    this.setSize(40, 40);
    scene.add.existing(this);
    this.refreshVisual();
  }

  get stats(): TowerLevel {
    return this.def.levels[this.level];
  }

  get displayLevel(): number {
    return this.level + 1;
  }

  get maxLevel(): number {
    return this.def.levels.length;
  }

  get canUpgrade(): boolean {
    return this.level < this.def.levels.length - 1;
  }

  get upgradeCost(): number {
    return this.canUpgrade ? this.def.levels[this.level + 1].cost : 0;
  }

  get sellValue(): number {
    return Math.floor(this.invested * SELL_REFUND);
  }

  upgrade(): void {
    if (!this.canUpgrade) return;
    this.invested += this.upgradeCost;
    this.level++;
    this.refreshVisual();
  }

  cycleTargetMode(modes: readonly TargetMode[]): void {
    const i = modes.indexOf(this.targetMode);
    this.targetMode = modes[(i + 1) % modes.length];
  }

  tick(dt: number, combat: Combat): void {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - dt);
      // Hentakan: turret mengecil sesaat lalu kembali ke skala level-nya.
      this.turret.setScale(this.turretScale * (1 - 0.14 * (this.recoil / RECOIL_MS)));
    }

    const target = this.pickTarget(combat.getEnemies());
    if (!target) return;

    this.turret.setRotation(Math.atan2(target.y - this.y, target.x - this.x));
    if (this.cooldown > 0) return;

    this.cooldown = 1000 / this.stats.fireRate;
    this.recoil = RECOIL_MS;
    this.fire(combat, target);
  }

  private fire(combat: Combat, target: Enemy): void {
    switch (this.def.projectile) {
      case 'bullet':
        combat.spawnBullet(this, target);
        break;
      case 'shell':
        combat.spawnShell(this, target);
        break;
      case 'beam':
        combat.fireBeam(this, target);
        break;
      case 'chain':
        combat.fireChain(this, target);
        break;
    }
  }

  private pickTarget(enemies: readonly Enemy[]): Enemy | null {
    const rangeSq = this.stats.range * this.stats.range;
    let best: Enemy | null = null;
    let bestScore = 0;

    for (const e of enemies) {
      if (!e.isAlive) continue;
      if (e.def.flying && !this.def.canHitAir) continue;

      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > rangeSq) continue;

      let score: number;
      switch (this.targetMode) {
        case 'first':
          score = e.progress;
          break;
        case 'last':
          score = -e.progress;
          break;
        case 'strong':
          score = e.hp;
          break;
        case 'close':
          score = -distSq;
          break;
      }

      if (best === null || score > bestScore) {
        best = e;
        bestScore = score;
      }
    }
    return best;
  }

  private refreshVisual(): void {
    // Level divisualkan lewat ukuran turret + opasitas ring.
    this.turretScale = 1 + this.level * 0.16;
    this.turret.setScale(this.turretScale);
    this.ring.setAlpha(0.45 + this.level * 0.22);
  }
}
