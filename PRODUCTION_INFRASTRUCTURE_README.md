# Giga Nigerian Super-App - Production Backend Infrastructure

## Overview

This document describes the complete production-ready backend infrastructure implementation for the Giga Nigerian super-app for NIPOST, including PostgreSQL schema enhancements with RLS policies for hierarchical data isolation, and five new TypeScript microservices.

## Architecture

### Hierarchical Structure
```
National HQ (National Level)
    ├── State Centers (State Level)
    │   ├── Local Branch 1 (Branch Level)
    │   ├── Local Branch 2 (Branch Level)
    │   └── ...
    └── ...
```

### Microservices

1. **Payment Queue Service** (Port 3004)
   - Centralized payment processing with BullMQ
   - Paystack and Stripe integration
   - Retry logic with exponential backoff
   - Commission calculation and tracking
   - Dead letter queue for failed payments
   - Daily settlement reports

2. **Taxi Real-Time Service** (Port 3005)
   - WebSocket server using Socket.io
   - Real-time location tracking
   - Driver-rider matching algorithm
   - Trip status updates
   - Redis adapter for horizontal scaling

3. **Admin Aggregation Service** (Port 3006)
   - Multi-tenant hierarchical endpoints
   - National, State, and Branch level views
   - RLS policy enforcement
   - Analytics and reporting
   - Audit trail for admin actions

4. **Notifications Service** (Port 3007)
   - Email notifications (SMTP)
   - SMS notifications (Twilio)
   - Push notifications (placeholder)
   - BullMQ queues for async processing
   - Retry logic for failed notifications

5. **Unified Search Service** (Port 3008)
   - Cross-module search (hotels, products, drivers, posts)
   - Full-text search capabilities
   - Redis caching for performance
   - Relevance scoring
   - Category and filter support

## Database Schema

### Tables Created

#### 1. `nipost_user_permissions`
Hierarchical user permissions table with branch, state, and national access levels.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users)
- `access_level` (ENUM: 'national', 'state', 'branch')
- `branch_id` (VARCHAR)
- `branch_name` (VARCHAR)
- `state_id` (VARCHAR)
- `state_name` (VARCHAR)
- `role` (VARCHAR)
- `is_active` (BOOLEAN)
- Audit fields

**Indexes:**
- `user_id`
- `branch_id`
- `state_id`
- `access_level`
- `is_active`

#### 2. `nipost_hotels`, `nipost_ecommerce`, `nipost_taxi`
Region-partitioned business data tables for each module.

**Common Columns:**
- `id` (UUID, PK)
- Module-specific IDs and names
- `branch_id`, `branch_name`
- `state_id`, `state_name`
- `total_bookings/orders/trips`
- `total_revenue`
- `commission_earned`
- `is_active`
- Timestamps

#### 3. `nipost_financial_ledger`
Financial transaction ledger with commission tracking.

**Columns:**
- `id` (UUID, PK)
- `transaction_id` (VARCHAR, UNIQUE)
- `transaction_type` (ENUM)
- `module` (ENUM: 'hotel', 'taxi', 'ecommerce')
- `module_transaction_id` (UUID)
- `branch_id`, `state_id`
- `gross_amount`, `commission_rate`, `commission_amount`, `net_amount`
- `payment_status`, `payment_method`, `payment_reference`
- `settlement_status`, `settlement_date`, `settlement_batch_id`
- `user_id`, `metadata`
- Timestamps

**Indexes:**
- `transaction_id`, `branch_id`, `state_id`, `user_id`
- `module`, `payment_status`, `settlement_status`
- `created_at`, `settlement_date`

#### 4. `nipost_financial_audit`
Audit trail for all financial transactions.

#### 5. `nipost_admin_audit`
Audit trail for all admin actions.

### Row Level Security (RLS) Policies

#### Branch-Level Access
Users with `access_level = 'branch'` can only see data where `branch_id` matches their assigned branch.

#### State-Level Access
Users with `access_level = 'state'` can see data for all branches in their state where `state_id` matches.

#### National-Level Access
Users with `access_level = 'national'` can see all data nationwide.

### Helper Functions

- `get_user_access_level(uid UUID)`: Returns user's access level, branch, and state
- `get_branch_summary(p_branch_id VARCHAR)`: Returns aggregated branch statistics
- `get_state_summary(p_state_id VARCHAR)`: Returns aggregated state statistics
- `get_national_summary()`: Returns nationwide aggregated statistics

## Deployment

### Docker Compose (Production)

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f [service-name]

# Stop all services
docker-compose -f docker-compose.prod.yml down
```

### Railway Deployment

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Link Project:**
   ```bash
   railway link
   ```

3. **Deploy Services:**
   ```bash
   railway up
   ```

4. **Set Environment Variables:**
   Use Railway dashboard to set environment variables for each service from `.env.example`.

### Environment Variables

See `.env.example` for a complete list of required environment variables.

**Critical Variables:**
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL`
- `JWT_SECRET`
- `PAYSTACK_SECRET_KEY`, `STRIPE_SECRET_KEY`
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`

## API Documentation

### OpenAPI Specifications

API documentation is available in OpenAPI 3.0 format:

- **Payment Service:** `docs/openapi/payment-service.yaml`
- **Admin Service:** `docs/openapi/admin-service.yaml`
- **Taxi Service:** WebSocket events documented in service README
- **Notifications Service:** Queue-based, API in service README
- **Search Service:** REST API, documentation in service README

### Authentication

All services use JWT Bearer token authentication:

```
Authorization: Bearer <jwt_token>
```

### WebSocket Authentication (Taxi Service)

```javascript
const socket = io('http://localhost:3005', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

## Service Communication

### REST API (Synchronous)
- API Gateway → All services
- Services → Services (via service URLs)

### WebSocket (Real-Time)
- Taxi Service: Socket.io with Redis adapter

### Message Queues (Asynchronous)
- Payment Queue: BullMQ
- Notifications Queue: BullMQ
- Refund Queue: BullMQ
- Settlement Queue: BullMQ

### Redis Pub/Sub
- Taxi Service: Real-time events
- Search Service: Cache invalidation

## Monitoring & Logging

### Health Checks

All services expose `/health` endpoints:

```bash
curl http://localhost:3004/health
```

### Structured Logging

All services use Winston for structured JSON logging:

```json
{
  "timestamp": "2026-01-09T20:24:24.282Z",
  "level": "info",
  "service": "payment-queue-service",
  "message": "Payment processed successfully",
  "paymentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Log Levels

- `error`: Critical errors requiring immediate attention
- `warn`: Warning messages for potential issues
- `info`: General informational messages
- `http`: HTTP request/response logs
- `debug`: Detailed debugging information

## Testing

### Payment Flow Test

```bash
# Create payment request
curl -X POST http://localhost:3004/api/payments \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "module": "hotel",
    "amount": 15000,
    "currency": "NGN",
    "userId": "user-uuid",
    "branchId": "LA-IKJ",
    "stateId": "LA",
    "metadata": {
      "moduleTransactionId": "booking-uuid",
      "customerEmail": "customer@example.com"
    }
  }'

# Check payment status
curl http://localhost:3004/api/payments/{paymentId}/status \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Taxi Real-Time Test

```javascript
// Connect
const socket = io('http://localhost:3005', {
  auth: { token: JWT_TOKEN }
});

// Update driver location
socket.emit('driver:location:update', {
  lat: 6.5244,
  lng: 3.3792
});

// Request nearby drivers
socket.emit('rider:request:nearby-drivers', {
  lat: 6.5244,
  lng: 3.3792,
  radius: 5
});

// Listen for responses
socket.on('rider:nearby-drivers', (data) => {
  console.log('Nearby drivers:', data.drivers);
});
```

### Admin Dashboard Test

```bash
# National dashboard
curl http://localhost:3006/api/admin/national/dashboard \
  -H "Authorization: Bearer $NATIONAL_ADMIN_TOKEN"

# State dashboard
curl http://localhost:3006/api/admin/state/LA/dashboard \
  -H "Authorization: Bearer $STATE_ADMIN_TOKEN"

# Branch dashboard
curl http://localhost:3006/api/admin/branch/LA-IKJ/dashboard \
  -H "Authorization: Bearer $BRANCH_ADMIN_TOKEN"
```

## Database Migrations

### Apply Migrations

```bash
# Using Supabase CLI
supabase db push

# Or apply manually
psql -d giga_dev -f supabase/migrations/20260109_create_nipost_hierarchical_schema.sql
```

### Migration Files

- `20260109_create_nipost_hierarchical_schema.sql`: Complete NIPOST schema with RLS policies

## Security

### Authentication & Authorization
- JWT token validation on all protected endpoints
- RLS policies enforce hierarchical data access
- Non-root Docker users for all services
- Rate limiting on all API endpoints

### Data Protection
- Commission rates configurable via environment variables
- Payment provider keys secured in environment
- Database credentials never in code
- Audit trail for all financial and admin actions

### Network Security
- Services communicate via internal Docker network
- External access only through API Gateway
- Health checks use internal endpoints
- Redis not exposed externally

## Performance

### Caching Strategy
- Search results cached in Redis (5 minutes TTL)
- User permissions cached per request
- Payment queue stats cached

### Database Optimization
- Indexes on all foreign keys
- Indexes on frequently queried fields (state_id, branch_id, user_id)
- Partial indexes for active records
- JSONB indexes for metadata searches

### Queue Concurrency
- Payment Queue: 10 concurrent workers
- Email Queue: 5 concurrent workers
- SMS Queue: 10 concurrent workers
- Refund Queue: 5 concurrent workers
- Settlement Queue: 1 worker (sequential)

## Commission Rates

Configurable per module via environment variables:

- **Hotels:** 10% (default)
- **Taxi:** 15% (default)
- **Ecommerce:** 5% (default)

## Settlement Reports

Daily settlement reports generated automatically at midnight (configurable via cron schedule):

```
SETTLEMENT_SCHEDULE=0 0 * * *  # Daily at midnight
```

Report includes:
- Total transactions by module
- Total revenue and commission
- Breakdown by state and branch
- Settlement period details

## Troubleshooting

### Payment Processing Issues

```bash
# Check payment queue status
curl http://localhost:3004/api/payments/queue/stats \
  -H "Authorization: Bearer $TOKEN"

# View failed jobs in dead letter queue
# Access Redis CLI
redis-cli
LRANGE bull:payment-dead-letter:failed 0 -1
```

### WebSocket Connection Issues

```bash
# Check if service is running
curl http://localhost:3005/health

# Verify Redis connection
redis-cli ping

# Check active connections
# In application logs
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d giga_dev -c "SELECT 1"

# Verify RLS policies
psql -d giga_dev -c "\dRp+"

# Check table permissions
psql -d giga_dev -c "\dp nipost_financial_ledger"
```

## Future Enhancements

1. **Push Notifications**: Integrate Firebase Cloud Messaging
2. **Advanced Analytics**: Time-series analysis, predictive models
3. **Multi-currency Support**: Dynamic exchange rates
4. **Geospatial Queries**: PostGIS for advanced location features
5. **Real-time Dashboard**: WebSocket updates for admin dashboards
6. **Automated Testing**: Comprehensive test suites
7. **Performance Monitoring**: Integration with DataDog/New Relic
8. **API Rate Limiting**: Per-user rate limits
9. **Webhook Support**: Notify external systems of events
10. **Advanced Search**: Elasticsearch integration

## Support

For issues or questions:
- Email: support@giga.com
- Documentation: `/docs`
- API Specs: `/docs/openapi`

## License

MIT License - © 2026 Giga Platform Team
