import { EARLY_CALL_GOLD_PER_SEC, FIRST_WAVE_DELAY_MS, HP_SCALE_PER_WAVE, WAVE_BREAK_MS } from '../config/constants';
import type { WaveDef } from '../config/level';
import type { EnemyKind } from '../types';

type Phase = 'break' | 'spawning' | 'clearing';

/** Batas pergantian fase per tick, jaring pengaman dari loop tak berujung. */
const MAX_PHASE_STEPS = 8;

interface SpawnEvent {
  at: number;
  kind: EnemyKind;
}

export interface WaveCallbacks {
  spawn(kind: EnemyKind, hpScale: number): void;
  onWaveStart(wave: number): void;
  onWaveCleared(wave: number, reward: number): void;
  onAllWavesCleared(): void;
}

/**
 * Mesin state wave: jeda -> spawn -> bersihkan -> jeda.
 * Semua timing pakai dt yang sudah diskalakan game speed, jadi tombol 2x/3x
 * mempercepat spawn juga, bukan cuma gerak musuh.
 */
export class WaveManager {
  private phase: Phase = 'break';
  private breakTimer = FIRST_WAVE_DELAY_MS;
  private waveIndex = -1;
  private clock = 0;
  private queue: SpawnEvent[] = [];
  private cursor = 0;
  private finished = false;

  constructor(
    private readonly waves: WaveDef[],
    private readonly cb: WaveCallbacks,
  ) {}

  get totalWaves(): number {
    return this.waves.length;
  }

  /** Nomor wave untuk ditampilkan (1-based). 0 artinya belum mulai. */
  get currentWave(): number {
    return this.waveIndex + 1;
  }

  get currentPhase(): Phase {
    return this.phase;
  }

  get breakRemainingMs(): number {
    return this.phase === 'break' ? Math.max(0, this.breakTimer) : 0;
  }

  get canCallEarly(): boolean {
    return this.phase === 'break' && !this.finished;
  }

  /** Mulai wave berikutnya lebih cepat; mengembalikan bonus gold. */
  callEarly(): number {
    if (!this.canCallEarly) return 0;
    const bonus = Math.floor(this.breakTimer / 1000) * EARLY_CALL_GOLD_PER_SEC;
    this.startNextWave();
    return bonus;
  }

  /**
   * Sisa waktu dibawa melewati pergantian fase. Kalau tidak, satu tick panjang
   * (frame berat atau speed 3x) akan menelan kelebihan waktunya di tiap
   * transisi dan jadwal spawn ikut melar.
   */
  update(dt: number, enemiesAlive: number): void {
    if (this.finished) return;

    let remaining = dt;
    let guard = 0;

    while (remaining > 0 && !this.finished && guard++ < MAX_PHASE_STEPS) {
      switch (this.phase) {
        case 'break': {
          const used = Math.min(remaining, this.breakTimer);
          this.breakTimer -= used;
          remaining -= used;
          if (this.breakTimer <= 0) this.startNextWave();
          else remaining = 0;
          break;
        }

        case 'spawning': {
          this.clock += remaining;
          remaining = 0;
          this.drain();
          break;
        }

        case 'clearing': {
          if (enemiesAlive === 0) this.completeWave();
          else remaining = 0;
          break;
        }
      }
    }
  }

  /** Keluarkan semua unit yang jadwalnya sudah lewat. */
  private drain(): void {
    while (this.cursor < this.queue.length && this.queue[this.cursor].at <= this.clock) {
      const ev = this.queue[this.cursor++];
      this.cb.spawn(ev.kind, this.hpScale);
    }
    if (this.cursor >= this.queue.length) this.phase = 'clearing';
  }

  private get hpScale(): number {
    return 1 + HP_SCALE_PER_WAVE * this.waveIndex;
  }

  private startNextWave(): void {
    this.waveIndex++;
    const wave = this.waves[this.waveIndex];
    this.queue = [];
    this.cursor = 0;
    this.clock = 0;

    for (const group of wave.groups) {
      for (let i = 0; i < group.count; i++) {
        this.queue.push({ at: group.delay + i * group.spacing, kind: group.kind });
      }
    }
    this.queue.sort((a, b) => a.at - b.at);

    this.phase = 'spawning';
    this.cb.onWaveStart(this.currentWave);
    // Unit berjadwal t=0 keluar seketika, bukan menunggu frame berikutnya.
    this.drain();
  }

  private completeWave(): void {
    const wave = this.waves[this.waveIndex];
    this.cb.onWaveCleared(this.currentWave, wave.reward);

    if (this.waveIndex >= this.waves.length - 1) {
      this.finished = true;
      this.cb.onAllWavesCleared();
      return;
    }
    this.phase = 'break';
    this.breakTimer = WAVE_BREAK_MS;
  }
}
