import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit } from '../middleware/audit';
import { AuthRequest, authenticate, requireAnyAccess } from '../middleware/auth';
import { calculatePagination, getPaginationRange, supabase } from '../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * @swagger
 * /api/postal-monitoring/dashboard:
 *   get:
 *     tags: [Postal Monitoring]
 *     summary: Get postal managers dashboard data
 *     description: Retrieve dashboard statistics and revenue chart data for postal managers
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *           minimum: 7
 *           maximum: 90
 *         description: Number of days for revenue chart
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
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
 *                     stats:
 *                       type: object
 *                       properties:
 *                         total_packages:
 *                           type: integer
 *                         pending_packages:
 *                           type: integer
 *                         delivered_packages:
 *                           type: integer
 *                         total_revenue:
 *                           type: number
 *                         total_staff:
 *                           type: integer
 *                     revenue_chart:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           revenue:
 *                             type: number
 *             example:
 *               success: true
 *               data:
 *                 stats:
 *                   total_packages: 1250
 *                   pending_packages: 45
 *                   delivered_packages: 1180
 *                   total_revenue: 2500000
 *                   total_staff: 150
 *                 revenue_chart:
 *                   - date: "2026-01-20"
 *                     revenue: 3500
 *                   - date: "2026-01-21"
 *                     revenue: 4200
 *                   - date: "2026-01-22"
 *                     revenue: 5000
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/dashboard',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const days = Math.min(Math.max(parseInt(req.query.days as string, 10) || 30, 7), 90);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // Get package statistics
      const [totalPackages, pendingPackages, deliveredPackages, totalStaff] = await Promise.all([
        supabase
          .from('delivery_packages')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null),
        supabase
          .from('delivery_packages')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'in_transit', 'out_for_delivery'])
          .is('deleted_at', null),
        supabase
          .from('delivery_packages')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'delivered')
          .is('deleted_at', null),
        supabase
          .from('nipost_officials')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
      ]);

      // Get total revenue
      const { data: revenueData } = await supabase
        .from('delivery_packages')
        .select('delivery_fee')
        .is('deleted_at', null);

      const totalRevenue = (revenueData || []).reduce(
        (sum, pkg) => sum + (Number(pkg.delivery_fee) || 0),
        0
      );

      // Get daily revenue for chart
      const revenueChart: { date: string; revenue: number }[] = [];

      for (let i = 0; i < days; i++) {
        const dayStart = new Date(startDate);
        dayStart.setDate(startDate.getDate() + i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const { data: dayRevenue } = await supabase
          .from('delivery_packages')
          .select('delivery_fee')
          .gte('created_at', dayStart.toISOString())
          .lt('created_at', dayEnd.toISOString())
          .is('deleted_at', null);

        const dailyTotal = (dayRevenue || []).reduce(
          (sum, pkg) => sum + (Number(pkg.delivery_fee) || 0),
          0
        );

        revenueChart.push({
          date: dayStart.toISOString().split('T')[0],
          revenue: Math.round(dailyTotal * 100) / 100,
        });
      }

      await createAudit(req, 'view_postal_dashboard', 'postal_monitoring');

      res.json({
        success: true,
        data: {
          stats: {
            total_packages: totalPackages.count || 0,
            pending_packages: pendingPackages.count || 0,
            delivered_packages: deliveredPackages.count || 0,
            total_revenue: Math.round(totalRevenue * 100) / 100,
            total_staff: totalStaff.count || 0,
          },
          revenue_chart: revenueChart,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get postal dashboard', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch postal dashboard data' });
    }
  }
);

/**
 * @swagger
 * /api/postal-monitoring/staff:
 *   get:
 *     tags: [Postal Monitoring]
 *     summary: Get postal staff listing
 *     description: Retrieve paginated list of postal staff with search and filtering
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, staff ID, or email
 *         example: 'john'
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter by region
 *         example: 'lagos'
 *       - in: query
 *         name: office_location
 *         schema:
 *           type: string
 *         description: Filter by office location
 *         example: 'victoria island'
 *       - in: query
 *         name: position
 *         schema:
 *           type: string
 *         description: Filter by position
 *         example: 'postal officer'
 *     responses:
 *       200:
 *         description: Staff retrieved successfully
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
 *                         format: uuid
 *                       staff_id:
 *                         type: string
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       position:
 *                         type: string
 *                       department:
 *                         type: string
 *                       office_location:
 *                         type: string
 *                       region:
 *                         type: string
 *                       is_active:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *             example:
 *               success: true
 *               data:
 *                 - id: "s1234567-89ab-cdef-0123-456789abcdef"
 *                   staff_id: "NIPOST001234"
 *                   first_name: "David"
 *                   last_name: "Okafor"
 *                   email: "david.okafor@nipost.gov.ng"
 *                   phone: "+2348012345678"
 *                   position: "Postal Officer"
 *                   department: "Operations"
 *                   office_location: "Lagos Central Post Office"
 *                   region: "Lagos"
 *                   is_active: true
 *                   created_at: "2025-01-15T10:30:00Z"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 450
 *                 pages: 23
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/staff', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, region, office_location, position } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('nipost_officials')
      .select(
        `
        id,
        employee_id,
        user_id,
        position,
        rank,
        department,
        clearance_level,
        is_active,
        created_at,
        user_profiles!inner(first_name, last_name, email, phone),
        nipost_offices(office_name, city, state_province),
        nipost_regions(region_name, region_code)
      `,
        { count: 'exact' }
      )
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search) {
      // Search in user profile fields via join
      const { data: searchResults } = await supabase
        .from('user_profiles')
        .select('id')
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);

      const userIds = searchResults?.map((u: any) => u.id) || [];

      if (userIds.length > 0) {
        query = query.or(`user_id.in.(${userIds.join(',')}),employee_id.ilike.%${search}%`);
      } else {
        query = query.ilike('employee_id', `%${search}%`);
      }
    }

    if (region) {
      const { data: regionData } = await supabase
        .from('nipost_regions')
        .select('id')
        .or(`region_name.ilike.%${region}%,region_code.ilike.%${region}%`)
        .limit(1)
        .single();

      if (regionData) {
        query = query.eq('region_id', regionData.id);
      }
    }

    if (office_location) {
      const { data: officeData } = await supabase
        .from('nipost_offices')
        .select('id')
        .or(`office_name.ilike.%${office_location}%,city.ilike.%${office_location}%`)
        .limit(1)
        .single();

      if (officeData) {
        query = query.eq('office_id', officeData.id);
      }
    }

    if (position) {
      query = query.ilike('position', `%${position}%`);
    }

    const { data: staff, count, error } = await query;

    if (error) throw error;

    await createAudit(req, 'view_postal_staff', 'postal_monitoring');

    res.json({
      success: true,
      data: staff,
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: any) {
    logger.error('Failed to get postal staff', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch postal staff' });
  }
});

export default router;
