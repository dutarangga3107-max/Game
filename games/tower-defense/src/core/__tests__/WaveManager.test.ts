import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FIRST_WAVE_DELAY_MS, WAVE_BREAK_MS } from '../../config/constants';
import type { WaveDef } from '../../config/level';
import type { EnemyKind } from '../../types';
import { WaveManager } from '../WaveManager';

const WAVES: WaveDef[] = [
  { reward: 10, groups: [{ kind: 'grunt', count: 3, spacing: 100, delay: 0 }] },
  {
    reward: 20,
    groups: [
      { kind: 'runner', count: 2, spacing: 50, delay: 200 },
      { kind: 'tank', count: 1, spacing: 0, delay: 0 },
    ],
  },
];

function harness(waves: WaveDef[] = WAVES) {
  const spawned: EnemyKind[] = [];
  const cleared: Array<[number, number]> = [];
  const started: number[] = [];
  const onAllWavesCleared = vi.fn();

  const wm = new WaveManager(waves, {
    spawn: (kind) => spawned.push(kind),
    onWaveStart: (w) => started.push(w),
    onWaveCleared: (w, reward) => cleared.push([w, reward]),
    onAllWavesCleared,
  });
  return { wm, spawned, cleared, started, onAllWavesCleared };
}

describe('WaveManager', () => {
  let h: ReturnType<typeof harness>;

  beforeEach(() => {
    h = harness();
  });

  it('menunggu jeda awal sebelum wave pertama', () => {
    h.wm.update(FIRST_WAVE_DELAY_MS - 1, 0);
    expect(h.started).toHaveLength(0);
    expect(h.wm.currentWave).toBe(0);

    h.wm.update(2, 0);
    expect(h.started).toEqual([1]);
  });

  it('spawn sesuai jadwal grup, bukan sekaligus', () => {
    h.wm.update(FIRST_WAVE_DELAY_MS, 0);
    expect(h.spawned).toHaveLength(1); // unit pertama keluar di t=0

    h.wm.update(100, 1);
    expect(h.spawned).toHaveLength(2);

    h.wm.update(100, 2);
    expect(h.spawned).toHaveLength(3);
  });

  it('menunggu lapangan bersih sebelum memberi hadiah wave', () => {
    h.wm.update(FIRST_WAVE_DELAY_MS + 1000, 0);
    expect(h.wm.currentPhase).toBe('clearing');

    h.wm.update(16, 3); // masih ada musuh
    expect(h.cleared).toHaveLength(0);

    h.wm.update(16, 0);
    expect(h.cleared).toEqual([[1, 10]]);
    expect(h.wm.currentPhase).toBe('break');
  });

  it('menghormati delay grup di dalam satu wave', () => {
    h.wm.update(FIRST_WAVE_DELAY_MS + 1000, 0);
    h.wm.update(16, 0); // wave 1 selesai -> masuk jeda
    h.wm.update(WAVE_BREAK_MS, 0); // wave 2 mulai

    expect(h.spawned.slice(3)).toEqual(['tank']); // delay 0
    h.wm.update(200, 1);
    expect(h.spawned.slice(3)).toEqual(['tank', 'runner']);
  });

  it('memanggil wave lebih cepat dan memberi bonus sebanding sisa jeda', () => {
    h.wm.update(FIRST_WAVE_DELAY_MS + 1000, 0);
    h.wm.update(16, 0);
    expect(h.wm.canCallEarly).toBe(true);

    const remaining = h.wm.breakRemainingMs;
    const bonus = h.wm.callEarly();
    expect(bonus).toBe(Math.floor(remaining / 1000) * 2);
    expect(h.wm.currentWave).toBe(2);
    expect(h.wm.canCallEarly).toBe(false);
  });

  it('tidak bisa memanggil wave saat musuh masih keluar', () => {
    h.wm.update(FIRST_WAVE_DELAY_MS, 0);
    expect(h.wm.canCallEarly).toBe(false);
    expect(h.wm.callEarly()).toBe(0);
  });

  it('menaikkan HP musuh tiap wave', () => {
    const scales: number[] = [];
    const wm = new WaveManager(WAVES, {
      spawn: (_k, hpScale) => scales.push(hpScale),
      onWaveStart: () => {},
      onWaveCleared: () => {},
      onAllWavesCleared: () => {},
    });

    wm.update(FIRST_WAVE_DELAY_MS + 1000, 0);
    wm.update(16, 0);
    wm.update(WAVE_BREAK_MS + 1000, 0);

    expect(scales[0]).toBe(1);
    expect(scales[scales.length - 1]).toBeGreaterThan(1);
  });

  it('menandai selesai setelah wave terakhir dibersihkan', () => {
    h.wm.update(FIRST_WAVE_DELAY_MS + 1000, 0);
    h.wm.update(16, 0);
    h.wm.update(WAVE_BREAK_MS + 1000, 0);
    h.wm.update(16, 0);

    expect(h.onAllWavesCleared).toHaveBeenCalledTimes(1);

    // Setelah selesai, update berikutnya tidak memicu apa pun lagi.
    h.wm.update(100_000, 0);
    expect(h.onAllWavesCleared).toHaveBeenCalledTimes(1);
    expect(h.started).toEqual([1, 2]);
  });
});
