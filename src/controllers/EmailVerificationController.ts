/**
 * Email Verification Controller
 * 
 * Endpoints:
 * - POST /api/auth/send-verification - Send verification email
 * - POST /api/auth/verify-email - Verify email with token
 * - POST /api/auth/resend-verification - Resend verification email
 */

import { Request, Response } from 'express';
import BaseController from './BaseController.js';
import EmailVerificationService from '../services/EmailVerificationService.js';
import AuthService from '../services/AuthService.js';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middlewares/validator.js';

class EmailVerificationController extends BaseController {
  constructor() {
    super(EmailVerificationService, 'EmailVerification');
  }

  /**
   * Send verification email (after registration)
   * POST /api/auth/send-verification
   */
  sendVerification = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Send Verification Email');

    const userId = (req as any).user?.id;

    if (!userId) {
      throw new Error('User must be authenticated to send verification email');
    }

    const user = await AuthService.getProfile(userId);

    if (user.emailVerifiedAt) {
      throw new Error('Email is already verified');
    }

    await EmailVerificationService.sendVerificationEmail({
      userId,
      email: user.email,
      firstName: user.firstName,
    });

    this.sendSuccess(res, {
      message: 'Verification email sent successfully',
    });
  });

  /**
   * Verify email with token
   * POST /api/auth/verify-email
   */
  verifyEmail = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Verify Email');

    const { token } = req.body;

    if (!token) {
      throw new Error('Verification token is required');
    }

    const result = await EmailVerificationService.verifyEmail(token);

    this.sendSuccess(res, result);
  });

  /**
   * Resend verification email
   * POST /api/auth/resend-verification
   */
  resendVerification = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Resend Verification Email');

    const { email } = req.body;

    if (!email) {
      throw new Error('Email is required');
    }

    await EmailVerificationService.resendVerificationEmail(email);

    this.sendSuccess(res, {
      message: 'If an account exists with this email, a verification email has been sent',
    });
  });

  /**
   * Validation rules
   */
  static verifyValidation = [
    body('token')
      .trim()
      .notEmpty()
      .withMessage('Verification token is required')
      .isLength({ min: 32 })
      .withMessage('Invalid token format'),
    handleValidationErrors,
  ];

  static resendValidation = [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    handleValidationErrors,
  ];
}

const controller = new EmailVerificationController();

export default Object.assign(controller, {
  verifyValidation: EmailVerificationController.verifyValidation,
  resendValidation: EmailVerificationController.resendValidation,
});
