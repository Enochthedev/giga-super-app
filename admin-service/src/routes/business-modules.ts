import { Response, Router } from 'express';
import winston from 'winston';
import { createAudit } from '../middleware/audit';
import { AuthRequest, authenticate } from '../middleware/auth';
import {
  SELECT_FIELDS,
  calculatePagination,
  getPaginationRange,
  supabase,
} from '../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * GET /api/ecommerce/traders
 * Get paginated list of e-commerce traders/vendors
 */
router.get('/ecommerce/traders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, status } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('ecommerce_vendors')
      .select(SELECT_FIELDS.VENDOR, { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('business_name', `%${search}%`);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    const { data: traders, count, error } = await query;

    if (error) throw error;

    await createAudit(req, 'view_traders', 'ecommerce_traders');

    res.json({
      success: true,
      data: { traders },
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: any) {
    logger.error('Failed to get traders', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch traders' });
  }
});

/**
 * GET /api/taxi/drivers
 * Get paginated list of taxi drivers
 */
router.get('/taxi/drivers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, status } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('driver_profiles')
      .select(
        `
        ${SELECT_FIELDS.DRIVER},
        user:user_profiles!user_id (
          first_name,
          last_name,
          email,
          phone,
          avatar_url
        )
      `,
        { count: 'exact' }
      )
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('license_number', `%${search}%`);
    }

    if (status === 'active') {
      query = query.eq('is_verified', true);
    } else if (status === 'inactive') {
      query = query.eq('is_verified', false);
    }

    const { data: drivers, count, error } = await query;

    if (error) throw error;

    await createAudit(req, 'view_drivers', 'taxi_drivers');

    res.json({
      success: true,
      data: { drivers },
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: any) {
    logger.error('Failed to get drivers', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

/**
 * GET /api/hotel/hotels
 * Get paginated list of hotels
 */
router.get('/hotel/hotels', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, status } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('hotels')
      .select(
        `
        ${SELECT_FIELDS.HOTEL},
        host:user_profiles!host_id (
          first_name,
          last_name,
          email,
          phone
        )
      `,
        { count: 'exact' }
      )
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    const { data: hotels, count, error } = await query;

    if (error) throw error;

    await createAudit(req, 'view_hotels', 'hotel_listings');

    res.json({
      success: true,
      data: { hotels },
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: any) {
    logger.error('Failed to get hotels', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

/**
 * GET /api/media/content
 * Get paginated list of media files
 */
router.get('/media/content', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', type } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('file_metadata')
      .select(
        `
        id,
        original_name,
        mime_type,
        size_bytes,
        storage_path,
        access_level,
        status,
        created_at,
        uploaded_by,
        user_profiles!uploaded_by(first_name, last_name, email)
      `,
        { count: 'exact' }
      )
      .range(from, to)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('mime_type', type as string);
    }

    const { data: content, count, error } = await query;

    if (error) throw error;

    await createAudit(req, 'view_media_content', 'media_files');

    res.json({
      success: true,
      data: { content },
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: any) {
    logger.error('Failed to get media content', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch media content' });
  }
});

export default router;
