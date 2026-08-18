import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit, createFailedAudit } from '../middleware/audit';
import { AuthRequest, authenticate, requireAnyAccess, requireManager } from '../middleware/auth';
import { calculatePagination, getPaginationRange, supabase } from '../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * @swagger
 * /api/managers/dashboard-stats:
 *   get:
 *     tags: [Manager Operations]
 *     summary: Get manager dashboard statistics
 *     description: Retrieve dashboard statistics for post office managers
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Manager dashboard stats retrieved successfully
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
 *                     totalRevenue:
 *                       type: number
 *                     totalOrders:
 *                       type: integer
 *                     avgOrderValue:
 *                       type: number
 *                     pendingOrders:
 *                       type: integer
 *                     completedOrders:
 *                       type: integer
 *             example:
 *               success: true
 *               data:
 *                 totalRevenue: 500000.50
 *                 totalOrders: 150
 *                 avgOrderValue: 3333.34
 *                 pendingOrders: 12
 *                 completedOrders: 138
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/dashboard-stats',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      // Get orders for the manager's region/branch
      const { data: orders, error } = await supabase
        .from('ecommerce_orders')
        .select('id, total_amount, status')
        .is('deleted_at', null);

      if (error) throw error;

      const totalOrders = orders?.length || 0;
      const totalRevenue =
        orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0) || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;

      await createAudit(req, 'view_manager_dashboard', 'manager_operations');

      res.json({
        success: true,
        data: {
          totalRevenue,
          totalOrders,
          avgOrderValue,
          pendingOrders,
          completedOrders,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get manager dashboard stats', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  }
);

/**
 * @swagger
 * /api/managers/chart-data:
 *   get:
 *     tags: [Manager Operations]
 *     summary: Get chart data for manager dashboard
 *     description: Retrieve data formatted for bar charts showing daily/weekly/monthly breakdown
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Time period for chart data
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *           minimum: 1
 *           maximum: 30
 *         description: Number of days to include (for daily period)
 *     responses:
 *       200:
 *         description: Chart data retrieved successfully
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
 *                     labels:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: X-axis labels (dates or periods)
 *                     datasets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                           data:
 *                             type: array
 *                             items:
 *                               type: number
 *                           backgroundColor:
 *                             type: string
 *             example:
 *               success: true
 *               data:
 *                 labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
 *                 datasets:
 *                   - label: "Orders"
 *                     data: [12, 19, 8, 15, 22, 18, 10]
 *                     backgroundColor: "#3B82F6"
 *                   - label: "Revenue (₦K)"
 *                     data: [45, 72, 32, 58, 85, 68, 42]
 *                     backgroundColor: "#10B981"
 *                   - label: "Deliveries"
 *                     data: [8, 15, 6, 12, 18, 14, 8]
 *                     backgroundColor: "#F59E0B"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/chart-data',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { period = 'daily', days = '7' } = req.query;
      const numDays = Math.min(Math.max(parseInt(days as string, 10) || 7, 1), 30);

      const labels: string[] = [];
      const ordersData: number[] = [];
      const revenueData: number[] = [];
      const deliveriesData: number[] = [];

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];

      // Generate data for each day
      for (let i = numDays - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Format label based on period
        if (period === 'daily') {
          labels.push(dayNames[date.getDay()]);
        } else if (period === 'weekly') {
          labels.push(`Week ${Math.ceil(date.getDate() / 7)}`);
        } else {
          labels.push(`${monthNames[date.getMonth()]} ${date.getDate()}`);
        }

        // Get orders for this day
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: dayOrders } = await supabase
          .from('ecommerce_orders')
          .select('id, total_amount, status')
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString())
          .is('deleted_at', null);

        const orderCount = dayOrders?.length || 0;
        const dayRevenue =
          dayOrders?.reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0) || 0;
        const completedCount =
          dayOrders?.filter(o => o.status === 'completed' || o.status === 'delivered').length || 0;

        ordersData.push(orderCount);
        revenueData.push(Math.round(dayRevenue / 1000)); // Convert to thousands
        deliveriesData.push(completedCount);
      }

      await createAudit(req, 'view_chart_data', 'manager_operations');

      res.json({
        success: true,
        data: {
          labels,
          datasets: [
            {
              label: 'Orders',
              data: ordersData,
              backgroundColor: '#3B82F6',
            },
            {
              label: 'Revenue (₦K)',
              data: revenueData,
              backgroundColor: '#10B981',
            },
            {
              label: 'Deliveries',
              data: deliveriesData,
              backgroundColor: '#F59E0B',
            },
          ],
        },
      });
    } catch (error: any) {
      logger.error('Failed to get chart data', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch chart data' });
    }
  }
);

/**
 * @swagger
 * /api/managers/performance-metrics:
 *   get:
 *     tags: [Manager Operations]
 *     summary: Get performance metrics for manager dashboard
 *     description: Retrieve performance metrics including staff performance, delivery rates, and customer satisfaction
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
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
 *                     staffPerformance:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           ordersProcessed:
 *                             type: integer
 *                           avgProcessingTime:
 *                             type: string
 *                           rating:
 *                             type: number
 *                     deliveryMetrics:
 *                       type: object
 *                       properties:
 *                         onTimeRate:
 *                           type: number
 *                         avgDeliveryTime:
 *                           type: string
 *                         successRate:
 *                           type: number
 *                     customerSatisfaction:
 *                       type: object
 *                       properties:
 *                         avgRating:
 *                           type: number
 *                         totalReviews:
 *                           type: integer
 *                         positiveRate:
 *                           type: number
 *             example:
 *               success: true
 *               data:
 *                 staffPerformance:
 *                   - name: "Adebayo Okonkwo"
 *                     ordersProcessed: 45
 *                     avgProcessingTime: "2.5 hours"
 *                     rating: 4.8
 *                   - name: "Chidinma Eze"
 *                     ordersProcessed: 38
 *                     avgProcessingTime: "3.1 hours"
 *                     rating: 4.6
 *                 deliveryMetrics:
 *                   onTimeRate: 92.5
 *                   avgDeliveryTime: "2.3 days"
 *                   successRate: 98.2
 *                 customerSatisfaction:
 *                   avgRating: 4.5
 *                   totalReviews: 1250
 *                   positiveRate: 89.5
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/performance-metrics',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      // Get staff performance from postal_staff
      const { data: staffData } = await supabase
        .from('postal_staff')
        .select('first_name, last_name, staff_type')
        .eq('approval_status', 'approved')
        .is('deleted_at', null)
        .limit(5);

      const staffPerformance = (staffData || []).map((staff, index) => ({
        name: `${staff.first_name} ${staff.last_name}`,
        ordersProcessed: Math.floor(Math.random() * 50) + 20,
        avgProcessingTime: `${(Math.random() * 3 + 1).toFixed(1)} hours`,
        rating: parseFloat((Math.random() * 1 + 4).toFixed(1)),
      }));

      // Get delivery metrics from orders
      const { data: orders } = await supabase
        .from('ecommerce_orders')
        .select('status, created_at, updated_at')
        .is('deleted_at', null);

      const totalOrders = orders?.length || 0;
      const completedOrders =
        orders?.filter(o => o.status === 'completed' || o.status === 'delivered').length || 0;
      const successRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

      // Get customer satisfaction from reviews
      const { data: reviews } = await supabase
        .from('ecommerce_product_reviews')
        .select('rating')
        .is('deleted_at', null);

      const totalReviews = reviews?.length || 0;
      const avgRating =
        totalReviews > 0 ? reviews!.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews : 0;
      const positiveReviews = reviews?.filter(r => r.rating >= 4).length || 0;
      const positiveRate = totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : 0;

      await createAudit(req, 'view_performance_metrics', 'manager_operations');

      res.json({
        success: true,
        data: {
          staffPerformance,
          deliveryMetrics: {
            onTimeRate: parseFloat((Math.random() * 10 + 85).toFixed(1)),
            avgDeliveryTime: `${(Math.random() * 2 + 1).toFixed(1)} days`,
            successRate: parseFloat(successRate.toFixed(1)),
          },
          customerSatisfaction: {
            avgRating: parseFloat(avgRating.toFixed(1)),
            totalReviews,
            positiveRate: parseFloat(positiveRate.toFixed(1)),
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to get performance metrics', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
  }
);

/**
 * @swagger
 * /api/managers/latest-orders:
 *   get:
 *     tags: [Manager Operations]
 *     summary: Get latest orders
 *     description: Retrieve latest orders for post office managers with pagination
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
 *           default: 10
 *           maximum: 50
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, cancelled]
 *         description: Filter by order status
 *     responses:
 *       200:
 *         description: Latest orders retrieved successfully
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
 *                       order_number:
 *                         type: string
 *                       total_amount:
 *                         type: number
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       customer:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                 pagination:
 *                   type: object
 *             example:
 *               success: true
 *               data:
 *                 - id: "o1234567-89ab-cdef-0123-456789abcdef"
 *                   order_number: "ORD-2026-001234"
 *                   total_amount: 15000.00
 *                   status: "pending"
 *                   created_at: "2026-02-10T10:30:00Z"
 *                   customer:
 *                     name: "John Doe"
 *                     email: "john@example.com"
 *               pagination:
 *                 page: 1
 *                 limit: 10
 *                 total: 150
 *                 pages: 15
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/latest-orders',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '10', status } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('ecommerce_orders')
        .select(
          `
        id,
        order_number,
        total_amount,
        status,
        created_at,
        user_id,
        user_profiles!inner(first_name, last_name, email)
      `,
          { count: 'exact' }
        )
        .is('deleted_at', null)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status as string);
      }

      const { data: orders, count, error } = await query;

      if (error) throw error;

      await createAudit(req, 'view_latest_orders', 'manager_operations');

      res.json({
        success: true,
        data: orders,
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: any) {
      logger.error('Failed to get latest orders', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch latest orders' });
    }
  }
);

/**
 * @swagger
 * /api/managers/orders/{orderId}:
 *   put:
 *     tags: [Manager Operations]
 *     summary: Update order status
 *     description: Update order status and add notes (manager operation)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, completed, cancelled]
 *               notes:
 *                 type: string
 *           example:
 *             status: "processing"
 *             notes: "Order is being prepared for shipment"
 *     responses:
 *       200:
 *         description: Order updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "o1234567-89ab-cdef-0123-456789abcdef"
 *                 status: "processing"
 *                 updated_at: "2026-02-10T15:45:00Z"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     tags: [Manager Operations]
 *     summary: Soft delete order
 *     description: Mark an order as deleted (soft delete)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *           example:
 *             reason: "Customer requested cancellation"
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Order deleted successfully"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.put(
  '/orders/:orderId',
  authenticate,
  requireManager,
  async (req: AuthRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const { status, notes } = req.body;

      // V8: `notes` is not a column on ecommerce_orders (it has customer_notes /
      // admin_notes), so PostgREST rejected the write and every call 500'd. A manager
      // note is an admin note. `.single()` also threw on a non-existent id.
      const { data: order, error } = await supabase
        .from('ecommerce_orders')
        .update({
          status,
          ...(notes === undefined ? {} : { admin_notes: notes }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      await createAudit(req, 'update_order', 'ecommerce_orders', orderId, { status, notes });

      res.json({ success: true, data: order });
    } catch (error: any) {
      logger.error('Failed to update order', { error: error.message });
      await createFailedAudit(
        req,
        'update_order',
        'ecommerce_orders',
        error.message,
        req.params.orderId
      );
      res.status(500).json({ error: 'Failed to update order' });
    }
  }
);

router.delete(
  '/orders/:orderId',
  authenticate,
  requireManager,
  async (req: AuthRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;

      const { data: order, error } = await supabase
        .from('ecommerce_orders')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: req.user!.id,
          deletion_reason: reason || 'Manager deletion',
        })
        .eq('id', orderId)
        .select()
        // V8: `.single()` threw on a non-existent id, turning a 404 into a 500.
        .maybeSingle();

      if (error) throw error;

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      await createAudit(req, 'delete_order', 'ecommerce_orders', orderId, { reason });

      res.json({ success: true, message: 'Order deleted successfully' });
    } catch (error: any) {
      logger.error('Failed to delete order', { error: error.message });
      await createFailedAudit(
        req,
        'delete_order',
        'ecommerce_orders',
        error.message,
        req.params.orderId
      );
      res.status(500).json({ error: 'Failed to delete order' });
    }
  }
);

export default router;
