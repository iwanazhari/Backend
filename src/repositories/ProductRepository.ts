/**
 * Product Repository
 * Implements: Repository Pattern
 */

import BaseRepository from './BaseRepository.js';

/**
 * Product Repository
 */
class ProductRepository extends BaseRepository {
  constructor() {
    super('Product');
  }

  // TODO: Add custom queries here
  // Example:
  // async findByName(name: string) {
  //   return this.findOne({ name });
  // }
}

// Export singleton instance
export default new ProductRepository();
