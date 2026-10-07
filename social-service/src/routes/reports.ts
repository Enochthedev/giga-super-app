import { SupabaseClient } from '@supabase/supabase-js';
import { Request, Response, Router } from 'express';
import { z, ZodError } from 'zod';

import { logger } from '../utils/logger';
import { createReport } from '../utils/reports';
import {
  ErrorCodes,
  sendAuthError,
  sendInternalError,
  sendNotFound,
  sendSuccess,
  sendValidationError,
} from '../utils/response';
import { reportPostSchema } from '../validation/schemas';

const router = Router();

const getSupabase = (req: Request): SupabaseClient => req.app.locals.supabase;

const createReportSchema = reportPostSchema.extend({
  target_type: z.enum(['post', 'comment', 'user']),
  target_id: z.string().uuid(),
});

/**
 * @swagger
 * /reports:
 *   post:
 *     summary: Report a post, comment or user
 *     description: |
 *       Queues the report for moderator review. Reporting the same target twice
 *       succeeds without creating a second report.
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [target_type, target_id, reason]
 *             properties:
 *               target_type:
 *                 type: string
 *                 enum: [post, comment, user]
 *               target_id:
 *                 type: string
 *                 format: uuid
 *               reason:
 *                 type: string
 *                 enum: [spam, harassment, hate_speech, violence, nudity, false_information, other]
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Report received
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const input = createReportSchema.parse(req.body);
    const result = await createReport(getSupabase(req), {
      reporterId: req.user.id,
      targetType: input.target_type,
      targetId: input.target_id,
      reason: input.reason,
      description: input.description,
    });

    if (result.status === 'not_found') {
      sendNotFound(res, ErrorCodes.NOT_FOUND, `${input.target_type} not found`, req.requestId);
      return;
    }
    if (result.status === 'self') {
      sendValidationError(res, 'You cannot report yourself', undefined, req.requestId);
      return;
    }

    sendSuccess(res, {
      data: { reported: true, message: 'Thank you for your report. We will review it within 24 hours.' },
      requestId: req.requestId,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid report data', error.issues, req.requestId);
      return;
    }
    logger.error('Error creating report', { error });
    sendInternalError(res, 'Failed to submit report', req.requestId);
  }
});

export default router;
