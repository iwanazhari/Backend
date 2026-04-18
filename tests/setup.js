/**
 * Test Setup
 * Configures test environment before running tests
 */

const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testData = {};

// Cleanup after each test
afterEach(() => {
  global.testData = {};
  jest.clearAllMocks();
});

// Close connections after all tests
afterAll(async () => {
  // Close any open connections
  const { sequelize } = require('../src/models');
  if (sequelize) {
    await sequelize.close();
  }
});
