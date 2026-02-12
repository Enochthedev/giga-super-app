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
 * /api/admin/national/dashboard:
 *   get:
 *     tags: [Admin Panel]
 *     summary: Get national-level dashboard statistics
 *     description: Retrieve national-level dashboard statistics and summary data (National HQ access required)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: National dashboard statistics retrieved successfully
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
 *                     total_transactions:
 *                       type: integer
 *                     active_services:
 *                       type: object
 *                       properties:
 *                         hotels:
 *                           type: integer
 *                         drivers:
 *                           type: integer
 *                         vendors:
 *                           type: integer
 *                     regional_breakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           region:
 *                             type: string
 *                           users:
 *                             type: integer
 *                           revenue:
 *                             type: number
 *             example:
 *               success: true
 *               data:
 *                 total_users: 125420
 *                 total_revenue: 2456789000.50
 *                 total_transactions: 89765
 *                 active_services:
 *                   hotels: 1234
 *                   drivers: 15670
 *                   vendors: 4560
 *                 regional_breakdown:
 *                   - region: "Lagos"
 *                     users: 45000
 *                     revenue: 890000000.25
 *                   - region: "Abuja"
 *                     users: 32000
 *                     revenue: 650000000.75
 *                   - region: "Kano"
 *                     users: 28000
 *                     revenue: 520000000.50
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - National access required
 *       500:
 *         description: Internal server error
 */
router.get(
  '/national/dashboard',
  authenticate,
  requireAnyAccess, // TODO: Change to requireNationalAccess when implemented
  async (req: AuthRequest, res: Response) => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Get total revenue from all sources
      const { data: revenueData } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_status', 'completed')
        .is('deleted_at', null);

      const totalRevenue =
        revenueData?.reduce((sum, payment) => sum + parseFloat(payment.amount || '0'), 0) || 0;

      // Get total transactions
      const { count: totalTransactions } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Get active services counts
      const { count: activeHotels } = await supabase
        .from('hotels')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('deleted_at', null);

      const { count: activeDrivers } = await supabase
        .from('driver_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true)
        .is('deleted_at', null);

      const { count: activeVendors } = await supabase
        .from('ecommerce_vendors')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('deleted_at', null);

      // Get regional breakdown (simplified - using state from user profiles)
      const { data: regionalData } = await supabase
        .from('user_profiles')
        .select('state')
        .is('deleted_at', null)
        .not('state', 'is', null);

      // Count users by state
      const regionCounts: Record<string, number> = {};
      regionalData?.forEach(user => {
        const state = user.state || 'Unknown';
        regionCounts[state] = (regionCounts[state] || 0) + 1;
      });

      // Convert to array and get top regions
      const regionalBreakdown = Object.entries(regionCounts)
        .map(([region, users]) => ({
          region,
          users,
          revenue: Math.round(totalRevenue * (users / (totalUsers || 1))), // Proportional revenue estimate
        }))
        .sort((a, b) => b.users - a.users)
        .slice(0, 10); // Top 10 regions

      await createAudit(req, 'view_national_dashboard', 'national_statistics');

      res.json({
        success: true,
        data: {
          total_users: totalUsers || 0,
          total_revenue: totalRevenue,
          total_transactions: totalTransactions || 0,
          active_services: {
            hotels: activeHotels || 0,
            drivers: activeDrivers || 0,
            vendors: activeVendors || 0,
          },
          regional_breakdown: regionalBreakdown,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get national dashboard stats', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch national dashboard statistics' });
    }
  }
);

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     tags: [Admin Panel]
 *     summary: Get business categories
 *     description: Retrieve list of all business categories available in the platform
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       icon:
 *                         type: string
 *                       color:
 *                         type: string
 *             example:
 *               success: true
 *               data:
 *                 - id: "ecommerce"
 *                   name: "E-commerce"
 *                   description: "Online marketplace and trading"
 *                   icon: "shopping-cart"
 *                   color: "#3B82F6"
 *                 - id: "hotel"
 *                   name: "Hotel Booking"
 *                   description: "Hotel reservations and management"
 *                   icon: "hotel"
 *                   color: "#8B5CF6"
 *                 - id: "taxi"
 *                   name: "Taxi Services"
 *                   description: "Ride-hailing and transportation"
 *                   icon: "car"
 *                   color: "#10B981"
 *                 - id: "media"
 *                   name: "Media & Social"
 *                   description: "Social media and content management"
 *                   icon: "image"
 *                   color: "#F59E0B"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/categories',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const categories = [
        {
          id: 'ecommerce',
          name: 'E-commerce',
          description: 'Online marketplace and trading',
          icon: 'shopping-cart',
          color: '#3B82F6',
        },
        {
          id: 'hotel',
          name: 'Hotel Booking',
          description: 'Hotel reservations and management',
          icon: 'hotel',
          color: '#8B5CF6',
        },
        {
          id: 'taxi',
          name: 'Taxi Services',
          description: 'Ride-hailing and transportation',
          icon: 'car',
          color: '#10B981',
        },
        {
          id: 'media',
          name: 'Media & Social',
          description: 'Social media and content management',
          icon: 'image',
          color: '#F59E0B',
        },
      ];

      await createAudit(req, 'view_categories', 'business_categories');

      res.json({ success: true, data: categories });
    } catch (error: any) {
      logger.error('Failed to get categories', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }
);

export default router;
