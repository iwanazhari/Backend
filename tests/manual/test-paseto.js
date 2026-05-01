#!/usr/bin/env node
/**
 * Manual Test Suite - JOSE Token Service
 * 
 * This test suite runs outside Jest/Vitest
 * Run with: tsx tests/manual/test-paseto.js
 */

// Mock Prisma to avoid database dependency
const mockPrisma = {
  refreshToken: {
    create: async (data) => {
      console.log('  [Mock] Saving refresh token to DB...');
      return { id: 'mock-id', ...data.data };
    },
  },
  securityAudit: {
    create: async () => {},
  },
};

// Override getPrismaClient
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const modulePath = join(dirname(fileURLToPath(import.meta.url)), '../../src/config/prisma.js');

// Mock before importing TokenService
import module from 'module';
const originalRequire = module.prototype.require;
module.prototype.require = function(id) {
  if (id.includes('prisma')) {
    return { getPrismaClient: () => mockPrisma };
  }
  return originalRequire.apply(this, arguments);
};

import TokenService from '../../src/services/TokenService.js';
import { UnauthorizedError } from '../../src/errors/index.js';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTests() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  PASETO V2 Token Service - Manual Test Suite${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  const testUserId = 'test-user-123';
  const testEmail = 'test@example.com';
  const testRole = 'USER';

  // Clear cache before tests
  TokenService.clearKeyCache();

  console.log(`${colors.yellow}Running TokenService Tests...${colors.reset}\n`);

  // Test 1: Generate Token Pair
  await asyncTest('should generate token pair', async () => {
    const result = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    
    assert(result, 'Result should be defined');
    assert(result.accessToken, 'Access token should be defined');
    assert(result.refreshToken, 'Refresh token should be defined');
    assert(result.expiresIn === 900, 'Expiration should be 900 seconds');
    assert(result.tokenType === 'Bearer', 'Token type should be Bearer');
    assert(result.accessToken.startsWith('v2.local.'), 'Should be PASETO V2 format');
  });

  // Test 2: Generate Unique Tokens
  await asyncTest('should generate unique tokens', async () => {
    const result1 = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    const result2 = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    
    assert(result1.accessToken !== result2.accessToken, 'Access tokens should be different');
    assert(result1.refreshToken !== result2.refreshToken, 'Refresh tokens should be different');
  });

  // Test 3: Verify Valid Token
  await asyncTest('should verify valid token', async () => {
    const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    const verified = await TokenService.verifyToken(tokens.accessToken, 'access');
    
    assert(verified, 'Verified result should be defined');
    assert(verified.payload, 'Payload should be defined');
    assert(verified.payload.id === testUserId, 'User ID should match');
    assert(verified.payload.email === testEmail, 'Email should match');
  });

  // Test 4: Extract User from Token
  await asyncTest('should extract user from token', async () => {
    const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    const user = await TokenService.extractUser(tokens.accessToken);
    
    assert(user.id === testUserId, 'User ID should match');
    assert(user.email === testEmail, 'Email should match');
    assert(user.role === testRole, 'Role should match');
    assert(user.jti, 'JTI should be defined');
  });

  // Test 5: Reject Invalid Token
  await asyncTest('should reject invalid token', async () => {
    try {
      await TokenService.verifyToken('invalid-token', 'access');
      throw new Error('Should have thrown UnauthorizedError');
    } catch (error) {
      assert(error instanceof UnauthorizedError, 'Should throw UnauthorizedError');
    }
  });

  // Test 6: Reject Wrong Token Type
  await asyncTest('should reject wrong token type', async () => {
    const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    
    try {
      await TokenService.verifyToken(tokens.accessToken, 'refresh');
      throw new Error('Should have thrown UnauthorizedError');
    } catch (error) {
      assert(error instanceof UnauthorizedError, 'Should throw UnauthorizedError');
      assert(error.code === 'INVALID_TOKEN_TYPE', 'Should be INVALID_TOKEN_TYPE error');
    }
  });

  // Test 7: Get Token Expiration
  await asyncTest('should return expiration date', async () => {
    const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    const expiration = TokenService.getTokenExpiration(tokens.accessToken);
    
    assert(expiration instanceof Date, 'Should return Date object');
    assert(expiration.getTime() > Date.now(), 'Expiration should be in future');
  });

  // Test 8: Return Null for Invalid Token
  test('should return null for invalid token', () => {
    const expiration = TokenService.getTokenExpiration('invalid');
    assert(expiration === null, 'Should return null for invalid token');
  });

  // Test 9: Key Caching
  await asyncTest('should cache keys', async () => {
    const { PasetoKeyManager } = await import('../../src/services/TokenService.js');
    const manager = PasetoKeyManager.getInstance();
    
    const key1 = await manager.getKey('test-cache');
    const key2 = await manager.getKey('test-cache');
    
    assert(key1 === key2, 'Should return cached key');
  });

  // Test 10: Different Keys for Different Names
  await asyncTest('should generate different keys for different names', async () => {
    const { PasetoKeyManager } = await import('../../src/services/TokenService.js');
    const manager = PasetoKeyManager.getInstance();
    
    const key1 = await manager.getKey('test-key-1');
    const key2 = await manager.getKey('test-key-2');
    
    assert(key1 !== key2, 'Should generate different keys');
  });

  // Test 11: Clear Cache
  await asyncTest('should clear cache', async () => {
    const { PasetoKeyManager } = await import('../../src/services/TokenService.js');
    const manager = PasetoKeyManager.getInstance();
    
    await manager.getKey('test-clear');
    manager.clearKeyCache();
    const newKey = await manager.getKey('test-clear');
    
    assert(newKey, 'Should generate new key after clearing cache');
  });

  // Test 12: Encrypt Payload (Not Human-Readable)
  await asyncTest('should encrypt payload', async () => {
    const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
    const parts = tokens.accessToken.split('.');
    const payloadPart = parts[2];
    const decoded = Buffer.from(payloadPart, 'base64').toString('utf8');
    
    // Encrypted payload should not contain plain text
    assert(!decoded.includes(testEmail), 'Should not contain plain email');
    assert(!decoded.includes(testUserId), 'Should not contain plain user ID');
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
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
