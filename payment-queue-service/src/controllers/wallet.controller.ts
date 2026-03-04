import { Request, Response } from 'express';
import { walletService } from '../services/wallet.service';
import logger from '../utils/logger';

/**
 * Get wallet balance
 */
export const getWalletBalance = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Unauthorized',
        statusCode: 401,
      },
    });
  }

  try {
    const balance = await walletService.getBalance(userId);

    res.json({
      success: true,
      data: balance,
    });
  } catch (error: any) {
    logger.error('Get wallet balance failed', {
      error: error.message,
      userId,
    });

    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message,
        statusCode: error.statusCode || 500,
      },
    });
  }
};

/**
 * Initialize wallet top-up
 */
export const initializeTopUp = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { amount, email, callbackUrl } = req.body;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Unauthorized',
        statusCode: 401,
      },
    });
  }

  if (!amount || !email) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Amount and email are required',
        statusCode: 400,
      },
    });
  }

  try {
    const result = await walletService.initializeTopUp({
      userId,
      amount: parseFloat(amount),
      email,
      callbackUrl,
    });

    res.json({
      success: true,
      data: result,
      message: result.isDemoMode
        ? 'DEMO MODE: Payment initialized (no real charge will occur)'
        : 'Payment initialized successfully',
    });
  } catch (error: any) {
    logger.error('Initialize top-up failed', {
      error: error.message,
      userId,
      amount,
    });

    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message,
        statusCode: error.statusCode || 500,
      },
    });
  }
};

/**
 * Verify wallet top-up
 */
export const verifyTopUp = async (req: Request, res: Response) => {
  const { reference } = req.params;

  if (!reference) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Reference is required',
        statusCode: 400,
      },
    });
  }

  try {
    const result = await walletService.verifyTopUp(reference);

    res.json({
      success: true,
      data: result,
      message: 'Wallet top-up completed successfully',
    });
  } catch (error: any) {
    logger.error('Verify top-up failed', {
      error: error.message,
      reference,
    });

    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message,
        statusCode: error.statusCode || 500,
      },
    });
  }
};

/**
 * Get wallet transactions
 */
export const getWalletTransactions = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { limit, offset, type, status } = req.query;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Unauthorized',
        statusCode: 401,
      },
    });
  }

  try {
    const result = await walletService.getTransactions({
      userId,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      type: type as 'credit' | 'debit' | undefined,
      status: status as 'pending' | 'completed' | 'failed' | undefined,
    });

    res.json({
      success: true,
      data: result.transactions,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  } catch (error: any) {
    logger.error('Get wallet transactions failed', {
      error: error.message,
      userId,
    });

    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message,
        statusCode: error.statusCode || 500,
      },
    });
  }
};
