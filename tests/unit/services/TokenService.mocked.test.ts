/**
 * TokenService Unit Tests (with PASETO mock)
 *
 * Note: PASETO package has Jest compatibility issues.
 * We mock PASETO for unit tests and rely on integration tests for E2E verification.
 */

// Mock PASETO before importing TokenService
jest.mock('paseto', () => ({
  V2: {
    sign: jest.fn().mockImplementation(async (key: any, payload: any) => {
      return `v2.local.mock.${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
    }),
    verify: jest.fn().mockImplementation(async (key: any, token: string) => {
      if (!token.startsWith('v2.local.mock.')) {
        throw new Error('Invalid token');
      }
      const payloadB64 = token.split('.')[2];
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
      return { payload, footer: undefined };
    }),
    bytesToKeyObject: jest.fn().mockImplementation(async (buffer: Buffer) => {
      return { type: 'key', buffer };
    }),
    keyObjectToBytes: jest.fn().mockImplementation((key: any) => {
      return key.buffer || Buffer.alloc(32);
    }),
  },
}));

import TokenService from '../../../src/services/TokenService.js';
import { UnauthorizedError } from '../../../src/errors/index.js';

describe('TokenService - Unit Tests (Mocked PASETO)', () => {
  const testUserId = 'test-user-123';
  const testEmail = 'test@example.com';
  const testRole = 'USER';

  beforeEach(() => {
    jest.clearAllMocks();
    TokenService.clearKeyCache();
  });

  describe('generateTokenPair', () => {
    it('should generate token pair', async () => {
      const result = await TokenService.generateTokenPair(testUserId, testEmail, testRole);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBe(900);
      expect(result.tokenType).toBe('Bearer');
    });

    it('should generate unique tokens', async () => {
      const result1 = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
      const result2 = await TokenService.generateTokenPair(testUserId, testEmail, testRole);

      expect(result1.accessToken).not.toBe(result2.accessToken);
      expect(result1.refreshToken).not.toBe(result2.refreshToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
      const verified = await TokenService.verifyToken(tokens.accessToken, 'access');

      expect(verified).toBeDefined();
      expect(verified.payload).toBeDefined();
      expect(verified.payload.id).toBe(testUserId);
      expect(verified.payload.email).toBe(testEmail);
    });

    it('should extract user from token', async () => {
      const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
      const user = await TokenService.extractUser(tokens.accessToken);

      expect(user).toEqual({
        id: testUserId,
        email: testEmail,
        role: testRole,
        jti: expect.any(String),
      });
    });

    it('should reject invalid token', async () => {
      await expect(TokenService.verifyToken('invalid-token', 'access'))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should reject wrong token type', async () => {
      const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
      await expect(TokenService.verifyToken(tokens.accessToken, 'refresh'))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date', async () => {
      const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
      const expiration = TokenService.getTokenExpiration(tokens.accessToken);

      expect(expiration).toBeInstanceOf(Date);
    });

    it('should return null for invalid token', () => {
      const expiration = TokenService.getTokenExpiration('invalid');
      expect(expiration).toBeNull();
    });
  });
});
