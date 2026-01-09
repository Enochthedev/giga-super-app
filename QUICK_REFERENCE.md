# Quick Reference Guide - New Microservices

## Service Endpoints Overview

### Payment Queue Service (Port 3004)
```
Base URL: http://localhost:3004/api

Health:
  GET /health

Payments:
  POST /payments
  GET /payments/:paymentId/status
  POST /payments/refund
  GET /payments/queue/stats
```

### Taxi Real-Time Service (Port 3005)
```
Base URL: ws://localhost:3005

WebSocket Connection:
  io('ws://localhost:3005', { auth: { token: JWT_TOKEN } })

Events (Emit):
  driver:location:update
  rider:request:nearby-drivers
  trip:request
  trip:accept
  trip:status:update
  rider:track:driver
  rider:untrack:driver

Events (Listen):
  driver:location
  rider:nearby-drivers
  trip:new-request
  trip:accepted
  trip:status
  error
```

### Admin Aggregation Service (Port 3006)
```
Base URL: http://localhost:3006/api

Health:
  GET /health

National Level (National HQ):
  GET /admin/national/dashboard
  GET /admin/national/financial-summary
  GET /admin/national/states

State Level (State Admins + National HQ):
  GET /admin/state/:stateId/dashboard
  GET /admin/state/:stateId/branches
  GET /admin/state/:stateId/financial-summary

Branch Level (All authorized users):
  GET /admin/branch/:branchId/dashboard
  GET /admin/branch/:branchId/transactions
  GET /admin/branch/:branchId/analytics

Audit:
  GET /admin/audit-trail
```

### Notifications Service (Port 3007)
```
Base URL: http://localhost:3007/api

Health:
  GET /health

Notifications:
  POST /notifications/send
    Body: { type: 'email|sms|push', ...data }
```

### Search Service (Port 3008)
```
Base URL: http://localhost:3008/api

Health:
  GET /health

Search:
  GET /search?q=query&category=all|hotels|products|drivers|posts
  GET /search/hotels?q=query&location=...&minPrice=...&maxPrice=...
  GET /search/products?q=query&category=...&minPrice=...&maxPrice=...
  GET /search/drivers?q=query&lat=...&lng=...&radius=...

Cache:
  DELETE /search/cache
```

---

## Common Request Examples

### 1. Create Payment Request
```bash
curl -X POST http://localhost:3004/api/payments \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "module": "hotel",
    "amount": 15000,
    "currency": "NGN",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "branchId": "LA-IKJ",
    "stateId": "LA",
    "metadata": {
      "moduleTransactionId": "booking-uuid",
      "customerEmail": "customer@example.com",
      "customerPhone": "+2348012345678",
      "description": "Hotel booking payment"
    },
    "paymentMethod": "paystack"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Payment request queued for processing",
  "data": {
    "paymentId": "uuid",
    "jobId": "job-id",
    "status": "queued"
  }
}
```

### 2. Get Payment Status
```bash
curl http://localhost:3004/api/payments/{paymentId}/status \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "jobId": "job-id",
    "state": "completed",
    "result": {
      "success": true,
      "transactionId": "TXN-1234567890-abcd1234",
      "paymentReference": "ref-12345",
      "status": "completed",
      "amount": 15000,
      "commissionAmount": 1500,
      "netAmount": 13500
    }
  }
}
```

### 3. Request Refund
```bash
curl -X POST http://localhost:3004/api/payments/refund \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TXN-1234567890-abcd1234",
    "reason": "Customer requested cancellation",
    "amount": 15000
  }'
```

### 4. WebSocket Connection (Taxi)
```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3005', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Driver: Update location
socket.emit('driver:location:update', {
  lat: 6.5244,
  lng: 3.3792
});

// Rider: Request nearby drivers
socket.emit('rider:request:nearby-drivers', {
  lat: 6.5244,
  lng: 3.3792,
  radius: 5 // km
});

// Listen for nearby drivers
socket.on('rider:nearby-drivers', (data) => {
  console.log('Nearby drivers:', data.drivers);
  // [{ driverId, lat, lng, distance }, ...]
});

// Rider: Request trip
socket.emit('trip:request', {
  driverId: 'driver-uuid',
  pickupLat: 6.5244,
  pickupLng: 3.3792,
  dropoffLat: 6.4550,
  dropoffLng: 3.3841
});

// Driver: Accept trip
socket.emit('trip:accept', {
  tripId: 'trip-uuid'
});

// Update trip status
socket.emit('trip:status:update', {
  tripId: 'trip-uuid',
  status: 'in_progress'
});
```

### 5. Get National Dashboard
```bash
# Requires National HQ admin token
curl http://localhost:3006/api/admin/national/dashboard \
  -H "Authorization: Bearer $NATIONAL_ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "states": 36,
    "branches": 450,
    "hotels": 1200,
    "ecommerce": 5600,
    "taxi": 3400,
    "totalRevenue": 125000000,
    "totalCommission": 15000000
  }
}
```

### 6. Get State Dashboard
```bash
# Requires State admin or National admin token
curl http://localhost:3006/api/admin/state/LA/dashboard \
  -H "Authorization: Bearer $STATE_ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stateId": "LA",
    "branches": 45,
    "hotels": 250,
    "ecommerce": 1100,
    "taxi": 850,
    "totalRevenue": 45000000,
    "totalCommission": 5500000
  }
}
```

### 7. Get Branch Transactions
```bash
curl "http://localhost:3006/api/admin/branch/LA-IKJ/transactions?page=1&limit=20&module=hotel" \
  -H "Authorization: Bearer $BRANCH_ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "transactionId": "TXN-...",
      "module": "hotel",
      "grossAmount": 15000,
      "commissionAmount": 1500,
      "netAmount": 13500,
      "paymentStatus": "completed",
      "createdAt": "2026-01-09T20:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "pages": 8
  }
}
```

### 8. Send Email Notification
```bash
curl -X POST http://localhost:3007/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "to": "customer@example.com",
    "subject": "Payment Confirmation",
    "html": "<h1>Payment Successful</h1><p>Your payment of ₦15,000 was successful.</p>",
    "text": "Payment Successful. Your payment of ₦15,000 was successful."
  }'
```

### 9. Send SMS Notification
```bash
curl -X POST http://localhost:3007/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sms",
    "to": "+2348012345678",
    "message": "Your payment of ₦15,000 was successful. Transaction ID: TXN-123"
  }'
```

### 10. Unified Search
```bash
# Search across all modules
curl "http://localhost:3008/api/search?q=luxury&category=all" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "luxury",
    "category": "all",
    "hotels": [...],
    "products": [...],
    "drivers": [],
    "posts": [...],
    "totalResults": 45
  }
}
```

### 11. Hotel-Specific Search
```bash
curl "http://localhost:3008/api/search/hotels?q=luxury&location=lagos&minPrice=10000&maxPrice=50000&page=1&limit=20" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## Environment Variables Quick Reference

### Minimal Required Variables
```bash
# Core (All Services)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-min-32-chars
NODE_ENV=production

# Payment Service
PAYSTACK_SECRET_KEY=sk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx

# Notifications Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Commission Rates (Default)

```bash
HOTEL_COMMISSION_RATE=10    # 10%
TAXI_COMMISSION_RATE=15     # 15%
ECOMMERCE_COMMISSION_RATE=5 # 5%
```

**Example Calculation:**
- Hotel booking: ₦15,000
- Commission (10%): ₦1,500
- Net to hotel: ₦13,500
- NIPOST commission: ₦1,500

---

## Queue Concurrency Settings

```javascript
// Payment Queue
concurrency: 10  // Process 10 payments simultaneously

// Email Queue
concurrency: 5   // Send 5 emails simultaneously

// SMS Queue
concurrency: 10  // Send 10 SMS simultaneously

// Refund Queue
concurrency: 5   // Process 5 refunds simultaneously

// Settlement Queue
concurrency: 1   // Process settlements sequentially
```

---

## Health Check Responses

All services return similar health check responses:

```json
{
  "status": "healthy",
  "timestamp": "2026-01-09T20:24:24.282Z",
  "service": "payment-queue-service",
  "version": "1.0.0",
  "uptime": 3600.5,
  "checks": {
    "database": "up",
    "memory": {
      "used": 125.5,
      "total": 512.0,
      "unit": "MB"
    }
  }
}
```

---

## Common Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "message": "Invalid request data",
    "statusCode": 400
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired token",
    "statusCode": 401
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "message": "National access required",
    "statusCode": 403
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "message": "Transaction not found",
    "statusCode": 404
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "statusCode": 500
  }
}
```

---

## Useful Commands

### Docker Commands
```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f [service-name]

# Restart service
docker-compose -f docker-compose.prod.yml restart [service-name]

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

### Redis Commands
```bash
# Connect to Redis
redis-cli -u $REDIS_URL

# Check queue length
LLEN bull:payment-processing:wait

# View failed jobs
LRANGE bull:payment-processing:failed 0 -1

# Clear all queues (CAREFUL!)
redis-cli FLUSHALL
```

### Database Commands
```bash
# Connect to database
psql -d giga_dev

# Check RLS policies
\dRp+

# View table structure
\d nipost_financial_ledger

# Check permissions
SELECT * FROM nipost_user_permissions WHERE is_active = true;

# Check financial ledger
SELECT * FROM nipost_financial_ledger ORDER BY created_at DESC LIMIT 10;
```

---

## Monitoring Queries

### Queue Statistics
```bash
curl http://localhost:3004/api/payments/queue/stats \
  -H "Authorization: Bearer $TOKEN"
```

### Active WebSocket Connections
Check service logs for connection count.

### Database Performance
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_exec_time DESC 
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'nipost_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Quick Troubleshooting

### Service won't start
1. Check environment variables
2. Check database connectivity
3. Check Redis connectivity
4. View logs: `docker-compose logs [service]`

### Payment not processing
1. Check queue stats
2. View payment worker logs
3. Check payment provider credentials
4. Check database connection

### WebSocket not connecting
1. Verify JWT token is valid
2. Check Redis adapter connection
3. Check firewall/CORS settings
4. View taxi service logs

### Admin dashboard returns empty data
1. Verify user has correct access level in `nipost_user_permissions`
2. Check RLS policies are enabled
3. Verify branch_id/state_id match
4. Check JWT token contains correct user ID

### Notifications not sending
1. Check SMTP/Twilio credentials
2. View notification worker logs
3. Check queue status
4. Verify recipient email/phone format

---

**Last Updated:** January 9, 2026
**Version:** 1.0.0
