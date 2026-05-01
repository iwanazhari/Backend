/**
 * Integration Tests Setup
 * 
 * Mock Prisma and external services for integration testing
 */

import { MockEmailProvider, MockSMSProvider, MockCacheProvider, MockLogger } from '../utils/test-utils.js';

// Mock Prisma Client
const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  magicLink: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  otpRequest: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  oauthAccount: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  securityAudit: {
    create: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

jest.mock('../../../src/config/prisma.js', () => ({
  getPrismaClient: () => mockPrismaClient,
}));

// Export mock providers for use in tests
export {
  mockPrismaClient,
  MockEmailProvider,
  MockSMSProvider,
  MockCacheProvider,
  MockLogger,
};
