/**
 * Authenticate Middleware Unit Tests - PASETO V2
 *
 * Tests for:
 * - Token extraction from headers
 * - Token verification
 * - User authentication
 * - Role-based authorization
 * - Resource ownership authorization
 *
 * TDD Approach:
 * - Test authentication flow
 * - Test authorization scenarios
 * - Test edge cases (missing token, invalid token, etc.)
 */

import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import {
  extractToken,
  verifyToken,
  authenticate,
  optionalAuth,
  authorize,
  authorizeOwner,
  RequestWithUser,
} from '../../../src/middlewares/authenticate.js';
import TokenService from '../../../src/services/TokenService.js';
import { UnauthorizedError, ForbiddenError } from '../../../src/errors/index.js';

// Mock TokenService
jest.mock('../../../src/services/TokenService.js', () => ({
  extractUser: jest.fn(),
  verifyToken: jest.fn(),
}));

describe('Authenticate Middleware - PASETO V2', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('extractToken', () => {
    it('should extract token from Bearer header', () => {
      const token = 'v2.local.abc123';
      const authHeader = `Bearer ${token}`;

      const result = extractToken(authHeader);

      expect(result).toBe(token);
    });

    it('should return null for missing header', () => {
      const result = extractToken(undefined);
      expect(result).toBeNull();
    });

    it('should return null for non-Bearer header', () => {
      const result = extractToken('Basic abc123');
      expect(result).toBeNull();
    });

    it('should return null for empty header', () => {
      const result = extractToken('');
      expect(result).toBeNull();
    });

    it('should handle case-sensitive Bearer', () => {
      const result = extractToken('bearer abc123');
      expect(result).toBeNull();
    });

    it('should handle extra spaces', () => {
      const token = 'v2.local.abc123';
      const authHeader = `Bearer  ${token}`; // Extra space

      const result = extractToken(authHeader);

      expect(result).toBe(token);
    });
  });

  describe('verifyToken', () => {
    const mockToken = 'v2.local.test-token';
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'USER' as Role,
      jti: 'token-jti-123',
    };

    it('should return user info for valid token', async () => {
      (TokenService.extractUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await verifyToken(mockToken);

      expect(result).toEqual(mockUser);
      expect(TokenService.extractUser).toHaveBeenCalledWith(mockToken);
    });

    it('should throw UnauthorizedError for invalid token', async () => {
      (TokenService.extractUser as jest.Mock).mockRejectedValue(
        new UnauthorizedError('Invalid token', 'TOKEN_INVALID')
      );

      await expect(verifyToken(mockToken)).rejects.toThrow(UnauthorizedError);
      await expect(verifyToken(mockToken)).rejects.toThrow('TOKEN_INVALID');
    });

    it('should throw UnauthorizedError with TOKEN_INVALID for any error', async () => {
      (TokenService.extractUser as jest.Mock).mockRejectedValue(
        new Error('Some random error')
      );

      await expect(verifyToken(mockToken)).rejects.toThrow(UnauthorizedError);
      await expect(verifyToken(mockToken)).rejects.toThrow('TOKEN_INVALID');
    });
  });

  describe('authenticate', () => {
    const mockToken = 'v2.local.test-token';
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'USER' as Role,
      jti: 'token-jti-123',
    };

    beforeEach(() => {
      mockRequest = {
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      };
    });

    it('should authenticate user with valid token', async () => {
      (TokenService.extractUser as jest.Mock).mockResolvedValue(mockUser);

      await authenticate(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error when token is missing', async () => {
      mockRequest.headers = {};

      await authenticate(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No token provided',
          code: 'TOKEN_REQUIRED',
        })
      );
    });

    it('should call next with error when token is invalid', async () => {
      (TokenService.extractUser as jest.Mock).mockRejectedValue(
        new UnauthorizedError('Invalid token', 'TOKEN_INVALID')
      );

      await authenticate(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should handle malformed authorization header', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      };

      await authenticate(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe('optionalAuth', () => {
    const mockToken = 'v2.local.test-token';
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'USER' as Role,
      jti: 'token-jti-123',
    };

    it('should attach user when valid token provided', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };
      (TokenService.extractUser as jest.Mock).mockResolvedValue(mockUser);

      await optionalAuth(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should not attach user when no token provided', async () => {
      mockRequest.headers = {};

      await optionalAuth(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should ignore invalid tokens', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };
      (TokenService.extractUser as jest.Mock).mockRejectedValue(
        new UnauthorizedError('Invalid', 'TOKEN_INVALID')
      );

      await optionalAuth(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('authorize', () => {
    it('should allow access for matching role', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER' as Role,
        jti: 'token-jti',
      };

      const middleware = authorize('USER');
      middleware(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access for ADMIN when ADMIN role required', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN' as Role,
        jti: 'token-jti',
      };

      const middleware = authorize('ADMIN');
      middleware(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access when user has one of multiple roles', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'MODERATOR' as Role,
        jti: 'token-jti',
      };

      const middleware = authorize('USER', 'MODERATOR');
      middleware(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for non-matching role', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER' as Role,
        jti: 'token-jti',
      };

      const middleware = authorize('ADMIN');
      middleware(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INSUFFICIENT_PERMISSIONS',
        })
      );
    });

    it('should deny access when user is not authenticated', () => {
      mockRequest.user = undefined;

      const middleware = authorize('USER');
      middleware(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TOKEN_REQUIRED',
        })
      );
    });
  });

  describe('authorizeOwner', () => {
    it('should allow access when user owns resource', () => {
      mockRequest.user = {
        id: 'owner-123',
        email: 'test@example.com',
        role: 'USER' as Role,
        jti: 'token-jti',
      };
      mockRequest.params = { userId: 'owner-123' };

      const middleware = authorizeOwner('userId');
      middleware(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access when user is ADMIN', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN' as Role,
        jti: 'token-jti',
      };
      mockRequest.params = { userId: 'other-user' };

      const middleware = authorizeOwner('userId');
      middleware(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access when resource ID in body', () => {
      mockRequest.user = {
        id: 'owner-123',
        email: 'test@example.com',
        role: 'USER' as Role,
        jti: 'token-jti',
      };
      mockRequest.body = { userId: 'owner-123' };

      const middleware = authorizeOwner('userId');
      middleware(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when user does not own resource', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER' as Role,
        jti: 'token-jti',
      };
      mockRequest.params = { userId: 'other-user' };

      const middleware = authorizeOwner('userId');
      middleware(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'NOT_OWNER',
        })
      );
    });

    it('should deny access when owner ID is missing', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER' as Role,
        jti: 'token-jti',
      };
      mockRequest.params = {};
      mockRequest.body = {};

      const middleware = authorizeOwner('userId');
      middleware(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'OWNER_ID_MISSING',
        })
      );
    });

    it('should deny access when user is not authenticated', () => {
      mockRequest.user = undefined;

      const middleware = authorizeOwner('userId');
      middleware(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TOKEN_REQUIRED',
        })
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should chain authenticate and authorize correctly', async () => {
      const mockToken = 'v2.local.test-token';
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER' as Role,
        jti: 'token-jti',
      };

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };
      mockRequest.params = { userId: mockUser.id };

      (TokenService.extractUser as jest.Mock).mockResolvedValue(mockUser);

      // First authenticate
      await authenticate(mockRequest as RequestWithUser, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Then authorize owner
      const ownerMiddleware = authorizeOwner('userId');
      ownerMiddleware(mockRequest as RequestWithUser, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail authorization when authentication fails', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (TokenService.extractUser as jest.Mock).mockRejectedValue(
        new UnauthorizedError('Invalid', 'TOKEN_INVALID')
      );

      await authenticate(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      // Should have called next with error
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));

      // Reset next for next test
      jest.clearAllMocks();
      mockNext = jest.fn();

      // Authorization should not proceed
      const authMiddleware = authorize('USER');
      authMiddleware(mockRequest as RequestWithUser, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });
});
