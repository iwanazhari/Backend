/**
 * Prisma Test Utilities
 * Helper functions for integration and E2E tests with Prisma
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Test database Prisma client
let testPrisma: PrismaClient | null = null;

/**
 * Get or create test Prisma client
 */
export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  return testPrisma;
}

/**
 * Close test Prisma connection
 */
export async function closeTestPrisma(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}

/**
 * Truncate all tables in test database
 * Uses raw SQL for PostgreSQL
 */
export async function truncateAllTables(prisma?: PrismaClient): Promise<void> {
  const db = prisma || getTestPrisma();
  
  // Get all tables (excluding Prisma migrations table)
  const tables = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename != '_prisma_migrations'
    ORDER BY tablename;
  `;

  // Truncate each table
  for (const table of tables) {
    await db.$executeRawUnsafe(`TRUNCATE TABLE "${table.tablename}" CASCADE;`);
  }
}

/**
 * Seed database with test user
 */
export interface SeedUserOptions {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: 'USER' | 'ADMIN' | 'MODERATOR';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BANNED';
}

export interface SeedUserResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: string;
  status: string;
}

export async function seedUser(
  options: SeedUserOptions = {},
  prisma?: PrismaClient
): Promise<SeedUserResult> {
  const db = prisma || getTestPrisma();
  
  const email = options.email || `test_${uuidv4()}@example.com`;
  const password = options.password || 'Test123!';
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: options.firstName || 'Test',
      lastName: options.lastName || 'User',
      role: options.role || 'USER',
      status: options.status || 'ACTIVE',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
    },
  });

  return user;
}

/**
 * Create refresh token for testing
 */
export async function seedRefreshToken(
  userId: string,
  token?: string,
  prisma?: PrismaClient
): Promise<any> {
  const db = prisma || getTestPrisma();
  
  const refreshToken = token || uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return db.refreshToken.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt,
    },
  });
}

/**
 * Create security audit log for testing
 */
export async function seedSecurityAudit(
  eventType: string,
  userId: string | null,
  ipAddress: string,
  metadata?: Record<string, any>,
  prisma?: PrismaClient
): Promise<any> {
  const db = prisma || getTestPrisma();
  
  return db.securityAudit.create({
    data: {
      eventType,
      eventLevel: 'INFO',
      userId,
      ipAddress,
      metadata: metadata || {},
    },
  });
}

/**
 * Generate unique email for testing
 */
export function generateUniqueEmail(): string {
  return `test_${uuidv4()}@example.com`;
}

/**
 * Generate unique string for testing
 */
export function generateUniqueString(prefix = 'test'): string {
  return `${prefix}_${uuidv4()}`;
}

/**
 * Wait for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test credentials helper
 */
export const TEST_CREDENTIALS = {
  VALID_EMAIL: 'valid@example.com',
  VALID_PASSWORD: 'Test123!',
  WEAK_PASSWORD: 'weak',
  INVALID_EMAIL: 'not-an-email',
};
