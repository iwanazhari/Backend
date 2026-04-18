/**
 * Base Service
 * Implements: Service Layer Pattern from Clean Architecture
 * Follows: Single Responsibility, Business Logic Encapsulation
 * 
 * Provides common service operations that all services can inherit
 */

const logger = require('../utils/logger').createChildLogger('service');

/**
 * Base Service Class
 * @template T - Model type
 */
class BaseService {
  /**
   * @param {BaseRepository} repository - Repository instance
   */
  constructor(repository) {
    this.repository = repository;
    this.logger = logger.child({ service: this.constructor.name });
  }

  /**
   * Get all items with pagination
   * @param {Object} options - Query options
   * @returns {Promise<{rows: Array, pagination: Object}>}
   */
  async getAll(options = {}) {
    this.logger.debug('Getting all items', { options });
    return this.repository.findAll(options);
  }

  /**
   * Get item by ID
   * @param {string|number} id - Item ID
   * @param {Object} options - Query options
   * @returns {Promise<T>}
   */
  async getById(id, options = {}) {
    this.logger.debug(`Getting item by ID: ${id}`);
    return this.repository.findById(id, options);
  }

  /**
   * Create new item
   * @param {Object} data - Item data
   * @param {Object} options - Sequelize options
   * @returns {Promise<T>}
   */
  async create(data, options = {}) {
    this.logger.info('Creating new item', { data: this.sanitizeData(data) });
    return this.repository.create(data, options);
  }

  /**
   * Create multiple items
   * @param {Array<Object>} data - Array of item data
   * @param {Object} options - Sequelize options
   * @returns {Promise<Array<T>>}
   */
  async createBulk(data, options = {}) {
    this.logger.info('Creating multiple items', { count: data.length });
    return this.repository.createBulk(data, options);
  }

  /**
   * Update item
   * @param {string|number} id - Item ID
   * @param {Object} data - Update data
   * @param {Object} options - Sequelize options
   * @returns {Promise<T>}
   */
  async update(id, data, options = {}) {
    this.logger.info(`Updating item: ${id}`, { data: this.sanitizeData(data) });
    return this.repository.update(id, data, options);
  }

  /**
   * Delete item
   * @param {string|number} id - Item ID
   * @param {Object} options - Sequelize options
   * @returns {Promise<boolean>}
   */
  async delete(id, options = {}) {
    this.logger.info(`Deleting item: ${id}`);
    return this.repository.delete(id, options);
  }

  /**
   * Soft delete item
   * @param {string|number} id - Item ID
   * @returns {Promise<boolean>}
   */
  async softDelete(id) {
    this.logger.info(`Soft deleting item: ${id}`);
    return this.repository.softDelete(id);
  }

  /**
   * Count items
   * @param {Object} where - Filter conditions
   * @returns {Promise<number>}
   */
  async count(where = {}) {
    this.logger.debug('Counting items', { where });
    return this.repository.count(where);
  }

  /**
   * Check if item exists
   * @param {Object} where - Filter conditions
   * @returns {Promise<boolean>}
   */
  async exists(where) {
    return this.repository.exists(where);
  }

  /**
   * Sanitize data for logging (remove sensitive fields)
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeData(data) {
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
  async withCache(cacheKey, operation, ttl = 3600) {
    const { cacheWrapper } = require('../config/redis');
    return cacheWrapper(cacheKey, operation, ttl);
  }

  /**
   * Invalidate cache
   * @param {string} cacheKey - Cache key
   */
  async invalidateCache(cacheKey) {
    const { invalidateCache } = require('../config/redis');
    await invalidateCache(cacheKey);
  }
}

module.exports = BaseService;
