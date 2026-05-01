/**
 * Test Utilities
 *
 * Common utilities for testing
 */

/**
 * Mock Email Provider
 */
export class MockEmailProvider {
  public sentEmails: Array<{
    to: string;
    subject: string;
    html: string;
    text?: string;
  }> = [];

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    this.sentEmails.push(options);
  }

  clear(): void {
    this.sentEmails = [];
  }

  getLastEmail(): typeof this.sentEmails[0] {
    return this.sentEmails[this.sentEmails.length - 1];
  }
}

/**
 * Mock SMS Provider
 */
export class MockSMSProvider {
  public sentSMS: Array<{
    to: string;
    message: string;
  }> = [];

  async sendSMS(options: { to: string; message: string }): Promise<void> {
    this.sentSMS.push(options);
  }

  clear(): void {
    this.sentSMS = [];
  }

  getLastSMS(): typeof this.sentSMS[0] {
    return this.sentSMS[this.sentSMS.length - 1];
  }
}

/**
 * Mock Cache Provider (Memory)
 */
export class MockCacheProvider {
  private cache: Map<string, any> = new Map();

  async get(key: string): Promise<any> {
    return this.cache.get(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.cache.set(key, value);
    
    if (ttl) {
      setTimeout(() => {
        this.cache.delete(key);
      }, ttl * 1000);
    }
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Mock Logger
 */
export class MockLogger {
  public logs: Array<{
    level: string;
    message: string;
    meta?: any;
  }> = [];

  debug(message: string, meta?: any): void {
    this.logs.push({ level: 'debug', message, meta });
  }

  info(message: string, meta?: any): void {
    this.logs.push({ level: 'info', message, meta });
  }

  warn(message: string, meta?: any): void {
    this.logs.push({ level: 'warn', message, meta });
  }

  error(message: string, meta?: any): void {
    this.logs.push({ level: 'error', message, meta });
  }

  clear(): void {
    this.logs = [];
  }

  getLogs(level?: string): typeof this.logs {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return this.logs;
  }
}

/**
 * Create test user data
 */
export function createTestUser(overrides?: Partial<any>): any {
  return {
    id: `test-user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    password: 'hashed_password',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Sleep utility for async tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random string
 */
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, 2 + length);
}
