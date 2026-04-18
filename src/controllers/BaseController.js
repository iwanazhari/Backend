/**
 * Base Controller
 * Implements: Controller Pattern from Clean Architecture
 * Follows: Single Responsibility, HTTP Handling
 * 
 * Provides common controller operations that all controllers can inherit
 */

const logger = require('../utils/logger').createChildLogger('controller');

/**
 * Base Controller Class
 */
class BaseController {
  /**
   * @param {BaseService} service - Service instance
   * @param {string} resourceName - Resource name for logging
   */
  constructor(service, resourceName) {
    this.service = service;
    this.resourceName = resourceName;
    this.logger = logger.child({ controller: this.constructor.name });
  }

  /**
   * Send success response
   * @param {Object} res - Express response object
   * @param {any} data - Response data
   * @param {number} statusCode - HTTP status code
   * @param {Object} meta - Additional metadata
   */
  sendSuccess(res, data, statusCode = 200, meta = {}) {
    const response = {
      success: true,
      data,
      ...(Object.keys(meta).length > 0 && { meta }),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   * @param {Object} res - Express response object
   * @param {Object} result - Result with rows and pagination
   * @param {number} statusCode - HTTP status code
   */
  sendPaginated(res, result, statusCode = 200) {
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
   * @param {Object} res - Express response object
   * @param {any} data - Response data
   * @param {string} location - Location header (optional)
   */
  sendCreated(res, data, location = null) {
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
   * @param {Object} res - Express response object
   */
  sendNoContent(res) {
    res.status(204).send();
  }

  /**
   * Handle async errors in controller methods
   * Wraps controller methods to catch errors and pass to next middleware
   * @param {Function} fn - Controller method
   * @returns {Function} Wrapped method
   */
  handle(fn) {
    return (req, res, next) => {
      Promise.resolve(fn.bind(this)(req, res, next)).catch(next);
    };
  }

  /**
   * Extract query parameters from request
   * @param {Object} req - Express request object
   * @returns {Object} Parsed query parameters
   */
  extractQueryParams(req) {
    const { page, limit, sort, order, search, ...filters } = req.query;

    return {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      order: sort && order ? [[sort, order.toUpperCase()]] : [['created_at', 'DESC']],
      search,
      ...filters,
    };
  }

  /**
   * Log request
   * @param {Object} req - Express request object
   * @param {string} action - Action being performed
   */
  logRequest(req, action) {
    this.logger.info(`${action} ${this.resourceName}`, {
      requestId: req.requestId,
      userId: req.user?.id,
      params: req.params,
      query: req.query,
    });
  }
}

module.exports = BaseController;
