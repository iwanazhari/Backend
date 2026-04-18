/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user to request
 * Follows: Security best practices
 */

const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../errors');
const config = require('../config');
const logger = require('../utils/logger').createChildLogger('auth-middleware');

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null}
 */
function extractToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    logger.warn('Token verification failed:', error.message);
    throw new UnauthorizedError('Invalid or expired token', 'TOKEN_INVALID');
  }
}

/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 */
function authenticate(req, res, next) {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      throw new UnauthorizedError('No token provided', 'TOKEN_REQUIRED');
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication
 * Attaches user if token is valid, but doesn't require it
 */
function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req.headers.authorization);

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
}

/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', 'TOKEN_REQUIRED'));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Authorization failed for user ${req.user.id}. Required roles: ${roles.join(', ')}`);
      return next(new ForbiddenError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS'));
    }

    next();
  };
}

/**
 * Resource ownership authorization
 * Checks if user owns the requested resource
 * @param {string} ownerIdField - Field name containing owner ID in request params/body
 */
function authorizeOwner(ownerIdField = 'userId') {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', 'TOKEN_REQUIRED'));
    }

    const ownerId = req.params[ownerIdField] || req.body[ownerIdField];

    if (!ownerId) {
      return next(new ForbiddenError('Owner ID not found', 'OWNER_ID_MISSING'));
    }

    if (req.user.id !== ownerId && req.user.role !== 'admin') {
      logger.warn(`User ${req.user.id} attempted to access resource owned by ${ownerId}`);
      return next(new ForbiddenError('You can only access your own resources', 'NOT_OWNER'));
    }

    next();
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  authorizeOwner,
  extractToken,
  verifyToken,
};
