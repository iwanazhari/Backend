/**
 * 404 Not Found Handler
 * Handles requests to non-existent routes
 */

const { NotFoundError } = require('../errors');

/**
 * 404 Not Found Middleware
 */
function notFoundHandler(req, res, next) {
  const error = new NotFoundError(
    `Route ${req.method} ${req.originalUrl} not found`,
    'ROUTE_NOT_FOUND'
  );
  next(error);
}

module.exports = { notFoundHandler };
