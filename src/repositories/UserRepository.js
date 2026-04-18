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

const BaseRepository = require('./BaseRepository');
const bcrypt = require('bcryptjs');

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
  async findByEmail(email) {
    return this.findOne({ email });
  }

  /**
   * Find user by email with password (for authentication)
   * @param {string} email - User email
   * @returns {Promise<User|null>}
   */
  async findByEmailWithPassword(email) {
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
  async findByIdWithRelations(id) {
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
  async findByRole(role, { page = 1, limit = 10 } = {}) {
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
  async findActiveUsers({ page = 1, limit = 10 } = {}) {
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
  async updateLastLogin(id) {
    return this.update(id, { lastLoginAt: new Date() });
  }

  /**
   * Verify user email
   * @param {string} id - User ID
   * @returns {Promise<User>}
   */
  async verifyEmail(id) {
    return this.update(id, { emailVerifiedAt: new Date() });
  }

  /**
   * Update user status
   * @param {string} id - User ID
   * @param {string} status - New status
   * @returns {Promise<User>}
   */
  async updateStatus(id, status) {
    return this.update(id, { status });
  }

  /**
   * Check if email exists (excluding current user)
   * @param {string} email - Email to check
   * @param {string} excludeId - User ID to exclude
   * @returns {Promise<boolean>}
   */
  async isEmailTaken(email, excludeId = null) {
    const where = { email };
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
  async search(query, { page = 1, limit = 10 } = {}) {
    const searchTerm = query.toLowerCase();
    
    return this.findAll({
      page,
      limit,
      where: {
        deletedAt: null,
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
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
  async hashPassword(password) {
    return bcrypt.hash(password, 12);
  }

  /**
   * Compare password (utility method)
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>}
   */
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
}

// Export singleton instance
module.exports = new UserRepository();
