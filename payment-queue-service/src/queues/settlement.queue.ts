import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

// Redis connection
const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Queue options
const queueOptions: QueueOptions = {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: {
      count: 50,
      age: 90 * 24 * 3600, // 90 days
    },
    removeOnFail: {
      count: 100,
      age: 90 * 24 * 3600,
    },
  },
};

// Create settlement queue
export const settlementQueue = new Queue('settlement-queue', queueOptions);

settlementQueue.on('error', (error) => {
  logger.error('Settlement queue error', { error: error.message });
});

logger.info('Settlement queue initialized');

/**
 * Add settlement processing job
 */
export async function addSettlementJob(
  jobData: {
    settlementId: string;
    period: {
      start: string;
      end: string;
    };
    level: 'branch' | 'state' | 'national';
    entityId?: string;
    module?: string;
  }
) {
  try {
    const job = await settlementQueue.add(
      'process-settlement',
      jobData,
      {
        jobId: jobData.settlementId,
        priority: 5, // Lower priority - can run in background
      }
    );

    logger.info('Settlement job added to queue', {
      jobId: job.id,
      settlementId: jobData.settlementId,
      level: jobData.level,
      period: jobData.period,
    });

    return job;
  } catch (error: any) {
    logger.error('Failed to add settlement job to queue', {
      error: error.message,
      settlementId: jobData.settlementId,
    });
    throw error;
  }
}

/**
 * Add scheduled settlement job (daily/weekly/monthly)
 */
export async function addScheduledSettlement(
  schedule: 'daily' | 'weekly' | 'monthly',
  level: 'branch' | 'state' | 'national' = 'national'
) {
  try {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (schedule) {
      case 'daily':
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0);
        break;
      case 'weekly':
        end = new Date(now);
        end.setDate(end.getDate() - end.getDay() - 1); // Last day of previous week
        start = new Date(end);
        start.setDate(start.getDate() - 6); // First day of previous week
        break;
      case 'monthly':
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); // Last day of previous month
        start = new Date(end.getFullYear(), end.getMonth(), 1, 0, 0, 0); // First day of previous month
        break;
    }

    const settlementId = `settlement-${schedule}-${start.getTime()}-${level}`;

    return await addSettlementJob({
      settlementId,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      level,
    });
  } catch (error: any) {
    logger.error('Failed to add scheduled settlement', {
      error: error.message,
      schedule,
      level,
    });
    throw error;
  }
}

/**
 * Get settlement job status
 */
export async function getSettlementJobStatus(jobId: string) {
  try {
    const job = await settlementQueue.getJob(jobId);
    
    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      id: job.id,
      state,
      data: job.data,
      returnValue: job.returnvalue,
      failedReason: job.failedReason,
      progress: job.progress,
    };
  } catch (error: any) {
    logger.error('Failed to get settlement job status', {
      error: error.message,
      jobId,
    });
    return null;
  }
}

/**
 * Get settlement queue metrics
 */
export async function getSettlementQueueMetrics() {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      settlementQueue.getWaitingCount(),
      settlementQueue.getActiveCount(),
      settlementQueue.getCompletedCount(),
      settlementQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  } catch (error: any) {
    logger.error('Failed to get settlement queue metrics', { error: error.message });
    return null;
  }
}

export async function closeSettlementQueue() {
  try {
    await settlementQueue.close();
    logger.info('Settlement queue closed');
  } catch (error: any) {
    logger.error('Error closing settlement queue', { error: error.message });
  }
}
