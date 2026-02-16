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

// Types for dashboard data
interface DailySales {
  date: string;
  ecommerce: number;
  hotel: number;
  taxi: number;
  media: number;
  total: number;
}

interface CategoryTotals {
  ecommerce: number;
  hotel: number;
  taxi: number;
  media: number;
  total: number;
}

/**
 * Helper: Get revenue totals for a date range
 */
async function getRevenueForPeriod(startDate: Date, endDate: Date): Promise<CategoryTotals> {
  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();

  const [ecommerce, hotel, taxi, media] = await Promise.all([
    supabase
      .from('ecommerce_orders')
      .select('total_amount')
      .gte('created_at', startStr)
      .lt('created_at', endStr)
      .eq('status', 'completed'),
    supabase
      .from('hotel_bookings')
      .select('total_price')
      .gte('created_at', startStr)
      .lt('created_at', endStr)
      .in('status', ['confirmed', 'completed']),
    supabase
      .from('rides')
      .select('final_amount')
      .gte('created_at', startStr)
      .lt('created_at', endStr)
      .eq('status', 'completed'),
    supabase
      .from('advertisements')
      .select('budget')
      .gte('created_at', startStr)
      .lt('created_at', endStr)
      .eq('status', 'active'),
  ]);

  const ecommerceTotal = (ecommerce.data || []).reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0
  );
  const hotelTotal = (hotel.data || []).reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
  const taxiTotal = (taxi.data || []).reduce((sum, r) => sum + (Number(r.final_amount) || 0), 0);
  const mediaTotal = (media.data || []).reduce((sum, a) => sum + (Number(a.budget) || 0), 0);

  return {
    ecommerce: Math.round(ecommerceTotal * 100) / 100,
    hotel: Math.round(hotelTotal * 100) / 100,
    taxi: Math.round(taxiTotal * 100) / 100,
    media: Math.round(mediaTotal * 100) / 100,
    total: Math.round((ecommerceTotal + hotelTotal + taxiTotal + mediaTotal) * 100) / 100,
  };
}

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get main dashboard statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get dashboard stats', { error: message });
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard statistics' });
  }
});

/**
 * @swagger
 * /api/dashboard/sales:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get daily sales data by category
 *     description: |
 *       Returns normalized daily sales data for each business category.
 *       Frontend can transform this data for any chart library.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *           minimum: 1
 *           maximum: 30
 *         description: Number of days to fetch
 *     responses:
 *       200:
 *         description: Daily sales data
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
 *                     period:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date
 *                         end:
 *                           type: string
 *                           format: date
 *                         days:
 *                           type: integer
 *                     daily:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           ecommerce:
 *                             type: number
 *                           hotel:
 *                             type: number
 *                           taxi:
 *                             type: number
 *                           media:
 *                             type: number
 *                           total:
 *                             type: number
 *                     totals:
 *                       type: object
 *                       properties:
 *                         ecommerce:
 *                           type: number
 *                         hotel:
 *                           type: number
 *                         taxi:
 *                           type: number
 *                         media:
 *                           type: number
 *                         total:
 *                           type: number
 *             example:
 *               success: true
 *               data:
 *                 period:
 *                   start: "2026-02-09"
 *                   end: "2026-02-16"
 *                   days: 7
 *                 daily:
 *                   - date: "2026-02-09"
 *                     ecommerce: 15000
 *                     hotel: 22000
 *                     taxi: 18000
 *                     media: 5000
 *                     total: 60000
 *                 totals:
 *                   ecommerce: 105000
 *                   hotel: 154000
 *                   taxi: 126000
 *                   media: 35000
 *                   total: 420000
 */
router.get('/sales', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days as string, 10) || 7, 1), 30);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const dailyData: DailySales[] = [];
    const totals: CategoryTotals = { ecommerce: 0, hotel: 0, taxi: 0, media: 0, total: 0 };

    // Fetch data for each day
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(startDate);
      dayStart.setDate(startDate.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayRevenue = await getRevenueForPeriod(dayStart, dayEnd);

      dailyData.push({
        date: dayStart.toISOString().split('T')[0],
        ...dayRevenue,
      });

      // Accumulate totals
      totals.ecommerce += dayRevenue.ecommerce;
      totals.hotel += dayRevenue.hotel;
      totals.taxi += dayRevenue.taxi;
      totals.media += dayRevenue.media;
      totals.total += dayRevenue.total;
    }

    // Round totals
    totals.ecommerce = Math.round(totals.ecommerce * 100) / 100;
    totals.hotel = Math.round(totals.hotel * 100) / 100;
    totals.taxi = Math.round(totals.taxi * 100) / 100;
    totals.media = Math.round(totals.media * 100) / 100;
    totals.total = Math.round(totals.total * 100) / 100;

    await createAudit(req, 'view_sales_data', 'dashboard_analytics');

    res.json({
      success: true,
      data: {
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          days,
        },
        daily: dailyData,
        totals,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get sales data', { error: message });
    res.status(500).json({ success: false, error: 'Failed to fetch sales data' });
  }
});

/**
 * @swagger
 * /api/dashboard/categories:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get category breakdown with comparison
 *     description: |
 *       Returns revenue breakdown by category with current vs previous period comparison.
 *       Includes percentage share and growth metrics.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month]
 *           default: week
 *         description: Comparison period
 *     responses:
 *       200:
 *         description: Category breakdown with trends
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
 *                     current:
 *                       type: object
 *                       properties:
 *                         period:
 *                           type: object
 *                           properties:
 *                             start:
 *                               type: string
 *                             end:
 *                               type: string
 *                         totals:
 *                           $ref: '#/components/schemas/CategoryTotals'
 *                     previous:
 *                       type: object
 *                       properties:
 *                         period:
 *                           type: object
 *                         totals:
 *                           $ref: '#/components/schemas/CategoryTotals'
 *                     breakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                           current_value:
 *                             type: number
 *                           previous_value:
 *                             type: number
 *                           percentage:
 *                             type: number
 *                             description: Share of total (0-100)
 *                           change_percent:
 *                             type: number
 *                             description: Growth vs previous period
 *                           trend:
 *                             type: string
 *                             enum: [up, down, stable]
 *             example:
 *               success: true
 *               data:
 *                 current:
 *                   period:
 *                     start: "2026-02-09"
 *                     end: "2026-02-16"
 *                   totals:
 *                     ecommerce: 105000
 *                     hotel: 154000
 *                     taxi: 126000
 *                     media: 35000
 *                     total: 420000
 *                 previous:
 *                   period:
 *                     start: "2026-02-02"
 *                     end: "2026-02-09"
 *                   totals:
 *                     ecommerce: 98000
 *                     hotel: 140000
 *                     taxi: 130000
 *                     media: 32000
 *                     total: 400000
 *                 breakdown:
 *                   - category: "ecommerce"
 *                     current_value: 105000
 *                     previous_value: 98000
 *                     percentage: 25
 *                     change_percent: 7.1
 *                     trend: "up"
 */
router.get(
  '/categories',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const period = req.query.period === 'month' ? 30 : 7;

      // Current period
      const currentEnd = new Date();
      const currentStart = new Date();
      currentStart.setDate(currentEnd.getDate() - period);

      // Previous period
      const previousEnd = new Date(currentStart);
      const previousStart = new Date();
      previousStart.setDate(currentStart.getDate() - period);

      const [currentTotals, previousTotals] = await Promise.all([
        getRevenueForPeriod(currentStart, currentEnd),
        getRevenueForPeriod(previousStart, previousEnd),
      ]);

      // Calculate breakdown with trends
      const categories = ['ecommerce', 'hotel', 'taxi', 'media'] as const;
      const breakdown = categories.map(cat => {
        const currentVal = currentTotals[cat];
        const previousVal = previousTotals[cat];
        const percentage =
          currentTotals.total > 0 ? Math.round((currentVal / currentTotals.total) * 100) : 0;
        const changePercent =
          previousVal > 0
            ? Math.round(((currentVal - previousVal) / previousVal) * 1000) / 10
            : currentVal > 0
              ? 100
              : 0;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (changePercent > 1) trend = 'up';
        else if (changePercent < -1) trend = 'down';

        return {
          category: cat,
          current_value: currentVal,
          previous_value: previousVal,
          percentage,
          change_percent: changePercent,
          trend,
        };
      });

      await createAudit(req, 'view_category_breakdown', 'dashboard_analytics');

      res.json({
        success: true,
        data: {
          current: {
            period: {
              start: currentStart.toISOString().split('T')[0],
              end: currentEnd.toISOString().split('T')[0],
            },
            totals: currentTotals,
          },
          previous: {
            period: {
              start: previousStart.toISOString().split('T')[0],
              end: previousEnd.toISOString().split('T')[0],
            },
            totals: previousTotals,
          },
          breakdown,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get category breakdown', { error: message });
      res.status(500).json({ success: false, error: 'Failed to fetch category breakdown' });
    }
  }
);

export default router;
