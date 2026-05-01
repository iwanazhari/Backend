/**
 * Two-Factor Authentication Routes
 */

import { Router } from 'express';
import TwoFactorController from '../controllers/TwoFactorController.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();

// All 2FA routes require authentication
router.use(authenticate);

/**
 * @route POST /api/auth/2fa/setup
 * @description Setup 2FA (get QR code)
 * @access Private
 */
router.post('/setup', TwoFactorController.setup2FA);

/**
 * @route POST /api/auth/2fa/enable
 * @description Enable 2FA after verification
 * @access Private
 */
router.post('/enable', TwoFactorController.enableValidation, TwoFactorController.enable2FA);

/**
 * @route POST /api/auth/2fa/verify
 * @description Verify 2FA token (during login)
 * @access Private
 */
router.post('/verify', TwoFactorController.verifyValidation, TwoFactorController.verify2FA);

/**
 * @route POST /api/auth/2fa/disable
 * @description Disable 2FA
 * @access Private
 */
router.post('/disable', TwoFactorController.disableValidation, TwoFactorController.disable2FA);

/**
 * @route POST /api/auth/2fa/backup-codes
 * @description Regenerate backup codes
 * @access Private
 */
router.post('/backup-codes', TwoFactorController.regenerateBackupCodes);

export default router;
