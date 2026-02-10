import { Response, Router } from 'express';
import winston from 'winston';
import { createAudit } from '../middleware/audit';
import { AuthRequest, authenticate } from '../middleware/auth';
import { supabase } from '../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * GET /api/dashboard/stats
 * Get main dashboard statistics
 */
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const { data, error } = await supabase.rpc('get_giga_dashboard_stats', {
      start_date: startDate || null,
      end_date: endDate || null,
    });

    if (error) throw error;

    await createAudit(req, 'view_dashboard_stats', 'giga_dashboard');

    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Failed to get dashboard stats', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

/**
 * GET /api/dashboard/sales-comparison
 * Get sales comparison between periods
 */
router.get('/sales-comparison', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const { data, error } = await supabase.rpc('get_sales_comparison', {
      current_period_start: startDate || null,
      current_period_end: endDate || null,
    });

    if (error) throw error;

    await createAudit(req, 'view_sales_comparison', 'sales_analytics');

    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Failed to get sales comparison', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch sales comparison' });
  }
});

/**
 * GET /api/dashboard/category-breakdown
 * Get revenue breakdown by category
 */
router.get('/category-breakdown', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase.rpc('get_category_breakdown');

    if (error) throw error;

    await createAudit(req, 'view_category_breakdown', 'category_analytics');

    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Failed to get category breakdown', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch category breakdown' });
  }
});

export default router;
