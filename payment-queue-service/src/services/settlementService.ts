import { v4 as uuidv4 } from 'uuid';

import {
  SettlementReport,
  ModuleSettlement,
  StateSettlement,
  BranchSettlement,
} from '../types';
import supabase from '../utils/database';
import logger from '../utils/logger';

export const generateSettlementReport = async (period: {
  start: Date;
  end: Date;
}): Promise<SettlementReport> => {
  logger.info('Generating settlement report', { period });

  try {
    const reportId = `SETTLE-${Date.now()}-${uuidv4().substring(0, 8)}`;

    // Fetch all completed transactions in the period
    const { data: transactions, error } = await supabase
      .from('nipost_financial_ledger')
      .select('*')
      .eq('payment_status', 'completed')
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString());

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    // Calculate totals
    const totalTransactions = transactions?.length || 0;
    const totalRevenue = transactions?.reduce((sum, t) => sum + parseFloat(t.gross_amount), 0) || 0;
    const totalCommission = transactions?.reduce((sum, t) => sum + parseFloat(t.commission_amount), 0) || 0;
    const totalNetAmount = transactions?.reduce((sum, t) => sum + parseFloat(t.net_amount), 0) || 0;

    // Aggregate by module
    const byModule = {
      hotel: calculateModuleSettlement(transactions, 'hotel'),
      taxi: calculateModuleSettlement(transactions, 'taxi'),
      ecommerce: calculateModuleSettlement(transactions, 'ecommerce'),
    };

    // Aggregate by state
    const byState = calculateStateSettlements(transactions);

    const report: SettlementReport = {
      reportId,
      period,
      totalTransactions,
      totalRevenue,
      totalCommission,
      totalNetAmount,
      byModule,
      byState,
      generatedAt: new Date(),
    };

    // Save report to database (optional - create a settlements table if needed)
    logger.info('Settlement report generated', {
      reportId,
      totalTransactions,
      totalRevenue,
      totalCommission,
    });

    return report;
  } catch (error: any) {
    logger.error('Settlement report generation failed', {
      error: error.message,
      period,
    });

    throw error;
  }
};

// Calculate settlement for a specific module
const calculateModuleSettlement = (
  transactions: any[],
  module: string
): ModuleSettlement => {
  const moduleTransactions = transactions?.filter((t) => t.module === module) || [];

  return {
    transactions: moduleTransactions.length,
    revenue: moduleTransactions.reduce((sum, t) => sum + parseFloat(t.gross_amount), 0),
    commission: moduleTransactions.reduce((sum, t) => sum + parseFloat(t.commission_amount), 0),
    netAmount: moduleTransactions.reduce((sum, t) => sum + parseFloat(t.net_amount), 0),
  };
};

// Calculate settlements by state
const calculateStateSettlements = (
  transactions: any[]
): Record<string, StateSettlement> => {
  const stateMap: Record<string, StateSettlement> = {};

  transactions?.forEach((transaction) => {
    const stateId = transaction.state_id;
    const branchId = transaction.branch_id;

    // Initialize state if not exists
    if (!stateMap[stateId]) {
      stateMap[stateId] = {
        stateName: transaction.state_name,
        transactions: 0,
        revenue: 0,
        commission: 0,
        branches: {},
      };
    }

    // Update state totals
    stateMap[stateId].transactions += 1;
    stateMap[stateId].revenue += parseFloat(transaction.gross_amount);
    stateMap[stateId].commission += parseFloat(transaction.commission_amount);

    // Initialize branch if not exists
    if (!stateMap[stateId].branches[branchId]) {
      stateMap[stateId].branches[branchId] = {
        branchName: transaction.branch_name,
        transactions: 0,
        revenue: 0,
        commission: 0,
      };
    }

    // Update branch totals
    stateMap[stateId].branches[branchId].transactions += 1;
    stateMap[stateId].branches[branchId].revenue += parseFloat(transaction.gross_amount);
    stateMap[stateId].branches[branchId].commission += parseFloat(transaction.commission_amount);
  });

  return stateMap;
};

// Schedule daily settlement report generation
export const scheduleDailySettlement = async (): Promise<void> => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  logger.info('Scheduling daily settlement', {
    start: yesterday,
    end: endOfYesterday,
  });

  try {
    const report = await generateSettlementReport({
      start: yesterday,
      end: endOfYesterday,
    });

    // Store report or send to relevant stakeholders
    logger.info('Daily settlement completed', {
      reportId: report.reportId,
      totalTransactions: report.totalTransactions,
    });
  } catch (error: any) {
    logger.error('Daily settlement failed', { error: error.message });
  }
};

// Get settlement report by date range
export const getSettlementReport = async (
  startDate: Date,
  endDate: Date
): Promise<SettlementReport> => {
  return generateSettlementReport({ start: startDate, end: endDate });
};
