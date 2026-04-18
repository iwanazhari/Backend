/**
 * Order Repository
 * Implements: Repository Pattern
 */

const BaseRepository = require('./BaseRepository');
const Order = require('../models/Order');

/**
 * Order Repository
 */
class OrderRepository extends BaseRepository {
  constructor() {
    super(Order);
  }

  // TODO: Add custom queries here
  // Example:
  // async findByName(name) {
  //   return this.findOne({ name });
  // }
}

// Export singleton instance
module.exports = new OrderRepository();
