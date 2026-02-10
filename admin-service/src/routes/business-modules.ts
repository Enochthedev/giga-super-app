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
        user:user_profiles!driver_profiles_user_id_fkey (
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
        host:host_profiles!hotels_host_id_fkey (
          user_id,
          user_profiles!host_profiles_user_id_fkey (
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
        user_profiles!file_metadata_uploaded_by_fkey(first_name, last_name, email)
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
        .select('id, name, price, stock_quantity, is_active')
        .eq('vendor_id', id)
        .eq('is_active', true)
        .limit(20);

      // Get recent orders
      const { data: orders } = await supabase
        .from('ecommerce_orders')
        .select('id, total_amount, status, created_at')
        .eq('vendor_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get reviews (from product reviews)
      const productIds = (products || []).map((p: any) => p.id);
      let reviews: any[] = [];

      if (productIds.length > 0) {
        const { data: reviewsData } = await supabase
          .from('product_reviews')
          .select(
            `
          id,
          rating,
          comment,
          created_at,
          user:user_profiles!product_reviews_user_id_fkey(first_name, last_name)
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
          user:user_profiles!driver_profiles_user_id_fkey(first_name, last_name, email, phone, avatar_url)
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
        .from('taxi_rides')
        .select(
          `
          id,
          pickup_location,
          dropoff_location,
          fare_amount,
          status,
          created_at,
          completed_at
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
        .from('taxi_rides')
        .select('fare_amount, created_at')
        .eq('driver_id', id)
        .eq('status', 'completed');

      const earnings = {
        today: 0,
        this_week: 0,
        this_month: 0,
        total: 0,
      };

      (earningsData || []).forEach((ride: any) => {
        const amount = ride.fare_amount || 0;
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

      // Get host info
      const { data: host } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, email, phone')
        .eq('id', (hotel as any).host_id)
        .single();

      // Get rooms
      const { data: rooms } = await supabase
        .from('room_types')
        .select('id, name, base_price, max_occupancy, available_rooms')
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
          user_profiles!hotel_bookings_user_id_fkey(first_name, last_name)
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
          user_profiles!hotel_reviews_user_id_fkey(first_name, last_name)
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
          publisher:user_profiles!uploaded_by(first_name, last_name, email, avatar_url)
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

export default router;
