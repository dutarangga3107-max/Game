import Phaser from 'phaser';
import { DEPTH } from '../config/constants';
import type { Enemy } from './Enemy';

export type ProjectileKind = 'bullet' | 'shell';

export class Projectile extends Phaser.GameObjects.Image {
  kind: ProjectileKind = 'bullet';
  damage = 0;
  splash = 0;
  speed = 0;
  pierceLeft = 0;
  live = false;

  /** Target kejaran untuk 'bullet'. */
  target: Enemy | null = null;
  /** spawnId target saat peluru ditembakkan; dipakai memvalidasi target pool. */
  targetId = 0;
  /** Titik tujuan untuk 'shell' (dan arah lanjutan bullet setelah menembus). */
  tx = 0;
  ty = 0;
  vx = 0;
  vy = 0;
  /** Musuh yang sudah kena peluru ini, supaya pierce tidak mengenai dua kali. */
  readonly hitAlready = new Set<Enemy>();
  /** Umur maksimum sebagai jaring pengaman kalau target hilang (ms). */
  ttl = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 'bullet');
    scene.add.existing(this);
    this.setDepth(DEPTH.projectile);
    this.setActive(false).setVisible(false);
  }

  launch(opts: {
    kind: ProjectileKind;
    x: number;
    y: number;
    damage: number;
    splash: number;
    speed: number;
    pierce: number;
    tint: number;
    target: Enemy | null;
    tx: number;
    ty: number;
  }): void {
    this.kind = opts.kind;
    this.damage = opts.damage;
    this.splash = opts.splash;
    this.speed = opts.speed;
    this.pierceLeft = opts.pierce;
    this.target = opts.target;
    this.targetId = opts.target?.spawnId ?? 0;
    this.tx = opts.tx;
    this.ty = opts.ty;
    this.hitAlready.clear();
    this.ttl = 3000;
    this.live = true;

    const dx = opts.tx - opts.x;
    const dy = opts.ty - opts.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.vx = (dx / dist) * opts.speed;
    this.vy = (dy / dist) * opts.speed;

    this.setTexture(opts.kind === 'shell' ? 'shell' : 'bullet');
    this.setTint(opts.tint);
    this.setPosition(opts.x, opts.y);
    this.setRotation(Math.atan2(dy, dx));
    this.setActive(true).setVisible(true);
  }

  recycle(): void {
    this.live = false;
    this.target = null;
    this.targetId = 0;
    this.hitAlready.clear();
    this.setActive(false).setVisible(false);
  }
}
