import { Response, Router } from 'express';
import winston from 'winston';
import { createAudit, createFailedAudit } from '../middleware/audit';
import { AuthRequest, authenticate, requireAnyAccess, requirePermission } from '../middleware/auth';
import { calculatePagination, getPaginationRange, supabase } from '../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * @swagger
 * /api/ads/incoming:
 *   get:
 *     tags: [Advertisement Management]
 *     summary: Get incoming ads for review
 *     description: Retrieve paginated list of advertisements pending review
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by ad status
 *         example: 'pending'
 *       - in: query
 *         name: campaign_type
 *         schema:
 *           type: string
 *           enum: [banner, video, native, sponsored]
 *         description: Filter by campaign type
 *     responses:
 *       200:
 *         description: Incoming ads retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       campaign_name:
 *                         type: string
 *                       campaign_type:
 *                         type: string
 *                       budget:
 *                         type: number
 *                       start_date:
 *                         type: string
 *                         format: date
 *                       end_date:
 *                         type: string
 *                         format: date
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       advertiser_profiles:
 *                         type: object
 *                         properties:
 *                           business_name:
 *                             type: string
 *                           contact_email:
 *                             type: string
 *                           contact_phone:
 *                             type: string
 *                 pagination:
 *                   type: object
 *             example:
 *               success: true
 *               data:
 *                 - id: "a1234567-89ab-cdef-0123-456789abcdef"
 *                   campaign_name: "Summer Sale Campaign"
 *                   campaign_type: "banner"
 *                   budget: 50000.00
 *                   start_date: "2026-02-01"
 *                   end_date: "2026-02-28"
 *                   status: "pending"
 *                   created_at: "2026-01-25T10:30:00Z"
 *                   advertiser_profiles:
 *                     business_name: "Tech Solutions Ltd"
 *                     contact_email: "ads@techsolutions.com"
 *                     contact_phone: "+2348012345678"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 45
 *                 pages: 3
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/incoming', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status, campaign_type } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('ad_campaigns')
      .select(
        `
        id,
        campaign_name,
        campaign_type,
        budget,
        start_date,
        end_date,
        status,
        review_notes,
        created_at,
        advertiser_id,
        advertiser_profiles!advertiser_id(business_name, contact_email, contact_phone)
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status as string);
    } else {
      // Default to pending ads
      query = query.eq('status', 'pending');
    }

    if (campaign_type) {
      query = query.eq('campaign_type', campaign_type as string);
    }

    const { data: ads, count, error } = await query;

    if (error) throw error;

    await createAudit(req, 'view_incoming_ads', 'advertisement_management');

    res.json({
      success: true,
      data: ads,
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: any) {
    logger.error('Failed to get incoming ads', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch incoming ads' });
  }
});

/**
 * @swagger
 * /api/ads/{adId}/status:
 *   put:
 *     tags: [Advertisement Management]
 *     summary: Update advertisement status
 *     description: Approve or reject an advertisement campaign
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Advertisement ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               review_notes:
 *                 type: string
 *           example:
 *             status: "approved"
 *             review_notes: "Campaign meets all guidelines and is approved for publication"
 *     responses:
 *       200:
 *         description: Advertisement status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                     review_notes:
 *                       type: string
 *                     reviewed_by:
 *                       type: string
 *                       format: uuid
 *                     reviewed_at:
 *                       type: string
 *                       format: date-time
 *             example:
 *               success: true
 *               data:
 *                 id: "a1234567-89ab-cdef-0123-456789abcdef"
 *                 status: "approved"
 *                 review_notes: "Campaign meets all guidelines and is approved for publication"
 *                 reviewed_by: "u1234567-89ab-cdef-0123-456789abcdef"
 *                 reviewed_at: "2026-02-10T15:45:00Z"
 *       400:
 *         description: Bad request - invalid status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Advertisement not found
 *       500:
 *         description: Internal server error
 */
router.put(
  '/:adId/status',
  authenticate,
  requirePermission('ads:approve'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { adId } = req.params;
      const { status, review_notes } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
      }

      const { data: ad, error } = await supabase
        .from('ad_campaigns')
        .update({
          status,
          review_notes,
          reviewed_by: req.user!.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', adId)
        .select()
        .single();

      if (error) throw error;

      if (!ad) {
        return res.status(404).json({ error: 'Advertisement not found' });
      }

      await createAudit(req, 'update_ad_status', 'ad_campaigns', adId, { status, review_notes });

      res.json({ success: true, data: ad });
    } catch (error: any) {
      logger.error('Failed to update ad status', { error: error.message });
      await createFailedAudit(
        req,
        'update_ad_status',
        'ad_campaigns',
        error.message,
        req.params.adId
      );
      res.status(500).json({ error: 'Failed to update advertisement status' });
    }
  }
);

export default router;
