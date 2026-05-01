/**
 * User Repository (Prisma)
 * Implements: Repository Pattern with Prisma
 * Follows: Single Responsibility, Data Abstraction
 *
 * Team Rules:
 * - Custom queries untuk User model ditaruh di sini
 * - Jangan ada business logic di repository
 * - Handle Prisma-specific errors di sini
 */

import BaseRepository from './BaseRepository.js';
import bcrypt from 'bcryptjs';

/**
 * User Repository
 */
class UserRepository extends BaseRepository {
  constructor() {
    super('User');
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>}
   */
  async findByEmail(email: string): Promise<any> {
    return this.findOne({ email });
  }

  /**
   * Find user by email with password (for authentication)
   * @param {string} email - User email
   * @returns {Promise<User|null>}
   */
  async findByEmailWithPassword(email: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        lastLoginAt: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Find user by ID with relations
   * @param {string} id - User ID
   * @returns {Promise<User>}
   */
  async findByIdWithRelations(id: string): Promise<any> {
    return this.findById(id, {
      include: {
        refreshTokens: {
          where: { revokedAt: null },
        },
      },
    });
  }

  /**
   * Get users by role
   * @param {string} role - User role
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{rows: Array, pagination: Object}>}
   */
  async findByRole(role: string, { page = 1, limit = 10 } = {}): Promise<any> {
    return this.findAll({
      page,
      limit,
      where: { role },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get active users
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{rows: Array, pagination: Object}>}
   */
  async findActiveUsers({ page = 1, limit = 10 } = {}): Promise<any> {
    return this.findAll({
      page,
      limit,
      where: { status: 'ACTIVE', deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update user last login timestamp
   * @param {string} id - User ID
   * @returns {Promise<User>}
   */
  async updateLastLogin(id: string): Promise<any> {
    return this.update(id, { lastLoginAt: new Date() });
  }

  /**
   * Verify user email
   * @param {string} id - User ID
   * @returns {Promise<User>}
   */
  async verifyEmail(id: string): Promise<any> {
    return this.update(id, { emailVerifiedAt: new Date() });
  }

  /**
   * Update user status
   * @param {string} id - User ID
   * @param {string} status - New status
   * @returns {Promise<User>}
   */
  async updateStatus(id: string, status: string): Promise<any> {
    return this.update(id, { status });
  }

  /**
   * Check if email exists (excluding current user)
   * @param {string} email - Email to check
   * @param {string} excludeId - User ID to exclude
   * @returns {Promise<boolean>}
   */
  async isEmailTaken(email: string, excludeId: string | null = null): Promise<boolean> {
    const where: Record<string, any> = { email };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return this.exists(where);
  }

  /**
   * Search users by name or email
   * @param {string} query - Search query
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{rows: Array, pagination: Object}>}
   */
  async search(query: string, { page = 1, limit = 10 } = {}): Promise<any> {
    const searchTerm = query.toLowerCase();

    return this.findAll({
      page,
      limit,
      where: {
        deletedAt: null,
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' as const } },
          { lastName: { contains: searchTerm, mode: 'insensitive' as const } },
          { email: { contains: searchTerm, mode: 'insensitive' as const } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>}
   */
  async getStats(): Promise<any> {
    const [total, active, admins] = await Promise.all([
      this.count({ deletedAt: null }),
      this.count({ status: 'ACTIVE', deletedAt: null }),
      this.count({ role: 'ADMIN', deletedAt: null }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      admins,
      users: total - admins,
    };
  }

  /**
   * Hash password (utility method)
   * @param {string} password - Plain text password
   * @returns {Promise<string>}
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Compare password (utility method)
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>}
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

// Export singleton instance
export default new UserRepository();
export type UserRepositoryType = UserRepository;
export { UserRepository };
