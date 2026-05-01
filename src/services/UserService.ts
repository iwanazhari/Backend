/**
 * User Service (Prisma)
 * Implements: Service Layer Pattern
 * Follows: Business Logic Encapsulation, Single Responsibility
 *
 * Contains all business logic related to User operations
 * Team Rules:
 * - Business logic hanya di service
 * - Validation di service layer
 * - Error handling yang konsisten
 */

import { v4 as uuidv4 } from 'uuid';
import { ConflictError, UnauthorizedError, ForbiddenError } from '../errors/index.js';
import UserRepository, { type UserRepositoryType } from '../repositories/UserRepository.js';
import BaseService from './BaseService.js';
import { getPrismaClient } from '../config/prisma.js';
import { PrismaClient } from '@prisma/client';
import TokenService from './TokenService.js';

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

interface QueryOptions {
  page?: number;
  limit?: number;
  where?: Record<string, any>;
  [key: string]: any;
}

/**
 * User Service
 */
class UserService extends BaseService<UserRepositoryType> {
  private prisma: PrismaClient;

  constructor() {
    super(UserRepository);
    this.prisma = getPrismaClient();
  }

  /**
   * Register a new user
   * @param {UserData} userData - User registration data
   * @returns {Promise<UserWithTokens>}
   */
  async register(userData: UserData): Promise<UserWithTokens> {
    const { email, password, firstName, lastName } = userData;

    // Check if email already exists
    const existingUser = await this.repository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already registered', 'EMAIL_EXISTS');
    }

    // Hash password
    const hashedPassword = await this.repository.hashPassword(password);

    // Create user using transaction
    const user = await this.prisma.user.create({
      data: {
        email,
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
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    this.logger.info('User registered successfully', { userId: user.id, email });

    return { user, tokens };
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<UserWithTokens>}
   */
  async login(email: string, password: string): Promise<UserWithTokens> {
    // Find user with password
    const user = await this.repository.findByEmailWithPassword(email);

    if (!user) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isPasswordValid = await this.repository.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('Account is not active', 'ACCOUNT_INACTIVE');
    }

    // Update last login
    await this.repository.updateLastLogin(user.id);

    // Generate tokens
    const tokens = this.generateTokens(user);

    this.logger.info('User logged in successfully', { userId: user.id });

    return { user, tokens };
  }

  /**
   * Logout user (revoke refresh tokens)
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        reason: 'logout',
      },
    });

    this.logger.info('User logged out', { userId });
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Tokens>}
   */
  async refreshTokens(refreshToken: string): Promise<Tokens> {
    // Find refresh token
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // Generate new tokens
    const tokens = this.generateTokens(tokenRecord.user);

    // Revoke old token and save new one
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        revokedAt: new Date(),
        reason: 'replaced',
        replacedByToken: tokens.refreshToken,
      },
    });

    return tokens;
  }

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getProfile(userId: string): Promise<any> {
    return this.repository.findByIdWithRelations(userId);
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>}
   */
  async updateProfile(userId: string, updateData: Record<string, any>): Promise<any> {
    // Remove protected fields
    const { password, email, role, status, ...allowedUpdates } = updateData;

    return this.repository.update(userId, allowedUpdates);
  }

  /**
   * Change password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.repository.findById(userId, {
      select: { password: true },
    });

    // Verify current password
    const isPasswordValid = await this.repository.comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect', 'INVALID_PASSWORD');
    }

    // Hash new password and update
    const hashedPassword = await this.repository.hashPassword(newPassword);
    await this.repository.update(userId, { password: hashedPassword });

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
    await this.repository.softDelete(userId);

    this.logger.info('User account deleted', { userId });
  }

  /**
   * Admin: Get all users
   * @param {QueryOptions} options - Query options
   * @returns {Promise<{rows: Array, pagination: Object}>}
   */
  async getAllUsers(options: QueryOptions = {}): Promise<any> {
    return this.repository.findAll({
      ...options,
      where: {
        ...options.where,
        deletedAt: null,
      },
    });
  }

  /**
   * Admin: Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getUserById(userId: string): Promise<any> {
    return this.repository.findByIdWithRelations(userId);
  }

  /**
   * Admin: Update user status
   * @param {string} userId - User ID
   * @param {string} status - New status
   * @returns {Promise<Object>}
   */
  async updateUserStatus(userId: string, status: string): Promise<any> {
    return this.repository.updateStatus(userId, status);
  }

  /**
   * Admin: Delete user (hard delete)
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async adminDeleteUser(userId: string): Promise<void> {
    await this.logout(userId);
    await this.repository.delete(userId);
    this.logger.info('User deleted by admin', { userId });
  }

  /**
   * Generate PASETO tokens
   * @param {Object} user - User object
   * @returns {Promise<Tokens>}
   * @private
   */
  private async generateTokens(user: any): Promise<Tokens> {
    const tokenPair = await TokenService.generateTokenPair(user.id, user.email, user.role);

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: `${tokenPair.expiresIn}s`,
    };
  }

  /**
   * Save refresh token to database
   * @param {string} userId - User ID
   * @param {string} token - Refresh token
   * @private
   */
  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  /**
   * Search users
   * @param {string} query - Search query
   * @param {QueryOptions} options - Pagination options
   * @returns {Promise<{rows: Array, pagination: Object}>}
   */
  async searchUsers(query: string, options: QueryOptions = {}): Promise<any> {
    return this.repository.search(query, options);
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>}
   */
  async getUserStats(): Promise<any> {
    return this.repository.getStats();
  }
}

// Export singleton instance
export default new UserService();
export type UserServiceType = UserService;
