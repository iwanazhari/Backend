/**
 * Database Connection Setup
 * Follows: Connection pooling best practices from DDIA
 * Principles: Resource management, Fail-fast
 */

const { Sequelize } = require('sequelize');
const config = require('../config');
const logger = require('../utils/logger').createChildLogger('database');

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: config.database.dialect,
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.user,
  password: config.database.password,
  logging: (msg) => logger.debug(msg),
  pool: config.database.pool,
  define: {
    // Automatically added fields
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    // Soft deletes
    paranoid: true,
    // Naming conventions
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  },
  // Retry logic for connection failures
  retry: {
    max: 3,
    timeout: 3000,
  },
});

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Unable to connect to database:', error.message);
    throw error;
  }
}

/**
 * Sync database models
 * @param {boolean} force - Force sync (drops tables)
 */
async function syncModels(force = false) {
  try {
    await sequelize.sync({ force, alter: !force });
    logger.info('Database models synchronized');
  } catch (error) {
    logger.error('Failed to sync database models:', error.message);
    throw error;
  }
}

/**
 * Close database connection
 */
async function closeConnection() {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error.message);
  }
}

// Event listeners for connection lifecycle
sequelize.addHook('beforeConnect', (config) => {
  logger.debug('Connecting to database...', {
    host: config.host,
    database: config.database,
  });
});

sequelize.addHook('afterConnect', () => {
  logger.debug('Database connection established');
});

module.exports = {
  sequelize,
  testConnection,
  syncModels,
  closeConnection,
  Sequelize,
};
