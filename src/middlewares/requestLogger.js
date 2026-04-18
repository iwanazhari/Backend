/**
 * Request Logger Middleware
 * Adds request ID and logs request details
 * Follows: Observability best practices from DDIA
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Request ID header name
 */
const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Request Logger Middleware
 * Adds request ID to all requests and logs request/response details
 */
function requestLogger(req, res, next) {
  // Get or generate request ID
  const requestId = req.headers[REQUEST_ID_HEADER.toLowerCase()] || uuidv4();
  req.requestId = requestId;

  // Set request ID in response header
  res.setHeader(REQUEST_ID_HEADER, requestId);

  // Log request
  logger.info(`${req.method} ${req.originalUrl}`, {
    requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    query: req.query,
    params: req.params,
  });

  // Log response on finish
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode}`, {
      requestId,
      duration: `${Date.now() - req.startTime}ms`,
    });
  });

  // Set start time for duration calculation
  req.startTime = Date.now();

  next();
}

module.exports = { requestLogger, REQUEST_ID_HEADER };
