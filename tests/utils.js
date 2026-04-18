/**
 * Test Utilities
 * Common utilities for testing
 */

const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../src/models');

/**
 * Generate unique email for testing
 */
function generateUniqueEmail() {
  return `test_${uuidv4()}@example.com`;
}

/**
 * Generate unique string
 */
function generateUniqueString(prefix = 'test') {
  return `${prefix}_${uuidv4()}`;
}

/**
 * Truncate all tables (for testing)
 */
async function truncateAll() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  
  // Disable foreign key checks
  await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  
  // Truncate each table
  for (const table of tables) {
    const tableName = table.tableName || table;
    await queryInterface.dropTable(tableName);
  }
  
  // Enable foreign key checks
  await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
}

/**
 * Seed database with test data
 */
async function seedDatabase(data = {}) {
  const testData = {};
  
  // Example: Create test user
  if (data.createUser !== false) {
    const User = require('../src/models/User');
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
  if (data.createAdmin) {
    const User = require('../src/models/User');
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

/**
 * Generate JWT token for testing
 */
function generateTestToken(payload = {}) {
  const jwt = require('jsonwebtoken');
  const config = require('../src/config');
  
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
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  generateUniqueEmail,
  generateUniqueString,
  truncateAll,
  seedDatabase,
  generateTestToken,
  sleep,
};
