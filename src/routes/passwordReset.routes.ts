/**
 * Password Reset Routes
 */

import { Router } from 'express';
import PasswordResetController from '../controllers/PasswordResetController.js';

const router = Router();

/**
 * @route POST /api/auth/password-reset/request
 * @description Request password reset email
 * @access Public
 */
router.post(
  '/request',
  PasswordResetController.requestValidation,
  PasswordResetController.requestReset
);

/**
 * @route POST /api/auth/password-reset/confirm
 * @description Confirm password reset with token
 * @access Public
 */
router.post(
  '/confirm',
  PasswordResetController.confirmValidation,
  PasswordResetController.confirmReset
);

/**
 * @route GET /api/auth/password-reset/validate
 * @description Validate reset token without using it
 * @access Public
 */
router.get(
  '/validate',
  PasswordResetController.validateValidation,
  PasswordResetController.validateToken
);

export default router;
