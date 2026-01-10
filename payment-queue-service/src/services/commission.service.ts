import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import logger from '../utils/logger';
import { InternalServerError } from '../utils/errors';

interface CommissionRule {
  id: string;
  module: 'hotel' | 'taxi' | 'ecommerce';
  transaction_type: string;
  commission_rate: number;
  min_commission: number | null;
  max_commission: number | null;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

interface CommissionCalculation {
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  appliedRule: string;
  module: string;
  transactionType: string;
}

export class CommissionService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
  }

  /**
   * Calculate commission based on module and transaction type with min/max rules
   */
  async calculateCommission(
    module: 'hotel' | 'taxi' | 'ecommerce',
    amount: number,
    transactionType: string = 'standard'
  ): Promise<CommissionCalculation> {
    try {
      // Get applicable commission rule
      const rule = await this.getCommissionRule(module, transactionType);

      if (!rule) {
        // Fallback to default rates from config
        const defaultRate = config.commissionRates[module] || 10;
        const commissionAmount = (amount * defaultRate) / 100;
        const netAmount = amount - commissionAmount;

        logger.info('Using default commission rate', {
          module,
          amount,
          rate: defaultRate,
          commissionAmount,
        });

        return {
          grossAmount: amount,
          commissionRate: defaultRate,
          commissionAmount: parseFloat(commissionAmount.toFixed(2)),
          netAmount: parseFloat(netAmount.toFixed(2)),
          appliedRule: 'default',
          module,
          transactionType,
        };
      }

      // Calculate commission using rule
      let commissionAmount = (amount * rule.commission_rate) / 100;

      // Apply minimum commission rule
      if (rule.min_commission !== null && commissionAmount < rule.min_commission) {
        commissionAmount = rule.min_commission;
        logger.info('Applied minimum commission rule', {
          module,
          amount,
          calculatedCommission: (amount * rule.commission_rate) / 100,
          minCommission: rule.min_commission,
        });
      }

      // Apply maximum commission rule
      if (rule.max_commission !== null && commissionAmount > rule.max_commission) {
        commissionAmount = rule.max_commission;
        logger.info('Applied maximum commission rule', {
          module,
          amount,
          calculatedCommission: (amount * rule.commission_rate) / 100,
          maxCommission: rule.max_commission,
        });
      }

      const netAmount = amount - commissionAmount;

      return {
        grossAmount: amount,
        commissionRate: rule.commission_rate,
        commissionAmount: parseFloat(commissionAmount.toFixed(2)),
        netAmount: parseFloat(netAmount.toFixed(2)),
        appliedRule: rule.id,
        module,
        transactionType,
      };
    } catch (error: any) {
      logger.error('Commission calculation failed', {
        error: error.message,
        module,
        amount,
        transactionType,
      });
      throw new InternalServerError('Failed to calculate commission');
    }
  }

  /**
   * Get active commission rule for module and transaction type
   */
  private async getCommissionRule(
    module: 'hotel' | 'taxi' | 'ecommerce',
    transactionType: string
  ): Promise<CommissionRule | null> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('commission_rules')
        .select('*')
        .eq('module', module)
        .eq('transaction_type', transactionType)
        .eq('is_active', true)
        .lte('effective_from', now)
        .or(`effective_to.is.null,effective_to.gte.${now}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          logger.debug('No commission rule found, will use default', {
            module,
            transactionType,
          });
          return null;
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      logger.error('Failed to fetch commission rule', {
        error: error.message,
        module,
        transactionType,
      });
      return null;
    }
  }

  /**
   * Create or update commission rule
   */
  async upsertCommissionRule(rule: {
    module: 'hotel' | 'taxi' | 'ecommerce';
    transaction_type: string;
    commission_rate: number;
    min_commission?: number;
    max_commission?: number;
    effective_from?: string;
    effective_to?: string;
  }): Promise<CommissionRule> {
    try {
      // Validate commission rate
      if (rule.commission_rate < 0 || rule.commission_rate > 100) {
        throw new Error('Commission rate must be between 0 and 100');
      }

      // Validate min/max commission
      if (
        rule.min_commission !== undefined &&
        rule.max_commission !== undefined &&
        rule.min_commission > rule.max_commission
      ) {
        throw new Error('Minimum commission cannot be greater than maximum commission');
      }

      const ruleData = {
        module: rule.module,
        transaction_type: rule.transaction_type,
        commission_rate: rule.commission_rate,
        min_commission: rule.min_commission || null,
        max_commission: rule.max_commission || null,
        effective_from: rule.effective_from || new Date().toISOString(),
        effective_to: rule.effective_to || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('commission_rules')
        .upsert(ruleData, {
          onConflict: 'module,transaction_type',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info('Commission rule upserted', { rule: data });

      return data;
    } catch (error: any) {
      logger.error('Failed to upsert commission rule', {
        error: error.message,
        rule,
      });
      throw new InternalServerError('Failed to save commission rule');
    }
  }

  /**
   * Get all active commission rules
   */
  async getActiveRules(): Promise<CommissionRule[]> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('commission_rules')
        .select('*')
        .eq('is_active', true)
        .lte('effective_from', now)
        .or(`effective_to.is.null,effective_to.gte.${now}`)
        .order('module', { ascending: true })
        .order('transaction_type', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error: any) {
      logger.error('Failed to fetch active commission rules', {
        error: error.message,
      });
      throw new InternalServerError('Failed to fetch commission rules');
    }
  }

  /**
   * Calculate commission breakdown for a payment batch
   */
  async calculateBatchCommissions(
    payments: Array<{
      module: 'hotel' | 'taxi' | 'ecommerce';
      amount: number;
      transactionType?: string;
    }>
  ): Promise<{
    totalGrossAmount: number;
    totalCommissionAmount: number;
    totalNetAmount: number;
    details: CommissionCalculation[];
  }> {
    const details: CommissionCalculation[] = [];
    let totalGrossAmount = 0;
    let totalCommissionAmount = 0;
    let totalNetAmount = 0;

    for (const payment of payments) {
      const calculation = await this.calculateCommission(
        payment.module,
        payment.amount,
        payment.transactionType || 'standard'
      );

      details.push(calculation);
      totalGrossAmount += calculation.grossAmount;
      totalCommissionAmount += calculation.commissionAmount;
      totalNetAmount += calculation.netAmount;
    }

    return {
      totalGrossAmount: parseFloat(totalGrossAmount.toFixed(2)),
      totalCommissionAmount: parseFloat(totalCommissionAmount.toFixed(2)),
      totalNetAmount: parseFloat(totalNetAmount.toFixed(2)),
      details,
    };
  }
}

// Singleton instance
export const commissionService = new CommissionService();
