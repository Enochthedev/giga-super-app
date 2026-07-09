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
 *           enum: [draft, pending_approval, active, paused, completed, cancelled, rejected]
 *         description: Filter by ad status
 *         example: 'pending_approval'
 *       - in: query
 *         name: campaign_type
 *         schema:
 *           type: string
 *           enum: [banner, video, native, sponsored, search]
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
 *                   status: "pending_approval"
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
        advertiser_profiles(
          company_name,
          user_profiles!inner(email, phone)
        )
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status as string);
    } else {
      // Default to pending_approval ads (awaiting review)
      query = query.eq('status', 'pending_approval');
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
 *                 enum: [active, rejected, paused, cancelled]
 *                 description: New status for the campaign (active = approved)
 *               review_notes:
 *                 type: string
 *           example:
 *             status: "active"
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

      // Valid status transitions for admin actions
      const validStatuses = ['active', 'rejected', 'paused', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
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

      await createAudit(req, 'update_ad_status', 'ad_campaigns', adId, {
        status,
        review_notes,
      });

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

/**
 * @swagger
 * /api/ads/{adId}/approve:
 *   post:
 *     tags: [Advertisement Management]
 *     summary: Approve an advertisement
 *     description: Approve a pending advertisement campaign
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               review_notes:
 *                 type: string
 *           example:
 *             review_notes: "Campaign meets all guidelines"
 *     responses:
 *       200:
 *         description: Advertisement approved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Advertisement not found
 */
router.post(
  '/:adId/approve',
  authenticate,
  requirePermission('ads:approve'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { adId } = req.params;
      const { review_notes } = req.body || {};

      const { data: ad, error } = await supabase
        .from('ad_campaigns')
        .update({
          status: 'active',
          review_notes: review_notes || 'Approved',
          approved_by: req.user!.id,
          approved_at: new Date().toISOString(),
          reviewed_by: req.user!.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', adId)
        .eq('status', 'pending_approval')
        .select()
        // E17: maybeSingle so a non-matching id returns null (404) instead of a coercion 500
        .maybeSingle();

      if (error) throw error;

      if (!ad) {
        return res.status(404).json({ error: 'Advertisement not found or not pending approval' });
      }

      await createAudit(req, 'approve_ad', 'ad_campaigns', adId, { review_notes });

      res.json({ success: true, data: ad, message: 'Advertisement approved successfully' });
    } catch (error: any) {
      logger.error('Failed to approve ad', { error: error.message });
      await createFailedAudit(req, 'approve_ad', 'ad_campaigns', error.message, req.params.adId);
      res.status(500).json({ error: 'Failed to approve advertisement' });
    }
  }
);

/**
 * @swagger
 * /api/ads/{adId}/reject:
 *   post:
 *     tags: [Advertisement Management]
 *     summary: Reject an advertisement
 *     description: Reject a pending advertisement campaign with reason
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
 *               - rejection_reason
 *             properties:
 *               rejection_reason:
 *                 type: string
 *               review_notes:
 *                 type: string
 *           example:
 *             rejection_reason: "Content violates advertising guidelines"
 *             review_notes: "Please review section 3.2 of our ad policy"
 *     responses:
 *       200:
 *         description: Advertisement rejected successfully
 *       400:
 *         description: Rejection reason required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Advertisement not found
 */
router.post(
  '/:adId/reject',
  authenticate,
  requirePermission('ads:approve'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { adId } = req.params;
      const { rejection_reason, review_notes } = req.body || {};

      if (!rejection_reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const { data: ad, error } = await supabase
        .from('ad_campaigns')
        .update({
          status: 'rejected',
          rejection_reason,
          review_notes: review_notes || rejection_reason,
          reviewed_by: req.user!.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', adId)
        .eq('status', 'pending_approval')
        .select()
        // E17: maybeSingle so a non-matching id returns null (404) instead of a coercion 500
        .maybeSingle();

      if (error) throw error;

      if (!ad) {
        return res.status(404).json({ error: 'Advertisement not found or not pending approval' });
      }

      await createAudit(req, 'reject_ad', 'ad_campaigns', adId, { rejection_reason, review_notes });

      res.json({ success: true, data: ad, message: 'Advertisement rejected' });
    } catch (error: any) {
      logger.error('Failed to reject ad', { error: error.message });
      await createFailedAudit(req, 'reject_ad', 'ad_campaigns', error.message, req.params.adId);
      res.status(500).json({ error: 'Failed to reject advertisement' });
    }
  }
);

/**
 * @swagger
 * /api/ads/fetch:
 *   post:
 *     tags: [Advertisement Management]
 *     summary: Fetch ads for display
 *     description: Retrieve active advertisements based on placement type and targeting criteria
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               placement_type:
 *                 type: string
 *                 enum: [banner, video, native, sponsored]
 *                 description: Type of ad placement
 *               limit:
 *                 type: integer
 *                 default: 1
 *                 minimum: 1
 *                 maximum: 10
 *                 description: Number of ads to return
 *               user_context:
 *                 type: object
 *                 description: Optional user context for targeting
 *           example:
 *             placement_type: "banner"
 *             limit: 3
 *     responses:
 *       200:
 *         description: Ads retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 ads:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       campaign_id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       creative:
 *                         type: object
 *                       landing_url:
 *                         type: string
 *                       cta_text:
 *                         type: string
 *                       tracking_token:
 *                         type: string
 *             example:
 *               success: true
 *               ads:
 *                 - campaign_id: "a1234567-89ab-cdef-0123-456789abcdef"
 *                   title: "Summer Sale Campaign"
 *                   description: "Get 50% off on all products"
 *                   creative:
 *                     image_url: "https://example.com/banner.jpg"
 *                     video_url: null
 *                   landing_url: "https://example.com/sale"
 *                   cta_text: "Learn More"
 *                   tracking_token: "eyJjaWQiOiJhMTIzNDU2Ny04OWFiLWNkZWYtMDEyMy00NTY3ODlhYmNkZWYiLCJ0cyI6MTcwNzU3NjAwMDAwMH0="
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/fetch', async (req: AuthRequest, res: Response) => {
  try {
    const { placement_type, limit = 1, user_context } = req.body || {};

    // Validate limit
    const adsLimit = Math.min(Math.max(1, parseInt(limit as string, 10) || 1), 10);

    // Get today's date for filtering
    const today = new Date().toISOString().split('T')[0];

    // Query active campaigns
    let query = supabase
      .from('ad_campaigns')
      .select('*')
      .eq('status', 'active') // Use 'active' status for live campaigns
      .lte('start_date', today)
      .gte('end_date', today)
      .is('deleted_at', null)
      .limit(50); // Fetch more than needed for filtering

    // Add placement type filter if provided
    if (placement_type) {
      query = query.eq('campaign_type', placement_type);
    }

    const { data: campaigns, error } = await query;

    if (error) throw error;

    // Filter campaigns by budget (spent_amount < budget)
    let eligibleCampaigns = (campaigns || []).filter((campaign: any) => {
      // Check if budget is not exceeded
      const spentAmount = parseFloat(campaign.spent_amount || '0');
      const budget = parseFloat(campaign.budget || '0');
      return spentAmount < budget;
    });

    // Randomize selection for fair distribution
    eligibleCampaigns = eligibleCampaigns.sort(() => 0.5 - Math.random());

    // Select top N campaigns
    const selectedAds = eligibleCampaigns.slice(0, adsLimit).map((campaign: any) => ({
      campaign_id: campaign.id,
      title: campaign.campaign_name,
      description: campaign.description || '',
      creative: campaign.creative_assets || {},
      landing_url: campaign.landing_url || '',
      cta_text: campaign.cta_text || 'Learn More',
      tracking_token: Buffer.from(JSON.stringify({ cid: campaign.id, ts: Date.now() })).toString(
        'base64'
      ),
    }));

    // Log ad fetch (optional - can be used for analytics)
    logger.info('Ads fetched', {
      placement_type,
      requested: adsLimit,
      returned: selectedAds.length,
      user_context,
    });

    res.json({
      success: true,
      ads: selectedAds,
    });
  } catch (error: any) {
    logger.error('Failed to fetch ads', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch advertisements' });
  }
});

export default router;
