/**
 * Require Check - Fail Fast
 * Ensures all required dependencies are available before starting
 * Follows: Fail-fast principle from Pragmatic Programmer
 */

import logger from './logger.js';

const requiredModules = [
  'express',
  'pg',
  'bcryptjs',
  'jsonwebtoken',
  'winston',
  'redis',
];

const missingModules: string[] = [];

// Use import() instead of require.resolve() for ESM compatibility
await Promise.all(
  requiredModules.map(async (module) => {
    try {
      await import(module);
    } catch (error) {
      missingModules.push(module);
    }
  })
);

if (missingModules.length > 0) {
  logger.error(
    `Missing required dependencies: ${missingModules.join(', ')}. ` +
      'Please run: npm install'
  );
  process.exit(1);
}

logger.debug('All required dependencies are available');
