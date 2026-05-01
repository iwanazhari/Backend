#!/usr/bin/env node
/**
 * Generate Secure PASETO V2 Key
 *
 * Usage:
 *   npm run generate:paseto-key
 *   node scripts/generate-paseto-key.js
 *
 * Output:
 *   - Prints secure 32-byte key in hex format
 *   - Prints ready-to-use .env line
 */

import crypto from 'crypto';

function generatePasetoKey() {
  console.log('🔐 Generating secure PASETO V2 key...\n');

  // Generate 32-byte random key (256 bits)
  const key = crypto.randomBytes(32);
  
  // Convert to hex for storage
  const keyHex = key.toString('hex');

  // Convert to base64 for .env (more compact)
  const keyBase64 = key.toString('base64');

  console.log('✅ PASETO V2 Key Generated!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📝 Hex Format (64 characters):');
  console.log(keyHex);
  console.log('');

  console.log('📝 Base64 Format (44 characters):');
  console.log(keyBase64);
  console.log('');

  console.log('🔧 Add this to your .env file:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`PASETO_SECRET_KEY=${keyBase64}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('💡 Tips:');
  console.log('   - Store this key securely (password manager, 1Password, etc.)');
  console.log('   - Never commit this key to version control');
  console.log('   - Rotate keys periodically (every 30-90 days)');
  console.log('   - Use different keys for dev/staging/production');
  console.log('');
  console.log('🔒 Security:');
  console.log('   - V2 uses AES-256-CTR + HMAC-SHA384');
  console.log('   - 256-bit key provides 128-bit security level');
  console.log('   - Resistant to quantum computer attacks');
  console.log('');
  console.log('🔄 To rotate keys:');
  console.log('   1. Generate new key with this script');
  console.log('   2. Update PASETO_SECRET_KEY in .env');
  console.log('   3. Restart your application');
  console.log('   4. All existing tokens will be invalidated (users need to re-login)');
  console.log('');
}

// Run
try {
  generatePasetoKey();
} catch (error) {
  console.error('❌ Error generating key:', error instanceof Error ? error.message : error);
  process.exit(1);
}
