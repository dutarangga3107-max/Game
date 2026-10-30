export type TowerKind = 'arrow' | 'cannon' | 'frost' | 'tesla';
export type EnemyKind = 'grunt' | 'runner' | 'tank' | 'flyer' | 'boss';

/** Prioritas penargetan sebuah tower. */
export type TargetMode = 'first' | 'last' | 'strong' | 'close';

export const TARGET_MODES: readonly TargetMode[] = ['first', 'last', 'strong', 'close'];

export const TARGET_MODE_LABEL: Record<TargetMode, string> = {
  first: 'Terdepan',
  last: 'Terbelakang',
  strong: 'Terkuat',
  close: 'Terdekat',
};

export interface Point {
  x: number;
  y: number;
}

export interface TileCoord {
  col: number;
  row: number;
}

/** Snapshot tower terpilih yang dikirim GameScene ke HUD. */
export interface TowerInfo {
  kind: TowerKind;
  name: string;
  level: number;
  maxLevel: number;
  damage: number;
  range: number;
  fireRate: number;
  canUpgrade: boolean;
  upgradeCost: number;
  sellValue: number;
  targetMode: TargetMode;
  canHitAir: boolean;
}
