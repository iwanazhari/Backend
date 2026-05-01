/**
 * Test Utilities
 * Common utilities for testing
 */

import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { sequelize } from '../src/models/index.js';
import config from '../src/config/index.js';

/**
 * Generate unique email for testing
 */
export function generateUniqueEmail(): string {
  return `test_${uuidv4()}@example.com`;
}

/**
 * Generate unique string
 */
export function generateUniqueString(prefix = 'test'): string {
  return `${prefix}_${uuidv4()}`;
}

/**
 * Truncate all tables (for testing)
 */
export async function truncateAll(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();

  // Disable foreign key checks
  await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

  // Truncate each table
  for (const table of tables) {
    const tableName = (table as any).tableName || table;
    await queryInterface.dropTable(tableName);
  }

  // Enable foreign key checks
  await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
}

interface SeedDatabaseOptions {
  createUser?: boolean;
  createAdmin?: boolean;
}

interface SeedDatabaseResult {
  user?: any;
  admin?: any;
}

/**
 * Seed database with test data
 */
export async function seedDatabase(options: SeedDatabaseOptions = {}): Promise<SeedDatabaseResult> {
  const testData: SeedDatabaseResult = {};

  // Example: Create test user
  if (options.createUser !== false) {
    const User = (await import('../src/models/User.js')).default;
    testData.user = await User.create({
      email: generateUniqueEmail(),
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      status: 'active',
    });
  }

  // Example: Create test admin
  if (options.createAdmin) {
    const User = (await import('../src/models/User.js')).default;
    testData.admin = await User.create({
      email: generateUniqueEmail(),
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin',
      status: 'active',
    });
  }

  return testData;
}

interface TestTokenPayload {
  id?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

/**
 * Generate JWT token for testing
 */
export function generateTestToken(payload: TestTokenPayload = {}): string {
  return jwt.sign(
    {
      id: payload.id || uuidv4(),
      email: payload.email || 'test@example.com',
      role: payload.role || 'user',
      ...payload,
    },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
}

/**
 * Wait for a specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
