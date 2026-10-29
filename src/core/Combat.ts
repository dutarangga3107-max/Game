import type { Enemy } from '../entities/Enemy';
import type { Tower } from '../entities/Tower';

/**
 * Kontrak yang dipakai Tower untuk menembak tanpa tahu detail GameScene.
 * Semua perhitungan damage & gold tetap terpusat di GameScene.
 */
export interface Combat {
  getEnemies(): readonly Enemy[];
  spawnBullet(tower: Tower, target: Enemy): void;
  spawnShell(tower: Tower, target: Enemy): void;
  fireBeam(tower: Tower, target: Enemy): void;
  fireChain(tower: Tower, target: Enemy): void;
}
