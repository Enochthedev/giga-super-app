import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
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
        },
      },
      schemas: {
        PaymentRequest: {
          type: 'object',
          required: ['amount', 'currency', 'email', 'module', 'reference_id'],
          properties: {
            amount: {
              type: 'number',
              minimum: 100,
              description: 'Amount in smallest currency unit',
            },
            currency: { type: 'string', enum: ['NGN', 'USD', 'EUR'], default: 'NGN' },
            email: { type: 'string', format: 'email' },
            module: { type: 'string', enum: ['hotel', 'taxi', 'ecommerce', 'delivery'] },
            reference_id: { type: 'string', format: 'uuid' },
            metadata: { type: 'object' },
          },
        },
        PaymentResponse: {
          type: 'object',
          properties: {
            payment_id: { type: 'string', format: 'uuid' },
            reference: { type: 'string' },
            authorization_url: { type: 'string', format: 'uri' },
            access_code: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
          },
        },
        RefundRequest: {
          type: 'object',
          required: ['payment_id', 'amount', 'reason'],
          properties: {
            payment_id: { type: 'string', format: 'uuid' },
            amount: { type: 'number', minimum: 100 },
            reason: { type: 'string', minLength: 10 },
          },
        },
        RefundResponse: {
          type: 'object',
          properties: {
            refund_id: { type: 'string', format: 'uuid' },
            payment_id: { type: 'string', format: 'uuid' },
            amount: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
          },
        },
        SettlementRequest: {
          type: 'object',
          required: ['recipient_id', 'recipient_type', 'amount'],
          properties: {
            recipient_id: { type: 'string', format: 'uuid' },
            recipient_type: { type: 'string', enum: ['vendor', 'driver', 'hotel'] },
            amount: { type: 'number', minimum: 100 },
            payment_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
          },
        },
        QueueMetrics: {
          type: 'object',
          properties: {
            queue_name: { type: 'string' },
            waiting: { type: 'integer' },
            active: { type: 'integer' },
            completed: { type: 'integer' },
            failed: { type: 'integer' },
            delayed: { type: 'integer' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
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
