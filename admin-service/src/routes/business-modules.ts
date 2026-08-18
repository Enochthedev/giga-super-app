import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit } from '../middleware/audit';
import { AuthRequest, authenticate, requireAdmin, requireAnyAccess } from '../middleware/auth';
import {
  SELECT_FIELDS,
  calculatePagination,
  getPaginationRange,
  supabase,
} from '../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * @swagger
 * /api/ecommerce/traders:
 *   get:
 *     tags: [Business Modules]
 *     summary: Get e-commerce traders
 *     description: Retrieve paginated list of e-commerce traders/vendors with search and filtering
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
 *         description: Search by business name
 *         example: 'electronics'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by trader status
 *     responses:
 *       200:
 *         description: Traders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     traders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           business_name:
 *                             type: string
 *                           total_sales:
 *                             type: number
 *                           total_orders:
 *                             type: integer
 *                           average_rating:
 *                             type: number
 *                           is_verified:
 *                             type: boolean
 *                           is_active:
 *                             type: boolean
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           user_profiles:
 *                             type: object
 *                             properties:
 *                               first_name:
 *                                 type: string
 *                               last_name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               avatar_url:
 *                                 type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *             example:
 *               success: true
 *               data:
 *                 traders:
 *                   - id: "e7f0e12b-ea46-4d42-8c96-b32acc795241"
 *                     business_name: "Lagos Fashion Hub"
 *                     total_sales: 125000.50
 *                     total_orders: 450
 *                     average_rating: 4.5
 *                     is_verified: true
 *                     is_active: true
 *                     created_at: "2025-10-28T13:09:25.497519Z"
 *                     user_profiles:
 *                       first_name: "Chinedu"
 *                       last_name: "Okoro"
 *                       email: "chinedu.okoro@lagosfashionhub.ng"
 *                       avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 5
 *                 pages: 1
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       500:
 *         description: Internal server error
 */
router.get(
  '/ecommerce/traders',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', search, status } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('ecommerce_vendors')
        .select(SELECT_FIELDS.VENDOR, { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('business_name', `%${search}%`);
      }

      if (status === 'active') {
        query = query.eq('is_active', true);
      } else if (status === 'inactive') {
        query = query.eq('is_active', false);
      }

      const { data: traders, count, error } = await query;

      if (error) throw error;

      await createAudit(req, 'view_traders', 'ecommerce_traders');

      res.json({
        success: true,
        data: { traders },
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: any) {
      logger.error('Failed to get traders', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch traders' });
    }
  }
);

/**
 * @swagger
 * /api/taxi/drivers:
 *   get:
 *     tags: [Business Modules]
 *     summary: Get taxi drivers
 *     description: Retrieve paginated list of taxi drivers with search and filtering
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
 *         description: Search by license number
 *         example: 'LIC123'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by driver verification status
 *     responses:
 *       200:
 *         description: Drivers retrieved successfully
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
 *                     drivers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           user_id:
 *                             type: string
 *                             format: uuid
 *                           license_number:
 *                             type: string
 *                           vehicle_info:
 *                             type: object
 *                           is_online:
 *                             type: boolean
 *                           rating:
 *                             type: number
 *                           total_rides:
 *                             type: integer
 *                           is_verified:
 *                             type: boolean
 *                           user:
 *                             type: object
 *                             properties:
 *                               first_name:
 *                                 type: string
 *                               last_name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               phone:
 *                                 type: string
 *                               avatar_url:
 *                                 type: string
 *                 pagination:
 *                   type: object
 *             example:
 *               success: true
 *               data:
 *                 drivers:
 *                   - id: "d1234567-89ab-cdef-0123-456789abcdef"
 *                     user_id: "u1234567-89ab-cdef-0123-456789abcdef"
 *                     license_number: "LIC123456"
 *                     vehicle_info:
 *                       make: "Toyota"
 *                       model: "Camry"
 *                       year: 2020
 *                       plate_number: "ABC-123-XY"
 *                     is_online: true
 *                     rating: 4.8
 *                     total_rides: 1250
 *                     is_verified: true
 *                     user:
 *                       first_name: "John"
 *                       last_name: "Doe"
 *                       email: "john.doe@example.com"
 *                       phone: "+2348012345678"
 *                       avatar_url: "https://example.com/avatar.jpg"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 150
 *                 pages: 8
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
          `
        ${SELECT_FIELDS.DRIVER},
        user_profiles!inner(
          first_name,
          last_name,
          email,
          phone,
          avatar_url
        )
      `,
          { count: 'exact' }
        )
        .range(from, to)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('license_number', `%${search}%`);
      }

      if (status === 'active') {
        query = query.eq('is_verified', true);
      } else if (status === 'inactive') {
        query = query.eq('is_verified', false);
      }

      const { data: drivers, count, error } = await query;

      if (error) throw error;

      await createAudit(req, 'view_drivers', 'taxi_drivers');

      res.json({
        success: true,
        data: { drivers },
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: any) {
      logger.error('Failed to get drivers', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch drivers' });
    }
  }
);

/**
 * @swagger
 * /api/hotel/hotels:
 *   get:
 *     tags: [Business Modules]
 *     summary: Get hotels
 *     description: Retrieve paginated list of hotels with search and filtering
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
 *         description: Search by hotel name, city, or state
 *         example: 'Lagos'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by hotel status
 *     responses:
 *       200:
 *         description: Hotels retrieved successfully
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
 *                     hotels:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           city:
 *                             type: string
 *                           state:
 *                             type: string
 *                           star_rating:
 *                             type: integer
 *                           average_rating:
 *                             type: number
 *                           total_reviews:
 *                             type: integer
 *                           total_bookings:
 *                             type: integer
 *                           is_active:
 *                             type: boolean
 *                           is_verified:
 *                             type: boolean
 *                           host:
 *                             type: object
 *                             properties:
 *                               first_name:
 *                                 type: string
 *                               last_name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               phone:
 *                                 type: string
 *                 pagination:
 *                   type: object
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
 *                     total_reviews: 342
 *                     total_bookings: 1250
 *                     is_active: true
 *                     is_verified: true
 *                     host:
 *                       first_name: "Jane"
 *                       last_name: "Smith"
 *                       email: "jane.smith@grandlagos.com"
 *                       phone: "+2348098765432"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 85
 *                 pages: 5
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/hotel/hotels',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', search, status } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('hotels')
        .select(
          `
        ${SELECT_FIELDS.HOTEL},
        host_profiles!inner(
          user_id,
          user_profiles!inner(
            first_name,
            last_name,
            email,
            phone
          )
        )
      `,
          { count: 'exact' }
        )
        .range(from, to)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`);
      }

      if (status === 'active') {
        query = query.eq('is_active', true);
      } else if (status === 'inactive') {
        query = query.eq('is_active', false);
      }

      const { data: hotels, count, error } = await query;

      if (error) throw error;

      await createAudit(req, 'view_hotels', 'hotel_listings');

      res.json({
        success: true,
        data: { hotels },
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: any) {
      logger.error('Failed to get hotels', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch hotels' });
    }
  }
);

/**
 * @swagger
 * /api/media/content:
 *   get:
 *     tags: [Business Modules]
 *     summary: Get media content
 *     description: Retrieve paginated list of media files with filtering by type
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
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by MIME type
 *         example: 'image/jpeg'
 *     responses:
 *       200:
 *         description: Media content retrieved successfully
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
 *                     content:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           original_name:
 *                             type: string
 *                           mime_type:
 *                             type: string
 *                           size_bytes:
 *                             type: integer
 *                           storage_path:
 *                             type: string
 *                           access_level:
 *                             type: string
 *                           status:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           user_profiles:
 *                             type: object
 *                             properties:
 *                               first_name:
 *                                 type: string
 *                               last_name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                 pagination:
 *                   type: object
 *             example:
 *               success: true
 *               data:
 *                 content:
 *                   - id: "m1234567-89ab-cdef-0123-456789abcdef"
 *                     original_name: "hotel-room-photo.jpg"
 *                     mime_type: "image/jpeg"
 *                     size_bytes: 2048576
 *                     storage_path: "/uploads/hotels/2025/02/hotel-room-photo.jpg"
 *                     access_level: "public"
 *                     status: "active"
 *                     created_at: "2025-02-10T10:30:00Z"
 *                     user_profiles:
 *                       first_name: "Admin"
 *                       last_name: "User"
 *                       email: "admin@giga.app"
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
router.get(
  '/media/content',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', type } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('file_metadata')
        .select(
          `
        id,
        original_name,
        mime_type,
        size_bytes,
        storage_path,
        access_level,
        status,
        created_at,
        uploaded_by,
        user_profiles!inner(first_name, last_name, email)
      `,
          { count: 'exact' }
        )
        .range(from, to)
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('mime_type', type as string);
      }

      const { data: content, count, error } = await query;

      if (error) throw error;

      await createAudit(req, 'view_media_content', 'media_files');

      res.json({
        success: true,
        data: { content },
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: any) {
      logger.error('Failed to get media content', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch media content' });
    }
  }
);

/**
 * @swagger
 * /api/ecommerce/traders/{id}:
 *   get:
 *     tags: [Business Modules]
 *     summary: Get trader details
 *     description: Retrieve detailed information about a specific trader including products, sales, and ratings
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Trader ID
 *     responses:
 *       200:
 *         description: Trader details retrieved successfully
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
 *                     trader:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         business_name:
 *                           type: string
 *                         total_sales:
 *                           type: number
 *                         total_orders:
 *                           type: integer
 *                         average_rating:
 *                           type: number
 *                         products:
 *                           type: array
 *                           items:
 *                             type: object
 *                         recent_orders:
 *                           type: array
 *                           items:
 *                             type: object
 *                         reviews:
 *                           type: array
 *                           items:
 *                             type: object
 *             example:
 *               success: true
 *               data:
 *                 trader:
 *                   id: "e7f0e12b-ea46-4d42-8c96-b32acc795241"
 *                   business_name: "Tech Galaxy Nigeria"
 *                   total_sales: 2500000.00
 *                   total_orders: 850
 *                   average_rating: 4.7
 *                   products:
 *                     - id: "p123"
 *                       name: "Samsung Galaxy S23"
 *                       price: 450000
 *                       stock: 25
 *                   recent_orders:
 *                     - id: "o456"
 *                       total: 450000
 *                       status: "delivered"
 *                       created_at: "2025-02-09T10:00:00Z"
 *                   reviews:
 *                     - rating: 5
 *                       comment: "Excellent service"
 *                       created_at: "2025-02-08T15:30:00Z"
 *       404:
 *         description: Trader not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/ecommerce/traders/:id',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Get trader details
      const { data: trader, error: traderError } = await supabase
        .from('ecommerce_vendors')
        .select(SELECT_FIELDS.VENDOR)
        .eq('id', id)
        .single();

      if (traderError || !trader) {
        return res.status(404).json({
          success: false,
          error: 'Trader not found',
          code: 'TRADER_NOT_FOUND',
        });
      }

      // Get products
      const { data: products } = await supabase
        .from('ecommerce_products')
        .select('id, name, price:base_price, stock_quantity, is_active')
        .eq('vendor_id', id)
        .eq('is_active', true)
        .limit(20);

      // Get recent orders through order items
      const { data: orderItems } = await supabase
        .from('ecommerce_order_items')
        .select(
          `
          order_id,
          ecommerce_orders!inner(id, order_number, total_amount, status, created_at)
        `
        )
        .eq('vendor_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Extract unique orders
      const orders = orderItems?.map((item: any) => item.ecommerce_orders) || [];

      // Get reviews (from product reviews)
      const productIds = (products || []).map((p: any) => p.id);
      let reviews: any[] = [];

      if (productIds.length > 0) {
        const { data: reviewsData } = await supabase
          .from('ecommerce_product_reviews')
          .select(
            `
          id,
          rating,
          comment,
          created_at,
          user_profiles!inner(first_name, last_name)
        `
          )
          .in('product_id', productIds)
          .order('created_at', { ascending: false })
          .limit(20);

        reviews = reviewsData || [];
      }

      await createAudit(req, 'view_trader_details', 'ecommerce_traders', id);

      res.json({
        success: true,
        data: {
          trader: {
            ...(trader as any),
            products: products || [],
            recent_orders: orders || [],
            reviews,
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to get trader details', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch trader details' });
    }
  }
);

/**
 * @swagger
 * /api/ecommerce/traders:
 *   post:
 *     tags: [Business Modules]
 *     summary: Create new trader
 *     description: Create a new e-commerce trader/vendor account
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - business_name
 *               - business_registration
 *               - bank_name
 *               - account_number
 *               - account_name
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               business_name:
 *                 type: string
 *               business_registration:
 *                 type: string
 *               tax_id:
 *                 type: string
 *               bank_name:
 *                 type: string
 *               account_number:
 *                 type: string
 *               account_name:
 *                 type: string
 *               commission_rate:
 *                 type: number
 *                 default: 0.15
 *           example:
 *             user_id: "a84ae787-88c3-494b-a42e-0cc0bf2f39be"
 *             business_name: "New Tech Store"
 *             business_registration: "RC123456"
 *             tax_id: "TIN987654"
 *             bank_name: "GTBank"
 *             account_number: "0123456789"
 *             account_name: "New Tech Store Ltd"
 *             commission_rate: 0.15
 *     responses:
 *       201:
 *         description: Trader created successfully
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
 *                     trader:
 *                       type: object
 *             example:
 *               success: true
 *               data:
 *                 trader:
 *                   id: "new-uuid"
 *                   business_name: "New Tech Store"
 *                   is_verified: false
 *                   is_active: true
 *                   created_at: "2025-02-10T16:30:00Z"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post(
  '/ecommerce/traders',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        user_id,
        business_name,
        business_registration,
        tax_id,
        bank_name,
        account_number,
        account_name,
        commission_rate = 0.15,
      } = req.body;

      // Validate required fields
      if (
        !user_id ||
        !business_name ||
        !business_registration ||
        !bank_name ||
        !account_number ||
        !account_name
      ) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          code: 'VALIDATION_ERROR',
        });
      }

      // Check if user already has a vendor account
      const { data: existing } = await supabase
        .from('ecommerce_vendors')
        .select('id')
        .eq('id', user_id)
        .single();

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'User already has a vendor account',
          code: 'VENDOR_EXISTS',
        });
      }

      // Create vendor
      const { data: trader, error } = await supabase
        .from('ecommerce_vendors')
        .insert({
          id: user_id,
          business_name,
          business_registration,
          tax_id,
          bank_name,
          account_number,
          account_name,
          commission_rate,
          is_verified: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      await createAudit(req, 'create_trader', 'ecommerce_traders', trader.id);

      res.status(201).json({
        success: true,
        data: { trader },
      });
    } catch (error: any) {
      logger.error('Failed to create trader', { error: error.message });
      res.status(500).json({ error: 'Failed to create trader' });
    }
  }
);

/**
 * @swagger
 * /api/taxi/drivers/{id}:
 *   get:
 *     tags: [Business Modules]
 *     summary: Get driver details
 *     description: Retrieve detailed information about a specific driver including tracking, trips, and earnings
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Driver details retrieved successfully
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
 *                     driver:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         license_number:
 *                           type: string
 *                         is_online:
 *                           type: boolean
 *                         current_location:
 *                           type: object
 *                         rating:
 *                           type: number
 *                         total_rides:
 *                           type: integer
 *                         recent_trips:
 *                           type: array
 *                           items:
 *                             type: object
 *                         earnings:
 *                           type: object
 *                           properties:
 *                             today:
 *                               type: number
 *                             this_week:
 *                               type: number
 *                             this_month:
 *                               type: number
 *                             total:
 *                               type: number
 *             example:
 *               success: true
 *               data:
 *                 driver:
 *                   id: "d1234567-89ab-cdef-0123-456789abcdef"
 *                   license_number: "LIC123456"
 *                   is_online: true
 *                   current_location:
 *                     latitude: 6.5244
 *                     longitude: 3.3792
 *                   rating: 4.8
 *                   total_rides: 1250
 *                   recent_trips:
 *                     - id: "t123"
 *                       pickup: "Ikeja"
 *                       dropoff: "Victoria Island"
 *                       fare: 3500
 *                       status: "completed"
 *                       created_at: "2025-02-10T14:30:00Z"
 *                   earnings:
 *                     today: 25000
 *                     this_week: 150000
 *                     this_month: 580000
 *                     total: 4500000
 *       404:
 *         description: Driver not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/taxi/drivers/:id',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Get driver details
      const { data: driver, error: driverError } = await supabase
        .from('driver_profiles')
        .select(
          `
          ${SELECT_FIELDS.DRIVER},
          user_profiles!inner(first_name, last_name, email, phone, avatar_url)
        `
        )
        .eq('id', id)
        .single();

      if (driverError || !driver) {
        return res.status(404).json({
          success: false,
          error: 'Driver not found',
          code: 'DRIVER_NOT_FOUND',
        });
      }

      // Get recent trips
      const { data: trips } = await supabase
        .from('rides')
        .select(
          `
          id,
          pickup_location,
          dropoff_location,
          final_amount,
          status,
          created_at,
          dropoff_time
        `
        )
        .eq('driver_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Calculate earnings
      const today = new Date().toISOString().split('T')[0];
      const thisWeekStart = new Date();
      thisWeekStart.setDate(thisWeekStart.getDate() - 7);
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);

      const { data: earningsData } = await supabase
        .from('rides')
        .select('final_amount, created_at')
        .eq('driver_id', id)
        .eq('status', 'completed');

      const earnings = {
        today: 0,
        this_week: 0,
        this_month: 0,
        total: 0,
      };

      (earningsData || []).forEach((ride: any) => {
        const amount = parseFloat(ride.final_amount || '0');
        earnings.total += amount;

        const rideDate = new Date(ride.created_at);
        if (rideDate.toISOString().split('T')[0] === today) {
          earnings.today += amount;
        }
        if (rideDate >= thisWeekStart) {
          earnings.this_week += amount;
        }
        if (rideDate >= thisMonthStart) {
          earnings.this_month += amount;
        }
      });

      await createAudit(req, 'view_driver_details', 'taxi_drivers', id);

      res.json({
        success: true,
        data: {
          driver: {
            ...(driver as any),
            recent_trips: trips || [],
            earnings,
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to get driver details', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch driver details' });
    }
  }
);

/**
 * @swagger
 * /api/hotel/hotels/{id}:
 *   get:
 *     tags: [Business Modules]
 *     summary: Get hotel details
 *     description: Retrieve detailed information about a specific hotel including rooms, amenities, and bookings
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel ID
 *     responses:
 *       200:
 *         description: Hotel details retrieved successfully
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
 *                     hotel:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         star_rating:
 *                           type: integer
 *                         average_rating:
 *                           type: number
 *                         rooms:
 *                           type: array
 *                           items:
 *                             type: object
 *                         amenities:
 *                           type: array
 *                           items:
 *                             type: string
 *                         recent_bookings:
 *                           type: array
 *                           items:
 *                             type: object
 *                         reviews:
 *                           type: array
 *                           items:
 *                             type: object
 *             example:
 *               success: true
 *               data:
 *                 hotel:
 *                   id: "h1234567-89ab-cdef-0123-456789abcdef"
 *                   name: "Grand Lagos Hotel"
 *                   description: "Luxury 5-star hotel in Victoria Island"
 *                   star_rating: 5
 *                   average_rating: 4.7
 *                   rooms:
 *                     - id: "r123"
 *                       type: "Deluxe Suite"
 *                       price: 45000
 *                       available: 5
 *                   amenities:
 *                     - "WiFi"
 *                     - "Pool"
 *                     - "Gym"
 *                     - "Restaurant"
 *                   recent_bookings:
 *                     - id: "b456"
 *                       check_in: "2025-02-15"
 *                       check_out: "2025-02-18"
 *                       status: "confirmed"
 *                   reviews:
 *                     - rating: 5
 *                       comment: "Excellent stay"
 *                       created_at: "2025-02-09T10:00:00Z"
 *       404:
 *         description: Hotel not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/hotel/hotels/:id',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Get hotel details
      const { data: hotel, error: hotelError } = await supabase
        .from('hotels')
        .select(SELECT_FIELDS.HOTEL)
        .eq('id', id)
        .single();

      if (hotelError || !hotel) {
        return res.status(404).json({
          success: false,
          error: 'Hotel not found',
          code: 'HOTEL_NOT_FOUND',
        });
      }

      // Get host info through host_profiles
      const { data: hostProfile } = await supabase
        .from('host_profiles')
        .select(
          `
          user_id,
          user_profiles!inner(first_name, last_name, email, phone)
        `
        )
        .eq('user_id', (hotel as any).host_id)
        .single();

      const host = hostProfile?.user_profiles || null;

      // Get rooms
      const { data: rooms } = await supabase
        .from('room_types')
        .select('id, name, base_price, capacity, total_rooms')
        .eq('hotel_id', id);

      // Get amenities (from hotel metadata or default list)
      const amenities = (hotel as any).amenities || [
        'WiFi',
        'Parking',
        'Restaurant',
        'Room Service',
        'Air Conditioning',
      ];

      // Get recent bookings
      const { data: bookings } = await supabase
        .from('hotel_bookings')
        .select(
          `
          id,
          check_in_date,
          check_out_date,
          total_amount,
          booking_status,
          created_at,
          user_id,
          user_profiles!inner(first_name, last_name)
        `
        )
        .eq('hotel_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get reviews
      const { data: reviews } = await supabase
        .from('hotel_reviews')
        .select(
          `
          id,
          rating,
          comment,
          created_at,
          user_id,
          user_profiles!inner(first_name, last_name)
        `
        )
        .eq('hotel_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      await createAudit(req, 'view_hotel_details', 'hotel_listings', id);

      res.json({
        success: true,
        data: {
          hotel: {
            ...(hotel as any),
            host,
            rooms: rooms || [],
            amenities,
            recent_bookings: bookings || [],
            reviews: reviews || [],
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to get hotel details', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch hotel details' });
    }
  }
);

/**
 * @swagger
 * /api/media/content/{id}:
 *   get:
 *     tags: [Business Modules]
 *     summary: Get media content details
 *     description: Retrieve detailed information about specific media content including views, likes, and comments
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Content ID
 *     responses:
 *       200:
 *         description: Content details retrieved successfully
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
 *                     content:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         original_name:
 *                           type: string
 *                         mime_type:
 *                           type: string
 *                         size_bytes:
 *                           type: integer
 *                         storage_path:
 *                           type: string
 *                         views:
 *                           type: integer
 *                         likes:
 *                           type: integer
 *                         comments:
 *                           type: array
 *                           items:
 *                             type: object
 *                         publisher:
 *                           type: object
 *                           properties:
 *                             first_name:
 *                               type: string
 *                             last_name:
 *                               type: string
 *                             email:
 *                               type: string
 *             example:
 *               success: true
 *               data:
 *                 content:
 *                   id: "m1234567-89ab-cdef-0123-456789abcdef"
 *                   original_name: "hotel-room-photo.jpg"
 *                   mime_type: "image/jpeg"
 *                   size_bytes: 2048576
 *                   storage_path: "/uploads/hotels/2025/02/hotel-room-photo.jpg"
 *                   views: 1250
 *                   likes: 85
 *                   comments:
 *                     - user: "John Doe"
 *                       comment: "Beautiful room!"
 *                       created_at: "2025-02-09T15:30:00Z"
 *                   publisher:
 *                     first_name: "Jane"
 *                     last_name: "Smith"
 *                     email: "jane@example.com"
 *       404:
 *         description: Content not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/media/content/:id',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Get content details
      const { data: content, error: contentError } = await supabase
        .from('file_metadata')
        .select(
          `
          id,
          original_name,
          mime_type,
          size_bytes,
          storage_path,
          access_level,
          status,
          metadata,
          created_at,
          uploaded_by,
          user_profiles!inner(first_name, last_name, email, avatar_url)
        `
        )
        .eq('id', id)
        .single();

      if (contentError || !content) {
        return res.status(404).json({
          success: false,
          error: 'Content not found',
          code: 'CONTENT_NOT_FOUND',
        });
      }

      // Get engagement metrics (views, likes)
      // Note: These tables may not exist yet, so we'll use placeholder data
      const views = content.metadata?.views || 0;
      const likes = content.metadata?.likes || 0;

      // Get comments (if content is associated with a post)
      const comments: any[] = [];

      await createAudit(req, 'view_media_details', 'media_files', id);

      res.json({
        success: true,
        data: {
          content: {
            ...content,
            views,
            likes,
            comments,
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to get content details', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch content details' });
    }
  }
);

// ============================================================================
// PENDING ENTRIES - NEW BUSINESS MODULE APPROVALS
// ============================================================================

/**
 * Fetch pending role_applications for a role and enrich with user profiles.
 */
async function getPendingRoleApplications(roleName: string) {
  const { data: appsRaw } = await supabase
    .from('role_applications')
    .select('id, user_id, role_name, status, application_data, document_urls, created_at')
    .eq('role_name', roleName)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  let apps = appsRaw || [];
  if (apps.length > 0) {
    const userIds = apps.map((app: any) => app.user_id).filter(Boolean);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, phone')
        .in('id', userIds);

      const profileMap = new Map();
      profiles?.forEach((p: any) => profileMap.set(p.id, p));
      apps = apps.map((app: any) => ({ ...app, user: profileMap.get(app.user_id) || null }));
    }
  }
  return apps;
}

/**
 * Role-specific onboarding once a role application is approved.
 * Mirrors what the legacy review-role-application edge fn + pending-entries did.
 */
async function completeRoleOnboarding(application: any, approvedBy: string) {
  const roleName = application.role_name;
  const appData = application.application_data || {};

  if (roleName === 'DRIVER') {
    await supabase.from('driver_profiles').insert({
      user_id: application.user_id,
      license_number: appData.license_number,
      vehicle_type: appData.vehicle_type || 'car',
      vehicle_info: {
        make: appData.vehicle_make,
        model: appData.vehicle_model,
        plate_number: appData.plate_number,
        color: appData.vehicle_color,
        year: appData.vehicle_year,
      },
      is_verified: true,
      subscription_tier: 'BASIC',
    });
  }

  if (roleName === 'VENDOR') {
    await supabase.from('ecommerce_vendors').upsert(
      {
        id: application.user_id,
        user_id: application.user_id,
        business_name: appData.business_name || '',
        business_registration: appData.business_registration || null,
        tax_id: appData.tax_id || null,
        bank_name: appData.bank_name || null,
        account_number: appData.account_number || null,
        account_name: appData.account_name || null,
        is_verified: true,
        is_active: true,
        verified_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  }

  // Grant the role (ignore duplicate-role errors)
  await supabase.from('user_roles').insert({
    user_id: application.user_id,
    role_name: roleName,
    granted_by: approvedBy,
  });

  // Make it the active role
  await supabase
    .from('user_active_roles')
    .update({ active_role: roleName })
    .eq('user_id', application.user_id);
}

/**
 * @swagger
 * /api/roles/review:
 *   post:
 *     tags: [Pending Entries]
 *     summary: Review a role application (approve/reject)
 *     description: |
 *       Admin review of a pending role application (VENDOR, DRIVER, HOST, ADVERTISER).
 *       Replaces the legacy review-role-application edge function, which only
 *       accepted users holding the user_roles ADMIN role and therefore rejected
 *       NIPOST panel admins (directors/controllers).
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [application_id, action]
 *             properties:
 *               application_id:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               rejection_reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application reviewed successfully
 */
router.post(
  '/roles/review',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { application_id, action, rejection_reason } = req.body || {};
      const reviewedBy = req.user?.id;

      if (!application_id || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'application_id and action (approve|reject) are required',
        });
      }

      const { data: application, error: appError } = await supabase
        .from('role_applications')
        .select('*')
        .eq('id', application_id)
        .eq('status', 'pending')
        .single();

      if (appError || !application) {
        return res.status(404).json({
          success: false,
          error: 'Application not found or already processed',
        });
      }

      const updatePayload =
        action === 'approve'
          ? {
              status: 'approved',
              reviewed_by: reviewedBy,
              reviewed_at: new Date().toISOString(),
            }
          : {
              status: 'rejected',
              reviewed_by: reviewedBy,
              reviewed_at: new Date().toISOString(),
              rejection_reason: rejection_reason || 'No reason provided',
            };

      const { error: updateError } = await supabase
        .from('role_applications')
        .update(updatePayload)
        .eq('id', application_id);

      if (updateError) throw updateError;

      if (action === 'approve') {
        await completeRoleOnboarding(application, reviewedBy || 'system');
      }

      await createAudit(req, `${action}_role_application`, 'role_applications', application_id, {
        role_name: application.role_name,
      });

      res.json({
        success: true,
        data: { application_id, action, role_name: application.role_name },
      });
    } catch (error: any) {
      logger.error('Failed to review role application', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to review role application' });
    }
  }
);

/**
 * @swagger
 * /api/pending-entries:
 *   get:
 *     tags: [Pending Entries]
 *     summary: Get all pending entries across business modules
 *     description: Retrieve pending entries for products, hotels, drivers, and media content awaiting approval
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: module
 *         schema:
 *           type: string
 *           enum: [ecommerce, hotels, taxi, media, sellers]
 *         description: Filter by specific module
 *     responses:
 *       200:
 *         description: List of pending entries
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
 *                     products:
 *                       type: array
 *                     hotels:
 *                       type: array
 *                     drivers:
 *                       type: array
 *                     media:
 *                       type: array
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     counts:
 *                       type: object
 */
router.get(
  '/pending-entries',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { module } = req.query;
      const results: Record<string, unknown[]> = {};

      // Get pending products
      if (!module || module === 'ecommerce') {
        const { data: products } = await supabase
          .from('ecommerce_products')
          .select(
            'id, name, description, final_price, vendor_id, category_id, approval_status, created_at'
          )
          .eq('approval_status', 'pending')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        results.products = products || [];
      }

      // Get pending hotels
      if (!module || module === 'hotels') {
        const { data: hotels } = await supabase
          .from('hotels')
          .select('id, name, description, city, state, star_rating, approval_status, created_at')
          .eq('approval_status', 'pending')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        results.hotels = hotels || [];
      }

      // Get pending taxi drivers (from role_applications)
      if (!module || module === 'taxi') {
        const driverApps = await getPendingRoleApplications('DRIVER');

        // Map it to match the expected format or just pass it through
        results.drivers =
          driverApps?.map((app: any) => ({
            id: app.id,
            first_name: app.user?.first_name || '',
            last_name: app.user?.last_name || '',
            email: app.user?.email || '',
            phone: app.user?.phone || '',
            // Map JSON fields if they exist in application_data
            city: app.application_data?.city || '',
            license_number: app.application_data?.license_number || '',
            vehicle_make: app.application_data?.vehicle_make || '',
            vehicle_model: app.application_data?.vehicle_model || '',
            plate_number: app.application_data?.plate_number || '',
            approval_status: app.status,
            created_at: app.created_at,
            user_id: app.user_id,
            original_application: app, // keeping full object for details page
          })) || [];
      }

      // Get pending media content
      if (!module || module === 'media') {
        const { data: media } = await supabase
          .from('media_content')
          .select(
            'id, title, description, content_type, file_name, category, publisher_name, publisher_email, approval_status, created_at'
          )
          .eq('approval_status', 'pending')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        results.media = media || [];
      }

      // Get pending sellers (VENDOR role applications)
      if (!module || module === 'sellers') {
        const vendorApps = await getPendingRoleApplications('VENDOR');

        results.sellers =
          vendorApps?.map((app: any) => ({
            id: app.id,
            first_name: app.user?.first_name || '',
            last_name: app.user?.last_name || '',
            email: app.user?.email || '',
            phone: app.user?.phone || '',
            business_name: app.application_data?.business_name || '',
            business_type: app.application_data?.business_type || '',
            description: app.application_data?.description || '',
            approval_status: app.status,
            created_at: app.created_at,
            user_id: app.user_id,
            original_application: app,
          })) || [];
      }

      // Get pending hotel hosts (HOST role applications)
      if (!module || module === 'hosts') {
        const hostApps = await getPendingRoleApplications('HOST');
        results.hosts =
          hostApps?.map((app: any) => ({
            id: app.id,
            first_name: app.user?.first_name || '',
            last_name: app.user?.last_name || '',
            email: app.user?.email || '',
            phone: app.user?.phone || '',
            business_name: app.application_data?.business_name || '',
            description: app.application_data?.description || '',
            approval_status: app.status,
            created_at: app.created_at,
            user_id: app.user_id,
            original_application: app,
          })) || [];
      }

      // Get pending advertisers (ADVERTISER role applications)
      if (!module || module === 'advertisers') {
        const advertiserApps = await getPendingRoleApplications('ADVERTISER');
        results.advertisers =
          advertiserApps?.map((app: any) => ({
            id: app.id,
            first_name: app.user?.first_name || '',
            last_name: app.user?.last_name || '',
            email: app.user?.email || '',
            phone: app.user?.phone || '',
            business_name: app.application_data?.business_name || '',
            description: app.application_data?.description || '',
            approval_status: app.status,
            created_at: app.created_at,
            user_id: app.user_id,
            original_application: app,
          })) || [];
      }

      await createAudit(req, 'view_pending_entries', 'pending_entries');

      res.json({
        success: true,
        data: results,
        metadata: {
          timestamp: new Date().toISOString(),
          counts: {
            products: results.products?.length || 0,
            hotels: results.hotels?.length || 0,
            drivers: results.drivers?.length || 0,
            sellers: results.sellers?.length || 0,
            hosts: results.hosts?.length || 0,
            advertisers: results.advertisers?.length || 0,
            media: results.media?.length || 0,
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to fetch pending entries', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch pending entries' });
    }
  }
);

/**
 * @swagger
 * /api/pending-entries/{module}/{id}/approve:
 *   post:
 *     tags: [Pending Entries]
 *     summary: Approve a pending entry
 *     description: Approve a pending product, hotel, driver, or media content
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema:
 *           type: string
 *           enum: [products, hotels, drivers, sellers, media]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Entry approved successfully
 */
router.post(
  '/pending-entries/:module/:id/approve',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { module, id } = req.params;
      const approvedBy = req.user?.id || 'system';

      const tableMap: Record<string, string> = {
        products: 'ecommerce_products',
        hotels: 'hotels',
        drivers: 'role_applications',
        sellers: 'role_applications',
        hosts: 'role_applications',
        advertisers: 'role_applications',
        media: 'media_content',
      };

      // role_applications uses 'status', 'reviewed_by', 'reviewed_at'
      // all other tables use 'approval_status', 'approved_by', 'approved_at'
      const isRoleApplication = tableMap[module] === 'role_applications';

      const tableName = tableMap[module];
      if (!tableName) {
        return res.status(400).json({
          success: false,
          error:
            'Invalid module. Valid modules: products, hotels, drivers, sellers, hosts, advertisers, media',
        });
      }

      const updatePayload = isRoleApplication
        ? {
            status: 'approved',
            reviewed_by: approvedBy,
            reviewed_at: new Date().toISOString(),
          }
        : {
            approval_status: 'approved',
            approved_by: approvedBy,
            approved_at: new Date().toISOString(),
          };

      const { data, error } = await supabase
        .from(tableName)
        .update(updatePayload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      // V4: a non-existent id must be a clean 404, not a 500. `.single()` throws
      // when no row matches, which surfaced as "Failed to ..." for stale list items.
      if (!data) {
        return res.status(404).json({ success: false, error: 'Pending entry not found' });
      }

      // Complete role-specific onboarding (driver profile, vendor record, role grant)
      if (isRoleApplication && data) {
        await completeRoleOnboarding(data, approvedBy);
      }

      await createAudit(req, `approve_${module}`, tableName, id);

      res.json({
        success: true,
        message: `${module} entry approved successfully`,
        data,
      });
    } catch (error: any) {
      logger.error('Failed to approve entry', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to approve entry' });
    }
  }
);

/**
 * @swagger
 * /api/pending-entries/{module}/{id}/reject:
 *   post:
 *     tags: [Pending Entries]
 *     summary: Reject a pending entry
 *     description: Reject a pending product, hotel, driver, or media content with a reason
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: module
 *         required: true
 *         schema:
 *           type: string
 *           enum: [products, hotels, drivers, media]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Entry rejected successfully
 */
router.post(
  '/pending-entries/:module/:id/reject',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { module, id } = req.params;
      const { reason } = req.body;
      const rejectedBy = req.user?.id || 'system';

      const tableMap: Record<string, string> = {
        products: 'ecommerce_products',
        hotels: 'hotels',
        drivers: 'role_applications',
        sellers: 'role_applications',
        hosts: 'role_applications',
        advertisers: 'role_applications',
        media: 'media_content',
      };

      // role_applications uses 'status', 'reviewed_by', 'reviewed_at', 'rejection_reason'
      // all other tables use 'approval_status', 'approved_by' / 'rejected_by', 'rejection_reason'
      const isRoleApplication = tableMap[module] === 'role_applications';

      const tableName = tableMap[module];
      if (!tableName) {
        return res.status(400).json({
          success: false,
          error:
            'Invalid module. Valid modules: products, hotels, drivers, sellers, hosts, advertisers, media',
        });
      }

      const updatePayload = isRoleApplication
        ? {
            status: 'rejected',
            reviewed_by: rejectedBy,
            reviewed_at: new Date().toISOString(),
            rejection_reason: reason || 'No reason provided',
          }
        : {
            approval_status: 'rejected',
            approved_by: rejectedBy,
            rejection_reason: reason || 'No reason provided',
          };

      const { data, error } = await supabase
        .from(tableName)
        .update(updatePayload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      // V4: a non-existent id must be a clean 404, not a 500. `.single()` throws
      // when no row matches, which surfaced as "Failed to ..." for stale list items.
      if (!data) {
        return res.status(404).json({ success: false, error: 'Pending entry not found' });
      }

      await createAudit(req, `reject_${module}`, tableName, id);

      res.json({
        success: true,
        message: `${module} entry rejected successfully`,
        data,
      });
    } catch (error: any) {
      logger.error('Failed to reject entry', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to reject entry' });
    }
  }
);

// ============================================================================
// POSTAL STAFF MANAGEMENT - Director of Operations
// ============================================================================

/**
 * @swagger
 * /api/postal/staff:
 *   get:
 *     tags: [Postal Staff]
 *     summary: Get all postal staff
 *     description: Retrieve paginated list of postal staff (postmasters, regional managers, admin staff)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: staff_type
 *         schema:
 *           type: string
 *           enum: [postmaster, regional_manager, admin_staff]
 *       - in: query
 *         name: approval_status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: Staff list retrieved successfully
 */
router.get(
  '/postal/staff',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', staff_type, approval_status } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('postal_staff')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (staff_type) {
        query = query.eq('staff_type', staff_type);
      }

      if (approval_status) {
        query = query.eq('approval_status', approval_status);
      }

      const { data: staff, count, error } = await query;

      if (error) throw error;

      await createAudit(req, 'view_postal_staff', 'postal_staff');

      res.json({
        success: true,
        data: { staff },
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: any) {
      logger.error('Failed to get postal staff', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch postal staff' });
    }
  }
);

/**
 * @swagger
 * /api/postal/staff/{id}:
 *   get:
 *     tags: [Postal Staff]
 *     summary: Get postal staff details
 *     description: Retrieve detailed information about a specific postal staff member
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
 *         description: Staff details retrieved successfully
 *       404:
 *         description: Staff not found
 */
router.get(
  '/postal/staff/:id',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: staff, error } = await supabase
        .from('postal_staff')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !staff) {
        return res.status(404).json({
          success: false,
          error: 'Staff not found',
          code: 'STAFF_NOT_FOUND',
        });
      }

      // Calculate age from date_of_birth
      const dob = new Date(staff.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      await createAudit(req, 'view_postal_staff_details', 'postal_staff', id);

      res.json({
        success: true,
        data: {
          staff: {
            ...staff,
            age,
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to get staff details', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch staff details' });
    }
  }
);

/**
 * @swagger
 * /api/postal/staff:
 *   post:
 *     tags: [Postal Staff]
 *     summary: Create new postal staff
 *     description: Create a new postal staff member (postmaster, regional manager, or admin staff)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staff_type
 *               - first_name
 *               - last_name
 *               - email
 *             properties:
 *               staff_type:
 *                 type: string
 *                 enum: [postmaster, regional_manager, admin_staff]
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *               residential_address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postal_code:
 *                 type: string
 *               assigned_region:
 *                 type: string
 *     responses:
 *       201:
 *         description: Staff created successfully
 */
router.post(
  '/postal/staff',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        staff_type,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        residential_address,
        city,
        state,
        country = 'Nigeria',
        postal_code,
        assigned_region,
        assigned_post_office_id,
      } = req.body;

      // Validate required fields
      if (!staff_type || !first_name || !last_name || !email) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: staff_type, first_name, last_name, email',
          code: 'VALIDATION_ERROR',
        });
      }

      // Validate staff_type
      const validTypes = ['postmaster', 'regional_manager', 'admin_staff'];
      if (!validTypes.includes(staff_type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid staff_type. Must be: postmaster, regional_manager, or admin_staff',
          code: 'VALIDATION_ERROR',
        });
      }

      const { data: staff, error } = await supabase
        .from('postal_staff')
        .insert({
          staff_type,
          first_name,
          last_name,
          email,
          phone,
          date_of_birth,
          gender,
          residential_address,
          city,
          state,
          country,
          postal_code,
          assigned_region,
          assigned_post_office_id,
          admission_date: new Date().toISOString().split('T')[0],
          approval_status: 'pending',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({
            success: false,
            error: 'Email already exists',
            code: 'DUPLICATE_EMAIL',
          });
        }
        throw error;
      }

      await createAudit(req, 'create_postal_staff', 'postal_staff', staff.id);

      res.status(201).json({
        success: true,
        message: 'Staff created successfully',
        data: { staff },
      });
    } catch (error: any) {
      logger.error('Failed to create postal staff', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to create postal staff' });
    }
  }
);

/**
 * @swagger
 * /api/postal/staff/{id}:
 *   put:
 *     tags: [Postal Staff]
 *     summary: Update postal staff
 *     description: Update postal staff member details
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
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Staff updated successfully
 */
router.put(
  '/postal/staff/:id',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates.id;
      delete updates.created_at;
      delete updates.approval_status;
      delete updates.approved_at;
      delete updates.approved_by;

      updates.updated_at = new Date().toISOString();

      const { data: staff, error } = await supabase
        .from('postal_staff')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      // V4: a non-existent id must be a clean 404, not a 500. `.single()` throws
      // when no row matches, which surfaced as "Failed to ..." for stale list items.
      if (!staff) {
        return res.status(404).json({ success: false, error: 'Postal staff not found' });
      }

      await createAudit(req, 'update_postal_staff', 'postal_staff', id);

      res.json({
        success: true,
        message: 'Staff updated successfully',
        data: { staff },
      });
    } catch (error: any) {
      logger.error('Failed to update postal staff', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to update postal staff' });
    }
  }
);

/**
 * @swagger
 * /api/postal/staff/{id}/approve:
 *   post:
 *     tags: [Postal Staff]
 *     summary: Approve postal staff
 *     description: Approve a pending postal staff member
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
 *         description: Staff approved successfully
 */
router.post(
  '/postal/staff/:id/approve',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const approvedBy = req.user?.id || 'system';

      // E16: the approval trigger RAISEs if user_id is null (staff hasn't created their
      // account yet). Guard here so we return a clean 400 instead of a raw 500.
      const { data: existing } = await supabase
        .from('postal_staff')
        .select('user_id')
        .eq('id', id)
        .single();
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Staff not found' });
      }
      if (!existing.user_id) {
        return res.status(400).json({
          success: false,
          error: 'This staff member has not created their account yet',
          code: 'MISSING_USER_ACCOUNT',
        });
      }

      const { data: staff, error } = await supabase
        .from('postal_staff')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: approvedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await createAudit(req, 'approve_postal_staff', 'postal_staff', id);

      res.json({
        success: true,
        message: 'Staff approved successfully',
        data: { staff },
      });
    } catch (error: any) {
      logger.error('Failed to approve postal staff', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to approve postal staff' });
    }
  }
);

/**
 * @swagger
 * /api/postal/staff/{id}/reject:
 *   post:
 *     tags: [Postal Staff]
 *     summary: Reject postal staff
 *     description: Reject a pending postal staff member with a reason
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
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Staff rejected successfully
 */
router.post(
  '/postal/staff/:id/reject',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const rejectedBy = req.user?.id || 'system';

      const { data: staff, error } = await supabase
        .from('postal_staff')
        .update({
          approval_status: 'rejected',
          approved_by: rejectedBy,
          rejection_reason: reason || 'No reason provided',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      // V4: a non-existent id must be a clean 404, not a 500. `.single()` throws
      // when no row matches, which surfaced as "Failed to ..." for stale list items.
      if (!staff) {
        return res.status(404).json({ success: false, error: 'Postal staff not found' });
      }

      await createAudit(req, 'reject_postal_staff', 'postal_staff', id);

      res.json({
        success: true,
        message: 'Staff rejected successfully',
        data: { staff },
      });
    } catch (error: any) {
      logger.error('Failed to reject postal staff', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to reject postal staff' });
    }
  }
);

/**
 * @swagger
 * /api/postal/staff/{id}:
 *   delete:
 *     tags: [Postal Staff]
 *     summary: Delete postal staff (soft delete)
 *     description: Soft delete a postal staff member
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
 *         description: Staff deleted successfully
 */
router.delete(
  '/postal/staff/:id',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('postal_staff')
        .update({
          deleted_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', id);

      if (error) throw error;

      await createAudit(req, 'delete_postal_staff', 'postal_staff', id);

      res.json({
        success: true,
        message: 'Staff deleted successfully',
      });
    } catch (error: any) {
      logger.error('Failed to delete postal staff', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to delete postal staff' });
    }
  }
);

/**
 * @swagger
 * /api/postal/staff/stats:
 *   get:
 *     tags: [Postal Staff]
 *     summary: Get postal staff statistics
 *     description: Get statistics about postal staff by type and approval status
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Staff statistics retrieved successfully
 */
router.get(
  '/postal/staff-stats',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      // Get counts by staff type
      const { data: byType } = await supabase
        .from('postal_staff')
        .select('staff_type')
        .is('deleted_at', null);

      // Get counts by approval status
      const { data: byStatus } = await supabase
        .from('postal_staff')
        .select('approval_status')
        .is('deleted_at', null);

      // Calculate statistics
      const typeStats = {
        postmaster: 0,
        regional_manager: 0,
        admin_staff: 0,
      };

      const statusStats = {
        pending: 0,
        approved: 0,
        rejected: 0,
      };

      (byType || []).forEach((item: any) => {
        if (Object.prototype.hasOwnProperty.call(typeStats, item.staff_type)) {
          typeStats[item.staff_type as keyof typeof typeStats]++;
        }
      });

      (byStatus || []).forEach((item: any) => {
        if (Object.prototype.hasOwnProperty.call(statusStats, item.approval_status)) {
          statusStats[item.approval_status as keyof typeof statusStats]++;
        }
      });

      res.json({
        success: true,
        data: {
          total: (byType || []).length,
          by_type: typeStats,
          by_status: statusStats,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get staff stats', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch staff statistics' });
    }
  }
);

// ============================================================================
// DELIVERY & INCOMING ORDERS ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/delivery/incoming-orders:
 *   get:
 *     tags: [Delivery]
 *     summary: Get incoming orders for delivery dashboard
 *     description: Retrieve paginated list of incoming orders with toggleable delivery status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *         description: Filter by order status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by order number or product name
 *     responses:
 *       200:
 *         description: Incoming orders retrieved successfully
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
 *                       product_name:
 *                         type: string
 *                       quantity:
 *                         type: integer
 *                       date:
 *                         type: string
 *                         format: date
 *                       revenue:
 *                         type: number
 *                       net_profit:
 *                         type: number
 *                       status:
 *                         type: string
 *                       is_delivered:
 *                         type: boolean
 *             example:
 *               success: true
 *               data:
 *                 - id: "o1234567-89ab-cdef-0123-456789abcdef"
 *                   order_number: "ORD-2026-001234"
 *                   product_name: "Analog Table Clock"
 *                   quantity: 2
 *                   date: "2020-02-05"
 *                   revenue: 253.82
 *                   net_profit: 60.76
 *                   status: "pending"
 *                   is_delivered: false
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/delivery/incoming-orders',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', status, search } = req.query;
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
          updated_at,
          ecommerce_order_items(
            quantity,
            unit_price,
            ecommerce_products(name)
          )
        `,
          { count: 'exact' }
        )
        .is('deleted_at', null)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status as string);
      }

      if (search) {
        query = query.or(`order_number.ilike.%${search}%`);
      }

      const { data: orders, count, error } = await query;

      if (error) throw error;

      // Transform data for frontend
      const transformedOrders = (orders || []).map((order: any) => {
        const items = order.ecommerce_order_items || [];
        const firstItem = items[0];
        const totalQuantity = items.reduce(
          (sum: number, item: any) => sum + (item.quantity || 0),
          0
        );
        const revenue = parseFloat(order.total_amount || '0');
        const netProfit = revenue * 0.24; // Approximate 24% profit margin

        return {
          id: order.id,
          order_number: order.order_number,
          product_name: firstItem?.ecommerce_products?.name || 'Multiple Items',
          quantity: totalQuantity,
          date: order.created_at?.split('T')[0],
          revenue: Math.round(revenue * 100) / 100,
          net_profit: Math.round(netProfit * 100) / 100,
          status: order.status,
          is_delivered: order.status === 'delivered' || order.status === 'completed',
        };
      });

      await createAudit(req, 'view_incoming_orders', 'delivery_dashboard');

      res.json({
        success: true,
        data: transformedOrders,
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: any) {
      logger.error('Failed to get incoming orders', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch incoming orders' });
    }
  }
);

/**
 * @swagger
 * /api/delivery/orders/{orderId}/toggle-status:
 *   put:
 *     tags: [Delivery]
 *     summary: Toggle order delivery status
 *     description: Toggle an order between delivered and pending status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
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
 *             required:
 *               - is_delivered
 *             properties:
 *               is_delivered:
 *                 type: boolean
 *           example:
 *             is_delivered: true
 *     responses:
 *       200:
 *         description: Order status toggled successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "o1234567-89ab-cdef-0123-456789abcdef"
 *                 status: "delivered"
 *                 is_delivered: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.put(
  '/delivery/orders/:orderId/toggle-status',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const { is_delivered } = req.body;

      const newStatus = is_delivered ? 'delivered' : 'pending';

      const { data: order, error } = await supabase
        .from('ecommerce_orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
          code: 'ORDER_NOT_FOUND',
        });
      }

      await createAudit(req, 'toggle_order_status', 'ecommerce_orders', orderId, {
        new_status: newStatus,
        is_delivered,
      });

      res.json({
        success: true,
        data: {
          id: order.id,
          status: order.status,
          is_delivered: order.status === 'delivered' || order.status === 'completed',
        },
      });
    } catch (error: any) {
      logger.error('Failed to toggle order status', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to toggle order status' });
    }
  }
);

/**
 * @swagger
 * /api/delivery/packages/track/{trackingId}:
 *   get:
 *     tags: [Delivery]
 *     summary: Track package by tracking ID
 *     description: Get package details and status history by tracking ID (e.g., #127777489-DL-NY)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Package tracking ID
 *         example: "127777489-DL-NY"
 *     responses:
 *       200:
 *         description: Package tracking info retrieved successfully
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
 *                     tracking_id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     package_type:
 *                       type: string
 *                     status_history:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                           location:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                           is_current:
 *                             type: boolean
 *             example:
 *               success: true
 *               data:
 *                 tracking_id: "#127777489-DL-NY"
 *                 status: "out_for_delivery"
 *                 package_type: "Parcel"
 *                 status_history:
 *                   - status: "Package has left Courier Facility"
 *                     location: "SAN FRANCISCO, CALIFORNIA"
 *                     timestamp: "2026-02-10T08:30:00Z"
 *                     is_current: false
 *                   - status: "Package arrived at Local Facility"
 *                     location: "NEW YORK CITY, NEW YORK"
 *                     timestamp: "2026-02-11T14:20:00Z"
 *                     is_current: false
 *                   - status: "Out for Delivery"
 *                     location: "NEW YORK CITY, NEW YORK"
 *                     timestamp: "2026-02-12T09:00:00Z"
 *                     is_current: true
 *       404:
 *         description: Package not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/delivery/packages/track/:trackingId',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { trackingId } = req.params;

      // Clean tracking ID (remove # if present)
      const cleanTrackingId = trackingId.replace(/^#/, '');

      // Search for package by tracking number
      const { data: pkg, error } = await supabase
        .from('delivery_packages')
        .select('*')
        .or(`tracking_number.eq.${cleanTrackingId},tracking_number.eq.#${cleanTrackingId}`)
        .is('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!pkg) {
        return res.status(404).json({
          success: false,
          error: 'Package not found',
          code: 'PACKAGE_NOT_FOUND',
        });
      }

      // Get status history
      const { data: statusHistory } = await supabase
        .from('delivery_status_history')
        .select('*')
        .eq('package_id', pkg.id)
        .order('created_at', { ascending: true });

      // Build status timeline
      const statusLabels: Record<string, string> = {
        pending: 'Package Created',
        assigned: 'Driver Assigned',
        picked_up: 'Package Picked Up',
        left_facility: 'Package has left Courier Facility',
        in_transit: 'Package in Transit',
        arrived_facility: 'Package arrived at Local Facility',
        out_for_delivery: 'Out for Delivery',
        delivered: 'Delivered',
        failed: 'Delivery Failed',
        cancelled: 'Cancelled',
        returned: 'Returned to Sender',
      };

      const timeline = (statusHistory || []).map((entry: any, index: number, arr: any[]) => ({
        status: statusLabels[entry.status] || entry.status,
        location: entry.location || 'Unknown Location',
        timestamp: entry.created_at,
        is_current: index === arr.length - 1,
      }));

      // If no history, create basic timeline from package status
      if (timeline.length === 0) {
        timeline.push({
          status: statusLabels[pkg.status] || pkg.status,
          location: pkg.current_location || 'Processing Center',
          timestamp: pkg.updated_at || pkg.created_at,
          is_current: true,
        });
      }

      await createAudit(req, 'track_package', 'delivery_packages', pkg.id);

      res.json({
        success: true,
        data: {
          tracking_id: `#${cleanTrackingId}`,
          status: pkg.status,
          package_type: pkg.package_type || 'Parcel',
          sender: {
            name: pkg.sender_name,
            address: pkg.sender_address,
          },
          recipient: {
            name: pkg.recipient_name,
            address: pkg.recipient_address,
          },
          delivery_address: pkg.recipient_address,
          estimated_delivery: pkg.estimated_delivery_date,
          status_history: timeline,
        },
      });
    } catch (error: any) {
      logger.error('Failed to track package', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to track package' });
    }
  }
);

/**
 * @swagger
 * /api/delivery/packages/recent:
 *   get:
 *     tags: [Delivery]
 *     summary: Get recent packages for delivery dashboard
 *     description: Retrieve recent packages with their current status for the delivery dashboard sidebar
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of recent packages to return
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in_transit, out_for_delivery, delivered, pending]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Recent packages retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - tracking_id: "#127777489-DL-NY"
 *                   status: "in_transit"
 *                   status_label: "In Transit"
 *                   package_type: "Documents"
 *                   current_location: "DETROIT, DENMARK"
 *                   last_update: "Package has left Courier Facility"
 *                 - tracking_id: "#127777490-DL-NY"
 *                   status: "in_customs"
 *                   status_label: "In Customs"
 *                   package_type: "Parcel"
 *                   current_location: "NEW YORK CITY, NEW YORK"
 *                   last_update: "Customs"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/delivery/packages/recent',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { limit = '5', status } = req.query;
      const limitNum = Math.min(parseInt(limit as string, 10) || 5, 20);

      let query = supabase
        .from('delivery_packages')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(limitNum);

      if (status) {
        query = query.eq('status', status as string);
      }

      const { data: packages, error } = await query;

      if (error) throw error;

      const statusLabels: Record<string, string> = {
        pending: 'Pending',
        assigned: 'Assigned',
        picked_up: 'Picked Up',
        left_facility: 'Left Facility',
        in_transit: 'In Transit',
        in_customs: 'In Customs',
        arrived_facility: 'Arrived at Facility',
        out_for_delivery: 'Out for Delivery',
        delivered: 'Delivered',
        failed: 'Failed',
        cancelled: 'Cancelled',
        returned: 'Returned',
      };

      const recentPackages = (packages || []).map((pkg: any) => ({
        tracking_id: pkg.tracking_number
          ? `#${pkg.tracking_number}`
          : `#PKG-${pkg.id.slice(0, 8).toUpperCase()}`,
        status: pkg.status,
        status_label: statusLabels[pkg.status] || pkg.status,
        package_type: pkg.package_type || 'Parcel',
        current_location: pkg.current_location || 'Processing',
        last_update: pkg.last_status_update || statusLabels[pkg.status],
        updated_at: pkg.updated_at,
      }));

      await createAudit(req, 'view_recent_packages', 'delivery_dashboard');

      res.json({
        success: true,
        data: recentPackages,
      });
    } catch (error: any) {
      logger.error('Failed to get recent packages', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch recent packages' });
    }
  }
);

/**
 * @swagger
 * /api/delivery/packages/search:
 *   get:
 *     tags: [Delivery]
 *     summary: Search packages
 *     description: Search packages by tracking number, sender/recipient name, address, or status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (tracking number, name, address)
 *         example: "127777489"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, picked_up, in_transit, out_for_delivery, delivered, failed, cancelled, returned]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - tracking_id: "#127777489-DL-NY"
 *                   status: "in_transit"
 *                   sender_name: "John Smith"
 *                   recipient_name: "Jane Doe"
 *                   package_type: "Parcel"
 *                   current_location: "NEW YORK CITY, NEW YORK"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 1
 *       400:
 *         description: Search query required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/delivery/packages/search',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { q, status, page = '1', limit = '20' } = req.query;

      if (!q || (q as string).trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required',
          code: 'VALIDATION_ERROR',
        });
      }

      const searchTerm = (q as string).trim().replace(/^#/, '');
      const { from, to } = getPaginationRange(page as string, limit as string);

      // Build search query
      let query = supabase
        .from('delivery_packages')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .or(
          `tracking_number.ilike.%${searchTerm}%,` +
            `sender_name.ilike.%${searchTerm}%,` +
            `recipient_name.ilike.%${searchTerm}%,` +
            `sender_address.ilike.%${searchTerm}%,` +
            `recipient_address.ilike.%${searchTerm}%`
        )
        .range(from, to)
        .order('updated_at', { ascending: false });

      if (status) {
        query = query.eq('status', status as string);
      }

      const { data: packages, count, error } = await query;

      if (error) throw error;

      const statusLabels: Record<string, string> = {
        pending: 'Pending',
        assigned: 'Assigned',
        picked_up: 'Picked Up',
        left_facility: 'Left Facility',
        in_transit: 'In Transit',
        arrived_facility: 'Arrived at Facility',
        out_for_delivery: 'Out for Delivery',
        delivered: 'Delivered',
        failed: 'Failed',
        cancelled: 'Cancelled',
        returned: 'Returned',
      };

      const results = (packages || []).map((pkg: any) => ({
        id: pkg.id,
        tracking_id: pkg.tracking_number
          ? `#${pkg.tracking_number}`
          : `#PKG-${pkg.id.slice(0, 8).toUpperCase()}`,
        status: pkg.status,
        status_label: statusLabels[pkg.status] || pkg.status,
        sender_name: pkg.sender_name,
        recipient_name: pkg.recipient_name,
        sender_address: pkg.sender_address,
        recipient_address: pkg.recipient_address,
        package_type: pkg.package_type || 'Parcel',
        current_location: pkg.current_location || 'Processing',
        estimated_delivery: pkg.estimated_delivery_date,
        created_at: pkg.created_at,
        updated_at: pkg.updated_at,
      }));

      await createAudit(req, 'search_packages', 'delivery_packages', undefined, {
        search_term: searchTerm,
      });

      res.json({
        success: true,
        data: results,
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: any) {
      logger.error('Failed to search packages', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to search packages' });
    }
  }
);

/**
 * @swagger
 * /api/delivery/packages/{packageId}/update-status:
 *   put:
 *     tags: [Delivery]
 *     summary: Update package delivery status
 *     description: Update package status and add to status history (triggers notification)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
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
 *             required:
 *               - status
 *               - location
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, picked_up, left_facility, in_transit, arrived_facility, out_for_delivery, delivered, failed, cancelled]
 *               location:
 *                 type: string
 *               notes:
 *                 type: string
 *               notify_recipient:
 *                 type: boolean
 *                 default: true
 *           example:
 *             status: "out_for_delivery"
 *             location: "NEW YORK CITY, NEW YORK"
 *             notes: "Package is out for delivery"
 *             notify_recipient: true
 *     responses:
 *       200:
 *         description: Package status updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "p1234567-89ab-cdef-0123-456789abcdef"
 *                 status: "out_for_delivery"
 *                 notification_sent: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Package not found
 *       500:
 *         description: Internal server error
 */
router.put(
  '/delivery/packages/:packageId/update-status',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { packageId } = req.params;
      const { status, location, notes, notify_recipient = true } = req.body;

      // Validate status
      const validStatuses = [
        'pending',
        'assigned',
        'picked_up',
        'left_facility',
        'in_transit',
        'arrived_facility',
        'out_for_delivery',
        'delivered',
        'failed',
        'cancelled',
        'returned',
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          code: 'VALIDATION_ERROR',
        });
      }

      // Update package status
      const { data: pkg, error: updateError } = await supabase
        .from('delivery_packages')
        .update({
          status,
          current_location: location,
          last_status_update: notes || `Status changed to ${status}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', packageId)
        .is('deleted_at', null)
        .select()
        .single();

      if (updateError) throw updateError;

      if (!pkg) {
        return res.status(404).json({
          success: false,
          error: 'Package not found',
          code: 'PACKAGE_NOT_FOUND',
        });
      }

      // Add to status history
      await supabase.from('delivery_status_history').insert({
        package_id: packageId,
        status,
        location,
        notes,
        created_by: req.user!.id,
      });

      // Create notification if requested
      let notificationSent = false;
      if (notify_recipient && pkg.recipient_id) {
        try {
          const statusMessages: Record<string, string> = {
            picked_up: 'Your package has been picked up',
            left_facility: 'Your package has left the courier facility',
            in_transit: 'Your package is in transit',
            arrived_facility: 'Your package has arrived at a local facility',
            out_for_delivery: 'Your package is out for delivery',
            delivered: 'Your package has been delivered',
            failed: 'Delivery attempt failed',
          };

          if (statusMessages[status]) {
            await supabase.from('notifications').insert({
              user_id: pkg.recipient_id,
              type: 'delivery_update',
              title: 'Delivery Update',
              message: `${statusMessages[status]} - Tracking: ${pkg.tracking_number || packageId}`,
              data: {
                package_id: packageId,
                tracking_number: pkg.tracking_number,
                status,
                location,
              },
            });
            notificationSent = true;
          }
        } catch (notifError: any) {
          logger.warn('Failed to send delivery notification', { error: notifError.message });
        }
      }

      await createAudit(req, 'update_package_status', 'delivery_packages', packageId, {
        new_status: status,
        location,
        notification_sent: notificationSent,
      });

      res.json({
        success: true,
        data: {
          id: pkg.id,
          tracking_number: pkg.tracking_number,
          status: pkg.status,
          current_location: pkg.current_location,
          notification_sent: notificationSent,
        },
      });
    } catch (error: any) {
      logger.error('Failed to update package status', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to update package status' });
    }
  }
);

/**
 * @swagger
 * /api/delivery/dashboard:
 *   get:
 *     tags: [Delivery]
 *     summary: Get delivery dashboard data
 *     description: Get comprehensive delivery dashboard data including stats, recent packages, and map data
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 stats:
 *                   total_packages: 1250
 *                   in_transit: 45
 *                   delivered_today: 28
 *                   pending_pickup: 12
 *                 featured_package:
 *                   tracking_id: "#127777489-DL-NY"
 *                   status: "out_for_delivery"
 *                   package_type: "Parcel"
 *                 recent_packages:
 *                   - tracking_id: "#127777489-DL-NY"
 *                     status: "in_transit"
 *                     package_type: "Documents"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/delivery/dashboard',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get package statistics
      const [totalPackages, inTransit, deliveredToday, pendingPickup] = await Promise.all([
        supabase
          .from('delivery_packages')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null),
        supabase
          .from('delivery_packages')
          .select('id', { count: 'exact', head: true })
          .in('status', ['in_transit', 'out_for_delivery'])
          .is('deleted_at', null),
        supabase
          .from('delivery_packages')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'delivered')
          .gte('updated_at', today.toISOString())
          .is('deleted_at', null),
        supabase
          .from('delivery_packages')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .is('deleted_at', null),
      ]);

      // Get featured package (most recent active)
      const { data: featuredPkg } = await supabase
        .from('delivery_packages')
        .select('*')
        .in('status', ['in_transit', 'out_for_delivery'])
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      // Get recent packages
      const { data: recentPackages } = await supabase
        .from('delivery_packages')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(5);

      const statusLabels: Record<string, string> = {
        pending: 'Pending',
        assigned: 'Assigned',
        picked_up: 'Picked Up',
        left_facility: 'Left Facility',
        in_transit: 'In Transit',
        in_customs: 'In Customs',
        arrived_facility: 'Arrived at Facility',
        out_for_delivery: 'Out for Delivery',
        delivered: 'Delivered',
        failed: 'Failed',
        cancelled: 'Cancelled',
        returned: 'Returned',
      };

      await createAudit(req, 'view_delivery_dashboard', 'delivery_dashboard');

      res.json({
        success: true,
        data: {
          stats: {
            total_packages: totalPackages.count || 0,
            in_transit: inTransit.count || 0,
            delivered_today: deliveredToday.count || 0,
            pending_pickup: pendingPickup.count || 0,
          },
          featured_package: featuredPkg
            ? {
                tracking_id: featuredPkg.tracking_number
                  ? `#${featuredPkg.tracking_number}`
                  : `#PKG-${featuredPkg.id.slice(0, 8).toUpperCase()}`,
                status: featuredPkg.status,
                status_label: statusLabels[featuredPkg.status] || featuredPkg.status,
                package_type: featuredPkg.package_type || 'Parcel',
                current_location: featuredPkg.current_location,
              }
            : null,
          recent_packages: (recentPackages || []).map((pkg: any) => ({
            tracking_id: pkg.tracking_number
              ? `#${pkg.tracking_number}`
              : `#PKG-${pkg.id.slice(0, 8).toUpperCase()}`,
            status: pkg.status,
            status_label: statusLabels[pkg.status] || pkg.status,
            package_type: pkg.package_type || 'Parcel',
            current_location: pkg.current_location,
          })),
        },
      });
    } catch (error: any) {
      logger.error('Failed to get delivery dashboard', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch delivery dashboard' });
    }
  }
);

export default router;
