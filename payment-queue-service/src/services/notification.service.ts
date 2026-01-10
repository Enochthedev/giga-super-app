import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import logger from '../utils/logger';

interface NotificationPayload {
  userId: string;
  type: 'payment_success' | 'payment_failed' | 'refund_processed' | 'settlement_completed';
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: Array<'email' | 'sms' | 'push' | 'in_app'>;
}

interface PaymentNotificationData {
  transactionId: string;
  amount: number;
  currency: string;
  module: string;
  status: string;
  timestamp: string;
}

export class NotificationService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
  }

  /**
   * Send payment success notification
   */
  async sendPaymentSuccessNotification(
    userId: string,
    paymentData: PaymentNotificationData
  ): Promise<void> {
    try {
      const payload: NotificationPayload = {
        userId,
        type: 'payment_success',
        title: 'Payment Successful',
        message: `Your payment of ${paymentData.currency} ${paymentData.amount.toFixed(2)} has been processed successfully.`,
        data: paymentData,
        channels: ['email', 'push', 'in_app'],
      };

      await this.sendNotification(payload);
      
      logger.info('Payment success notification sent', {
        userId,
        transactionId: paymentData.transactionId,
      });
    } catch (error: any) {
      logger.error('Failed to send payment success notification', {
        error: error.message,
        userId,
        transactionId: paymentData.transactionId,
      });
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailedNotification(
    userId: string,
    paymentData: PaymentNotificationData,
    reason: string
  ): Promise<void> {
    try {
      const payload: NotificationPayload = {
        userId,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Your payment of ${paymentData.currency} ${paymentData.amount.toFixed(2)} could not be processed. Reason: ${reason}`,
        data: { ...paymentData, reason },
        channels: ['email', 'push', 'in_app'],
      };

      await this.sendNotification(payload);
      
      logger.info('Payment failed notification sent', {
        userId,
        transactionId: paymentData.transactionId,
      });
    } catch (error: any) {
      logger.error('Failed to send payment failed notification', {
        error: error.message,
        userId,
        transactionId: paymentData.transactionId,
      });
    }
  }

  /**
   * Send refund processed notification
   */
  async sendRefundNotification(
    userId: string,
    refundData: {
      transactionId: string;
      amount: number;
      currency: string;
      reason: string;
    }
  ): Promise<void> {
    try {
      const payload: NotificationPayload = {
        userId,
        type: 'refund_processed',
        title: 'Refund Processed',
        message: `A refund of ${refundData.currency} ${refundData.amount.toFixed(2)} has been processed for your payment.`,
        data: refundData,
        channels: ['email', 'push', 'in_app'],
      };

      await this.sendNotification(payload);
      
      logger.info('Refund notification sent', {
        userId,
        transactionId: refundData.transactionId,
      });
    } catch (error: any) {
      logger.error('Failed to send refund notification', {
        error: error.message,
        userId,
        transactionId: refundData.transactionId,
      });
    }
  }

  /**
   * Send settlement completed notification (for merchants/partners)
   */
  async sendSettlementNotification(
    userId: string,
    settlementData: {
      settlementId: string;
      amount: number;
      currency: string;
      period: string;
      transactionCount: number;
    }
  ): Promise<void> {
    try {
      const payload: NotificationPayload = {
        userId,
        type: 'settlement_completed',
        title: 'Settlement Completed',
        message: `Settlement of ${settlementData.currency} ${settlementData.amount.toFixed(2)} for ${settlementData.transactionCount} transactions has been completed.`,
        data: settlementData,
        channels: ['email', 'in_app'],
      };

      await this.sendNotification(payload);
      
      logger.info('Settlement notification sent', {
        userId,
        settlementId: settlementData.settlementId,
      });
    } catch (error: any) {
      logger.error('Failed to send settlement notification', {
        error: error.message,
        userId,
        settlementId: settlementData.settlementId,
      });
    }
  }

  /**
   * Core notification sending function
   */
  private async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Store notification in database
      const { error: dbError } = await this.supabase
        .from('notifications')
        .insert({
          user_id: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: payload.data || {},
          channels: payload.channels || ['in_app'],
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        logger.error('Failed to store notification in database', {
          error: dbError.message,
          userId: payload.userId,
        });
      }

      // Queue notification for processing by notification service
      // In a real implementation, this would push to a notification queue
      // For now, we'll just log it
      logger.debug('Notification queued for processing', {
        userId: payload.userId,
        type: payload.type,
        channels: payload.channels,
      });

      // Optionally: Call external notification service API
      // await this.callExternalNotificationService(payload);

    } catch (error: any) {
      logger.error('Failed to send notification', {
        error: error.message,
        payload,
      });
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(notifications: NotificationPayload[]): Promise<{
    sent: number;
    failed: number;
  }> {
    let sent = 0;
    let failed = 0;

    for (const notification of notifications) {
      try {
        await this.sendNotification(notification);
        sent++;
      } catch (error) {
        failed++;
      }
    }

    logger.info('Bulk notifications processed', {
      total: notifications.length,
      sent,
      failed,
    });

    return { sent, failed };
  }

  /**
   * Get user notification preferences
   */
  async getUserNotificationPreferences(userId: string): Promise<{
    email: boolean;
    sms: boolean;
    push: boolean;
    in_app: boolean;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        // Default preferences
        return {
          email: true,
          sms: false,
          push: true,
          in_app: true,
        };
      }

      return {
        email: data.email_enabled || false,
        sms: data.sms_enabled || false,
        push: data.push_enabled || false,
        in_app: data.in_app_enabled || false,
      };
    } catch (error: any) {
      logger.error('Failed to get user notification preferences', {
        error: error.message,
        userId,
      });
      // Return defaults on error
      return {
        email: true,
        sms: false,
        push: true,
        in_app: true,
      };
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();
