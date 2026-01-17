/**
 * Payment & Wallet Endpoints Documentation
 * Covers: Payment initialization, verification, wallet operations, refunds
 */

import type { ServiceDocumentation } from '../types/postman.types.js';

export const paymentService: ServiceDocumentation = {
  name: '04. Payment & Wallet',
  description: 'Payment processing, wallet management, escrow, and payouts',
  baseUrl: '{{base_url}}',
  version: '1.0.0',
  endpoints: [
    {
      name: 'Initialize Payment',
      description:
        'Initialize a payment session with supported payment providers (Paystack, Stripe). Returns a payment URL or checkout session.',
      method: 'POST',
      path: '/Initialize-payment',
      requiresAuth: true,
      requestBody: {
        description: 'Payment details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['amount', 'currency', 'reference', 'email'],
          properties: {
            amount: { type: 'number', description: 'Amount in smallest unit (kobo/cents)' },
            currency: { type: 'string', enum: ['NGN', 'USD', 'GBP', 'EUR'] },
            reference: { type: 'string' },
            email: { type: 'string', format: 'email' },
            metadata: { type: 'object' },
            callback_url: { type: 'string', format: 'url' },
            provider: { type: 'string', enum: ['paystack', 'stripe'] },
          },
        },
        example: {
          amount: 63000,
          currency: 'NGN',
          reference: 'book_12345',
          email: 'customer@example.com',
          metadata: {
            booking_id: 'booking-uuid-123',
            type: 'hotel_booking',
          },
          callback_url: 'https://myapp.com/payment/callback',
          provider: 'paystack',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Payment initialized',
          body: {
            success: true,
            data: {
              authorization_url: 'https://checkout.paystack.com/xyz123',
              access_code: 'xyz123',
              reference: 'book_12345',
              provider: 'paystack',
              expires_at: '2024-01-20T17:00:00Z',
            },
          },
        },
        {
          status: 400,
          description: 'Invalid payment details',
          body: {
            success: false,
            error: {
              code: 'INVALID_AMOUNT',
              message: 'Amount must be greater than 0',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Paystack Payment',
          description: 'Initialize Paystack checkout',
          request: {
            amount: 50000,
            currency: 'NGN',
            reference: 'pay_abc123',
            email: 'user@example.com',
            provider: 'paystack',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                authorization_url: 'https://paystack.com/checkout/...',
              },
            },
          },
        },
        {
          name: 'Stripe Payment',
          description: 'Initialize Stripe checkout',
          request: {
            amount: 10000,
            currency: 'USD',
            reference: 'pay_xyz789',
            email: 'user@example.com',
            provider: 'stripe',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                checkout_session_id: 'cs_test_...',
                authorization_url: 'https://checkout.stripe.com/...',
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Minimum Amount',
          description: 'When amount is below minimum',
          scenario: 'Amount of ₦50 (below ₦100 minimum)',
          expectedBehavior: 'Returns 400 with minimum amount error',
        },
        {
          name: 'Duplicate Reference',
          description: 'When reference was already used',
          scenario: 'Same reference sent twice',
          expectedBehavior: 'Returns 409 Conflict',
        },
        {
          name: 'Invalid Currency for Provider',
          description: 'When currency not supported by provider',
          scenario: 'NGN with Stripe (if not enabled)',
          expectedBehavior: 'Returns 400 with currency not supported error',
        },
      ],
      notes: [
        'Payment session expires in 30 minutes',
        'Redirect user to authorization_url for payment',
        'Reference must be unique per payment',
      ],
    },
    {
      name: 'Verify Payment',
      description: 'Verify a payment after callback. Confirms payment status with provider.',
      method: 'POST',
      path: '/Verify-payment',
      requiresAuth: true,
      requestBody: {
        description: 'Payment reference to verify',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['reference'],
          properties: {
            reference: { type: 'string' },
          },
        },
        example: {
          reference: 'book_12345',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Payment verified',
          body: {
            success: true,
            data: {
              status: 'success',
              reference: 'book_12345',
              amount: 63000,
              currency: 'NGN',
              paid_at: '2024-01-20T16:30:00Z',
              channel: 'card',
              card: {
                last4: '4081',
                brand: 'Visa',
              },
              metadata: {
                booking_id: 'booking-uuid-123',
              },
            },
          },
        },
        {
          status: 200,
          description: 'Payment failed',
          body: {
            success: true,
            data: {
              status: 'failed',
              reference: 'book_12345',
              failure_reason: 'Card declined',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Successful Payment',
          description: 'Verify completed payment',
          request: { reference: 'pay_success_123' },
          response: {
            status: 200,
            body: {
              success: true,
              data: { status: 'success' },
            },
          },
        },
        {
          name: 'Pending Payment',
          description: 'Payment still processing',
          request: { reference: 'pay_pending_456' },
          response: {
            status: 200,
            body: {
              success: true,
              data: { status: 'pending' },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Unknown Reference',
          description: 'When reference does not exist',
          scenario: 'Random/typo reference provided',
          expectedBehavior: 'Returns 404 with reference not found',
        },
        {
          name: 'Already Verified',
          description: 'When payment was already processed',
          scenario: 'Verify same reference twice',
          expectedBehavior: 'Returns cached result, does not double-process',
        },
      ],
    },
    {
      name: 'Pay With Wallet',
      description: 'Pay for a booking or product using wallet balance.',
      method: 'POST',
      path: '/Pay-with-wallet',
      requiresAuth: true,
      requestBody: {
        description: 'Wallet payment details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['amount', 'reference', 'description'],
          properties: {
            amount: { type: 'number' },
            reference: { type: 'string' },
            description: { type: 'string' },
            metadata: { type: 'object' },
          },
        },
        example: {
          amount: 630,
          reference: 'book_12345',
          description: 'Hotel booking payment',
          metadata: {
            booking_id: 'booking-uuid-123',
          },
        },
      },
      responses: [
        {
          status: 200,
          description: 'Payment successful',
          body: {
            success: true,
            data: {
              transaction_id: 'txn-uuid',
              amount: 630,
              currency: 'USD',
              new_balance: 1370,
              reference: 'book_12345',
              paid_at: '2024-01-20T16:00:00Z',
            },
          },
        },
        {
          status: 402,
          description: 'Insufficient balance',
          body: {
            success: false,
            error: {
              code: 'INSUFFICIENT_BALANCE',
              message: 'Your wallet balance is insufficient',
              current_balance: 500,
              required: 630,
              shortfall: 130,
            },
          },
        },
      ],
      examples: [
        {
          name: 'Full Wallet Payment',
          description: 'Pay entire amount with wallet',
          request: {
            amount: 200,
            reference: 'order_123',
            description: 'Food order',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: { new_balance: 800 },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Negative Amount',
          description: 'When amount is negative or zero',
          scenario: 'amount: -100',
          expectedBehavior: 'Returns 400 validation error',
        },
        {
          name: 'Concurrent Payments',
          description: 'When two payments happen simultaneously',
          scenario: 'Balance is ₦1000, two ₦600 payments at once',
          expectedBehavior: 'One succeeds, one fails with insufficient balance',
        },
      ],
    },
    {
      name: 'Topup Wallet',
      description: 'Add funds to user wallet via payment provider.',
      method: 'POST',
      path: '/Topup-wallet',
      requiresAuth: true,
      requestBody: {
        description: 'Topup details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: { type: 'number' },
            provider: { type: 'string', enum: ['paystack', 'stripe'] },
          },
        },
        example: {
          amount: 5000,
          provider: 'paystack',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Topup initialized',
          body: {
            success: true,
            data: {
              authorization_url: 'https://checkout.paystack.com/xyz',
              reference: 'top_12345',
              amount: 5000,
            },
          },
        },
      ],
      examples: [],
      edgeCases: [
        {
          name: 'Below Minimum',
          description: 'When topup is below minimum',
          scenario: 'Topup ₦100 when minimum is ₦500',
          expectedBehavior: 'Returns 400 with minimum topup error',
        },
        {
          name: 'Above Maximum',
          description: 'When topup exceeds daily limit',
          scenario: 'Topup ₦1,000,000',
          expectedBehavior: 'Returns 400 with limit exceeded error',
        },
      ],
    },
    {
      name: 'Get Vendor Balance',
      description: "Get vendor's current balance including pending payouts and escrow.",
      method: 'GET',
      path: '/Get-vendor-balance',
      requiresAuth: true,
      responses: [
        {
          status: 200,
          description: 'Balance retrieved',
          body: {
            success: true,
            data: {
              available_balance: 25000,
              pending_balance: 15000,
              escrow_balance: 8000,
              total_earned: 150000,
              total_withdrawn: 102000,
              currency: 'NGN',
              last_payout: {
                amount: 20000,
                date: '2024-01-15T10:00:00Z',
                status: 'completed',
              },
            },
          },
        },
        {
          status: 403,
          description: 'Not a vendor',
          body: {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Vendor role required',
            },
          },
        },
      ],
      examples: [
        {
          name: 'New Vendor',
          description: 'Vendor with no earnings yet',
          request: {},
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                available_balance: 0,
                total_earned: 0,
              },
            },
          },
        },
      ],
      edgeCases: [],
    },
    {
      name: 'Create Payout Request',
      description: "Request a payout of available balance to vendor's bank account.",
      method: 'POST',
      path: '/Create-payout-request',
      requiresAuth: true,
      requestBody: {
        description: 'Payout request details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['amount', 'bank_account_id'],
          properties: {
            amount: { type: 'number' },
            bank_account_id: { type: 'string' },
          },
        },
        example: {
          amount: 20000,
          bank_account_id: 'bank-account-uuid',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Payout request created',
          body: {
            success: true,
            data: {
              payout_id: 'payout-uuid',
              amount: 20000,
              bank_account: {
                bank_name: 'First Bank',
                account_number: '****1234',
              },
              status: 'pending',
              estimated_arrival: '2-3 business days',
              created_at: '2024-01-20T16:00:00Z',
            },
          },
        },
        {
          status: 402,
          description: 'Insufficient available balance',
          body: {
            success: false,
            error: {
              code: 'INSUFFICIENT_BALANCE',
              message: 'Requested amount exceeds available balance',
              available: 15000,
              requested: 20000,
            },
          },
        },
      ],
      examples: [
        {
          name: 'Full Withdrawal',
          description: 'Withdraw entire available balance',
          request: {
            amount: 25000,
            bank_account_id: 'bank-uuid',
          },
          response: {
            status: 201,
            body: {
              success: true,
              data: { status: 'pending' },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Below Minimum Payout',
          description: 'When amount is below minimum',
          scenario: 'Request ₦500 payout (minimum ₦5000)',
          expectedBehavior: 'Returns 400 with minimum payout error',
        },
        {
          name: 'Invalid Bank Account',
          description: 'When bank account ID is wrong',
          scenario: 'Non-existent or unverified bank account',
          expectedBehavior: 'Returns 404 or 400',
        },
        {
          name: 'Pending Payout Exists',
          description: 'When there is already a pending payout',
          scenario: 'Request new payout while one is processing',
          expectedBehavior: 'May allow or block with pending payout error',
        },
      ],
      notes: [
        'Payouts are processed in 2-3 business days',
        'Bank account must be verified before first payout',
        'Minimum payout amount is ₦5,000',
      ],
    },
    {
      name: 'Process Refund',
      description:
        'Process a refund for a booking or order. Funds return to original payment method or wallet.',
      method: 'POST',
      path: '/Process-refund',
      requiresAuth: true,
      requestBody: {
        description: 'Refund details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['reference', 'amount'],
          properties: {
            reference: { type: 'string', description: 'Original payment reference' },
            amount: { type: 'number' },
            reason: { type: 'string' },
            refund_to: { type: 'string', enum: ['original', 'wallet'] },
          },
        },
        example: {
          reference: 'book_12345',
          amount: 63000,
          reason: 'Booking cancelled by guest',
          refund_to: 'original',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Refund processed',
          body: {
            success: true,
            data: {
              refund_id: 'refund-uuid',
              original_reference: 'book_12345',
              refund_amount: 63000,
              refund_method: 'card',
              status: 'pending',
              estimated_time: '5-7 business days',
              processed_at: '2024-01-20T16:00:00Z',
            },
          },
        },
        {
          status: 400,
          description: 'Refund not possible',
          body: {
            success: false,
            error: {
              code: 'REFUND_NOT_ALLOWED',
              message: 'This payment is not eligible for refund',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Full Refund',
          description: 'Refund entire payment',
          request: {
            reference: 'pay_123',
            amount: 500,
            reason: 'Customer request',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: { status: 'pending' },
            },
          },
        },
        {
          name: 'Partial Refund',
          description: 'Refund portion of payment',
          request: {
            reference: 'pay_456',
            amount: 200,
            reason: 'Partial service not delivered',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: { refund_amount: 200 },
            },
          },
        },
        {
          name: 'Refund to Wallet',
          description: 'Refund as wallet credit instead of original method',
          request: {
            reference: 'pay_789',
            amount: 300,
            refund_to: 'wallet',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: { refund_method: 'wallet' },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Exceeds Original Amount',
          description: 'When refund amount is more than paid',
          scenario: 'Refund ₦70,000 on ₦63,000 payment',
          expectedBehavior: 'Returns 400 with exceed original error',
        },
        {
          name: 'Already Refunded',
          description: 'When payment was already fully refunded',
          scenario: 'Second refund request for same payment',
          expectedBehavior: 'Returns 400 with already refunded error',
        },
        {
          name: 'Old Payment',
          description: 'When payment is too old for refund',
          scenario: 'Refund payment from 6 months ago',
          expectedBehavior: 'May be rejected by provider',
        },
      ],
    },
    {
      name: 'Release Escrow',
      description:
        'Release funds from escrow after service completion. Moves funds to vendor available balance.',
      method: 'POST',
      path: '/Release-escrow',
      requiresAuth: true,
      requestBody: {
        description: 'Escrow release details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['booking_id'],
          properties: {
            booking_id: { type: 'string' },
          },
        },
        example: {
          booking_id: 'booking-uuid-123',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Escrow released',
          body: {
            success: true,
            data: {
              escrow_id: 'escrow-uuid',
              booking_id: 'booking-uuid-123',
              amount_released: 600,
              platform_fee: 30,
              vendor_receives: 570,
              released_at: '2024-01-20T16:00:00Z',
            },
          },
        },
        {
          status: 400,
          description: 'Service not completed',
          body: {
            success: false,
            error: {
              code: 'SERVICE_NOT_COMPLETED',
              message: 'Escrow can only be released after checkout',
            },
          },
        },
      ],
      examples: [],
      edgeCases: [
        {
          name: 'Dispute Open',
          description: 'When there is an open dispute',
          scenario: 'Guest filed complaint before checkout',
          expectedBehavior: 'Returns 400 with dispute pending message',
        },
        {
          name: 'Already Released',
          description: 'When escrow was already released',
          scenario: 'Double release request',
          expectedBehavior: 'Returns 400 or 200 with no-op',
        },
      ],
    },
    {
      name: 'Paystack Webhook',
      description: 'Webhook endpoint for Paystack payment notifications. Not for direct API calls.',
      method: 'POST',
      path: '/Paystack-webhook',
      requiresAuth: false,
      headers: [{ key: 'x-paystack-signature', value: 'webhook_signature_hash' }],
      requestBody: {
        description: 'Paystack webhook payload',
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            event: { type: 'string' },
            data: { type: 'object' },
          },
        },
        example: {
          event: 'charge.success',
          data: {
            reference: 'book_12345',
            amount: 6300000,
            currency: 'NGN',
            status: 'success',
          },
        },
      },
      responses: [
        {
          status: 200,
          description: 'Webhook processed',
          body: { received: true },
        },
      ],
      examples: [
        {
          name: 'Successful Charge',
          description: 'Payment successful webhook',
          request: {
            event: 'charge.success',
            data: { reference: 'pay_123', status: 'success' },
          },
          response: {
            status: 200,
            body: { received: true },
          },
        },
        {
          name: 'Failed Charge',
          description: 'Payment failed webhook',
          request: {
            event: 'charge.failed',
            data: { reference: 'pay_456', status: 'failed' },
          },
          response: {
            status: 200,
            body: { received: true },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Invalid Signature',
          description: 'When signature verification fails',
          scenario: 'Tampered or forged webhook',
          expectedBehavior: 'Returns 401 and ignores the request',
        },
        {
          name: 'Duplicate Webhook',
          description: 'When same event is sent twice',
          scenario: 'Paystack retries webhook',
          expectedBehavior: 'Idempotent - returns 200 without reprocessing',
        },
      ],
      notes: [
        'This endpoint is called by Paystack, not by clients',
        'Signature verification is required',
        'Always return 200 to acknowledge receipt',
      ],
    },
  ],
};

export default paymentService;
