/**
 * Order Controller
 * Handles HTTP requests for Order
 */

const { body, param, query } = require('express-validator');
const BaseController = require('./BaseController');
const OrderService = require('../services/OrderService');
const { handleValidationErrors } = require('../middlewares/validator');
const { authenticate, authorize } = require('../middlewares/authenticate');

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
  getAll = this.handle(async (req, res) => {
    this.logRequest(req, 'Get All Orders');

    const options = this.extractQueryParams(req);
    const result = await this.service.getAll(options);

    this.sendPaginated(res, result);
  });

  /**
   * Get order by ID
   * GET /api/orders/:id
   */
  getById = this.handle(async (req, res) => {
    this.logRequest(req, 'Get Order By ID');

    const { id } = req.params;
    const result = await this.service.getById(id);

    this.sendSuccess(res, result);
  });

  /**
   * Create new order
   * POST /api/orders
   */
  create = this.handle(async (req, res) => {
    this.logRequest(req, 'Create Order');

    const result = await this.service.create(req.body);

    this.sendCreated(res, result, `/api/orders/${result.id}`);
  });

  /**
   * Update order
   * PUT /api/orders/:id
   */
  update = this.handle(async (req, res) => {
    this.logRequest(req, 'Update Order');

    const { id } = req.params;
    const result = await this.service.update(id, req.body);

    this.sendSuccess(res, result);
  });

  /**
   * Delete order
   * DELETE /api/orders/:id
   */
  delete = this.handle(async (req, res) => {
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

// Export singleton instance
module.exports = new OrderController();
