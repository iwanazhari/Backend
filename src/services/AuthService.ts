/**
 * Auth Service
 * Implements: Service Layer Pattern
 * Follows: Business Logic Encapsulation, Single Responsibility
 *
 * Contains all business logic related to authentication operations
 */

import { v4 as uuidv4 } from 'uuid';
import { ConflictError, UnauthorizedError, ForbiddenError, BadRequestError } from '../errors/index.js';
import config from '../config/index.js';
import UserRepository, { type UserRepositoryType } from '../repositories/UserRepository.js';
import BaseService from './BaseService.js';
import { getPrismaClient } from '../config/prisma.js';
import { PrismaClient } from '@prisma/client';
import { UserRepository as UserRepositoryClass } from '../repositories/UserRepository.js';
import TokenService from './TokenService.js';
import SecurityAuditService from './SecurityAuditService.js';
import { isValidEmail, isStrongPassword } from '../utils/validators.js';
import RateLimitService from './RateLimitService.js';

interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface UserWithTokens {
  user: any;
  tokens: Tokens;
}

/**
 * Auth Service
 */
class AuthService extends BaseService<UserRepositoryType> {
  private prisma: PrismaClient;
  private userRepository: UserRepositoryType;

  constructor() {
    super(UserRepository);
    this.prisma = getPrismaClient();
    this.userRepository = new UserRepositoryClass();
  }

  /**
   * REGISTER - Zero Trust Implementation
   * - Validate email format
   * - Validate password strength
   * - Audit all attempts
   */
  async register(userData: UserData): Promise<UserWithTokens> {
    const { email, password, firstName, lastName } = userData;

    this.logger.info('Register attempt', { email });

    // STEP 1: Validate email format
    if (!isValidEmail(email)) {
      await SecurityAuditService.audit({
        eventType: 'REGISTER_FAILED',
        userId: null,
        ipAddress: 'unknown',
        metadata: { email, reason: 'INVALID_EMAIL_FORMAT' },
      });
      throw new BadRequestError('Invalid email format', 'INVALID_EMAIL');
    }

    // STEP 2: Validate password strength (Zero Trust: prevent weak passwords)
    if (!isStrongPassword(password)) {
      await SecurityAuditService.audit({
        eventType: 'REGISTER_FAILED',
        userId: null,
        ipAddress: 'unknown',
        metadata: { email, reason: 'WEAK_PASSWORD' },
      });
      throw new BadRequestError(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        'WEAK_PASSWORD'
      );
    }

    // STEP 3: Check if email already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      await SecurityAuditService.audit({
        eventType: 'REGISTER_FAILED',
        userId: null,
        ipAddress: 'unknown',
        metadata: { email, reason: 'EMAIL_EXISTS' },
      });
      throw new ConflictError('Email already registered', 'EMAIL_EXISTS');
    }

    // STEP 4: Hash password dengan bcrypt (12 rounds)
    const hashedPassword = await this.userRepository.hashPassword(password);

    // STEP 5: Create user
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(), // Normalize
        password: hashedPassword,
        firstName,
        lastName,
        role: 'USER',
        status: 'ACTIVE',
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

    // STEP 6: Generate PASETO tokens
    const tokens = await TokenService.generateTokenPair(user.id, user.email, user.role);

    // STEP 7: Audit successful registration
    await SecurityAuditService.audit({
      eventType: 'REGISTER_SUCCESS',
      userId: user.id,
      ipAddress: 'unknown',
      metadata: { email },
    });

    this.logger.info('User registered successfully', { userId: user.id });

    return { user, tokens };
  }

  /**
   * LOGIN - Zero Trust Implementation
   * - Verify credentials EVERY time
   * - Check account status
   * - Detect suspicious activity (impossible travel)
   * - Audit ALL attempts (success & failed)
   * - Revoke tokens on suspicion
   * - Constant-time response (prevent timing attack)
   */
  async login(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<UserWithTokens> {
    const startTime = Date.now();
    this.logger.info('Login attempt', { email, ip: ipAddress });

    let user: any = null;
    let loginFailed = false;

    try {
      // STEP 0: Check rate limit BEFORE authentication
      await RateLimitService.checkLoginRateLimit(email);

      // STEP 1: Validate input
      if (!email || !password) {
        await SecurityAuditService.audit({
          eventType: 'LOGIN_FAILED',
          userId: null,
          ipAddress,
          metadata: { email, reason: 'MISSING_CREDENTIALS' },
        });
        loginFailed = true;
        throw new BadRequestError('Email and password required', 'MISSING_CREDENTIALS');
      }

      // STEP 2: Find user dengan password
      user = await this.userRepository.findByEmailWithPassword(email.toLowerCase());

      if (!user) {
        // ❗ IMPORTANT: Still hash password to maintain constant time
        await this.userRepository.hashPassword('dummy-password-for-timing');
        
        await SecurityAuditService.audit({
          eventType: 'LOGIN_FAILED',
          userId: null,
          ipAddress,
          metadata: { email, reason: 'USER_NOT_FOUND' },
        });
        loginFailed = true;
        throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // STEP 3: Verify password
      const isValid = await this.userRepository.comparePassword(password, user.password);

      if (!isValid) {
        await SecurityAuditService.audit({
          eventType: 'LOGIN_FAILED',
          userId: user.id,
          ipAddress,
          metadata: { email, reason: 'INVALID_PASSWORD' },
        });
        loginFailed = true;
        throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // STEP 4: Check account status
      if (user.status !== 'ACTIVE') {
        await SecurityAuditService.audit({
          eventType: 'LOGIN_BLOCKED',
          userId: user.id,
          ipAddress,
          metadata: { status: user.status, reason: 'ACCOUNT_NOT_ACTIVE' },
        });
        loginFailed = true;
        throw new ForbiddenError('Account is not active', 'ACCOUNT_INACTIVE');
      }

      // STEP 5: ZERO TRUST - Detect suspicious activity
      const suspicious = await SecurityAuditService.detectSuspiciousActivity(user.id, ipAddress);
      if (suspicious.isSuspicious) {
        await SecurityAuditService.audit({
          eventType: 'LOGIN_SUSPICIOUS',
          userId: user.id,
          ipAddress,
          metadata: {
            reason: suspicious.reason,
            details: suspicious.details,
          },
        });

        await SecurityAuditService.revokeAllTokens(user.id, suspicious.reason);
        throw new ForbiddenError('Suspicious activity detected. All sessions revoked.', 'SECURITY_ALERT');
      }

      // STEP 6: Generate tokens
      const tokens = await TokenService.generateTokenPair(user.id, user.email, user.role);

      // STEP 7: Update last login
      await this.userRepository.updateLastLogin(user.id);

      // STEP 8: Audit successful login
      await SecurityAuditService.audit({
        eventType: 'LOGIN_SUCCESS',
        userId: user.id,
        ipAddress,
        metadata: { email, userAgent },
      });

      this.logger.info('Login successful', { userId: user.id });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
        },
        tokens,
      };
    } finally {
      // CONSTANT-TIME RESPONSE
      const elapsed = Date.now() - startTime;
      const minTime = 500;
      
      if (elapsed < minTime) {
        await new Promise(resolve => setTimeout(resolve, minTime - elapsed));
      }

      // Reset rate limit on success (don't reset on failure - handled in checkLoginRateLimit)
      if (!loginFailed && user) {
        await RateLimitService.resetLoginRateLimit(email);
      }
    }
  }

  /**
   * Logout user (revoke refresh tokens)
   * Zero Trust: Audit logout, revoke all sessions
   */
  async logout(userId: string, ipAddress: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        reason: 'USER_LOGOUT',
      },
    });

    await SecurityAuditService.audit({
      eventType: 'LOGOUT',
      userId,
      ipAddress,
    });

    this.logger.info('User logged out', { userId });
  }

  /**
   * Refresh tokens - Zero Trust
   * - Check token exists in database
   * - Check token not revoked
   * - Check token not expired
   * - Single-use refresh tokens
   * - Detect suspicious activity
   */
  async refreshTokens(refreshToken: string, ipAddress: string): Promise<any> {
    this.logger.info('Token refresh attempt', { ip: ipAddress });

    // STEP 1: Find refresh token in database
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      await SecurityAuditService.audit({
        eventType: 'REFRESH_FAILED',
        userId: null,
        ipAddress,
        metadata: { reason: 'TOKEN_NOT_FOUND' },
      });
      throw new UnauthorizedError('Invalid refresh token', 'INVALID_TOKEN');
    }

    const userId = tokenRecord.userId;
    const email = tokenRecord.user.email;
    const role = tokenRecord.user.role;

    // STEP 2: Check if revoked (possible token theft)
    if (tokenRecord.revokedAt) {
      await SecurityAuditService.audit({
        eventType: 'REFRESH_FAILED',
        userId,
        ipAddress,
        metadata: {
          reason: 'REVOKED_TOKEN_REUSE',
          revokedAt: tokenRecord.revokedAt,
        },
      });

      // ❗ Jika token yang sudah di-revoke digunakan, REVOKE ALL
      await SecurityAuditService.revokeAllTokens(userId, 'REVOKED_TOKEN_REUSE_ATTEMPT');

      throw new UnauthorizedError(
        'Token has been revoked. Possible security breach. Please login again.',
        'TOKEN_REVOKED'
      );
    }

    // STEP 3: Check expiration
    if (tokenRecord.expiresAt < new Date()) {
      await SecurityAuditService.audit({
        eventType: 'REFRESH_FAILED',
        userId,
        ipAddress,
        metadata: { reason: 'TOKEN_EXPIRED' },
      });
      throw new UnauthorizedError('Token has expired', 'TOKEN_EXPIRED');
    }

    // STEP 4: Generate new token pair
    const tokens = await TokenService.generateTokenPair(userId, email, role);

    // STEP 5: Revoke old token (single-use!)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        revokedAt: new Date(),
        reason: 'REPLACED',
        replacedByToken: tokens.refreshToken,
      },
    });

    // STEP 6: Audit
    await SecurityAuditService.audit({
      eventType: 'TOKEN_REFRESHED',
      userId,
      ipAddress,
      metadata: { jti: tokens.refreshToken },
    });

    this.logger.info('Token refreshed', { userId });

    return { tokens };
  }

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getProfile(userId: string): Promise<any> {
    return this.userRepository.findByIdWithRelations(userId);
  }

  /**
   * Update user profile
   * Zero Trust: Prevent privilege escalation and account takeover
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>}
   */
  async updateProfile(userId: string, updateData: Record<string, any>): Promise<any> {
    // Remove protected fields to prevent privilege escalation
    const { 
      password, 
      email, // Email change not allowed through this method
      role, 
      status,
      emailVerifiedAt,
      lastLoginAt,
      createdAt,
      updatedAt,
      deletedAt,
      ...allowedUpdates 
    } = updateData;

    // Log attempt to update protected fields (security monitoring)
    const protectedFieldsAttempted = [
      ...(email ? ['email'] : []),
      ...(password ? ['password'] : []),
      ...(role ? ['role'] : []),
      ...(status ? ['status'] : []),
    ];

    if (protectedFieldsAttempted.length > 0) {
      this.logger.warn('Attempt to update protected fields', {
        userId,
        fields: protectedFieldsAttempted,
      });
      
      // Throw error if email change is attempted (account takeover prevention)
      if (email) {
        throw new BadRequestError(
          'Email cannot be changed through this endpoint. Contact support.',
          'EMAIL_CHANGE_NOT_ALLOWED'
        );
      }
    }

    return this.userRepository.update(userId, allowedUpdates);
  }

  /**
   * Change password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId, {
      select: { password: true },
    });

    // Verify current password
    const isPasswordValid = await this.userRepository.comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect', 'INVALID_PASSWORD');
    }

    // Hash new password and update
    const hashedPassword = await this.userRepository.hashPassword(newPassword);
    await this.userRepository.update(userId, { password: hashedPassword });

    // Revoke all refresh tokens for security
    await this.logout(userId);

    this.logger.info('Password changed successfully', { userId });
  }

  /**
   * Delete user account
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteAccount(userId: string): Promise<void> {
    // Logout from all sessions
    await this.logout(userId);

    // Soft delete user
    await this.userRepository.softDelete(userId);

    this.logger.info('User account deleted', { userId });
  }

  /**
   * Generate PASETO tokens
   * Zero Trust: Short-lived access token (15 min) + single-use refresh token
   */
  private async generateTokens(
    userId: string,
    email: string,
    role: string
  ): Promise<any> {
    return TokenService.generateTokenPair(userId, email, role);
  }
}

// Export singleton instance
export default new AuthService();
export type AuthServiceType = AuthService;
