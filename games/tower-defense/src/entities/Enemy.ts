import Phaser from 'phaser';
import { COLORS, DEPTH } from '../config/constants';
import { ENEMIES, type EnemyDef } from '../config/enemies';
import type { EnemyKind, Point } from '../types';

let nextSpawnId = 1;

export class Enemy extends Phaser.GameObjects.Image {
  def: EnemyDef = ENEMIES.grunt;
  /**
   * Naik tiap kali objek ini dipakai ulang dari pool. Projectile menyimpan id
   * ini supaya tidak salah mengejar musuh baru yang kebetulan menempati slot
   * objek lama.
   */
  spawnId = 0;
  hp = 1;
  maxHp = 1;
  /** Jarak tempuh total (pixel) — dipakai untuk penargetan first/last. */
  progress = 0;
  isAlive = false;
  reachedBase = false;

  private path: Point[] = [];
  private pathIndex = 0;
  private slowRemaining = 0;
  private slowFactor = 1;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 'enemy-grunt');
    scene.add.existing(this);
    this.setDepth(DEPTH.enemy);
    this.setActive(false).setVisible(false);
  }

  spawn(kind: EnemyKind, path: Point[], hpScale: number): void {
    const def = ENEMIES[kind];
    this.def = def;
    this.spawnId = nextSpawnId++;
    this.path = path;
    this.pathIndex = 1;
    this.progress = 0;
    this.maxHp = Math.round(def.hp * hpScale);
    this.hp = this.maxHp;
    this.slowRemaining = 0;
    this.slowFactor = 1;
    this.isAlive = true;
    this.reachedBase = false;

    const start = path[0];
    this.setTexture(def.texture);
    this.setPosition(start.x, start.y);
    this.setScale(def.scale);
    this.setTint(def.tint);
    this.setRotation(0);
    this.setActive(true).setVisible(true);
  }

  get isSlowed(): boolean {
    return this.slowRemaining > 0;
  }

  applySlow(factor: number, durationMs: number): void {
    // Efek paling kuat yang menang; durasi di-refresh.
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowRemaining = Math.max(this.slowRemaining, durationMs);
    this.setTint(COLORS.frost);
  }

  /** Mengembalikan damage yang benar-benar masuk setelah armor. */
  takeDamage(amount: number): number {
    const dealt = Math.max(1, amount - this.def.armor);
    this.hp -= dealt;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
    }
    return dealt;
  }

  tick(dt: number): void {
    if (!this.isAlive) return;

    if (this.slowRemaining > 0) {
      this.slowRemaining -= dt;
      if (this.slowRemaining <= 0) {
        this.slowRemaining = 0;
        this.slowFactor = 1;
        this.setTint(this.def.tint);
      }
    }

    let remaining = (this.def.speed * this.slowFactor * dt) / 1000;

    while (remaining > 0 && this.pathIndex < this.path.length) {
      const wp = this.path[this.pathIndex];
      const dx = wp.x - this.x;
      const dy = wp.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= 1e-4) {
        this.pathIndex++;
        continue;
      }
      this.setRotation(Math.atan2(dy, dx));

      if (dist <= remaining) {
        this.setPosition(wp.x, wp.y);
        this.progress += dist;
        remaining -= dist;
        this.pathIndex++;
      } else {
        this.setPosition(this.x + (dx / dist) * remaining, this.y + (dy / dist) * remaining);
        this.progress += remaining;
        remaining = 0;
      }
    }

    if (this.pathIndex >= this.path.length) {
      this.reachedBase = true;
      this.isAlive = false;
    }
  }

  recycle(): void {
    this.isAlive = false;
    this.setActive(false).setVisible(false);
  }
}
