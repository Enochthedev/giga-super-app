import { createClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import { Request, Response, Router } from 'express';
import IORedis from 'ioredis';
import winston from 'winston';
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

const campaignQueue = new Queue('campaign-notifications', { connection: connection as any });

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  requestId?: string;
}

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

// GET /api/v1/campaigns - List campaigns
router.get('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, type, template_id, date_from, date_to, page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('notification_campaigns')
      .select(
        `
        *,
        notification_templates(name, type)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    // Apply filters
    if (
      status &&
      ['draft', 'scheduled', 'sending', 'completed', 'cancelled'].includes(status as string)
    ) {
      query = query.eq('status', status);
    }
    if (type && ['email', 'sms', 'push'].includes(type as string)) {
      query = query.eq('type', type);
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
      logger.error('Failed to fetch campaigns', { error, requestId: req.requestId });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch campaigns',
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
    logger.error('Error fetching campaigns', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// GET /api/v1/campaigns/:id - Get specific campaign
router.get('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notification_campaigns')
      .select(
        `
        *,
        notification_templates(name, type, subject, body, variables)
      `
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    res.json({
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error fetching campaign', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// POST /api/v1/campaigns - Create campaign
router.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      template_id,
      type,
      target_audience = {},
      variables = {},
      scheduled_for,
    } = req.body;

    // Validate required fields
    if (!name || !template_id || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, template_id, type',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    if (!['email', 'sms', 'push'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be email, sms, or push',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Validate template exists and matches type
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', template_id)
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
        error: `Template type (${template.type}) does not match campaign type (${type})`,
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Validate scheduled time if provided
    if (scheduled_for) {
      const scheduledTime = new Date(scheduled_for);
      if (scheduledTime <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Scheduled time must be in the future',
          metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
        });
      }
    }

    // Calculate target audience size
    let recipientCount = 0;
    try {
      recipientCount = await calculateAudienceSize(target_audience, type);
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: 'Invalid target audience criteria',
        details: { error: error.message },
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    if (recipientCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'No recipients match the target audience criteria',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Create campaign
    const { data, error } = await supabase
      .from('notification_campaigns')
      .insert({
        name,
        template_id,
        type,
        target_audience,
        variables,
        status: scheduled_for ? 'scheduled' : 'draft',
        scheduled_for,
        total_recipients: recipientCount,
        created_by: req.user!.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create campaign', { error, requestId: req.requestId });
      return res.status(500).json({
        success: false,
        error: 'Failed to create campaign',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    logger.info('Campaign created', {
      campaignId: data.id,
      name,
      type,
      recipientCount,
      createdBy: req.user!.id,
      requestId: req.requestId,
    });

    res.status(201).json({
      success: true,
      data: {
        ...data,
        estimated_recipients: recipientCount,
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error creating campaign', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// PUT /api/v1/campaigns/:id - Update campaign
router.put('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if campaign exists and can be updated
    const { data: existing, error: fetchError } = await supabase
      .from('notification_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Only draft and scheduled campaigns can be updated
    if (!['draft', 'scheduled'].includes(existing.status)) {
      return res.status(400).json({
        success: false,
        error: 'Only draft and scheduled campaigns can be updated',
        details: { current_status: existing.status },
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Remove fields that shouldn't be updated directly
    const { id: _, created_by, created_at, started_at, completed_at, ...allowedUpdates } = updates;

    // Validate template if being updated
    if (allowedUpdates.template_id && allowedUpdates.template_id !== existing.template_id) {
      const { data: template, error: templateError } = await supabase
        .from('notification_templates')
        .select('type')
        .eq('id', allowedUpdates.template_id)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found or inactive',
          metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
        });
      }

      const campaignType = allowedUpdates.type || existing.type;
      if (template.type !== campaignType) {
        return res.status(400).json({
          success: false,
          error: `Template type (${template.type}) does not match campaign type (${campaignType})`,
          metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
        });
      }
    }

    // Recalculate audience size if target_audience changed
    if (allowedUpdates.target_audience) {
      try {
        const recipientCount = await calculateAudienceSize(
          allowedUpdates.target_audience,
          allowedUpdates.type || existing.type
        );
        allowedUpdates.total_recipients = recipientCount;
      } catch (error: any) {
        return res.status(400).json({
          success: false,
          error: 'Invalid target audience criteria',
          details: { error: error.message },
          metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
        });
      }
    }

    // Validate scheduled time if being updated
    if (allowedUpdates.scheduled_for) {
      const scheduledTime = new Date(allowedUpdates.scheduled_for);
      if (scheduledTime <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Scheduled time must be in the future',
          metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
        });
      }
    }

    allowedUpdates.updated_at = new Date().toISOString();

    // Update campaign
    const { data, error } = await supabase
      .from('notification_campaigns')
      .update(allowedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update campaign', { error, requestId: req.requestId });
      return res.status(500).json({
        success: false,
        error: 'Failed to update campaign',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    logger.info('Campaign updated', {
      campaignId: id,
      changes: Object.keys(allowedUpdates),
      updatedBy: req.user!.id,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error updating campaign', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// POST /api/v1/campaigns/:id/send - Send campaign
router.post('/:id/send', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { send_immediately = false } = req.body;

    // Get campaign details
    const { data: campaign, error } = await supabase
      .from('notification_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Check if campaign can be sent
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        error: 'Campaign cannot be sent',
        details: { current_status: campaign.status },
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Check if scheduled time has passed or send_immediately is true
    const now = new Date();
    const scheduledTime = campaign.scheduled_for ? new Date(campaign.scheduled_for) : null;

    if (scheduledTime && scheduledTime > now && !send_immediately) {
      return res.status(400).json({
        success: false,
        error: 'Campaign is scheduled for future. Use send_immediately=true to override.',
        details: { scheduled_for: campaign.scheduled_for },
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Get recipients based on target audience
    const recipients = await getAudienceRecipients(campaign.target_audience, campaign.type);

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No recipients found for target audience',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Update campaign status
    await supabase
      .from('notification_campaigns')
      .update({
        status: 'sending',
        started_at: new Date().toISOString(),
        total_recipients: recipients.length,
      })
      .eq('id', id);

    // Queue campaign job
    const job = await campaignQueue.add('send-campaign', {
      campaignId: id,
      templateId: campaign.template_id,
      type: campaign.type,
      recipients,
      variables: campaign.variables,
      metadata: {
        requestId: req.requestId,
        startedBy: req.user!.id,
      },
    });

    logger.info('Campaign sending started', {
      campaignId: id,
      recipientCount: recipients.length,
      startedBy: req.user!.id,
      jobId: job.id,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: {
        campaign_id: id,
        job_id: job.id,
        status: 'sending',
        recipient_count: recipients.length,
        started_at: new Date().toISOString(),
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error sending campaign', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: 'Failed to send campaign',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// POST /api/v1/campaigns/:id/cancel - Cancel campaign
router.post('/:id/cancel', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get campaign details
    const { data: campaign, error } = await supabase
      .from('notification_campaigns')
      .select('status')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Check if campaign can be cancelled
    if (!['draft', 'scheduled', 'sending'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        error: 'Campaign cannot be cancelled',
        details: { current_status: campaign.status },
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Update campaign status
    const { error: updateError } = await supabase
      .from('notification_campaigns')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      logger.error('Failed to cancel campaign', { error: updateError, requestId: req.requestId });
      return res.status(500).json({
        success: false,
        error: 'Failed to cancel campaign',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    logger.info('Campaign cancelled', {
      campaignId: id,
      cancelledBy: req.user!.id,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: {
        campaign_id: id,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error cancelling campaign', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: 'Failed to cancel campaign',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// GET /api/v1/campaigns/:id/stats - Get campaign statistics
router.get('/:id/stats', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if campaign exists
    const { data: campaign, error } = await supabase
      .from('notification_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Get delivery statistics
    const stats = await DeliveryTracking.getCampaignDeliveryStats(id);

    // Calculate additional metrics
    const duration =
      campaign.completed_at && campaign.started_at
        ? new Date(campaign.completed_at).getTime() - new Date(campaign.started_at).getTime()
        : null;

    const response = {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        created_at: campaign.created_at,
        started_at: campaign.started_at,
        completed_at: campaign.completed_at,
        duration_ms: duration,
        duration_minutes: duration ? Math.round((duration / (1000 * 60)) * 100) / 100 : null,
      },
      delivery: stats,
      performance: {
        success_rate:
          stats.total_recipients > 0
            ? Math.round((stats.delivered_count / stats.total_recipients) * 10000) / 100
            : 0,
        engagement_rate:
          stats.delivered_count > 0
            ? Math.round(
                ((stats.opened_count + stats.clicked_count) / stats.delivered_count) * 10000
              ) / 100
            : 0,
      },
    };

    res.json({
      success: true,
      data: response,
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error fetching campaign stats', {
      error: error.message,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign statistics',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// Helper function to calculate audience size
async function calculateAudienceSize(targetAudience: any, type: string): Promise<number> {
  let query = supabase.from('user_profiles').select('id', { count: 'exact', head: true });

  // Apply audience filters
  if (targetAudience.user_roles && targetAudience.user_roles.length > 0) {
    query = query.in('role', targetAudience.user_roles);
  }

  if (targetAudience.created_after) {
    query = query.gte('created_at', targetAudience.created_after);
  }

  if (targetAudience.created_before) {
    query = query.lte('created_at', targetAudience.created_before);
  }

  if (targetAudience.active_only) {
    query = query.eq('is_active', true);
  }

  // Filter by notification preferences
  if (type === 'email') {
    query = query.eq('notification_preferences.email_enabled', true);
  } else if (type === 'sms') {
    query = query.eq('notification_preferences.sms_enabled', true);
  } else if (type === 'push') {
    query = query.eq('notification_preferences.push_enabled', true);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to calculate audience size: ${error.message}`);
  }

  return count || 0;
}

// Helper function to get actual recipients
async function getAudienceRecipients(targetAudience: any, type: string): Promise<any[]> {
  let query = supabase
    .from('user_profiles')
    .select('id, email, phone, push_token, notification_preferences');

  // Apply audience filters (same as calculateAudienceSize)
  if (targetAudience.user_roles && targetAudience.user_roles.length > 0) {
    query = query.in('role', targetAudience.user_roles);
  }

  if (targetAudience.created_after) {
    query = query.gte('created_at', targetAudience.created_after);
  }

  if (targetAudience.created_before) {
    query = query.lte('created_at', targetAudience.created_before);
  }

  if (targetAudience.active_only) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get audience recipients: ${error.message}`);
  }

  // Filter and format recipients based on type and preferences
  const recipients = [];
  for (const user of data || []) {
    let recipient = null;
    let enabled = false;

    switch (type) {
      case 'email':
        recipient = user.email;
        enabled = user.notification_preferences?.email_enabled !== false;
        break;
      case 'sms':
        recipient = user.phone;
        enabled = user.notification_preferences?.sms_enabled !== false;
        break;
      case 'push':
        recipient = user.push_token;
        enabled = user.notification_preferences?.push_enabled !== false;
        break;
    }

    if (recipient && enabled) {
      recipients.push({
        userId: user.id,
        recipient,
        variables: {
          userId: user.id,
          email: user.email,
          phone: user.phone,
        },
      });
    }
  }

  return recipients;
}

export default router;
