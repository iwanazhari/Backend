/**
 * Vitest Configuration
 * 
 * Vitest is 100% compatible with ES Modules and PASETO
 * Unlike Jest, it uses Vite's native ESM support
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**/*.test.ts'], // E2E tests run separately
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/types/**'],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  esbuild: {
    target: 'node20',
  },
});
