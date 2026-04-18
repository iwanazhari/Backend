/**
 * Product Controller
 * Handles HTTP requests for Product
 */

const { body, param, query } = require('express-validator');
const BaseController = require('./BaseController');
const ProductService = require('../services/ProductService');
const { handleValidationErrors } = require('../middlewares/validator');
const { authenticate, authorize } = require('../middlewares/authenticate');

/**
 * Product Controller
 */
class ProductController extends BaseController {
  constructor() {
    super(ProductService, 'Product');
  }

  /**
   * Get all products
   * GET /api/products
   */
  getAll = this.handle(async (req, res) => {
    this.logRequest(req, 'Get All Products');

    const options = this.extractQueryParams(req);
    const result = await this.service.getAll(options);

    this.sendPaginated(res, result);
  });

  /**
   * Get product by ID
   * GET /api/products/:id
   */
  getById = this.handle(async (req, res) => {
    this.logRequest(req, 'Get Product By ID');

    const { id } = req.params;
    const result = await this.service.getById(id);

    this.sendSuccess(res, result);
  });

  /**
   * Create new product
   * POST /api/products
   */
  create = this.handle(async (req, res) => {
    this.logRequest(req, 'Create Product');

    const result = await this.service.create(req.body);

    this.sendCreated(res, result, `/api/products/${result.id}`);
  });

  /**
   * Update product
   * PUT /api/products/:id
   */
  update = this.handle(async (req, res) => {
    this.logRequest(req, 'Update Product');

    const { id } = req.params;
    const result = await this.service.update(id, req.body);

    this.sendSuccess(res, result);
  });

  /**
   * Delete product
   * DELETE /api/products/:id
   */
  delete = this.handle(async (req, res) => {
    this.logRequest(req, 'Delete Product');

    const { id } = req.params;
    await this.service.delete(id);

    this.sendSuccess(res, { message: 'Product deleted successfully' });
  });

  /**
   * Validation rules for product
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
module.exports = new ProductController();
