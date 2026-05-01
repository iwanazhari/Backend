/**
 * Express Authentication Middleware
 *
 * Protects routes with PASETO V2 token verification
 *
 * Usage:
 * ```typescript
 * import { authMiddleware } from '@authboilerplate/express';
 *
 * // Protect single route
 * app.get('/profile', authMiddleware(), (req, res) => { ... });
 *
 * // Protect multiple routes
 * app.use('/admin', authMiddleware({ roles: ['ADMIN'] }));
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import { ExpressAdapter } from './ExpressAdapter.js';
import TokenService from '../../services/TokenService.js';
import { ILogger } from '../../core/interfaces/index.js';

export interface AuthMiddlewareOptions {
  roles?: string[];
  optional?: boolean;
  logger?: ILogger;
}

export interface ExpressRequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    jti: string;
  };
}

/**
 * Extract token from request
 * Checks Authorization header and cookies
 */
function extractToken(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies
  const tokenFromCookie = req.cookies?.accessToken;
  if (tokenFromCookie) {
    return tokenFromCookie;
  }

  return null;
}

/**
 * Authentication middleware factory
 */
export function authMiddleware(options?: AuthMiddlewareOptions) {
  return async (
    req: ExpressRequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const logger = options?.logger || console;

    try {
      const token = extractToken(req);

      // No token found
      if (!token) {
        if (options?.optional) {
          // Optional auth - continue without user
          return next();
        }
        
        res.status(401).json({
          success: false,
          error: {
            type: 'UnauthorizedError',
            message: 'No token provided',
            code: 'TOKEN_REQUIRED',
          },
        });
        return;
      }

      // Verify token
      const user = await TokenService.extractUser(token);
      req.user = user;

      // Check roles if specified
      if (options?.roles && options.roles.length > 0) {
        if (!options.roles.includes(user.role)) {
          res.status(403).json({
            success: false,
            error: {
              type: 'ForbiddenError',
              message: 'Insufficient permissions',
              code: 'INSUFFICIENT_PERMISSIONS',
            },
          });
          return;
        }
      }

      logger.info('User authenticated', { userId: user.id, email: user.email });
      next();
    } catch (error) {
      logger.error('Authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (options?.optional) {
        // Optional auth - continue without user even on error
        return next();
      }

      res.status(401).json({
        success: false,
        error: {
          type: 'UnauthorizedError',
          message: 'Invalid or expired token',
          code: 'TOKEN_INVALID',
        },
      });
    }
  };
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export function optionalAuthMiddleware(logger?: ILogger) {
  return authMiddleware({ optional: true, logger });
}

/**
 * Role-based authorization middleware
 * Can be used standalone or after authMiddleware
 */
export function authorizeRoles(...roles: string[]) {
  return (req: ExpressRequestWithUser, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          type: 'UnauthorizedError',
          message: 'Authentication required',
          code: 'TOKEN_REQUIRED',
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          type: 'ForbiddenError',
          message: `Required roles: ${roles.join(', ')}`,
          code: 'INSUFFICIENT_PERMISSIONS',
        },
      });
      return;
    }

    next();
  };
}

export default authMiddleware;
