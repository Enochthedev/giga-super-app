import { Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import logger from '../utils/logger';
import { BadRequestError } from '../utils/errors';
import { Validator } from '../utils/validator';
import { AuthenticatedRequest } from '../middleware/rbac.middleware';

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/**
 * GET /api/v1/admin/payments/branch
 * Get branch-level payment reporting
 */
export async function getBranchReport(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      branchId,
      startDate,
      endDate,
      module,
      page = 1,
      limit = 20,
    } = req.query;

    // Validate pagination
    const pagination = Validator.validatePagination(
      Number(page),
      Number(limit)
    );

    // Build query
    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('status', 'completed');

    // Apply branch filter (enforced by RBAC middleware for branch admins)
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    // Apply date filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply module filter
    if (module) {
      query = query.eq('module', module);
    }

    // Apply pagination
    const offset = (pagination.page - 1) * pagination.limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pagination.limit - 1);

    const { data: transactions, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    // Calculate aggregates
    const totalAmount = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    const totalCommission = transactions?.reduce((sum, tx) => sum + (tx.commission_amount || 0), 0) || 0;
    const netAmount = totalAmount - totalCommission;

    // Group by module
    const byModule: any = {};
    transactions?.forEach((tx) => {
      const mod = tx.module;
      if (!byModule[mod]) {
        byModule[mod] = {
          count: 0,
          totalAmount: 0,
          totalCommission: 0,
          netAmount: 0,
        };
      }
      byModule[mod].count++;
      byModule[mod].totalAmount += tx.amount || 0;
      byModule[mod].totalCommission += tx.commission_amount || 0;
      byModule[mod].netAmount += tx.net_amount || 0;
    });

    logger.info('Branch report generated', {
      branchId,
      totalTransactions: count,
      totalAmount,
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalTransactions: count || 0,
          totalAmount,
          totalCommission,
          netAmount,
          byModule,
        },
        transactions,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pagination.limit),
        },
        filters: {
          branchId,
          startDate,
          endDate,
          module,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to generate branch report', {
      error: error.message,
      query: req.query,
    });
    throw error;
  }
}

/**
 * GET /api/v1/admin/payments/state
 * Get state-level payment reporting
 */
export async function getStateReport(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      stateId,
      startDate,
      endDate,
      module,
      page = 1,
      limit = 20,
    } = req.query;

    // Validate pagination
    const pagination = Validator.validatePagination(
      Number(page),
      Number(limit)
    );

    // Build query
    let query = supabase
      .from('transactions')
      .select('*, branches!inner(name, state_id)', { count: 'exact' })
      .eq('status', 'completed');

    // Apply state filter (enforced by RBAC middleware for state admins)
    if (stateId) {
      query = query.eq('state_id', stateId);
    }

    // Apply date filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply module filter
    if (module) {
      query = query.eq('module', module);
    }

    // Apply pagination
    const offset = (pagination.page - 1) * pagination.limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pagination.limit - 1);

    const { data: transactions, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    // Calculate aggregates
    const totalAmount = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    const totalCommission = transactions?.reduce((sum, tx) => sum + (tx.commission_amount || 0), 0) || 0;
    const netAmount = totalAmount - totalCommission;

    // Group by branch
    const byBranch: any = {};
    transactions?.forEach((tx) => {
      const branchId = tx.branch_id;
      if (!byBranch[branchId]) {
        byBranch[branchId] = {
          branchId,
          count: 0,
          totalAmount: 0,
          totalCommission: 0,
          netAmount: 0,
        };
      }
      byBranch[branchId].count++;
      byBranch[branchId].totalAmount += tx.amount || 0;
      byBranch[branchId].totalCommission += tx.commission_amount || 0;
      byBranch[branchId].netAmount += tx.net_amount || 0;
    });

    // Group by module
    const byModule: any = {};
    transactions?.forEach((tx) => {
      const mod = tx.module;
      if (!byModule[mod]) {
        byModule[mod] = {
          count: 0,
          totalAmount: 0,
          totalCommission: 0,
          netAmount: 0,
        };
      }
      byModule[mod].count++;
      byModule[mod].totalAmount += tx.amount || 0;
      byModule[mod].totalCommission += tx.commission_amount || 0;
      byModule[mod].netAmount += tx.net_amount || 0;
    });

    logger.info('State report generated', {
      stateId,
      totalTransactions: count,
      totalAmount,
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalTransactions: count || 0,
          totalAmount,
          totalCommission,
          netAmount,
          byBranch: Object.values(byBranch),
          byModule,
        },
        transactions,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pagination.limit),
        },
        filters: {
          stateId,
          startDate,
          endDate,
          module,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to generate state report', {
      error: error.message,
      query: req.query,
    });
    throw error;
  }
}

/**
 * GET /api/v1/admin/payments/national
 * Get national-level payment reporting
 */
export async function getNationalReport(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      startDate,
      endDate,
      module,
      page = 1,
      limit = 20,
    } = req.query;

    // Validate pagination
    const pagination = Validator.validatePagination(
      Number(page),
      Number(limit)
    );

    // Build query
    let query = supabase
      .from('transactions')
      .select('*, states!inner(name)', { count: 'exact' })
      .eq('status', 'completed');

    // Apply date filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply module filter
    if (module) {
      query = query.eq('module', module);
    }

    // Apply pagination
    const offset = (pagination.page - 1) * pagination.limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pagination.limit - 1);

    const { data: transactions, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    // Calculate aggregates
    const totalAmount = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    const totalCommission = transactions?.reduce((sum, tx) => sum + (tx.commission_amount || 0), 0) || 0;
    const netAmount = totalAmount - totalCommission;

    // Group by state
    const byState: any = {};
    transactions?.forEach((tx) => {
      const stateId = tx.state_id;
      if (!byState[stateId]) {
        byState[stateId] = {
          stateId,
          count: 0,
          totalAmount: 0,
          totalCommission: 0,
          netAmount: 0,
        };
      }
      byState[stateId].count++;
      byState[stateId].totalAmount += tx.amount || 0;
      byState[stateId].totalCommission += tx.commission_amount || 0;
      byState[stateId].netAmount += tx.net_amount || 0;
    });

    // Group by module
    const byModule: any = {};
    transactions?.forEach((tx) => {
      const mod = tx.module;
      if (!byModule[mod]) {
        byModule[mod] = {
          count: 0,
          totalAmount: 0,
          totalCommission: 0,
          netAmount: 0,
        };
      }
      byModule[mod].count++;
      byModule[mod].totalAmount += tx.amount || 0;
      byModule[mod].totalCommission += tx.commission_amount || 0;
      byModule[mod].netAmount += tx.net_amount || 0;
    });

    logger.info('National report generated', {
      totalTransactions: count,
      totalAmount,
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalTransactions: count || 0,
          totalAmount,
          totalCommission,
          netAmount,
          byState: Object.values(byState),
          byModule,
        },
        transactions,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pagination.limit),
        },
        filters: {
          startDate,
          endDate,
          module,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to generate national report', {
      error: error.message,
      query: req.query,
    });
    throw error;
  }
}
