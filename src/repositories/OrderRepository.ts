/**
 * Order Repository
 * Implements: Repository Pattern
 */

import BaseRepository from './BaseRepository.js';

/**
 * Order Repository
 */
class OrderRepository extends BaseRepository {
  constructor() {
    super('Order');
  }

  // TODO: Add custom queries here
  // Example:
  // async findByOrderNumber(orderNumber: string) {
  //   return this.findOne({ orderNumber });
  // }
}

// Export singleton instance
export default new OrderRepository();
