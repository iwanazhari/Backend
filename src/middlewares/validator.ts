/**
 * Validation Middleware
 * Uses express-validator for request validation
 * Follows: Input validation best practices
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { BadRequestError } from '../errors/index.js';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validation error handler middleware
 * Must be placed after validation chain in route
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: (error as any).path,
      message: (error as any).msg,
      value: (error as any).value,
    }));

    throw new BadRequestError('Validation failed', 'VALIDATION_ERROR', formattedErrors as any);
  }

  next();
}

/**
 * Validate request with Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {'body' | 'query' | 'params' | 'headers'} source - Request data source
 */
export function validateWithJoi(schema: any, source: 'body' | 'query' | 'params' | 'headers' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const details = error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        throw new BadRequestError('Validation failed', 'VALIDATION_ERROR', details);
      }

      // Replace validated data
      req[source] = value;
      next();
    } catch (error) {
      next(error);
    }
  };
}
