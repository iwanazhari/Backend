/**
 * Product Service
 * Implements: Service Layer Pattern
 * Contains all business logic for Product
 */

import { ConflictError, NotFoundError } from '../errors/index.js';
import ProductRepository from '../repositories/ProductRepository.js';
import BaseService from './BaseService.js';

/**
 * Product Service
 */
class ProductService extends BaseService {
  constructor() {
    super(ProductRepository);
  }

  // TODO: Add business logic here
  // Example:
  // async createProduct(data: any) {
  //   // Check for duplicates
  //   const existing = await this.repository.findByName(data.name);
  //   if (existing) {
  //     throw new ConflictError('Product already exists', 'DUPLICATE_PRODUCT');
  //   }
  //   return this.repository.create(data);
  // }
}

// Export singleton instance
export default new ProductService();
