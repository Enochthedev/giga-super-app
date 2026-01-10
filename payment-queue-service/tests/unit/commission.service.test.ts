import { CommissionService } from '../../src/services/commission.service';

describe('CommissionService', () => {
  let commissionService: CommissionService;

  beforeEach(() => {
    commissionService = new CommissionService();
  });

  describe('calculateCommission', () => {
    it('should calculate commission with percentage rate', async () => {
      const result = await commissionService.calculateCommission('hotel', 1000, 'standard');

      expect(result.grossAmount).toBe(1000);
      expect(result.commissionRate).toBeGreaterThanOrEqual(0);
      expect(result.commissionAmount).toBeGreaterThan(0);
      expect(result.netAmount).toBe(result.grossAmount - result.commissionAmount);
    });

    it('should calculate commission for different modules', async () => {
      const hotelResult = await commissionService.calculateCommission('hotel', 1000, 'standard');
      const taxiResult = await commissionService.calculateCommission('taxi', 1000, 'standard');
      const ecommerceResult = await commissionService.calculateCommission('ecommerce', 1000, 'standard');

      expect(hotelResult.commissionAmount).toBeGreaterThan(0);
      expect(taxiResult.commissionAmount).toBeGreaterThan(0);
      expect(ecommerceResult.commissionAmount).toBeGreaterThan(0);
    });

    it('should handle minimum commission rule', async () => {
      // Test with a small amount that would trigger minimum commission
      const result = await commissionService.calculateCommission('hotel', 10, 'standard');

      expect(result.commissionAmount).toBeGreaterThan(0);
      expect(result.netAmount).toBeLessThan(result.grossAmount);
    });

    it('should handle maximum commission rule', async () => {
      // Test with a large amount that would trigger maximum commission
      const result = await commissionService.calculateCommission('hotel', 1000000, 'standard');

      expect(result.commissionAmount).toBeGreaterThan(0);
      expect(result.netAmount).toBeLessThan(result.grossAmount);
    });

    it('should return correct breakdown for commission calculation', async () => {
      const result = await commissionService.calculateCommission('taxi', 5000, 'standard');

      expect(result).toHaveProperty('grossAmount');
      expect(result).toHaveProperty('commissionRate');
      expect(result).toHaveProperty('commissionAmount');
      expect(result).toHaveProperty('netAmount');
      expect(result).toHaveProperty('appliedRule');
      expect(result).toHaveProperty('module');
      expect(result).toHaveProperty('transactionType');
    });
  });

  describe('calculateBatchCommissions', () => {
    it('should calculate commissions for multiple payments', async () => {
      const payments = [
        { module: 'hotel' as const, amount: 1000, transactionType: 'standard' },
        { module: 'taxi' as const, amount: 500, transactionType: 'standard' },
        { module: 'ecommerce' as const, amount: 2000, transactionType: 'standard' },
      ];

      const result = await commissionService.calculateBatchCommissions(payments);

      expect(result.totalGrossAmount).toBe(3500);
      expect(result.totalCommissionAmount).toBeGreaterThan(0);
      expect(result.totalNetAmount).toBe(result.totalGrossAmount - result.totalCommissionAmount);
      expect(result.details).toHaveLength(3);
    });

    it('should handle empty payment array', async () => {
      const result = await commissionService.calculateBatchCommissions([]);

      expect(result.totalGrossAmount).toBe(0);
      expect(result.totalCommissionAmount).toBe(0);
      expect(result.totalNetAmount).toBe(0);
      expect(result.details).toHaveLength(0);
    });
  });
});
