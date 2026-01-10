# Payment Queue Service

Centralized payment queue service for the Giga platform. Handles all payment requests using BullMQ with support for Paystack and Stripe payment providers.

## Features

- **Multiple BullMQ Queues**: Separate queues for payments, webhooks, refunds, settlements, and notifications
- **Payment Providers**: Support for Paystack and Stripe
- **Commission Management**: Dynamic commission calculation with min/max rules
- **Admin Hierarchy**: Branch, state, and national level reporting with RLS
- **PII Encryption**: Customer data encryption for GDPR compliance
- **Webhook Handling**: Secure webhook processing with signature verification
- **Health & Metrics**: Prometheus-compatible metrics endpoint
- **Comprehensive Testing**: Unit, integration, and e2e tests

## Architecture

### Queue Structure

1. **payment-queue**: Processes payment transactions
2. **webhook-queue**: Handles incoming webhooks from payment providers
3. **refund-queue**: Processes refund requests
4. **settlement-queue**: Generates settlement reports
5. **notification-queue**: Sends notifications to users

### Directory Structure

```
payment-queue-service/
├── src/
│   ├── controllers/          # Request handlers
│   │   ├── payment.controller.ts
│   │   ├── admin.controller.ts
│   │   └── webhook.controller.ts
│   ├── middleware/           # Express middleware
│   │   ├── auth.ts
│   │   ├── rbac.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── encryption.middleware.ts
│   │   └── errorHandler.ts
│   ├── queues/              # BullMQ queues and workers
│   │   ├── payment.queue.ts
│   │   ├── webhook.queue.ts
│   │   ├── refund.queue.ts
│   │   ├── settlement.queue.ts
│   │   ├── notification.queue.ts
│   │   └── workers/         # Queue workers
│   │       ├── payment.worker.ts
│   │       ├── webhook.worker.ts
│   │       ├── refund.worker.ts
│   │       ├── settlement.worker.ts
│   │       └── notification.worker.ts
│   ├── services/            # Business logic
│   │   ├── commission.service.ts
│   │   ├── notification.service.ts
│   │   ├── paymentProcessor.ts
│   │   ├── refundService.ts
│   │   └── settlementService.ts
│   ├── routes/              # API routes
│   │   ├── v1/
│   │   │   ├── payments.ts
│   │   │   ├── webhooks.ts
│   │   │   ├── admin.ts
│   │   │   └── index.ts
│   │   ├── health.ts
│   │   └── metrics.ts
│   ├── utils/               # Utility functions
│   │   ├── encryption.ts
│   │   ├── validator.ts
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── database.ts
│   ├── config/              # Configuration
│   │   └── index.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   └── index.ts             # Application entry point
├── tests/                   # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── database/
│   └── scripts/
│       └── payment_queue_schema.sql
├── Dockerfile
├── railway.toml
├── openapi.yaml
├── jest.config.js
├── tsconfig.json
└── package.json
```

## API Endpoints

### Payments

- `POST /api/v1/payments/request` - Create payment request with checkout URL
- `GET /api/v1/payments/:paymentId/status` - Get payment status
- `POST /api/v1/payments/:paymentId/refund` - Request refund

### Webhooks

- `POST /api/v1/webhooks/paystack` - Paystack webhook handler
- `POST /api/v1/webhooks/stripe` - Stripe webhook handler

### Admin Reports

- `GET /api/v1/admin/payments/branch` - Branch-level reporting
- `GET /api/v1/admin/payments/state` - State-level reporting
- `GET /api/v1/admin/payments/national` - National-level reporting

### Health & Metrics

- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics

## Environment Variables

```bash
# Server
PORT=3004
NODE_ENV=production

# Database
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_URL=redis://localhost:6379

# Payment Providers
PAYSTACK_SECRET_KEY=your-paystack-secret
PAYSTACK_PUBLIC_KEY=your-paystack-public
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_PUBLIC_KEY=your-stripe-public

# Security
ENCRYPTION_KEY=your-32-char-encryption-key
JWT_SECRET=your-jwt-secret

# Commission Rates (fallback defaults)
HOTEL_COMMISSION_RATE=10
TAXI_COMMISSION_RATE=15
ECOMMERCE_COMMISSION_RATE=5

# Queue Settings
QUEUE_MAX_RETRIES=3
QUEUE_BACKOFF_DELAY=5000
QUEUE_JOB_TIMEOUT=30000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# Frontend
FRONTEND_URL=https://app.giga.ng
```

## Database Schema

The service uses the following main tables:

- `commission_rules` - Commission rates with min/max rules
- `payment_requests` - Payment requests before processing
- `transactions` - Completed transactions
- `refunds` - Refund records
- `settlements` - Settlement reports
- `notifications` - User notifications
- `webhook_logs` - Webhook event logs
- `user_notification_preferences` - User notification settings

Run the schema migration:

```bash
psql -h your-host -U your-user -d your-db -f database/scripts/payment_queue_schema.sql
```

## Commission Rules

Commission rules support:
- Percentage-based rates
- Minimum commission amounts
- Maximum commission amounts
- Module-specific rules (hotel, taxi, ecommerce)
- Transaction type variations
- Time-based effective periods

Example commission calculation:
```typescript
const commission = await commissionService.calculateCommission('hotel', 1000, 'standard');
// Returns: { grossAmount, commissionRate, commissionAmount, netAmount, appliedRule }
```

## Admin Hierarchy & RLS

The system implements Row Level Security (RLS) for admin access:

- **Branch Admin**: Can only view their branch data
- **State Admin**: Can view all branches in their state
- **National Admin**: Can view all data
- **Super Admin**: Full access

Filters are automatically applied based on user role and location.

## Security Features

### PII Encryption
Customer sensitive data (email, phone, address) is encrypted at rest using AES-256-GCM.

### Webhook Signature Verification
All webhooks are verified using provider-specific signature validation:
- Paystack: HMAC SHA-512
- Stripe: Stripe signature verification

### Rate Limiting
API endpoints are rate-limited to prevent abuse (100 requests per 15 minutes by default).

## Running the Service

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Running with Docker
```bash
docker build -t payment-queue-service .
docker run -p 3004:3004 --env-file .env payment-queue-service
```

## Testing

```bash
# Run all tests
npm test

# Run unit tests
npm test -- tests/unit

# Run integration tests
npm test -- tests/integration

# Run with coverage
npm test -- --coverage
```

## Monitoring

### Health Check
```bash
curl http://localhost:3004/health
```

### Prometheus Metrics
```bash
curl http://localhost:3004/metrics
```

Available metrics:
- Queue job counts (waiting, active, completed, failed)
- Process CPU and memory usage
- Node.js version info

## Deployment

The service is configured for Railway deployment using `railway.toml`:

```bash
railway up
```

### Health Check Configuration
- Path: `/health`
- Timeout: 100s
- Expected: 200 status code

## Queue Workers

All workers run concurrently with configurable concurrency:

- **Payment Worker**: Concurrency 5, rate limit 10 jobs/second
- **Webhook Worker**: Concurrency 3
- **Refund Worker**: Concurrency 3
- **Settlement Worker**: Concurrency 2
- **Notification Worker**: Concurrency 10, rate limit 20 jobs/second

## Error Handling

The service implements comprehensive error handling:
- `AppError` - Base error class with statusCode and isOperational
- `BadRequestError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `PaymentProcessingError` (422)
- `InternalServerError` (500)
- `ServiceUnavailableError` (503)

## API Documentation

Full OpenAPI 3.0 specification is available in `openapi.yaml`.

View documentation:
```bash
# Using Swagger UI
npx swagger-ui-express openapi.yaml
```

## Contributing

1. Follow existing code patterns
2. Add tests for new features
3. Update OpenAPI spec for API changes
4. Run linter before committing: `npm run lint:fix`

## License

MIT
