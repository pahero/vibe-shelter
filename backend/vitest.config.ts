import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    globalSetup: ['./src/test-utils/global-setup.ts'],
    testTimeout: 120_000,
    coverage: {
      include: ['src/**/*.{ts,js}'],
      reportsDirectory: '../coverage',
    },
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
