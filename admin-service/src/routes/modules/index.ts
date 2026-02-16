import { Router } from 'express';

// E-commerce module routes
import ecommerceProducts from './ecommerce';
import ecommerceAnalytics from './ecommerce-analytics';
import ecommerceOrders from './ecommerce-orders';
import ecommerceVendors from './ecommerce-vendors';

// Taxi module routes
import taxiRoutes from './taxi';

// Hotel module routes
import hotelRoutes from './hotel';

// Media module routes
import mediaRoutes from './media';

const router = Router();

// ============================================================================
// E-COMMERCE MODULE: /api/managers/ecommerce/*
// ============================================================================
router.use('/ecommerce', ecommerceProducts);
router.use('/ecommerce/orders', ecommerceOrders);
router.use('/ecommerce/vendors', ecommerceVendors);
router.use('/ecommerce', ecommerceAnalytics);

// ============================================================================
// TAXI MODULE: /api/managers/taxi/*
// ============================================================================
router.use('/taxi', taxiRoutes);

// ============================================================================
// HOTEL MODULE: /api/managers/hotel/*
// ============================================================================
router.use('/hotel', hotelRoutes);

// ============================================================================
// MEDIA MODULE: /api/managers/media/*
// ============================================================================
router.use('/media', mediaRoutes);

export default router;
