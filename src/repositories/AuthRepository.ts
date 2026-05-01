/**
 * Auth Repository (Prisma + ES Module)
 * Implements: Repository Pattern with Prisma ORM
 * Follows: Single Responsibility, Data Abstraction
 */

import BaseRepository from './BaseRepository.js';
import { getPrismaClient } from '../config/prisma.js';

/**
 * Auth Repository
 */
class AuthRepository extends BaseRepository {
  constructor() {
    super('Auth');
    this.prisma = getPrismaClient();
  }

  // TODO: Add custom queries here
  // Example:
  // async findByName(name: string) {
  //   return this.prisma.auth.findFirst({ where: { name } });
  // }
}

// Export singleton instance
export default new AuthRepository();
