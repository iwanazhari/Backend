/**
 * Prisma Client Setup
 * ES Module version
 * Follows: Singleton pattern, Type safety
 */

import { PrismaClient } from '@prisma/client';
import config from './index.js';
import logger from '../utils/logger.js';

const prismaLogger = logger.createChildLogger('prisma');

// Singleton instance
let prisma = null;

/**
 * Get or create Prisma client instance
 * @returns {PrismaClient}
 */
export function getPrismaClient() {
  if (prisma) {
    return prisma;
  }

  prisma = new PrismaClient({
    // Logging configuration
    log: config.app.env === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
    
    // Error handling
    errorFormat: 'pretty',
  });

  // Setup query logging middleware
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    
    prismaLogger.debug(`Query ${params.model}.${params.action} took ${after - before}ms`);
    
    return result;
  });

  // Setup error handling middleware
  prisma.$use(async (params, next) => {
    try {
      return await next(params);
    } catch (error) {
      prismaLogger.error(`Prisma error: ${error.message}`, {
        model: params.model,
        action: params.action,
      });
      throw error;
    }
  });

  prismaLogger.info('Prisma client initialized');
  return prisma;
}

/**
 * Connect to database
 */
export async function connect() {
  const prisma = getPrismaClient();
  
  try {
    await prisma.$connect();
    logger.info('Database connection established');
    return true;
  } catch (error) {
    logger.error('Failed to connect to database:', error.message);
    throw error;
  }
}

/**
 * Disconnect from database
 */
export async function disconnect() {
  const prisma = getPrismaClient();
  
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error.message);
  }
}

/**
 * Health check for database
 */
export async function healthCheck() {
  const prisma = getPrismaClient();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', database: 'connected' };
  } catch (error) {
    logger.error('Database health check failed:', error.message);
    return { status: 'unhealthy', database: 'disconnected', error: error.message };
  }
}

export default getPrismaClient;
