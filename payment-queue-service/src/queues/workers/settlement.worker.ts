import { createClient } from '@supabase/supabase-js';
import { Job } from 'bullmq';

import { config } from '../../config';
import logger from '../../utils/logger';

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/**
 * Settlement processor function - handles settlement job processing
 * This is registered with WorkerManager and called when jobs arrive
 */
export async function settlementProcessor(job: Job): Promise<{
  success: boolean;
  settlementId: string;
  totalTransactions: number;
  totalAmount: number;
  netAmount: number;
}> {
  const { settlementId, period, level, entityId, module } = job.data;

  logger.info('Processing settlement job', {
    jobId: job.id,
    settlementId,
    level,
    period,
  });

  try {
    // Build query based on level and filters
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('status', 'completed')
      .gte('created_at', period.start)
      .lte('created_at', period.end);

    if (level === 'branch' && entityId) {
      query = query.eq('branch_id', entityId);
    } else if (level === 'state' && entityId) {
      query = query.eq('state_id', entityId);
    }

    if (module) {
      query = query.eq('module', module);
    }

    const { data: transactions, error: txError } = await query;

    if (txError) {
      throw new Error(`Failed to fetch transactions: ${txError.message}`);
    }

    // Calculate settlement totals
    const totalAmount = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    const totalCommission =
      transactions?.reduce((sum, tx) => sum + (tx.commission_amount || 0), 0) || 0;
    const netAmount = totalAmount - totalCommission;

    // Group by module
    const byModule: Record<string, { count: number; amount: number; commission: number }> = {};
    transactions?.forEach(tx => {
      const mod = tx.module as string;
      if (!byModule[mod]) {
        byModule[mod] = { count: 0, amount: 0, commission: 0 };
      }
      byModule[mod].count++;
      byModule[mod].amount += tx.amount || 0;
      byModule[mod].commission += tx.commission_amount || 0;
    });

    // Create settlement record
    const { error: settleError } = await supabase
      .from('settlements')
      .insert({
        id: settlementId,
        level,
        entity_id: entityId,
        period_start: period.start,
        period_end: period.end,
        total_transactions: transactions?.length || 0,
        total_amount: totalAmount,
        total_commission: totalCommission,
        net_amount: netAmount,
        breakdown_by_module: byModule,
        status: 'completed',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (settleError) {
      throw new Error(`Failed to create settlement: ${settleError.message}`);
    }

    logger.info('Settlement processed successfully', {
      jobId: job.id,
      settlementId,
      totalTransactions: transactions?.length,
      totalAmount,
    });

    return {
      success: true,
      settlementId,
      totalTransactions: transactions?.length || 0,
      totalAmount,
      netAmount,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Settlement processing failed', {
      jobId: job.id,
      settlementId,
      error: errorMessage,
    });
    throw error;
  }
}
