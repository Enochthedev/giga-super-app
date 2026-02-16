import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit } from '../middleware/audit';
import { AuthRequest, authenticate, requireAdmin, requireAnyAccess } from '../middleware/auth';
import { calculatePagination, getPaginationRange, supabase } from '../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

// ============================================================================
// E-COMMERCE MODULE: /api/managers/ecommerce/*
// ============================================================================

/**
 * @swagger
 * /api/managers/ecommerce/products:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get e-commerce products
 *     description: Retrieve paginated list of products with search and filtering
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by product name or SKU
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: vendor_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 products:
 *                   - id: "p1234567-89ab-cdef-0123-456789abcdef"
 *                     name: "Premium Headphones"
 *                     sku: "SKU-HP-001"
 */
router.get(
  '/ecommerce/products',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', search, category_id, vendor_id, status } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('ecommerce_products')
        .select(
          `id, name, slug, base_price, discount_percentage, final_price,
           sku, stock_quantity, thumbnail, is_active, is_featured,
           view_count, order_count, average_rating, review_count, created_at,
           vendor:ecommerce_vendors(id, business_name),
           category:ecommerce_categories(id, name)`,
          { count: 'exact' }
        )
        .is('deleted_at', null)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      if (category_id) query = query.eq('category_id', category_id);
      if (vendor_id) query = query.eq('vendor_id', vendor_id);
      if (status === 'active') query = query.eq('is_active', true);
      else if (status === 'inactive') query = query.eq('is_active', false);

      const { data: products, count, error } = await query;
      if (error) throw error;

      await createAudit(req, 'view_products', 'ecommerce_products');
      res.json({
        success: true,
        data: { products },
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get products', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch products' });
    }
  }
);

/**
 * @swagger
 * /api/managers/ecommerce/products/{id}:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get product details
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
 *         description: Product details retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 product:
 *                   id: "p1234567-89ab-cdef-0123-456789abcdef"
 *                   name: "Premium Headphones"
 *                   base_price: 15000
 *                   final_price: 12750
 *                   discount_percentage: 15
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/ecommerce/products/:id',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: product, error } = await supabase
        .from('ecommerce_products')
        .select(
          `*, vendor:ecommerce_vendors(id, business_name, average_rating, is_verified),
             category:ecommerce_categories(id, name, slug),
             variants:ecommerce_product_variants(id, name, sku, price, stock_quantity)`
        )
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      await createAudit(req, 'view_product_details', 'ecommerce_products', id);
      res.json({ success: true, data: { product } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get product details', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch product details' });
    }
  }
);

/**
 * @swagger
 * /api/managers/ecommerce/products:
 *   post:
 *     tags: [Manager - E-commerce]
 *     summary: Create new product
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, base_price, vendor_id]
 *             properties:
 *               name:
 *                 type: string
 *               base_price:
 *                 type: number
 *               vendor_id:
 *                 type: string
 *                 format: uuid
 *           example:
 *             name: "Premium Headphones"
 *             base_price: 15000
 *             vendor_id: "v1234567-89ab-cdef-0123-456789abcdef"
 *             category_id: "c1234567-89ab-cdef-0123-456789abcdef"
 *             stock_quantity: 100
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 product:
 *                   id: "p1234567-89ab-cdef-0123-456789abcdef"
 *                   name: "Premium Headphones"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post(
  '/ecommerce/products',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const productData = req.body;

      if (!productData.name || !productData.base_price || !productData.vendor_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, base_price, vendor_id',
        });
      }

      if (!productData.slug) {
        productData.slug = productData.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      }

      productData.final_price = productData.discount_percentage
        ? productData.base_price * (1 - productData.discount_percentage / 100)
        : productData.base_price;

      const { data: product, error } = await supabase
        .from('ecommerce_products')
        .insert(productData)
        .select()
        .single();

      if (error) throw error;

      await createAudit(req, 'create_product', 'ecommerce_products', product.id);
      res.status(201).json({ success: true, data: { product } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to create product', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to create product' });
    }
  }
);

/**
 * @swagger
 * /api/managers/ecommerce/products/{id}:
 *   put:
 *     tags: [Manager - E-commerce]
 *     summary: Update product
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
 *       content:
 *         application/json:
 *           example:
 *             name: "Updated Product Name"
 *             base_price: 18000
 *             discount_percentage: 10
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 product:
 *                   id: "p1234567-89ab-cdef-0123-456789abcdef"
 *                   name: "Updated Product Name"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  '/ecommerce/products/:id',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body, updated_at: new Date().toISOString() };

      if (updates.base_price || updates.discount_percentage !== undefined) {
        const { data: current } = await supabase
          .from('ecommerce_products')
          .select('base_price')
          .eq('id', id)
          .single();
        const basePrice = updates.base_price || current?.base_price || 0;
        const discount = updates.discount_percentage ?? 0;
        updates.final_price = basePrice * (1 - discount / 100);
      }

      const { data: product, error } = await supabase
        .from('ecommerce_products')
        .update(updates)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error || !product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      await createAudit(req, 'update_product', 'ecommerce_products', id);
      res.json({ success: true, data: { product } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to update product', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to update product' });
    }
  }
);

/**
 * @swagger
 * /api/managers/ecommerce/products/{id}:
 *   delete:
 *     tags: [Manager - E-commerce]
 *     summary: Soft delete product
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
 *       content:
 *         application/json:
 *           example:
 *             reason: "Product discontinued"
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Product deleted successfully"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  '/ecommerce/products/:id',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: product, error } = await supabase
        .from('ecommerce_products')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: req.user?.id,
          deletion_reason: req.body.reason || 'Admin deletion',
          is_active: false,
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error || !product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      await createAudit(req, 'delete_product', 'ecommerce_products', id);
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to delete product', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to delete product' });
    }
  }
);

/**
 * @swagger
 * /api/managers/ecommerce/orders:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get e-commerce orders
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
 *                     total_amount: 25000
 *                     status: "processing"
 *                     payment_status: "paid"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 150
 *                 pages: 8
 */
router.get(
  '/ecommerce/orders',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
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
  }
);

/**
 * @swagger
 * /api/managers/ecommerce/orders/{id}/status:
 *   put:
 *     tags: [Manager - E-commerce]
 *     summary: Update order status
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
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  '/ecommerce/orders/:id/status',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes, tracking_number, carrier } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }

      const validStatuses = [
        'pending',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

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

      await supabase.from('ecommerce_order_status_history').insert({
        order_id: id,
        status,
        notes: notes || null,
        created_by: req.user?.id,
      });

      await createAudit(req, 'update_order_status', 'ecommerce_orders', id);
      res.json({ success: true, data: { order } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to update order status', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to update order status' });
    }
  }
);

/**
 * @swagger
 * /api/managers/ecommerce/vendors:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get e-commerce vendors
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *                     is_verified: true
 *                     total_sales: 500000
 *                     average_rating: 4.5
 */
router.get(
  '/ecommerce/vendors',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
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
  }
);

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
 *                   is_verified: true
 *                   verified_at: "2026-02-16T10:30:00Z"
 */
router.put(
  '/ecommerce/vendors/:id/verify',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
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
  }
);

/**
 * @swagger
 * /api/managers/ecommerce/dashboard-stats:
 *   get:
 *     tags: [Manager - E-commerce]
 *     summary: Get e-commerce dashboard statistics
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
 */
router.get(
  '/ecommerce/dashboard-stats',
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

// ============================================================================
// TAXI MODULE: /api/managers/taxi/*
// ============================================================================

/**
 * @swagger
 * /api/managers/taxi/drivers:
 *   get:
 *     tags: [Manager - Taxi]
 *     summary: Get taxi drivers
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by license number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, online, offline, verified, unverified]
 *     responses:
 *       200:
 *         description: Drivers retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 drivers:
 *                   - id: "d1234567-89ab-cdef-0123-456789abcdef"
 *                     license_number: "LIC-12345"
 *                     is_online: true
 *                     is_verified: true
 *                     rating: 4.8
 *                     total_rides: 250
 *                     user_profiles:
 *                       first_name: "John"
 *                       last_name: "Driver"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 50
 *                 pages: 3
 */
router.get(
  '/taxi/drivers',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', search, status } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('driver_profiles')
        .select(
          `id, user_id, license_number, vehicle_info, is_online, rating, total_rides,
           is_verified, created_at, updated_at,
           user_profiles!inner(first_name, last_name, email, phone, avatar_url)`,
          { count: 'exact' }
        )
        .is('deleted_at', null)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (search) query = query.or(`license_number.ilike.%${search}%`);
      if (status === 'active' || status === 'verified') query = query.eq('is_verified', true);
      else if (status === 'inactive' || status === 'unverified')
        query = query.eq('is_verified', false);
      else if (status === 'online') query = query.eq('is_online', true);
      else if (status === 'offline') query = query.eq('is_online', false);

      const { data: drivers, count, error } = await query;
      if (error) throw error;

      await createAudit(req, 'view_drivers', 'driver_profiles');
      res.json({
        success: true,
        data: { drivers },
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get drivers', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
    }
  }
);

/**
 * @swagger
 * /api/managers/taxi/drivers/{id}:
 *   get:
 *     tags: [Manager - Taxi]
 *     summary: Get driver details with rides and earnings
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
 *         description: Driver details retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 driver:
 *                   id: "d1234567-89ab-cdef-0123-456789abcdef"
 *                   license_number: "LIC-12345"
 *                   rating: 4.8
 *                   total_rides: 250
 *                   recent_rides:
 *                     - id: "r1234567"
 *                       pickup_address: "123 Main St"
 *                       dropoff_address: "456 Oak Ave"
 *                       final_amount: 2500
 *                   earnings_summary:
 *                     today: 15000
 *                     this_week: 85000
 *                     this_month: 350000
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/taxi/drivers/:id',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: driver, error } = await supabase
        .from('driver_profiles')
        .select(`*, user_profiles!inner(first_name, last_name, email, phone, avatar_url)`)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !driver) {
        return res.status(404).json({ success: false, error: 'Driver not found' });
      }

      // Get recent rides
      const { data: rides } = await supabase
        .from('rides')
        .select(
          'id, pickup_location, dropoff_location, final_amount, status, created_at, dropoff_time'
        )
        .eq('driver_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get earnings
      const { data: earnings } = await supabase
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', id)
        .order('created_at', { ascending: false })
        .limit(30);

      // Calculate earnings summary
      const [today] = new Date().toISOString().split('T');
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date();
      monthStart.setDate(1);

      const { data: completedRides } = await supabase
        .from('rides')
        .select('final_amount, created_at')
        .eq('driver_id', id)
        .eq('status', 'completed');

      const earningsSummary = { today: 0, this_week: 0, this_month: 0, total: 0 };
      (completedRides || []).forEach((ride: Record<string, unknown>) => {
        const amount = parseFloat(String(ride.final_amount) || '0');
        earningsSummary.total += amount;
        const rideDate = new Date(String(ride.created_at));
        const [rideDateStr] = rideDate.toISOString().split('T');
        if (rideDateStr === today) earningsSummary.today += amount;
        if (rideDate >= weekAgo) earningsSummary.this_week += amount;
        if (rideDate >= monthStart) earningsSummary.this_month += amount;
      });

      await createAudit(req, 'view_driver_details', 'driver_profiles', id);
      res.json({
        success: true,
        data: {
          driver: {
            ...driver,
            recent_rides: rides || [],
            earnings_history: earnings || [],
            earnings_summary: earningsSummary,
          },
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get driver details', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch driver details' });
    }
  }
);

/**
 * @swagger
 * /api/managers/taxi/drivers/{id}/verify:
 *   put:
 *     tags: [Manager - Taxi]
 *     summary: Verify or unverify driver
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
 *           example:
 *             is_verified: true
 *     responses:
 *       200:
 *         description: Driver verification updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 driver:
 *                   id: "d1234567-89ab-cdef-0123-456789abcdef"
 *                   is_verified: true
 */
router.put(
  '/taxi/drivers/:id/verify',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { is_verified } = req.body;

      if (typeof is_verified !== 'boolean') {
        return res.status(400).json({ success: false, error: 'is_verified must be a boolean' });
      }

      const { data: driver, error } = await supabase
        .from('driver_profiles')
        .update({ is_verified, updated_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error || !driver) {
        return res.status(404).json({ success: false, error: 'Driver not found' });
      }

      await createAudit(
        req,
        is_verified ? 'verify_driver' : 'unverify_driver',
        'driver_profiles',
        id
      );
      res.json({ success: true, data: { driver } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to update driver verification', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to update driver verification' });
    }
  }
);

/**
 * @swagger
 * /api/managers/taxi/rides:
 *   get:
 *     tags: [Manager - Taxi]
 *     summary: Get taxi rides
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, in_progress, completed, cancelled]
 *       - in: query
 *         name: driver_id
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Rides retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 rides:
 *                   - id: "r1234567-89ab-cdef-0123-456789abcdef"
 *                     pickup_address: "123 Main Street"
 *                     dropoff_address: "456 Oak Avenue"
 *                     final_amount: 2500
 *                     status: "completed"
 *                     distance_km: 8.5
 *                     duration_minutes: 25
 */
router.get(
  '/taxi/rides',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', status, driver_id, start_date, end_date } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('rides')
        .select(
          `id, user_id, driver_id, pickup_location, dropoff_location, pickup_address, dropoff_address,
           estimated_amount, final_amount, distance_km, duration_minutes, status,
           pickup_time, dropoff_time, created_at,
           user_profiles!rides_user_id_fkey(first_name, last_name, phone),
           driver:driver_profiles!rides_driver_id_fkey(user_profiles(first_name, last_name))`,
          { count: 'exact' }
        )
        .range(from, to)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (driver_id) query = query.eq('driver_id', driver_id);
      if (start_date) query = query.gte('created_at', start_date);
      if (end_date) query = query.lte('created_at', end_date);

      const { data: rides, count, error } = await query;
      if (error) throw error;

      await createAudit(req, 'view_rides', 'rides');
      res.json({
        success: true,
        data: { rides },
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get rides', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch rides' });
    }
  }
);

/**
 * @swagger
 * /api/managers/taxi/dashboard-stats:
 *   get:
 *     tags: [Manager - Taxi]
 *     summary: Get taxi dashboard statistics
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
 *                 rides:
 *                   total: 1500
 *                   completed: 1350
 *                   cancelled: 100
 *                   revenue: 3750000
 *                 drivers:
 *                   total: 200
 *                   online: 85
 *                   verified: 180
 *                 period:
 *                   start: "2026-01-16"
 *                   end: "2026-02-16"
 */
router.get(
  '/taxi/dashboard-stats',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date
        ? new Date(start_date as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date as string) : new Date();

      // Get rides stats
      const { data: rides } = await supabase
        .from('rides')
        .select('id, final_amount, status, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const totalRides = rides?.length || 0;
      const completedRides =
        rides?.filter((r: Record<string, unknown>) => r.status === 'completed').length || 0;
      const cancelledRides =
        rides?.filter((r: Record<string, unknown>) => r.status === 'cancelled').length || 0;
      const totalRevenue =
        rides
          ?.filter((r: Record<string, unknown>) => r.status === 'completed')
          .reduce(
            (sum: number, r: Record<string, unknown>) => sum + (Number(r.final_amount) || 0),
            0
          ) || 0;

      // Get drivers stats
      const { count: totalDrivers } = await supabase
        .from('driver_profiles')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);

      const { count: onlineDrivers } = await supabase
        .from('driver_profiles')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_online', true);

      const { count: verifiedDrivers } = await supabase
        .from('driver_profiles')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_verified', true);

      await createAudit(req, 'view_taxi_dashboard', 'taxi_dashboard');
      res.json({
        success: true,
        data: {
          rides: {
            total: totalRides,
            completed: completedRides,
            cancelled: cancelledRides,
            revenue: Math.round(totalRevenue * 100) / 100,
          },
          drivers: {
            total: totalDrivers || 0,
            online: onlineDrivers || 0,
            verified: verifiedDrivers || 0,
          },
          period: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
          },
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get taxi dashboard stats', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
    }
  }
);

// ============================================================================
// HOTEL MODULE: /api/managers/hotel/*
// ============================================================================

/**
 * @swagger
 * /api/managers/hotel/hotels:
 *   get:
 *     tags: [Manager - Hotel]
 *     summary: Get hotels
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by hotel name, city, or state
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, verified, unverified]
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hotels retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 hotels:
 *                   - id: "h1234567-89ab-cdef-0123-456789abcdef"
 *                     name: "Grand Lagos Hotel"
 *                     city: "Lagos"
 *                     state: "Lagos"
 *                     star_rating: 5
 *                     average_rating: 4.7
 *                     is_verified: true
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 75
 *                 pages: 4
 */
router.get(
  '/hotel/hotels',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', search, status, city, state } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('hotels')
        .select(
          `id, name, description, address, city, state, country, star_rating,
           average_rating, total_reviews, total_bookings, is_active, is_verified,
           created_at, updated_at`,
          { count: 'exact' }
        )
        .is('deleted_at', null)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (search)
        query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`);
      if (status === 'active') query = query.eq('is_active', true);
      else if (status === 'inactive') query = query.eq('is_active', false);
      else if (status === 'verified') query = query.eq('is_verified', true);
      else if (status === 'unverified') query = query.eq('is_verified', false);
      if (city) query = query.ilike('city', `%${city}%`);
      if (state) query = query.ilike('state', `%${state}%`);

      const { data: hotels, count, error } = await query;
      if (error) throw error;

      await createAudit(req, 'view_hotels', 'hotels');
      res.json({
        success: true,
        data: { hotels },
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get hotels', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch hotels' });
    }
  }
);

/**
 * @swagger
 * /api/managers/hotel/hotels/{id}:
 *   get:
 *     tags: [Manager - Hotel]
 *     summary: Get hotel details with rooms, bookings, and reviews
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
 *         description: Hotel details retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 hotel:
 *                   id: "h1234567-89ab-cdef-0123-456789abcdef"
 *                   name: "Grand Lagos Hotel"
 *                   star_rating: 5
 *                   rooms:
 *                     - id: "rm123"
 *                       name: "Deluxe Suite"
 *                       base_price: 50000
 *                   recent_bookings:
 *                     - id: "b123"
 *                       check_in_date: "2026-02-20"
 *                       total_price: 150000
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/hotel/hotels/:id',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: hotel, error } = await supabase
        .from('hotels')
        .select(`*`)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !hotel) {
        return res.status(404).json({ success: false, error: 'Hotel not found' });
      }

      // Get room types
      const { data: rooms } = await supabase
        .from('room_types')
        .select('id, name, description, base_price, capacity, total_rooms, amenities')
        .eq('hotel_id', id);

      // Get recent bookings
      const { data: bookings } = await supabase
        .from('hotel_bookings')
        .select(
          `id, check_in_date, check_out_date, total_price, booking_status, created_at,
             user_profiles!inner(first_name, last_name)`
        )
        .eq('hotel_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get reviews
      const { data: reviews } = await supabase
        .from('hotel_reviews')
        .select(`id, rating, comment, created_at, user_profiles!inner(first_name, last_name)`)
        .eq('hotel_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      await createAudit(req, 'view_hotel_details', 'hotels', id);
      res.json({
        success: true,
        data: {
          hotel: {
            ...hotel,
            rooms: rooms || [],
            recent_bookings: bookings || [],
            reviews: reviews || [],
          },
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get hotel details', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch hotel details' });
    }
  }
);

/**
 * @swagger
 * /api/managers/hotel/hotels/{id}/verify:
 *   put:
 *     tags: [Manager - Hotel]
 *     summary: Verify or unverify hotel
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
 *           example:
 *             is_verified: true
 *     responses:
 *       200:
 *         description: Hotel verification updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 hotel:
 *                   id: "h1234567-89ab-cdef-0123-456789abcdef"
 *                   is_verified: true
 */
router.put(
  '/hotel/hotels/:id/verify',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { is_verified } = req.body;

      if (typeof is_verified !== 'boolean') {
        return res.status(400).json({ success: false, error: 'is_verified must be a boolean' });
      }

      const { data: hotel, error } = await supabase
        .from('hotels')
        .update({ is_verified, updated_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error || !hotel) {
        return res.status(404).json({ success: false, error: 'Hotel not found' });
      }

      await createAudit(req, is_verified ? 'verify_hotel' : 'unverify_hotel', 'hotels', id);
      res.json({ success: true, data: { hotel } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to update hotel verification', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to update hotel verification' });
    }
  }
);

/**
 * @swagger
 * /api/managers/hotel/bookings:
 *   get:
 *     tags: [Manager - Hotel]
 *     summary: Get hotel bookings
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, checked_in, checked_out, cancelled]
 *       - in: query
 *         name: hotel_id
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 bookings:
 *                   - id: "b1234567-89ab-cdef-0123-456789abcdef"
 *                     booking_reference: "BK-2026-001234"
 *                     check_in_date: "2026-02-20"
 *                     check_out_date: "2026-02-23"
 *                     total_price: 150000
 *                     booking_status: "confirmed"
 */
router.get(
  '/hotel/bookings',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', status, hotel_id, start_date, end_date } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('hotel_bookings')
        .select(
          `id, booking_reference, hotel_id, user_id, room_type_id, check_in_date, check_out_date,
           num_guests, total_price, booking_status, payment_status, created_at,
           hotels!inner(id, name, city),
           user_profiles!inner(first_name, last_name, email, phone),
           room_types(name)`,
          { count: 'exact' }
        )
        .is('deleted_at', null)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('booking_status', status);
      if (hotel_id) query = query.eq('hotel_id', hotel_id);
      if (start_date) query = query.gte('check_in_date', start_date);
      if (end_date) query = query.lte('check_out_date', end_date);

      const { data: bookings, count, error } = await query;
      if (error) throw error;

      await createAudit(req, 'view_bookings', 'hotel_bookings');
      res.json({
        success: true,
        data: { bookings },
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get bookings', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
    }
  }
);

/**
 * @swagger
 * /api/managers/hotel/bookings/{id}/status:
 *   put:
 *     tags: [Manager - Hotel]
 *     summary: Update booking status
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
 *           example:
 *             status: "checked_in"
 *             notes: "Guest arrived at 2pm"
 *     responses:
 *       200:
 *         description: Booking status updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 booking:
 *                   id: "b1234567-89ab-cdef-0123-456789abcdef"
 *                   booking_status: "checked_in"
 */
router.put(
  '/hotel/bookings/:id/status',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }

      const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

      const { data: booking, error } = await supabase
        .from('hotel_bookings')
        .update({ booking_status: status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error || !booking) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      // Add status history
      await supabase.from('hotel_booking_status_history').insert({
        booking_id: id,
        status,
        notes: notes || null,
        created_by: req.user?.id,
      });

      await createAudit(req, 'update_booking_status', 'hotel_bookings', id);
      res.json({ success: true, data: { booking } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to update booking status', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to update booking status' });
    }
  }
);

/**
 * @swagger
 * /api/managers/hotel/dashboard-stats:
 *   get:
 *     tags: [Manager - Hotel]
 *     summary: Get hotel dashboard statistics
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
 *                 bookings:
 *                   total: 500
 *                   confirmed: 400
 *                   cancelled: 50
 *                   revenue: 25000000
 *                 hotels:
 *                   total: 75
 *                   active: 70
 *                   verified: 65
 *                 reviews:
 *                   total: 1200
 *                   average_rating: 4.3
 */
router.get(
  '/hotel/dashboard-stats',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date
        ? new Date(start_date as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date as string) : new Date();

      // Get bookings stats
      const { data: bookings } = await supabase
        .from('hotel_bookings')
        .select('id, total_price, booking_status, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .is('deleted_at', null);

      const totalBookings = bookings?.length || 0;
      const confirmedBookings =
        bookings?.filter((b: Record<string, unknown>) =>
          ['confirmed', 'checked_in', 'checked_out'].includes(b.booking_status as string)
        ).length || 0;
      const cancelledBookings =
        bookings?.filter((b: Record<string, unknown>) => b.booking_status === 'cancelled').length ||
        0;
      const totalRevenue =
        bookings
          ?.filter((b: Record<string, unknown>) => b.booking_status !== 'cancelled')
          .reduce(
            (sum: number, b: Record<string, unknown>) => sum + (Number(b.total_price) || 0),
            0
          ) || 0;

      // Get hotels stats
      const { count: totalHotels } = await supabase
        .from('hotels')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);

      const { count: activeHotels } = await supabase
        .from('hotels')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_active', true);

      const { count: verifiedHotels } = await supabase
        .from('hotels')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_verified', true);

      // Get reviews stats
      const { data: reviews } = await supabase
        .from('hotel_reviews')
        .select('rating')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const avgRating = reviews?.length
        ? reviews.reduce(
            (sum: number, r: Record<string, unknown>) => sum + (r.rating as number),
            0
          ) / reviews.length
        : 0;

      await createAudit(req, 'view_hotel_dashboard', 'hotel_dashboard');
      res.json({
        success: true,
        data: {
          bookings: {
            total: totalBookings,
            confirmed: confirmedBookings,
            cancelled: cancelledBookings,
            revenue: Math.round(totalRevenue * 100) / 100,
          },
          hotels: {
            total: totalHotels || 0,
            active: activeHotels || 0,
            verified: verifiedHotels || 0,
          },
          reviews: { total: reviews?.length || 0, average_rating: Math.round(avgRating * 10) / 10 },
          period: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
          },
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get hotel dashboard stats', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
    }
  }
);

// ============================================================================
// MEDIA MODULE: /api/managers/media/*
// ============================================================================

/**
 * @swagger
 * /api/managers/media/files:
 *   get:
 *     tags: [Manager - Media]
 *     summary: Get media files
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, document, audio]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, pending]
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 files:
 *                   - id: "f1234567-89ab-cdef-0123-456789abcdef"
 *                     original_name: "product-image.jpg"
 *                     mime_type: "image/jpeg"
 *                     size_bytes: 245000
 *                     status: "active"
 */
router.get(
  '/media/files',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', type, status } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('file_metadata')
        .select(
          `id, original_name, mime_type, size_bytes, storage_path, access_level, status,
           metadata, created_at, uploaded_by,
           user_profiles!inner(first_name, last_name, email)`,
          { count: 'exact' }
        )
        .range(from, to)
        .order('created_at', { ascending: false });

      if (type) {
        const mimePrefix =
          type === 'image'
            ? 'image/'
            : type === 'video'
              ? 'video/'
              : type === 'audio'
                ? 'audio/'
                : 'application/';
        query = query.ilike('mime_type', `${mimePrefix}%`);
      }
      if (status) query = query.eq('status', status);

      const { data: files, count, error } = await query;
      if (error) throw error;

      await createAudit(req, 'view_files', 'file_metadata');
      res.json({
        success: true,
        data: { files },
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get files', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch files' });
    }
  }
);

/**
 * @swagger
 * /api/managers/media/files/{id}:
 *   delete:
 *     tags: [Manager - Media]
 *     summary: Delete file
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
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "File deleted successfully"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  '/media/files/:id',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: file, error } = await supabase
        .from('file_metadata')
        .update({ status: 'deleted', deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error || !file) {
        return res.status(404).json({ success: false, error: 'File not found' });
      }

      await createAudit(req, 'delete_file', 'file_metadata', id);
      res.json({ success: true, message: 'File deleted successfully' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to delete file', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to delete file' });
    }
  }
);

/**
 * @swagger
 * /api/managers/media/advertisements:
 *   get:
 *     tags: [Manager - Media]
 *     summary: Get advertisements
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending_approval, active, paused, completed, cancelled, rejected]
 *     responses:
 *       200:
 *         description: Advertisements retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 advertisements:
 *                   - id: "ad1234567-89ab-cdef-0123-456789abcdef"
 *                     title: "Summer Sale Campaign"
 *                     budget: 500000
 *                     impressions: 125000
 *                     clicks: 3500
 *                     status: "active"
 */
router.get(
  '/media/advertisements',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', status } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('advertisements')
        .select(
          `id, title, description, media_url, media_type, target_audience, placement,
           budget, impressions, clicks, start_date, end_date, status, created_at,
           advertiser_profiles!inner(id, business_name, contact_email)`,
          { count: 'exact' }
        )
        .is('deleted_at', null)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);

      const { data: ads, count, error } = await query;
      if (error) throw error;

      await createAudit(req, 'view_advertisements', 'advertisements');
      res.json({
        success: true,
        data: { advertisements: ads },
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get advertisements', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch advertisements' });
    }
  }
);

/**
 * @swagger
 * /api/managers/media/dashboard-stats:
 *   get:
 *     tags: [Manager - Media]
 *     summary: Get media dashboard statistics
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
 *                 files:
 *                   total: 5000
 *                   recent: 250
 *                   total_size_mb: 1250.5
 *                   images: 3500
 *                   videos: 500
 *                 advertisements:
 *                   total: 50
 *                   active: 25
 *                   total_budget: 5000000
 *                   impressions: 2500000
 *                   clicks: 75000
 *                   ctr: 3.0
 */
router.get(
  '/media/dashboard-stats',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date
        ? new Date(start_date as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date as string) : new Date();

      // Get files stats
      const { count: totalFiles } = await supabase
        .from('file_metadata')
        .select('id', { count: 'exact', head: true });

      const { data: recentFiles } = await supabase
        .from('file_metadata')
        .select('id, size_bytes, mime_type')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const totalSize =
        recentFiles?.reduce(
          (sum: number, f: Record<string, unknown>) => sum + ((f.size_bytes as number) || 0),
          0
        ) || 0;
      const imageCount =
        recentFiles?.filter((f: Record<string, unknown>) =>
          (f.mime_type as string)?.startsWith('image/')
        ).length || 0;
      const videoCount =
        recentFiles?.filter((f: Record<string, unknown>) =>
          (f.mime_type as string)?.startsWith('video/')
        ).length || 0;

      // Get ads stats
      const { data: ads } = await supabase
        .from('advertisements')
        .select('id, budget, impressions, clicks, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .is('deleted_at', null);

      const activeAds =
        ads?.filter((a: Record<string, unknown>) => a.status === 'active').length || 0;
      const totalBudget =
        ads?.reduce(
          (sum: number, a: Record<string, unknown>) => sum + (Number(a.budget) || 0),
          0
        ) || 0;
      const totalImpressions =
        ads?.reduce(
          (sum: number, a: Record<string, unknown>) => sum + ((a.impressions as number) || 0),
          0
        ) || 0;
      const totalClicks =
        ads?.reduce(
          (sum: number, a: Record<string, unknown>) => sum + ((a.clicks as number) || 0),
          0
        ) || 0;

      await createAudit(req, 'view_media_dashboard', 'media_dashboard');
      res.json({
        success: true,
        data: {
          files: {
            total: totalFiles || 0,
            recent: recentFiles?.length || 0,
            total_size_mb: Math.round((totalSize / 1024 / 1024) * 100) / 100,
            images: imageCount,
            videos: videoCount,
          },
          advertisements: {
            total: ads?.length || 0,
            active: activeAds,
            total_budget: Math.round(totalBudget * 100) / 100,
            impressions: totalImpressions,
            clicks: totalClicks,
            ctr:
              totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
          },
          period: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
          },
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get media dashboard stats', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
    }
  }
);

export default router;
