import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { auth } from '../middleware/auth';
import {
  requireAdminLevel,
} from '../middleware/rbac.middleware';
import {
  validateBranchReport,
  validateStateReport,
  validateAdminReport,
  validateDateRange,
} from '../middleware/validation.middleware';
import {
  getBranchReport,
  getStateReport,
  getNationalReport,
} from '../controllers/admin.controller';

const router = Router();

/**
 * GET /api/v1/admin/payments/branch
 * Get branch-level payment reporting
 * Requires: branch_admin or higher
 */
router.get(
  '/branch',
  auth,
  requireAdminLevel('branch'),
  validateBranchReport,
  validateDateRange,
  asyncHandler(getBranchReport)
);

/**
 * GET /api/v1/admin/payments/state
 * Get state-level payment reporting
 * Requires: state_admin or higher
 */
router.get(
  '/state',
  auth,
  requireAdminLevel('state'),
  validateStateReport,
  validateDateRange,
  asyncHandler(getStateReport)
);

/**
 * GET /api/v1/admin/payments/national
 * Get national-level payment reporting
 * Requires: national_admin or higher
 */
router.get(
  '/national',
  auth,
  requireAdminLevel('national'),
  validateAdminReport,
  validateDateRange,
  asyncHandler(getNationalReport)
);

export default router;
