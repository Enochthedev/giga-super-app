import { Router } from 'express';
import {
  getWalletBalance,
  getWalletTransactions,
  initializeTopUp,
  verifyTopUp,
} from '../../controllers/wallet.controller';
import { authenticate as auth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /api/v1/wallet/balance:
 *   get:
 *     summary: Get wallet balance
 *     description: Get the current wallet balance for the authenticated user
 *     tags: [Wallet]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
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
 *                     userId:
 *                       type: string
 *                     balance:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     lastUpdated:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/balance', auth, asyncHandler(getWalletBalance));

/**
 * @swagger
 * /api/v1/wallet/topup:
 *   post:
 *     summary: Initialize wallet top-up
 *     description: Initialize a wallet top-up transaction via Paystack
 *     tags: [Wallet]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - email
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to top up (minimum 100 NGN)
 *                 example: 5000
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email for payment
 *                 example: user@example.com
 *               callbackUrl:
 *                 type: string
 *                 description: Optional callback URL after payment
 *     responses:
 *       200:
 *         description: Top-up initialized successfully
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
 *                     authorization_url:
 *                       type: string
 *                       description: Paystack checkout URL
 *                     reference:
 *                       type: string
 *                       description: Transaction reference
 *                     isDemoMode:
 *                       type: boolean
 *                       description: Whether running in demo mode
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/topup', auth, asyncHandler(initializeTopUp));

/**
 * @swagger
 * /api/v1/wallet/topup/verify/{reference}:
 *   get:
 *     summary: Verify wallet top-up
 *     description: Verify and complete a wallet top-up transaction
 *     tags: [Wallet]
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction reference
 *     responses:
 *       200:
 *         description: Top-up verified successfully
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
 *                     success:
 *                       type: boolean
 *                     amount:
 *                       type: number
 *                     newBalance:
 *                       type: number
 *       400:
 *         description: Verification failed
 *       404:
 *         description: Transaction not found
 */
router.get('/topup/verify/:reference', asyncHandler(verifyTopUp));

/**
 * @swagger
 * /api/v1/wallet/transactions:
 *   get:
 *     summary: Get wallet transactions
 *     description: Get transaction history for the authenticated user's wallet
 *     tags: [Wallet]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of transactions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [credit, debit]
 *         description: Filter by transaction type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed]
 *         description: Filter by transaction status
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
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
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/transactions', auth, asyncHandler(getWalletTransactions));

export default router;
