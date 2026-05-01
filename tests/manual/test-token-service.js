#!/usr/bin/env node
/**
 * Comprehensive TokenService Test Suite
 * Tests the actual TokenService implementation with JOSE
 * Run with: tsx tests/manual/test-token-service.js
 */

// Mock Prisma BEFORE importing anything
global.mockPrismaData = {
  refreshTokens: [],
  securityAudits: [],
};

const mockPrisma = {
  refreshToken: {
    create: async (data) => {
      const record = { id: `mock-${Date.now()}`, ...data.data };
      global.mockPrismaData.refreshTokens.push(record);
      return record;
    },
    findUnique: async ({ where }) => {
      return global.mockPrismaData.refreshTokens.find(t => t.token === where.token);
    },
    update: async ({ where, data }) => {
      const record = global.mockPrismaData.refreshTokens.find(t => t.id === where.id);
      if (record) {
        Object.assign(record, data.data);
        return record;
      }
      return null;
    },
  },
  securityAudit: {
    create: async (data) => {
      const record = { id: `audit-${Date.now()}`, ...data.data };
      global.mockPrismaData.securityAudits.push(record);
      return record;
    },
  },
};

// Override module loading
import module from 'module';
const originalRequire = module.prototype.require;
module.prototype.require = function(id) {
  if (id.includes('prisma')) {
    return { getPrismaClient: () => mockPrisma };
  }
  return originalRequire.apply(this, arguments);
};

// Now import TokenService
import TokenService from '../../src/services/TokenService.js';
import { UnauthorizedError } from '../../src/errors/index.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
};

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
    if (error.stack) {
      console.log(`  ${colors.yellow}Stack:${colors.reset} ${error.stack.split('\n')[1]}`);
    }
    failed++;
  }
}

async function runTests() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  TokenService - Comprehensive Test Suite${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  const testUserId = 'test-user-123';
  const testEmail = 'test@example.com';
  const testRole = 'USER';

  // Clear cache before tests
  TokenService.clearKeyCache();

  console.log(`${colors.yellow}Running TokenService Tests...${colors.reset}\n`);

  // ===== GENERATION TESTS =====
  console.log(`${colors.blue}Token Generation Tests:${colors.reset}`);

  await test('should generate token pair', async () => {
    const result = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    
    if (!result) throw new Error('Result should be defined');
    if (!result.accessToken) throw new Error('Access token should be defined');
    if (!result.refreshToken) throw new Error('Refresh token should be defined');
    if (result.expiresIn !== 900) throw new Error('Expiration should be 900 seconds');
    if (result.tokenType !== 'Bearer') throw new Error('Token type should be Bearer');
    if (!result.accessToken.startsWith('eyJ')) throw new Error('Should be JWT format');
  });

  await test('should generate unique tokens', async () => {
    const result1 = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    const result2 = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    
    if (result1.accessToken === result2.accessToken) {
      throw new Error('Access tokens should be different');
    }
    if (result1.refreshToken === result2.refreshToken) {
      throw new Error('Refresh tokens should be different');
    }
  });

  await test('should save refresh token to mock database', async () => {
    const result = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    
    const savedToken = global.mockPrismaData.refreshTokens.find(t => t.token === result.refreshToken);
    if (!savedToken) {
      throw new Error('Refresh token should be saved to database');
    }
    if (savedToken.userId !== testUserId) {
      throw new Error('User ID should match');
    }
  });

  // ===== VERIFICATION TESTS =====
  console.log(`\n${colors.blue}Token Verification Tests:${colors.reset}`);

  await test('should verify valid token', async () => {
    const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    const verified = await TokenService.verifyToken(tokens.accessToken, 'access');
    
    if (!verified) throw new Error('Verified result should be defined');
    if (!verified.payload) throw new Error('Payload should be defined');
    if (verified.payload.id !== testUserId) throw new Error('User ID should match');
    if (verified.payload.email !== testEmail) throw new Error('Email should match');
  });

  await test('should extract user from token', async () => {
    const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    const user = await TokenService.extractUser(tokens.accessToken);
    
    if (user.id !== testUserId) throw new Error('User ID should match');
    if (user.email !== testEmail) throw new Error('Email should match');
    if (user.role !== testRole) throw new Error('Role should match');
    if (!user.jti) throw new Error('JTI should be defined');
  });

  await test('should reject invalid token', async () => {
    try {
      await TokenService.verifyToken('invalid-token', 'access');
      throw new Error('Should have thrown UnauthorizedError');
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        throw new Error('Should throw UnauthorizedError');
      }
    }
  });

  await test('should reject wrong token type', async () => {
    const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    
    try {
      await TokenService.verifyToken(tokens.accessToken, 'refresh');
      throw new Error('Should have thrown UnauthorizedError');
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        throw new Error('Should throw UnauthorizedError');
      }
      if (error.code !== 'INVALID_TOKEN_TYPE') {
        throw new Error('Should be INVALID_TOKEN_TYPE error');
      }
    }
  });

  // ===== EXPIRATION TESTS =====
  console.log(`\n${colors.blue}Token Expiration Tests:${colors.reset}`);

  await test('should return expiration date', async () => {
    const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    const expiration = TokenService.getTokenExpiration(tokens.accessToken);
    
    if (!(expiration instanceof Date)) {
      throw new Error('Should return Date object');
    }
    if (expiration.getTime() <= Date.now()) {
      throw new Error('Expiration should be in future');
    }
  });

  await test('should return null for invalid token', () => {
    const expiration = TokenService.getTokenExpiration('invalid');
    if (expiration !== null) {
      throw new Error('Should return null for invalid token');
    }
  });

  // ===== KEY MANAGEMENT TESTS =====
  console.log(`\n${colors.blue}Key Management Tests:${colors.reset}`);

  await test('should cache keys', async () => {
    const { PasetoKeyManager } = await import('../../src/services/TokenService.js');
    const manager = PasetoKeyManager.getInstance();
    
    const key1 = await manager.getKey('test-cache');
    const key2 = await manager.getKey('test-cache');
    
    if (key1 !== key2) {
      throw new Error('Should return cached key');
    }
  });

  await test('should generate different keys for different names', async () => {
    const { PasetoKeyManager } = await import('../../src/services/TokenService.js');
    const manager = PasetoKeyManager.getInstance();
    
    const key1 = await manager.getKey('test-key-1');
    const key2 = await manager.getKey('test-key-2');
    
    if (key1 === key2) {
      throw new Error('Should generate different keys');
    }
  });

  await test('should clear cache', async () => {
    const { PasetoKeyManager } = await import('../../src/services/TokenService.js');
    const manager = PasetoKeyManager.getInstance();
    
    await manager.getKey('test-clear');
    manager.clearKeyCache();
    const newKey = await manager.getKey('test-clear');
    
    if (!newKey) {
      throw new Error('Should generate new key after clearing cache');
    }
  });

  // ===== SECURITY TESTS =====
  console.log(`\n${colors.blue}Security Tests:${colors.reset}`);

  await test('should have JWT format (signed, not encrypted)', async () => {
    const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    const parts = tokens.accessToken.split('.');
    
    if (parts.length !== 3) {
      throw new Error('JWT should have 3 parts');
    }
    
    // JWT payload is base64url encoded (not encrypted like PASETO)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (!payload.id || !payload.email) {
      throw new Error('Payload should contain user data');
    }
  });

  await test('should include all required claims', async () => {
    const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    const parts = tokens.accessToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    
    const requiredClaims = ['id', 'email', 'role', 'type', 'jti', 'iat', 'exp'];
    for (const claim of requiredClaims) {
      if (!(claim in payload)) {
        throw new Error(`Missing required claim: ${claim}`);
      }
    }
  });

  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Test Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total:  ${passed + failed}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (failed > 0) {
    console.log(`${colors.red}❌ Tests FAILED${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ All tests PASSED!${colors.reset}`);
    console.log(`${colors.green}TokenService is working perfectly!${colors.reset}`);
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  console.error(error.stack);
  process.exit(1);
});
