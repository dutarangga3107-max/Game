export const TILE = 48;
export const COLS = 21;
export const ROWS = 15;

export const PLAYFIELD_W = COLS * TILE;
export const PLAYFIELD_H = ROWS * TILE;
export const SIDEBAR_W = 272;

export const GAME_W = PLAYFIELD_W + SIDEBAR_W;
export const GAME_H = PLAYFIELD_H;

export const START_GOLD = 260;
export const START_LIVES = 20;

/** Porsi total investasi yang dikembalikan saat tower dijual. */
export const SELL_REFUND = 0.7;

export const FIRST_WAVE_DELAY_MS = 8_000;
export const WAVE_BREAK_MS = 14_000;
export const EARLY_CALL_GOLD_PER_SEC = 2;

/** Pertambahan HP musuh per wave (wave 1 = 1.0x). */
export const HP_SCALE_PER_WAVE = 0.085;

export const SPEEDS = [1, 2, 3] as const;

export const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export const COLORS = {
  bg: 0x0b0f14,
  ground: 0x18212c,
  groundAlt: 0x1c2733,
  gridLine: 0x253140,
  path: 0x463f2f,
  pathEdge: 0x5a5140,
  spawn: 0xe85d5d,
  base: 0x55c8f0,
  buildOk: 0x4ade80,
  buildBad: 0xf87171,
  sidebar: 0x111821,
  panel: 0x16202b,
  panelHover: 0x1e2b39,
  line: 0x24303f,
  text: 0xe6edf3,
  textDim: 0x8899a6,
  gold: 0xf2c14e,
  heart: 0xff6b81,
  hpBack: 0x2a1515,
  hpFill: 0x5bd977,
  hpFillLow: 0xe85d5d,
  range: 0x9bd2ff,
  arrow: 0x9ad1ff,
  cannon: 0xf2a65a,
  frost: 0x7fe3ff,
  tesla: 0xc792ea,
} as const;

export const DEPTH = {
  ground: 0,
  decor: 1,
  ghost: 5,
  tower: 10,
  enemy: 15,
  hpBar: 20,
  projectile: 25,
  fx: 30,
  floatText: 40,
} as const;
