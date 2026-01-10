/**
 * Reports Routes
 */

import { Router } from 'express';
import { AuthenticatedRequest } from '../types';
import { ReportService } from '../services/reportService';
import { authMiddleware, requireModerator } from '../middleware/auth';
import { validateCreateReport, validateUpdateReportStatus, validatePagination } from '../middleware/validation';
import { strictLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/errors';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import config from '../config';

const router = Router();

router.post(
  '/',
  authMiddleware,
  strictLimiter,
  validateCreateReport,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const reportService = new ReportService(supabase);
    const report = await reportService.createReport(req.user!.id, req.body, req.requestId!);
    sendCreated(res, report, req.requestId!);
  })
);

router.get(
  '/',
  authMiddleware,
  requireModerator,
  validatePagination,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const reportService = new ReportService(supabase);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || config.pagination.defaultLimit;
    const filters = {
      status: req.query.status as string | undefined,
      content_type: req.query.content_type as string | undefined,
      reason: req.query.reason as string | undefined,
    };
    const { reports, metadata } = await reportService.getReports(filters, { page, limit }, req.requestId!);
    sendPaginated(res, reports, metadata, req.requestId!);
  })
);

router.put(
  '/:reportId/status',
  authMiddleware,
  requireModerator,
  validateUpdateReportStatus,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { supabase } = req.app.locals;
    const reportService = new ReportService(supabase);
    const report = await reportService.updateReportStatus(
      req.params.reportId,
      req.user!.id,
      req.body.status,
      req.requestId!
    );
    sendSuccess(res, report, req.requestId!);
  })
);

export default router;
