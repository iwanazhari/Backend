/**
 * Base Controller
 * Implements: Controller Pattern from Clean Architecture
 * Follows: Single Responsibility, HTTP Handling
 *
 * Provides common controller operations that all controllers can inherit
 */

import { Request, Response, NextFunction } from 'express';
import { createChildLogger } from '../utils/logger.js';

const controllerLogger = createChildLogger('controller');

export interface BaseService {
  getAll: (options?: any) => Promise<any>;
  getById: (id: string | number, options?: any) => Promise<any>;
  create: (data: any, options?: any) => Promise<any>;
  createBulk?: (data: any[], options?: any) => Promise<any>;
  update: (id: string | number, data: any, options?: any) => Promise<any>;
  delete: (id: string | number, options?: any) => Promise<any>;
  softDelete?: (id: string | number) => Promise<any>;
  count: (where?: any) => Promise<number>;
  exists: (where: any) => Promise<boolean>;
}

interface PaginationResult {
  rows: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface RequestWithId extends Partial<Request> {
  requestId?: string;
  startTime?: number;
}

/**
 * Base Controller Class
 */
class BaseController<T extends BaseService = BaseService> {
  protected service: T;
  protected resourceName: string;
  protected logger: any;

  /**
   * @param {BaseService} service - Service instance
   * @param {string} resourceName - Resource name for logging
   */
  constructor(service: T, resourceName: string) {
    this.service = service;
    this.resourceName = resourceName;
    this.logger = controllerLogger.child({ controller: this.constructor.name });
  }

  /**
   * Send success response
   * @param {Response} res - Express response object
   * @param {any} data - Response data
   * @param {number} statusCode - HTTP status code
   * @param {Object} meta - Additional metadata
   */
  sendSuccess(res: Response, data: any, statusCode = 200, meta: Record<string, any> = {}) {
    const response: any = {
      success: true,
      data,
    };

    if (Object.keys(meta).length > 0) {
      response.meta = meta;
    }

    res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   * @param {Response} res - Express response object
   * @param {PaginationResult} result - Result with rows and pagination
   * @param {number} statusCode - HTTP status code
   */
  sendPaginated(res: Response, result: PaginationResult, statusCode = 200) {
    const response = {
      success: true,
      data: result.rows,
      meta: {
        pagination: result.pagination,
      },
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send created response
   * @param {Response} res - Express response object
   * @param {any} data - Response data
   * @param {string} location - Location header (optional)
   */
  sendCreated(res: Response, data: any, location: string | null = null) {
    const response = {
      success: true,
      data,
    };

    res.status(201).json(response);

    if (location) {
      res.setHeader('Location', location);
    }
  }

  /**
   * Send no content response
   * @param {Response} res - Express response object
   */
  sendNoContent(res: Response) {
    res.status(204).send();
  }

  /**
   * Handle async errors in controller methods
   * Wraps controller methods to catch errors and pass to next middleware
   * @param {Function} fn - Controller method
   * @returns {Function} Wrapped method
   */
  handle(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn.bind(this)(req, res, next)).catch(next);
    };
  }

  /**
   * Extract query parameters from request
   * @param {Request} req - Express request object
   * @returns {Object} Parsed query parameters
   */
  extractQueryParams(req: Request) {
    const { page, limit, sort, order, search, ...filters } = req.query as Record<string, any>;

    return {
      page: parseInt(page as string, 10) || 1,
      limit: parseInt(limit as string, 10) || 10,
      order: sort && order ? [[sort, order.toUpperCase()]] : [['created_at', 'DESC']],
      search,
      ...filters,
    };
  }

  /**
   * Log request
   * @param {Request} req - Express request object
   * @param {string} action - Action being performed
   */
  logRequest(req: Request, action: string) {
    const requestWithId = req as RequestWithId;
    this.logger.info(`${action} ${this.resourceName}`, {
      requestId: requestWithId.requestId,
      userId: (req as any).user?.id,
      params: req.params,
      query: req.query,
    });
  }
}

export default BaseController;
