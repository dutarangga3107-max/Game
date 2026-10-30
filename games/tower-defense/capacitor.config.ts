import type { CapacitorConfig } from '@capacitor/cli';

/**
 * appId dan appName sengaja sejalan dengan field "game" di package.json.
 * Folder android/ tidak di-commit — CI menjalankan `cap add android` setiap
 * build, jadi proyek native selalu bersih dan tidak pernah basi.
 */
const config: CapacitorConfig = {
  appId: 'io.github.dutarangga.towerdefense',
  appName: 'Tower Defense',
  webDir: 'dist',
  android: {
    // Game menggambar sendiri seluruh layar; biarkan WebView gelap agar tidak
    // ada kedipan putih saat start.
    backgroundColor: '#0b0f14',
  },
};

export default config;
