import Phaser from 'phaser';

/** Bus event global untuk komunikasi antara GameScene dan HudScene. */
export const EventBus = new Phaser.Events.EventEmitter();

export const Ev = {
  // GameScene -> HUD
  GoldChanged: 'gold-changed',
  LivesChanged: 'lives-changed',
  WaveChanged: 'wave-changed',
  WaveStatus: 'wave-status',
  TowerSelected: 'tower-selected',
  BuildMode: 'build-mode',
  SpeedChanged: 'speed-changed',
  PauseChanged: 'pause-changed',
  GameOver: 'game-over',

  // HUD -> GameScene
  HudReady: 'hud-ready',
  ReqBuild: 'req-build',
  ReqUpgrade: 'req-upgrade',
  ReqSell: 'req-sell',
  ReqTargetMode: 'req-target-mode',
  ReqStartWave: 'req-start-wave',
  ReqSpeed: 'req-speed',
  ReqTogglePause: 'req-toggle-pause',
  ReqRestart: 'req-restart',
  ReqMenu: 'req-menu',
} as const;

export interface WaveStatusPayload {
  /** 'break' = jeda antar wave, 'spawning' = musuh keluar, 'clearing' = tinggal bersihkan. */
  phase: 'break' | 'spawning' | 'clearing';
  breakRemainingMs: number;
  enemiesAlive: number;
}

export interface GameOverPayload {
  victory: boolean;
  wave: number;
  totalWaves: number;
  bestWave: number;
}
