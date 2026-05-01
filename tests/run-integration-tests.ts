/**
 * Integration Test Runner - Manual
 * Run tests without Jest for now
 * 
 * Usage: npx tsx tests/run-integration-tests.ts
 */

import {
  getTestPrisma,
  closeTestPrisma,
  truncateAllTables,
  seedUser,
  generateUniqueEmail,
  TEST_CREDENTIALS,
} from '../tests/utils/prisma-test-utils.js';
import AuthService from '../src/services/AuthService.js';
import SecurityAuditService from '../src/services/SecurityAuditService.js';

const mockSecurityContext = {
  ipAddress: '192.168.1.100',
  userAgent: 'Manual-Test-Agent',
  path: '/api/auth',
  method: 'POST',
};

async function runTests() {
  console.log('\n🧪 Starting Integration Tests...\n');
  
  const prisma = getTestPrisma();
  let passed = 0;
  let failed = 0;

  try {
    await prisma.$connect();
    console.log('✅ Connected to test database\n');

    // Test 1: Register
    console.log('Test 1: Register user...');
    try {
      await truncateAllTables(prisma);
      const userData = {
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
        firstName: 'Integration',
        lastName: 'Test',
      };

      const result = await AuthService.register(userData);
      
      if (result.user && result.tokens && result.tokens.accessToken) {
        console.log('✅ PASSED: Register user\n');
        passed++;
      } else {
        console.log('❌ FAILED: Register user - Missing data\n');
        failed++;
      }
    } catch (error: any) {
      console.log(`❌ FAILED: Register user - ${error.message}\n`);
      failed++;
    }

    // Test 2: Login
    console.log('Test 2: Login user...');
    try {
      await truncateAllTables(prisma);
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      });

      const result = await AuthService.login(
        user.email,
        TEST_CREDENTIALS.VALID_PASSWORD,
        mockSecurityContext.ipAddress,
        mockSecurityContext.userAgent
      );

      if (result.user && result.tokens && result.tokens.accessToken) {
        console.log('✅ PASSED: Login user\n');
        passed++;
      } else {
        console.log('❌ FAILED: Login user - Missing data\n');
        failed++;
      }
    } catch (error: any) {
      console.log(`❌ FAILED: Login user - ${error.message}\n`);
      failed++;
    }

    // Test 3: Refresh Token
    console.log('Test 3: Refresh token...');
    try {
      await truncateAllTables(prisma);
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      });

      const loginResult = await AuthService.login(
        user.email,
        TEST_CREDENTIALS.VALID_PASSWORD,
        mockSecurityContext.ipAddress,
        mockSecurityContext.userAgent
      );

      const refreshResult = await AuthService.refreshTokens(
        loginResult.tokens.refreshToken,
        mockSecurityContext.ipAddress
      );

      if (refreshResult.tokens && refreshResult.tokens.accessToken !== loginResult.tokens.accessToken) {
        console.log('✅ PASSED: Refresh token\n');
        passed++;
      } else {
        console.log('❌ FAILED: Refresh token - Token not refreshed\n');
        failed++;
      }
    } catch (error: any) {
      console.log(`❌ FAILED: Refresh token - ${error.message}\n`);
      failed++;
    }

    // Test 4: Security Audit
    console.log('Test 4: Security audit logging...');
    try {
      await truncateAllTables(prisma);
      const user = await seedUser();

      await SecurityAuditService.audit({
        eventType: 'TEST_EVENT',
        userId: user.id,
        ipAddress: '192.168.1.1',
        metadata: { test: true },
      });

      const auditLogs = await prisma.securityAudit.findMany({
        where: { eventType: 'TEST_EVENT' },
      });

      if (auditLogs.length > 0) {
        console.log('✅ PASSED: Security audit logging\n');
        passed++;
      } else {
        console.log('❌ FAILED: Security audit logging - No logs found\n');
        failed++;
      }
    } catch (error: any) {
      console.log(`❌ FAILED: Security audit logging - ${error.message}\n`);
      failed++;
    }

    // Test 5: Suspicious Activity Detection
    console.log('Test 5: Suspicious activity detection...');
    try {
      await truncateAllTables(prisma);
      const user = await seedUser();

      // Simulate login from different IP
      await SecurityAuditService.audit({
        eventType: 'LOGIN_SUCCESS',
        userId: user.id,
        ipAddress: '10.0.0.1',
        metadata: {},
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await SecurityAuditService.detectSuspiciousActivity(
        user.id,
        '192.168.1.100'
      );

      if (result.isSuspicious && result.reason === 'IMPOSSIBLE_TRAVEL') {
        console.log('✅ PASSED: Suspicious activity detection\n');
        passed++;
      } else {
        console.log('❌ FAILED: Suspicious activity detection - Not detected\n');
        failed++;
      }
    } catch (error: any) {
      console.log(`❌ FAILED: Suspicious activity detection - ${error.message}\n`);
      failed++;
    }

  } finally {
    await closeTestPrisma();
  }

  // Summary
  console.log('─'.repeat(50));
  console.log(`\n📊 Test Summary:`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${passed + failed}\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('✅ All integration tests passed!\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
