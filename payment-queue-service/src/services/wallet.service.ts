import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/database';
import { BadRequestError, InternalServerError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import { paystackService } from './paystack.service';

/**
 * Wallet Service
 *
 * Manages user wallet operations including:
 * - Balance tracking
 * - Top-up via Paystack
 * - Withdrawals
 * - Transaction history
 * - Payment deductions
 */

interface WalletBalance {
  userId: string;
  balance: number;
  currency: string;
  lastUpdated: string;
}

interface WalletTransaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  description: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: any;
  createdAt: string;
}

export class WalletService {
  /**
   * Get user wallet balance
   */
  async getBalance(userId: string): Promise<WalletBalance> {
    try {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Create wallet if doesn't exist
      if (!data) {
        const { data: newWallet, error: createError } = await supabase
          .from('user_wallets')
          .insert({
            user_id: userId,
            balance: 0,
            currency: 'NGN',
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        return {
          userId,
          balance: 0,
          currency: 'NGN',
          lastUpdated: newWallet.updated_at,
        };
      }

      return {
        userId: data.user_id,
        balance: parseFloat(data.balance),
        currency: data.currency,
        lastUpdated: data.updated_at,
      };
    } catch (error: any) {
      logger.error('Failed to get wallet balance', {
        error: error.message,
        userId,
      });
      throw new InternalServerError('Failed to get wallet balance');
    }
  }

  /**
   * Initialize wallet top-up via Paystack
   * Returns checkout URL for user to complete payment
   */
  async initializeTopUp(params: {
    userId: string;
    amount: number;
    email: string;
    callbackUrl?: string;
  }): Promise<{
    authorization_url: string;
    reference: string;
    isDemoMode: boolean;
  }> {
    const { userId, amount, email, callbackUrl } = params;

    // Validate amount
    if (amount < 100) {
      throw new BadRequestError('Minimum top-up amount is NGN 100');
    }

    if (amount > 1000000) {
      throw new BadRequestError('Maximum top-up amount is NGN 1,000,000');
    }

    try {
      const reference = `WALLET-TOPUP-${Date.now()}-${uuidv4().substring(0, 8)}`;

      // Initialize Paystack transaction
      const paystackResponse = await paystackService.initializeTransaction({
        email,
        amount,
        currency: 'NGN',
        reference,
        callback_url: callbackUrl || `${process.env.FRONTEND_URL}/wallet/topup/callback`,
        metadata: {
          userId,
          type: 'wallet_topup',
          purpose: 'Wallet Top-up',
        },
      });

      // Record pending transaction
      await this.recordTransaction({
        userId,
        type: 'credit',
        amount,
        currency: 'NGN',
        description: 'Wallet top-up',
        reference,
        status: 'pending',
        metadata: {
          paystack_reference: paystackResponse.reference,
        },
      });

      logger.info('Wallet top-up initialized', {
        userId,
        amount,
        reference,
        isDemoMode: paystackService.isDemo(),
      });

      return {
        authorization_url: paystackResponse.authorization_url,
        reference: paystackResponse.reference,
        isDemoMode: paystackService.isDemo(),
      };
    } catch (error: any) {
      logger.error('Failed to initialize wallet top-up', {
        error: error.message,
        userId,
        amount,
      });
      throw error;
    }
  }

  /**
   * Verify and complete wallet top-up
   * Called after user completes payment on Paystack
   */
  async verifyTopUp(reference: string): Promise<{
    success: boolean;
    amount: number;
    newBalance: number;
  }> {
    try {
      // Verify with Paystack
      const verification = await paystackService.verifyTransaction(reference);

      if (verification.status !== 'success') {
        // Update transaction as failed
        await supabase
          .from('wallet_transactions')
          .update({ status: 'failed' })
          .eq('reference', reference);

        throw new BadRequestError('Payment verification failed');
      }

      // Get transaction record
      const { data: transaction, error: txError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('reference', reference)
        .single();

      if (txError || !transaction) {
        throw new NotFoundError('Transaction not found');
      }

      // Check if already processed
      if (transaction.status === 'completed') {
        const balance = await this.getBalance(transaction.user_id);
        return {
          success: true,
          amount: parseFloat(transaction.amount),
          newBalance: balance.balance,
        };
      }

      // Credit wallet
      const { data: wallet, error: walletError } = await supabase.rpc('credit_wallet', {
        p_user_id: transaction.user_id,
        p_amount: verification.amount,
      });

      if (walletError) {
        throw walletError;
      }

      // Update transaction status
      await supabase
        .from('wallet_transactions')
        .update({
          status: 'completed',
          metadata: {
            ...transaction.metadata,
            verified_at: new Date().toISOString(),
            paystack_data: verification,
          },
        })
        .eq('reference', reference);

      logger.info('Wallet top-up completed', {
        userId: transaction.user_id,
        amount: verification.amount,
        reference,
      });

      const updatedBalance = await this.getBalance(transaction.user_id);

      return {
        success: true,
        amount: verification.amount,
        newBalance: updatedBalance.balance,
      };
    } catch (error: any) {
      logger.error('Failed to verify wallet top-up', {
        error: error.message,
        reference,
      });
      throw error;
    }
  }

  /**
   * Deduct amount from wallet for payment
   * Used when user pays for services using wallet balance
   */
  async deductFromWallet(params: {
    userId: string;
    amount: number;
    description: string;
    reference: string;
    metadata?: any;
  }): Promise<{
    success: boolean;
    newBalance: number;
  }> {
    const { userId, amount, description, reference, metadata } = params;

    try {
      // Check balance
      const balance = await this.getBalance(userId);

      if (balance.balance < amount) {
        throw new BadRequestError('Insufficient wallet balance');
      }

      // Debit wallet
      const { error: debitError } = await supabase.rpc('debit_wallet', {
        p_user_id: userId,
        p_amount: amount,
      });

      if (debitError) {
        throw debitError;
      }

      // Record transaction
      await this.recordTransaction({
        userId,
        type: 'debit',
        amount,
        currency: 'NGN',
        description,
        reference,
        status: 'completed',
        metadata,
      });

      const updatedBalance = await this.getBalance(userId);

      logger.info('Wallet deduction completed', {
        userId,
        amount,
        reference,
        newBalance: updatedBalance.balance,
      });

      return {
        success: true,
        newBalance: updatedBalance.balance,
      };
    } catch (error: any) {
      logger.error('Failed to deduct from wallet', {
        error: error.message,
        userId,
        amount,
      });
      throw error;
    }
  }

  /**
   * Get wallet transaction history
   */
  async getTransactions(params: {
    userId: string;
    limit?: number;
    offset?: number;
    type?: 'credit' | 'debit';
    status?: 'pending' | 'completed' | 'failed';
  }): Promise<{
    transactions: WalletTransaction[];
    total: number;
  }> {
    const { userId, limit = 20, offset = 0, type, status } = params;

    try {
      let query = supabase
        .from('wallet_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (type) {
        query = query.eq('type', type);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      const transactions: WalletTransaction[] = (data || []).map(tx => ({
        id: tx.id,
        userId: tx.user_id,
        type: tx.type,
        amount: parseFloat(tx.amount),
        currency: tx.currency,
        description: tx.description,
        reference: tx.reference,
        status: tx.status,
        metadata: tx.metadata,
        createdAt: tx.created_at,
      }));

      return {
        transactions,
        total: count || 0,
      };
    } catch (error: any) {
      logger.error('Failed to get wallet transactions', {
        error: error.message,
        userId,
      });
      throw new InternalServerError('Failed to get wallet transactions');
    }
  }

  /**
   * Record a wallet transaction
   */
  private async recordTransaction(params: {
    userId: string;
    type: 'credit' | 'debit';
    amount: number;
    currency: string;
    description: string;
    reference: string;
    status: 'pending' | 'completed' | 'failed';
    metadata?: any;
  }): Promise<void> {
    try {
      // Get wallet_id for backward compatibility with existing schema
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('id')
        .eq('user_id', params.userId)
        .single();

      const { error } = await supabase.from('wallet_transactions').insert({
        wallet_id: wallet?.id,
        user_id: params.userId,
        transaction_type: params.type,
        type: params.type,
        amount: params.amount,
        balance_before: 0, // Will be updated by trigger if needed
        balance_after: 0, // Will be updated by trigger if needed
        currency: params.currency,
        description: params.description,
        reference: params.reference,
        status: params.status,
        metadata: params.metadata || {},
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      logger.error('Failed to record wallet transaction', {
        error: error.message,
        params,
      });
      throw error;
    }
  }
}

// Singleton instance
export const walletService = new WalletService();
