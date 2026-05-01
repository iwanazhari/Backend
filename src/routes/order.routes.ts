/**
 * Order Routes
 */

import { Router } from 'express';
import OrderController from '../controllers/OrderController.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/orders
 * @description Get all orders
 * @access Private
 */
router.get('/', OrderController.getAll);

/**
 * @route GET /api/orders/:id
 * @description Get order by ID
 * @access Private
 */
router.get('/:id', OrderController.idParam, OrderController.getById);

/**
 * @route POST /api/orders
 * @description Create new order
 * @access Private
 */
router.post('/', OrderController.validation, OrderController.create);

/**
 * @route PUT /api/orders/:id
 * @description Update order
 * @access Private
 */
router.put('/:id', OrderController.idParam, OrderController.validation, OrderController.update);

/**
 * @route DELETE /api/orders/:id
 * @description Delete order
 * @access Private
 */
router.delete('/:id', OrderController.idParam, OrderController.delete);

export default router;
