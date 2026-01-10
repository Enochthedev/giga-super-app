import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../../config';
import logger from '../../utils/logger';
import { notificationService } from '../../services/notification.service';

const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

/**
 * Notification worker to process notification jobs
 */
export const notificationWorker = new Worker(
  'notification-queue',
  async (job: Job) => {
    const { userId, type, title, message, data, channels } = job.data;

    logger.info('Processing notification job', {
      jobId: job.id,
      userId,
      type,
      channels,
    });

    try {
      // Get user notification preferences
      const preferences = await notificationService.getUserNotificationPreferences(userId);

      // Filter channels based on user preferences
      const enabledChannels = (channels || ['in_app']).filter((channel: string) => {
        if (channel === 'email') return preferences.email;
        if (channel === 'sms') return preferences.sms;
        if (channel === 'push') return preferences.push;
        if (channel === 'in_app') return preferences.in_app;
        return false;
      });

      if (enabledChannels.length === 0) {
        logger.info('No enabled channels for user, skipping notification', { userId });
        return { success: true, skipped: true, reason: 'No enabled channels' };
      }

      // Send notification through each enabled channel
      const results: any = {};

      for (const channel of enabledChannels) {
        try {
          switch (channel) {
            case 'email':
              results.email = await sendEmailNotification(userId, title, message, data);
              break;
            case 'sms':
              results.sms = await sendSMSNotification(userId, message);
              break;
            case 'push':
              results.push = await sendPushNotification(userId, title, message, data);
              break;
            case 'in_app':
              results.in_app = await sendInAppNotification(userId, type, title, message, data);
              break;
          }
        } catch (error: any) {
          logger.error(`Failed to send ${channel} notification`, {
            userId,
            error: error.message,
          });
          results[channel] = { success: false, error: error.message };
        }
      }

      logger.info('Notification processed successfully', {
        jobId: job.id,
        userId,
        type,
        results,
      });

      return {
        success: true,
        userId,
        type,
        channels: enabledChannels,
        results,
      };
    } catch (error: any) {
      logger.error('Notification processing failed', {
        jobId: job.id,
        userId,
        type,
        error: error.message,
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: 10,
    limiter: {
      max: 20,
      duration: 1000,
    },
  }
);

/**
 * Send email notification
 */
async function sendEmailNotification(
  userId: string,
  title: string,
  message: string,
  data: any
): Promise<{ success: boolean }> {
  logger.debug('Sending email notification', { userId, title });
  // Implementation would integrate with email service (SendGrid, SES, etc.)
  return { success: true };
}

/**
 * Send SMS notification
 */
async function sendSMSNotification(userId: string, message: string): Promise<{ success: boolean }> {
  logger.debug('Sending SMS notification', { userId });
  // Implementation would integrate with SMS service (Twilio, etc.)
  return { success: true };
}

/**
 * Send push notification
 */
async function sendPushNotification(
  userId: string,
  title: string,
  message: string,
  data: any
): Promise<{ success: boolean }> {
  logger.debug('Sending push notification', { userId, title });
  // Implementation would integrate with push service (FCM, APNS, etc.)
  return { success: true };
}

/**
 * Send in-app notification (store in database)
 */
async function sendInAppNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data: any
): Promise<{ success: boolean }> {
  logger.debug('Sending in-app notification', { userId, type });
  // This is already handled by the notification service
  return { success: true };
}

notificationWorker.on('completed', (job) => {
  logger.info('Notification job completed', {
    jobId: job.id,
    userId: job.data.userId,
    type: job.data.type,
  });
});

notificationWorker.on('failed', (job, err) => {
  logger.error('Notification job failed', {
    jobId: job?.id,
    userId: job?.data?.userId,
    type: job?.data?.type,
    error: err.message,
  });
});

notificationWorker.on('error', (err) => {
  logger.error('Notification worker error', { error: err.message });
});

logger.info('Notification worker started');

export async function closeNotificationWorker() {
  await notificationWorker.close();
  logger.info('Notification worker closed');
}
