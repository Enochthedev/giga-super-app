# Payment Queue Service - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- Redis instance (for BullMQ)
- PostgreSQL/Supabase database
- Paystack/Stripe accounts (for payment processing)

### Installation

1. **Install dependencies:**
```bash
cd payment-queue-service
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```bash
# Required
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REDIS_URL=redis://localhost:6379

# Payment Providers
PAYSTACK_SECRET_KEY=your-paystack-secret
STRIPE_SECRET_KEY=your-stripe-secret

# Security (generate a strong 32-character key)
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret

# Optional (has defaults)
PORT=3004
NODE_ENV=development
LOG_LEVEL=info
```

3. **Set up database:**
```bash
# Run the schema migration
psql -h your-host -U your-user -d your-db -f database/scripts/payment_queue_schema.sql
```

### Development

**Start development server with hot reload:**
```bash
npm run dev
```

The service will start on `http://localhost:3004`

### Testing

**Run all tests:**
```bash
npm test
```

**Run specific test suites:**
```bash
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e        # E2E tests only
npm run test:coverage   # With coverage report
```

**Watch mode for TDD:**
```bash
npm run test:watch
```

### Building for Production

**Build TypeScript:**
```bash
npm run build
```

**Start production server:**
```bash
npm start
```

### Docker Deployment

**Build Docker image:**
```bash
docker build -t payment-queue-service .
```

**Run container:**
```bash
docker run -p 3004:3004 \
  --env-file .env \
  --name payment-queue \
  payment-queue-service
```

**Using Docker Compose:**
```bash
docker-compose up -d
```

## 📋 API Endpoints

### Health Check
```bash
curl http://localhost:3004/health
```

### Metrics
```bash
curl http://localhost:3004/metrics
```

### Create Payment Request
```bash
curl -X POST http://localhost:3004/api/v1/payments/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "module": "hotel",
    "amount": 1000,
    "currency": "NGN",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "branchId": "550e8400-e29b-41d4-a716-446655440001",
    "stateId": "550e8400-e29b-41d4-a716-446655440002",
    "metadata": {
      "moduleTransactionId": "HTL123",
      "customerEmail": "customer@example.com",
      "description": "Hotel booking payment"
    },
    "paymentMethod": "paystack"
  }'
```

### Check Payment Status
```bash
curl http://localhost:3004/api/v1/payments/{paymentId}/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Request Refund
```bash
curl -X POST http://localhost:3004/api/v1/payments/{paymentId}/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reason": "Customer requested refund due to cancellation",
    "amount": 1000
  }'
```

### Admin Reports
```bash
# Branch level
curl "http://localhost:3004/api/v1/admin/payments/branch?branchId=xxx&startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# State level
curl "http://localhost:3004/api/v1/admin/payments/state?stateId=xxx&startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# National level
curl "http://localhost:3004/api/v1/admin/payments/national?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔍 Monitoring

### Queue Status
Check queue health in the health endpoint response:
```bash
curl http://localhost:3004/health | jq '.queues'
```

### Prometheus Metrics
View all metrics:
```bash
curl http://localhost:3004/metrics
```

Key metrics:
- `payment_queue_jobs_waiting` - Jobs waiting in payment queue
- `payment_queue_jobs_active` - Currently processing jobs
- `payment_queue_jobs_completed` - Total completed jobs
- `payment_queue_jobs_failed` - Failed jobs
- `process_cpu_user_seconds_total` - CPU usage
- `process_heap_bytes` - Memory usage

### Logs
Logs are output to console in JSON format (Winston):
```bash
# View logs in development
npm run dev

# View logs in production
docker logs payment-queue
```

## 🧪 Testing Commission Rules

**Add a custom commission rule:**
```sql
INSERT INTO commission_rules (
  module, 
  transaction_type, 
  commission_rate, 
  min_commission, 
  max_commission, 
  is_active
)
VALUES (
  'hotel',
  'premium',
  8.5,
  150.00,
  8000.00,
  true
);
```

**Test commission calculation:**
```bash
# The system will automatically use the database rules
# If no rule found, falls back to config defaults
```

## 🔒 Security Features

### PII Encryption
Customer data is automatically encrypted at rest:
- Email addresses
- Phone numbers
- Names
- Addresses

### RBAC
Admin endpoints enforce role-based access:
- **Branch Admin**: Can only view their branch
- **State Admin**: Can view all branches in their state
- **National Admin**: Can view everything

### Webhook Verification
All webhooks are verified:
- Paystack: HMAC SHA-512 signature verification
- Stripe: Stripe signature verification

## 📊 Database Management

### View Commission Rules
```sql
SELECT * FROM commission_rules WHERE is_active = true;
```

### View Recent Transactions
```sql
SELECT 
  id, 
  module, 
  amount, 
  commission_amount, 
  status, 
  created_at 
FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;
```

### View Queue Logs
```sql
SELECT * FROM webhook_logs ORDER BY received_at DESC LIMIT 20;
```

## 🛠️ Troubleshooting

### Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping

# Check Redis URL in .env
echo $REDIS_URL
```

### Database Connection Issues
```bash
# Test database connection
npm run dev
# Check logs for database errors
```

### Queue Worker Issues
```bash
# Check queue metrics
curl http://localhost:3004/metrics | grep queue

# View worker logs
docker logs payment-queue | grep worker
```

### Build Issues
```bash
# Clean build
rm -rf dist
npm run build

# Type check without building
npm run type-check
```

## 📝 Development Workflow

1. **Create feature branch:**
```bash
git checkout -b feature/your-feature
```

2. **Make changes and test:**
```bash
npm run dev
npm test
npm run lint:fix
```

3. **Build and verify:**
```bash
npm run build
npm start
```

4. **Commit and push:**
```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature
```

## 🚢 Deployment

### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Manual Docker Deployment
```bash
# Build
docker build -t payment-queue-service:v1.0.0 .

# Tag for registry
docker tag payment-queue-service:v1.0.0 your-registry/payment-queue-service:v1.0.0

# Push
docker push your-registry/payment-queue-service:v1.0.0

# Deploy
docker run -d \
  --name payment-queue \
  --env-file .env \
  -p 3004:3004 \
  your-registry/payment-queue-service:v1.0.0
```

## 📚 Additional Resources

- **API Documentation**: See `openapi.yaml` or use Swagger UI
- **Architecture**: See `README.md`
- **Database Schema**: See `database/scripts/payment_queue_schema.sql`
- **Configuration**: See `src/config/index.ts`

## 🆘 Support

For issues or questions:
1. Check the logs: `docker logs payment-queue`
2. Verify environment variables are set correctly
3. Check Redis and database connectivity
4. Review the API documentation in `openapi.yaml`
5. Run tests to verify functionality: `npm test`

## ✅ Verification Checklist

Before deploying to production:
- [ ] All environment variables set
- [ ] Database schema migrated
- [ ] Redis accessible
- [ ] All tests passing (`npm test`)
- [ ] Build successful (`npm run build`)
- [ ] Health check returns 200 (`/health`)
- [ ] Metrics accessible (`/metrics`)
- [ ] Webhook endpoints configured in Paystack/Stripe dashboard
- [ ] Commission rules configured in database
- [ ] RLS policies enabled
- [ ] Monitoring set up (Prometheus/Grafana)
- [ ] Logs aggregation configured
- [ ] SSL/TLS certificates configured
- [ ] Rate limiting tested
- [ ] Error handling verified

---

**You're ready to go! 🎉**

The payment-queue-service is now fully operational and ready to process payments!
