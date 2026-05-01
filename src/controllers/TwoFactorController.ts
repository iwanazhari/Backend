/**
 * Two-Factor Authentication Controller
 * 
 * Endpoints:
 * - POST /api/auth/2fa/setup - Setup 2FA (get QR code)
 * - POST /api/auth/2fa/enable - Enable 2FA
 * - POST /api/auth/2fa/verify - Verify 2FA token
 * - POST /api/auth/2fa/disable - Disable 2FA
 * - POST /api/auth/2fa/backup-codes - Regenerate backup codes
 */

import { Request, Response } from 'express';
import BaseController from './BaseController.js';
import TwoFactorService from '../services/TwoFactorService.js';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middlewares/validator.js';

class TwoFactorController extends BaseController {
  constructor() {
    super(TwoFactorService, 'TwoFactor');
  }

  /**
   * Setup 2FA - Get QR code
   * POST /api/auth/2fa/setup
   */
  setup2FA = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Setup 2FA');

    const userId = (req as any).user?.id;
    const email = (req as any).user?.email;

    if (!userId || !email) {
      throw new Error('User must be authenticated');
    }

    const result = await TwoFactorService.setup2FA({ userId, email });

    this.sendSuccess(res, {
      ...result,
      message: 'Scan QR code with Google Authenticator and verify with enable endpoint',
    });
  });

  /**
   * Enable 2FA after verification
   * POST /api/auth/2fa/enable
   */
  enable2FA = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Enable 2FA');

    const userId = (req as any).user?.id;
    const { token, secret } = req.body;

    if (!userId) {
      throw new Error('User must be authenticated');
    }

    const result = await TwoFactorService.enable2FA(userId, token, secret);

    this.sendSuccess(res, {
      ...result,
      message: '2FA enabled successfully. Save backup codes in a safe place!',
    });
  });

  /**
   * Verify 2FA token (during login)
   * POST /api/auth/2fa/verify
   */
  verify2FA = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Verify 2FA');

    const userId = (req as any).user?.id;
    const { token } = req.body;

    if (!userId) {
      throw new Error('User must be authenticated');
    }

    const isValid = await TwoFactorService.verify2FA({ userId, token });

    this.sendSuccess(res, {
      valid: isValid,
      message: '2FA verified successfully',
    });
  });

  /**
   * Disable 2FA
   * POST /api/auth/2fa/disable
   */
  disable2FA = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Disable 2FA');

    const userId = (req as any).user?.id;
    const { token } = req.body;

    if (!userId) {
      throw new Error('User must be authenticated');
    }

    await TwoFactorService.disable2FA(userId, token);

    this.sendSuccess(res, {
      message: '2FA disabled successfully',
    });
  });

  /**
   * Regenerate backup codes
   * POST /api/auth/2fa/backup-codes
   */
  regenerateBackupCodes = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Regenerate Backup Codes');

    const userId = (req as any).user?.id;
    const { token } = req.body;

    if (!userId) {
      throw new Error('User must be authenticated');
    }

    const result = await TwoFactorService.regenerateBackupCodes(userId, token);

    this.sendSuccess(res, {
      ...result,
      message: 'Backup codes regenerated. Save them in a safe place!',
    });
  });

  /**
   * Validation rules
   */
  static enableValidation = [
    body('token')
      .trim()
      .notEmpty()
      .withMessage('2FA token is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('2FA token must be 6 digits')
      .matches(/^\d{6}$/)
      .withMessage('2FA token must be numeric'),
    body('secret')
      .trim()
      .notEmpty()
      .withMessage('2FA secret is required'),
    handleValidationErrors,
  ];

  static verifyValidation = [
    body('token')
      .trim()
      .notEmpty()
      .withMessage('2FA token is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('2FA token must be 6 digits')
      .matches(/^\d{6}$/)
      .withMessage('2FA token must be numeric'),
    handleValidationErrors,
  ];

  static disableValidation = [
    body('token')
      .trim()
      .notEmpty()
      .withMessage('2FA token is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('2FA token must be 6 digits')
      .matches(/^\d{6}$/)
      .withMessage('2FA token must be numeric'),
    handleValidationErrors,
  ];
}

const controller = new TwoFactorController();

export default Object.assign(controller, {
  enableValidation: TwoFactorController.enableValidation,
  verifyValidation: TwoFactorController.verifyValidation,
  disableValidation: TwoFactorController.disableValidation,
});
