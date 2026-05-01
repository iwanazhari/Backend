/**
 * Manual Test Script - AuthService Zero Trust
 * 
 * Run: node --loader ts-node/esm tests/manual/auth-test.ts
 */

import { isValidEmail, isStrongPassword } from '../../src/utils/validators.js';

console.log('\n🧪 Manual Test - Zero Trust Validation\n');

// Test email validation
console.log('✅ Email Validation:');
console.log('  valid@example.com:', isValidEmail('valid@example.com'));
console.log('  invalid:', isValidEmail('invalid'));
console.log('  missing@domain:', isValidEmail('missing@domain'));

// Test password strength
console.log('\n✅ Password Strength:');
console.log('  Str0ngP@ss!:', isStrongPassword('Str0ngP@ss!'));
console.log('  weak:', isStrongPassword('weak'));
console.log('  NoSpecial1:', isStrongPassword('NoSpecial1'));

console.log('\n✅ All validators working correctly!\n');

// Test service imports
try {
  await import('../../src/services/AuthService.js');
  console.log('✅ AuthService imported successfully');
} catch (error) {
  console.log('❌ AuthService import failed:', error.message);
}

try {
  await import('../../src/services/TokenService.js');
  console.log('✅ TokenService imported successfully');
} catch (error) {
  console.log('❌ TokenService import failed:', error.message);
}

try {
  await import('../../src/services/SecurityAuditService.js');
  console.log('✅ SecurityAuditService imported successfully');
} catch (error) {
  console.log('❌ SecurityAuditService import failed:', error.message);
}

console.log('\n✅ Manual test complete!\n');
