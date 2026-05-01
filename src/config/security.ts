/**
 * Zero Trust Security Configuration
 * Principles:
 * 1. Never trust, always verify
 * 2. Least privilege access
 * 3. Assume breach
 * 4. Verify explicitly
 * 5. Use least-privileged access
 * 6. Assume breach mindset
 */

export interface RequestValidationConfig {
  enabled: boolean;
  validateContentType: boolean;
  allowedContentTypes: string[];
  maxBodySize: string;
  maxJsonSize: string;
  requiredHeaders: string[];
  blockSqlInjection: boolean;
  blockXss: boolean;
  blockPathTraversal: boolean;
}

export interface ApiSecurityConfig {
  requireApiKey: boolean;
  apiKeyRotationDays: number;
  requireSignature: boolean;
  signatureTimestampWindow: number;
}

export interface AuthConfig {
  tokenExpiration: string;
  refreshExpiration: string;
  requireMfaForSensitive: boolean;
  sensitiveOperations: string[];
  maxConcurrentSessions: number;
  sessionTimeout: string;
  maxLoginAttempts: number;
  lockoutDuration: string;
}

export interface AuthorizationConfig {
  defaultPolicy: string;
  requireResourcePermission: boolean;
  requireOwnership: boolean;
  roleHierarchy: Record<string, string[]>;
}

export interface RateLimitTierConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitConfig {
  global: RateLimitTierConfig;
  perUser: RateLimitTierConfig;
  perIp: RateLimitTierConfig;
  sensitive: RateLimitTierConfig;
}

export interface CorsConfig {
  origins: string[];
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
}

export interface HeadersConfig {
  csp: {
    directives: Record<string, string[]>;
  };
  hsts: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  noSniff: boolean;
  noCache: boolean;
}

export interface AuditConfig {
  enabled: boolean;
  logAllRequests: boolean;
  logAuthEvents: boolean;
  logAuthzFailures: boolean;
  logSensitiveOps: boolean;
  logClientInfo: boolean;
  retentionDays: number;
}

export interface NetworkConfig {
  verifyAllRequests: boolean;
  internalApiAuth: boolean;
  verifyWebhookSignatures: boolean;
  blockKnownBadIps: boolean;
  geoBlocking: boolean;
  allowedCountries: string[];
}

export interface DataProtectionConfig {
  encryptSensitiveFields: boolean;
  sensitiveFields: string[];
  maskSensitiveData: boolean;
  classifyData: boolean;
  protectPII: boolean;
}

export interface SecretsConfig {
  autoRotate: boolean;
  rotationIntervalDays: number;
  scanForHardcoded: boolean;
  requireEnvVars: boolean;
  minSecretLength: number;
}

export interface MonitoringConfig {
  realtime: boolean;
  alertOnSuspicious: boolean;
  anomalyDetection: boolean;
  thresholds: {
    failedLogins: number;
    rateLimitViolations: number;
    authzFailures: number;
  };
}

export interface IncidentResponseConfig {
  autoBlock: boolean;
  notifySecurityTeam: boolean;
  preserveEvidence: boolean;
}

export interface SecurityConfig {
  requestValidation: RequestValidationConfig;
  apiSecurity: ApiSecurityConfig;
  auth: AuthConfig;
  authorization: AuthorizationConfig;
  rateLimit: RateLimitConfig;
  cors: CorsConfig;
  headers: HeadersConfig;
  audit: AuditConfig;
  network: NetworkConfig;
  dataProtection: DataProtectionConfig;
  secrets: SecretsConfig;
  monitoring: MonitoringConfig;
  incidentResponse: IncidentResponseConfig;
}

const securityConfig: SecurityConfig = {
  // Request validation
  requestValidation: {
    enabled: true,
    // Validate Content-Type header
    validateContentType: true,
    allowedContentTypes: ['application/json', 'multipart/form-data'],
    // Validate request size
    maxBodySize: '10kb',
    maxJsonSize: '1kb',
    // Validate headers
    requiredHeaders: ['content-type', 'user-agent'],
    // Block suspicious patterns
    blockSqlInjection: true,
    blockXss: true,
    blockPathTraversal: true,
  },

  // API Security
  apiSecurity: {
    // Require API key for all endpoints
    requireApiKey: false, // Set true for external APIs
    // API key rotation (days)
    apiKeyRotationDays: 90,
    // Request signature validation
    requireSignature: false, // Set true for high-security endpoints
    signatureTimestampWindow: 300, // 5 minutes
  },

  // Authentication Security
  auth: {
    // Token settings
    tokenExpiration: '15m', // Short-lived access tokens
    refreshExpiration: '7d',
    // Require MFA for sensitive operations
    requireMfaForSensitive: true,
    sensitiveOperations: ['delete', 'transfer', 'withdraw', 'change_password'],
    // Session security
    maxConcurrentSessions: 5,
    sessionTimeout: '30m',
    // Brute force protection
    maxLoginAttempts: 5,
    lockoutDuration: '15m',
  },

  // Authorization Security
  authorization: {
    // Default deny
    defaultPolicy: 'deny',
    // Require explicit permission for each resource
    requireResourcePermission: true,
    // Check ownership
    requireOwnership: true,
    // Role hierarchy
    roleHierarchy: {
      ADMIN: ['ADMIN', 'MODERATOR', 'USER'],
      MODERATOR: ['MODERATOR', 'USER'],
      USER: ['USER'],
    },
  },

  // Rate Limiting (Zero Trust - limit everyone)
  rateLimit: {
    // Global limit
    global: {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
    },
    // Per-user limit (stricter)
    perUser: {
      windowMs: 60000,
      maxRequests: 60,
    },
    // Per-IP limit
    perIp: {
      windowMs: 60000,
      maxRequests: 30,
    },
    // Sensitive endpoints (very strict)
    sensitive: {
      windowMs: 60000,
      maxRequests: 10,
    },
  },

  // CORS (Strict by default)
  cors: {
    // No wildcard - explicit origins only
    origins: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    // No credentials by default
    credentials: true,
    // Specific methods only
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    // Specific headers only
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
    // Expose limited headers
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
    // Short max age
    maxAge: 600, // 10 minutes
  },

  // Security Headers
  headers: {
    // Content Security Policy
    csp: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    // HSTS (force HTTPS)
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // No sniffing
    noSniff: true,
    // No caching for sensitive data
    noCache: true,
  },

  // Audit Logging (assume breach)
  audit: {
    enabled: true,
    // Log all requests
    logAllRequests: true,
    // Log authentication events
    logAuthEvents: true,
    // Log authorization failures
    logAuthzFailures: true,
    // Log sensitive operations
    logSensitiveOps: true,
    // Log IP and user agent
    logClientInfo: true,
    // Retention (days)
    retentionDays: 90,
  },

  // Network Security
  network: {
    // Trust no one - verify all requests
    verifyAllRequests: true,
    // Internal API authentication
    internalApiAuth: true,
    // Webhook signature verification
    verifyWebhookSignatures: true,
    // Block known bad IPs
    blockKnownBadIps: true,
    // Geo-blocking (optional)
    geoBlocking: false,
    allowedCountries: [],
  },

  // Data Protection
  dataProtection: {
    // Encrypt sensitive fields
    encryptSensitiveFields: true,
    sensitiveFields: ['password', 'ssn', 'creditCard', 'bankAccount'],
    // Mask data in logs
    maskSensitiveData: true,
    // Data classification
    classifyData: true,
    // PII protection
    protectPII: true,
  },

  // Secret Management
  secrets: {
    // Rotate secrets automatically
    autoRotate: true,
    rotationIntervalDays: 30,
    // No hardcoded secrets
    scanForHardcoded: true,
    // Use environment variables only
    requireEnvVars: true,
    // Secret complexity
    minSecretLength: 32,
  },

  // Monitoring & Alerting
  monitoring: {
    // Real-time monitoring
    realtime: true,
    // Alert on suspicious activity
    alertOnSuspicious: true,
    // Anomaly detection
    anomalyDetection: true,
    // Threshold alerts
    thresholds: {
      failedLogins: 10,
      rateLimitViolations: 50,
      authzFailures: 20,
    },
  },

  // Incident Response
  incidentResponse: {
    // Auto-block on breach detection
    autoBlock: true,
    // Notify security team
    notifySecurityTeam: true,
    // Preserve evidence
    preserveEvidence: true,
  },
};

export default securityConfig;
