import { Job } from 'bullmq';

import { notificationService } from '../../services/notification.service';
import logger from '../../utils/logger';

/**
 * Notification processor function - handles notification job processing
 * This is registered with WorkerManager and called when jobs arrive
 */
export async function notificationProcessor(job: Job): Promise<{
  success: boolean;
  userId: string;
  type: string;
  channels: string[];
  results: Record<string, unknown>;
}> {
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
      return {
        success: true,
        userId,
        type,
        channels: [],
        results: { skipped: true, reason: 'No enabled channels' },
      };
    }

    // Send notification through each enabled channel
    const results: Record<string, unknown> = {};

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
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to send ${channel} notification`, {
          userId,
          error: errorMessage,
        });
        results[channel] = { success: false, error: errorMessage };
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Notification processing failed', {
      jobId: job.id,
      userId,
      type,
      error: errorMessage,
    });
    throw error;
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(
  userId: string,
  title: string,
  _message: string,
  _data: unknown
): Promise<{ success: boolean }> {
  logger.debug('Sending email notification', { userId, title });
  // Implementation would integrate with email service (SendGrid, SES, etc.)
  return { success: true };
}

/**
 * Send SMS notification
 */
async function sendSMSNotification(
  userId: string,
  _message: string
): Promise<{ success: boolean }> {
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
  _message: string,
  _data: unknown
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
  _title: string,
  _message: string,
  _data: unknown
): Promise<{ success: boolean }> {
  logger.debug('Sending in-app notification', { userId, type });
  // This is already handled by the notification service
  return { success: true };
}
