import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import IORedis from 'ioredis';

import { config } from '@/config';
import { processPayment } from '@/services/paymentProcessor';
import { PaymentRequest, PaymentResponse } from '@/types';
import logger from '@/utils/logger';

// Redis connection
const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Payment Queue
export const paymentQueue = new Queue<PaymentRequest>('payment-processing', {
  connection,
  defaultJobOptions: {
    attempts: config.queue.maxRetries,
    backoff: {
      type: 'exponential',
      delay: config.queue.backoffDelay,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 86400, // 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for analysis
    },
  },
});

// Dead Letter Queue for permanently failed payments
export const deadLetterQueue = new Queue<PaymentRequest>('payment-dead-letter', {
  connection,
});

// Refund Queue
export const refundQueue = new Queue('payment-refunds', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

// Settlement Queue
export const settlementQueue = new Queue('payment-settlements', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 60000, // 1 minute
    },
  },
});

// Payment Worker
export const paymentWorker = new Worker<PaymentRequest, PaymentResponse>(
  'payment-processing',
  async (job: Job<PaymentRequest>) => {
    const { data } = job;
    
    logger.info('Processing payment job', {
      jobId: job.id,
      paymentId: data.id,
      module: data.module,
      amount: data.amount,
      attempt: job.attemptsMade + 1,
    });

    try {
      // Process payment
      const result = await processPayment(data);
      
      logger.info('Payment processed successfully', {
        jobId: job.id,
        paymentId: data.id,
        transactionId: result.transactionId,
        status: result.status,
      });

      return result;
    } catch (error: any) {
      logger.error('Payment processing failed', {
        jobId: job.id,
        paymentId: data.id,
        error: error.message,
        attempt: job.attemptsMade + 1,
      });

      // If max retries reached, move to dead letter queue
      if (job.attemptsMade >= config.queue.maxRetries - 1) {
        await deadLetterQueue.add('failed-payment', data, {
          priority: 1,
        });
        
        logger.warn('Payment moved to dead letter queue', {
          jobId: job.id,
          paymentId: data.id,
        });
      }

      throw error;
    }
  },
  {
    connection,
    concurrency: 10, // Process 10 payments concurrently
    limiter: {
      max: 100,
      duration: 1000, // 100 jobs per second
    },
  }
);

// Refund Worker
export const refundWorker = new Worker(
  'payment-refunds',
  async (job: Job) => {
    const { data } = job;
    
    logger.info('Processing refund job', {
      jobId: job.id,
      transactionId: data.transactionId,
    });

    // Import refund service
    const { processRefund } = await import('@/services/refundService');
    
    try {
      const result = await processRefund(data);
      
      logger.info('Refund processed successfully', {
        jobId: job.id,
        transactionId: data.transactionId,
      });

      return result;
    } catch (error: any) {
      logger.error('Refund processing failed', {
        jobId: job.id,
        transactionId: data.transactionId,
        error: error.message,
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

// Settlement Worker
export const settlementWorker = new Worker(
  'payment-settlements',
  async (job: Job) => {
    logger.info('Processing settlement job', { jobId: job.id });

    // Import settlement service
    const { generateSettlementReport } = await import('@/services/settlementService');
    
    try {
      const report = await generateSettlementReport(job.data.period);
      
      logger.info('Settlement report generated', {
        jobId: job.id,
        reportId: report.reportId,
        totalTransactions: report.totalTransactions,
      });

      return report;
    } catch (error: any) {
      logger.error('Settlement generation failed', {
        jobId: job.id,
        error: error.message,
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: 1, // Process one settlement at a time
  }
);

// Queue Events for monitoring
export const paymentQueueEvents = new QueueEvents('payment-processing', { connection });
export const refundQueueEvents = new QueueEvents('payment-refunds', { connection });
export const settlementQueueEvents = new QueueEvents('payment-settlements', { connection });

// Event listeners
paymentWorker.on('completed', (job, result) => {
  logger.info('Payment job completed', {
    jobId: job.id,
    transactionId: result.transactionId,
    duration: Date.now() - job.timestamp,
  });
});

paymentWorker.on('failed', (job, error) => {
  logger.error('Payment job failed', {
    jobId: job?.id,
    error: error.message,
    attemptsMade: job?.attemptsMade,
  });
});

paymentWorker.on('error', (error) => {
  logger.error('Payment worker error', { error: error.message });
});

refundWorker.on('completed', (job) => {
  logger.info('Refund job completed', { jobId: job.id });
});

refundWorker.on('failed', (job, error) => {
  logger.error('Refund job failed', {
    jobId: job?.id,
    error: error.message,
  });
});

settlementWorker.on('completed', (job) => {
  logger.info('Settlement job completed', { jobId: job.id });
});

settlementWorker.on('failed', (job, error) => {
  logger.error('Settlement job failed', {
    jobId: job?.id,
    error: error.message,
  });
});

// Graceful shutdown
export const closeQueues = async () => {
  logger.info('Closing queues...');
  
  await paymentWorker.close();
  await refundWorker.close();
  await settlementWorker.close();
  
  await paymentQueue.close();
  await refundQueue.close();
  await settlementQueue.close();
  await deadLetterQueue.close();
  
  await connection.quit();
  
  logger.info('All queues closed');
};

process.on('SIGTERM', async () => {
  await closeQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closeQueues();
  process.exit(0);
});
