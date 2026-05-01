/**
 * Prisma Client Setup
 * ES Module version
 * Follows: Singleton pattern, Type safety
 */

import { PrismaClient } from '@prisma/client';
import config from './index.js';
import { createChildLogger } from '../utils/logger.js';

const prismaLogger = createChildLogger('prisma');

// Singleton instance
let prisma: PrismaClient | null = null;

/**
 * Get or create Prisma client instance
 * @returns {PrismaClient}
 */
export function getPrismaClient(): PrismaClient {
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
      prismaLogger.error(`Prisma error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
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
export async function connect(): Promise<boolean> {
  const prisma = getPrismaClient();

  try {
    await prisma.$connect();
    createChildLogger('app').info('Database connection established');
    return true;
  } catch (error) {
    createChildLogger('app').error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Disconnect from database
 */
export async function disconnect(): Promise<void> {
  const prisma = getPrismaClient();

  try {
    await prisma.$disconnect();
    createChildLogger('app').info('Database connection closed');
  } catch (error) {
    createChildLogger('app').error(`Error closing database connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Health check for database
 */
export async function healthCheck(): Promise<{ status: string; database: string; error?: string }> {
  const prisma = getPrismaClient();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', database: 'connected' };
  } catch (error) {
    createChildLogger('app').error(`Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { status: 'unhealthy', database: 'disconnected', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export default getPrismaClient;
