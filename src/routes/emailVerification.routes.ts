/**
 * Email Verification Routes
 */

import { Router } from 'express';
import EmailVerificationController from '../controllers/EmailVerificationController.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();

/**
 * @route POST /api/auth/send-verification
 * @description Send verification email to authenticated user
 * @access Private
 */
router.post(
  '/send-verification',
  authenticate,
  EmailVerificationController.sendVerification
);

/**
 * @route POST /api/auth/verify-email
 * @description Verify email with token
 * @access Public
 */
router.post(
  '/verify-email',
  EmailVerificationController.verifyValidation,
  EmailVerificationController.verifyEmail
);

/**
 * @route POST /api/auth/resend-verification
 * @description Resend verification email
 * @access Public
 */
router.post(
  '/resend-verification',
  EmailVerificationController.resendValidation,
  EmailVerificationController.resendVerification
);

export default router;
