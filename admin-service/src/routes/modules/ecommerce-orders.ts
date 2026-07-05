import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit } from '../../middleware/audit';
import { AuthRequest, authenticate, requireAdmin, requireAnyAccess } from '../../middleware/auth';
import { calculatePagination, getPaginationRange, supabase } from '../../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * @swagger
 * /api/managers/ecommerce/orders:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get e-commerce orders
 *     description: Retrieve paginated list of orders with filtering by status and date range
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled, refunded]
 *       - in: query
 *         name: payment_status
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed, refunded]
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
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 orders:
 *                   - id: "o1234567-89ab-cdef-0123-456789abcdef"
 *                     order_number: "ORD-2026-001234"
 *                     user_id: "u1234567-89ab-cdef-0123-456789abcdef"
 *                     guest_email: null
 *                     subtotal: 24000
 *                     discount_amount: 2400
 *                     shipping_cost: 1500
 *                     tax_amount: 1800
 *                     total_amount: 24900
 *                     payment_method: "card"
 *                     payment_status: "paid"
 *                     status: "processing"
 *                     tracking_number: null
 *                     carrier: null
 *                     created_at: "2026-02-15T14:30:00Z"
 *                     updated_at: "2026-02-15T15:00:00Z"
 *                     user_profiles:
 *                       first_name: "John"
 *                       last_name: "Customer"
 *                       email: "john@example.com"
 *                       phone: "+2348012345678"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 1500
 *                 pages: 75
 */
router.get('/', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status, payment_status, start_date, end_date } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('ecommerce_orders')
      .select(
        `id, order_number, user_id, guest_email, subtotal, discount_amount, shipping_cost,
         tax_amount, total_amount, payment_method, payment_status, status,
         tracking_number, carrier, created_at, updated_at,
         user_profiles(first_name, last_name, email, phone)`,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (payment_status) query = query.eq('payment_status', payment_status);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    const { data: orders, count, error } = await query;
    if (error) throw error;

    await createAudit(req, 'view_orders', 'ecommerce_orders');
    res.json({
      success: true,
      data: { orders },
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get orders', { error: msg });
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

/**
 * @swagger
 * /api/managers/ecommerce/orders/latest:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get latest orders for dashboard
 *     description: Returns the most recent orders with product details for dashboard display
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Latest orders retrieved
 */
// NOTE: must be registered BEFORE /:id or Express matches "latest" as an order id
router.get('/latest', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 50);

    const { data: orders, error } = await supabase
      .from('ecommerce_orders')
      .select(
        `id, order_number, total_amount, status, created_at,
         items:ecommerce_order_items(product_name, quantity)`
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const formattedOrders = (orders || []).map((order: Record<string, unknown>) => {
      const items = (order.items as Array<{ product_name: string; quantity: number }>) || [];
      const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
      const productNames = items.map(item => item.product_name).join(', ');
      const revenue = Number(order.total_amount) || 0;

      return {
        id: order.id,
        order_number: order.order_number,
        products: productNames || 'N/A',
        quantity: totalQty,
        date: (order.created_at as string).split('T')[0],
        revenue,
        net_profit: Math.round(revenue * 0.2 * 100) / 100, // Estimated 20% margin
        status: order.status,
      };
    });

    await createAudit(req, 'view_latest_orders', 'ecommerce_orders');
    res.json({ success: true, data: { orders: formattedOrders } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get latest orders', { error: msg });
    res.status(500).json({ success: false, error: 'Failed to fetch latest orders' });
  }
});

/**
 * @swagger
 * /api/managers/ecommerce/orders/{id}:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get order details with items
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order details retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 order:
 *                   id: "o1234567-89ab-cdef-0123-456789abcdef"
 *                   order_number: "ORD-2026-001234"
 *                   total_amount: 24900
 *                   status: "processing"
 *                   items:
 *                     - id: "oi123"
 *                       product_name: "Premium Headphones"
 *                       quantity: 2
 *                       unit_price: 12000
 *                       total_price: 24000
 *                   status_history:
 *                     - status: "pending"
 *                       created_at: "2026-02-15T14:30:00Z"
 *                     - status: "processing"
 *                       created_at: "2026-02-15T15:00:00Z"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: order, error } = await supabase
      .from('ecommerce_orders')
      .select(
        `*,
         user_profiles(first_name, last_name, email, phone),
         items:ecommerce_order_items(id, product_id, product_name, quantity, unit_price:price_per_unit, total_price:subtotal),
         status_history:ecommerce_order_status_history(status:to_status, notes, created_at, created_by)`
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    await createAudit(req, 'view_order_details', 'ecommerce_orders', id);
    res.json({ success: true, data: { order } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get order details', { error: msg });
    res.status(500).json({ success: false, error: 'Failed to fetch order details' });
  }
});

/**
 * @swagger
 * /api/managers/ecommerce/orders/{id}/status:
 *   put:
 *     tags: [Manager - E-commerce]
 *     summary: Update order status
 *     description: Update order status with optional tracking information
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, shipped, delivered, cancelled, refunded]
 *               tracking_number:
 *                 type: string
 *               carrier:
 *                 type: string
 *               notes:
 *                 type: string
 *           example:
 *             status: "shipped"
 *             tracking_number: "TRK123456789"
 *             carrier: "DHL"
 *             notes: "Shipped via express delivery"
 *     responses:
 *       200:
 *         description: Order status updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 order:
 *                   id: "o1234567-89ab-cdef-0123-456789abcdef"
 *                   status: "shipped"
 *                   tracking_number: "TRK123456789"
 *                   carrier: "DHL"
 *                   updated_at: "2026-02-16T10:30:00Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id/status', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, tracking_number, carrier } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    // Must stay in sync with the ecommerce_orders_status_check DB constraint
    const validStatuses = [
      'pending',
      'pending_payment',
      'confirmed',
      'processing',
      'packed',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'refunded',
      'failed',
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const { data: existingOrder } = await supabase
      .from('ecommerce_orders')
      .select('status')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (tracking_number) updateData.tracking_number = tracking_number;
    if (carrier) updateData.carrier = carrier;
    if (status === 'delivered') updateData.delivered_at = new Date().toISOString();

    const { data: order, error } = await supabase
      .from('ecommerce_orders')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const { error: historyError } = await supabase.from('ecommerce_order_status_history').insert({
      order_id: id,
      from_status: existingOrder?.status || null,
      to_status: status,
      notes: notes || null,
      created_by: req.user?.id,
    });
    if (historyError) {
      logger.error('Failed to record order status history', { error: historyError.message, orderId: id });
    }

    await createAudit(req, 'update_order_status', 'ecommerce_orders', id);
    res.json({ success: true, data: { order } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to update order status', { error: msg });
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

export default router;
