import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit } from '../../middleware/audit';
import { AuthRequest, authenticate, requireAdmin, requireAnyAccess } from '../../middleware/auth';
import { calculatePagination, getPaginationRange, supabase } from '../../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * @swagger
 * /api/managers/media/files:
 *   get:
 *     tags: [Manager - Media]
 *     summary: Get media files
 *     description: Retrieve paginated list of uploaded files with filtering
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, document, audio]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, pending]
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 files:
 *                   - id: "f1234567-89ab-cdef-0123-456789abcdef"
 *                     original_name: "product-image.jpg"
 *                     mime_type: "image/jpeg"
 *                     size_bytes: 245000
 *                     storage_path: "uploads/products/product-image.jpg"
 *                     access_level: "public"
 *                     status: "active"
 *                     metadata:
 *                       width: 1920
 *                       height: 1080
 *                     created_at: "2026-02-10T10:30:00Z"
 *                     uploaded_by: "u1234567-89ab-cdef-0123-456789abcdef"
 *                     user_profiles:
 *                       first_name: "John"
 *                       last_name: "Uploader"
 *                       email: "john@example.com"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 5000
 *                 pages: 250
 */
router.get('/files', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', type, status } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('file_metadata')
      .select(
        `id, original_name, mime_type, size_bytes, storage_path, access_level, status,
         metadata, created_at, uploaded_by,
         user_profiles!inner(first_name, last_name, email)`,
        { count: 'exact' }
      )
      .range(from, to)
      .order('created_at', { ascending: false });

    if (type) {
      const mimePrefix =
        type === 'image'
          ? 'image/'
          : type === 'video'
            ? 'video/'
            : type === 'audio'
              ? 'audio/'
              : 'application/';
      query = query.ilike('mime_type', `${mimePrefix}%`);
    }
    if (status) query = query.eq('status', status);

    const { data: files, count, error } = await query;
    if (error) throw error;

    await createAudit(req, 'view_files', 'file_metadata');
    res.json({
      success: true,
      data: { files },
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get files', { error: msg });
    res.status(500).json({ success: false, error: 'Failed to fetch files' });
  }
});

/**
 * @swagger
 * /api/managers/media/files/{id}:
 *   get:
 *     tags: [Manager - Media]
 *     summary: Get file details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: File details retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 file:
 *                   id: "f1234567-89ab-cdef-0123-456789abcdef"
 *                   original_name: "product-image.jpg"
 *                   mime_type: "image/jpeg"
 *                   size_bytes: 245000
 *                   storage_path: "uploads/products/product-image.jpg"
 *                   public_url: "https://storage.example.com/uploads/products/product-image.jpg"
 *                   access_level: "public"
 *                   status: "active"
 *                   metadata:
 *                     width: 1920
 *                     height: 1080
 *                     format: "jpeg"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/files/:id',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: file, error } = await supabase
        .from('file_metadata')
        .select(`*, user_profiles!inner(first_name, last_name, email)`)
        .eq('id', id)
        .single();

      if (error || !file) {
        return res.status(404).json({ success: false, error: 'File not found' });
      }

      await createAudit(req, 'view_file_details', 'file_metadata', id);
      res.json({ success: true, data: { file } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get file details', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch file details' });
    }
  }
);

/**
 * @swagger
 * /api/managers/media/files/{id}:
 *   delete:
 *     tags: [Manager - Media]
 *     summary: Delete file (soft delete)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "File deleted successfully"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/files/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: file, error } = await supabase
      .from('file_metadata')
      .update({ status: 'deleted', deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    await createAudit(req, 'delete_file', 'file_metadata', id);
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to delete file', { error: msg });
    res.status(500).json({ success: false, error: 'Failed to delete file' });
  }
});

/**
 * @swagger
 * /api/managers/media/advertisements:
 *   get:
 *     tags: [Manager - Media]
 *     summary: Get advertisements
 *     description: Retrieve paginated list of advertisements with filtering
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending_approval, active, paused, completed, cancelled, rejected]
 *     responses:
 *       200:
 *         description: Advertisements retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 advertisements:
 *                   - id: "ad1234567-89ab-cdef-0123-456789abcdef"
 *                     title: "Summer Sale Campaign"
 *                     description: "Get up to 50% off on all electronics"
 *                     media_url: "https://storage.example.com/ads/summer-sale.jpg"
 *                     media_type: "image"
 *                     target_audience:
 *                       age_range: "18-45"
 *                       interests: ["electronics", "gadgets"]
 *                     placement: "homepage_banner"
 *                     budget: 500000
 *                     impressions: 125000
 *                     clicks: 3500
 *                     start_date: "2026-02-01"
 *                     end_date: "2026-02-28"
 *                     status: "active"
 *                     created_at: "2026-01-25T10:30:00Z"
 *                     advertiser_profiles:
 *                       id: "ap123"
 *                       business_name: "Tech Store Nigeria"
 *                       contact_email: "ads@techstore.ng"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 50
 *                 pages: 3
 */
router.get(
  '/advertisements',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', status } = req.query;
      const { from, to } = getPaginationRange(page as string, limit as string);

      let query = supabase
        .from('advertisements')
        .select(
          `id, title, description, media_url, media_type, target_audience, placement,
         budget, impressions, clicks, start_date, end_date, status, created_at,
         advertiser_profiles!inner(id, business_name, contact_email)`,
          { count: 'exact' }
        )
        .is('deleted_at', null)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);

      const { data: ads, count, error } = await query;
      if (error) throw error;

      await createAudit(req, 'view_advertisements', 'advertisements');
      res.json({
        success: true,
        data: { advertisements: ads },
        pagination: calculatePagination(page as string, limit as string, count || 0),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get advertisements', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch advertisements' });
    }
  }
);

/**
 * @swagger
 * /api/managers/media/advertisements/{id}:
 *   get:
 *     tags: [Manager - Media]
 *     summary: Get advertisement details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Advertisement details retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 advertisement:
 *                   id: "ad1234567-89ab-cdef-0123-456789abcdef"
 *                   title: "Summer Sale Campaign"
 *                   budget: 500000
 *                   spent: 350000
 *                   impressions: 125000
 *                   clicks: 3500
 *                   ctr: 2.8
 *                   status: "active"
 *                   daily_stats:
 *                     - date: "2026-02-15"
 *                       impressions: 5000
 *                       clicks: 150
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/advertisements/:id',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: ad, error } = await supabase
        .from('advertisements')
        .select(`*, advertiser_profiles!inner(id, business_name, contact_email)`)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !ad) {
        return res.status(404).json({ success: false, error: 'Advertisement not found' });
      }

      // Calculate CTR
      const ctr = ad.impressions > 0 ? Math.round((ad.clicks / ad.impressions) * 10000) / 100 : 0;

      await createAudit(req, 'view_advertisement_details', 'advertisements', id);
      res.json({
        success: true,
        data: {
          advertisement: {
            ...ad,
            ctr,
          },
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get advertisement details', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch advertisement details' });
    }
  }
);

/**
 * @swagger
 * /api/managers/media/advertisements/{id}/status:
 *   put:
 *     tags: [Manager - Media]
 *     summary: Update advertisement status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, pending_approval, active, paused, completed, cancelled, rejected]
 *               notes:
 *                 type: string
 *           example:
 *             status: "active"
 *             notes: "Approved for homepage placement"
 *     responses:
 *       200:
 *         description: Advertisement status updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 advertisement:
 *                   id: "ad1234567-89ab-cdef-0123-456789abcdef"
 *                   status: "active"
 *                   updated_at: "2026-02-16T10:30:00Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  '/advertisements/:id/status',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }

      const validStatuses = [
        'draft',
        'pending_approval',
        'active',
        'paused',
        'completed',
        'cancelled',
        'rejected',
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

      const { data: ad, error } = await supabase
        .from('advertisements')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error || !ad) {
        return res.status(404).json({ success: false, error: 'Advertisement not found' });
      }

      await createAudit(req, 'update_advertisement_status', 'advertisements', id);
      res.json({ success: true, data: { advertisement: ad } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to update advertisement status', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to update advertisement status' });
    }
  }
);

/**
 * @swagger
 * /api/managers/media/dashboard-stats:
 *   get:
 *     tags: [Manager - Media]
 *     summary: Get media dashboard statistics
 *     description: Comprehensive dashboard stats for media module including files and advertisements
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 files:
 *                   total: 5000
 *                   recent: 250
 *                   total_size_mb: 1250.5
 *                   by_type:
 *                     images: 3500
 *                     videos: 500
 *                     documents: 800
 *                     audio: 200
 *                 advertisements:
 *                   total: 50
 *                   active: 25
 *                   pending: 10
 *                   total_budget: 5000000
 *                   total_spent: 3500000
 *                   impressions: 2500000
 *                   clicks: 75000
 *                   ctr: 3.0
 *                 period:
 *                   start: "2026-01-16"
 *                   end: "2026-02-16"
 */
router.get(
  '/dashboard-stats',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date
        ? new Date(start_date as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end_date ? new Date(end_date as string) : new Date();

      // Get files stats
      const { count: totalFiles } = await supabase
        .from('file_metadata')
        .select('id', { count: 'exact', head: true });

      const { data: recentFiles } = await supabase
        .from('file_metadata')
        .select('id, size_bytes, mime_type')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const totalSize =
        recentFiles?.reduce(
          (sum: number, f: Record<string, unknown>) => sum + ((f.size_bytes as number) || 0),
          0
        ) || 0;

      const imageCount =
        recentFiles?.filter((f: Record<string, unknown>) =>
          (f.mime_type as string)?.startsWith('image/')
        ).length || 0;
      const videoCount =
        recentFiles?.filter((f: Record<string, unknown>) =>
          (f.mime_type as string)?.startsWith('video/')
        ).length || 0;
      const documentCount =
        recentFiles?.filter((f: Record<string, unknown>) =>
          (f.mime_type as string)?.startsWith('application/')
        ).length || 0;
      const audioCount =
        recentFiles?.filter((f: Record<string, unknown>) =>
          (f.mime_type as string)?.startsWith('audio/')
        ).length || 0;

      // Get ads stats
      const { data: ads } = await supabase
        .from('advertisements')
        .select('id, budget, impressions, clicks, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .is('deleted_at', null);

      const activeAds =
        ads?.filter((a: Record<string, unknown>) => a.status === 'active').length || 0;
      const pendingAds =
        ads?.filter((a: Record<string, unknown>) => a.status === 'pending_approval').length || 0;
      const totalBudget =
        ads?.reduce(
          (sum: number, a: Record<string, unknown>) => sum + (Number(a.budget) || 0),
          0
        ) || 0;
      const totalImpressions =
        ads?.reduce(
          (sum: number, a: Record<string, unknown>) => sum + ((a.impressions as number) || 0),
          0
        ) || 0;
      const totalClicks =
        ads?.reduce(
          (sum: number, a: Record<string, unknown>) => sum + ((a.clicks as number) || 0),
          0
        ) || 0;

      await createAudit(req, 'view_media_dashboard', 'media_dashboard');
      res.json({
        success: true,
        data: {
          files: {
            total: totalFiles || 0,
            recent: recentFiles?.length || 0,
            total_size_mb: Math.round((totalSize / 1024 / 1024) * 100) / 100,
            by_type: {
              images: imageCount,
              videos: videoCount,
              documents: documentCount,
              audio: audioCount,
            },
          },
          advertisements: {
            total: ads?.length || 0,
            active: activeAds,
            pending: pendingAds,
            total_budget: Math.round(totalBudget * 100) / 100,
            impressions: totalImpressions,
            clicks: totalClicks,
            ctr:
              totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
          },
          period: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
          },
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get media dashboard stats', { error: msg });
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
    }
  }
);

export default router;
