/**
 * Database Connection Setup
 * Using Prisma as the primary ORM
 */

import { getPrismaClient } from './prisma.js';
import { createChildLogger } from '../utils/logger.js';

const dbLogger = createChildLogger('database');

// Export prisma client as sequelize for backwards compatibility
export const sequelize = getPrismaClient();

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const prisma = getPrismaClient();
    await prisma.$connect();
    dbLogger.info('Database connection established successfully');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    dbLogger.error(`Unable to connect to database: ${message}`);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeConnection(): Promise<void> {
  try {
    const prisma = getPrismaClient();
    await prisma.$disconnect();
    dbLogger.info('Database connection closed');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    dbLogger.error(`Error closing database connection: ${message}`);
  }
}
