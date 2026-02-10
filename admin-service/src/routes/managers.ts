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

      const { data: order, error } = await supabase
        .from('ecommerce_orders')
        .update({
          status,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();

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
        .single();

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
