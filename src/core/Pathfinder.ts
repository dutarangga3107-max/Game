import type { Grid } from './Grid';
import type { Point, TileCoord } from '../types';

/**
 * BFS 4-arah dari spawn ke base melewati tile walkable.
 * Jalur peta berupa koridor selebar satu tile, jadi hasilnya jalur terpendek
 * sekaligus satu-satunya rute yang masuk akal.
 */
export function findGroundPath(grid: Grid): TileCoord[] {
  const { spawn, base } = grid;
  const key = (c: number, r: number) => r * 1000 + c;
  const prev = new Map<number, number>();
  const seen = new Set<number>([key(spawn.col, spawn.row)]);
  const queue: TileCoord[] = [spawn];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    if (cur.col === base.col && cur.row === base.row) break;
    for (const [dc, dr] of dirs) {
      const c = cur.col + dc;
      const r = cur.row + dr;
      if (!grid.isWalkable(c, r)) continue;
      const k = key(c, r);
      if (seen.has(k)) continue;
      seen.add(k);
      prev.set(k, key(cur.col, cur.row));
      queue.push({ col: c, row: r });
    }
  }

  const goal = key(base.col, base.row);
  if (!seen.has(goal)) throw new Error('Tidak ada jalur dari spawn ke base');

  const path: TileCoord[] = [];
  let k: number | undefined = goal;
  while (k !== undefined) {
    path.push({ col: k % 1000, row: Math.floor(k / 1000) });
    k = prev.get(k);
  }
  return path.reverse();
}

export function tilesToWorld(grid: Grid, tiles: TileCoord[]): Point[] {
  return tiles.map((t) => grid.tileToWorld(t.col, t.row));
}

export function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}
