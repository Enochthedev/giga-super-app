import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit } from '../middleware/audit';
import { AuthRequest, authenticate, requireAnyAccess } from '../middleware/auth';
import { supabase } from '../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get main dashboard statistics
 *     description: Retrieve comprehensive dashboard statistics for the Giga platform
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *         example: '2025-01-01'
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *         example: '2025-02-10'
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_users:
 *                       type: integer
 *                     total_revenue:
 *                       type: number
 *                     total_bookings:
 *                       type: integer
 *                     total_rides:
 *                       type: integer
 *                     total_orders:
 *                       type: integer
 *                     active_hotels:
 *                       type: integer
 *                     active_drivers:
 *                       type: integer
 *                     active_vendors:
 *                       type: integer
 *             example:
 *               success: true
 *               data:
 *                 total_users: 15420
 *                 total_revenue: 45678900.50
 *                 total_bookings: 3450
 *                 total_rides: 12890
 *                 total_orders: 8765
 *                 active_hotels: 234
 *                 active_drivers: 1567
 *                 active_vendors: 456
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/stats', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const { data, error } = await supabase.rpc('get_giga_dashboard_stats', {
      start_date: startDate || null,
      end_date: endDate || null,
    });

    if (error) throw error;

    await createAudit(req, 'view_dashboard_stats', 'giga_dashboard');

    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Failed to get dashboard stats', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

/**
 * @swagger
 * /api/dashboard/sales-comparison:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get sales comparison between periods
 *     description: Compare sales data between current and previous periods
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Current period start date
 *         example: '2025-02-01'
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Current period end date
 *         example: '2025-02-10'
 *     responses:
 *       200:
 *         description: Sales comparison retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     current_period:
 *                       type: object
 *                       properties:
 *                         revenue:
 *                           type: number
 *                         orders:
 *                           type: integer
 *                         bookings:
 *                           type: integer
 *                     previous_period:
 *                       type: object
 *                       properties:
 *                         revenue:
 *                           type: number
 *                         orders:
 *                           type: integer
 *                         bookings:
 *                           type: integer
 *                     growth:
 *                       type: object
 *                       properties:
 *                         revenue_percent:
 *                           type: number
 *                         orders_percent:
 *                           type: number
 *                         bookings_percent:
 *                           type: number
 *             example:
 *               success: true
 *               data:
 *                 current_period:
 *                   revenue: 5678900.50
 *                   orders: 1234
 *                   bookings: 567
 *                 previous_period:
 *                   revenue: 4567800.25
 *                   orders: 1050
 *                   bookings: 489
 *                 growth:
 *                   revenue_percent: 24.3
 *                   orders_percent: 17.5
 *                   bookings_percent: 15.9
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/sales-comparison',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      const { data, error } = await supabase.rpc('get_sales_comparison', {
        current_period_start: startDate || null,
        current_period_end: endDate || null,
      });

      if (error) throw error;

      await createAudit(req, 'view_sales_comparison', 'sales_analytics');

      res.json({ success: true, data });
    } catch (error: any) {
      logger.error('Failed to get sales comparison', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch sales comparison' });
    }
  }
);

/**
 * @swagger
 * /api/dashboard/category-breakdown:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get revenue breakdown by category
 *     description: Retrieve revenue distribution across different business categories
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Category breakdown retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     hotel:
 *                       type: object
 *                       properties:
 *                         revenue:
 *                           type: number
 *                         percentage:
 *                           type: number
 *                         count:
 *                           type: integer
 *                     taxi:
 *                       type: object
 *                       properties:
 *                         revenue:
 *                           type: number
 *                         percentage:
 *                           type: number
 *                         count:
 *                           type: integer
 *                     ecommerce:
 *                       type: object
 *                       properties:
 *                         revenue:
 *                           type: number
 *                         percentage:
 *                           type: number
 *                         count:
 *                           type: integer
 *             example:
 *               success: true
 *               data:
 *                 hotel:
 *                   revenue: 18900000.50
 *                   percentage: 41.4
 *                   count: 3450
 *                 taxi:
 *                   revenue: 15678900.25
 *                   percentage: 34.3
 *                   count: 12890
 *                 ecommerce:
 *                   revenue: 11100000.75
 *                   percentage: 24.3
 *                   count: 8765
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/category-breakdown',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { data, error } = await supabase.rpc('get_category_breakdown');

      if (error) throw error;

      await createAudit(req, 'view_category_breakdown', 'category_analytics');

      res.json({ success: true, data });
    } catch (error: any) {
      logger.error('Failed to get category breakdown', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch category breakdown' });
    }
  }
);

export default router;
