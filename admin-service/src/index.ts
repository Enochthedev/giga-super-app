import { createClient } from '@supabase/supabase-js';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import swaggerUi from 'swagger-ui-express';
import winston from 'winston';

import { swaggerSpec } from './config/swagger';

dotenv.config();

// Configuration
const PORT = parseInt(process.env.PORT ?? process.env.ADMIN_SERVICE_PORT ?? '3005', 10);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api', limiter);

// Auth middleware - use extended Express.Request type
type AuthRequest = Request;

const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.sub || decoded.userId;

    // Get user permissions
    const { data: permissions, error } = await supabase
      .from('nipost_user_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !permissions) {
      return res.status(403).json({ error: 'No permissions found' });
    }

    req.user = {
      id: userId,
      email: '', // Email not available from permissions, set empty
      accessLevel: permissions.access_level,
      branchId: permissions.branch_id,
      stateId: permissions.state_id,
      role: permissions.role,
    };

    next();
  } catch (error: any) {
    logger.error('Authentication failed', { error: error.message });
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Audit middleware
const createAudit = async (
  req: AuthRequest,
  actionType: string,
  resourceType: string,
  resourceId?: string
) => {
  try {
    await supabase.from('nipost_admin_audit').insert({
      admin_id: req.user!.id,
      admin_name: 'Admin User', // Get from user table in production
      admin_role: req.user!.role,
      access_level: req.user!.accessLevel,
      branch_id: req.user!.branchId,
      state_id: req.user!.stateId,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      endpoint: req.path,
      method: req.method,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      success: true,
    });
  } catch (error: any) {
    logger.error('Failed to create audit', { error: error.message });
  }
};

// Health check
/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Service health check
 *     description: Check if the admin service is running and healthy
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 service:
 *                   type: string
 *                   example: admin-service
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'admin-service',
    timestamp: new Date().toISOString(),
    version: '2.1.2',
    deployment: 'railway-redeployment-v2.1.2',
  });
});

/**
 * @swagger
 * /api/status:
 *   get:
 *     tags: [Health]
 *     summary: Service status and endpoints
 *     description: Get service status and available GIGA Dashboard API endpoints
 *     responses:
 *       200:
 *         description: Service status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "running"
 *                 service:
 *                   type: string
 *                   example: "admin-service"
 *                 version:
 *                   type: string
 *                   example: "2.1.2"
 *                 gigaDashboardEndpoints:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["/api/dashboard/stats", "/api/ecommerce/traders"]
 */
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    service: 'admin-service',
    version: '2.1.2',
    timestamp: new Date().toISOString(),
    gigaDashboardEndpoints: [
      '/api/dashboard/stats',
      '/api/dashboard/sales-comparison',
      '/api/dashboard/category-breakdown',
      '/api/admin/categories',
      '/api/ecommerce/traders',
      '/api/taxi/drivers',
      '/api/hotel/hotels',
      '/api/media/content',
      '/api/postal-monitoring/staff',
      '/api/operations/staff',
      '/api/managers/dashboard-stats',
      '/api/managers/latest-orders',
      '/api/ads/incoming',
    ],
  });
});

// Swagger documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Admin Service API Docs',
  })
);

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ============================================
// NATIONAL LEVEL ENDPOINTS (National HQ)
// ============================================

// GET /api/admin/national/dashboard
app.get('/api/admin/national/dashboard', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.accessLevel !== 'national') {
      return res.status(403).json({ error: 'National access required' });
    }

    // Get national summary using helper function
    const { data, error } = await supabase.rpc('get_national_summary');

    if (error) throw error;

    await createAudit(req, 'view_dashboard', 'national_dashboard');

    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Failed to get national dashboard', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/admin/national/financial-summary
app.get(
  '/api/admin/national/financial-summary',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.accessLevel !== 'national') {
        return res.status(403).json({ error: 'National access required' });
      }

      const { startDate, endDate } = req.query;

      const query = supabase
        .from('nipost_financial_ledger')
        .select('*')
        .eq('payment_status', 'completed');

      if (startDate) query.gte('created_at', startDate);
      if (endDate) query.lte('created_at', endDate);

      const { data: transactions, error } = await query;

      if (error) throw error;

      const summary = {
        totalTransactions: transactions?.length || 0,
        totalRevenue: transactions?.reduce((sum, t) => sum + parseFloat(t.gross_amount), 0) || 0,
        totalCommission:
          transactions?.reduce((sum, t) => sum + parseFloat(t.commission_amount), 0) || 0,
        byModule: {
          hotel:
            transactions
              ?.filter(t => t.module === 'hotel')
              .reduce((sum, t) => sum + parseFloat(t.commission_amount), 0) || 0,
          taxi:
            transactions
              ?.filter(t => t.module === 'taxi')
              .reduce((sum, t) => sum + parseFloat(t.commission_amount), 0) || 0,
          ecommerce:
            transactions
              ?.filter(t => t.module === 'ecommerce')
              .reduce((sum, t) => sum + parseFloat(t.commission_amount), 0) || 0,
        },
      };

      await createAudit(req, 'view_financial_summary', 'financial_report');

      res.json({ success: true, data: summary });
    } catch (error: any) {
      logger.error('Failed to get financial summary', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch financial summary' });
    }
  }
);

// GET /api/admin/national/states
app.get('/api/admin/national/states', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.accessLevel !== 'national') {
      return res.status(403).json({ error: 'National access required' });
    }

    const { data, error } = await supabase
      .from('nipost_user_permissions')
      .select('state_id, state_name')
      .not('state_id', 'is', null)
      .order('state_name');

    if (error) throw error;

    // Get unique states
    const states = Array.from(new Map(data.map(s => [s.state_id, s])).values());

    await createAudit(req, 'view_states', 'state_list');

    res.json({ success: true, data: states });
  } catch (error: any) {
    logger.error('Failed to get states', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

// ============================================
// STATE LEVEL ENDPOINTS (State Centers)
// ============================================

// GET /api/admin/state/:stateId/dashboard
app.get(
  '/api/admin/state/:stateId/dashboard',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { stateId } = req.params;

      // Check access
      if (
        req.user!.accessLevel === 'branch' ||
        (req.user!.accessLevel === 'state' && req.user!.stateId !== stateId)
      ) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Get state summary using helper function
      const { data, error } = await supabase.rpc('get_state_summary', { p_state_id: stateId });

      if (error) throw error;

      await createAudit(req, 'view_dashboard', 'state_dashboard', stateId);

      res.json({ success: true, data });
    } catch (error: any) {
      logger.error('Failed to get state dashboard', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }
);

// GET /api/admin/state/:stateId/branches
app.get(
  '/api/admin/state/:stateId/branches',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { stateId } = req.params;

      if (
        req.user!.accessLevel === 'branch' ||
        (req.user!.accessLevel === 'state' && req.user!.stateId !== stateId)
      ) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { data, error } = await supabase
        .from('nipost_user_permissions')
        .select('branch_id, branch_name')
        .eq('state_id', stateId)
        .not('branch_id', 'is', null)
        .order('branch_name');

      if (error) throw error;

      const branches = Array.from(new Map(data.map(b => [b.branch_id, b])).values());

      await createAudit(req, 'view_branches', 'branch_list', stateId);

      res.json({ success: true, data: branches });
    } catch (error: any) {
      logger.error('Failed to get branches', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch branches' });
    }
  }
);

// GET /api/admin/state/:stateId/financial-summary
app.get(
  '/api/admin/state/:stateId/financial-summary',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { stateId } = req.params;

      if (
        req.user!.accessLevel === 'branch' ||
        (req.user!.accessLevel === 'state' && req.user!.stateId !== stateId)
      ) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { data: transactions, error } = await supabase
        .from('nipost_financial_ledger')
        .select('*')
        .eq('state_id', stateId)
        .eq('payment_status', 'completed');

      if (error) throw error;

      const summary = {
        totalTransactions: transactions?.length || 0,
        totalRevenue: transactions?.reduce((sum, t) => sum + parseFloat(t.gross_amount), 0) || 0,
        totalCommission:
          transactions?.reduce((sum, t) => sum + parseFloat(t.commission_amount), 0) || 0,
      };

      await createAudit(req, 'view_financial_summary', 'state_financial_report', stateId);

      res.json({ success: true, data: summary });
    } catch (error: any) {
      logger.error('Failed to get state financial summary', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch financial summary' });
    }
  }
);

// ============================================
// BRANCH LEVEL ENDPOINTS (Local Branches)
// ============================================

// GET /api/admin/branch/:branchId/dashboard
app.get(
  '/api/admin/branch/:branchId/dashboard',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { branchId } = req.params;

      if (req.user!.accessLevel === 'branch' && req.user!.branchId !== branchId) {
        return res.status(403).json({ error: 'Access denied to this branch' });
      }

      // Get branch summary using helper function
      const { data, error } = await supabase.rpc('get_branch_summary', { p_branch_id: branchId });

      if (error) throw error;

      await createAudit(req, 'view_dashboard', 'branch_dashboard', branchId);

      res.json({ success: true, data });
    } catch (error: any) {
      logger.error('Failed to get branch dashboard', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }
);

// GET /api/admin/branch/:branchId/transactions
app.get(
  '/api/admin/branch/:branchId/transactions',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { branchId } = req.params;
      const { page = 1, limit = 20, module, status } = req.query;

      if (req.user!.accessLevel === 'branch' && req.user!.branchId !== branchId) {
        return res.status(403).json({ error: 'Access denied to this branch' });
      }

      let query = supabase
        .from('nipost_financial_ledger')
        .select('*', { count: 'exact' })
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .range((+page - 1) * +limit, +page * +limit - 1);

      if (module) query = query.eq('module', module);
      if (status) query = query.eq('payment_status', status);

      const { data: transactions, count, error } = await query;

      if (error) throw error;

      await createAudit(req, 'view_transactions', 'transaction_list', branchId);

      res.json({
        success: true,
        data: transactions,
        pagination: {
          page: +page,
          limit: +limit,
          total: count,
          pages: Math.ceil((count || 0) / +limit),
        },
      });
    } catch (error: any) {
      logger.error('Failed to get branch transactions', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }
);

// GET /api/admin/branch/:branchId/analytics
app.get(
  '/api/admin/branch/:branchId/analytics',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { branchId } = req.params;
      const { period = 'week' } = req.query;

      if (req.user!.accessLevel === 'branch' && req.user!.branchId !== branchId) {
        return res.status(403).json({ error: 'Access denied to this branch' });
      }

      const now = new Date();
      const startDate = new Date();

      if (period === 'day') {
        startDate.setDate(now.getDate() - 1);
      } else if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      }

      const { data: transactions, error } = await supabase
        .from('nipost_financial_ledger')
        .select('*')
        .eq('branch_id', branchId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const analytics = {
        period,
        transactions: transactions?.length || 0,
        revenue: transactions?.reduce((sum, t) => sum + parseFloat(t.gross_amount), 0) || 0,
        commission: transactions?.reduce((sum, t) => sum + parseFloat(t.commission_amount), 0) || 0,
        byModule: {
          hotel: {
            count: transactions?.filter(t => t.module === 'hotel').length || 0,
            revenue:
              transactions
                ?.filter(t => t.module === 'hotel')
                .reduce((sum, t) => sum + parseFloat(t.gross_amount), 0) || 0,
          },
          taxi: {
            count: transactions?.filter(t => t.module === 'taxi').length || 0,
            revenue:
              transactions
                ?.filter(t => t.module === 'taxi')
                .reduce((sum, t) => sum + parseFloat(t.gross_amount), 0) || 0,
          },
          ecommerce: {
            count: transactions?.filter(t => t.module === 'ecommerce').length || 0,
            revenue:
              transactions
                ?.filter(t => t.module === 'ecommerce')
                .reduce((sum, t) => sum + parseFloat(t.gross_amount), 0) || 0,
          },
        },
      };

      await createAudit(req, 'view_analytics', 'branch_analytics', branchId);

      res.json({ success: true, data: analytics });
    } catch (error: any) {
      logger.error('Failed to get branch analytics', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }
);

// ============================================
// GIGA DASHBOARD API ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get main dashboard statistics
 *     description: Retrieve comprehensive dashboard statistics including revenue, orders, visitors, and conversion rates
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics (defaults to 30 days ago)
 *         example: "2026-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics (defaults to today)
 *         example: "2026-01-29"
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DashboardStats'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// GET /api/dashboard/stats - Main dashboard statistics
app.get('/api/dashboard/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const { data, error } = await supabase.rpc('get_giga_dashboard_stats', {
      start_date: startDate || null,
      end_date: endDate || null,
    });

    if (error) throw error;

    await createAudit(req, 'view_dashboard_stats', 'giga_dashboard');

    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Failed to get dashboard stats', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

/**
 * @swagger
 * /api/dashboard/sales-comparison:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get sales comparison data
 *     description: Compare sales between current and previous periods with percentage change
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for current period
 *         example: "2026-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for current period
 *         example: "2026-01-29"
 *     responses:
 *       200:
 *         description: Sales comparison data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SalesComparison'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/dashboard/sales-comparison - Sales comparison data
app.get(
  '/api/dashboard/sales-comparison',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      const { data, error } = await supabase.rpc('get_sales_comparison', {
        current_period_start: startDate || null,
        current_period_end: endDate || null,
      });

      if (error) throw error;

      await createAudit(req, 'view_sales_comparison', 'sales_analytics');

      res.json({ success: true, data });
    } catch (error: any) {
      logger.error('Failed to get sales comparison', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch sales comparison' });
    }
  }
);

/**
 * @swagger
 * /api/dashboard/category-breakdown:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get category breakdown
 *     description: Get revenue and metrics breakdown by business category (ecommerce, hotel, taxi, media)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Category breakdown retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/CategoryBreakdown'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/dashboard/category-breakdown - Category breakdown
app.get(
  '/api/dashboard/category-breakdown',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { data, error } = await supabase.rpc('get_category_breakdown');

      if (error) throw error;

      await createAudit(req, 'view_category_breakdown', 'category_analytics');

      res.json({ success: true, data });
    } catch (error: any) {
      logger.error('Failed to get category breakdown', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch category breakdown' });
    }
  }
);

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     tags: [Admin Panel]
 *     summary: Get business categories
 *     description: Retrieve list of available business categories for the platform
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Business categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BusinessCategory'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/admin/categories - Business categories
app.get('/api/admin/categories', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase.rpc('get_business_categories');

    if (error) throw error;

    await createAudit(req, 'view_business_categories', 'admin_categories');

    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Failed to get business categories', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch business categories' });
  }
});

// ============================================
// BUSINESS MODULE ENDPOINTS
// ============================================

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
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by business name
 *         example: "electronics"
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
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         traders:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Trader'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// GET /api/ecommerce/traders - E-commerce traders
app.get('/api/ecommerce/traders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('ecommerce_vendors')
      .select(
        `
        id,
        business_name,
        business_description,
        total_sales,
        total_orders,
        average_rating,
        is_verified,
        is_active,
        created_at,
        user_profiles!inner(first_name, last_name, email, avatar_url)
      `,
        { count: 'exact' }
      )
      .range(offset, offset + Number(limit) - 1)
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
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get traders', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch traders' });
  }
});

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
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by license number or driver name
 *         example: "john"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by driver status
 *     responses:
 *       200:
 *         description: Drivers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         drivers:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Driver'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// GET /api/taxi/drivers - Taxi drivers
app.get('/api/taxi/drivers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('driver_profiles')
      .select(
        `
        id,
        license_number,
        vehicle_type,
        vehicle_model,
        vehicle_year,
        is_verified,
        is_active,
        rating,
        total_trips,
        total_earnings,
        created_at,
        user_profiles!inner(first_name, last_name, email, phone, avatar_url)
      `,
        { count: 'exact' }
      )
      .range(offset, offset + Number(limit) - 1)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `license_number.ilike.%${search}%,user_profiles.first_name.ilike.%${search}%,user_profiles.last_name.ilike.%${search}%`
      );
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    const { data: drivers, count, error } = await query;

    if (error) throw error;

    await createAudit(req, 'view_drivers', 'taxi_drivers');

    res.json({
      success: true,
      data: { drivers },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get drivers', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

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
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by hotel name, city, or state
 *         example: "luxury"
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
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         hotels:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Hotel'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// GET /api/hotel/hotels - Hotels
app.get('/api/hotel/hotels', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('hotels')
      .select(
        `
        id,
        name,
        description,
        address,
        city,
        state,
        rating,
        total_rooms,
        available_rooms,
        is_verified,
        is_active,
        created_at,
        user_profiles!inner(first_name, last_name, email, phone)
      `,
        { count: 'exact' }
      )
      .range(offset, offset + Number(limit) - 1)
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
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get hotels', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

/**
 * @swagger
 * /api/media/content:
 *   get:
 *     tags: [Business Modules]
 *     summary: Get media content
 *     description: Retrieve paginated list of media files and content
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, document, audio]
 *         description: Filter by media type
 *     responses:
 *       200:
 *         description: Media content retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         content:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/MediaContent'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// GET /api/media/content - Media content
app.get('/api/media/content', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('file_metadata')
      .select(
        `
        id,
        filename,
        file_type,
        file_size,
        mime_type,
        storage_path,
        is_public,
        created_at,
        user_profiles!inner(first_name, last_name, email)
      `,
        { count: 'exact' }
      )
      .range(offset, offset + Number(limit) - 1)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('file_type', type);
    }

    const { data: content, count, error } = await query;

    if (error) throw error;

    await createAudit(req, 'view_media_content', 'media_files');

    res.json({
      success: true,
      data: { content },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get media content', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch media content' });
  }
});

// ============================================
// POSTAL MONITORING ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/postal-monitoring/staff:
 *   get:
 *     tags: [Postal Monitoring]
 *     summary: Get postal staff
 *     description: Retrieve paginated list of postal service staff with search and filtering
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by staff name or ID
 *         example: "john"
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter by region
 *         example: "north"
 *       - in: query
 *         name: office
 *         schema:
 *           type: string
 *         description: Filter by office location
 *         example: "lagos"
 *     responses:
 *       200:
 *         description: Postal staff retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         staff:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/PostalStaff'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// GET /api/postal-monitoring/staff - Postal staff
app.get('/api/postal-monitoring/staff', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search, region, office } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('nipost_officials')
      .select(
        `
        id,
        staff_id,
        first_name,
        last_name,
        email,
        phone,
        position,
        department,
        office_location,
        region,
        is_active,
        created_at
      `,
        { count: 'exact' }
      )
      .range(offset, offset + Number(limit) - 1)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,staff_id.ilike.%${search}%`
      );
    }

    if (region) {
      query = query.eq('region', region);
    }

    if (office) {
      query = query.eq('office_location', office);
    }

    const { data: staff, count, error } = await query;

    if (error) throw error;

    await createAudit(req, 'view_postal_staff', 'postal_monitoring');

    res.json({
      success: true,
      data: { staff },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get postal staff', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch postal staff' });
  }
});

/**
 * @swagger
 * /api/operations/staff:
 *   get:
 *     tags: [Postal Monitoring]
 *     summary: Get operations staff
 *     description: Alias for postal monitoring staff - retrieve paginated list of operations staff
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by staff name or ID
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter by region
 *       - in: query
 *         name: office
 *         schema:
 *           type: string
 *         description: Filter by office location
 *     responses:
 *       200:
 *         description: Operations staff retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         staff:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/PostalStaff'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// GET /api/operations/staff - Operations staff (alias for postal staff)
app.get('/api/operations/staff', authenticate, async (req: AuthRequest, res: Response) => {
  // Redirect to postal monitoring staff endpoint
  req.url = '/api/postal-monitoring/staff';
  return app._router.handle(req, res);
});

// ============================================
// POST OFFICE MANAGER ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/managers/dashboard-stats:
 *   get:
 *     tags: [Manager Operations]
 *     summary: Get manager dashboard statistics
 *     description: Retrieve dashboard statistics for post office managers (branch/state level)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Manager dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ManagerDashboardStats'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// GET /api/managers/dashboard-stats - Manager dashboard
app.get('/api/managers/dashboard-stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Managers can only see their branch/region data
    const { branchId } = req.user!;
    const { stateId } = req.user!;

    if (!branchId && !stateId) {
      return res.status(403).json({ error: 'Manager access requires branch or state assignment' });
    }

    let query = supabase
      .from('nipost_financial_ledger')
      .select('*')
      .eq('payment_status', 'completed');

    if (branchId) {
      query = query.eq('branch_id', branchId);
    } else if (stateId) {
      query = query.eq('state_id', stateId);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    const stats = {
      totalRevenue: transactions?.reduce((sum, t) => sum + parseFloat(t.gross_amount), 0) || 0,
      totalOrders: transactions?.length || 0,
      avgOrderValue: transactions?.length
        ? transactions.reduce((sum, t) => sum + parseFloat(t.gross_amount), 0) / transactions.length
        : 0,
      recentActivity: transactions?.slice(0, 10) || [],
    };

    await createAudit(req, 'view_manager_dashboard', 'manager_stats');

    res.json({ success: true, data: stats });
  } catch (error: any) {
    logger.error('Failed to get manager dashboard stats', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch manager dashboard stats' });
  }
});

/**
 * @swagger
 * /api/managers/latest-orders:
 *   get:
 *     tags: [Manager Operations]
 *     summary: Get latest orders
 *     description: Retrieve the most recent orders for manager review
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of orders to retrieve
 *     responses:
 *       200:
 *         description: Latest orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         orders:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Order'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// GET /api/managers/latest-orders - Latest orders
app.get('/api/managers/latest-orders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const { data: orders, error } = await supabase
      .from('ecommerce_orders')
      .select(
        `
        id,
        order_number,
        total_amount,
        status,
        created_at,
        user_profiles!inner(first_name, last_name, email)
      `
      )
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    await createAudit(req, 'view_latest_orders', 'manager_orders');

    res.json({ success: true, data: { orders } });
  } catch (error: any) {
    logger.error('Failed to get latest orders', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch latest orders' });
  }
});

/**
 * @swagger
 * /api/managers/orders/{id}:
 *   put:
 *     tags: [Manager Operations]
 *     summary: Update order
 *     description: Update order status and add notes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, shipped, delivered, cancelled]
 *                 description: New order status
 *                 example: "processing"
 *               notes:
 *                 type: string
 *                 description: Manager notes
 *                 example: "Order approved for processing"
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Order updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         order:
 *                           $ref: '#/components/schemas/Order'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// PUT /api/managers/orders/:id - Update order
app.put('/api/managers/orders/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const { data: order, error } = await supabase
      .from('ecommerce_orders')
      .update({
        status,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await createAudit(req, 'update_order', 'order_management', id);

    res.json({ success: true, data: { order } });
  } catch (error: any) {
    logger.error('Failed to update order', { error: error.message });
    res.status(500).json({ error: 'Failed to update order' });
  }
});

/**
 * @swagger
 * /api/managers/orders/{id}:
 *   delete:
 *     tags: [Manager Operations]
 *     summary: Delete order
 *     description: Soft delete an order (marks as deleted but preserves data)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Order deleted successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// DELETE /api/managers/orders/:id - Delete order
app.delete('/api/managers/orders/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Soft delete the order
    const { error } = await supabase
      .from('ecommerce_orders')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: req.user!.id,
        deletion_reason: 'manager_deletion',
      })
      .eq('id', id);

    if (error) throw error;

    await createAudit(req, 'delete_order', 'order_management', id);

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error: any) {
    logger.error('Failed to delete order', { error: error.message });
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// ============================================
// ADVERTISEMENT MANAGEMENT ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/ads/incoming:
 *   get:
 *     tags: [Advertisement Management]
 *     summary: Get incoming ads for review
 *     description: Retrieve paginated list of advertisement campaigns pending review
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           default: pending
 *         description: Filter by ad status
 *     responses:
 *       200:
 *         description: Incoming ads retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         ads:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AdCampaign'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// GET /api/ads/incoming - Incoming ads for review
app.get('/api/ads/incoming', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const {
      data: ads,
      count,
      error,
    } = await supabase
      .from('ad_campaigns')
      .select(
        `
        id,
        campaign_name,
        campaign_type,
        budget,
        start_date,
        end_date,
        status,
        created_at,
        advertiser_profiles!inner(business_name, contact_email, contact_phone)
      `,
        { count: 'exact' }
      )
      .eq('status', status)
      .range(offset, offset + Number(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    await createAudit(req, 'view_incoming_ads', 'ad_management');

    res.json({
      success: true,
      data: { ads },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get incoming ads', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch incoming ads' });
  }
});

/**
 * @swagger
 * /api/ads/{id}/status:
 *   put:
 *     tags: [Advertisement Management]
 *     summary: Update ad status
 *     description: Approve, reject, or change status of an advertisement campaign
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Advertisement campaign ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, pending]
 *                 description: New ad status
 *                 example: "approved"
 *               review_notes:
 *                 type: string
 *                 description: Review notes or feedback
 *                 example: "Ad content approved for publication"
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Ad status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         ad:
 *                           $ref: '#/components/schemas/AdCampaign'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// PUT /api/ads/:id/status - Update ad status
app.put('/api/ads/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res
        .status(400)
        .json({ error: 'Invalid status. Must be approved, rejected, or pending' });
    }

    const { data: ad, error } = await supabase
      .from('ad_campaigns')
      .update({
        status,
        review_notes,
        reviewed_by: req.user!.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await createAudit(req, 'update_ad_status', 'ad_management', id);

    res.json({ success: true, data: { ad } });
  } catch (error: any) {
    logger.error('Failed to update ad status', { error: error.message });
    res.status(500).json({ error: 'Failed to update ad status' });
  }
});

// ============================================
// AUDIT ENDPOINTS
// ============================================

// GET /api/admin/audit-trail
app.get('/api/admin/audit-trail', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, actionType, startDate, endDate } = req.query;

    let query = supabase
      .from('nipost_admin_audit')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((+page - 1) * +limit, +page * +limit - 1);

    // Apply RLS - users will only see audits they have access to
    if (req.user!.accessLevel === 'branch') {
      query = query.eq('branch_id', req.user!.branchId!);
    } else if (req.user!.accessLevel === 'state') {
      query = query.eq('state_id', req.user!.stateId!);
    }

    if (actionType) query = query.eq('action_type', actionType);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data: audits, count, error } = await query;

    if (error) throw error;

    await createAudit(req, 'view_audit_trail', 'audit_log');

    res.json({
      success: true,
      data: audits,
      pagination: {
        page: +page,
        limit: +limit,
        total: count,
        pages: Math.ceil((count || 0) / +limit),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get audit trail', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 GIGA Dashboard & Admin Service v2.1.2 started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: '2.1.2',
    deployment: 'railway-redeployment-v2.1.2-swagger-fix',
    gigaDashboardAPI: 'enabled',
    endpoints: 15,
    features: ['dashboard-stats', 'business-modules', 'postal-monitoring', 'ad-management'],
    timestamp: new Date().toISOString(),
  });
});

export default app;
