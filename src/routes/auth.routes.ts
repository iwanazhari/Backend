/**
 * Authentication Routes
 * Zero Trust: Rate limiting on all auth endpoints
 */

import { Router } from 'express';
import AuthController from '../controllers/AuthController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { loginRateLimiter, registerRateLimiter, refreshRateLimiter } from '../middlewares/authRateLimiter.js';

const router = Router();

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 * @rateLimit 3 requests per hour
 */
router.post(
  '/register',
  registerRateLimiter,
  AuthController.registerValidation,
  AuthController.register
);

/**
 * @route POST /api/auth/login
 * @description Login user
 * @access Public
 * @rateLimit 5 attempts per 15 minutes (brute force protection)
 */
router.post(
  '/login',
  loginRateLimiter,
  AuthController.loginValidation,
  AuthController.login
);

/**
 * @route POST /api/auth/refresh
 * @description Refresh access token
 * @access Public
 * @rateLimit 10 attempts per 5 minutes
 */
router.post(
  '/refresh',
  refreshRateLimiter,
  AuthController.refreshValidation,
  AuthController.refreshTokens
);

/**
 * @route POST /api/auth/logout
 * @description Logout user
 * @access Private
 */
router.post('/logout', authenticate, AuthController.logout);

/**
 * @route GET /api/auth/profile
 * @description Get current user profile
 * @access Private
 */
router.get('/profile', authenticate, AuthController.getProfile);

/**
 * @route PUT /api/auth/profile
 * @description Update current user profile
 * @access Private
 */
router.put('/profile', authenticate, AuthController.updateProfile);

/**
 * @route POST /api/auth/change-password
 * @description Change password
 * @access Private
 */
router.post('/change-password', authenticate, AuthController.changePasswordValidation, AuthController.changePassword);

/**
 * @route DELETE /api/auth/account
 * @description Delete user account
 * @access Private
 */
router.delete('/account', authenticate, AuthController.deleteAccount);

export default router;
