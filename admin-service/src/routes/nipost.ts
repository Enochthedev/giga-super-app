import { Response, Router } from 'express';
import winston from 'winston';
import { createAudit } from '../middleware/audit';
import {
  AuthRequest,
  authenticate,
  requireAnyAccess,
  requireNationalAccess,
  requireStateOrHigher,
} from '../middleware/auth';
import { calculatePagination, getPaginationRange, supabase } from '../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

// ============================================
// NATIONAL LEVEL ENDPOINTS
// ============================================

/**
 * GET /api/admin/national/dashboard
 * Get national dashboard statistics
 */
router.get(
  '/national/dashboard',
  authenticate,
  requireNationalAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      // Get national summary using RPC function
      const { data, error } = await supabase.rpc('get_national_summary');

      if (error) throw error;

      await createAudit(req, 'view_dashboard', 'national_dashboard');

      res.json({ success: true, data });
    } catch (error: any) {
      logger.error('Failed to get national dashboard', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }
);

/**
 * GET /api/admin/national/financial-summary
 * Get national financial summary with optional date filtering
 */
router.get(
  '/national/financial-summary',
  authenticate,
  requireNationalAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      let query = supabase
        .from('nipost_financial_ledger')
        .select('*')
        .eq('payment_status', 'completed');

      if (startDate) query = query.gte('created_at', startDate as string);
      if (endDate) query = query.lte('created_at', endDate as string);

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

/**
 * GET /api/admin/national/states
 * Get list of all states
 */
router.get(
  '/national/states',
  authenticate,
  requireNationalAccess,
  async (req: AuthRequest, res: Response) => {
    try {
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
  }
);

// ============================================
// STATE LEVEL ENDPOINTS
// ============================================

/**
 * GET /api/admin/state/:stateId/dashboard
 * Get state dashboard statistics
 */
router.get(
  '/state/:stateId/dashboard',
  authenticate,
  requireStateOrHigher,
  async (req: AuthRequest, res: Response) => {
    try {
      const { stateId } = req.params;

      // Check access
      if (req.user!.accessLevel === 'state' && req.user!.stateId !== stateId) {
        return res.status(403).json({ error: 'Access denied to this state' });
      }

      // Get state summary using RPC function
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

/**
 * GET /api/admin/state/:stateId/branches
 * Get list of branches in a state
 */
router.get(
  '/state/:stateId/branches',
  authenticate,
  requireStateOrHigher,
  async (req: AuthRequest, res: Response) => {
    try {
      const { stateId } = req.params;

      if (req.user!.accessLevel === 'state' && req.user!.stateId !== stateId) {
        return res.status(403).json({ error: 'Access denied to this state' });
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

/**
 * GET /api/admin/state/:stateId/financial-summary
 * Get financial summary for a state
 */
router.get(
  '/state/:stateId/financial-summary',
  authenticate,
  requireStateOrHigher,
  async (req: AuthRequest, res: Response) => {
    try {
      const { stateId } = req.params;

      if (req.user!.accessLevel === 'state' && req.user!.stateId !== stateId) {
        return res.status(403).json({ error: 'Access denied to this state' });
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
// BRANCH LEVEL ENDPOINTS
// ============================================

/**
 * GET /api/admin/branch/:branchId/dashboard
 * Get branch dashboard statistics
 */
router.get(
  '/branch/:branchId/dashboard',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { branchId } = req.params;

      if (req.user!.accessLevel === 'branch' && req.user!.branchId !== branchId) {
        return res.status(403).json({ error: 'Access denied to this branch' });
      }

      // Get branch summary using RPC function
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

/**
 * GET /api/admin/branch/:branchId/transactions
 * Get paginated transactions for a branch
 */
router.get(
  '/branch/:branchId/transactions',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { branchId } = req.params;
      const { page = '1', limit = '20', module, status } = req.query;

      if (req.user!.accessLevel === 'branch' && req.user!.branchId !== branchId) {
        return res.status(403).json({ error: 'Access denied to this branch' });
      }

      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('nipost_financial_ledger')
        .select('*', { count: 'exact' })
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (module) query = query.eq('module', module as string);
      if (status) query = query.eq('payment_status', status as string);

      const { data: transactions, count, error } = await query;

      if (error) throw error;

      await createAudit(req, 'view_transactions', 'transaction_list', branchId);

      res.json({
        success: true,
        data: transactions,
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: any) {
      logger.error('Failed to get branch transactions', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }
);

/**
 * GET /api/admin/branch/:branchId/analytics
 * Get analytics for a branch by time period
 */
router.get(
  '/branch/:branchId/analytics',
  authenticate,
  requireAnyAccess,
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

export default router;
