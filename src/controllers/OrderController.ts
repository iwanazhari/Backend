/**
 * Order Controller
 * Handles HTTP requests for Order
 */

import { Request, Response } from 'express';
import { body, param } from 'express-validator';
import BaseController from './BaseController.js';
import OrderService from '../services/OrderService.js';
import { handleValidationErrors } from '../middlewares/validator.js';

/**
 * Order Controller
 */
class OrderController extends BaseController {
  constructor() {
    super(OrderService, 'Order');
  }

  /**
   * Get all orders
   * GET /api/orders
   */
  getAll = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Get All Orders');

    const options = this.extractQueryParams(req);
    const result = await this.service.getAll(options);

    this.sendPaginated(res, result);
  });

  /**
   * Get order by ID
   * GET /api/orders/:id
   */
  getById = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Get Order By ID');

    const { id } = req.params;
    const result = await this.service.getById(id);

    this.sendSuccess(res, result);
  });

  /**
   * Create new order
   * POST /api/orders
   */
  create = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Create Order');

    const result = await this.service.create(req.body);

    this.sendCreated(res, result, `/api/orders/${result.id}`);
  });

  /**
   * Update order
   * PUT /api/orders/:id
   */
  update = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Update Order');

    const { id } = req.params;
    const result = await this.service.update(id, req.body);

    this.sendSuccess(res, result);
  });

  /**
   * Delete order
   * DELETE /api/orders/:id
   */
  delete = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Delete Order');

    const { id } = req.params;
    await this.service.delete(id);

    this.sendSuccess(res, { message: 'Order deleted successfully' });
  });

  /**
   * Validation rules for order
   */
  static validation = [
    // TODO: Add validation rules
    // body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
    handleValidationErrors,
  ];

  /**
   * Validation rules for ID param
   */
  static idParam = [
    param('id').notEmpty().withMessage('ID is required').isUUID().withMessage('Invalid UUID format'),
    handleValidationErrors,
  ];
}

const controller = new OrderController();

// Export instance with static members attached
export default Object.assign(controller, {
  validation: OrderController.validation,
  idParam: OrderController.idParam,
});
