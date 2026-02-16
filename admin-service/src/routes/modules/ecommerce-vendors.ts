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
 * /api/managers/ecommerce/vendors:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get e-commerce vendors
 *     description: Retrieve paginated list of vendors with search and status filtering
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by business name
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, verified, unverified]
 *     responses:
 *       200:
 *         description: Vendors retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 vendors:
 *                   - id: "v1234567-89ab-cdef-0123-456789abcdef"
 *                     business_name: "Tech Store Nigeria"
 *                     business_registration: "RC-123456"
 *                     total_sales: 5000000
 *                     total_orders: 350
 *                     average_rating: 4.5
 *                     commission_rate: 10
 *                     is_verified: true
 *                     is_active: true
 *                     created_at: "2025-06-15T10:30:00Z"
 *                     user_profiles:
 *                       first_name: "John"
 *                       last_name: "Vendor"
 *                       email: "john@techstore.ng"
 *                       phone: "+2348012345678"
 *                       avatar_url: "https://storage.example.com/avatars/john.jpg"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 100
 *                 pages: 5
 */
router.get('/', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, status } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('ecommerce_vendors')
      .select(
        `id, business_name, business_registration, total_sales, total_orders,
         average_rating, commission_rate, is_verified, is_active, created_at,
         user_profiles(first_name, last_name, email, phone, avatar_url)`,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search) query = query.ilike('business_name', `%${search}%`);
    if (status === 'active') query = query.eq('is_active', true);
    else if (status === 'inactive') query = query.eq('is_active', false);
    else if (status === 'verified') query = query.eq('is_verified', true);
    else if (status === 'unverified') query = query.eq('is_verified', false);

    const { data: vendors, count, error } = await query;
    if (error) throw error;

    await createAudit(req, 'view_vendors', 'ecommerce_vendors');
    res.json({
      success: true,
      data: { vendors },
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get vendors', { error: msg });
    res.status(500).json({ success: false, error: 'Failed to fetch vendors' });
  }
});

/**
 * @swagger
 * /api/managers/ecommerce/vendors/{id}:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get vendor details with products and sales
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
 *         description: Vendor details retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 vendor:
 *                   id: "v1234567-89ab-cdef-0123-456789abcdef"
 *                   business_name: "Tech Store Nigeria"
 *                   total_sales: 5000000
 *                   total_orders: 350
 *                   average_rating: 4.5
 *                   is_verified: true
 *                   products_count: 45
 *                   recent_products:
 *                     - id: "p123"
 *                       name: "Premium Headphones"
 *                       final_price: 12750
 *                       order_count: 89
 *                   sales_summary:
 *                     today: 150000
 *                     this_week: 850000
 *                     this_month: 2500000
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: vendor, error } = await supabase
      .from('ecommerce_vendors')
      .select(`*, user_profiles(first_name, last_name, email, phone, avatar_url)`)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    // Get products count and recent products
    const { count: productsCount } = await supabase
      .from('ecommerce_products')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', id)
      .is('deleted_at', null);

    const { data: recentProducts } = await supabase
      .from('ecommerce_products')
      .select('id, name, final_price, order_count, average_rating')
      .eq('vendor_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate sales summary
    const [today] = new Date().toISOString().split('T');
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date();
    monthStart.setDate(1);

    const { data: orders } = await supabase
      .from('ecommerce_orders')
      .select('total_amount, created_at')
      .contains('vendor_ids', [id])
      .eq('status', 'delivered');

    const salesSummary = { today: 0, this_week: 0, this_month: 0 };
    (orders || []).forEach((order: Record<string, unknown>) => {
      const amount = Number(order.total_amount) || 0;
      const orderDate = new Date(order.created_at as string);
      const [orderDateStr] = orderDate.toISOString().split('T');
      if (orderDateStr === today) salesSummary.today += amount;
      if (orderDate >= weekAgo) salesSummary.this_week += amount;
      if (orderDate >= monthStart) salesSummary.this_month += amount;
    });

    await createAudit(req, 'view_vendor_details', 'ecommerce_vendors', id);
    res.json({
      success: true,
      data: {
        vendor: {
          ...vendor,
          products_count: productsCount || 0,
          recent_products: recentProducts || [],
          sales_summary: salesSummary,
        },
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get vendor details', { error: msg });
    res.status(500).json({ success: false, error: 'Failed to fetch vendor details' });
  }
});

/**
 * @swagger
 * /api/managers/ecommerce/vendors/{id}/verify:
 *   put:
 *     tags: [Manager - E-commerce]
 *     summary: Verify or unverify vendor
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
 *             required: [is_verified]
 *             properties:
 *               is_verified:
 *                 type: boolean
 *           example:
 *             is_verified: true
 *     responses:
 *       200:
 *         description: Vendor verification updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 vendor:
 *                   id: "v1234567-89ab-cdef-0123-456789abcdef"
 *                   business_name: "Tech Store Nigeria"
 *                   is_verified: true
 *                   verified_at: "2026-02-16T10:30:00Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id/verify', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_verified } = req.body;

    if (typeof is_verified !== 'boolean') {
      return res.status(400).json({ success: false, error: 'is_verified must be a boolean' });
    }

    const updateData: Record<string, unknown> = {
      is_verified,
      updated_at: new Date().toISOString(),
    };
    if (is_verified) updateData.verified_at = new Date().toISOString();

    const { data: vendor, error } = await supabase
      .from('ecommerce_vendors')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    await createAudit(
      req,
      is_verified ? 'verify_vendor' : 'unverify_vendor',
      'ecommerce_vendors',
      id
    );
    res.json({ success: true, data: { vendor } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to update vendor verification', { error: msg });
    res.status(500).json({ success: false, error: 'Failed to update vendor verification' });
  }
});

export default router;
