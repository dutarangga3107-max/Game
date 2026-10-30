import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createScoreStore } from '../scores';
import { readNumber, readStorage, writeStorage } from '../storage';

function installStorage(impl?: Partial<Storage>): void {
  const data = new Map<string, string>();
  const base: Partial<Storage> = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  vi.stubGlobal('localStorage', { ...base, ...impl });
}

describe('storage', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('mengembalikan null, bukan melempar, saat storage diblokir', () => {
    installStorage({
      getItem: () => {
        throw new Error('storage dinonaktifkan');
      },
    });
    expect(readStorage('apa pun')).toBeNull();
  });

  it('mengembalikan false saat penulisan ditolak', () => {
    installStorage({
      setItem: () => {
        throw new Error('kuota penuh');
      },
    });
    expect(writeStorage('k', 'v')).toBe(false);
  });

  it('tetap jalan walau localStorage tidak ada sama sekali', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readStorage('k')).toBeNull();
    expect(writeStorage('k', 'v')).toBe(false);
    expect(readNumber('k', 7)).toBe(7);
  });

  it('memakai fallback untuk nilai yang rusak', () => {
    installStorage();
    writeStorage('k', 'bukan-angka');
    expect(readNumber('k', 3)).toBe(3);
  });
});

describe('createScoreStore', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installStorage();
  });

  it('mulai dari 0 saat belum ada rekor', () => {
    expect(createScoreStore('td').best('wave')).toBe(0);
  });

  it('hanya menyimpan nilai yang lebih tinggi', () => {
    const store = createScoreStore('td');
    expect(store.submit('wave', 5)).toBe(5);
    expect(store.submit('wave', 3)).toBe(5);
    expect(store.submit('wave', 9)).toBe(9);
    expect(store.best('wave')).toBe(9);
  });

  it('memisahkan rekor antar game dan antar metrik', () => {
    const td = createScoreStore('tower-defense');
    const tts = createScoreStore('crossword');

    td.submit('wave', 12);
    tts.submit('wave', 4);
    td.submit('skor', 999);

    expect(td.best('wave')).toBe(12);
    expect(tts.best('wave')).toBe(4);
    expect(td.best('skor')).toBe(999);
  });

  it('tidak mati walau rekor gagal disimpan', () => {
    installStorage({
      setItem: () => {
        throw new Error('ditolak');
      },
    });
    const store = createScoreStore('td');
    expect(store.submit('wave', 5)).toBe(5);
    expect(store.best('wave')).toBe(0);
  });
});
