import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { PaymentProcessingError, ServiceUnavailableError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Paystack Payment Service
 *
 * Handles all Paystack payment operations with automatic demo mode fallback
 * when API keys are not configured.
 *
 * Demo Mode:
 * - Simulates successful payment flows without hitting Paystack API
 * - Useful for development and testing without real API keys
 * - Automatically enabled when PAYSTACK_SECRET_KEY is not set
 */

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
    };
  };
}

export class PaystackService {
  private client: AxiosInstance | null = null;
  private isDemoMode: boolean;

  constructor() {
    this.isDemoMode = !config.paystackSecretKey || config.paystackSecretKey === '';

    if (this.isDemoMode) {
      logger.warn('Paystack running in DEMO MODE - no API key configured');
    } else {
      this.client = axios.create({
        baseURL: 'https://api.paystack.co',
        headers: {
          Authorization: `Bearer ${config.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    }
  }

  /**
   * Initialize a payment transaction
   *
   * In production: Creates a Paystack transaction and returns checkout URL
   * In demo mode: Returns a simulated checkout URL
   */
  async initializeTransaction(params: {
    email: string;
    amount: number; // In major currency units (e.g., NGN, not kobo)
    currency?: string;
    reference?: string;
    callback_url?: string;
    metadata?: any;
  }): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    const reference = params.reference || `TXN-${Date.now()}-${uuidv4().substring(0, 8)}`;

    // Demo mode simulation
    if (this.isDemoMode) {
      logger.info('DEMO MODE: Simulating Paystack transaction initialization', {
        email: params.email,
        amount: params.amount,
        reference,
      });

      return {
        authorization_url: `https://demo-checkout.paystack.com/${reference}`,
        access_code: `demo_access_${uuidv4().substring(0, 12)}`,
        reference,
      };
    }

    // Production mode - real Paystack API call
    try {
      const response = await this.client!.post<PaystackInitializeResponse>(
        '/transaction/initialize',
        {
          email: params.email,
          amount: Math.round(params.amount * 100), // Convert to kobo
          currency: params.currency || 'NGN',
          reference,
          callback_url: params.callback_url,
          metadata: params.metadata,
        }
      );

      if (!response.data.status) {
        throw new PaymentProcessingError(response.data.message || 'Paystack initialization failed');
      }

      logger.info('Paystack transaction initialized', {
        reference,
        email: params.email,
        amount: params.amount,
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Paystack initialization failed', {
        error: error.message,
        reference,
      });

      if (error.response?.status === 401) {
        throw new ServiceUnavailableError('Invalid Paystack API key');
      }

      throw new PaymentProcessingError(`Paystack initialization failed: ${error.message}`);
    }
  }

  /**
   * Verify a payment transaction
   *
   * In production: Verifies with Paystack API
   * In demo mode: Returns simulated successful verification
   */
  async verifyTransaction(reference: string): Promise<{
    status: 'success' | 'failed' | 'abandoned';
    amount: number; // In major currency units
    currency: string;
    paid_at: string;
    customer_email: string;
    metadata: any;
  }> {
    // Demo mode simulation
    if (this.isDemoMode) {
      logger.info('DEMO MODE: Simulating Paystack transaction verification', {
        reference,
      });

      return {
        status: 'success',
        amount: 10000, // Demo amount in NGN
        currency: 'NGN',
        paid_at: new Date().toISOString(),
        customer_email: 'demo@example.com',
        metadata: {},
      };
    }

    // Production mode - real Paystack API call
    try {
      const response = await this.client!.get<PaystackVerifyResponse>(
        `/transaction/verify/${reference}`
      );

      if (!response.data.status) {
        throw new PaymentProcessingError(response.data.message || 'Paystack verification failed');
      }

      const data = response.data.data;

      logger.info('Paystack transaction verified', {
        reference,
        status: data.status,
        amount: data.amount / 100,
      });

      return {
        status: data.status,
        amount: data.amount / 100, // Convert from kobo to NGN
        currency: data.currency,
        paid_at: data.paid_at,
        customer_email: data.customer.email,
        metadata: data.metadata,
      };
    } catch (error: any) {
      logger.error('Paystack verification failed', {
        error: error.message,
        reference,
      });

      throw new PaymentProcessingError(`Paystack verification failed: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   *
   * In production: Validates Paystack webhook signature
   * In demo mode: Always returns true
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    if (this.isDemoMode) {
      logger.info('DEMO MODE: Skipping webhook signature verification');
      return true;
    }

    const crypto = require('crypto');
    const hash = crypto.createHmac('sha512', config.paystackSecretKey).update(body).digest('hex');

    return hash === signature;
  }

  /**
   * Get transaction details
   */
  async getTransaction(reference: string): Promise<any> {
    if (this.isDemoMode) {
      logger.info('DEMO MODE: Returning demo transaction details', { reference });
      return {
        reference,
        status: 'success',
        amount: 10000,
        currency: 'NGN',
      };
    }

    try {
      const response = await this.client!.get(`/transaction/${reference}`);
      return response.data.data;
    } catch (error: any) {
      logger.error('Failed to get transaction', {
        error: error.message,
        reference,
      });
      throw new PaymentProcessingError('Failed to get transaction details');
    }
  }

  /**
   * Check if service is in demo mode
   */
  isDemo(): boolean {
    return this.isDemoMode;
  }
}

// Singleton instance
export const paystackService = new PaystackService();
