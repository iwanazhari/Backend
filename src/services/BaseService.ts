/**
 * Base Service
 * Implements: Service Layer Pattern from Clean Architecture
 * Follows: Single Responsibility, Business Logic Encapsulation
 *
 * Provides common service operations that all services can inherit
 */

import { createChildLogger } from '../utils/logger.js';
import BaseRepository from '../repositories/BaseRepository.js';

/**
 * Base Service Class
 */
class BaseService<T extends BaseRepository = BaseRepository> {
  protected repository: T;
  protected logger: any;

  /**
   * @param {BaseRepository} repository - Repository instance
   */
  constructor(repository: T) {
    this.repository = repository;
    this.logger = createChildLogger('service').child({ service: this.constructor.name });
  }

  /**
   * Get all items with pagination
   * @param {Object} options - Query options
   * @returns {Promise<{rows: Array, pagination: Object}>}
   */
  async getAll(options: Record<string, any> = {}) {
    this.logger.debug('Getting all items', { options });
    return this.repository.findAll(options);
  }

  /**
   * Get item by ID
   * @param {string|number} id - Item ID
   * @param {Object} options - Query options
   * @returns {Promise<T>}
   */
  async getById(id: string | number, options: Record<string, any> = {}) {
    this.logger.debug(`Getting item by ID: ${id}`);
    return this.repository.findById(id.toString(), options);
  }

  /**
   * Create new item
   * @param {Object} data - Item data
   * @param {Object} options - Sequelize options
   * @returns {Promise<T>}
   */
  async create(data: Record<string, any>, options: Record<string, any> = {}) {
    this.logger.info('Creating new item', { data: this.sanitizeData(data) });
    return this.repository.create(data);
  }

  /**
   * Create multiple items
   * @param {Array<Object>} data - Array of item data
   * @param {Object} options - Sequelize options
   * @returns {Promise<Array<T>>}
   */
  async createBulk(data: Record<string, any>[], options: Record<string, any> = {}) {
    this.logger.info('Creating multiple items', { count: data.length });
    return this.repository.createMany(data);
  }

  /**
   * Update item
   * @param {string|number} id - Item ID
   * @param {Object} data - Update data
   * @param {Object} options - Sequelize options
   * @returns {Promise<T>}
   */
  async update(id: string | number, data: Record<string, any>, options: Record<string, any> = {}) {
    this.logger.info(`Updating item: ${id}`, { data: this.sanitizeData(data) });
    return this.repository.update(id.toString(), data);
  }

  /**
   * Delete item
   * @param {string|number} id - Item ID
   * @param {Object} options - Sequelize options
   * @returns {Promise<boolean>}
   */
  async delete(id: string | number, options: Record<string, any> = {}) {
    this.logger.info(`Deleting item: ${id}`);
    return this.repository.delete(id.toString());
  }

  /**
   * Soft delete item
   * @param {string|number} id - Item ID
   * @returns {Promise<boolean>}
   */
  async softDelete(id: string | number) {
    this.logger.info(`Soft deleting item: ${id}`);
    return this.repository.softDelete(id.toString());
  }

  /**
   * Count items
   * @param {Object} where - Filter conditions
   * @returns {Promise<number>}
   */
  async count(where: Record<string, any> = {}) {
    this.logger.debug('Counting items', { where });
    return this.repository.count(where);
  }

  /**
   * Check if item exists
   * @param {Object} where - Filter conditions
   * @returns {Promise<boolean>}
   */
  async exists(where: Record<string, any>) {
    return this.repository.exists(where);
  }

  /**
   * Sanitize data for logging (remove sensitive fields)
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  protected sanitizeData(data: Record<string, any>): Record<string, any> {
    const sensitive = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    const sanitized = { ...data };

    sensitive.forEach((key) => {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Execute operation with cache
   * @param {string} cacheKey - Cache key
   * @param {Function} operation - Operation to execute
   * @param {number} ttl - Cache TTL in seconds
   * @returns {Promise<any>}
   */
  async withCache<T>(cacheKey: string, operation: () => Promise<T>, ttl = 3600): Promise<T> {
    const { cacheWrapper } = await import('../config/redis.js');
    return cacheWrapper(cacheKey, operation, ttl);
  }

  /**
   * Invalidate cache
   * @param {string} cacheKey - Cache key
   */
  async invalidateCache(cacheKey: string): Promise<void> {
    const { invalidateCache } = await import('../config/redis.js');
    await invalidateCache(cacheKey);
  }
}

export default BaseService;
