import { BadRequestError } from './errors';

export class Validator {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format (Nigerian format)
   */
  static isValidPhone(phone: string): boolean {
    // Nigerian phone: +234XXXXXXXXXX or 0XXXXXXXXXX
    const phoneRegex = /^(\+234|0)[7-9][0-1]\d{8}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate amount (must be positive number)
   */
  static isValidAmount(amount: number): boolean {
    return typeof amount === 'number' && amount > 0 && isFinite(amount);
  }

  /**
   * Validate currency code (ISO 4217)
   */
  static isValidCurrency(currency: string): boolean {
    const validCurrencies = ['NGN', 'USD', 'EUR', 'GBP'];
    return validCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Validate module type
   */
  static isValidModule(module: string): boolean {
    const validModules = ['hotel', 'taxi', 'ecommerce'];
    return validModules.includes(module.toLowerCase());
  }

  /**
   * Validate payment method
   */
  static isValidPaymentMethod(method: string): boolean {
    const validMethods = ['paystack', 'stripe'];
    return validMethods.includes(method.toLowerCase());
  }

  /**
   * Validate payment request data
   */
  static validatePaymentRequest(data: {
    module?: string;
    amount?: number;
    currency?: string;
    userId?: string;
    branchId?: string;
    stateId?: string;
    metadata?: any;
  }): void {
    const errors: string[] = [];

    if (!data.module) {
      errors.push('Module is required');
    } else if (!this.isValidModule(data.module)) {
      errors.push('Invalid module. Must be one of: hotel, taxi, ecommerce');
    }

    if (!data.amount) {
      errors.push('Amount is required');
    } else if (!this.isValidAmount(data.amount)) {
      errors.push('Invalid amount. Must be a positive number');
    }

    if (!data.currency) {
      errors.push('Currency is required');
    } else if (!this.isValidCurrency(data.currency)) {
      errors.push('Invalid currency. Must be one of: NGN, USD, EUR, GBP');
    }

    if (!data.userId) {
      errors.push('User ID is required');
    } else if (!this.isValidUUID(data.userId)) {
      errors.push('Invalid user ID format');
    }

    if (!data.branchId) {
      errors.push('Branch ID is required');
    } else if (!this.isValidUUID(data.branchId)) {
      errors.push('Invalid branch ID format');
    }

    if (!data.stateId) {
      errors.push('State ID is required');
    } else if (!this.isValidUUID(data.stateId)) {
      errors.push('Invalid state ID format');
    }

    if (!data.metadata) {
      errors.push('Metadata is required');
    } else {
      if (!data.metadata.moduleTransactionId) {
        errors.push('Module transaction ID is required in metadata');
      }
      if (data.metadata.customerEmail && !this.isValidEmail(data.metadata.customerEmail)) {
        errors.push('Invalid customer email format');
      }
      if (data.metadata.customerPhone && !this.isValidPhone(data.metadata.customerPhone)) {
        errors.push('Invalid customer phone format');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestError(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate refund request
   */
  static validateRefundRequest(data: {
    transactionId?: string;
    reason?: string;
    amount?: number;
  }): void {
    const errors: string[] = [];

    if (!data.transactionId) {
      errors.push('Transaction ID is required');
    }

    if (!data.reason) {
      errors.push('Refund reason is required');
    } else if (data.reason.length < 10) {
      errors.push('Refund reason must be at least 10 characters');
    }

    if (data.amount !== undefined && !this.isValidAmount(data.amount)) {
      errors.push('Invalid refund amount. Must be a positive number');
    }

    if (errors.length > 0) {
      throw new BadRequestError(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Sanitize string input (prevent XSS)
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  /**
   * Validate date range
   */
  static validateDateRange(startDate: Date, endDate: Date): void {
    if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
      throw new BadRequestError('Invalid start date');
    }
    if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
      throw new BadRequestError('Invalid end date');
    }
    if (startDate > endDate) {
      throw new BadRequestError('Start date must be before end date');
    }
    
    // Check if date range is not too large (max 1 year)
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (endDate.getTime() - startDate.getTime() > oneYear) {
      throw new BadRequestError('Date range cannot exceed 1 year');
    }
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page?: number, limit?: number): { page: number; limit: number } {
    const validatedPage = page && page > 0 ? Math.floor(page) : 1;
    const validatedLimit = limit && limit > 0 && limit <= 100 ? Math.floor(limit) : 20;

    return { page: validatedPage, limit: validatedLimit };
  }

  /**
   * Validate admin hierarchy level
   */
  static validateAdminLevel(level: string): boolean {
    const validLevels = ['branch', 'state', 'national'];
    return validLevels.includes(level.toLowerCase());
  }
}
