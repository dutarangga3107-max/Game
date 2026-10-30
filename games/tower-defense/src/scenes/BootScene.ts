import Phaser from 'phaser';
import { COLORS, TILE } from '../config/constants';

/**
 * Semua grafis digambar procedural lalu dijadikan texture, jadi repo tidak
 * perlu menyimpan aset biner dan game tetap satu bundle kecil.
 * Bentuk musuh & turret digambar putih supaya bisa diwarnai lewat setTint().
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    this.makeTiles();
    this.makeTowerParts();
    this.makeEnemies();
    this.makeProjectiles();
    this.scene.start('menu');
  }

  private withGraphics(key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeTiles(): void {
    const tile = (key: string, fill: number, stroke: number) =>
      this.withGraphics(key, TILE, TILE, (g) => {
        g.fillStyle(fill, 1);
        g.fillRect(0, 0, TILE, TILE);
        g.lineStyle(1, stroke, 1);
        g.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
      });

    tile('tile-ground', COLORS.ground, COLORS.gridLine);
    tile('tile-ground-alt', COLORS.groundAlt, COLORS.gridLine);
    tile('tile-path', COLORS.path, COLORS.pathEdge);

    // Pixel putih 1x1 untuk partikel dan bar.
    this.withGraphics('px', 1, 1, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 1, 1);
    });
  }

  private makeTowerParts(): void {
    const size = 44;
    const c = size / 2;

    this.withGraphics('tower-base', size, size, (g) => {
      g.fillStyle(0x2b3a4a, 1);
      g.fillCircle(c, c, 19);
      g.fillStyle(0x36485b, 1);
      g.fillCircle(c, c, 15);
      g.lineStyle(2, 0x1a2430, 1);
      g.strokeCircle(c, c, 19);
    });

    this.withGraphics('tower-ring', size, size, (g) => {
      g.lineStyle(2, 0xffffff, 1);
      g.strokeCircle(c, c, 12);
    });

    // Turret selalu digambar menghadap kanan (rotasi 0).
    this.withGraphics('turret-arrow', 34, 14, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRect(14, 5, 18, 4);
      g.fillCircle(12, 7, 6);
    });

    this.withGraphics('turret-cannon', 34, 18, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRect(14, 5, 19, 8);
      g.fillCircle(12, 9, 8);
    });

    this.withGraphics('turret-frost', 32, 20, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(11, 10, 7);
      g.fillTriangle(16, 4, 31, 10, 16, 16);
    });

    this.withGraphics('turret-tesla', 30, 22, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(10, 11, 7);
      g.fillRect(16, 2, 3, 18);
      g.fillRect(22, 5, 3, 12);
    });
  }

  private makeEnemies(): void {
    this.withGraphics('enemy-grunt', 26, 26, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(13, 13, 11);
      g.fillStyle(0x000000, 0.25);
      g.fillCircle(13, 13, 5);
    });

    this.withGraphics('enemy-runner', 26, 22, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(25, 11, 2, 2, 2, 20);
      g.fillStyle(0x000000, 0.22);
      g.fillTriangle(16, 11, 6, 6, 6, 16);
    });

    this.withGraphics('enemy-tank', 30, 26, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(2, 3, 26, 20, 5);
      g.fillStyle(0x000000, 0.28);
      g.fillRoundedRect(8, 8, 14, 10, 3);
    });

    this.withGraphics('enemy-flyer', 34, 24, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(33, 12, 12, 4, 12, 20);
      g.fillTriangle(14, 12, 1, 1, 1, 10);
      g.fillTriangle(14, 12, 1, 14, 1, 23);
    });

    this.withGraphics('enemy-boss', 46, 46, (g) => {
      const hex: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        hex.push(new Phaser.Geom.Point(23 + Math.cos(a) * 21, 23 + Math.sin(a) * 21));
      }
      g.fillStyle(0xffffff, 1);
      g.fillPoints(hex, true);
      g.fillStyle(0x000000, 0.3);
      g.fillCircle(23, 23, 10);
    });
  }

  private makeProjectiles(): void {
    this.withGraphics('bullet', 10, 10, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(5, 5, 4);
    });

    this.withGraphics('shell', 14, 14, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(7, 7, 6);
      g.fillStyle(0x000000, 0.25);
      g.fillCircle(7, 7, 3);
    });
  }
}
