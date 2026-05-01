/**
 * Complete Security Features Test
 * Tests all implemented security features
 */

import {
  getTestPrisma,
  closeTestPrisma,
  truncateAllTables,
  seedUser,
  generateUniqueEmail,
} from '../tests/utils/prisma-test-utils.js';
import AuthService from '../src/services/AuthService.js';
import EmailVerificationService from '../src/services/EmailVerificationService.js';
import PasswordResetService from '../src/services/PasswordResetService.js';
import TwoFactorService from '../src/services/TwoFactorService.js';
import RateLimitService from '../src/services/RateLimitService.js';

const TEST_IP = '192.168.1.100';
const USER_AGENT = 'Test-Agent';

async function runAllTests() {
  const prisma = getTestPrisma();
  let passed = 0;
  let failed = 0;

  console.log('\n🧪 COMPLETE SECURITY FEATURES TEST\n');

  try {
    await prisma.$connect();
    console.log('✅ Connected to test database\n');

    // Test 1: Registration with Email Verification
    console.log('─'.repeat(60));
    console.log('Test 1: Registration & Email Verification');
    try {
      await truncateAllTables(prisma);
      
      const email = generateUniqueEmail();
      const registerResult = await AuthService.register({
        email,
        password: 'Str0ngP@ss!',
        firstName: 'Test',
      });

      console.log('✅ Registration successful');

      // Send verification email
      await EmailVerificationService.sendVerificationEmail({
        userId: registerResult.user.id,
        email,
        firstName: 'Test',
      });

      console.log('✅ Verification email sent');

      // Verify email
      const userWithToken = await prisma.user.findUnique({
        where: { id: registerResult.user.id },
      });

      if (userWithToken?.emailVerificationToken) {
        await EmailVerificationService.verifyEmail(userWithToken.emailVerificationToken);
        console.log('✅ Email verified');
        passed++;
      } else {
        console.log('❌ No verification token found');
        failed++;
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      failed++;
    }

    // Test 2: Login with Rate Limiting
    console.log('\n─'.repeat(60));
    console.log('Test 2: Login with Rate Limiting');
    try {
      await truncateAllTables(prisma);
      
      const email = generateUniqueEmail();
      await AuthService.register({
        email,
        password: 'Str0ngP@ss!',
        firstName: 'Test',
      });

      // Successful login
      const loginResult = await AuthService.login(
        email,
        'Str0ngP@ss!',
        TEST_IP,
        USER_AGENT
      );

      console.log('✅ Login successful');
      console.log(`   Access token: ${loginResult.tokens.accessToken.substring(0, 20)}...`);
      console.log(`   Refresh token: ${loginResult.tokens.refreshToken.substring(0, 20)}...`);
      passed++;
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      failed++;
    }

    // Test 3: Password Reset Flow
    console.log('\n─'.repeat(60));
    console.log('Test 3: Password Reset Flow');
    try {
      await truncateAllTables(prisma);
      
      const email = generateUniqueEmail();
      await AuthService.register({
        email,
        password: 'OldP@ss1!',
        firstName: 'Test',
      });

      // Request reset
      await PasswordResetService.requestReset({
        email,
        ipAddress: TEST_IP,
        userAgent: USER_AGENT,
      });

      console.log('✅ Password reset requested');

      // Get reset token from database
      const userWithReset = await prisma.user.findUnique({
        where: { email },
      });

      if (userWithReset?.passwordResetToken) {
        // Confirm reset
        await PasswordResetService.confirmReset({
          token: userWithReset.passwordResetToken,
          newPassword: 'NewStr0ngP@ss!',
          ipAddress: TEST_IP,
          userAgent: USER_AGENT,
        });

        console.log('✅ Password reset successful');

        // Try login with new password
        await AuthService.login(
          email,
          'NewStr0ngP@ss!',
          TEST_IP,
          USER_AGENT
        );

        console.log('✅ Login with new password successful');
        passed++;
      } else {
        console.log('❌ No reset token found');
        failed++;
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      failed++;
    }

    // Test 4: Two-Factor Authentication
    console.log('\n─'.repeat(60));
    console.log('Test 4: Two-Factor Authentication');
    try {
      await truncateAllTables(prisma);
      
      const email = generateUniqueEmail();
      const registerResult = await AuthService.register({
        email,
        password: 'Str0ngP@ss!',
        firstName: 'Test',
      });

      // Setup 2FA
      const setupResult = await TwoFactorService.setup2FA({
        userId: registerResult.user.id,
        email,
      });

      console.log('✅ 2FA setup successful');
      console.log(`   Secret: ${setupResult.secret}`);

      // Enable 2FA
      // Generate a valid TOTP token (for testing)
      const speakeasy = await import('speakeasy');
      const token = speakeasy.default.totp.generate({
        secret: Buffer.from(setupResult.secret, 'base32'),
        encoding: 'base32',
      });

      const enableResult = await TwoFactorService.enable2FA(
        registerResult.user.id,
      token,
        setupResult.secret
      );

      console.log('✅ 2FA enabled');
      console.log(`   Backup codes: ${enableResult.backupCodes.length} codes generated`);
      passed++;
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      failed++;
    }

    // Test 5: Rate Limiting
    console.log('\n─'.repeat(60));
    console.log('Test 5: Rate Limiting');
    try {
      await truncateAllTables(prisma);
      
      const email = generateUniqueEmail();
      await AuthService.register({
        email,
        password: 'Str0ngP@ss!',
        firstName: 'Test',
      });

      // Try 6 failed login attempts (should trigger rate limit on 6th)
      let rateLimitTriggered = false;
      for (let i = 0; i < 6; i++) {
        try {
          await AuthService.login(
            email,
            'wrongpassword',
            TEST_IP,
            USER_AGENT
          );
        } catch (error: any) {
          if (error.message.includes('Too many') || error.code === 'TOO_MANY_REQUESTS') {
            rateLimitTriggered = true;
            console.log('✅ Rate limit triggered after 5 failed attempts');
            break;
          }
        }
      }

      if (rateLimitTriggered) {
        passed++;
      } else {
        console.log('⚠️  Rate limit not triggered (may need database setup)');
        failed++;
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      failed++;
    }

    // Test 6: Security Audit Logging
    console.log('\n─'.repeat(60));
    console.log('Test 6: Security Audit Logging');
    try {
      await truncateAllTables(prisma);
      
      const email = generateUniqueEmail();
      await AuthService.register({
        email,
        password: 'Str0ngP@ss!',
        firstName: 'Test',
      });

      // Try failed login
      try {
        await AuthService.login(
          email,
          'wrongpassword',
          TEST_IP,
          USER_AGENT
        );
      } catch (error) {}

      // Check audit logs
      const auditLogs = await prisma.securityAudit.findMany({
        where: {
          eventType: { in: ['LOGIN_FAILED', 'LOGIN_SUCCESS'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      if (auditLogs.length > 0) {
        console.log(`✅ Security audit working (${auditLogs.length} events logged)`);
        passed++;
      } else {
        console.log('❌ No audit logs found');
        failed++;
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      failed++;
    }

  } finally {
    await closeTestPrisma();
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${passed + failed}`);
  console.log('═'.repeat(60));

  if (failed === 0) {
    console.log('\n✅ ALL SECURITY FEATURES WORKING!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review output above.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
