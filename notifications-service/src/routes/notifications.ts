import { createClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import { Request, Response, Router } from 'express';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { PreferencesService } from '../utils/preferences.js';
import { DeliveryTracking } from '../utils/tracking.js';

const router = Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  db: { schema: 'public' },
  auth: { autoRefreshToken: false, persistSession: false },
});

// Redis connection for queues
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

// Initialize queues
const emailQueue = new Queue('email-notifications', { connection: connection as any });
const smsQueue = new Queue('sms-notifications', { connection: connection as any });
const pushQueue = new Queue('push-notifications', { connection: connection as any });
const scheduledQueue = new Queue('scheduled-notifications', { connection: connection as any });
const bulkQueue = new Queue('bulk-notifications', { connection: connection as any });

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  requestId?: string;
}

interface NotificationJob {
  id: string;
  userId: string;
  templateId?: string;
  type: 'email' | 'sms' | 'push';
  recipient: string;
  subject?: string;
  body: string;
  variables?: Record<string, any>;
  scheduledFor?: Date;
  priority?: number;
  retryCount?: number;
  campaignId?: string;
  metadata?: Record<string, any>;
}

// Middleware to check authentication
const requireAuth = (req: AuthenticatedRequest, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
  next();
};

// Middleware to check admin permissions
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: Function) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
  next();
};

// POST /api/v1/notifications/send - Enhanced send with templates
router.post('/send', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      userId,
      type,
      templateId,
      recipient,
      subject,
      body,
      variables = {},
      scheduledFor,
      priority = 3,
      category = 'general',
    } = req.body;

    // Use authenticated user's ID if not provided (for self-notifications)
    const targetUserId = userId || req.user!.id;

    // Validate required fields
    if (!type || !recipient) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, recipient',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    if (!['email', 'sms', 'push'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification type. Must be email, sms, or push',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // If template is specified, validate it exists
    let template = null;
    if (templateId) {
      const { data: templateData, error: templateError } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();

      if (templateError || !templateData) {
        return res.status(404).json({
          success: false,
          error: 'Template not found or inactive',
          metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
        });
      }

      if (templateData.type !== type) {
        return res.status(400).json({
          success: false,
          error: `Template type (${templateData.type}) does not match notification type (${type})`,
          metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
        });
      }

      template = templateData;
    }

    // If no template and no body provided, error
    if (!template && !body) {
      return res.status(400).json({
        success: false,
        error: 'Either templateId or body must be provided',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Check user preferences
    const permissionCheck = await PreferencesService.checkNotificationAllowed(
      targetUserId,
      type,
      category
    );

    if (!permissionCheck.allowed) {
      return res.status(403).json({
        success: false,
        error: 'Notification not allowed by user preferences',
        details: { reason: permissionCheck.reason },
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    const notificationId = uuidv4();

    // Create notification history record
    const historyData: any = {
      id: notificationId,
      user_id: targetUserId,
      template_id: templateId,
      type,
      subject: type === 'email' ? subject : null,
      body: body || template?.body,
      variables,
      status: 'queued',
      metadata: {
        requestId: req.requestId,
        category,
        created_by: req.user!.id,
      },
    };

    // Set recipient field based on type
    switch (type) {
      case 'email':
        historyData.recipient_email = recipient;
        break;
      case 'sms':
        historyData.recipient_phone = recipient;
        break;
      case 'push':
        historyData.recipient_device_token = recipient;
        break;
    }

    if (scheduledFor) {
      historyData.scheduled_for = scheduledFor;
    }

    const { error: historyError } = await supabase.from('notification_logs').insert(historyData);

    if (historyError) {
      logger.error('Failed to create notification history', {
        error: historyError,
        requestId: req.requestId,
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to create notification record',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    const jobData: NotificationJob = {
      id: notificationId,
      userId: targetUserId,
      templateId,
      type,
      recipient,
      subject,
      body: body || template?.body || '',
      variables,
      priority,
      metadata: {
        requestId: req.requestId,
        category,
        created_by: req.user!.id,
      },
    };

    let job;
    if (scheduledFor) {
      const delay = new Date(scheduledFor).getTime() - Date.now();
      if (delay <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Scheduled time must be in the future',
          metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
        });
      }
      job = await scheduledQueue.add(`send-${type}`, jobData, { delay });
    } else {
      // Check quiet hours and delay if necessary
      const preferences = await PreferencesService.getUserPreferences(targetUserId);
      if (PreferencesService.isQuietHours(preferences)) {
        const delay = PreferencesService.getDelayUntilActiveHours(preferences);
        if (delay > 0) {
          job = await scheduledQueue.add(`send-${type}`, jobData, { delay });
          logger.info('Notification delayed due to quiet hours', {
            notificationId,
            delay,
            requestId: req.requestId,
          });
        }
      }

      if (!job) {
        // Send immediately
        switch (type) {
          case 'email':
            job = await emailQueue.add('send-email', jobData, { attempts: 3, priority });
            break;
          case 'sms':
            job = await smsQueue.add('send-sms', jobData, { attempts: 3, priority });
            break;
          case 'push':
            job = await pushQueue.add('send-push', jobData, { attempts: 3, priority });
            break;
        }
      }
    }

    logger.info('Notification queued', {
      notificationId,
      type,
      userId: targetUserId,
      templateId,
      scheduled: !!scheduledFor,
      requestId: req.requestId,
    });

    res.status(202).json({
      success: true,
      data: {
        notification_id: notificationId,
        job_id: job?.id,
        type,
        status: 'queued',
        scheduled_for: scheduledFor || null,
        recipient,
        template_id: templateId,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    });
  } catch (error: any) {
    logger.error('Failed to queue notification', {
      error: error.message,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to queue notification',
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    });
  }
});

// POST /api/v1/notifications/bulk - Send bulk notifications
router.post('/bulk', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      templateId,
      type,
      recipients, // Array of { userId, recipient, variables? }
      globalVariables = {},
      scheduledFor,
      priority = 3,
      category = 'general',
    } = req.body;

    // Validate required fields
    if (!templateId || !type || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: templateId, type, recipients (array)',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    if (!['email', 'sms', 'push'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification type. Must be email, sms, or push',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    if (recipients.length === 0 || recipients.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array must contain 1-10000 items',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Validate template
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found or inactive',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    if (template.type !== type) {
      return res.status(400).json({
        success: false,
        error: `Template type (${template.type}) does not match notification type (${type})`,
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Filter recipients based on preferences
    const validRecipients = [];
    const skippedRecipients = [];

    for (const recipient of recipients) {
      if (!recipient.userId || !recipient.recipient) {
        skippedRecipients.push({
          ...recipient,
          reason: 'Missing userId or recipient',
        });
        continue;
      }

      const permissionCheck = await PreferencesService.checkNotificationAllowed(
        recipient.userId,
        type,
        category
      );

      if (permissionCheck.allowed) {
        validRecipients.push(recipient);
      } else {
        skippedRecipients.push({
          ...recipient,
          reason: permissionCheck.reason,
        });
      }
    }

    if (validRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid recipients after filtering',
        details: { skipped_count: skippedRecipients.length },
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Create bulk job
    const bulkJobId = uuidv4();
    const jobData = {
      id: bulkJobId,
      templateId,
      type,
      recipients: validRecipients,
      globalVariables,
      scheduledFor,
      priority,
      category,
      metadata: {
        requestId: req.requestId,
        created_by: req.user!.id,
        total_recipients: recipients.length,
        valid_recipients: validRecipients.length,
        skipped_recipients: skippedRecipients.length,
      },
    };

    let job;
    if (scheduledFor) {
      const delay = new Date(scheduledFor).getTime() - Date.now();
      if (delay <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Scheduled time must be in the future',
          metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
        });
      }
      job = await bulkQueue.add('bulk-send', jobData, { delay });
    } else {
      job = await bulkQueue.add('bulk-send', jobData, { priority });
    }

    logger.info('Bulk notification queued', {
      bulkJobId,
      templateId,
      type,
      totalRecipients: recipients.length,
      validRecipients: validRecipients.length,
      skippedRecipients: skippedRecipients.length,
      scheduled: !!scheduledFor,
      requestId: req.requestId,
    });

    res.status(202).json({
      success: true,
      data: {
        bulk_job_id: bulkJobId,
        job_id: job.id,
        template_id: templateId,
        type,
        status: 'queued',
        scheduled_for: scheduledFor || null,
        recipients_summary: {
          total: recipients.length,
          valid: validRecipients.length,
          skipped: skippedRecipients.length,
        },
        skipped_recipients: skippedRecipients,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    });
  } catch (error: any) {
    logger.error('Failed to queue bulk notification', {
      error: error.message,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to queue bulk notification',
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    });
  }
});

// GET /api/v1/notifications/history - Get notification history
router.get('/history', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type, status, template_id, date_from, date_to, page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('notification_logs')
      .select(
        `
        id,
        type,
        status,
        subject,
        recipient_email,
        recipient_phone,
        recipient_device_token,
        template_id,
        sent_at,
        delivered_at,
        opened_at,
        clicked_at,
        error_message,
        created_at,
        notification_templates(name, type)
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    // Apply filters
    if (type && ['email', 'sms', 'push'].includes(type as string)) {
      query = query.eq('type', type);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (template_id) {
      query = query.eq('template_id', template_id);
    }
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch notification history', {
        error,
        userId,
        requestId: req.requestId,
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch notification history',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        total_pages: Math.ceil((count || 0) / Number(limit)),
        has_previous: Number(page) > 1,
        has_next: Number(page) < Math.ceil((count || 0) / Number(limit)),
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error fetching notification history', {
      error: error.message,
      userId: req.user!.id,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// GET /api/v1/notifications/status/:id - Get notification status
router.get('/status/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const status = await DeliveryTracking.getNotificationStatus(id);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Check if user owns this notification (or is admin)
    const { data: notification } = await supabase
      .from('notification_logs')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!notification || (notification.user_id !== userId && req.user!.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    res.json({
      success: true,
      data: status,
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error fetching notification status', {
      error: error.message,
      notificationId: req.params.id,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// POST /api/v1/notifications/retry/:id - Retry failed notification
router.post('/retry/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get notification details
    const { data: notification, error } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Check if notification can be retried
    if (!['failed', 'bounced'].includes(notification.status)) {
      return res.status(400).json({
        success: false,
        error: 'Only failed or bounced notifications can be retried',
        details: { current_status: notification.status },
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Create retry job
    const retryJobData: NotificationJob = {
      id: notification.id,
      userId: notification.user_id,
      templateId: notification.template_id,
      type: notification.type,
      recipient:
        notification.recipient_email ||
        notification.recipient_phone ||
        notification.recipient_device_token,
      subject: notification.subject,
      body: notification.content,
      variables: notification.variables || {},
      retryCount: (notification.metadata?.retryCount || 0) + 1,
      metadata: {
        ...notification.metadata,
        retryCount: (notification.metadata?.retryCount || 0) + 1,
        retriedBy: req.user!.id,
        retriedAt: new Date().toISOString(),
        requestId: req.requestId,
      },
    };

    // Update notification status
    await supabase
      .from('notification_logs')
      .update({
        status: 'queued',
        error_message: null,
        metadata: retryJobData.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Queue retry job
    let job;
    switch (notification.type) {
      case 'email':
        job = await emailQueue.add('send-email', retryJobData, { attempts: 3, priority: 5 });
        break;
      case 'sms':
        job = await smsQueue.add('send-sms', retryJobData, { attempts: 3, priority: 5 });
        break;
      case 'push':
        job = await pushQueue.add('send-push', retryJobData, { attempts: 3, priority: 5 });
        break;
    }

    logger.info('Notification retry queued', {
      notificationId: id,
      type: notification.type,
      retryCount: retryJobData.retryCount,
      retriedBy: req.user!.id,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: {
        notification_id: id,
        job_id: job?.id,
        retry_count: retryJobData.retryCount,
        status: 'queued',
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error retrying notification', {
      error: error.message,
      notificationId: req.params.id,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retry notification',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// GET /api/v1/notifications/stats - Get user notification statistics
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { date_from, date_to } = req.query;

    const stats = await DeliveryTracking.getUserDeliveryStats(
      userId,
      date_from as string,
      date_to as string
    );

    res.json({
      success: true,
      data: stats,
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error fetching notification stats', {
      error: error.message,
      userId: req.user!.id,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification statistics',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

export default router;
