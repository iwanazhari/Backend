/**
 * Fastify Adapter for AuthBoilerplate
 *
 * Implements IAuthAdapter for Fastify framework
 * Follows Fastify patterns: Hooks, Plugins, Decorators
 *
 * @see https://www.fastify.io/
 */

import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { IAuthAdapter, CookieOptions } from '../../core/interfaces/index.js';

export class FastifyAdapter implements IAuthAdapter {
  constructor(
    private req: FastifyRequest,
    private res: FastifyReply,
  ) {}

  /**
   * Get Fastify Request object
   */
  getRequest(): FastifyRequest {
    return this.req;
  }

  /**
   * Get Fastify Reply object
   */
  getResponse(): FastifyReply {
    return this.res;
  }

  /**
   * Get request body
   */
  getBody(): any {
    return (this.req.body as any) || {};
  }

  /**
   * Get route parameters
   */
  getParams(): any {
    return this.req.params as any;
  }

  /**
   * Get query parameters
   */
  getQuery(): any {
    return this.req.query as any;
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
    this.res.header(key, value);
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
    this.res.send(data);
  }

  /**
   * Redirect to URL
   */
  redirect(url: string): void {
    this.res.redirect(url);
  }

  /**
   * Set cookie
   * Note: Requires @fastify/cookie plugin
   */
  setCookie(name: string, value: string, options?: CookieOptions): void {
    const cookieOptions: any = { ...options };
    
    // Fastify cookie options
    if (options?.maxAge) {
      cookieOptions.maxAge = options.maxAge;
    }
    
    if (options?.sameSite) {
      cookieOptions.sameSite = options.sameSite;
    }

    this.res.setCookie(name, value, cookieOptions);
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
    return (this.req.cookies as any)?.[name];
  }

  /**
   * Get client IP address
   */
  getClientIP(): string {
    // Check X-Forwarded-For header
    const forwarded = this.req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded)
        ? forwarded[0].split(',')[0].trim()
        : forwarded.split(',')[0].trim();
    }

    // Fall back to Fastify's IP
    return this.req.ip || this.req.socket?.remoteAddress || 'unknown';
  }

  /**
   * Get User-Agent header
   */
  getUserAgent(): string {
    return this.req.headers['user-agent'] || 'unknown';
  }

  /**
   * Check if connection is secure (HTTPS)
   */
  isSecure(): boolean {
    return (
      this.req.protocol === 'https' ||
      this.req.headers['x-forwarded-proto'] === 'https' ||
      this.req.headers['x-forwarded-ssl'] === 'on'
    );
  }
}

export default FastifyAdapter;
