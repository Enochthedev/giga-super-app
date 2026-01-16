import { createClient } from '@supabase/supabase-js';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import winston from 'winston';

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
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'admin-service',
    timestamp: new Date().toISOString(),
  });
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
  logger.info(`Admin Aggregation Service started`, { port: PORT });
});

export default app;
