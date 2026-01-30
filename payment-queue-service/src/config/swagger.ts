// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerJsdoc = require('swagger-jsdoc');

const options: Record<string, unknown> = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Giga Payment Queue Service API',
      version: '1.0.0',
      description: `
## Payment Queue Service API

Centralized payment processing service using BullMQ for reliable queue management.

### Features
- **Payment Processing**: Initialize and process payments via Paystack/Stripe
- **Webhook Handling**: Secure webhook processing with signature verification
- **Refund Management**: Process refunds with automatic queue handling
- **Settlement Processing**: Automated vendor/driver settlements
- **Commission Calculation**: Automatic commission splits

### Payment Providers
- **Paystack**: Primary provider for Nigerian transactions (NGN)
- **Stripe**: International payments (USD, EUR, etc.)

### Queue Architecture
- Payment Queue: Main payment processing
- Webhook Queue: Webhook event processing
- Refund Queue: Refund processing
- Settlement Queue: Vendor/driver settlements
- Notification Queue: Payment notifications

### Security
- All webhooks verified with provider signatures
- JWT authentication for API endpoints
- Rate limiting on all endpoints

### Response Format
\`\`\`json
{
  "success": true,
  "data": {
    "payment_id": "uuid",
    "status": "pending|processing|completed|failed",
    "reference": "PAY_xxx"
  },
  "metadata": { "timestamp": "ISO8601", "request_id": "uuid" }
}
\`\`\`
      `,
      contact: {
        name: 'Giga Platform Team',
        email: 'api@giga.com',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    tags: [
      { name: 'Health', description: 'Service health and metrics' },
      { name: 'Payments', description: 'Payment initialization and processing' },
      { name: 'Webhooks', description: 'Payment provider webhooks' },
      { name: 'Refunds', description: 'Refund processing' },
      { name: 'Settlements', description: 'Vendor/driver settlements' },
      { name: 'Metrics', description: 'Queue metrics and monitoring' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from Supabase Auth',
        },
        WebhookSignature: {
          type: 'apiKey',
          in: 'header',
          name: 'x-paystack-signature',
          description: 'Webhook signature from payment provider',
        },
      },
      schemas: {
        // Request schemas
        PaymentRequest: {
          type: 'object',
          required: ['amount', 'currency', 'email', 'module', 'reference_id'],
          properties: {
            amount: {
              type: 'number',
              minimum: 100,
              description: 'Amount in smallest currency unit (kobo for NGN, cents for USD)',
              example: 500000,
            },
            currency: {
              type: 'string',
              enum: ['NGN', 'USD', 'EUR', 'GBP'],
              default: 'NGN',
              example: 'NGN',
            },
            email: { type: 'string', format: 'email', example: 'customer@example.com' },
            module: {
              type: 'string',
              enum: ['hotel', 'taxi', 'ecommerce', 'delivery', 'subscription'],
              example: 'hotel',
            },
            reference_id: {
              type: 'string',
              format: 'uuid',
              description: 'Booking/order ID',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            customer_id: { type: 'string', format: 'uuid' },
            vendor_id: {
              type: 'string',
              format: 'uuid',
              description: 'Vendor/driver to receive settlement',
            },
            metadata: {
              type: 'object',
              additionalProperties: true,
              example: { booking_id: 'BK-12345', room_type: 'deluxe' },
            },
            callback_url: { type: 'string', format: 'uri', description: 'Redirect after payment' },
          },
        },
        VerifyPaymentRequest: {
          type: 'object',
          required: ['reference'],
          properties: {
            reference: { type: 'string', example: 'PAY_1234567890' },
          },
        },
        RefundRequest: {
          type: 'object',
          required: ['payment_id', 'amount', 'reason'],
          properties: {
            payment_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            amount: {
              type: 'number',
              minimum: 100,
              description: 'Amount to refund in kobo/cents',
              example: 250000,
            },
            reason: {
              type: 'string',
              minLength: 10,
              example: 'Customer cancelled booking before check-in',
            },
            initiated_by: { type: 'string', format: 'uuid' },
          },
        },
        SettlementRequest: {
          type: 'object',
          required: ['recipient_id', 'recipient_type', 'amount'],
          properties: {
            recipient_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            recipient_type: {
              type: 'string',
              enum: ['vendor', 'driver', 'hotel'],
              example: 'hotel',
            },
            amount: { type: 'number', minimum: 100, example: 450000 },
            payment_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
            notes: { type: 'string', example: 'Weekly settlement for bookings' },
          },
        },
        // Response schemas
        PaymentResponse: {
          type: 'object',
          properties: {
            payment_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            reference: { type: 'string', example: 'PAY_1234567890_hotel' },
            authorization_url: {
              type: 'string',
              format: 'uri',
              example: 'https://checkout.paystack.com/abc123',
            },
            access_code: { type: 'string', example: 'abc123xyz' },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
              example: 'pending',
            },
            provider: { type: 'string', enum: ['paystack', 'stripe'], example: 'paystack' },
          },
        },
        PaymentVerification: {
          type: 'object',
          properties: {
            payment_id: { type: 'string', format: 'uuid' },
            reference: { type: 'string', example: 'PAY_1234567890_hotel' },
            status: {
              type: 'string',
              enum: ['success', 'failed', 'pending', 'abandoned'],
              example: 'success',
            },
            amount: { type: 'number', example: 500000 },
            currency: { type: 'string', example: 'NGN' },
            paid_at: { type: 'string', format: 'date-time' },
            channel: {
              type: 'string',
              enum: ['card', 'bank_transfer', 'ussd', 'mobile_money'],
              example: 'card',
            },
            card_type: { type: 'string', example: 'visa' },
            last4: { type: 'string', example: '4081' },
            commission: { $ref: '#/components/schemas/CommissionBreakdown' },
          },
        },
        RefundResponse: {
          type: 'object',
          properties: {
            refund_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            payment_id: { type: 'string', format: 'uuid' },
            amount: { type: 'number', example: 250000 },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
              example: 'processing',
            },
            provider_reference: { type: 'string' },
            estimated_completion: { type: 'string', format: 'date-time' },
          },
        },
        SettlementResponse: {
          type: 'object',
          properties: {
            settlement_id: { type: 'string', format: 'uuid' },
            recipient_id: { type: 'string', format: 'uuid' },
            amount: { type: 'number', example: 450000 },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
              example: 'completed',
            },
            bank_name: { type: 'string', example: 'GTBank' },
            account_number: { type: 'string', example: '****1234' },
            processed_at: { type: 'string', format: 'date-time' },
          },
        },
        // Entity schemas
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            reference: { type: 'string', example: 'PAY_1234567890_hotel' },
            user_id: { type: 'string', format: 'uuid' },
            vendor_id: { type: 'string', format: 'uuid' },
            module: { type: 'string', enum: ['hotel', 'taxi', 'ecommerce', 'delivery'] },
            amount: { type: 'number', example: 500000 },
            currency: { type: 'string', example: 'NGN' },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
            },
            provider: { type: 'string', enum: ['paystack', 'stripe'] },
            provider_reference: { type: 'string' },
            commission_amount: { type: 'number' },
            vendor_amount: { type: 'number' },
            paid_at: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        TransactionHistory: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            payment_id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['payment', 'refund', 'settlement', 'chargeback'] },
            amount: { type: 'number' },
            status: { type: 'string' },
            description: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        CommissionBreakdown: {
          type: 'object',
          properties: {
            gross_amount: { type: 'number', example: 500000 },
            platform_fee: { type: 'number', description: 'Giga platform fee', example: 25000 },
            payment_fee: { type: 'number', description: 'Paystack/Stripe fee', example: 7500 },
            vendor_amount: { type: 'number', description: 'Amount to vendor', example: 467500 },
            commission_rate: { type: 'number', description: 'Platform commission %', example: 5 },
          },
        },
        WebhookPayload: {
          type: 'object',
          description: 'Paystack webhook event payload',
          properties: {
            event: {
              type: 'string',
              enum: [
                'charge.success',
                'transfer.success',
                'refund.processed',
                'subscription.create',
              ],
              example: 'charge.success',
            },
            data: {
              type: 'object',
              properties: {
                reference: { type: 'string' },
                amount: { type: 'number' },
                status: { type: 'string' },
                paid_at: { type: 'string' },
                channel: { type: 'string' },
                customer: {
                  type: 'object',
                  properties: {
                    email: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        QueueMetrics: {
          type: 'object',
          properties: {
            queue_name: { type: 'string', example: 'payment-queue' },
            waiting: { type: 'integer', example: 5 },
            active: { type: 'integer', example: 2 },
            completed: { type: 'integer', example: 1500 },
            failed: { type: 'integer', example: 12 },
            delayed: { type: 'integer', example: 3 },
            paused: { type: 'boolean', example: false },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            metadata: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                request_id: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'PAYMENT_FAILED' },
                message: { type: 'string', example: 'Payment could not be processed' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 500 },
            pages: { type: 'integer', example: 25 },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Unauthorized - Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'AUTHENTICATION_REQUIRED', message: 'Valid JWT token required' },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'You do not have permission to access this payment',
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'PAYMENT_NOT_FOUND',
                  message: 'Payment with this reference not found',
                },
              },
            },
          },
        },
        BadRequestError: {
          description: 'Bad Request - Invalid input',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Amount must be at least 100 (₦1)' },
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'PROVIDER_ERROR',
                  message: 'Payment provider temporarily unavailable',
                },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
