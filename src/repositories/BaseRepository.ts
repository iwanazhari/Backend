/**
 * Base Repository (Prisma)
 * Implements: Repository Pattern with Prisma ORM
 * Follows: DRY principle, Type safety, Single Responsibility
 *
 * Team Rules:
 * - Semua repository extend dari class ini
 * - Gunakan method yang ada, jangan buat query manual
 * - Selalu handle Prisma errors di repository layer
 */

import { getPrismaClient } from '../config/prisma.js';
import { NotFoundError, ConflictError } from '../errors/index.js';
import { createChildLogger } from '../utils/logger.js';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma error codes
 */
const PRISMA_ERROR_CODES = {
  NOT_FOUND: 'P2025',
  UNIQUE_CONSTRAINT: 'P2002',
  FOREIGN_KEY: 'P2003',
};

interface FindAllOptions {
  page?: number;
  limit?: number;
  where?: Record<string, any>;
  include?: Record<string, any>;
  orderBy?: any;
  select?: any;
}

interface FindOptions {
  include?: Record<string, any>;
  select?: any;
}

/**
 * Base Repository Class
 * @template T - Model type
 */
class BaseRepository {
  protected modelName: string;
  protected prisma: PrismaClient;
  protected model: any;
  protected logger: any;

  /**
   * @param {string} modelName - Prisma model name
   */
  constructor(modelName: string) {
    this.modelName = modelName;
    this.prisma = getPrismaClient();
    this.model = this.prisma[modelName];
    this.logger = createChildLogger('repository');

    if (!this.model) {
      throw new Error(`Model ${modelName} not found in Prisma schema`);
    }
  }

  /**
   * Find all records with pagination and filtering
   * @param {FindAllOptions} options - Query options
   * @returns {Promise<{rows: Array, pagination: Object}>}
   */
  async findAll({
    page = 1,
    limit = 10,
    where = {},
    include = {},
    orderBy = { createdAt: 'desc' },
    select = null,
  }: FindAllOptions = {}): Promise<any> {
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.model.findMany({
        where,
        include,
        select,
        orderBy,
        skip: parseInt(skip as unknown as string, 10),
        take: parseInt(limit as unknown as string, 10),
      }),
      this.model.count({ where }),
    ]);

    return {
      rows,
      pagination: {
        total,
        page: parseInt(page as unknown as string, 10),
        limit: parseInt(limit as unknown as string, 10),
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Find a single record by ID
   * @param {string} id - Record ID
   * @param {FindOptions} options - Query options
   * @returns {Promise<T>}
   * @throws {NotFoundError} If record not found
   */
  async findById(id: string, { include = {}, select = null }: FindOptions = {}): Promise<any> {
    const record = await this.model.findUnique({
      where: { id },
      include,
      select,
    });

    if (!record) {
      throw new NotFoundError(`${this.modelName} with id ${id} not found`);
    }

    return record;
  }

  /**
   * Find a single record by criteria
   * @param {Object} where - Filter conditions
   * @param {FindOptions} options - Query options
   * @returns {Promise<T|null>}
   */
  async findOne(where: Record<string, any>, { include = {}, select = null }: FindOptions = {}): Promise<any> {
    return this.model.findFirst({
      where,
      include,
      select,
    });
  }

  /**
   * Find first record or throw error
   * @param {Object} where - Filter conditions
   * @param {FindOptions} options - Query options
   * @returns {Promise<T>}
   * @throws {NotFoundError}
   */
  async findFirstOrThrow(where: Record<string, any>, { include = {}, select = null }: FindOptions = {}): Promise<any> {
    const record = await this.findFirst(where, { include, select });

    if (!record) {
      throw new NotFoundError(`${this.modelName} not found`);
    }

    return record;
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Promise<T>}
   */
  async create(data: Record<string, any>): Promise<any> {
    this.logger.debug(`Creating ${this.modelName}`, { data: this.sanitizeData(data) });

    try {
      return await this.model.create({ data });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Create multiple records
   * @param {Array<Object>} data - Array of record data
   * @returns {Promise<Array<T>>}
   */
  async createMany(data: Record<string, any>[]): Promise<any> {
    this.logger.debug(`Bulk creating ${this.modelName}`, { count: data.length });

    try {
      const result = await this.model.createMany({
        data,
        skipDuplicates: true,
      });

      return result;
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Update a record
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @returns {Promise<T>}
   * @throws {NotFoundError} If record not found
   */
  async update(id: string, data: Record<string, any>): Promise<any> {
    this.logger.debug(`Updating ${this.modelName} with id ${id}`, { data: this.sanitizeData(data) });

    try {
      return await this.model.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw this.handlePrismaError(error, id);
    }
  }

  /**
   * Update records by criteria
   * @param {Object} where - Filter conditions
   * @param {Object} data - Update data
   * @returns {Promise<{count: number}>}
   */
  async updateMany(where: Record<string, any>, data: Record<string, any>): Promise<any> {
    this.logger.debug(`Updating multiple ${this.modelName} records`, { where, data });

    try {
      return await this.model.updateMany({ where, data });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Delete a record
   * @param {string} id - Record ID
   * @returns {Promise<T>}
   * @throws {NotFoundError} If record not found
   */
  async delete(id: string): Promise<any> {
    this.logger.debug(`Deleting ${this.modelName} with id ${id}`);

    try {
      return await this.model.delete({
        where: { id },
      });
    } catch (error) {
      throw this.handlePrismaError(error, id);
    }
  }

  /**
   * Delete records by criteria
   * @param {Object} where - Filter conditions
   * @returns {Promise<{count: number}>}
   */
  async deleteMany(where: Record<string, any>): Promise<any> {
    this.logger.debug(`Deleting multiple ${this.modelName} records`, { where });

    try {
      return await this.model.deleteMany({ where });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Count records
   * @param {Object} where - Filter conditions
   * @returns {Promise<number>}
   */
  async count(where: Record<string, any> = {}): Promise<number> {
    return this.model.count({ where });
  }

  /**
   * Check if record exists
   * @param {Object} where - Filter conditions
   * @returns {Promise<boolean>}
   */
  async exists(where: Record<string, any>): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Find or create a record
   * @param {Object} where - Search criteria
   * @param {Object} create - Data for creation
   * @returns {Promise<{record: T, created: boolean}>}
   */
  async findOrCreate(where: Record<string, any>, create: Record<string, any>): Promise<any> {
    try {
      const record = await this.findFirst(where);

      if (record) {
        return { record, created: false };
      }

      const newRecord = await this.create({ ...where, ...create });
      return { record: newRecord, created: true };
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Upsert (update or create) a record
   * @param {Object} where - Search criteria
   * @param {Object} create - Data for creation
   * @param {Object} update - Data for update
   * @returns {Promise<T>}
   */
  async upsert(where: Record<string, any>, create: Record<string, any>, update: Record<string, any>): Promise<any> {
    try {
      return await this.model.upsert({
        where,
        create,
        update,
      });
    } catch (error) {
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Soft delete a record (set deletedAt)
   * @param {string} id - Record ID
   * @returns {Promise<T>}
   */
  async softDelete(id: string): Promise<any> {
    return this.update(id, { deletedAt: new Date() });
  }

  /**
   * Restore a soft-deleted record
   * @param {string} id - Record ID
   * @returns {Promise<T>}
   */
  async restore(id: string): Promise<any> {
    return this.update(id, { deletedAt: null });
  }

  /**
   * Handle Prisma errors and convert to AppError
   * @param {Error} error - Prisma error
   * @param {string} id - Record ID (optional)
   * @returns {AppError}
   * @private
   */
  protected handlePrismaError(error: any, id: string | null = null): any {
    // Prisma known error
    if (error.code === PRISMA_ERROR_CODES.NOT_FOUND) {
      return new NotFoundError(`${this.modelName} ${id ? `with id ${id}` : ''} not found`);
    }

    // Unique constraint failed
    if (error.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) {
      const field = error.meta?.target?.[0] || 'field';
      return new ConflictError(`${this.modelName} with this ${field} already exists`, 'DUPLICATE_ENTRY');
    }

    // Foreign key constraint failed
    if (error.code === PRISMA_ERROR_CODES.FOREIGN_KEY) {
      return new NotFoundError('Related record not found', 'FOREIGN_KEY_ERROR');
    }

    // Log unknown errors
    this.logger.error(`Prisma error in ${this.modelName}:`, error.message);

    // Return original error for other cases
    return error;
  }

  /**
   * Sanitize data for logging (remove sensitive fields)
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   * @private
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
}

export default BaseRepository;
