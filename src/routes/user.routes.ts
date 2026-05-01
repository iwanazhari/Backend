/**
 * User Routes
 * Admin routes for user management
 */

import { Router } from 'express';
import UserController from '../controllers/UserController.js';
import { authenticate, authorize } from '../middlewares/authenticate.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/users
 * @description Get all users (Admin only)
 * @access Private/Admin
 */
router.get('/', authorize('admin'), UserController.getAllUsers);

/**
 * @route GET /api/users/stats
 * @description Get user statistics (Admin only)
 * @access Private/Admin
 */
router.get('/stats', authorize('admin'), UserController.getUserStats);

/**
 * @route GET /api/users/search
 * @description Search users
 * @access Private
 */
router.get('/search', UserController.searchUsers);

/**
 * @route GET /api/users/:id
 * @description Get user by ID (Admin only)
 * @access Private/Admin
 */
router.get('/:id', authorize('admin'), UserController.userIdParam, UserController.getUserById);

/**
 * @route PATCH /api/users/:id/status
 * @description Update user status (Admin only)
 * @access Private/Admin
 */
router.patch('/:id/status', authorize('admin'), UserController.updateStatusValidation, UserController.updateUserStatus);

/**
 * @route DELETE /api/users/:id
 * @description Delete user (Admin only)
 * @access Private/Admin
 */
router.delete('/:id', authorize('admin'), UserController.userIdParam, UserController.deleteUser);

export default router;
