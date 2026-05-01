/**
 * Authentication Middleware - PASETO V4
 * Zero Trust: Verify EVERY request
 */

import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '../errors/index.js';
import { createChildLogger } from '../utils/logger.js';
import TokenService from '../services/TokenService.js';

const authLogger = createChildLogger('auth-middleware');

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    jti: string; // PASETO token ID (for single-use tracking)
  };
}

/**
 * Extract token from Authorization header
 * Zero Trust: Support Bearer token only
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Verify PASETO V4 token and extract user info
 * Zero Trust: Verify signature, expiration, and token type
 */
export async function verifyToken(token: string): Promise<{
  id: string;
  email: string;
  role: Role;
  jti: string;
}> {
  try {
    return await TokenService.extractUser(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    authLogger.warn(`PASETO token verification failed: ${message}`);
    throw new UnauthorizedError('Invalid or expired token', 'TOKEN_INVALID');
  }
}

/**
 * Authentication middleware - PASETO V4
 * Zero Trust: Verify EVERY request
 */
export async function authenticate(req: RequestWithUser, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      throw new UnauthorizedError('No token provided', 'TOKEN_REQUIRED');
    }

    const user = await verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication
 * Attaches user if token is valid, but doesn't require it
 */
export async function optionalAuth(req: RequestWithUser, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req.headers.authorization);

    if (token) {
      const decoded = await verifyToken(token);
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
export function authorize(...roles: string[]) {
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', 'TOKEN_REQUIRED'));
    }

    if (!roles.includes(req.user.role)) {
      authLogger.warn(`Authorization failed for user ${req.user.id}. Required roles: ${roles.join(', ')}`);
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
export function authorizeOwner(ownerIdField = 'userId') {
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', 'TOKEN_REQUIRED'));
    }

    const ownerId = req.params?.[ownerIdField] || req.body?.[ownerIdField];

    if (!ownerId) {
      return next(new ForbiddenError('Owner ID not found', 'OWNER_ID_MISSING'));
    }

    if (req.user.id !== ownerId && req.user.role !== 'ADMIN') {
      authLogger.warn(`User ${req.user.id} attempted to access resource owned by ${ownerId}`);
      return next(new ForbiddenError('You can only access your own resources', 'NOT_OWNER'));
    }

    next();
  };
}
