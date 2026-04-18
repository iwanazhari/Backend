/**
 * Require Check - Fail Fast
 * Ensures all required dependencies are available before starting
 * Follows: Fail-fast principle from Pragmatic Programmer
 */

const logger = require('./utils/logger');

const requiredModules = [
  'express',
  'sequelize',
  'pg',
  'bcryptjs',
  'jsonwebtoken',
  'winston',
  'redis',
];

const missingModules = [];

requiredModules.forEach((module) => {
  try {
    require.resolve(module);
  } catch (error) {
    missingModules.push(module);
  }
});

if (missingModules.length > 0) {
  logger.error(
    `Missing required dependencies: ${missingModules.join(', ')}. ` +
      'Please run: npm install'
  );
  process.exit(1);
}

logger.debug('All required dependencies are available');
