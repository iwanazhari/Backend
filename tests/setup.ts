/**
 * Test Setup
 * Configures test environment before running tests
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout (will be set by Jest)
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

// Mock console methods to reduce noise during tests (only in verbose mode)
if (typeof jest !== 'undefined' && process.env.VERBOSE_TESTS !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as Console;
}

// Global test utilities
(global as any).testData = {};

// Cleanup after each test
if (typeof afterEach !== 'undefined') {
  afterEach(async () => {
    (global as any).testData = {};
    if (typeof jest !== 'undefined') {
      jest.clearAllMocks();
    }
  });
}

// Truncate tables after all tests in a suite
if (typeof afterAll !== 'undefined') {
  afterAll(async () => {
    try {
      const { truncateAllTables, closeTestPrisma } = await import('./utils/prisma-test-utils.js');
      await truncateAllTables();
      await closeTestPrisma();
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    }
  });
}
