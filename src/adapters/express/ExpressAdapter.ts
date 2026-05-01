/**
 * Express Adapter for AuthBoilerplate
 *
 * Implements IAuthAdapter for Express.js framework
 * Follows Express middleware and routing patterns
 *
 * @see https://expressjs.com/
 */

import { Request, Response, NextFunction } from 'express';
import { IAuthAdapter, CookieOptions } from '../../core/interfaces/index.js';

export class ExpressAdapter implements IAuthAdapter {
  constructor(
    private req: Request,
    private res: Response
  ) {}

  /**
   * Get Express Request object
   */
  getRequest(): Request {
    return this.req;
  }

  /**
   * Get Express Response object
   */
  getResponse(): Response {
    return this.res;
  }

  /**
   * Get request body
   */
  getBody(): any {
    return this.req.body;
  }

  /**
   * Get route parameters
   */
  getParams(): any {
    return this.req.params;
  }

  /**
   * Get query parameters
   */
  getQuery(): any {
    return this.req.query;
  }

  /**
   * Get request headers
   */
  getHeaders(): any {
    return this.req.headers;
  }

  /**
   * Set response header
   */
  setHeader(key: string, value: string): void {
    this.res.setHeader(key, value);
  }

  /**
   * Set HTTP status code
   */
  setStatus(code: number): void {
    this.res.status(code);
  }

  /**
   * Send JSON response
   */
  send(data: any): void {
    this.res.json(data);
  }

  /**
   * Redirect to URL
   */
  redirect(url: string): void {
    this.res.redirect(url);
  }

  /**
   * Set cookie
   */
  setCookie(name: string, value: string, options?: CookieOptions): void {
    if (options) {
      this.res.cookie(name, value, options);
    } else {
      this.res.cookie(name, value);
    }
  }

  /**
   * Clear cookie
   */
  clearCookie(name: string): void {
    this.res.clearCookie(name);
  }

  /**
   * Get cookie by name
   */
  getCookie(name: string): string | undefined {
    return this.req.cookies?.[name];
  }

  /**
   * Get client IP address
   */
  getClientIP(): string {
    // Check X-Forwarded-For header (for proxies/load balancers)
    const forwarded = this.req.headers['x-forwarded-for'];
    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return Array.isArray(forwarded) 
        ? forwarded[0].split(',')[0].trim()
        : forwarded.split(',')[0].trim();
    }

    // Fall back to direct connection IP
    return this.req.ip || this.req.socket.remoteAddress || 'unknown';
  }

  /**
   * Get User-Agent header
   */
  getUserAgent(): string {
    return this.req.get('User-Agent') || 'unknown';
  }

  /**
   * Check if connection is secure (HTTPS)
   */
  isSecure(): boolean {
    return (
      this.req.secure ||
      this.req.get('X-Forwarded-Proto') === 'https' ||
      this.req.get('X-Forwarded-Ssl') === 'on'
    );
  }
}

export default ExpressAdapter;
