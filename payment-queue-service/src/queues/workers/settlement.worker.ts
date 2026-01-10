import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../../config';
import logger from '../../utils/logger';
import { createClient } from '@supabase/supabase-js';

const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/**
 * Settlement worker to process settlement jobs
 */
export const settlementWorker = new Worker(
  'settlement-queue',
  async (job: Job) => {
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
      const totalCommission = transactions?.reduce((sum, tx) => sum + (tx.commission_amount || 0), 0) || 0;
      const netAmount = totalAmount - totalCommission;

      // Group by module
      const byModule: any = {};
      transactions?.forEach((tx) => {
        const mod = tx.module;
        if (!byModule[mod]) {
          byModule[mod] = { count: 0, amount: 0, commission: 0 };
        }
        byModule[mod].count++;
        byModule[mod].amount += tx.amount || 0;
        byModule[mod].commission += tx.commission_amount || 0;
      });

      // Create settlement record
      const { data: settlement, error: settleError } = await supabase
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
        totalTransactions: transactions?.length,
        totalAmount,
        netAmount,
      };
    } catch (error: any) {
      logger.error('Settlement processing failed', {
        jobId: job.id,
        settlementId,
        error: error.message,
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

settlementWorker.on('completed', (job) => {
  logger.info('Settlement job completed', {
    jobId: job.id,
    settlementId: job.data.settlementId,
  });
});

settlementWorker.on('failed', (job, err) => {
  logger.error('Settlement job failed', {
    jobId: job?.id,
    settlementId: job?.data?.settlementId,
    error: err.message,
  });
});

settlementWorker.on('error', (err) => {
  logger.error('Settlement worker error', { error: err.message });
});

logger.info('Settlement worker started');

export async function closeSettlementWorker() {
  await settlementWorker.close();
  logger.info('Settlement worker closed');
}
