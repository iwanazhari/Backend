/**
 * Authentication Routes
 * Public routes for authentication
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middlewares/authenticate');

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
router.post('/register', AuthController.registerValidation, AuthController.register);

/**
 * @route POST /api/auth/login
 * @description Login user
 * @access Public
 */
router.post('/login', AuthController.loginValidation, AuthController.login);

/**
 * @route POST /api/auth/refresh
 * @description Refresh access token
 * @access Public
 */
router.post('/refresh', AuthController.refreshValidation, AuthController.refreshTokens);

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

module.exports = router;
