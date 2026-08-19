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
   * Log audit entry for wallet operations
   */
  private async logAudit(params: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        user_id: params.userId,
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        old_values: params.oldValues,
        new_values: params.newValues,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
      });
    } catch (error: any) {
      // Log audit failure but don't throw - audit logging shouldn't break operations
      logger.error('Failed to log audit entry', {
        error: error.message,
        params,
      });
    }
  }

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
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{
    authorization_url: string;
    reference: string;
    isDemoMode: boolean;
  }> {
    const { userId, amount, email, callbackUrl, ipAddress, userAgent } = params;

    // Validate amount
    if (amount < 100) {
      throw new BadRequestError('Minimum top-up amount is NGN 100');
    }

    if (amount > 1000000) {
      throw new BadRequestError('Maximum top-up amount is NGN 1,000,000');
    }

    try {
      const reference = `WALLET-TOPUP-${Date.now()}-${uuidv4().substring(0, 8)}`;

      // Get current balance for audit
      const currentBalance = await this.getBalance(userId);

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

      // Audit log
      await this.logAudit({
        userId,
        action: 'wallet_topup_initialized',
        resourceType: 'wallet',
        resourceId: reference,
        oldValues: { balance: currentBalance.balance },
        newValues: {
          amount,
          reference,
          status: 'pending',
          isDemoMode: paystackService.isDemo(),
        },
        ipAddress,
        userAgent,
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
  async verifyTopUp(
    reference: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
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

      // Get old balance for audit
      const oldBalance = await this.getBalance(transaction.user_id);

      // P1: atomically CLAIM the transaction before crediting. Paystack fires webhooks more than
      // once and users retry verify, so the previous "check status then credit then set status"
      // sequence could credit twice (two callers both passed the status check; and the status
      // update's error was unchecked). The conditional update below flips the row to 'completed'
      // only if it is not already completed; because `reference` is unique, exactly one concurrent
      // caller gets a row back. Anyone who does not win the claim must NOT credit.
      const { data: claimed, error: claimError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'completed',
          metadata: {
            ...transaction.metadata,
            verified_at: new Date().toISOString(),
            paystack_data: verification,
          },
        })
        .eq('reference', reference)
        .neq('status', 'completed')
        .select()
        .maybeSingle();

      if (claimError) {
        throw claimError;
      }

      if (!claimed) {
        // Another concurrent verify already completed this top-up — do not credit again.
        const balance = await this.getBalance(transaction.user_id);
        return {
          success: true,
          amount: parseFloat(transaction.amount),
          newBalance: balance.balance,
        };
      }

      // We own the claim; credit the wallet exactly once.
      const { error: walletError } = await supabase.rpc('credit_wallet', {
        p_user_id: transaction.user_id,
        p_amount: verification.amount,
      });

      if (walletError) {
        // Release the claim so a later retry can complete the credit instead of it being
        // stuck 'completed' but uncredited.
        await supabase
          .from('wallet_transactions')
          .update({ status: transaction.status })
          .eq('reference', reference);
        throw walletError;
      }

      const updatedBalance = await this.getBalance(transaction.user_id);

      // Audit log
      await this.logAudit({
        userId: transaction.user_id,
        action: 'wallet_topup_completed',
        resourceType: 'wallet',
        resourceId: reference,
        oldValues: { balance: oldBalance.balance },
        newValues: {
          balance: updatedBalance.balance,
          amount: verification.amount,
          reference,
          status: 'completed',
        },
        ipAddress,
        userAgent,
      });

      logger.info('Wallet top-up completed', {
        userId: transaction.user_id,
        amount: verification.amount,
        reference,
      });

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
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{
    success: boolean;
    newBalance: number;
  }> {
    const { userId, amount, description, reference, metadata, ipAddress, userAgent } = params;

    try {
      // Check balance
      const oldBalance = await this.getBalance(userId);

      if (oldBalance.balance < amount) {
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

      // Audit log
      await this.logAudit({
        userId,
        action: 'wallet_deduction',
        resourceType: 'wallet',
        resourceId: reference,
        oldValues: { balance: oldBalance.balance },
        newValues: {
          balance: updatedBalance.balance,
          amount,
          description,
          reference,
          status: 'completed',
        },
        ipAddress,
        userAgent,
      });

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
