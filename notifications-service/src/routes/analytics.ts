import { createClient } from '@supabase/supabase-js';
import { Request, Response, Router } from 'express';
import winston from 'winston';

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

// GET /api/v1/analytics/delivery-rates - Delivery success rates
router.get('/delivery-rates', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      date_from,
      date_to,
      type,
      group_by = 'day', // day, week, month
    } = req.query;

    // Validate group_by parameter
    if (!['day', 'week', 'month'].includes(group_by as string)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid group_by parameter. Must be day, week, or month',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Build date truncation based on group_by
    const dateTrunc = group_by === 'day' ? 'day' : group_by === 'week' ? 'week' : 'month';

    let query = `
      SELECT 
        DATE_TRUNC('${dateTrunc}', created_at) as period,
        type,
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened', 'clicked')) as successful,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
        ROUND(
          (COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened', 'clicked'))::numeric / 
           NULLIF(COUNT(*), 0) * 100), 2
        ) as success_rate,
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'delivered')::numeric / 
           NULLIF(COUNT(*), 0) * 100), 2
        ) as delivery_rate
      FROM notification_logs 
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (date_from) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }

    if (type && ['email', 'sms', 'push'].includes(type as string)) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += `
      GROUP BY DATE_TRUNC('${dateTrunc}', created_at), type
      ORDER BY period DESC, type
    `;

    const { data, error } = await supabase.rpc('execute_sql', {
      query,
      params,
    });

    if (error) {
      logger.error('Failed to fetch delivery rates', { error, requestId: req.requestId });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch delivery rates',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Calculate overall statistics
    const overall = {
      total_sent: 0,
      successful: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
      success_rate: 0,
      delivery_rate: 0,
    };

    data.forEach((row: any) => {
      overall.total_sent += parseInt(row.total_sent);
      overall.successful += parseInt(row.successful);
      overall.delivered += parseInt(row.delivered);
      overall.failed += parseInt(row.failed);
      overall.bounced += parseInt(row.bounced);
    });

    if (overall.total_sent > 0) {
      overall.success_rate = Math.round((overall.successful / overall.total_sent) * 10000) / 100;
      overall.delivery_rate = Math.round((overall.delivered / overall.total_sent) * 10000) / 100;
    }

    res.json({
      success: true,
      data: {
        overall,
        by_period: data || [],
        filters: {
          date_from,
          date_to,
          type,
          group_by,
        },
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error fetching delivery rates', {
      error: error.message,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// GET /api/v1/analytics/engagement - Notification engagement metrics
router.get('/engagement', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date_from, date_to, type, template_id, group_by = 'day' } = req.query;

    // Validate group_by parameter
    if (!['day', 'week', 'month'].includes(group_by as string)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid group_by parameter. Must be day, week, or month',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    const dateTrunc = group_by === 'day' ? 'day' : group_by === 'week' ? 'week' : 'month';

    let query = `
      SELECT 
        DATE_TRUNC('${dateTrunc}', created_at) as period,
        type,
        template_id,
        COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened', 'clicked')) as sent,
        COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked')) as delivered,
        COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')) as opened,
        COUNT(*) FILTER (WHERE status = 'clicked') as clicked,
        ROUND(
          (COUNT(*) FILTER (WHERE status IN ('opened', 'clicked'))::numeric / 
           NULLIF(COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked')), 0) * 100), 2
        ) as open_rate,
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'clicked')::numeric / 
           NULLIF(COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')), 0) * 100), 2
        ) as click_rate,
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'clicked')::numeric / 
           NULLIF(COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked')), 0) * 100), 2
        ) as click_through_rate
      FROM notification_logs 
      WHERE type = 'email'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (date_from) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }

    if (template_id) {
      query += ` AND template_id = $${paramIndex}`;
      params.push(template_id);
      paramIndex++;
    }

    query += `
      GROUP BY DATE_TRUNC('${dateTrunc}', created_at), type, template_id
      ORDER BY period DESC, type, template_id
    `;

    const { data, error } = await supabase.rpc('execute_sql', {
      query,
      params,
    });

    if (error) {
      logger.error('Failed to fetch engagement metrics', { error, requestId: req.requestId });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch engagement metrics',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Calculate overall engagement statistics
    const overall = {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      open_rate: 0,
      click_rate: 0,
      click_through_rate: 0,
    };

    data.forEach((row: any) => {
      overall.sent += parseInt(row.sent);
      overall.delivered += parseInt(row.delivered);
      overall.opened += parseInt(row.opened);
      overall.clicked += parseInt(row.clicked);
    });

    if (overall.delivered > 0) {
      overall.open_rate = Math.round((overall.opened / overall.delivered) * 10000) / 100;
      overall.click_through_rate = Math.round((overall.clicked / overall.delivered) * 10000) / 100;
    }

    if (overall.opened > 0) {
      overall.click_rate = Math.round((overall.clicked / overall.opened) * 10000) / 100;
    }

    res.json({
      success: true,
      data: {
        overall,
        by_period: data || [],
        filters: {
          date_from,
          date_to,
          type,
          template_id,
          group_by,
        },
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error fetching engagement metrics', {
      error: error.message,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// GET /api/v1/analytics/volume - Notification volume statistics
router.get('/volume', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date_from, date_to, type, group_by = 'day' } = req.query;

    // Validate group_by parameter
    if (!['hour', 'day', 'week', 'month'].includes(group_by as string)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid group_by parameter. Must be hour, day, week, or month',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    const dateTrunc = group_by as string;

    let query = `
      SELECT 
        DATE_TRUNC('${dateTrunc}', created_at) as period,
        type,
        COUNT(*) as total_notifications,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT template_id) as unique_templates,
        AVG(
          CASE 
            WHEN sent_at IS NOT NULL AND created_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (sent_at - created_at))
            ELSE NULL 
          END
        ) as avg_processing_time_seconds
      FROM notification_logs 
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (date_from) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }

    if (type && ['email', 'sms', 'push'].includes(type as string)) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += `
      GROUP BY DATE_TRUNC('${dateTrunc}', created_at), type
      ORDER BY period DESC, type
    `;

    const { data, error } = await supabase.rpc('execute_sql', {
      query,
      params,
    });

    if (error) {
      logger.error('Failed to fetch volume statistics', { error, requestId: req.requestId });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch volume statistics',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Calculate trends and totals
    const overall = {
      total_notifications: 0,
      unique_users: new Set(),
      unique_templates: new Set(),
      avg_processing_time_seconds: 0,
    };

    let totalProcessingTime = 0;
    let processedCount = 0;

    data.forEach((row: any) => {
      overall.total_notifications += parseInt(row.total_notifications);

      if (row.avg_processing_time_seconds) {
        totalProcessingTime +=
          parseFloat(row.avg_processing_time_seconds) * parseInt(row.total_notifications);
        processedCount += parseInt(row.total_notifications);
      }
    });

    if (processedCount > 0) {
      overall.avg_processing_time_seconds =
        Math.round((totalProcessingTime / processedCount) * 100) / 100;
    }

    // Calculate growth trends (compare with previous period)
    const trends = await calculateTrends(
      date_from as string,
      date_to as string,
      type as string,
      group_by as string
    );

    res.json({
      success: true,
      data: {
        overall: {
          total_notifications: overall.total_notifications,
          avg_processing_time_seconds: overall.avg_processing_time_seconds,
        },
        trends,
        by_period: data || [],
        filters: {
          date_from,
          date_to,
          type,
          group_by,
        },
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error fetching volume statistics', {
      error: error.message,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// GET /api/v1/analytics/templates - Template performance analytics
router.get('/templates', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date_from, date_to, type, limit = 10 } = req.query;

    let query = `
      SELECT 
        nt.id,
        nt.name,
        nt.type,
        COUNT(nl.*) as total_sent,
        COUNT(*) FILTER (WHERE nl.status IN ('delivered', 'opened', 'clicked')) as delivered,
        COUNT(*) FILTER (WHERE nl.status IN ('opened', 'clicked')) as opened,
        COUNT(*) FILTER (WHERE nl.status = 'clicked') as clicked,
        COUNT(*) FILTER (WHERE nl.status = 'failed') as failed,
        ROUND(
          (COUNT(*) FILTER (WHERE nl.status IN ('delivered', 'opened', 'clicked'))::numeric / 
           NULLIF(COUNT(nl.*), 0) * 100), 2
        ) as delivery_rate,
        ROUND(
          (COUNT(*) FILTER (WHERE nl.status IN ('opened', 'clicked'))::numeric / 
           NULLIF(COUNT(*) FILTER (WHERE nl.status IN ('delivered', 'opened', 'clicked')), 0) * 100), 2
        ) as open_rate,
        ROUND(
          (COUNT(*) FILTER (WHERE nl.status = 'clicked')::numeric / 
           NULLIF(COUNT(*) FILTER (WHERE nl.status IN ('opened', 'clicked')), 0) * 100), 2
        ) as click_rate
      FROM notification_templates nt
      LEFT JOIN notification_logs nl ON nt.id = nl.template_id
      WHERE nt.is_active = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (date_from) {
      query += ` AND nl.created_at >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      query += ` AND nl.created_at <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }

    if (type && ['email', 'sms', 'push'].includes(type as string)) {
      query += ` AND nt.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += `
      GROUP BY nt.id, nt.name, nt.type
      HAVING COUNT(nl.*) > 0
      ORDER BY total_sent DESC
      LIMIT $${paramIndex}
    `;
    params.push(parseInt(limit as string));

    const { data, error } = await supabase.rpc('execute_sql', {
      query,
      params,
    });

    if (error) {
      logger.error('Failed to fetch template analytics', { error, requestId: req.requestId });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch template analytics',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    res.json({
      success: true,
      data: data || [],
      filters: {
        date_from,
        date_to,
        type,
        limit,
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error fetching template analytics', {
      error: error.message,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// GET /api/v1/analytics/users - User notification behavior analytics
router.get('/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date_from, date_to, type, limit = 20 } = req.query;

    let query = `
      SELECT 
        nl.user_id,
        up.email,
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE nl.status IN ('delivered', 'opened', 'clicked')) as delivered,
        COUNT(*) FILTER (WHERE nl.status IN ('opened', 'clicked')) as opened,
        COUNT(*) FILTER (WHERE nl.status = 'clicked') as clicked,
        COUNT(DISTINCT nl.template_id) as unique_templates_received,
        MAX(nl.created_at) as last_notification_at,
        ROUND(
          (COUNT(*) FILTER (WHERE nl.status IN ('opened', 'clicked'))::numeric / 
           NULLIF(COUNT(*) FILTER (WHERE nl.status IN ('delivered', 'opened', 'clicked')), 0) * 100), 2
        ) as engagement_rate
      FROM notification_logs nl
      LEFT JOIN user_profiles up ON nl.user_id = up.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (date_from) {
      query += ` AND nl.created_at >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      query += ` AND nl.created_at <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }

    if (type && ['email', 'sms', 'push'].includes(type as string)) {
      query += ` AND nl.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += `
      GROUP BY nl.user_id, up.email
      HAVING COUNT(*) > 0
      ORDER BY engagement_rate DESC, total_notifications DESC
      LIMIT $${paramIndex}
    `;
    params.push(parseInt(limit as string));

    const { data, error } = await supabase.rpc('execute_sql', {
      query,
      params,
    });

    if (error) {
      logger.error('Failed to fetch user analytics', { error, requestId: req.requestId });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user analytics',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    res.json({
      success: true,
      data: data || [],
      filters: {
        date_from,
        date_to,
        type,
        limit,
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error fetching user analytics', {
      error: error.message,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// Helper function to calculate trends
async function calculateTrends(dateFrom: string, dateTo: string, type: string, groupBy: string) {
  try {
    // Calculate the previous period for comparison
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const periodLength = toDate.getTime() - fromDate.getTime();

    const prevFromDate = new Date(fromDate.getTime() - periodLength);
    const prevToDate = new Date(fromDate.getTime());

    // Get current period stats
    let currentQuery = `
      SELECT COUNT(*) as total
      FROM notification_logs 
      WHERE created_at >= $1 AND created_at <= $2
    `;

    const currentParams = [dateFrom, dateTo];
    if (type && ['email', 'sms', 'push'].includes(type)) {
      currentQuery += ' AND type = $3';
      currentParams.push(type);
    }

    // Get previous period stats
    let prevQuery = `
      SELECT COUNT(*) as total
      FROM notification_logs 
      WHERE created_at >= $1 AND created_at <= $2
    `;

    const prevParams = [prevFromDate.toISOString(), prevToDate.toISOString()];
    if (type && ['email', 'sms', 'push'].includes(type)) {
      prevQuery += ' AND type = $3';
      prevParams.push(type);
    }

    const [currentResult, prevResult] = await Promise.all([
      supabase.rpc('execute_sql', { query: currentQuery, params: currentParams }),
      supabase.rpc('execute_sql', { query: prevQuery, params: prevParams }),
    ]);

    const currentTotal = currentResult.data?.[0]?.total || 0;
    const prevTotal = prevResult.data?.[0]?.total || 0;

    let growthRate = 0;
    if (prevTotal > 0) {
      growthRate = Math.round(((currentTotal - prevTotal) / prevTotal) * 10000) / 100;
    } else if (currentTotal > 0) {
      growthRate = 100; // 100% growth from 0
    }

    return {
      current_period: currentTotal,
      previous_period: prevTotal,
      growth_rate: growthRate,
      growth_direction: growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'stable',
    };
  } catch (error) {
    logger.error('Error calculating trends', { error });
    return {
      current_period: 0,
      previous_period: 0,
      growth_rate: 0,
      growth_direction: 'stable',
    };
  }
}

export default router;
