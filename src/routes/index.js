/**
 * Routes Index
 * Central place for all API routes
 */

const express = require('express');
const router = express.Router();

// Import routes
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const orderRoutes = require('./order.routes');

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/orders', orderRoutes);

module.exports = router;
