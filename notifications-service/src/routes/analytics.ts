import { createClient } from '@supabase/supabase-js';
import { Request, Response, Router } from 'express';
import winston from 'winston';
import { isPlatformAdmin } from '../utils/adminRoles.js';
import {
  countLogs,
  deliveryRates,
  engagement as engagementRows,
  templatePerformance,
  userAnalytics,
  volume as volumeRows,
  type GroupBy,
  type LogFilters,
} from '../utils/analyticsQueries.js';

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
// Performs case-insensitive role comparison
// Accepts admin/super_admin plus NIPOST DOP-tier roles, across both the `role`
// claim and the `roles` array (see utils/adminRoles.ts).
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: Function) => {
  if (!isPlatformAdmin(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
  next();
};

/**
 * @swagger
 * /analytics/delivery-rates:
 *   get:
 *     tags: [Analytics]
 *     summary: Delivery success rates
 *     description: >-
 *       Verified live 2026-08-18 → HTTP 403. ⚠️ Authorization is driven by the inbound x-user-role header (index.ts:842), not the JWT, and requireAdmin accepts only admin/super_admin — so this intermittently returns 403 for real admins. See docs/API_VERIFICATION_2026-08-18.md (V7).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       403:
 *         description: See description — current live behaviour
 *       200:
 *         description: Success (expected once the defect above is fixed)
 */
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

    // V8: replaced a non-existent `execute_sql` RPC (see utils/analyticsQueries.ts).
    const filters: LogFilters = {
      date_from: date_from as string | undefined,
      date_to: date_to as string | undefined,
      type: type as string | undefined,
    };
    let data: unknown[] | null = null;
    let error: { message: string } | null = null;
    try {
      data = await deliveryRates(dateTrunc as GroupBy, filters);
    } catch (e) {
      error = { message: (e as Error).message };
    }

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

/**
 * @swagger
 * /analytics/engagement:
 *   get:
 *     tags: [Analytics]
 *     summary: Notification engagement metrics
 *     description: >-
 *       Verified live 2026-08-18 → HTTP 403. ⚠️ Authorization is driven by the inbound x-user-role header (index.ts:842), not the JWT, and requireAdmin accepts only admin/super_admin — so this intermittently returns 403 for real admins. See docs/API_VERIFICATION_2026-08-18.md (V7).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       403:
 *         description: See description — current live behaviour
 *       200:
 *         description: Success (expected once the defect above is fixed)
 */
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

    // V8: replaced a non-existent `execute_sql` RPC (see utils/analyticsQueries.ts).
    const filters: LogFilters = {
      date_from: date_from as string | undefined,
      date_to: date_to as string | undefined,
      type: type as string | undefined,
    };
    let data: unknown[] | null = null;
    let error: { message: string } | null = null;
    try {
      data = await engagementRows(dateTrunc as GroupBy, filters);
    } catch (e) {
      error = { message: (e as Error).message };
    }

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

/**
 * @swagger
 * /analytics/volume:
 *   get:
 *     tags: [Analytics]
 *     summary: Notification volume statistics
 *     description: >-
 *       Verified live 2026-08-18 → HTTP 403. ⚠️ Authorization is driven by the inbound x-user-role header (index.ts:842), not the JWT, and requireAdmin accepts only admin/super_admin — so this intermittently returns 403 for real admins. See docs/API_VERIFICATION_2026-08-18.md (V7).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       403:
 *         description: See description — current live behaviour
 *       200:
 *         description: Success (expected once the defect above is fixed)
 */
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

    // V8: replaced a non-existent `execute_sql` RPC (see utils/analyticsQueries.ts).
    const filters: LogFilters = {
      date_from: date_from as string | undefined,
      date_to: date_to as string | undefined,
      type: type as string | undefined,
    };
    let data: unknown[] | null = null;
    let error: { message: string } | null = null;
    try {
      data = await volumeRows(dateTrunc as GroupBy, filters);
    } catch (e) {
      error = { message: (e as Error).message };
    }

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

/**
 * @swagger
 * /analytics/templates:
 *   get:
 *     tags: [Analytics]
 *     summary: Template performance analytics
 *     description: >-
 *       Verified live 2026-08-18 → HTTP 403. ⚠️ Authorization is driven by the inbound x-user-role header (index.ts:842), not the JWT, and requireAdmin accepts only admin/super_admin — so this intermittently returns 403 for real admins. See docs/API_VERIFICATION_2026-08-18.md (V7).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       403:
 *         description: See description — current live behaviour
 *       200:
 *         description: Success (expected once the defect above is fixed)
 */
// GET /api/v1/analytics/templates - Template performance analytics
router.get('/templates', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date_from, date_to, type, limit = 10 } = req.query;

    // V8: replaced a non-existent `execute_sql` RPC (see utils/analyticsQueries.ts).
    const filters: LogFilters = {
      date_from: date_from as string | undefined,
      date_to: date_to as string | undefined,
      type: type as string | undefined,
    };
    let data: unknown[] | null = null;
    let error: { message: string } | null = null;
    try {
      data = await templatePerformance(filters);
    } catch (e) {
      error = { message: (e as Error).message };
    }

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

/**
 * @swagger
 * /analytics/users:
 *   get:
 *     tags: [Analytics]
 *     summary: User notification behavior analytics
 *     description: >-
 *       Verified live 2026-08-18 → HTTP 403. ⚠️ Authorization is driven by the inbound x-user-role header (index.ts:842), not the JWT, and requireAdmin accepts only admin/super_admin — so this intermittently returns 403 for real admins. See docs/API_VERIFICATION_2026-08-18.md (V7).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       403:
 *         description: See description — current live behaviour
 *       200:
 *         description: Success (expected once the defect above is fixed)
 */
// GET /api/v1/analytics/users - User notification behavior analytics
router.get('/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date_from, date_to, type, limit = 20 } = req.query;

    // V8: replaced a non-existent `execute_sql` RPC (see utils/analyticsQueries.ts).
    const filters: LogFilters = {
      date_from: date_from as string | undefined,
      date_to: date_to as string | undefined,
      type: type as string | undefined,
    };
    let data: unknown[] | null = null;
    let error: { message: string } | null = null;
    try {
      data = await userAnalytics(filters);
    } catch (e) {
      error = { message: (e as Error).message };
    }

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
    // V8: replaced the non-existent `execute_sql` RPC with plain counts.
    const typeFilter = type && ['email', 'sms', 'push'].includes(type) ? type : undefined;
    const [currentTotal, prevTotal] = await Promise.all([
      countLogs({ date_from: dateFrom, date_to: dateTo, type: typeFilter }),
      countLogs({
        date_from: prevFromDate.toISOString(),
        date_to: prevToDate.toISOString(),
        type: typeFilter,
      }),
    ]);

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
