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
 *                     slug: "premium-headphones"
 *                     sku: "SKU-HP-001"
 *                     base_price: 15000
 *                     discount_percentage: 15
 *                     final_price: 12750
 *                     stock_quantity: 45
 *                     thumbnail: "https://storage.example.com/products/hp-001.jpg"
 *                     is_active: true
 *                     is_featured: true
 *                     view_count: 1250
 *                     order_count: 89
 *                     average_rating: 4.5
 *                     review_count: 32
 *                     created_at: "2026-01-15T10:30:00Z"
 *                     vendor:
 *                       id: "v1234567-89ab-cdef-0123-456789abcdef"
 *                       business_name: "Tech Store Nigeria"
 *                     category:
 *                       id: "c1234567-89ab-cdef-0123-456789abcdef"
 *                       name: "Electronics"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 500
 *                 pages: 25
 */
router.get('/products', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
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
});

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
 *                   vendor:
 *                     id: "v123"
 *                     business_name: "Tech Store"
 *                     average_rating: 4.5
 *                     is_verified: true
 *                   category:
 *                     id: "c123"
 *                     name: "Electronics"
 *                     slug: "electronics"
 *                   variants:
 *                     - id: "var1"
 *                       name: "Black"
 *                       sku: "HP-001-BLK"
 *                       price: 12750
 *                       stock_quantity: 25
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/products/:id',
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
 *                   slug: "premium-headphones"
 *                   base_price: 15000
 *                   final_price: 15000
 *                   created_at: "2026-02-16T10:30:00Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/products', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
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
});

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
 *                   base_price: 18000
 *                   discount_percentage: 10
 *                   final_price: 16200
 *                   updated_at: "2026-02-16T11:00:00Z"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/products/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
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
});

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
  '/products/:id',
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

export default router;
