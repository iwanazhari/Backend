/**
 * Validation Middleware
 * Uses express-validator for request validation
 * Follows: Input validation best practices
 */

const { validationResult } = require('express-validator');
const { BadRequestError } = require('../errors');

/**
 * Validation error handler middleware
 * Must be placed after validation chain in route
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));

    throw new BadRequestError('Validation failed', 'VALIDATION_ERROR', formattedErrors);
  }

  next();
}

/**
 * Validate request with Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {'body' | 'query' | 'params' | 'headers'} source - Request data source
 */
function validateWithJoi(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const details = error.details.map((detail) => ({
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

module.exports = {
  handleValidationErrors,
  validateWithJoi,
};
