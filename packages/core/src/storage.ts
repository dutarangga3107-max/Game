/**
 * Pembungkus localStorage yang tidak pernah melempar error.
 *
 * Storage bisa gagal diakses di private mode, kalau site data diblokir, atau
 * saat halaman dirender di dalam iframe dengan izin terbatas. Game tidak boleh
 * ikut mati gara-gara itu, jadi kegagalan diperlakukan sebagai "tidak ada data".
 */

export function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/**
 * @returns false kalau penyimpanan ditolak (kuota penuh, storage diblokir,
 * atau localStorage memang tidak ada). Optional chaining saja tidak cukup di
 * sini: `storage?.setItem()` diam-diam jadi no-op dan akan melaporkan sukses
 * padahal tidak ada yang tersimpan.
 */
export function writeStorage(key: string, value: string): boolean {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string): boolean {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Baca angka dari storage, dengan fallback untuk nilai rusak atau tidak ada. */
export function readNumber(key: string, fallback = 0): number {
  const raw = readStorage(key);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
