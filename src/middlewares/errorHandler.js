/**
 * Error Handling Middleware
 * ES Module version
 * Simple, informative error messages
 */

import config from '../config/index.js';
import logger from '../utils/logger.js';
import { AppError, InternalServerError } from '../errors/index.js';

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';

  // Log error
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${message}`, {
      stack: err.stack,
      body: req.body,
      params: req.params,
      query: req.query,
    });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${message}`, {
      statusCode,
      code,
    });
  }

  // Handle Prisma errors
  if (err.code === 'P2025') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Record not found';
  }

  if (err.code === 'P2002') {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'Duplicate entry';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token expired';
  }

  // Don't leak error details in production
  if (config.app.env === 'production' && statusCode === 500) {
    message = 'Internal server error';
    code = 'INTERNAL_ERROR';
  }

  // Send simple, informative response
  res.status(statusCode).json({
    success: false,
    error: {
      type: err.constructor.name,
      message,
      code,
      at: {
        method: req.method,
        path: req.originalUrl,
      },
    },
  });
}

/**
 * Async handler wrapper
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error) => {
    logger.error(`❌ ${error.constructor.name}: ${error.message}`);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`❌ Unhandled Rejection at: ${promise}`);
    logger.error(`   reason: ${reason?.message || reason}`);
  });
}
