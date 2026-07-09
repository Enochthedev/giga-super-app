/**
 * Admin search routes for Search Service
 * Protected endpoints for admin/moderator users to search sensitive data
 */

import { Request, Response, Router } from 'express';
import { ZodError, z } from 'zod';

import {
  authenticateUser,
  rateLimitByUser,
  requireAdmin,
  requireModerator,
} from '../middleware/auth.js';
import { DatabaseService } from '../utils/database.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Initialize database service lazily
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let databaseService: DatabaseService | null = null;

const getDatabase = () => {
  if (!databaseService) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }
    databaseService = new DatabaseService(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return databaseService;
};

// Validation schemas
const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const UserSearchSchema = PaginationSchema.extend({
  q: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
  is_phone_verified: z.coerce.boolean().optional(),
});

const VendorSearchSchema = PaginationSchema.extend({
  q: z.string().optional(),
  business_name: z.string().optional(),
  is_verified: z.coerce.boolean().optional(),
  is_active: z.coerce.boolean().optional(),
  min_rating: z.coerce.number().min(0).max(5).optional(),
});

const DriverSearchSchema = PaginationSchema.extend({
  q: z.string().optional(),
  license_number: z.string().optional(),
  is_online: z.coerce.boolean().optional(),
  is_verified: z.coerce.boolean().optional(),
  min_rating: z.coerce.number().min(0).max(5).optional(),
  subscription_tier: z.string().optional(),
});

const BookingSearchSchema = PaginationSchema.extend({
  q: z.string().optional(),
  booking_number: z.string().optional(),
  user_id: z.string().uuid().optional(),
  hotel_id: z.string().uuid().optional(),
  booking_status: z.string().optional(),
  payment_status: z.string().optional(),
  check_in_from: z.string().optional(),
  check_in_to: z.string().optional(),
});

const OrderSearchSchema = PaginationSchema.extend({
  q: z.string().optional(),
  order_number: z.string().optional(),
  user_id: z.string().uuid().optional(),
  status: z.string().optional(),
  payment_status: z.string().optional(),
  min_amount: z.coerce.number().optional(),
  max_amount: z.coerce.number().optional(),
});

const TransactionSearchSchema = PaginationSchema.extend({
  q: z.string().optional(),
  reference_id: z.string().optional(),
  user_id: z.string().uuid().optional(),
  payment_method: z.string().optional(),
  payment_status: z.string().optional(),
  payment_type: z.string().optional(),
  min_amount: z.coerce.number().optional(),
  max_amount: z.coerce.number().optional(),
});

const RideSearchSchema = PaginationSchema.extend({
  q: z.string().optional(),
  passenger_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  status: z.string().optional(),
  min_fare: z.coerce.number().optional(),
  max_fare: z.coerce.number().optional(),
});

// Helper functions
const paginate = (page: number, limit: number) => {
  const offset = (page - 1) * limit;
  return { offset, limit };
};

const meta = (requestId: string, executionTime: number, cached = false) => ({
  timestamp: new Date().toISOString(),
  request_id: requestId,
  execution_time_ms: executionTime,
  cached,
  version: '1.0.0',
});

/**
 * @swagger
 * /search/admin/users:
 *   post:
 *     summary: Search users (Admin)
 *     description: |
 *       Search user profiles with advanced filters.
 *       Requires moderator or admin role.
 *     tags: [Admin Search]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminUserSearchRequest'
 *           example:
 *             q: "john"
 *             email: "john@example.com"
 *             is_active: true
 *             page: 1
 *             limit: 20
 *     responses:
 *       200:
 *         description: User search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminUserSearchResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Insufficient permissions (requires moderator role)
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/users',
  authenticateUser,
  requireModerator,
  rateLimitByUser(100, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    try {
      const params = UserSearchSchema.parse(req.body);
      const { offset, limit } = paginate(params.page, params.limit);

      const db = getDatabase();
      let query = db.supabase
        .from('user_profiles')
        .select(
          'id, email, phone, first_name, last_name, avatar_url, is_active, is_phone_verified, last_login_at, created_at, updated_at',
          { count: 'exact' }
        )
        .is('deleted_at', null);

      if (params.q) {
        query = query.or(
          `first_name.ilike.%${params.q}%,last_name.ilike.%${params.q}%,email.ilike.%${params.q}%,phone.ilike.%${params.q}%`
        );
      }
      if (params.email) query = query.ilike('email', `%${params.email}%`);
      if (params.phone) query = query.ilike('phone', `%${params.phone}%`);
      if (params.is_active !== undefined) query = query.eq('is_active', params.is_active);
      if (params.is_phone_verified !== undefined)
        query = query.eq('is_phone_verified', params.is_phone_verified);

      query = query.order(params.sort || 'created_at', { ascending: params.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`User search failed: ${error.message}`);

      res.json({
        success: true,
        data: { results: data || [], total: count || 0 },
        pagination: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
        },
        metadata: meta(requestId, Date.now() - startTime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: error.errors,
          },
          metadata: meta(requestId, Date.now() - startTime),
        });
        return;
      }
      logger.error('Admin user search failed', error as Error);
      res.status(500).json({
        success: false,
        error: { code: 'USER_SEARCH_ERROR', message: 'User search failed' },
        metadata: meta(requestId, Date.now() - startTime),
      });
    }
  }
);

/**
 * @swagger
 * /search/admin/vendors:
 *   post:
 *     summary: Search vendors (Admin)
 *     description: |
 *       Search ecommerce vendors with advanced filters.
 *       Requires moderator or admin role.
 *     tags: [Admin Search]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminVendorSearchRequest'
 *           example:
 *             q: "electronics"
 *             is_verified: true
 *             min_rating: 4.0
 *             page: 1
 *             limit: 20
 *     responses:
 *       200:
 *         description: Vendor search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminVendorSearchResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Insufficient permissions (requires moderator role)
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/vendors',
  authenticateUser,
  requireModerator,
  rateLimitByUser(100, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    try {
      const params = VendorSearchSchema.parse(req.body);
      const { offset, limit } = paginate(params.page, params.limit);

      const db = getDatabase();
      let query = db.supabase
        .from('ecommerce_vendors')
        .select(
          'id, business_name, business_registration, tax_id, is_verified, is_active, average_rating, total_sales, commission_rate, created_at, updated_at',
          { count: 'exact' }
        )
        .is('deleted_at', null);

      if (params.q)
        query = query.or(
          `business_name.ilike.%${params.q}%,business_registration.ilike.%${params.q}%`
        );
      if (params.business_name) query = query.ilike('business_name', `%${params.business_name}%`);
      if (params.is_verified !== undefined) query = query.eq('is_verified', params.is_verified);
      if (params.is_active !== undefined) query = query.eq('is_active', params.is_active);
      if (params.min_rating !== undefined) query = query.gte('average_rating', params.min_rating);

      query = query.order(params.sort || 'created_at', { ascending: params.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`Vendor search failed: ${error.message}`);

      res.json({
        success: true,
        data: { results: data || [], total: count || 0 },
        pagination: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
        },
        metadata: meta(requestId, Date.now() - startTime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: error.errors,
          },
          metadata: meta(requestId, Date.now() - startTime),
        });
        return;
      }
      logger.error('Admin vendor search failed', error as Error);
      res.status(500).json({
        success: false,
        error: { code: 'VENDOR_SEARCH_ERROR', message: 'Vendor search failed' },
        metadata: meta(requestId, Date.now() - startTime),
      });
    }
  }
);

/**
 * @swagger
 * /search/admin/drivers:
 *   post:
 *     summary: Search drivers (Admin)
 *     description: |
 *       Search driver profiles with advanced filters including license and status.
 *       Vehicle type is stored in vehicle_info JSON field.
 *       Requires admin role (sensitive data).
 *     tags: [Admin Search]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminDriverSearchRequest'
 *           example:
 *             license_number: "ABC123"
 *             is_online: true
 *             is_verified: true
 *             min_rating: 4.0
 *             page: 1
 *             limit: 20
 *     responses:
 *       200:
 *         description: Driver search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminDriverSearchResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Insufficient permissions (requires admin role)
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/drivers',
  authenticateUser,
  requireAdmin,
  rateLimitByUser(100, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    try {
      const params = DriverSearchSchema.parse(req.body);
      const { offset, limit } = paginate(params.page, params.limit);

      const db = getDatabase();
      let query = db.supabase
        .from('driver_profiles')
        .select(
          'id, user_id, license_number, vehicle_info, is_online, current_location, rating, total_rides, is_verified, subscription_tier, created_at, updated_at',
          { count: 'exact' }
        )
        .is('deleted_at', null);

      if (params.q) query = query.ilike('license_number', `%${params.q}%`);
      if (params.license_number)
        query = query.ilike('license_number', `%${params.license_number}%`);
      if (params.is_online !== undefined) query = query.eq('is_online', params.is_online);
      if (params.is_verified !== undefined) query = query.eq('is_verified', params.is_verified);
      if (params.min_rating !== undefined) query = query.gte('rating', params.min_rating);
      if (params.subscription_tier) query = query.eq('subscription_tier', params.subscription_tier);

      query = query.order(params.sort || 'created_at', { ascending: params.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`Driver search failed: ${error.message}`);

      res.json({
        success: true,
        data: { results: data || [], total: count || 0 },
        pagination: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
        },
        metadata: meta(requestId, Date.now() - startTime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: error.errors,
          },
          metadata: meta(requestId, Date.now() - startTime),
        });
        return;
      }
      logger.error('Admin driver search failed', error as Error);
      res.status(500).json({
        success: false,
        error: { code: 'DRIVER_SEARCH_ERROR', message: 'Driver search failed' },
        metadata: meta(requestId, Date.now() - startTime),
      });
    }
  }
);

/**
 * @swagger
 * /search/admin/bookings:
 *   post:
 *     summary: Search bookings (Admin)
 *     description: |
 *       Search hotel bookings with advanced filters including booking_status, dates, and payment status.
 *       Requires moderator or admin role.
 *     tags: [Admin Search]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminBookingSearchRequest'
 *           example:
 *             booking_number: "BK-2024"
 *             booking_status: "confirmed"
 *             payment_status: "paid"
 *             check_in_from: "2024-03-01"
 *             check_in_to: "2024-03-31"
 *             page: 1
 *             limit: 20
 *     responses:
 *       200:
 *         description: Booking search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminBookingSearchResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Insufficient permissions (requires moderator role)
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/bookings',
  authenticateUser,
  requireModerator,
  rateLimitByUser(100, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    try {
      const params = BookingSearchSchema.parse(req.body);
      const { offset, limit } = paginate(params.page, params.limit);

      const db = getDatabase();
      let query = db.supabase
        .from('hotel_bookings')
        .select(
          'id, booking_number, user_id, hotel_id, room_type_id, booking_status, check_in_date, check_out_date, guest_count, total_amount, payment_status, special_requests, created_at, updated_at',
          { count: 'exact' }
        )
        .is('deleted_at', null);

      if (params.q) query = query.ilike('booking_number', `%${params.q}%`);
      if (params.booking_number)
        query = query.ilike('booking_number', `%${params.booking_number}%`);
      if (params.user_id) query = query.eq('user_id', params.user_id);
      if (params.hotel_id) query = query.eq('hotel_id', params.hotel_id);
      if (params.booking_status) query = query.eq('booking_status', params.booking_status);
      if (params.payment_status) query = query.eq('payment_status', params.payment_status);
      if (params.check_in_from) query = query.gte('check_in_date', params.check_in_from);
      if (params.check_in_to) query = query.lte('check_in_date', params.check_in_to);

      query = query.order(params.sort || 'created_at', { ascending: params.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`Booking search failed: ${error.message}`);

      res.json({
        success: true,
        data: { results: data || [], total: count || 0 },
        pagination: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
        },
        metadata: meta(requestId, Date.now() - startTime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: error.errors,
          },
          metadata: meta(requestId, Date.now() - startTime),
        });
        return;
      }
      logger.error('Admin booking search failed', error as Error);
      res.status(500).json({
        success: false,
        error: { code: 'BOOKING_SEARCH_ERROR', message: 'Booking search failed' },
        metadata: meta(requestId, Date.now() - startTime),
      });
    }
  }
);

/**
 * @swagger
 * /search/admin/orders:
 *   post:
 *     summary: Search orders (Admin)
 *     description: |
 *       Search ecommerce orders with advanced filters including status, payment, and amount range.
 *       Requires moderator or admin role.
 *     tags: [Admin Search]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminOrderSearchRequest'
 *           example:
 *             order_number: "ORD-2024"
 *             status: "delivered"
 *             payment_status: "paid"
 *             min_amount: 10000
 *             max_amount: 500000
 *             page: 1
 *             limit: 20
 *     responses:
 *       200:
 *         description: Order search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminOrderSearchResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Insufficient permissions (requires moderator role)
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/orders',
  authenticateUser,
  requireModerator,
  rateLimitByUser(100, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    try {
      const params = OrderSearchSchema.parse(req.body);
      const { offset, limit } = paginate(params.page, params.limit);

      const db = getDatabase();
      let query = db.supabase
        .from('ecommerce_orders')
        .select(
          'id, order_number, user_id, status, payment_status, payment_method, subtotal, shipping_fee:shipping_cost, tax_amount, discount_amount, total_amount, shipping_address_id, created_at, updated_at',
          { count: 'exact' }
        )
        .is('deleted_at', null);

      if (params.q) query = query.ilike('order_number', `%${params.q}%`);
      if (params.order_number) query = query.ilike('order_number', `%${params.order_number}%`);
      if (params.user_id) query = query.eq('user_id', params.user_id);
      if (params.status) query = query.eq('status', params.status);
      if (params.payment_status) query = query.eq('payment_status', params.payment_status);
      if (params.min_amount !== undefined) query = query.gte('total_amount', params.min_amount);
      if (params.max_amount !== undefined) query = query.lte('total_amount', params.max_amount);

      query = query.order(params.sort || 'created_at', { ascending: params.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`Order search failed: ${error.message}`);

      res.json({
        success: true,
        data: { results: data || [], total: count || 0 },
        pagination: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
        },
        metadata: meta(requestId, Date.now() - startTime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: error.errors,
          },
          metadata: meta(requestId, Date.now() - startTime),
        });
        return;
      }
      logger.error('Admin order search failed', error as Error);
      res.status(500).json({
        success: false,
        error: { code: 'ORDER_SEARCH_ERROR', message: 'Order search failed' },
        metadata: meta(requestId, Date.now() - startTime),
      });
    }
  }
);

/**
 * @swagger
 * /search/admin/transactions:
 *   post:
 *     summary: Search transactions (Admin)
 *     description: |
 *       Search payment transactions with advanced filters.
 *       Requires admin role (sensitive financial data).
 *       All access is logged for audit purposes.
 *     tags: [Admin Search]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminTransactionSearchRequest'
 *           example:
 *             reference_id: "PAY-2024"
 *             payment_method: "card"
 *             payment_status: "success"
 *             payment_type: "hotel_booking"
 *             min_amount: 5000
 *             max_amount: 1000000
 *             page: 1
 *             limit: 20
 *     responses:
 *       200:
 *         description: Transaction search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminTransactionSearchResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Insufficient permissions (requires admin role)
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/transactions',
  authenticateUser,
  requireAdmin,
  rateLimitByUser(50, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    try {
      const params = TransactionSearchSchema.parse(req.body);
      const { offset, limit } = paginate(params.page, params.limit);

      const db = getDatabase();
      let query = db.supabase
        .from('payments')
        .select(
          'id, reference_id, provider_reference, user_id, amount, currency, payment_method, payment_status, payment_type, metadata, created_at',
          { count: 'exact' }
        )
        .is('deleted_at', null);

      if (params.q)
        query = query.or(`reference_id.ilike.%${params.q}%,provider_reference.ilike.%${params.q}%`);
      if (params.reference_id) query = query.ilike('reference_id', `%${params.reference_id}%`);
      if (params.user_id) query = query.eq('user_id', params.user_id);
      if (params.payment_method) query = query.eq('payment_method', params.payment_method);
      if (params.payment_status) query = query.eq('payment_status', params.payment_status);
      if (params.payment_type) query = query.eq('payment_type', params.payment_type);
      if (params.min_amount !== undefined) query = query.gte('amount', params.min_amount);
      if (params.max_amount !== undefined) query = query.lte('amount', params.max_amount);

      query = query.order(params.sort || 'created_at', { ascending: params.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`Transaction search failed: ${error.message}`);

      logger.info('Admin accessed transaction data', {
        admin_id: req.user?.id,
        filters: params,
        results_count: count,
      });

      res.json({
        success: true,
        data: { results: data || [], total: count || 0 },
        pagination: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
        },
        metadata: meta(requestId, Date.now() - startTime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: error.errors,
          },
          metadata: meta(requestId, Date.now() - startTime),
        });
        return;
      }
      logger.error('Admin transaction search failed', error as Error);
      res.status(500).json({
        success: false,
        error: { code: 'TRANSACTION_SEARCH_ERROR', message: 'Transaction search failed' },
        metadata: meta(requestId, Date.now() - startTime),
      });
    }
  }
);

/**
 * @swagger
 * /search/admin/rides:
 *   post:
 *     summary: Search rides (Admin)
 *     description: |
 *       Search taxi rides with advanced filters including passenger, driver, status, and fare range.
 *       Requires admin role (sensitive data).
 *     tags: [Admin Search]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminRideSearchRequest'
 *           example:
 *             status: "completed"
 *             min_fare: 1000
 *             max_fare: 50000
 *             page: 1
 *             limit: 20
 *     responses:
 *       200:
 *         description: Ride search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminRideSearchResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Insufficient permissions (requires admin role)
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/rides',
  authenticateUser,
  requireAdmin,
  rateLimitByUser(100, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    try {
      const params = RideSearchSchema.parse(req.body);
      const { offset, limit } = paginate(params.page, params.limit);

      const db = getDatabase();
      let query = db.supabase
        .from('rides')
        .select(
          'id, ride_number, passenger_id, driver_id, status, pickup_location, dropoff_location, final_amount, total_fare, distance_km, estimated_duration_minutes, rating, created_at, updated_at',
          { count: 'exact' }
        );
      // Note: rides table doesn't have deleted_at column

      if (params.passenger_id) query = query.eq('passenger_id', params.passenger_id);
      if (params.driver_id) query = query.eq('driver_id', params.driver_id);
      if (params.status) query = query.eq('status', params.status);
      if (params.min_fare !== undefined) query = query.gte('final_amount', params.min_fare);
      if (params.max_fare !== undefined) query = query.lte('final_amount', params.max_fare);

      query = query.order(params.sort || 'created_at', { ascending: params.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`Ride search failed: ${error.message}`);

      res.json({
        success: true,
        data: { results: data || [], total: count || 0 },
        pagination: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
        },
        metadata: meta(requestId, Date.now() - startTime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: error.errors,
          },
          metadata: meta(requestId, Date.now() - startTime),
        });
        return;
      }
      logger.error('Admin ride search failed', error as Error);
      res.status(500).json({
        success: false,
        error: { code: 'RIDE_SEARCH_ERROR', message: 'Ride search failed' },
        metadata: meta(requestId, Date.now() - startTime),
      });
    }
  }
);

// ============================================================================
// GET HANDLERS - Support for dashboard GET requests with query parameters
// ============================================================================

/**
 * @swagger
 * /search/admin/users:
 *   get:
 *     summary: Search users (GET)
 *     description: Search user profiles with query parameters (dashboard support)
 *     tags: [Admin Search]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (name, email, phone)
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Alias for q parameter
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
 *         description: User search results
 */
router.get(
  '/users',
  authenticateUser,
  requireModerator,
  rateLimitByUser(100, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    try {
      // Support both 'q' and 'query' parameters
      const queryParam = (req.query.q as string) || (req.query.query as string) || '';
      const params = UserSearchSchema.parse({
        ...req.query,
        q: queryParam,
      });
      const { offset, limit } = paginate(params.page, params.limit);

      const db = getDatabase();
      let query = db.supabase
        .from('user_profiles')
        .select(
          'id, email, phone, first_name, last_name, avatar_url, is_active, is_phone_verified, last_login_at, created_at, updated_at',
          { count: 'exact' }
        )
        .is('deleted_at', null);

      if (params.q) {
        query = query.or(
          `first_name.ilike.%${params.q}%,last_name.ilike.%${params.q}%,email.ilike.%${params.q}%,phone.ilike.%${params.q}%`
        );
      }
      if (params.email) query = query.ilike('email', `%${params.email}%`);
      if (params.phone) query = query.ilike('phone', `%${params.phone}%`);
      if (params.is_active !== undefined) query = query.eq('is_active', params.is_active);
      if (params.is_phone_verified !== undefined)
        query = query.eq('is_phone_verified', params.is_phone_verified);

      query = query.order(params.sort || 'created_at', { ascending: params.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`User search failed: ${error.message}`);

      res.json({
        success: true,
        data: { results: data || [], total: count || 0 },
        pagination: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
        },
        metadata: meta(requestId, Date.now() - startTime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: error.errors },
          metadata: meta(requestId, Date.now() - startTime),
        });
        return;
      }
      logger.error('Admin user search (GET) failed', error as Error);
      res.status(500).json({
        success: false,
        error: { code: 'USER_SEARCH_ERROR', message: 'User search failed' },
        metadata: meta(requestId, Date.now() - startTime),
      });
    }
  }
);

/**
 * @swagger
 * /search/admin/vendors:
 *   get:
 *     summary: Search vendors (GET)
 *     description: Search vendors with query parameters (dashboard support)
 *     tags: [Admin Search]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/vendors',
  authenticateUser,
  requireModerator,
  rateLimitByUser(100, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    try {
      const queryParam = (req.query.q as string) || (req.query.query as string) || '';
      const params = VendorSearchSchema.parse({
        ...req.query,
        q: queryParam,
      });
      const { offset, limit } = paginate(params.page, params.limit);

      const db = getDatabase();
      let query = db.supabase
        .from('ecommerce_vendors')
        .select(
          'id, business_name, business_registration, tax_id, is_verified, is_active, average_rating, total_sales, commission_rate, created_at, updated_at',
          { count: 'exact' }
        )
        .is('deleted_at', null);

      if (params.q)
        query = query.or(
          `business_name.ilike.%${params.q}%,business_registration.ilike.%${params.q}%`
        );
      if (params.business_name) query = query.ilike('business_name', `%${params.business_name}%`);
      if (params.is_verified !== undefined) query = query.eq('is_verified', params.is_verified);
      if (params.is_active !== undefined) query = query.eq('is_active', params.is_active);
      if (params.min_rating !== undefined) query = query.gte('average_rating', params.min_rating);

      query = query.order(params.sort || 'created_at', { ascending: params.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`Vendor search failed: ${error.message}`);

      res.json({
        success: true,
        data: { results: data || [], total: count || 0 },
        pagination: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
        },
        metadata: meta(requestId, Date.now() - startTime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: error.errors },
          metadata: meta(requestId, Date.now() - startTime),
        });
        return;
      }
      logger.error('Admin vendor search (GET) failed', error as Error);
      res.status(500).json({
        success: false,
        error: { code: 'VENDOR_SEARCH_ERROR', message: 'Vendor search failed' },
        metadata: meta(requestId, Date.now() - startTime),
      });
    }
  }
);

/**
 * @swagger
 * /search/admin/drivers:
 *   get:
 *     summary: Search drivers (GET)
 *     description: Search drivers with query parameters (dashboard support)
 *     tags: [Admin Search]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/drivers',
  authenticateUser,
  requireAdmin,
  rateLimitByUser(100, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    try {
      const queryParam = (req.query.q as string) || (req.query.query as string) || '';
      const params = DriverSearchSchema.parse({
        ...req.query,
        q: queryParam,
      });
      const { offset, limit } = paginate(params.page, params.limit);

      const db = getDatabase();
      let query = db.supabase
        .from('driver_profiles')
        .select(
          'id, user_id, license_number, vehicle_info, is_online, current_location, rating, total_rides, is_verified, subscription_tier, created_at, updated_at',
          { count: 'exact' }
        )
        .is('deleted_at', null);

      if (params.q) query = query.ilike('license_number', `%${params.q}%`);
      if (params.license_number)
        query = query.ilike('license_number', `%${params.license_number}%`);
      if (params.is_online !== undefined) query = query.eq('is_online', params.is_online);
      if (params.is_verified !== undefined) query = query.eq('is_verified', params.is_verified);
      if (params.min_rating !== undefined) query = query.gte('rating', params.min_rating);
      if (params.subscription_tier) query = query.eq('subscription_tier', params.subscription_tier);

      query = query.order(params.sort || 'created_at', { ascending: params.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`Driver search failed: ${error.message}`);

      res.json({
        success: true,
        data: { results: data || [], total: count || 0 },
        pagination: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
        },
        metadata: meta(requestId, Date.now() - startTime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: error.errors },
          metadata: meta(requestId, Date.now() - startTime),
        });
        return;
      }
      logger.error('Admin driver search (GET) failed', error as Error);
      res.status(500).json({
        success: false,
        error: { code: 'DRIVER_SEARCH_ERROR', message: 'Driver search failed' },
        metadata: meta(requestId, Date.now() - startTime),
      });
    }
  }
);

/**
 * @swagger
 * /search/admin/bookings:
 *   get:
 *     summary: Search bookings (GET)
 *     description: Search bookings with query parameters (dashboard support)
 *     tags: [Admin Search]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/bookings',
  authenticateUser,
  requireModerator,
  rateLimitByUser(100, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    try {
      const queryParam = (req.query.q as string) || (req.query.query as string) || '';
      const params = BookingSearchSchema.parse({
        ...req.query,
        q: queryParam,
      });
      const { offset, limit } = paginate(params.page, params.limit);

      const db = getDatabase();
      let query = db.supabase
        .from('hotel_bookings')
        .select(
          'id, booking_number, user_id, hotel_id, room_type_id, booking_status, check_in_date, check_out_date, guest_count, total_amount, payment_status, special_requests, created_at, updated_at',
          { count: 'exact' }
        )
        .is('deleted_at', null);

      if (params.q) query = query.ilike('booking_number', `%${params.q}%`);
      if (params.booking_number)
        query = query.ilike('booking_number', `%${params.booking_number}%`);
      if (params.user_id) query = query.eq('user_id', params.user_id);
      if (params.hotel_id) query = query.eq('hotel_id', params.hotel_id);
      if (params.booking_status) query = query.eq('booking_status', params.booking_status);
      if (params.payment_status) query = query.eq('payment_status', params.payment_status);
      if (params.check_in_from) query = query.gte('check_in_date', params.check_in_from);
      if (params.check_in_to) query = query.lte('check_in_date', params.check_in_to);

      query = query.order(params.sort || 'created_at', { ascending: params.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`Booking search failed: ${error.message}`);

      res.json({
        success: true,
        data: { results: data || [], total: count || 0 },
        pagination: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
        },
        metadata: meta(requestId, Date.now() - startTime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: error.errors },
          metadata: meta(requestId, Date.now() - startTime),
        });
        return;
      }
      logger.error('Admin booking search (GET) failed', error as Error);
      res.status(500).json({
        success: false,
        error: { code: 'BOOKING_SEARCH_ERROR', message: 'Booking search failed' },
        metadata: meta(requestId, Date.now() - startTime),
      });
    }
  }
);

/**
 * @swagger
 * /search/admin/orders:
 *   get:
 *     summary: Search orders (GET)
 *     description: Search orders with query parameters (dashboard support)
 *     tags: [Admin Search]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/orders',
  authenticateUser,
  requireModerator,
  rateLimitByUser(100, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    try {
      const queryParam = (req.query.q as string) || (req.query.query as string) || '';
      const params = OrderSearchSchema.parse({
        ...req.query,
        q: queryParam,
      });
      const { offset, limit } = paginate(params.page, params.limit);

      const db = getDatabase();
      let query = db.supabase
        .from('ecommerce_orders')
        .select(
          'id, order_number, user_id, status, payment_status, payment_method, subtotal, shipping_fee:shipping_cost, tax_amount, discount_amount, total_amount, shipping_address_id, created_at, updated_at',
          { count: 'exact' }
        )
        .is('deleted_at', null);

      if (params.q) query = query.ilike('order_number', `%${params.q}%`);
      if (params.order_number) query = query.ilike('order_number', `%${params.order_number}%`);
      if (params.user_id) query = query.eq('user_id', params.user_id);
      if (params.status) query = query.eq('status', params.status);
      if (params.payment_status) query = query.eq('payment_status', params.payment_status);
      if (params.min_amount !== undefined) query = query.gte('total_amount', params.min_amount);
      if (params.max_amount !== undefined) query = query.lte('total_amount', params.max_amount);

      query = query.order(params.sort || 'created_at', { ascending: params.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`Order search failed: ${error.message}`);

      res.json({
        success: true,
        data: { results: data || [], total: count || 0 },
        pagination: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
        },
        metadata: meta(requestId, Date.now() - startTime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: error.errors },
          metadata: meta(requestId, Date.now() - startTime),
        });
        return;
      }
      logger.error('Admin order search (GET) failed', error as Error);
      res.status(500).json({
        success: false,
        error: { code: 'ORDER_SEARCH_ERROR', message: 'Order search failed' },
        metadata: meta(requestId, Date.now() - startTime),
      });
    }
  }
);

/**
 * @swagger
 * /search/admin/transactions:
 *   get:
 *     summary: Search transactions (GET)
 *     description: Search transactions with query parameters (dashboard support)
 *     tags: [Admin Search]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/transactions',
  authenticateUser,
  requireAdmin,
  rateLimitByUser(50, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    try {
      const queryParam = (req.query.q as string) || (req.query.query as string) || '';
      const params = TransactionSearchSchema.parse({
        ...req.query,
        q: queryParam,
      });
      const { offset, limit } = paginate(params.page, params.limit);

      const db = getDatabase();
      let query = db.supabase
        .from('payments')
        .select(
          'id, reference_id, provider_reference, user_id, amount, currency, payment_method, payment_status, payment_type, metadata, created_at',
          { count: 'exact' }
        )
        .is('deleted_at', null);

      if (params.q)
        query = query.or(`reference_id.ilike.%${params.q}%,provider_reference.ilike.%${params.q}%`);
      if (params.reference_id) query = query.ilike('reference_id', `%${params.reference_id}%`);
      if (params.user_id) query = query.eq('user_id', params.user_id);
      if (params.payment_method) query = query.eq('payment_method', params.payment_method);
      if (params.payment_status) query = query.eq('payment_status', params.payment_status);
      if (params.payment_type) query = query.eq('payment_type', params.payment_type);
      if (params.min_amount !== undefined) query = query.gte('amount', params.min_amount);
      if (params.max_amount !== undefined) query = query.lte('amount', params.max_amount);

      query = query.order(params.sort || 'created_at', { ascending: params.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`Transaction search failed: ${error.message}`);

      logger.info('Admin accessed transaction data (GET)', {
        admin_id: req.user?.id,
        filters: params,
        results_count: count,
      });

      res.json({
        success: true,
        data: { results: data || [], total: count || 0 },
        pagination: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
        },
        metadata: meta(requestId, Date.now() - startTime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: error.errors },
          metadata: meta(requestId, Date.now() - startTime),
        });
        return;
      }
      logger.error('Admin transaction search (GET) failed', error as Error);
      res.status(500).json({
        success: false,
        error: { code: 'TRANSACTION_SEARCH_ERROR', message: 'Transaction search failed' },
        metadata: meta(requestId, Date.now() - startTime),
      });
    }
  }
);

/**
 * @swagger
 * /search/admin/rides:
 *   get:
 *     summary: Search rides (GET)
 *     description: Search rides with query parameters (dashboard support)
 *     tags: [Admin Search]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/rides',
  authenticateUser,
  requireAdmin,
  rateLimitByUser(100, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    try {
      const params = RideSearchSchema.parse(req.query);
      const { offset, limit } = paginate(params.page, params.limit);

      const db = getDatabase();
      let query = db.supabase
        .from('rides')
        .select(
          'id, ride_number, passenger_id, driver_id, status, pickup_location, dropoff_location, final_amount, total_fare, distance_km, estimated_duration_minutes, rating, created_at, updated_at',
          { count: 'exact' }
        );
      // Note: rides table doesn't have deleted_at column

      if (params.passenger_id) query = query.eq('passenger_id', params.passenger_id);
      if (params.driver_id) query = query.eq('driver_id', params.driver_id);
      if (params.status) query = query.eq('status', params.status);
      if (params.min_fare !== undefined) query = query.gte('final_amount', params.min_fare);
      if (params.max_fare !== undefined) query = query.lte('final_amount', params.max_fare);

      query = query.order(params.sort || 'created_at', { ascending: params.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(`Ride search failed: ${error.message}`);

      res.json({
        success: true,
        data: { results: data || [], total: count || 0 },
        pagination: {
          page: params.page,
          limit: params.limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
        },
        metadata: meta(requestId, Date.now() - startTime),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: error.errors },
          metadata: meta(requestId, Date.now() - startTime),
        });
        return;
      }
      logger.error('Admin ride search (GET) failed', error as Error);
      res.status(500).json({
        success: false,
        error: { code: 'RIDE_SEARCH_ERROR', message: 'Ride search failed' },
        metadata: meta(requestId, Date.now() - startTime),
      });
    }
  }
);

export default router;
