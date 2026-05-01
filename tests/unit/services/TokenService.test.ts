/**
 * TokenService Unit Tests
 *
 * Tests for PASETO V2 token operations via TokenService
 */

import TokenService, { PasetoKeyManager } from '../../../src/services/TokenService.js';
import { UnauthorizedError } from '../../../src/errors/index.js';

describe('TokenService - PASETO V2', () => {
  const testUserId = 'test-user-123';
  const testEmail = 'test@example.com';
  const testRole = 'USER';

  beforeEach(() => {
    if (typeof jest !== 'undefined') {
      jest.clearAllMocks();
    }
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
      
      // Try to verify access token as refresh
      await expect(TokenService.verifyToken(tokens.accessToken, 'refresh'))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date', async () => {
      const tokens = await TokenService.generateTokenPair(testUserId, testEmail, testRole);
      const expiration = TokenService.getTokenExpiration(tokens.accessToken);

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      const expiration = TokenService.getTokenExpiration('invalid');
      expect(expiration).toBeNull();
    });
  });

  describe('PasetoKeyManager', () => {
    it('should cache keys', async () => {
      const manager = PasetoKeyManager.getInstance();
      const key1 = await manager.getKey('test');
      const key2 = await manager.getKey('test');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different names', async () => {
      const manager = PasetoKeyManager.getInstance();
      const key1 = await manager.getKey('test1');
      const key2 = await manager.getKey('test2');

      expect(key1).not.toBe(key2);
    });

    it('should clear cache', async () => {
      const manager = PasetoKeyManager.getInstance();
      await manager.getKey('test');
      manager.clearKeyCache();
      const newKey = await manager.getKey('test');
      expect(newKey).toBeDefined();
    });
  });
});
