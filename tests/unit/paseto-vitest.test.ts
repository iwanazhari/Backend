/**
 * PASETO V2 Test with Vitest
 * 
 * This test proves Vitest + PASETO compatibility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as paseto from 'paseto';
import crypto from 'crypto';

describe('PASETO V2 - Vitest Compatibility', () => {
  let key: any;

  beforeEach(async () => {
    const keyBuffer = crypto.randomBytes(32);
    key = await paseto.V2.bytesToKeyObject(keyBuffer, 'local');
  });

  it('should create PASETO V2 key', async () => {
    expect(key).toBeDefined();
  });

  it('should sign token with PASETO V2', async () => {
    const payload = Object.freeze({
      id: 'user-123',
      email: 'test@example.com',
      role: 'USER',
      exp: Math.floor(Date.now() / 1000) + 900,
    });

    const token = await paseto.V2.sign(key, payload);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token).toMatch(/^v2\.local\./);
  });

  it('should verify PASETO V2 token', async () => {
    const payload = Object.freeze({
      id: 'user-123',
      email: 'test@example.com',
      role: 'USER',
      exp: Math.floor(Date.now() / 1000) + 900,
    });

    const token = await paseto.V2.sign(key, payload);
    const verified = await paseto.V2.verify(key, token);

    expect(verified).toBeDefined();
    expect(verified.payload.id).toBe('user-123');
    expect(verified.payload.email).toBe('test@example.com');
  });

  it('should reject expired tokens', async () => {
    const payload = Object.freeze({
      id: 'user-123',
      email: 'test@example.com',
      role: 'USER',
      exp: Math.floor(Date.now() / 1000) - 100, // Expired
    });

    const token = await paseto.V2.sign(key, payload);

    await expect(paseto.V2.verify(key, token)).rejects.toThrow();
  });

  it('should encrypt payload (not human-readable)', async () => {
    const payload = Object.freeze({
      id: 'user-123',
      email: 'secret@example.com',
      role: 'USER',
      exp: Math.floor(Date.now() / 1000) + 900,
    });

    const token = await paseto.V2.sign(key, payload);
    const parts = token.split('.');
    const payloadPart = parts[2];
    const decoded = Buffer.from(payloadPart, 'base64').toString('utf8');

    // Encrypted payload should not contain plain text
    expect(decoded).not.toContain('secret@example.com');
    expect(decoded).not.toContain('user-123');
  });
});
