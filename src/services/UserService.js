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

const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { ConflictError, UnauthorizedError, ForbiddenError } = require('../errors');
const config = require('../config');
const UserRepository = require('../repositories/UserRepository');
const BaseService = require('./BaseService');
const { getPrismaClient } = require('../config/prisma');

/**
 * User Service
 */
class UserService extends BaseService {
  constructor() {
    super(UserRepository);
    this.prisma = getPrismaClient();
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<{user: Object, tokens: Object}>}
   */
  async register(userData) {
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
   * @returns {Promise<{user: Object, tokens: Object}>}
   */
  async login(email, password) {
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
  async logout(userId) {
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
   * @returns {Promise<{accessToken: string, refreshToken: string}>}
   */
  async refreshTokens(refreshToken) {
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
  async getProfile(userId) {
    return this.repository.findByIdWithRelations(userId);
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>}
   */
  async updateProfile(userId, updateData) {
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
  async changePassword(userId, currentPassword, newPassword) {
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
  async deleteAccount(userId) {
    // Logout from all sessions
    await this.logout(userId);

    // Soft delete user
    await this.repository.softDelete(userId);

    this.logger.info('User account deleted', { userId });
  }

  /**
   * Admin: Get all users
   * @param {Object} options - Query options
   * @returns {Promise<{rows: Array, pagination: Object}>}
   */
  async getAllUsers(options = {}) {
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
  async getUserById(userId) {
    return this.repository.findByIdWithRelations(userId);
  }

  /**
   * Admin: Update user status
   * @param {string} userId - User ID
   * @param {string} status - New status
   * @returns {Promise<Object>}
   */
  async updateUserStatus(userId, status) {
    return this.repository.updateStatus(userId, status);
  }

  /**
   * Admin: Delete user (hard delete)
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async adminDeleteUser(userId) {
    await this.logout(userId);
    await this.repository.delete(userId);
    this.logger.info('User deleted by admin', { userId });
  }

  /**
   * Generate JWT tokens
   * @param {Object} user - User object
   * @returns {Object} Tokens
   * @private
   */
  generateTokens(user) {
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expire }
    );

    const refreshToken = uuidv4();

    // Save refresh token to database
    this.saveRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expire,
    };
  }

  /**
   * Save refresh token to database
   * @param {string} userId - User ID
   * @param {string} token - Refresh token
   * @private
   */
  async saveRefreshToken(userId, token) {
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
   * @param {Object} options - Pagination options
   * @returns {Promise<{rows: Array, pagination: Object}>}
   */
  async searchUsers(query, options = {}) {
    return this.repository.search(query, options);
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>}
   */
  async getUserStats() {
    return this.repository.getStats();
  }
}

// Export singleton instance
module.exports = new UserService();
