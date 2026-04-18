/**
 * Auth Controller
 * Handles authentication requests
 * Follows: Thin Controller, Fat Service pattern
 */

const { body } = require('express-validator');
const BaseController = require('./BaseController');
const UserService = require('../services/UserService');
const { handleValidationErrors } = require('../middlewares/validator');
const { authenticate } = require('../middlewares/authenticate');

/**
 * Auth Controller
 */
class AuthController extends BaseController {
  constructor() {
    super(UserService, 'Auth');
  }

  /**
   * Register new user
   * POST /api/auth/register
   */
  register = this.handle(async (req, res) => {
    this.logRequest(req, 'Register');

    const { email, password, firstName, lastName } = req.body;

    const result = await this.service.register({
      email,
      password,
      firstName,
      lastName,
    });

    this.sendCreated(res, result, `/api/auth/profile`);
  });

  /**
   * Login user
   * POST /api/auth/login
   */
  login = this.handle(async (req, res) => {
    this.logRequest(req, 'Login');

    const { email, password } = req.body;

    const result = await this.service.login(email, password);

    this.sendSuccess(res, result);
  });

  /**
   * Logout user
   * POST /api/auth/logout
   */
  logout = this.handle(async (req, res) => {
    this.logRequest(req, 'Logout');

    await this.service.logout(req.user.id);

    this.sendSuccess(res, { message: 'Logged out successfully' });
  });

  /**
   * Refresh tokens
   * POST /api/auth/refresh
   */
  refreshTokens = this.handle(async (req, res) => {
    this.logRequest(req, 'Refresh Tokens');

    const { refreshToken } = req.body;

    const result = await this.service.refreshTokens(refreshToken);

    this.sendSuccess(res, result);
  });

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  getProfile = this.handle(async (req, res) => {
    this.logRequest(req, 'Get Profile');

    const result = await this.service.getProfile(req.user.id);

    this.sendSuccess(res, result);
  });

  /**
   * Update current user profile
   * PUT /api/auth/profile
   */
  updateProfile = this.handle(async (req, res) => {
    this.logRequest(req, 'Update Profile');

    const result = await this.service.updateProfile(req.user.id, req.body);

    this.sendSuccess(res, result);
  });

  /**
   * Change password
   * POST /api/auth/change-password
   */
  changePassword = this.handle(async (req, res) => {
    this.logRequest(req, 'Change Password');

    const { currentPassword, newPassword } = req.body;

    await this.service.changePassword(req.user.id, currentPassword, newPassword);

    this.sendSuccess(res, { message: 'Password changed successfully' });
  });

  /**
   * Delete current user account
   * DELETE /api/auth/account
   */
  deleteAccount = this.handle(async (req, res) => {
    this.logRequest(req, 'Delete Account');

    await this.service.deleteAccount(req.user.id);

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
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain uppercase, lowercase, and number'),
    handleValidationErrors,
  ];
}

// Export singleton instance
module.exports = new AuthController();
