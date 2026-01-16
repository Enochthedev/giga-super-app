import { createClient } from '@supabase/supabase-js';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  db: { schema: 'public' },
  auth: { autoRefreshToken: false, persistSession: false },
});

export interface DeliveryStatus {
  id: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked';
  provider?: string;
  provider_id?: string;
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  metadata?: Record<string, any>;
}

export class DeliveryTracking {
  /**
   * Update notification status in the database
   */
  static async updateNotificationStatus(
    notificationId: string,
    status: DeliveryStatus['status'],
    additionalData?: Partial<DeliveryStatus>
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData,
      };

      // Set timestamp based on status
      switch (status) {
        case 'sent':
          updateData.sent_at = new Date().toISOString();
          break;
        case 'delivered':
          updateData.delivered_at = new Date().toISOString();
          break;
        case 'opened':
          updateData.opened_at = new Date().toISOString();
          break;
        case 'clicked':
          updateData.clicked_at = new Date().toISOString();
          break;
      }

      const { error } = await supabase
        .from('notification_logs')
        .update(updateData)
        .eq('id', notificationId);

      if (error) {
        logger.error('Failed to update notification status', {
          error,
          notificationId,
          status,
        });
        throw error;
      }

      logger.info('Notification status updated', {
        notificationId,
        status,
        timestamp:
          updateData.sent_at ||
          updateData.delivered_at ||
          updateData.opened_at ||
          updateData.clicked_at,
      });
    } catch (error) {
      logger.error('Error updating notification status', {
        error,
        notificationId,
        status,
      });
      throw error;
    }
  }

  /**
   * Track email open event
   */
  static async trackEmailOpen(
    notificationId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Check if already opened to avoid duplicate tracking
      const { data: existing } = await supabase
        .from('notification_logs')
        .select('opened_at')
        .eq('id', notificationId)
        .single();

      if (existing?.opened_at) {
        logger.info('Email already marked as opened', { notificationId });
        return;
      }

      await this.updateNotificationStatus(notificationId, 'opened', {
        metadata: {
          ...metadata,
          first_open_at: new Date().toISOString(),
        },
      });

      // Update analytics
      await this.updateAnalytics('email_open', notificationId);

      logger.info('Email open tracked', { notificationId, metadata });
    } catch (error) {
      logger.error('Failed to track email open', { error, notificationId });
    }
  }

  /**
   * Track email click event
   */
  static async trackEmailClick(
    notificationId: string,
    linkUrl: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.updateNotificationStatus(notificationId, 'clicked', {
        metadata: {
          ...metadata,
          clicked_url: linkUrl,
          click_timestamp: new Date().toISOString(),
        },
      });

      // Update analytics
      await this.updateAnalytics('email_click', notificationId, { url: linkUrl });

      logger.info('Email click tracked', { notificationId, linkUrl, metadata });
    } catch (error) {
      logger.error('Failed to track email click', { error, notificationId, linkUrl });
    }
  }

  /**
   * Track SMS delivery status from webhook
   */
  static async trackSMSDelivery(
    notificationId: string,
    status: string,
    providerId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      let mappedStatus: DeliveryStatus['status'];

      // Map Twilio status to our status
      switch (status.toLowerCase()) {
        case 'queued':
        case 'accepted':
          mappedStatus = 'queued';
          break;
        case 'sending':
        case 'sent':
          mappedStatus = 'sent';
          break;
        case 'delivered':
          mappedStatus = 'delivered';
          break;
        case 'failed':
        case 'undelivered':
          mappedStatus = 'failed';
          break;
        default:
          mappedStatus = 'sent';
      }

      await this.updateNotificationStatus(notificationId, mappedStatus, {
        provider_id: providerId,
        error_message: errorMessage,
        metadata: {
          provider_status: status,
          webhook_received_at: new Date().toISOString(),
        },
      });

      // Update analytics
      await this.updateAnalytics('sms_delivery', notificationId, {
        provider_status: status,
        success: mappedStatus === 'delivered',
      });

      logger.info('SMS delivery status tracked', {
        notificationId,
        status: mappedStatus,
        providerStatus: status,
        providerId,
      });
    } catch (error) {
      logger.error('Failed to track SMS delivery', {
        error,
        notificationId,
        status,
        providerId,
      });
    }
  }

  /**
   * Track push notification delivery
   */
  static async trackPushDelivery(
    notificationId: string,
    status: 'sent' | 'delivered' | 'failed',
    providerId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.updateNotificationStatus(notificationId, status, {
        provider_id: providerId,
        error_message: errorMessage,
        metadata: {
          push_tracked_at: new Date().toISOString(),
        },
      });

      // Update analytics
      await this.updateAnalytics('push_delivery', notificationId, {
        success: status === 'delivered',
      });

      logger.info('Push notification delivery tracked', {
        notificationId,
        status,
        providerId,
      });
    } catch (error) {
      logger.error('Failed to track push delivery', {
        error,
        notificationId,
        status,
        providerId,
      });
    }
  }

  /**
   * Get notification delivery status
   */
  static async getNotificationStatus(notificationId: string): Promise<DeliveryStatus | null> {
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select(
          `
          id,
          status,
          provider,
          provider_id,
          error_message,
          sent_at,
          delivered_at,
          opened_at,
          clicked_at,
          metadata
        `
        )
        .eq('id', notificationId)
        .single();

      if (error) {
        logger.error('Failed to get notification status', { error, notificationId });
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error getting notification status', { error, notificationId });
      return null;
    }
  }

  /**
   * Get delivery statistics for a user
   */
  static async getUserDeliveryStats(
    userId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
    by_type: Record<string, any>;
  }> {
    try {
      let query = supabase
        .from('notification_logs')
        .select('status, type, sent_at, opened_at, clicked_at')
        .eq('user_id', userId);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to get user delivery stats', { error, userId });
        throw error;
      }

      const stats = {
        total: data.length,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        by_type: {} as Record<string, any>,
      };

      data.forEach(notification => {
        // Count by status
        switch (notification.status) {
          case 'sent':
          case 'delivered':
            stats.sent++;
            if (notification.status === 'delivered') stats.delivered++;
            break;
          case 'opened':
            stats.sent++;
            stats.delivered++;
            stats.opened++;
            break;
          case 'clicked':
            stats.sent++;
            stats.delivered++;
            stats.opened++;
            stats.clicked++;
            break;
          case 'failed':
          case 'bounced':
            stats.failed++;
            break;
        }

        // Count by type
        const type = notification.type || 'unknown';
        if (!stats.by_type[type]) {
          stats.by_type[type] = {
            total: 0,
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            failed: 0,
          };
        }
        stats.by_type[type].total++;

        if (['sent', 'delivered', 'opened', 'clicked'].includes(notification.status)) {
          stats.by_type[type].sent++;
        }
        if (['delivered', 'opened', 'clicked'].includes(notification.status)) {
          stats.by_type[type].delivered++;
        }
        if (['opened', 'clicked'].includes(notification.status)) {
          stats.by_type[type].opened++;
        }
        if (notification.status === 'clicked') {
          stats.by_type[type].clicked++;
        }
        if (['failed', 'bounced'].includes(notification.status)) {
          stats.by_type[type].failed++;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Error getting user delivery stats', { error, userId });
      throw error;
    }
  }

  /**
   * Get campaign delivery statistics
   */
  static async getCampaignDeliveryStats(campaignId: string): Promise<{
    total_recipients: number;
    sent_count: number;
    delivered_count: number;
    opened_count: number;
    clicked_count: number;
    failed_count: number;
    delivery_rate: number;
    open_rate: number;
    click_rate: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('status')
        .eq('metadata->campaignId', campaignId);

      if (error) {
        logger.error('Failed to get campaign delivery stats', { error, campaignId });
        throw error;
      }

      const stats = {
        total_recipients: data.length,
        sent_count: 0,
        delivered_count: 0,
        opened_count: 0,
        clicked_count: 0,
        failed_count: 0,
        delivery_rate: 0,
        open_rate: 0,
        click_rate: 0,
      };

      data.forEach(notification => {
        switch (notification.status) {
          case 'sent':
          case 'delivered':
            stats.sent_count++;
            if (notification.status === 'delivered') stats.delivered_count++;
            break;
          case 'opened':
            stats.sent_count++;
            stats.delivered_count++;
            stats.opened_count++;
            break;
          case 'clicked':
            stats.sent_count++;
            stats.delivered_count++;
            stats.opened_count++;
            stats.clicked_count++;
            break;
          case 'failed':
          case 'bounced':
            stats.failed_count++;
            break;
        }
      });

      // Calculate rates
      if (stats.total_recipients > 0) {
        stats.delivery_rate = (stats.delivered_count / stats.total_recipients) * 100;
      }
      if (stats.delivered_count > 0) {
        stats.open_rate = (stats.opened_count / stats.delivered_count) * 100;
      }
      if (stats.opened_count > 0) {
        stats.click_rate = (stats.clicked_count / stats.opened_count) * 100;
      }

      return stats;
    } catch (error) {
      logger.error('Error getting campaign delivery stats', { error, campaignId });
      throw error;
    }
  }

  /**
   * Update analytics data (for future analytics dashboard)
   */
  private static async updateAnalytics(
    event: string,
    notificationId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // This could be expanded to update a separate analytics table
      // or send data to an analytics service like Google Analytics, Mixpanel, etc.

      logger.info('Analytics event tracked', {
        event,
        notificationId,
        metadata,
        timestamp: new Date().toISOString(),
      });

      // Future: Insert into analytics table or send to external service
      // await supabase.from('notification_analytics').insert({
      //   event,
      //   notification_id: notificationId,
      //   metadata,
      //   created_at: new Date().toISOString(),
      // });
    } catch (error) {
      logger.error('Failed to update analytics', { error, event, notificationId });
      // Don't throw error for analytics failures
    }
  }

  /**
   * Generate tracking pixel URL for email opens
   */
  static generateTrackingPixelUrl(notificationId: string, baseUrl: string): string {
    return `${baseUrl}/api/v1/tracking/open/${notificationId}.png`;
  }

  /**
   * Generate tracked link URL for email clicks
   */
  static generateTrackedLinkUrl(
    notificationId: string,
    originalUrl: string,
    baseUrl: string
  ): string {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `${baseUrl}/api/v1/tracking/click/${notificationId}?url=${encodedUrl}`;
  }

  /**
   * Process webhook data from external providers
   */
  static async processWebhook(
    provider: 'twilio' | 'sendgrid' | 'firebase',
    webhookData: any
  ): Promise<void> {
    try {
      switch (provider) {
        case 'twilio':
          await this.processTwilioWebhook(webhookData);
          break;
        case 'sendgrid':
          await this.processSendGridWebhook(webhookData);
          break;
        case 'firebase':
          await this.processFirebaseWebhook(webhookData);
          break;
        default:
          logger.warn('Unknown webhook provider', { provider });
      }
    } catch (error) {
      logger.error('Error processing webhook', { error, provider, webhookData });
    }
  }

  /**
   * Process Twilio SMS status webhook
   */
  private static async processTwilioWebhook(data: any): Promise<void> {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = data;

    if (!MessageSid) {
      logger.warn('Twilio webhook missing MessageSid', { data });
      return;
    }

    // Find notification by provider ID
    const { data: notification } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('provider_id', MessageSid)
      .single();

    if (notification) {
      await this.trackSMSDelivery(notification.id, MessageStatus, MessageSid, ErrorMessage);
    } else {
      logger.warn('Notification not found for Twilio webhook', { MessageSid });
    }
  }

  /**
   * Process SendGrid email event webhook
   */
  private static async processSendGridWebhook(events: any[]): Promise<void> {
    for (const event of events) {
      const { sg_message_id, event: eventType, url } = event;

      if (!sg_message_id) continue;

      // Find notification by provider ID
      const { data: notification } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('provider_id', sg_message_id)
        .single();

      if (notification) {
        switch (eventType) {
          case 'delivered':
            await this.updateNotificationStatus(notification.id, 'delivered');
            break;
          case 'open':
            await this.trackEmailOpen(notification.id);
            break;
          case 'click':
            await this.trackEmailClick(notification.id, url);
            break;
          case 'bounce':
          case 'dropped':
            await this.updateNotificationStatus(notification.id, 'bounced');
            break;
        }
      }
    }
  }

  /**
   * Process Firebase push notification webhook
   */
  private static async processFirebaseWebhook(data: any): Promise<void> {
    // Implementation depends on Firebase webhook format
    logger.info('Firebase webhook received', { data });
  }
}
