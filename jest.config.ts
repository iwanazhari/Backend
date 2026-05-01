import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/', 'src/index.ts'],
  testMatch: ['**/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['./tests/setup.ts'],
  verbose: true,
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

export default config;
