/**
 * Shared Validators
 * Reusable validation functions across layers
 * Follows: DRY principle, Single Responsibility
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength - Zero Trust requirement
 * Min 8 chars, uppercase, lowercase, number, special char
 */
export function isStrongPassword(password: string): boolean {
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get client IP from request (handle proxies)
 */
export function getClientIp(headers: { get?: (name: string) => string | undefined }): string {
  const forwarded = headers.get?.('X-Forwarded-For');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}
