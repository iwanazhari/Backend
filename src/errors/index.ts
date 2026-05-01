/**
 * Custom Error Classes
 * ES Module version
 * Follows: Fail-fast principle, Explicit error handling
 */

import http from 'http';

/**
 * Base Application Error
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public status: string;
  public details?: any;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.status = http.STATUS_CODES[statusCode] || 'ERROR';

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', code = 'BAD_REQUEST', details = null) {
    super(message, 400, code);
    this.details = details;
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource Not Found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource Conflict', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

/**
 * 422 Unprocessable Entity
 */
export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable Entity', code = 'UNPROCESSABLE_ENTITY', details = null) {
    super(message, 422, code);
    this.details = details;
  }
}

/**
 * 429 Too Many Requests
 */
export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', code = 'TOO_MANY_REQUESTS') {
    super(message, 429, code);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error', code = 'INTERNAL_ERROR') {
    super(message, 500, code, false);
  }
}

/**
 * 503 Service Unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service Unavailable', code = 'SERVICE_UNAVAILABLE') {
    super(message, 503, code);
  }
}
