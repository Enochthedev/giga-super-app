import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit } from '../middleware/audit';
import { AuthRequest, authenticate, requireAnyAccess } from '../middleware/auth';
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
        user:user_profiles!user_id (
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
        host:user_profiles!host_id (
          first_name,
          last_name,
          email,
          phone
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
        user_profiles!uploaded_by(first_name, last_name, email)
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

export default router;
