/**
 * Token Service - JOSE Implementation (PASETO Alternative)
 *
 * JOSE (Javascript Object Signing and Encryption) library
 * - Created by @panva (same author as PASETO)
 * - Actively maintained (updated 2 weeks ago)
 * - Full TypeScript support
 * - Works with Jest/Vitest
 * - More modern and stable than PASETO v3.x
 *
 * Zero Trust Principles:
 * - Short-lived access tokens (15 minutes)
 * - Single-use refresh tokens (stored in DB)
 * - Strong cryptographic verification
 * - Security audit logging
 */

import { SignJWT, jwtVerify } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@prisma/client';
import crypto from 'crypto';
import config from '../config/index.js';
import { UnauthorizedError } from '../errors/index.js';
import { getPrismaClient } from '../config/prisma.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('token-service');

/**
 * Token payload structure
 */
interface TokenPayload {
  id: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  jti: string;
  iat: number;
  exp: number;
}

/**
 * Verified token with payload
 */
interface VerifiedToken {
  payload: TokenPayload;
}

/**
 * Token pair result
 */
interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * Key Manager for JOSE
 * Uses HS256 (HMAC-SHA256) for symmetric encryption
 */
class KeyManager {
  private static instance: KeyManager;
  private keyCache: Map<string, Uint8Array> = new Map();

  private constructor() {}

  static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }
    return KeyManager.instance;
  }

  /**
   * Get or create cached key
   */
  getKey(keyName: string = 'default'): Uint8Array {
    if (this.keyCache.has(keyName)) {
      return this.keyCache.get(keyName)!;
    }

    const secret = config.paseto.secretKey;
    
    // Convert to bytes (try base64 first, then raw string)
    let keyBytes: Uint8Array;
    try {
      keyBytes = Uint8Array.from(Buffer.from(secret, 'base64'));
      if (keyBytes.length < 32) {
        throw new Error('Key too short');
      }
    } catch {
      keyBytes = Uint8Array.from(Buffer.from(secret));
    }

    if (keyBytes.length < 32) {
      throw new Error('Secret key must be at least 32 bytes');
    }

    // Use first 32 bytes for HS256
    const key = keyBytes.slice(0, 32);
    this.keyCache.set(keyName, key);
    
    logger.info('JOSE key initialized', { keyName, keyLength: key.length });
    return key;
  }

  /**
   * Generate new secure key
   */
  generateKey(): Uint8Array {
    return crypto.randomBytes(32);
  }

  /**
   * Clear key cache
   */
  clearKeyCache(): void {
    this.keyCache.clear();
    logger.info('Key cache cleared');
  }
}

class TokenService {
  private keyManager: KeyManager;

  constructor() {
    this.keyManager = KeyManager.getInstance();
  }

  /**
   * Generate token pair (access + refresh)
   */
  async generateTokenPair(
    userId: string,
    email: string,
    role: Role
  ): Promise<TokenPair> {
    const key = this.keyManager.getKey();
    const now = Math.floor(Date.now() / 1000);

    // Access token payload (15 minutes)
    const accessPayload: TokenPayload = {
      id: userId,
      email,
      role: role as string,
      type: 'access',
      jti: uuidv4(),
      iat: now,
      exp: now + 900, // 15 minutes
    };

    // Sign access token with JOSE
    const accessToken = await new SignJWT(accessPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .setJti(accessPayload.jti)
      .sign(key);

    // Refresh token (UUID, stored in DB for 7 days)
    const refreshToken = uuidv4(); // This generates proper UUID format
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Save refresh token to database
    const prisma = getPrismaClient();
    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });

    logger.info('Token pair generated', {
      userId,
      email,
      jti: accessPayload.jti,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify token
   */
  async verifyToken(
    token: string,
    expectedType?: 'access' | 'refresh'
  ): Promise<VerifiedToken> {
    const key = this.keyManager.getKey();

    try {
      const { payload } = await jwtVerify(token, key);

      const tokenPayload = payload as TokenPayload;

      // Validate token type if specified
      if (expectedType && tokenPayload.type !== expectedType) {
        logger.warn('Token type mismatch', {
          expected: expectedType,
          actual: tokenPayload.type,
          jti: tokenPayload.jti,
        });
        throw new UnauthorizedError(
          `Invalid token type. Expected ${expectedType}, got ${tokenPayload.type}`,
          'INVALID_TOKEN_TYPE'
        );
      }

      // Validate required fields
      if (!tokenPayload.id || !tokenPayload.email || !tokenPayload.jti) {
        logger.warn('Token missing required fields');
        throw new UnauthorizedError('Invalid token structure', 'INVALID_TOKEN');
      }

      return { payload: tokenPayload };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      
      logger.warn('Token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnauthorizedError('Invalid token', 'TOKEN_INVALID');
    }
  }

  /**
   * Extract user from token
   */
  async extractUser(token: string): Promise<{
    id: string;
    email: string;
    role: string;
    jti: string;
  }> {
    const verified = await this.verifyToken(token, 'access');
    return {
      id: verified.payload.id,
      email: verified.payload.email,
      role: verified.payload.role,
      jti: verified.payload.jti,
    };
  }

  /**
   * Get token expiration
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Generate new key for rotation
   */
  generateNewKey(): { key: Uint8Array; keyHex: string } {
    const key = this.keyManager.generateKey();
    const keyHex = Buffer.from(key).toString('hex');
    return { key, keyHex };
  }

  /**
   * Clear key cache
   */
  clearKeyCache(): void {
    this.keyManager.clearKeyCache();
  }
}

// Export singleton
export default new TokenService();
export type TokenServiceType = TokenService;
export { KeyManager as PasetoKeyManager };
