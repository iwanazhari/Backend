/**
 * Password Reset Controller
 * 
 * Endpoints:
 * - POST /api/auth/password-reset/request - Request password reset
 * - POST /api/auth/password-reset/confirm - Confirm password reset
 * - GET /api/auth/password-reset/validate - Validate reset token
 */

import { Request, Response } from 'express';
import BaseController from './BaseController.js';
import PasswordResetService from '../services/PasswordResetService.js';
import { body, query } from 'express-validator';
import { handleValidationErrors } from '../middlewares/validator.js';

class PasswordResetController extends BaseController {
  constructor() {
    super(PasswordResetService, 'PasswordReset');
  }

  /**
   * Request password reset
   * POST /api/auth/password-reset/request
   */
  requestReset = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Request Password Reset');

    const { email } = req.body;
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'unknown';

    const result = await PasswordResetService.requestReset({
      email,
      ipAddress,
      userAgent,
    });

    this.sendSuccess(res, result);
  });

  /**
   * Confirm password reset
   * POST /api/auth/password-reset/confirm
   */
  confirmReset = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Confirm Password Reset');

    const { token, newPassword } = req.body;
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'unknown';

    const result = await PasswordResetService.confirmReset({
      token,
      newPassword,
      ipAddress,
      userAgent,
    });

    this.sendSuccess(res, result);
  });

  /**
   * Validate reset token (without using it)
   * GET /api/auth/password-reset/validate
   */
  validateToken = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Validate Password Reset Token');

    const { token } = req.query as { token: string };

    if (!token) {
      throw new Error('Token is required');
    }

    const result = await PasswordResetService.validateToken(token);

    this.sendSuccess(res, result);
  });

  /**
   * Get client IP from request
   */
  private getClientIp(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Validation rules
   */
  static requestValidation = [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    handleValidationErrors,
  ];

  static confirmValidation = [
    body('token')
      .trim()
      .notEmpty()
      .withMessage('Reset token is required')
      .isLength({ min: 32 })
      .withMessage('Invalid token format'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    handleValidationErrors,
  ];

  static validateValidation = [
    query('token')
      .trim()
      .notEmpty()
      .withMessage('Reset token is required')
      .isLength({ min: 32 })
      .withMessage('Invalid token format'),
    handleValidationErrors,
  ];
}

const controller = new PasswordResetController();

export default Object.assign(controller, {
  requestValidation: PasswordResetController.requestValidation,
  confirmValidation: PasswordResetController.confirmValidation,
  validateValidation: PasswordResetController.validateValidation,
});
