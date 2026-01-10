import { Validator } from '../../src/utils/validator';
import { BadRequestError } from '../../src/utils/errors';

describe('Validator', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(Validator.isValidEmail('test@example.com')).toBe(true);
      expect(Validator.isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(Validator.isValidEmail('invalid')).toBe(false);
      expect(Validator.isValidEmail('@example.com')).toBe(false);
      expect(Validator.isValidEmail('test@')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate Nigerian phone numbers', () => {
      expect(Validator.isValidPhone('+2348012345678')).toBe(true);
      expect(Validator.isValidPhone('08012345678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(Validator.isValidPhone('1234567890')).toBe(false);
      expect(Validator.isValidPhone('+1234567890')).toBe(false);
    });
  });

  describe('isValidAmount', () => {
    it('should validate positive amounts', () => {
      expect(Validator.isValidAmount(100)).toBe(true);
      expect(Validator.isValidAmount(0.01)).toBe(true);
      expect(Validator.isValidAmount(9999.99)).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(Validator.isValidAmount(0)).toBe(false);
      expect(Validator.isValidAmount(-100)).toBe(false);
      expect(Validator.isValidAmount(NaN)).toBe(false);
      expect(Validator.isValidAmount(Infinity)).toBe(false);
    });
  });

  describe('validatePaymentRequest', () => {
    const validPaymentRequest = {
      module: 'hotel',
      amount: 1000,
      currency: 'NGN',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      branchId: '550e8400-e29b-41d4-a716-446655440001',
      stateId: '550e8400-e29b-41d4-a716-446655440002',
      metadata: {
        moduleTransactionId: 'TXN123',
        customerEmail: 'test@example.com',
        customerPhone: '08012345678',
      },
    };

    it('should validate a correct payment request', () => {
      expect(() => {
        Validator.validatePaymentRequest(validPaymentRequest);
      }).not.toThrow();
    });

    it('should throw error for missing module', () => {
      const request = { ...validPaymentRequest };
      delete (request as any).module;

      expect(() => {
        Validator.validatePaymentRequest(request);
      }).toThrow(BadRequestError);
    });

    it('should throw error for invalid amount', () => {
      const request = { ...validPaymentRequest, amount: -100 };

      expect(() => {
        Validator.validatePaymentRequest(request);
      }).toThrow(BadRequestError);
    });

    it('should throw error for invalid email in metadata', () => {
      const request = {
        ...validPaymentRequest,
        metadata: {
          ...validPaymentRequest.metadata,
          customerEmail: 'invalid-email',
        },
      };

      expect(() => {
        Validator.validatePaymentRequest(request);
      }).toThrow(BadRequestError);
    });
  });

  describe('validateDateRange', () => {
    it('should validate correct date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      expect(() => {
        Validator.validateDateRange(startDate, endDate);
      }).not.toThrow();
    });

    it('should throw error when start date is after end date', () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');

      expect(() => {
        Validator.validateDateRange(startDate, endDate);
      }).toThrow(BadRequestError);
    });

    it('should throw error for date range exceeding 1 year', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2024-12-31');

      expect(() => {
        Validator.validateDateRange(startDate, endDate);
      }).toThrow(BadRequestError);
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;';

      expect(Validator.sanitizeString(input)).toBe(expected);
    });

    it('should trim whitespace', () => {
      expect(Validator.sanitizeString('  test  ')).toBe('test');
    });
  });
});
