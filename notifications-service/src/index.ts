import { createClient } from '@supabase/supabase-js';
import { Job, Queue, Worker } from 'bullmq';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import IORedis from 'ioredis';
import NodeCache from 'node-cache';
import * as nodemailer from 'nodemailer';
import swaggerUi from 'swagger-ui-express';
import { Twilio } from 'twilio';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

import { swaggerSpec } from './config/swagger';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3007', 10);
const REDIS_URL = process.env.REDIS_URL || process.env.RAILWAY_REDIS_URL || '';

/**
 * Check if Redis should be used
 * Disable for free tiers to avoid connection issues and eviction policy warnings
 */
const shouldUseRedis = (): boolean => {
  const forceDisable = process.env.DISABLE_REDIS === 'true';
  const forceEnable = process.env.FORCE_REDIS === 'true';

  // Force enable overrides everything
  if (forceEnable && REDIS_URL) {
    console.log('Redis force-enabled via FORCE_REDIS=true');
    return true;
  }

  // Disable if explicitly disabled, no URL, or local dev URL
  if (forceDisable || !REDIS_URL || REDIS_URL === 'redis://localhost:6379') {
    console.log('Redis disabled - using in-memory queue fallback');
    return false;
  }

  // Auto-disable for known free tier Redis providers
  // Free tiers have eviction policies (volatile-lru) that break BullMQ (requires noeviction)
  const freeRedisPatterns = [
    'redis-cloud.com', // Redis Cloud free tier
    'redis.cloud', // Redis Cloud
    'upstash.io', // Upstash (has command limits)
    'redislabs.com', // RedisLabs free tier
  ];

  const isFreeTier = freeRedisPatterns.some(pattern => REDIS_URL.includes(pattern));

  if (isFreeTier && !forceEnable) {
    console.log('⚠️  Free Redis tier detected - disabling Redis');
    console.log('   Free tiers use volatile-lru eviction which breaks BullMQ');
    console.log('   Set FORCE_REDIS=true to override, or use Railway Redis add-on');
    return false;
  }

  return true;
};

const useRedis = shouldUseRedis();

// Logger with request ID support
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/notifications.log' }),
  ],
});

// Redis connection with connection pooling and error handling
// Optimized for Upstash free tier limits - only create if Redis is enabled
let connection: IORedis | null = null;

if (useRedis) {
  connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true, // Don't connect until first command
    enableReadyCheck: true, // Enable ready check for proper connection state
    connectTimeout: 10000,
    enableOfflineQueue: true, // Queue commands when offline to prevent errors
    retryStrategy: (times: number) => {
      if (times > 5) {
        logger.error('Redis connection failed after 5 retries, giving up');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 1000, 5000); // Exponential backoff up to 5s
      logger.info(`Redis retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err: Error) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      if (targetErrors.some(e => err.message.includes(e))) {
        return true; // Reconnect on these errors
      }
      return false;
    },
  });

  connection.on('error', err => {
    // Only log once per error type to avoid log spam
    if (!connection?.lastErrorLogged || connection.lastErrorLogged !== err.message) {
      logger.error('Redis connection error', { error: err.message });
      (connection as any).lastErrorLogged = err.message;
    }
  });

  connection.on('connect', () => {
    logger.info('Redis connected');
    (connection as any).lastErrorLogged = null;
  });

  connection.on('ready', () => {
    logger.info('Redis ready');
  });

  connection.on('close', () => {
    logger.warn('Redis connection closed');
  });

  connection.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
  });
} else {
  logger.info('Redis disabled - notifications will use in-memory processing');
}

// Supabase client for database operations
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Cache for user preferences and templates (5 minute TTL)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Email transporter with connection pooling
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Twilio client
const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

// Consolidated Notification Queue (reduces Redis key usage)
// Instead of 7 separate queues, use one queue with job types
// Only create BullMQ queue if Redis is enabled
let notificationQueue: Queue | null = null;

if (useRedis && connection) {
  // Test Redis connection before creating queue
  const testConnection = async () => {
    try {
      await connection!.ping();
      logger.info('Redis connection verified');
      return true;
    } catch (error: any) {
      logger.error('Redis connection test failed', { error: error.message });
      return false;
    }
  };

  // Create queue with connection
  notificationQueue = new Queue('notifications', {
    connection: connection as any,
    defaultJobOptions: {
      removeOnComplete: 100, // Keep only last 100 completed jobs
      removeOnFail: 50, // Keep only last 50 failed jobs
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });

  // Handle queue errors
  notificationQueue.on('error', error => {
    logger.error('Queue error', { error: error.message });
  });

  logger.info('Notification queue initialized with Redis/BullMQ');
} else {
  logger.info('Notification queue disabled - using direct processing');
}

// Legacy queue exports for backward compatibility
export { notificationQueue };
export const emailQueue = notificationQueue;
export const smsQueue = notificationQueue;
export const pushQueue = notificationQueue;
export const scheduledQueue = notificationQueue;
export const bulkQueue = notificationQueue;
export const retryQueue = notificationQueue;
export const campaignQueue = notificationQueue;

// Interfaces
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

interface UserPreferences {
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  marketing_emails: boolean;
  booking_notifications: boolean;
  payment_notifications: boolean;
  delivery_notifications: boolean;
  social_notifications: boolean;
  security_notifications: boolean;
  email_frequency: string;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

// Utility Functions
class TemplateEngine {
  static renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    Object.entries(variables || {}).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    });
    return rendered;
  }

  static extractVariables(template: string): string[] {
    const matches = template.match(/{{\\s*([^}]+)\\s*}}/g) || [];
    return matches.map(match => match.replace(/{{\\s*([^}]+)\\s*}}/, '$1').trim());
  }
}

class PreferencesService {
  static async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const cacheKey = `preferences:${userId}`;
    let preferences = cache.get<UserPreferences>(cacheKey);

    if (!preferences) {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Failed to get user preferences', { error, userId });
        return null;
      }

      preferences = data || {
        user_id: userId,
        email_enabled: true,
        sms_enabled: true,
        push_enabled: true,
        marketing_emails: false,
        booking_notifications: true,
        payment_notifications: true,
        delivery_notifications: true,
        social_notifications: true,
        security_notifications: true,
        email_frequency: 'immediate',
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        timezone: 'UTC',
      };

      cache.set(cacheKey, preferences);
    }

    return preferences;
  }

  static async checkNotificationAllowed(
    userId: string,
    type: 'email' | 'sms' | 'push',
    category: string
  ): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);
    if (!preferences) return true; // Default to allow if no preferences found

    // Check if type is enabled
    if (type === 'email' && !preferences.email_enabled) return false;
    if (type === 'sms' && !preferences.sms_enabled) return false;
    if (type === 'push' && !preferences.push_enabled) return false;

    // Check category preferences
    switch (category) {
      case 'marketing':
        return preferences.marketing_emails;
      case 'booking':
        return preferences.booking_notifications;
      case 'payment':
        return preferences.payment_notifications;
      case 'delivery':
        return preferences.delivery_notifications;
      case 'social':
        return preferences.social_notifications;
      case 'security':
        return preferences.security_notifications;
      default:
        return true;
    }
  }

  static isQuietHours(preferences: UserPreferences): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    const startTime = preferences.quiet_hours_start;
    const endTime = preferences.quiet_hours_end;

    if (startTime && endTime) {
      if (startTime <= endTime) {
        return currentTime >= startTime && currentTime <= endTime;
      } else {
        // Quiet hours span midnight
        return currentTime >= startTime || currentTime <= endTime;
      }
    }

    return false;
  }

  static getDelayUntilActiveHours(preferences: UserPreferences): number {
    const now = new Date();
    const endTime = preferences.quiet_hours_end;

    if (!endTime) return 0;

    const [hours, minutes] = endTime.split(':').map(Number);
    const endDate = new Date(now);
    endDate.setHours(hours, minutes, 0, 0);

    if (endDate <= now) {
      endDate.setDate(endDate.getDate() + 1);
    }

    return endDate.getTime() - now.getTime();
  }
}

async function generateUnsubscribeToken(
  userId: string,
  type: 'email' | 'sms' | 'all'
): Promise<string> {
  const token = uuidv4();

  await supabase.from('unsubscribe_tokens').insert({
    user_id: userId,
    token,
    type,
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
  });

  return token;
}

async function updateNotificationHistory(id: string, updates: any): Promise<void> {
  await supabase
    .from('notification_logs')
    // E27: notification_logs has no updated_at column
    .update({ ...updates })
    .eq('id', id);
}

// Enhanced Email Worker with template support
// Only create workers if Redis is enabled
let enhancedEmailWorker: Worker | null = null;
let enhancedSmsWorker: Worker | null = null;
let bulkWorker: Worker | null = null;

// Worker options with better error handling
const workerOptions = {
  connection: connection as any,
  concurrency: 5,
  lockDuration: 30000, // 30 seconds
  stalledInterval: 30000,
  maxStalledCount: 2,
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      return Math.min(attemptsMade * 1000, 30000); // Max 30s backoff
    },
  },
};

if (useRedis && connection) {
  enhancedEmailWorker = new Worker(
    'notifications', // Use consolidated queue name
    async (job: Job<NotificationJob>) => {
      // Only process email jobs
      if (job.name !== 'send-email' && job.data.type !== 'email') {
        return { success: true, skipped: true };
      }

      const { userId, templateId, recipient, subject, body, variables, id } = job.data;

      logger.info('Processing email notification', {
        jobId: job.id,
        userId,
        templateId,
        recipient,
      });

      try {
        // 1. Check user preferences
        const preferences = await PreferencesService.getUserPreferences(userId);
        if (preferences && !preferences.email_enabled) {
          logger.info('Email disabled for user', { userId });
          await updateNotificationHistory(id, {
            status: 'failed',
            error_message: 'Email disabled by user preferences',
          });
          return { success: false, reason: 'Email disabled' };
        }

        // 2. Check quiet hours
        if (preferences && PreferencesService.isQuietHours(preferences)) {
          const delay = PreferencesService.getDelayUntilActiveHours(preferences);
          if (notificationQueue) {
            await notificationQueue.add('send-email', job.data, { delay });
          }
          logger.info('Email rescheduled due to quiet hours', { userId, delay });
          return { success: true, rescheduled: true };
        }

        // 3. Render template if needed
        let finalSubject = subject;
        let finalBody = body;

        if (templateId) {
          const { data: template } = await supabase
            .from('notification_templates')
            .select('*')
            .eq('id', templateId)
            .single();

          if (template) {
            finalSubject = template.subject
              ? TemplateEngine.renderTemplate(template.subject, variables)
              : subject;
            finalBody = TemplateEngine.renderTemplate(
              template.email_body || template.body,
              variables
            );
          }
        }

        // 4. Add unsubscribe link
        const unsubscribeToken = await generateUnsubscribeToken(userId, 'email');
        finalBody += `\n\nUnsubscribe: ${process.env.BASE_URL || 'http://localhost:3000'}/api/v1/unsubscribe/${unsubscribeToken}`;

        // 5. Send email
        const result = await emailTransporter.sendMail({
          from: process.env.SMTP_FROM || 'notifications@giga.com',
          to: recipient,
          subject: finalSubject,
          html: finalBody,
        });

        // 6. Update notification history
        await updateNotificationHistory(id, {
          status: 'sent',
          provider: 'nodemailer',
          provider_id: result.messageId,
          sent_at: new Date().toISOString(),
        });

        logger.info('Email sent successfully', {
          jobId: job.id,
          messageId: result.messageId,
        });

        return { success: true, messageId: result.messageId };
      } catch (error: any) {
        logger.error('Failed to send email', {
          error: error.message,
          jobId: job.id,
        });

        await updateNotificationHistory(id, {
          status: 'failed',
          error_message: error.message,
        });

        throw error;
      }
    },
    { connection: connection as any, concurrency: 5, lockDuration: 30000 }
  );

  // Enhanced SMS Worker
  enhancedSmsWorker = new Worker(
    'notifications', // Use consolidated queue name
    async (job: Job<NotificationJob>) => {
      // Only process SMS jobs
      if (job.name !== 'send-sms' && job.data.type !== 'sms') {
        return { success: true, skipped: true };
      }

      const { userId, templateId, recipient, body, variables, id } = job.data;

      logger.info('Processing SMS notification', {
        jobId: job.id,
        userId,
        templateId,
        recipient,
      });

      if (!twilioClient) {
        logger.warn('Twilio not configured, skipping SMS');
        await updateNotificationHistory(id, {
          status: 'failed',
          error_message: 'Twilio not configured',
        });
        return { success: false, message: 'Twilio not configured' };
      }

      try {
        // 1. Check user preferences
        const preferences = await PreferencesService.getUserPreferences(userId);
        if (preferences && !preferences.sms_enabled) {
          logger.info('SMS disabled for user', { userId });
          await updateNotificationHistory(id, {
            status: 'failed',
            error_message: 'SMS disabled by user preferences',
          });
          return { success: false, reason: 'SMS disabled' };
        }

        // 2. Render template if needed
        let finalBody = body;

        if (templateId) {
          const { data: template } = await supabase
            .from('notification_templates')
            .select('*')
            .eq('id', templateId)
            .single();

          if (template) {
            finalBody = TemplateEngine.renderTemplate(
              template.sms_body || template.body,
              variables
            );
          }
        }

        // 3. Send SMS
        const result = await twilioClient.messages.create({
          to: recipient,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: finalBody,
        });

        // 4. Update notification history
        await updateNotificationHistory(id, {
          status: 'sent',
          provider: 'twilio',
          provider_id: result.sid,
          sent_at: new Date().toISOString(),
        });

        logger.info('SMS sent successfully', {
          jobId: job.id,
          messageSid: result.sid,
        });

        return { success: true, messageSid: result.sid };
      } catch (error: any) {
        logger.error('Failed to send SMS', {
          error: error.message,
          jobId: job.id,
        });

        await updateNotificationHistory(id, {
          status: 'failed',
          error_message: error.message,
        });

        throw error;
      }
    },
    { connection: connection as any, concurrency: 10, lockDuration: 30000 }
  );

  // Bulk notification worker
  bulkWorker = new Worker(
    'notifications', // Use consolidated queue name
    async (job: Job) => {
      // Only process bulk jobs
      if (job.name !== 'bulk-send' && !job.data.campaignId) {
        return { success: true, skipped: true };
      }

      const { campaignId, templateId, recipients, variables } = job.data;

      logger.info('Processing bulk notification', {
        jobId: job.id,
        campaignId,
        recipientCount: recipients.length,
      });

      try {
        // Update campaign status
        await supabase
          .from('notification_campaigns')
          .update({ status: 'sending', started_at: new Date().toISOString() })
          .eq('id', campaignId);

        let sentCount = 0;
        let failedCount = 0;

        // Process recipients in batches
        const batchSize = 100;
        for (let i = 0; i < recipients.length; i += batchSize) {
          const batch = recipients.slice(i, i + batchSize);

          const promises = batch.map(async (recipient: any) => {
            try {
              const notificationId = uuidv4();

              // Create notification history record
              await supabase.from('notification_logs').insert({
                id: notificationId,
                user_id: recipient.userId,
                template_id: templateId,
                recipient_email: recipient.email,
                status: 'queued',
                metadata: { campaignId },
              });

              // Queue individual notification
              if (notificationQueue) {
                await notificationQueue.add('send-email', {
                  id: notificationId,
                  userId: recipient.userId,
                  templateId,
                  type: 'email',
                  recipient: recipient.email,
                  variables: { ...variables, ...recipient.variables },
                  campaignId,
                });
              }

              sentCount++;
            } catch (error) {
              failedCount++;
              logger.error('Failed to queue notification', {
                error,
                recipient: recipient.email,
              });
            }
          });

          await Promise.all(promises);

          // Update campaign progress
          await supabase
            .from('notification_campaigns')
            .update({ sent_count: sentCount, failed_count: failedCount })
            .eq('id', campaignId);
        }

        // Mark campaign as completed
        await supabase
          .from('notification_campaigns')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            total_recipients: recipients.length,
            sent_count: sentCount,
            failed_count: failedCount,
          })
          .eq('id', campaignId);

        logger.info('Bulk notification completed', {
          campaignId,
          sentCount,
          failedCount,
        });

        return { success: true, sentCount, failedCount };
      } catch (error: any) {
        logger.error('Bulk notification failed', {
          error: error.message,
          campaignId,
        });

        await supabase
          .from('notification_campaigns')
          .update({ status: 'cancelled' })
          .eq('id', campaignId);

        throw error;
      }
    },
    { connection: connection as any, concurrency: 2, lockDuration: 60000 }
  );

  logger.info('BullMQ workers initialized');
} else {
  logger.info('BullMQ workers disabled - Redis not available');
}

// Express app setup
const app = express();

// Every request reaches this service through the API gateway, so without this the
// rate limiter below keys on the GATEWAY's IP and the whole platform shares a single
// bucket. Trusting the proxy hop restores per-client limiting via X-Forwarded-For.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? String(15 * 60 * 1000), 10),
  max: parseInt(process.env.RATE_LIMIT_MAX ?? '1000', 10),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Health endpoints must never be rate limited. The gateway polls /health, and a 429
  // there made serviceRegistry mark the service unhealthy, which 503'd EVERY route
  // until the window rolled over — a self-amplifying outage.
  skip: req => req.path === '/health' || req.path === '/health/ready' || req.path === '/health/live',
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notifications-service',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    const { error } = await supabase.from('notification_templates').select('count').limit(1);
    if (error) throw error;

    // Check Redis connection only if enabled
    if (useRedis && connection) {
      // Skip ping to save commands - just check connection status
      if (connection.status !== 'ready') {
        throw new Error('Redis not ready');
      }
    }

    res.json({ status: 'ready', redis: useRedis ? 'enabled' : 'disabled' });
  } catch (error: any) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

app.get('/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Swagger documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Notifications Service API Docs',
  })
);

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Import route modules
import analyticsRouter from './routes/analytics';
import campaignsRouter from './routes/campaigns';
import notificationsRouter from './routes/notifications';
import preferencesRouter from './routes/preferences';
import templatesRouter from './routes/templates';
import trackingRouter from './routes/tracking';

// Authentication middleware.
// Requests reach this service only through the API gateway, which verifies the
// Supabase JWT and forwards the authenticated identity via X-User-* headers.
// Trust those headers to populate req.user (consumed by requireAuth/requireAdmin).
app.use((req, res, next) => {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (userId) {
    (req as any).user = {
      id: userId,
      email: (req.headers['x-user-email'] as string) || '',
      role: (req.headers['x-user-role'] as string) || 'user',
      roles: String(req.headers['x-user-roles'] ?? '')
        .split(',')
        .map(r => r.trim())
        .filter(Boolean),
    };
  }
  next();
});

// Mount API routes
app.use('/api/v1/templates', templatesRouter);
app.use('/api/v1/preferences', preferencesRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/campaigns', campaignsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/tracking', trackingRouter);

// Legacy endpoint for backward compatibility
app.post('/api/v1/notifications/send', async (req, res) => {
  try {
    const {
      userId,
      type,
      templateId,
      recipient,
      subject,
      body,
      variables,
      scheduledFor,
      priority = 3,
    } = req.body;

    // Validate required fields
    if (!userId || !type || !recipient) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, type, recipient',
      });
    }

    if (!['email', 'sms', 'push'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification type. Must be email, sms, or push',
      });
    }

    // Check user preferences
    const allowed = await PreferencesService.checkNotificationAllowed(userId, type, 'general');
    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: 'Notification not allowed by user preferences',
      });
    }

    const notificationId = uuidv4();

    // Create notification history record
    await supabase.from('notification_logs').insert({
      id: notificationId,
      user_id: userId,
      template_id: templateId,
      recipient_email: type === 'email' ? recipient : null,
      recipient_phone: type === 'sms' ? recipient : null,
      recipient_device_token: type === 'push' ? recipient : null,
      subject,
      content: body,
      status: 'queued',
      metadata: { requestId: req.requestId },
    });

    const jobData: NotificationJob = {
      id: notificationId,
      userId,
      templateId,
      type,
      recipient,
      subject,
      body,
      variables,
      priority,
      metadata: { requestId: req.requestId },
    };

    // If Redis/BullMQ is enabled, use queue
    if (useRedis && notificationQueue) {
      let job;
      if (scheduledFor) {
        const delay = new Date(scheduledFor).getTime() - Date.now();
        if (delay > 0) {
          job = await notificationQueue.add(`send-${type}`, jobData, { delay });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Scheduled time must be in the future',
          });
        }
      } else {
        // Use consolidated queue with job name to identify type
        job = await notificationQueue.add(`send-${type}`, jobData, {
          attempts: 3,
          priority,
          removeOnComplete: true, // Auto-remove completed jobs to save Redis space
          removeOnFail: false, // Keep failed jobs for debugging
        });
      }

      res.status(202).json({
        success: true,
        data: {
          notificationId,
          jobId: job.id,
          type,
          status: 'queued',
          scheduledFor: scheduledFor || null,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } else {
      // Direct processing without queue (for development/when Redis is disabled)
      logger.info('Processing notification directly (Redis disabled)', { notificationId, type });

      // Update status to processing
      await supabase
        .from('notification_logs')
        .update({ status: 'processing' })
        .eq('id', notificationId);

      res.status(202).json({
        success: true,
        data: {
          notificationId,
          jobId: null,
          type,
          status: 'processing',
          scheduledFor: null,
          note: 'Redis disabled - notification will be processed directly',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    }
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

// Worker event listeners - only if workers exist
const workers = [enhancedEmailWorker, enhancedSmsWorker, bulkWorker].filter(Boolean) as Worker[];
workers.forEach(worker => {
  worker.on('completed', job => {
    logger.info(`${worker.name} job completed`, { jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    logger.error(`${worker.name} job failed`, {
      jobId: job?.id,
      error: error.message,
    });
  });

  worker.on('error', error => {
    // Handle worker-level errors (like Redis connection issues)
    if (error.message.includes("Stream isn't writeable")) {
      logger.warn(`${worker.name} Redis connection lost, will retry...`);
    } else {
      logger.error(`${worker.name} worker error`, { error: error.message });
    }
  });

  worker.on('stalled', jobId => {
    logger.warn(`${worker.name} job stalled`, { jobId });
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Enhanced Notifications Service started`, {
    port: PORT,
    version: '2.1.0',
    features: ['templates', 'preferences', 'scheduling', 'bulk', 'analytics'],
    redis: useRedis ? 'enabled' : 'disabled',
    deployment: 'railway-redeployment-v2.1.0',
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down notifications service...');

  // Close workers if they exist
  if (enhancedEmailWorker) await enhancedEmailWorker.close();
  if (enhancedSmsWorker) await enhancedSmsWorker.close();
  if (bulkWorker) await bulkWorker.close();
  if (connection) await connection.quit();

  logger.info('Notifications service shutdown complete');
  process.exit(0);
});

export default app;
