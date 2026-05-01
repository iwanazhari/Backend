/**
 * User Controller
 * Handles user management requests (Admin operations)
 * Follows: Thin Controller, Fat Service pattern
 */

import { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import BaseController from './BaseController.js';
import UserService, { type UserServiceType } from '../services/UserService.js';
import { handleValidationErrors } from '../middlewares/validator.js';

interface QueryOptions {
  page?: number;
  limit?: number;
  q?: string;
  [key: string]: any;
}

/**
 * User Controller
 */
class UserController extends BaseController<UserServiceType> {
  constructor() {
    super(UserService, 'User');
  }

  /**
   * Get all users (Admin only)
   * GET /api/users
   */
  getAllUsers = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Get All Users');

    const options = this.extractQueryParams(req);
    const result = await this.service.getAllUsers(options);

    this.sendPaginated(res, result);
  });

  /**
   * Get user by ID (Admin only)
   * GET /api/users/:id
   */
  getUserById = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Get User By ID');

    const { id } = req.params;
    const result = await this.service.getUserById(id);

    this.sendSuccess(res, result);
  });

  /**
   * Update user status (Admin only)
   * PATCH /api/users/:id/status
   */
  updateUserStatus = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Update User Status');

    const { id } = req.params;
    const { status } = req.body;

    const result = await this.service.updateUserStatus(id, status);

    this.sendSuccess(res, result);
  });

  /**
   * Delete user (Admin only)
   * DELETE /api/users/:id
   */
  deleteUser = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Delete User');

    const { id } = req.params;

    await this.service.adminDeleteUser(id);

    this.sendSuccess(res, { message: 'User deleted successfully' });
  });

  /**
   * Search users
   * GET /api/users/search
   */
  searchUsers = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Search Users');

    const query = req.query as QueryOptions;
    const { q, page, limit } = query;
    const result = await this.service.searchUsers(q as string, {
      page: typeof page === 'string' ? parseInt(page, 10) || 1 : 1,
      limit: typeof limit === 'string' ? parseInt(limit, 10) || 10 : 10,
    });

    this.sendPaginated(res, result);
  });

  /**
   * Get user statistics (Admin only)
   * GET /api/users/stats
   */
  getUserStats = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Get User Stats');

    const result = await this.service.getUserStats();

    this.sendSuccess(res, result);
  });

  /**
   * Validation rules for user ID param
   */
  static userIdParam = [
    param('id').notEmpty().withMessage('User ID is required').isUUID().withMessage('Invalid UUID format'),
    handleValidationErrors,
  ];

  /**
   * Validation rules for update status
   */
  static updateStatusValidation = [
    param('id').notEmpty().withMessage('User ID is required').isUUID(),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['active', 'inactive', 'suspended', 'banned'])
      .withMessage('Invalid status'),
    handleValidationErrors,
  ];

  /**
   * Validation rules for search
   */
  static searchValidation = [
    query('q').notEmpty().withMessage('Search query is required').trim().isLength({ min: 2, max: 100 }),
    handleValidationErrors,
  ];
}

const controller = new UserController();

// Export instance with static members attached
export default Object.assign(controller, {
  userIdParam: UserController.userIdParam,
  updateStatusValidation: UserController.updateStatusValidation,
  searchValidation: UserController.searchValidation,
});
