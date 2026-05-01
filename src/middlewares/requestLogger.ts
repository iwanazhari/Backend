/**
 * Request Logger Middleware
 * Adds request ID and logs request details
 * Follows: Observability best practices from DDIA
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('request-logger');

/**
 * Request ID header name
 */
export const REQUEST_ID_HEADER = 'X-Request-ID';

interface RequestWithId extends Partial<Request> {
  requestId?: string;
  startTime?: number;
}

/**
 * Request Logger Middleware
 * Adds request ID to all requests and logs request/response details
 */
export function requestLogger(req: RequestWithId, res: Response, next: NextFunction) {
  // Get or generate request ID
  const requestId = (req.headers[REQUEST_ID_HEADER.toLowerCase()] as string) || uuidv4();
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
      duration: `${Date.now() - (req.startTime || Date.now())}ms`,
    });
  });

  // Set start time for duration calculation
  req.startTime = Date.now();

  next();
}
