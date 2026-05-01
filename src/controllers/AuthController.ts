/**
 * Auth Controller
 * Handles authentication requests
 * Follows: Thin Controller, Fat Service pattern
 */

import { Request, Response } from 'express';
import { body } from 'express-validator';
import BaseController from './BaseController.js';
import AuthService, { type AuthServiceType } from '../services/AuthService.js';
import { loginRateLimiter, registerRateLimiter, refreshRateLimiter } from '../middlewares/authRateLimiter.js';
import { handleValidationErrors } from '../middlewares/validator.js';
import { getClientIp } from '../utils/validators.js';

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Auth Controller
 */
class AuthController extends BaseController<AuthServiceType> {
  constructor() {
    super(AuthService, 'Auth');
  }

  /**
   * Register new user - Zero Trust
   * - Rate limiting
   * - Input validation
   * - Security headers
   */
  register = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Register');

    const { email, password, firstName, lastName } = req.body as RegisterRequest;

    // Get security context
    const ipAddress = getClientIp(req.headers);
    const userAgent = req.get('User-Agent') || 'unknown';

    const result = await this.service.register({
      email,
      password,
      firstName,
      lastName,
    });

    // Set security headers
    this.setSecurityHeaders(res);

    this.sendCreated(res, result, `/api/auth/profile`);
  });

  /**
   * Login user - Zero Trust
   * - Rate limiting (5 attempts per 15 min)
   * - Input validation
   * - IP tracking
   * - Security audit
   */
  login = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Login');

    const { email, password } = req.body;

    // Get security context
    const ipAddress = getClientIp(req.headers);
    const userAgent = req.get('User-Agent') || 'unknown';

    const result = await this.service.login(email, password, ipAddress, userAgent);

    // Set security headers
    this.setSecurityHeaders(res);

    this.sendSuccess(res, result);
  });

  /**
   * Logout user - Zero Trust
   * - Audit logout
   * - Revoke all sessions
   */
  logout = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Logout');

    const userId = (req as any).user?.id;
    const ipAddress = getClientIp(req.headers);

    await this.service.logout(userId, ipAddress);

    this.sendSuccess(res, { message: 'Logged out successfully' });
  });

  /**
   * Refresh tokens - Zero Trust
   * - Rate limiting
   * - Single-use tokens
   * - Audit trail
   */
  refreshTokens = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Refresh Tokens');

    const { refreshToken } = req.body as { refreshToken: string };
    const ipAddress = getClientIp(req.headers);

    const result = await this.service.refreshTokens(refreshToken, ipAddress);

    this.sendSuccess(res, result);
  });

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  getProfile = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Get Profile');

    const result = await this.service.getProfile((req as any).user?.id);

    this.sendSuccess(res, result);
  });

  /**
   * Update current user profile
   * PUT /api/auth/profile
   */
  updateProfile = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Update Profile');

    const result = await this.service.updateProfile((req as any).user?.id, req.body);

    this.sendSuccess(res, result);
  });

  /**
   * Change password
   * POST /api/auth/change-password
   */
  changePassword = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Change Password');

    const { currentPassword, newPassword } = req.body as ChangePasswordRequest;

    await this.service.changePassword((req as any).user?.id, currentPassword, newPassword);

    this.sendSuccess(res, { message: 'Password changed successfully' });
  });

  /**
   * Delete current user account
   * DELETE /api/auth/account
   */
  deleteAccount = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Delete Account');

    await this.service.deleteAccount((req as any).user?.id);

    this.sendSuccess(res, { message: 'Account deleted successfully' });
  });

  /**
   * Validation rules for registration
   */
  static registerValidation = [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 100 }),
    body('lastName').optional().trim().isLength({ max: 100 }),
    handleValidationErrors,
  ];

  /**
   * Validation rules for login
   */
  static loginValidation = [
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors,
  ];

  /**
   * Validation rules for refresh tokens
   */
  static refreshValidation = [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    handleValidationErrors,
  ];

  /**
   * Validation rules for change password
   */
  static changePasswordValidation = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('New password must contain uppercase, lowercase, number, and special character'),
    handleValidationErrors,
  ];

  // ============================================
  // CONTROLLER HELPER - HTTP layer only
  // ============================================

  /**
   * Set security headers - Zero Trust defense in depth
   * Controller responsibility: HTTP response headers
   */
  private setSecurityHeaders(res: Response): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}

const controller = new AuthController();

// Export instance with static members attached
export default Object.assign(controller, {
  registerValidation: AuthController.registerValidation,
  loginValidation: AuthController.loginValidation,
  refreshValidation: AuthController.refreshValidation,
  changePasswordValidation: AuthController.changePasswordValidation,
});
