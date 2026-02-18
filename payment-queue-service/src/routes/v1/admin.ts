import { Router } from 'express';
import {
  getBranchReport,
  getNationalReport,
  getStateReport,
} from '../../controllers/admin.controller';
import { authenticate as auth } from '../../middleware/auth';
import { requireAdminLevel } from '../../middleware/rbac.middleware';
import {
  validateAdminReport,
  validateBranchReport,
  validateDateRange,
  validateStateReport,
} from '../../middleware/validation.middleware';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /api/v1/admin/payments/branch:
 *   get:
 *     summary: Branch payment report
 *     description: Get branch-level payment reporting (requires branch_admin or higher)
 *     tags: [Settlements]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Branch payment report
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
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
 * @swagger
 * /api/v1/admin/payments/state:
 *   get:
 *     summary: State payment report
 *     description: Get state-level payment reporting (requires state_admin or higher)
 *     tags: [Settlements]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stateId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: State payment report
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
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
 * @swagger
 * /api/v1/admin/payments/national:
 *   get:
 *     summary: National payment report
 *     description: Get national-level payment reporting (requires national_admin or higher)
 *     tags: [Settlements]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: National payment report
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
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
