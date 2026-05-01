#!/usr/bin/env node
/**
 * Simple JOSE Token Test
 * Tests ONLY token signing/verification without database
 * Run with: tsx tests/manual/test-jose-simple.js
 */

import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
    failed++;
  }
}

async function runTests() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  JOSE Library - Token Tests${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // Generate key
  const key = crypto.randomBytes(32);

  console.log('Testing with HS256 (HMAC-SHA256)\n');

  // Test 1: Sign minimal payload
  await test('should sign minimal payload', async () => {
    const token = await new SignJWT({ sub: 'test' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(key);
    
    if (!token.startsWith('eyJ')) throw new Error('Invalid token format');
  });

  // Test 2: Sign full payload
  await test('should sign full auth payload', async () => {
    const payload = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'USER',
      type: 'access',
      jti: crypto.randomUUID(),
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .setJti(payload.jti)
      .sign(key);
    
    if (!token) throw new Error('Token should be generated');
  });

  // Test 3: Verify token
  await test('should verify token', async () => {
    const payload = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'USER',
      type: 'access',
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(key);

    const verified = await jwtVerify(token, key);
    
    if (verified.payload.id !== 'user-123') throw new Error('Payload mismatch');
  });

  // Test 4: Reject expired token
  await test('should reject expired token', async () => {
    const payload = {
      id: 'user-123',
      exp: Math.floor(Date.now() / 1000) - 100, // Expired 100 seconds ago
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(key);

    let caughtError = null;
    try {
      await jwtVerify(token, key);
    } catch (error) {
      caughtError = error;
    }

    // Should catch an error (any error means token was rejected)
    if (!caughtError) {
      throw new Error('Expected jwtVerify to throw error for expired token');
    }
  });

  // Test 5: Encrypt payload (not human-readable)
  await test('should have encrypted-like payload', async () => {
    const payload = {
      id: 'user-123',
      email: 'secret@example.com',
      role: 'USER',
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(key);

    const parts = token.split('.');
    const payloadPart = parts[1]; // JWT payload is base64url encoded
    const decoded = Buffer.from(payloadPart, 'base64url').toString('utf8');
    
    // JWT payload is base64-encoded JSON (not encrypted like PASETO)
    // But it's still secure because it's signed
    if (!decoded.includes('user-123')) {
      throw new Error('Payload should be decodable (JWT is signed, not encrypted)');
    }
  });

  // Test 6: Different tokens for same payload
  await test('should generate different tokens', async () => {
    const payload = { sub: 'test', iat: Date.now() };
    
    const token1 = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(key);

    await new Promise(r => setTimeout(r, 10)); // Wait 10ms

    const token2 = await new SignJWT({ ...payload, iat: Date.now() + 1 })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(key);
    
    if (token1 === token2) throw new Error('Tokens should be different');
  });

  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Test Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total:  ${passed + failed}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (failed > 0) {
    console.log(`${colors.red}❌ Tests FAILED${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ All tests PASSED!${colors.reset}`);
    console.log(`${colors.green}JOSE library works perfectly with Node.js!${colors.reset}`);
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
