/**
 * Core Interfaces for Framework-Agnostic Auth
 *
 * These interfaces define the contracts that all adapters must implement
 * to ensure framework-agnostic core services.
 */

/**
 * Cookie options for setting cookies across frameworks
 */
export interface CookieOptions {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  domain?: string;
  signed?: boolean;
}

/**
 * Authentication adapter interface
 * Abstracts framework-specific request/response handling
 */
export interface IAuthAdapter {
  // Request accessors
  getRequest(): any;
  getResponse(): any;
  getBody(): any;
  getParams(): any;
  getQuery(): any;
  getHeaders(): any;

  // Response methods
  setHeader(key: string, value: string): void;
  setStatus(code: number): void;
  send(data: any): void;
  redirect(url: string): void;

  // Cookie management
  setCookie(name: string, value: string, options?: CookieOptions): void;
  clearCookie(name: string): void;
  getCookie(name: string): string | undefined;

  // Client information
  getClientIP(): string;
  getUserAgent(): string;
  isSecure(): boolean;
}

/**
 * Repository interface for database operations
 * Framework and ORM agnostic
 */
export interface IRepository<T = any> {
  // Basic CRUD
  findById(id: string): Promise<T | null>;
  findByEmail(email: string): Promise<T | null>;
  findByEmailWithPassword(email: string): Promise<any | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;

  // User-specific queries
  updateLastLogin(id: string): Promise<void>;
  comparePassword(password: string, hash: string): Promise<boolean>;
}

/**
 * Email provider interface
 * Abstracts different email services
 */
export interface IEmailProvider {
  sendEmail(options: EmailOptions): Promise<void>;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * SMS provider interface
 * Abstracts different SMS services
 */
export interface ISMSProvider {
  sendSMS(options: SMSOptions): Promise<void>;
}

export interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

/**
 * Cache provider interface
 * Abstracts different caching systems
 */
export interface ICacheProvider {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

/**
 * Logger interface
 * Abstracts different logging systems
 */
export interface ILogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

/**
 * Token service interface
 */
export interface ITokenService {
  generateTokenPair(userId: string, email: string, role: string): Promise<TokenPair>;
  verifyToken(token: string, expectedType?: 'access' | 'refresh'): Promise<VerifiedToken>;
  extractUser(token: string): Promise<UserInfo>;
  getTokenExpiration(token: string): Date | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface VerifiedToken {
  payload: any;
  footer?: any;
}

export interface UserInfo {
  id: string;
  email: string;
  role: string;
  jti: string;
}

/**
 * Configuration interface
 */
export interface AuthConfig {
  // Token configuration
  pasetoSecretKey: string;
  tokenExpiration: number; // in seconds (default: 900 = 15 min)
  refreshExpiration: number; // in days (default: 7)

  // Security configuration
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
  requireEmailVerification: boolean;
  require2FA: boolean;

  // Session configuration
  maxConcurrentSessions: number;

  // Magic Link configuration
  magicLinkExpiration: number; // in minutes (default: 15)

  // OTP configuration
  otpLength: number; // default: 6
  otpExpiration: number; // in minutes (default: 10)

  // OAuth configuration
  oauth?: {
    google?: OAuthConfig;
    github?: OAuthConfig;
    microsoft?: OAuthConfig;
    linkedin?: OAuthConfig;
  };

  // Email configuration
  email?: {
    from: string;
    provider: IEmailProvider;
  };

  // SMS configuration
  sms?: {
    provider: ISMSProvider;
  };

  // Cache configuration
  cache?: ICacheProvider;

  // Logger
  logger?: ILogger;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackURL: string;
  scope?: string[];
}

/**
 * User entity interface
 */
export interface IUser {
  id: string;
  email: string;
  password?: string;
  firstName: string;
  lastName?: string;
  role: string;
  status: UserStatus;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BANNED';

/**
 * Session entity interface
 */
export interface ISession {
  id: string;
  userId: string;
  refreshToken: string;
  deviceInfo?: DeviceInfo;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  revokedAt?: Date;
  revokeReason?: string;
  createdAt: Date;
}

export interface DeviceInfo {
  deviceId?: string;
  deviceName?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  os?: string;
  browser?: string;
}

/**
 * Audit log entity interface
 */
export interface IAuditLog {
  id: string;
  eventType: AuditEventType;
  eventLevel: AuditEventLevel;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  metadata?: any;
  createdAt: Date;
}

export type AuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'REGISTER_SUCCESS'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_SUCCESS'
  | '2FA_ENABLED'
  | '2FA_VERIFIED'
  | '2FA_DISABLED'
  | 'MAGIC_LINK_REQUESTED'
  | 'MAGIC_LINK_VERIFIED'
  | 'OTP_SENT'
  | 'OTP_VERIFIED'
  | 'OAUTH_LOGIN'
  | 'SUSPICIOUS_ACTIVITY'
  | 'RATE_LIMIT_EXCEEDED'
  | 'TOKEN_REVOKED';

export type AuditEventLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

/**
 * Result types for auth operations
 */
export interface AuthResult<T = any> {
  success: boolean;
  data?: T;
  error?: AuthError;
}

export interface AuthError {
  type: string;
  message: string;
  code: string;
  details?: any;
}

/**
 * Magic Link types
 */
export interface MagicLinkRequest {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

/**
 * OTP types
 */
export interface OTPRequest {
  id: string;
  userId?: string;
  identifier: string; // email or phone
  code: string;
  type: 'email' | 'sms';
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}
