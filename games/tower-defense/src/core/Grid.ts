import { COLS, ROWS, TILE } from '../config/constants';
import type { Point, TileCoord } from '../types';

export type CellType = 'ground' | 'path' | 'spawn' | 'base' | 'blocked';

const CHAR_MAP: Record<string, CellType> = {
  '.': 'ground',
  '#': 'path',
  S: 'spawn',
  B: 'base',
  x: 'blocked',
};

export class Grid {
  readonly cells: CellType[][];
  readonly spawn: TileCoord;
  readonly base: TileCoord;
  private readonly occupied: boolean[][];

  constructor(layout: string[]) {
    if (layout.length !== ROWS) {
      throw new Error(`Layout harus ${ROWS} baris, dapat ${layout.length}`);
    }

    this.cells = [];
    this.occupied = [];
    let spawn: TileCoord | null = null;
    let base: TileCoord | null = null;

    for (let row = 0; row < ROWS; row++) {
      const line = layout[row];
      if (line.length !== COLS) {
        throw new Error(`Baris ${row} harus ${COLS} karakter, dapat ${line.length}`);
      }
      const cellRow: CellType[] = [];
      const occRow: boolean[] = [];
      for (let col = 0; col < COLS; col++) {
        const type = CHAR_MAP[line[col]];
        if (!type) throw new Error(`Karakter layout tidak dikenal "${line[col]}" di (${col},${row})`);
        if (type === 'spawn') spawn = { col, row };
        if (type === 'base') base = { col, row };
        cellRow.push(type);
        occRow.push(false);
      }
      this.cells.push(cellRow);
      this.occupied.push(occRow);
    }

    if (!spawn) throw new Error("Layout tidak punya titik spawn 'S'");
    if (!base) throw new Error("Layout tidak punya base 'B'");
    this.spawn = spawn;
    this.base = base;
  }

  inBounds(col: number, row: number): boolean {
    return col >= 0 && col < COLS && row >= 0 && row < ROWS;
  }

  typeAt(col: number, row: number): CellType | null {
    return this.inBounds(col, row) ? this.cells[row][col] : null;
  }

  /** Tile yang bisa dilalui musuh darat. */
  isWalkable(col: number, row: number): boolean {
    const t = this.typeAt(col, row);
    return t === 'path' || t === 'spawn' || t === 'base';
  }

  isBuildable(col: number, row: number): boolean {
    return this.typeAt(col, row) === 'ground' && !this.occupied[row][col];
  }

  setOccupied(col: number, row: number, value: boolean): void {
    if (this.inBounds(col, row)) this.occupied[row][col] = value;
  }

  tileToWorld(col: number, row: number): Point {
    return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
  }

  worldToTile(x: number, y: number): TileCoord {
    return { col: Math.floor(x / TILE), row: Math.floor(y / TILE) };
  }
}
