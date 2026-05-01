/**
 * 404 Not Found Handler
 * Handles requests to non-existent routes
 */

import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../errors/index.js';

/**
 * 404 Not Found Middleware
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new NotFoundError(
    `Route ${req.method} ${req.originalUrl} not found`,
    'ROUTE_NOT_FOUND'
  );
  next(error);
}
