/**
 * API Key Model (Prisma)
 * For Zero Trust API authentication
 * Features:
 * - Key rotation
 * - Expiration
 * - Rate limiting per key
 * - Audit trail
 */

// Add to prisma/schema.prisma:
/*
model ApiKey {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   // Key name/description
  key         String   @unique // Hashed API key
  keyPrefix   String   @map("key_prefix") // First 8 chars for identification
  userId      String   @map("user_id")
  permissions String[] // ['read', 'write', 'delete']
  expiresAt   DateTime? @map("expires_at")
  lastUsedAt  DateTime? @map("last_used_at")
  rotatedAt   DateTime? @map("rotated_at")
  revokedAt   DateTime? @map("revoked_at")
  revokeReason String? @map("revoke_reason")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  user        User     @relation(fields: [userId], references: [id])
  
  // Indexes
  @@index([key])
  @@index([userId])
  @@index([expiresAt])
  @@index([keyPrefix])
  @@map("api_keys")
}

model SecurityAudit {
  id          String   @id @default(uuid()) @db.Uuid
  eventType   String   @map("event_type") // LOGIN, LOGOUT, API_CALL, etc
  eventLevel  String   @map("event_level") // INFO, WARN, ERROR, CRITICAL
  userId      String?  @map("user_id")
  ipAddress   String   @map("ip_address")
  userAgent   String?  @map("user_agent")
  path        String?
  method      String?
  statusCode  Int?     @map("status_code")
  metadata    Json?    // Additional context
  createdAt   DateTime @default(now()) @map("created_at")
  
  // Indexes
  @@index([eventType])
  @@index([userId])
  @@index([ipAddress])
  @@index([createdAt])
  @@index([eventLevel])
  @@map("security_audits")
}
*/

const { getPrismaClient } = require('../config/prisma');
const crypto = require('crypto');

const prisma = getPrismaClient();

/**
 * Generate secure API key
 * @returns {string}
 */
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash API key for storage
 * @param {string} apiKey
 * @returns {string}
 */
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Get key prefix for identification
 * @param {string} apiKey
 * @returns {string}
 */
function getKeyPrefix(apiKey) {
  return apiKey.substring(0, 8);
}

/**
 * Create new API key
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function createApiKey(data) {
  const rawKey = generateApiKey();
  const hashedKey = hashApiKey(rawKey);
  const keyPrefix = getKeyPrefix(rawKey);
  
  const apiKey = await prisma.apiKey.create({
    data: {
      name: data.name,
      key: hashedKey,
      keyPrefix,
      userId: data.userId,
      permissions: data.permissions || ['read'],
      expiresAt: data.expiresAt || null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      expiresAt: true,
      createdAt: true,
    },
  });
  
  // Return raw key only once (for user to save)
  return {
    ...apiKey,
    rawKey, // IMPORTANT: Show this only once!
  };
}

/**
 * Validate API key
 * @param {string} apiKey
 * @returns {Promise<Object|null>}
 */
async function validateApiKey(apiKey) {
  if (!apiKey) {
    return null;
  }
  
  const hashedKey = hashApiKey(apiKey);
  
  const key = await prisma.apiKey.findFirst({
    where: {
      key: hashedKey,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      },
    },
  });
  
  if (!key) {
    return null;
  }
  
  // Update last used
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });
  
  return key;
}

/**
 * Rotate API key
 * @param {string} keyId
 * @returns {Promise<Object>}
 */
async function rotateApiKey(keyId) {
  const rawKey = generateApiKey();
  const hashedKey = hashApiKey(rawKey);
  const keyPrefix = getKeyPrefix(rawKey);
  
  const apiKey = await prisma.apiKey.update({
    where: { id: keyId },
    data: {
      key: hashedKey,
      keyPrefix,
      rotatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      expiresAt: true,
      rotatedAt: true,
    },
  });
  
  return {
    ...apiKey,
    rawKey, // Show new key only once
  };
}

/**
 * Revoke API key
 * @param {string} keyId
 * @param {string} reason
 * @returns {Promise<void>}
 */
async function revokeApiKey(keyId, reason = 'user_requested') {
  await prisma.apiKey.update({
    where: { id: keyId },
    data: {
      revokedAt: new Date(),
      revokeReason: reason,
    },
  });
}

/**
 * Log security event
 * @param {Object} event
 */
async function logSecurityEvent(event) {
  await prisma.securityAudit.create({
    data: {
      eventType: event.type,
      eventLevel: event.level || 'INFO',
      userId: event.userId,
      ipAddress: event.ip,
      userAgent: event.userAgent,
      path: event.path,
      method: event.method,
      statusCode: event.statusCode,
      metadata: event.metadata,
    },
  });
}

/**
 * Get security events for user
 * @param {string} userId
 * @param {Object} options
 */
async function getUserSecurityEvents(userId, { page = 1, limit = 50 } = {}) {
  const skip = (page - 1) * limit;
  
  const events = await prisma.securityAudit.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });
  
  const total = await prisma.securityAudit.count({
    where: { userId },
  });
  
  return {
    events,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Cleanup expired keys
 */
async function cleanupExpiredKeys() {
  const result = await prisma.apiKey.updateMany({
    where: {
      expiresAt: { lt: new Date() },
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokeReason: 'expired',
    },
  });
  
  return result.count;
}

module.exports = {
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  createApiKey,
  validateApiKey,
  rotateApiKey,
  revokeApiKey,
  logSecurityEvent,
  getUserSecurityEvents,
  cleanupExpiredKeys,
};
