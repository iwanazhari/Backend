/**
 * Product Service
 * Implements: Service Layer Pattern
 * Contains all business logic for Product
 */

const { ConflictError, NotFoundError } = require('../errors');
const ProductRepository = require('../repositories/ProductRepository');
const BaseService = require('./BaseService');

/**
 * Product Service
 */
class ProductService extends BaseService {
  constructor() {
    super(ProductRepository);
  }

  // TODO: Add business logic here
  // Example:
  // async createProduct(data) {
  //   // Check for duplicates
  //   const existing = await this.repository.findByName(data.name);
  //   if (existing) {
  //     throw new ConflictError('Product already exists', 'DUPLICATE_PRODUCT');
  //   }
  //   return this.repository.create(data);
  // }
}

// Export singleton instance
module.exports = new ProductService();
