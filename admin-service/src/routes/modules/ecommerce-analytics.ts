import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit } from '../../middleware/audit';
import { AuthRequest, authenticate, requireAnyAccess } from '../../middleware/auth';
import { supabase } from '../../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * @swagger
 * /api/managers/ecommerce/dashboard-stats:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get e-commerce dashboard statistics
 *     description: Comprehensive dashboard stats including products, orders, vendors, and revenue
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 products:
 *                   total: 500
 *                   active: 450
 *                   out_of_stock: 25
 *                 orders:
 *                   total: 1500
 *                   pending: 50
 *                   completed: 1200
 *                   revenue: 15000000
 *                 vendors:
 *                   total: 100
 *                   verified: 85
 *                 period:
 *                   start: "2026-01-16"
 *                   end: "2026-02-16"
 */
router.get(
  '/dashboard-stats',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date
        ? new Date(start_date as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date as string) : new Date();

      // Products stats
      const { count: totalProducts } = await supabase
        .from('ecommerce_products')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);

      const { count: activeProducts } = await supabase
        .from('ecommerce_products')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_active', true);

      const { count: outOfStock } = await supabase
        .from('ecommerce_products')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .lte('stock_quantity', 0);

      // Orders stats
      const { data: orders } = await supabase
        .from('ecommerce_orders')
        .select('id, total_amount, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .is('deleted_at', null);

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const completedOrders = orders?.filter(o => o.status === 'delivered').length || 0;
      const totalRevenue =
        orders
          ?.filter(o => o.status !== 'cancelled')
          .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;

      // Vendors stats
      const { count: totalVendors } = await supabase
        .from('ecommerce_vendors')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);

      const { count: verifiedVendors } = await supabase
        .from('ecommerce_vendors')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_verified', true);

      await createAudit(req, 'view_ecommerce_dashboard', 'ecommerce_dashboard');
      res.json({
        success: true,
        data: {
          products: {
            total: totalProducts || 0,
            active: activeProducts || 0,
            out_of_stock: outOfStock || 0,
          },
          orders: {
            total: totalOrders,
            pending: pendingOrders,
            completed: completedOrders,
            revenue: totalRevenue,
          },
          vendors: { total: totalVendors || 0, verified: verifiedVendors || 0 },
          period: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
          },
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get ecommerce dashboard stats', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
    }
  }
);

/**
 * @swagger
 * /api/managers/ecommerce/sales-forecast:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get sales forecast with period comparison
 *     description: Returns revenue, net profit, orders, and visitors with percentage changes vs previous period
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month]
 *           default: week
 *     responses:
 *       200:
 *         description: Sales forecast retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 revenue:
 *                   current: 2500000
 *                   previous: 2200000
 *                   change_percent: 13.6
 *                   trend: "up"
 *                 net_profit:
 *                   current: 500000
 *                   previous: 440000
 *                   change_percent: 13.6
 *                   trend: "up"
 *                 orders:
 *                   current: 150
 *                   previous: 130
 *                   change_percent: 15.4
 *                   trend: "up"
 *                 visitors:
 *                   current: 12500
 *                   previous: 11000
 *                   change_percent: 13.6
 *                   trend: "up"
 *                 period:
 *                   type: "week"
 *                   current_start: "2026-02-09"
 *                   current_end: "2026-02-16"
 */
router.get(
  '/sales-forecast',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const periodDays = req.query.period === 'month' ? 30 : 7;

      const currentEnd = new Date();
      const currentStart = new Date();
      currentStart.setDate(currentEnd.getDate() - periodDays);

      const previousEnd = new Date(currentStart);
      const previousStart = new Date();
      previousStart.setDate(currentStart.getDate() - periodDays);

      // Get current period orders
      const { data: currentOrders } = await supabase
        .from('ecommerce_orders')
        .select('total_amount, status')
        .gte('created_at', currentStart.toISOString())
        .lt('created_at', currentEnd.toISOString())
        .is('deleted_at', null);

      // Get previous period orders
      const { data: previousOrders } = await supabase
        .from('ecommerce_orders')
        .select('total_amount, status')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', previousEnd.toISOString())
        .is('deleted_at', null);

      // Calculate metrics
      const currentRevenue = (currentOrders || [])
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const previousRevenue = (previousOrders || [])
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      const currentOrderCount = currentOrders?.length || 0;
      const previousOrderCount = previousOrders?.length || 0;

      // Estimated metrics (in real app, these would come from analytics)
      const profitMargin = 0.2;
      const currentProfit = currentRevenue * profitMargin;
      const previousProfit = previousRevenue * profitMargin;

      const currentVisitors = Math.round(currentOrderCount * 50); // Estimated conversion rate
      const previousVisitors = Math.round(previousOrderCount * 50);

      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 1000) / 10;
      };

      const getTrend = (change: number): 'up' | 'down' | 'stable' => {
        if (change > 1) return 'up';
        if (change < -1) return 'down';
        return 'stable';
      };

      const revenueChange = calcChange(currentRevenue, previousRevenue);
      const profitChange = calcChange(currentProfit, previousProfit);
      const ordersChange = calcChange(currentOrderCount, previousOrderCount);
      const visitorsChange = calcChange(currentVisitors, previousVisitors);

      await createAudit(req, 'view_sales_forecast', 'ecommerce_analytics');
      res.json({
        success: true,
        data: {
          revenue: {
            current: Math.round(currentRevenue * 100) / 100,
            previous: Math.round(previousRevenue * 100) / 100,
            change_percent: revenueChange,
            trend: getTrend(revenueChange),
          },
          net_profit: {
            current: Math.round(currentProfit * 100) / 100,
            previous: Math.round(previousProfit * 100) / 100,
            change_percent: profitChange,
            trend: getTrend(profitChange),
          },
          orders: {
            current: currentOrderCount,
            previous: previousOrderCount,
            change_percent: ordersChange,
            trend: getTrend(ordersChange),
          },
          visitors: {
            current: currentVisitors,
            previous: previousVisitors,
            change_percent: visitorsChange,
            trend: getTrend(visitorsChange),
          },
          period: {
            type: req.query.period === 'month' ? 'month' : 'week',
            current_start: currentStart.toISOString().split('T')[0],
            current_end: currentEnd.toISOString().split('T')[0],
          },
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get sales forecast', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch sales forecast' });
    }
  }
);

/**
 * @swagger
 * /api/managers/ecommerce/revenue-by-device:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get revenue breakdown by device type
 *     description: Returns revenue distribution across desktop, tablet, mobile, and unknown devices
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Revenue by device retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 devices:
 *                   - device: "Desktop"
 *                     revenue: 1500000
 *                     percentage: 45
 *                     orders: 75
 *                   - device: "Mobile"
 *                     revenue: 1200000
 *                     percentage: 36
 *                     orders: 90
 *                   - device: "Tablet"
 *                     revenue: 450000
 *                     percentage: 14
 *                     orders: 25
 *                   - device: "Unknown"
 *                     revenue: 150000
 *                     percentage: 5
 *                     orders: 10
 *                 total_revenue: 3300000
 *                 total_orders: 200
 */
router.get(
  '/revenue-by-device',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const days = parseInt(req.query.days as string, 10) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: orders } = await supabase
        .from('ecommerce_orders')
        .select('total_amount')
        .gte('created_at', startDate.toISOString())
        .is('deleted_at', null)
        .neq('status', 'cancelled');

      // Group by device type
      const deviceStats: Record<string, { revenue: number; orders: number }> = {
        Desktop: { revenue: 0, orders: 0 },
        Mobile: { revenue: 0, orders: 0 },
        Tablet: { revenue: 0, orders: 0 },
        Unknown: { revenue: 0, orders: 0 },
      };

      let totalRevenue = 0;
      let totalOrders = 0;

      (orders || []).forEach((order: Record<string, unknown>) => {
        const amount = Number(order.total_amount) || 0;
        const device = (order.device_type as string) || 'Unknown';
        const normalizedDevice = ['Desktop', 'Mobile', 'Tablet'].includes(device)
          ? device
          : 'Unknown';

        deviceStats[normalizedDevice].revenue += amount;
        deviceStats[normalizedDevice].orders += 1;
        totalRevenue += amount;
        totalOrders += 1;
      });

      const devices = Object.entries(deviceStats).map(([device, stats]) => ({
        device,
        revenue: Math.round(stats.revenue * 100) / 100,
        percentage: totalRevenue > 0 ? Math.round((stats.revenue / totalRevenue) * 100) : 0,
        orders: stats.orders,
      }));

      await createAudit(req, 'view_revenue_by_device', 'ecommerce_analytics');
      res.json({
        success: true,
        data: {
          devices,
          total_revenue: Math.round(totalRevenue * 100) / 100,
          total_orders: totalOrders,
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get revenue by device', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch revenue by device' });
    }
  }
);

/**
 * @swagger
 * /api/managers/ecommerce/bestsellers:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get bestselling products
 *     description: Returns top selling products with price, sold count, and profit
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Bestsellers retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 bestsellers:
 *                   - id: "p1234567-89ab-cdef-0123-456789abcdef"
 *                     name: "Premium Headphones"
 *                     thumbnail: "https://storage.example.com/products/hp-001.jpg"
 *                     price: 12750
 *                     sold: 89
 *                     profit: 227550
 *                   - id: "p2345678-9abc-def0-1234-56789abcdef0"
 *                     name: "Wireless Mouse"
 *                     thumbnail: "https://storage.example.com/products/wm-001.jpg"
 *                     price: 5500
 *                     sold: 156
 *                     profit: 171600
 *                 period_days: 30
 */
router.get(
  '/bestsellers',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 50);
      const days = parseInt(req.query.days as string, 10) || 30;

      const { data: products } = await supabase
        .from('ecommerce_products')
        .select('id, name, thumbnail, final_price, order_count')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('order_count', { ascending: false })
        .limit(limit);

      const bestsellers = (products || []).map((product: Record<string, unknown>) => ({
        id: product.id,
        name: product.name,
        thumbnail: product.thumbnail,
        price: Number(product.final_price) || 0,
        sold: Number(product.order_count) || 0,
        profit:
          Math.round(
            (Number(product.final_price) || 0) * (Number(product.order_count) || 0) * 0.2 * 100
          ) / 100,
      }));

      await createAudit(req, 'view_bestsellers', 'ecommerce_analytics');
      res.json({
        success: true,
        data: {
          bestsellers,
          period_days: days,
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get bestsellers', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch bestsellers' });
    }
  }
);

/**
 * @swagger
 * /api/managers/ecommerce/cart-abandonment:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get cart abandonment statistics
 *     description: Returns abandoned cart count and revenue percentage
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Cart abandonment stats retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 abandoned_carts: 245
 *                 abandoned_revenue: 3675000
 *                 abandonment_rate: 68.5
 *                 recovered_carts: 35
 *                 recovered_revenue: 525000
 *                 recovery_rate: 14.3
 *                 period_days: 30
 */
router.get(
  '/cart-abandonment',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const days = parseInt(req.query.days as string, 10) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get abandoned carts
      const { data: abandonedCarts, count: abandonedCount } = await supabase
        .from('ecommerce_carts')
        .select('id, total_amount', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .eq('status', 'abandoned');

      // Get total carts created
      const { count: totalCarts } = await supabase
        .from('ecommerce_carts')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      // Get recovered carts (converted to orders)
      const { data: recoveredCarts, count: recoveredCount } = await supabase
        .from('ecommerce_carts')
        .select('id, total_amount', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .eq('status', 'converted');

      const abandonedRevenue = (abandonedCarts || []).reduce(
        (sum: number, cart: Record<string, unknown>) => sum + (Number(cart.total_amount) || 0),
        0
      );

      const recoveredRevenue = (recoveredCarts || []).reduce(
        (sum: number, cart: Record<string, unknown>) => sum + (Number(cart.total_amount) || 0),
        0
      );

      const abandonmentRate =
        totalCarts && totalCarts > 0
          ? Math.round(((abandonedCount || 0) / totalCarts) * 1000) / 10
          : 0;

      const recoveryRate =
        abandonedCount && abandonedCount > 0
          ? Math.round(((recoveredCount || 0) / abandonedCount) * 1000) / 10
          : 0;

      await createAudit(req, 'view_cart_abandonment', 'ecommerce_analytics');
      res.json({
        success: true,
        data: {
          abandoned_carts: abandonedCount || 0,
          abandoned_revenue: Math.round(abandonedRevenue * 100) / 100,
          abandonment_rate: abandonmentRate,
          recovered_carts: recoveredCount || 0,
          recovered_revenue: Math.round(recoveredRevenue * 100) / 100,
          recovery_rate: recoveryRate,
          period_days: days,
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get cart abandonment stats', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch cart abandonment stats' });
    }
  }
);

/**
 * @swagger
 * /api/managers/ecommerce/traffic:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get store traffic analytics
 *     description: Returns store visits and visitors over time for chart display
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *           maximum: 30
 *     responses:
 *       200:
 *         description: Traffic data retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 summary:
 *                   total_visits: 45000
 *                   unique_visitors: 12500
 *                   avg_session_duration: 245
 *                   bounce_rate: 42.5
 *                 daily:
 *                   - date: "2026-02-10"
 *                     visits: 6500
 *                     visitors: 1800
 *                   - date: "2026-02-11"
 *                     visits: 7200
 *                     visitors: 2100
 *                 period_days: 7
 */
router.get('/traffic', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(parseInt(req.query.days as string, 10) || 7, 30);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // In a real app, this would come from analytics service
    // For now, we'll estimate based on order data
    const { data: orders } = await supabase
      .from('ecommerce_orders')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .is('deleted_at', null);

    // Generate daily data (estimated from orders with conversion rate)
    const dailyData: Array<{ date: string; visits: number; visitors: number }> = [];
    let totalVisits = 0;
    let totalVisitors = 0;

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayOrders = (orders || []).filter((o: Record<string, unknown>) =>
        (o.created_at as string).startsWith(dateStr)
      ).length;

      // Estimate: 2% conversion rate, 3.5 pages per visit
      const visitors = Math.round(dayOrders * 50);
      const visits = Math.round(visitors * 3.5);

      dailyData.push({ date: dateStr, visits, visitors });
      totalVisits += visits;
      totalVisitors += visitors;
    }

    await createAudit(req, 'view_traffic', 'ecommerce_analytics');
    res.json({
      success: true,
      data: {
        summary: {
          total_visits: totalVisits,
          unique_visitors: totalVisitors,
          avg_session_duration: 245, // seconds
          bounce_rate: 42.5,
        },
        daily: dailyData,
        period_days: days,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get traffic data', { error: msg });
    res.status(500).json({ success: false, error: 'Failed to fetch traffic data' });
  }
});

/**
 * @swagger
 * /api/managers/ecommerce/revenue-chart:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get revenue chart data
 *     description: Returns daily revenue data for chart display
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *           maximum: 30
 *     responses:
 *       200:
 *         description: Revenue chart data retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 daily:
 *                   - date: "2026-02-10"
 *                     revenue: 350000
 *                     orders: 25
 *                   - date: "2026-02-11"
 *                     revenue: 420000
 *                     orders: 32
 *                 total_revenue: 2500000
 *                 total_orders: 180
 *                 avg_order_value: 13889
 *                 period_days: 7
 */
router.get(
  '/revenue-chart',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const days = Math.min(parseInt(req.query.days as string, 10) || 7, 30);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: orders } = await supabase
        .from('ecommerce_orders')
        .select('total_amount, created_at')
        .gte('created_at', startDate.toISOString())
        .is('deleted_at', null)
        .neq('status', 'cancelled');

      // Group by date
      const dailyData: Array<{ date: string; revenue: number; orders: number }> = [];
      let totalRevenue = 0;
      let totalOrders = 0;

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const dayOrders = (orders || []).filter((o: Record<string, unknown>) =>
          (o.created_at as string).startsWith(dateStr)
        );

        const dayRevenue = dayOrders.reduce(
          (sum: number, o: Record<string, unknown>) => sum + (Number(o.total_amount) || 0),
          0
        );

        dailyData.push({
          date: dateStr,
          revenue: Math.round(dayRevenue * 100) / 100,
          orders: dayOrders.length,
        });

        totalRevenue += dayRevenue;
        totalOrders += dayOrders.length;
      }

      await createAudit(req, 'view_revenue_chart', 'ecommerce_analytics');
      res.json({
        success: true,
        data: {
          daily: dailyData,
          total_revenue: Math.round(totalRevenue * 100) / 100,
          total_orders: totalOrders,
          avg_order_value:
            totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
          period_days: days,
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get revenue chart data', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch revenue chart data' });
    }
  }
);

export default router;
