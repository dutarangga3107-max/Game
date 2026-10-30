import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relatif, supaya bundle yang sama jalan di GitHub Pages, itch.io, maupun
  // di dalam WebView Capacitor (yang memuat dari file:// atau https://localhost).
  base: './',
  resolve: {
    alias: {
      '@game/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
    },
  },
  server: { port: 5173, open: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
});
