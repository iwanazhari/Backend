/**
 * PASETO V2 Token - Unit Tests
 *
 * Tests for:
 * - Key management
 * - Token generation (PASETO V2)
 * - Token verification
 * - Encryption and security features
 *
 * Note: Database operations (refresh token storage) are tested
 * in integration tests. These unit tests focus on PASETO functionality.
 *
 * TDD Approach:
 * - Test token structure before implementation
 * - Test edge cases (expired, invalid, tampered)
 * - Test security features (encryption, signature)
 */

import crypto from 'crypto';
import * as paseto from 'paseto';
import { PasetoKeyManager } from '../../../src/services/TokenService.js';

describe('PASETO V2 Token - Unit Tests', () => {
  // Test data
  const testUserId = 'test-user-123';
  const testEmail = 'test@example.com';
  const testRole = 'USER';

  beforeEach(async () => {
    if (typeof jest !== 'undefined') {
      jest.clearAllMocks();
    }
  });

  describe('Key Management', () => {
    it('should cache keys for performance', async () => {
      const manager = PasetoKeyManager.getInstance();
      const key1 = await manager.getKey('test-key');
      const key2 = await manager.getKey('test-key');

      // Should return same cached key
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different names', async () => {
      const manager = PasetoKeyManager.getInstance();
      const key1 = await manager.getKey('key-1');
      const key2 = await manager.getKey('key-2');

      const bytes1 = paseto.V2.keyObjectToBytes(key1);
      const bytes2 = paseto.V2.keyObjectToBytes(key2);
      
      expect(bytes1).not.toEqual(bytes2);
    });

    it('should clear cache on request', async () => {
      const manager = PasetoKeyManager.getInstance();
      await manager.getKey('test');
      manager.clearKeyCache();

      // After clearing, should generate new key
      const newKey = await manager.getKey('test');
      expect(newKey).toBeDefined();
    });

    it('should generate cryptographically secure keys', async () => {
      const manager = PasetoKeyManager.getInstance();
      const newKey = await manager.generateKey();

      expect(newKey).toBeDefined();
      
      const bytes = paseto.V2.keyObjectToBytes(newKey);
      expect(bytes.length).toBe(32); // 256 bits

      // Verify randomness - two keys should be different
      const key1 = await manager.generateKey();
      const key2 = await manager.generateKey();
      
      const bytes1 = paseto.V2.keyObjectToBytes(key1);
      const bytes2 = paseto.V2.keyObjectToBytes(key2);
      expect(bytes1).not.toEqual(bytes2);
    });

    it('should convert key to hex and back', async () => {
      const manager = PasetoKeyManager.getInstance();
      const originalKey = await manager.generateKey();
      const hex = await manager.keyToHex(originalKey);
      const convertedKey = await manager.hexToKey(hex);

      const originalBytes = paseto.V2.keyObjectToBytes(originalKey);
      const convertedBytes = paseto.V2.keyObjectToBytes(convertedKey);
      
      expect(Buffer.from(originalBytes).toString('hex')).toBe(hex);
      expect(Buffer.from(convertedBytes).toString('hex')).toBe(hex);
    });

    it('should accept base64 encoded keys', async () => {
      const validBase64 = crypto.randomBytes(32).toString('base64');
      
      const originalEnv = process.env.PASETO_SECRET_KEY;
      process.env.PASETO_SECRET_KEY = validBase64;
      
      const manager = PasetoKeyManager.getInstance();
      manager.clearKeyCache();
      
      expect(async () => await manager.getKey('test')).not.toThrow();

      process.env.PASETO_SECRET_KEY = originalEnv;
    });
  });

  describe('Token Generation (PASETO V2)', () => {
    it('should generate valid PASETO V2 token', async () => {
      const manager = PasetoKeyManager.getInstance();
      const key = await manager.getKey();
      
      const payload = {
        id: testUserId,
        email: testEmail,
        role: testRole,
        type: 'access',
        jti: 'test-jti-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      const token: any = paseto.V2.sign(key, payload);
      const tokenStr = token.toString();

      expect(tokenStr).toBeDefined();
      expect(tokenStr).toMatch(/^v2\.local\./);
    });

    it('should encrypt payload (not human-readable)', async () => {
      const manager = PasetoKeyManager.getInstance();
      const key = await manager.getKey();
      
      const payload = {
        id: testUserId,
        email: testEmail,
        role: testRole,
        type: 'access',
        jti: 'test-jti-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      const token: any = paseto.V2.sign(key, payload);
      const tokenStr = token.toString();
      const parts = tokenStr.split('.');
      const payloadPart = parts[2];
      const decoded = Buffer.from(payloadPart, 'base64').toString('utf8');
      
      // Encrypted payload should not contain plain text
      expect(decoded).not.toContain(testEmail);
      expect(decoded).not.toContain(testUserId);
    });

    it('should generate unique tokens for same payload', async () => {
      const manager = PasetoKeyManager.getInstance();
      const key = await manager.getKey();
      
      const payload = {
        id: testUserId,
        email: testEmail,
        role: testRole,
        type: 'access',
        jti: 'test-jti-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      const token1: any = paseto.V2.sign(key, payload);
      const token2: any = paseto.V2.sign(key, payload);

      // PASETO includes nonce, so tokens should be different even with same payload
      expect(token1.toString()).not.toBe(token2.toString());
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token successfully', async () => {
      const manager = PasetoKeyManager.getInstance();
      const key = await manager.getKey();
      
      const payload = {
        id: testUserId,
        email: testEmail,
        role: testRole,
        type: 'access',
        jti: 'test-jti-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      const token: any = paseto.V2.sign(key, payload);
      const verified: any = paseto.V2.verify(key, token);

      expect(verified.payload.id).toBe(testUserId);
      expect(verified.payload.email).toBe(testEmail);
      expect(verified.payload.role).toBe(testRole);
    });

    it('should reject tampered tokens', async () => {
      const manager = PasetoKeyManager.getInstance();
      const key = await manager.getKey();
      
      const payload = {
        id: testUserId,
        email: testEmail,
        role: testRole,
        type: 'access',
        jti: 'test-jti-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      const token: any = paseto.V2.sign(key, payload);
      const tokenStr = token.toString();
      const tamperedToken = tokenStr.slice(0, -5) + 'XXXXX';

      expect(() => paseto.V2.verify(key, tamperedToken)).toThrow();
    });

    it('should reject expired tokens', async () => {
      const manager = PasetoKeyManager.getInstance();
      const key = await manager.getKey();
      
      const expiredPayload = {
        id: testUserId,
        email: testEmail,
        role: testRole,
        type: 'access',
        jti: 'test-jti-123',
        iat: Math.floor(Date.now() / 1000) - 1000,
        exp: Math.floor(Date.now() / 1000) - 100, // Expired 100 seconds ago
      };

      const token: any = paseto.V2.sign(key, expiredPayload);

      expect(() => paseto.V2.verify(key, token)).toThrow();
    });

    it('should reject invalid tokens', () => {
      const manager = PasetoKeyManager.getInstance();
      const key = manager.getKey(); // sync ok for getting cached key
      const invalidToken = 'v2.local.invalid-token-data';

      expect(() => paseto.V2.verify(key, invalidToken)).toThrow();
    });
  });

  describe('Token Decode (without verification)', () => {
    it('should decode token without verification', () => {
      const manager = PasetoKeyManager.getInstance();
      const key = manager.getKey();
      
      const payload = {
        id: testUserId,
        email: testEmail,
        role: testRole,
        type: 'access',
        jti: 'test-jti-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      const token = paseto.V2.sign(key, payload);
      const decoded = paseto.decode(token);

      expect(decoded.version).toBe('v2');
      expect(decoded.purpose).toBe('local');
    });

    it('should return null for malformed token', () => {
      const decoded = paseto.decode('not-a-paseto-token');
      expect(decoded).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in email', () => {
      const manager = PasetoKeyManager.getInstance();
      const key = manager.getKey();
      const specialEmail = 'user+tag@example.co.uk';
      
      const payload = {
        id: testUserId,
        email: specialEmail,
        role: testRole,
        type: 'access',
        jti: 'test-jti-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      const token = paseto.V2.sign(key, payload);
      const verified = paseto.V2.verify(key, token);

      expect(verified.payload.email).toBe(specialEmail);
    });

    it('should handle very long emails', () => {
      const manager = PasetoKeyManager.getInstance();
      const key = manager.getKey();
      const longEmail = 'a'.repeat(200) + '@example.com';
      
      const payload = {
        id: testUserId,
        email: longEmail,
        role: testRole,
        type: 'access',
        jti: 'test-jti-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      const token = paseto.V2.sign(key, payload);
      const verified = paseto.V2.verify(key, token);

      expect(verified.payload.email).toBe(longEmail);
    });

    it('should handle different roles', () => {
      const manager = PasetoKeyManager.getInstance();
      const key = manager.getKey();
      const roles = ['USER', 'ADMIN', 'MODERATOR'];

      for (const role of roles) {
        const payload = {
          id: testUserId,
          email: testEmail,
          role: role,
          type: 'access',
          jti: 'test-jti-123',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 900,
        };

        const token = paseto.V2.sign(key, payload);
        const verified = paseto.V2.verify(key, token);

        expect(verified.payload.role).toBe(role);
      }
    });
  });
});
