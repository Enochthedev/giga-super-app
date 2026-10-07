import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit, createFailedAudit } from '../middleware/audit';
import { AuthRequest, authenticate, requireAnyAccess } from '../middleware/auth';
import { calculatePagination, getPaginationRange, supabase } from '../utils/database';

/**
 * Moderation queue for user reports (App Store guideline 1.2: reported content
 * must get a timely response). Reports are filed by social-service
 * (POST /api/v1/social/reports); every moderator decision is audited.
 */
const router = Router();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

const STATUSES = ['pending', 'actioned', 'dismissed'] as const;
const TARGET_TYPES = ['post', 'comment', 'user'] as const;
const ACTIONS = ['remove_content', 'mark_actioned', 'dismiss'] as const;

const CONTENT_TABLE = { post: 'social_posts', comment: 'post_comments' } as const;

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     tags: [Moderation]
 *     summary: List content reports
 *     description: Oldest pending first by default, with the reported content and both users attached
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, actioned, dismissed], default: pending }
 *       - in: query
 *         name: target_type
 *         schema: { type: string, enum: [post, comment, user] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Reports
 */
router.get('/', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const status = (req.query.status as string) || 'pending';
    const targetType = req.query.target_type as string | undefined;
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
      return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
    }
    if (targetType && !TARGET_TYPES.includes(targetType as (typeof TARGET_TYPES)[number])) {
      return res.status(400).json({ error: `target_type must be one of ${TARGET_TYPES.join(', ')}` });
    }

    const { from, to } = getPaginationRange(page, limit);
    let query = supabase
      .from('content_reports')
      .select('*', { count: 'exact' })
      .eq('status', status)
      // Pending: oldest first so nothing waits past 24h; reviewed: newest first.
      .order('created_at', { ascending: status === 'pending' })
      .range(from, to);

    if (targetType) query = query.eq('target_type', targetType);

    const { data: reports, count, error } = await query;
    if (error) throw error;

    const rows = reports ?? [];
    const userIds = [
      ...new Set(rows.flatMap(r => [r.reporter_id, r.target_user_id]).filter(Boolean)),
    ];
    const postIds = rows.filter(r => r.target_type === 'post').map(r => r.target_id);
    const commentIds = rows.filter(r => r.target_type === 'comment').map(r => r.target_id);

    const [profiles, posts, comments] = await Promise.all([
      userIds.length
        ? supabase
            .from('user_profiles')
            .select('id, first_name, last_name, email, avatar_url, deleted_at')
            .in('id', userIds)
        : { data: [], error: null },
      postIds.length
        ? supabase
            .from('social_posts')
            .select('id, content, media_urls, created_at, deleted_at')
            .in('id', postIds)
        : { data: [], error: null },
      commentIds.length
        ? supabase
            .from('post_comments')
            .select('id, post_id, content, created_at, deleted_at')
            .in('id', commentIds)
        : { data: [], error: null },
    ]);

    for (const r of [profiles, posts, comments]) if (r.error) throw r.error;

    const profileById = new Map((profiles.data ?? []).map(p => [p.id, p]));
    const contentById = new Map(
      [...(posts.data ?? []), ...(comments.data ?? [])].map(c => [c.id, c])
    );

    res.json({
      success: true,
      data: rows.map(r => ({
        ...r,
        reporter: profileById.get(r.reporter_id) ?? null,
        target_user: r.target_user_id ? (profileById.get(r.target_user_id) ?? null) : null,
        content: contentById.get(r.target_id) ?? null,
      })),
      pagination: calculatePagination(page, limit, count ?? 0),
    });
  } catch (error: any) {
    logger.error('Failed to list reports', { error: error.message });
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

/**
 * @swagger
 * /api/admin/reports/{reportId}:
 *   patch:
 *     tags: [Moderation]
 *     summary: Resolve a report
 *     description: |
 *       remove_content soft-deletes the reported post/comment and resolves every
 *       pending report on it. mark_actioned records that action was taken
 *       elsewhere (e.g. the user was suspended). dismiss closes the report with
 *       no action.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [remove_content, mark_actioned, dismiss]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report resolved
 *       400:
 *         description: Invalid action
 *       404:
 *         description: Report not found
 */
router.patch(
  '/:reportId',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    const { reportId } = req.params;
    try {
      const { action, note } = req.body ?? {};

      if (!ACTIONS.includes(action)) {
        return res.status(400).json({ error: `action must be one of ${ACTIONS.join(', ')}` });
      }

      const { data: report, error: lookupError } = await supabase
        .from('content_reports')
        .select('*')
        .eq('id', reportId)
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (!report) return res.status(404).json({ error: 'Report not found' });

      const now = new Date().toISOString();

      if (action === 'remove_content') {
        if (report.target_type === 'user') {
          return res.status(400).json({
            error: 'remove_content applies to posts and comments; suspend or delete the user instead',
          });
        }

        const table = CONTENT_TABLE[report.target_type as keyof typeof CONTENT_TABLE];
        const { error: removeError } = await supabase
          .from(table)
          .update({ deleted_at: now, deleted_by: req.user!.id, deletion_reason: 'moderation' })
          .eq('id', report.target_id)
          .is('deleted_at', null);

        if (removeError) throw removeError;
      }

      // One decision covers every pending report on the same target.
      const { data: resolved, error: resolveError } = await supabase
        .from('content_reports')
        .update({
          status: action === 'dismiss' ? 'dismissed' : 'actioned',
          reviewed_by: req.user!.id,
          reviewed_at: now,
          resolution_note: typeof note === 'string' ? note.slice(0, 1000) : null,
        })
        .eq('target_type', report.target_type)
        .eq('target_id', report.target_id)
        .eq('status', 'pending')
        .select('id');

      if (resolveError) throw resolveError;

      await createAudit(req, `report_${action}`, `content_report:${report.target_type}`, report.target_id, {
        report_id: reportId,
        resolved_report_ids: (resolved ?? []).map(r => r.id),
        target_user_id: report.target_user_id,
        note,
      });

      res.json({
        success: true,
        data: { report_id: reportId, action, resolved_count: resolved?.length ?? 0 },
      });
    } catch (error: any) {
      logger.error('Failed to resolve report', { error: error.message, reportId });
      await createFailedAudit(req, 'report_resolve', 'content_report', error.message, reportId);
      res.status(500).json({ error: 'Failed to resolve report' });
    }
  }
);

export default router;
