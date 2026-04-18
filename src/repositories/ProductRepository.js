/**
 * Product Repository
 * Implements: Repository Pattern
 */

const BaseRepository = require('./BaseRepository');
const Product = require('../models/Product');

/**
 * Product Repository
 */
class ProductRepository extends BaseRepository {
  constructor() {
    super(Product);
  }

  // TODO: Add custom queries here
  // Example:
  // async findByName(name) {
  //   return this.findOne({ name });
  // }
}

// Export singleton instance
module.exports = new ProductRepository();
