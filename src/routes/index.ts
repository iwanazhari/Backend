/**
 * Main Routes Index
 * ES Module version
 */

import { Router } from 'express';

const router = Router();

// Import route modules
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import productRoutes from './product.routes.js';
import orderRoutes from './order.routes.js';
import emailVerificationRoutes from './emailVerification.routes.js';
import passwordResetRoutes from './passwordReset.routes.js';
import twoFactorRoutes from './2fa.routes.js';

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/auth/verify-email', emailVerificationRoutes);
router.use('/auth/password-reset', passwordResetRoutes);
router.use('/auth/2fa', twoFactorRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);

export default router;
