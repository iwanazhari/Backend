/**
 * AuthService Integration Tests
 * Tests with real database (Prisma)
 * 
 * Run: npm test -- tests/integration/AuthService.integration.test.ts
 */

import {
  getTestPrisma,
  closeTestPrisma,
  truncateAllTables,
  seedUser,
  seedRefreshToken,
  generateUniqueEmail,
  TEST_CREDENTIALS,
} from '../../tests/utils/prisma-test-utils.js';
import AuthService from '../../src/services/AuthService.js';
import SecurityAuditService from '../../src/services/SecurityAuditService.js';
import { BadRequestError, UnauthorizedError, ForbiddenError, ConflictError } from '../../src/errors/index.js';

const mockSecurityContext = {
  ipAddress: '192.168.1.100',
  userAgent: 'Jest-Test-Agent',
  path: '/api/auth',
  method: 'POST',
};

describe('AuthService - Integration Tests', () => {
  const prisma = getTestPrisma();

  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    await closeTestPrisma();
  });

  beforeEach(async () => {
    // Clean database before each test
    await truncateAllTables(prisma);
  });

  // ============================================
  // REGISTER INTEGRATION TESTS
  // ============================================

  describe('register()', () => {
    it('should register user successfully with valid data', async () => {
      const userData = {
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
        firstName: 'Integration',
        lastName: 'Test',
      };

      const result = await AuthService.register(userData);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.user.firstName).toBe(userData.firstName);
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const email = generateUniqueEmail();
      const userData = {
        email,
        password: TEST_CREDENTIALS.VALID_PASSWORD,
        firstName: 'Test',
      };

      // First registration - should succeed
      await AuthService.register(userData);

      // Second registration with same email - should fail
      await expect(AuthService.register(userData)).rejects.toThrow(ConflictError);
      await expect(AuthService.register(userData)).rejects.toThrow('EMAIL_EXISTS');
    });

    it('should reject invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: TEST_CREDENTIALS.VALID_PASSWORD,
        firstName: 'Test',
      };

      await expect(AuthService.register(userData)).rejects.toThrow(BadRequestError);
      await expect(AuthService.register(userData)).rejects.toThrow('INVALID_EMAIL');
    });

    it('should reject weak password', async () => {
      const userData = {
        email: generateUniqueEmail(),
        password: 'weak',
        firstName: 'Test',
      };

      await expect(AuthService.register(userData)).rejects.toThrow(BadRequestError);
      await expect(AuthService.register(userData)).rejects.toThrow('WEAK_PASSWORD');
    });

    it('should create security audit log on successful registration', async () => {
      const userData = {
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
        firstName: 'Test',
      };

      await AuthService.register(userData);

      const auditLogs = await prisma.securityAudit.findMany({
        where: { eventType: 'REGISTER_SUCCESS' },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].metadata).toBeDefined();
    });
  });

  // ============================================
  // LOGIN INTEGRATION TESTS
  // ============================================

  describe('login()', () => {
    it('should login successfully with valid credentials', async () => {
      // Create user first
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

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(user.id);
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const email = generateUniqueEmail();
      await seedUser({ email, password: TEST_CREDENTIALS.VALID_PASSWORD });

      await expect(
        AuthService.login(email, 'wrong-password', mockSecurityContext.ipAddress, mockSecurityContext.userAgent)
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        AuthService.login(email, 'wrong-password', mockSecurityContext.ipAddress, mockSecurityContext.userAgent)
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should reject non-existent user with generic error', async () => {
      await expect(
        AuthService.login(
          'nonexistent@example.com',
          'password',
          mockSecurityContext.ipAddress,
          mockSecurityContext.userAgent
        )
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        AuthService.login(
          'nonexistent@example.com',
          'password',
          mockSecurityContext.ipAddress,
          mockSecurityContext.userAgent
        )
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should reject inactive account', async () => {
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
        status: 'SUSPENDED',
      });

      await expect(
        AuthService.login(user.email, TEST_CREDENTIALS.VALID_PASSWORD, mockSecurityContext.ipAddress, mockSecurityContext.userAgent)
      ).rejects.toThrow(ForbiddenError);
      await expect(
        AuthService.login(user.email, TEST_CREDENTIALS.VALID_PASSWORD, mockSecurityContext.ipAddress, mockSecurityContext.userAgent)
      ).rejects.toThrow('ACCOUNT_INACTIVE');
    });

    it('should detect suspicious activity (impossible travel)', async () => {
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      });

      // Simulate recent login from different IP
      await SecurityAuditService.audit({
        eventType: 'LOGIN_SUCCESS',
        userId: user.id,
        ipAddress: '10.0.0.1', // Different IP
        metadata: { test: true },
      });

      // Wait a bit to ensure the login is within 5 minute window
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try login from different IP - should trigger suspicious activity
      await expect(
        AuthService.login(
          user.email,
          TEST_CREDENTIALS.VALID_PASSWORD,
          '192.168.1.100', // New IP
          mockSecurityContext.userAgent
        )
      ).rejects.toThrow(ForbiddenError);
      await expect(
        AuthService.login(
          user.email,
          TEST_CREDENTIALS.VALID_PASSWORD,
          '192.168.1.100',
          mockSecurityContext.userAgent
        )
      ).rejects.toThrow('SECURITY_ALERT');
    });

    it('should create audit log on successful login', async () => {
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      });

      await AuthService.login(
        user.email,
        TEST_CREDENTIALS.VALID_PASSWORD,
        mockSecurityContext.ipAddress,
        mockSecurityContext.userAgent
      );

      const auditLogs = await prisma.securityAudit.findMany({
        where: { eventType: 'LOGIN_SUCCESS', userId: user.id },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // REFRESH TOKEN INTEGRATION TESTS
  // ============================================

  describe('refreshTokens()', () => {
    it('should refresh token successfully', async () => {
      // Create user and get tokens
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

      // Refresh token
      const refreshResult = await AuthService.refreshTokens(
        loginResult.tokens.refreshToken,
        mockSecurityContext.ipAddress
      );

      expect(refreshResult.tokens).toBeDefined();
      expect(refreshResult.tokens.accessToken).toBeDefined();
      expect(refreshResult.tokens.refreshToken).toBeDefined();
      expect(refreshResult.tokens.refreshToken).not.toBe(loginResult.tokens.refreshToken); // New token
    });

    it('should revoke old refresh token after use (single-use)', async () => {
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

      // First refresh - should succeed
      await AuthService.refreshTokens(loginResult.tokens.refreshToken, mockSecurityContext.ipAddress);

      // Second refresh with same token - should fail (token already used)
      await expect(
        AuthService.refreshTokens(loginResult.tokens.refreshToken, mockSecurityContext.ipAddress)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should reject expired refresh token', async () => {
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      });

      // Create expired refresh token
      const expiredToken = await seedRefreshToken(
        user.id,
        undefined,
        prisma
      );

      // Manually set expiration to past
      await prisma.refreshToken.update({
        where: { id: expiredToken.id },
        data: { expiresAt: new Date(Date.now() - 1000) }, // Expired 1 second ago
      });

      await expect(
        AuthService.refreshTokens(expiredToken.token, mockSecurityContext.ipAddress)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should revoke all tokens on revoked token reuse (security breach)', async () => {
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

      // Manually revoke the token
      await prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { revokedAt: new Date(), reason: 'TEST_REVOKED' },
      });

      // Try to use revoked token - should fail and revoke ALL tokens
      await expect(
        AuthService.refreshTokens(loginResult.tokens.refreshToken, mockSecurityContext.ipAddress)
      ).rejects.toThrow(UnauthorizedError);

      // Verify all tokens are revoked
      const activeTokens = await prisma.refreshToken.count({
        where: { userId: user.id, revokedAt: null },
      });

      expect(activeTokens).toBe(0);
    });
  });

  // ============================================
  // LOGOUT INTEGRATION TESTS
  // ============================================

  describe('logout()', () => {
    it('should revoke all user tokens on logout', async () => {
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      });

      // Login to create tokens
      await AuthService.login(
        user.email,
        TEST_CREDENTIALS.VALID_PASSWORD,
        mockSecurityContext.ipAddress,
        mockSecurityContext.userAgent
      );

      // Logout
      await AuthService.logout(user.id, mockSecurityContext.ipAddress);

      // Verify all tokens are revoked
      const activeTokens = await prisma.refreshToken.count({
        where: { userId: user.id, revokedAt: null },
      });

      expect(activeTokens).toBe(0);
    });

    it('should create audit log on logout', async () => {
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      });

      await AuthService.logout(user.id, mockSecurityContext.ipAddress);

      const auditLogs = await prisma.securityAudit.findMany({
        where: { eventType: 'LOGOUT', userId: user.id },
      });

      expect(auditLogs.length).toBe(1);
    });
  });

  // ============================================
  // SECURITY AUDIT INTEGRATION TESTS
  // ============================================

  describe('SecurityAuditService', () => {
    it('should create security audit log', async () => {
      const user = await seedUser();

      await SecurityAuditService.audit({
        eventType: 'TEST_EVENT',
        userId: user.id,
        ipAddress: '192.168.1.1',
        metadata: { test: true },
      });

      const auditLog = await prisma.securityAudit.findFirst({
        where: { eventType: 'TEST_EVENT' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe(user.id);
      expect(auditLog?.ipAddress).toBe('192.168.1.1');
    });

    it('should detect suspicious activity (multiple failed attempts)', async () => {
      const user = await seedUser();

      // Simulate multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await SecurityAuditService.audit({
          eventType: 'LOGIN_FAILED',
          userId: user.id,
          ipAddress: '192.168.1.1',
          metadata: { attempt: i },
        });
      }

      const result = await SecurityAuditService.detectSuspiciousActivity(
        user.id,
        '192.168.1.1'
      );

      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toBe('MULTIPLE_FAILED_ATTEMPTS');
    });

    it('should revoke all tokens on security breach', async () => {
      const user = await seedUser();

      // Create multiple active tokens
      await seedRefreshToken(user.id, 'token1', prisma);
      await seedRefreshToken(user.id, 'token2', prisma);
      await seedRefreshToken(user.id, 'token3', prisma);

      // Revoke all tokens
      await SecurityAuditService.revokeAllTokens(user.id, 'TEST_SECURITY_BREACH');

      // Verify all tokens are revoked
      const activeTokens = await prisma.refreshToken.count({
        where: { userId: user.id, revokedAt: null },
      });

      expect(activeTokens).toBe(0);

      // Verify audit log was created
      const auditLogs = await prisma.securityAudit.findMany({
        where: { eventType: 'TOKENS_REVOKED' },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });
});
