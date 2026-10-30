import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Satu runner untuk seluruh workspace; tiap paket menaruh test di src/**/__tests__.
    include: ['{games,packages}/*/src/**/*.test.ts'],
  },
});
