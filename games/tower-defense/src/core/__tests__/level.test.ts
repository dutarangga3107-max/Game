import { describe, expect, it } from 'vitest';
import { COLS, ROWS, TILE } from '../../config/constants';
import { ENEMIES } from '../../config/enemies';
import { LEVEL } from '../../config/level';
import { TOWERS, TOWER_ORDER } from '../../config/towers';
import { Grid } from '../Grid';
import { findGroundPath, pathLength, tilesToWorld } from '../Pathfinder';

describe('layout peta', () => {
  it('punya dimensi yang pas', () => {
    expect(LEVEL.layout).toHaveLength(ROWS);
    for (const row of LEVEL.layout) expect(row).toHaveLength(COLS);
  });

  it('bisa diparsing dan punya tepat satu spawn & satu base', () => {
    const joined = LEVEL.layout.join('');
    expect([...joined].filter((c) => c === 'S')).toHaveLength(1);
    expect([...joined].filter((c) => c === 'B')).toHaveLength(1);
    expect(() => new Grid(LEVEL.layout)).not.toThrow();
  });

  it('menolak layout dengan baris yang panjangnya tidak seragam', () => {
    const broken = [...LEVEL.layout];
    broken[0] = broken[0].slice(0, -1);
    expect(() => new Grid(broken)).toThrow(/karakter/i);
  });

  it('menolak karakter yang tidak dikenal', () => {
    const broken = [...LEVEL.layout];
    broken[0] = 'Z'.padEnd(COLS, '.');
    expect(() => new Grid(broken)).toThrow(/tidak dikenal/i);
  });
});

describe('jalur darat', () => {
  const grid = new Grid(LEVEL.layout);
  const tiles = findGroundPath(grid);

  it('menyambung dari spawn ke base', () => {
    expect(tiles[0]).toEqual(grid.spawn);
    expect(tiles[tiles.length - 1]).toEqual(grid.base);
  });

  it('hanya bergerak satu tile ke arah ortogonal', () => {
    for (let i = 1; i < tiles.length; i++) {
      const step = Math.abs(tiles[i].col - tiles[i - 1].col) + Math.abs(tiles[i].row - tiles[i - 1].row);
      expect(step).toBe(1);
    }
  });

  it('seluruhnya melewati tile yang walkable', () => {
    for (const t of tiles) expect(grid.isWalkable(t.col, t.row)).toBe(true);
  });

  it('cukup panjang untuk memberi tower waktu menembak', () => {
    expect(pathLength(tilesToWorld(grid, tiles))).toBeGreaterThan(20 * TILE);
  });
});

describe('rute udara', () => {
  it('mulai di spawn dan berakhir di base', () => {
    const grid = new Grid(LEVEL.layout);
    const first = LEVEL.airRoute[0];
    const last = LEVEL.airRoute[LEVEL.airRoute.length - 1];
    expect(first).toEqual(grid.spawn);
    expect(last).toEqual(grid.base);
  });

  it('seluruh titiknya berada di dalam grid', () => {
    for (const p of LEVEL.airRoute) {
      expect(p.col).toBeGreaterThanOrEqual(0);
      expect(p.col).toBeLessThan(COLS);
      expect(p.row).toBeGreaterThanOrEqual(0);
      expect(p.row).toBeLessThan(ROWS);
    }
  });
});

describe('definisi wave', () => {
  it('tidak ada wave kosong dan semua jenis musuh valid', () => {
    for (const [i, wave] of LEVEL.waves.entries()) {
      expect(wave.groups.length, `wave ${i + 1}`).toBeGreaterThan(0);
      expect(wave.reward).toBeGreaterThan(0);
      for (const g of wave.groups) {
        expect(ENEMIES[g.kind]).toBeDefined();
        expect(g.count).toBeGreaterThan(0);
        expect(g.delay).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('memperkenalkan musuh udara hanya setelah pemain sempat menabung', () => {
    const firstAirWave = LEVEL.waves.findIndex((w) => w.groups.some((g) => ENEMIES[g.kind].flying));
    expect(firstAirWave).toBeGreaterThan(2);
  });
});

describe('definisi tower', () => {
  it('punya tepat 3 level dengan stat yang menaik', () => {
    for (const kind of TOWER_ORDER) {
      const def = TOWERS[kind];
      expect(def.levels, def.name).toHaveLength(3);
      for (let i = 1; i < def.levels.length; i++) {
        expect(def.levels[i].damage, `${def.name} lv${i + 1} damage`).toBeGreaterThan(def.levels[i - 1].damage);
        expect(def.levels[i].range, `${def.name} lv${i + 1} range`).toBeGreaterThanOrEqual(def.levels[i - 1].range);
      }
    }
  });

  it('menyediakan minimal satu tower anti-udara yang terjangkau di awal', () => {
    const antiAir = TOWER_ORDER.map((k) => TOWERS[k]).filter((d) => d.canHitAir);
    expect(antiAir.length).toBeGreaterThan(0);
    expect(Math.min(...antiAir.map((d) => d.levels[0].cost))).toBeLessThanOrEqual(100);
  });
});
