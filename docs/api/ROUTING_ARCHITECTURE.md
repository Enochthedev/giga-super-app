# API Gateway Routing Architecture

## Overview

The Giga platform uses a unified API Gateway that routes requests to either
Supabase edge functions or Railway microservices based on the endpoint path.

**Gateway URL**: `https://giga-giga-production.up.railway.app`

## Routing Flow

```
Client Request
    ↓
API Gateway (Railway)
    ↓
    ├─→ Supabase Edge Functions (/functions/v1/*)
    │   - Authentication & Users
    │   - Hotels & Bookings
    │   - Payments & Wallet
    │   - E-commerce
    │   - Taxi/Rides Core
    │   - Utility Functions
    │
    └─→ Railway Microservices (internal URLs)
        - Social Media Service
        - Admin Service
        - Search Service
        - Delivery Service
        - Notifications Service
        - Payment Queue Service
        - Taxi Realtime Service
```

## Request Path Transformation

### Supabase Functions

**Client Request**: `GET /api/v1/hotels` **Gateway Routes To**:
`GET https://your-project.supabase.co/functions/v1/hotels`

Path rewrite: `/api/v1/*` → `/functions/v1/*`

### Railway Services

**Client Request**: `GET /api/v1/social/posts` **Gateway Routes To**:
`GET http://social-service.railway.internal/posts`

Path rewrite: `/api/v1/social/*` → `/*`

## Service Registry

The API Gateway maintains a service registry that maps URL patterns to backend
services:

### Supabase Services

| Service ID         | Patterns                                 | Platform | Base URL     |
| ------------------ | ---------------------------------------- | -------- | ------------ |
| supabase-auth      | `/api/v1/auth/*`, `/api/v1/users/*`      | Supabase | Supabase URL |
| supabase-hotels    | `/api/v1/hotels/*`, `/api/v1/bookings/*` | Supabase | Supabase URL |
| supabase-payments  | `/api/v1/payments/*`, `/api/v1/wallet/*` | Supabase | Supabase URL |
| supabase-ecommerce | `/api/v1/products/*`, `/api/v1/cart/*`   | Supabase | Supabase URL |
| supabase-taxi      | `/api/v1/rides/*`, `/api/v1/drivers/*`   | Supabase | Supabase URL |

### Railway Services

| Service ID            | Patterns                                    | Platform | Base URL                               |
| --------------------- | ------------------------------------------- | -------- | -------------------------------------- |
| railway-social        | `/api/v1/social/*`, `/api/v1/posts/*`       | Railway  | social-service.railway.internal        |
| railway-admin         | `/api/v1/admin/*`, `/api/v1/dashboard/*`    | Railway  | admin-service.railway.internal         |
| railway-search        | `/api/v1/search/*`                          | Railway  | search-service.railway.internal        |
| railway-payment       | `/api/v1/payment-queue/*`                   | Railway  | payment-queue-service.railway.internal |
| railway-delivery      | `/api/v1/delivery/*`, `/api/v1/courier/*`   | Railway  | delivery-service.railway.internal      |
| railway-notifications | `/api/v1/notifications/*`, `/api/v1/push/*` | Railway  | notifications-service.railway.internal |
| railway-taxi-realtime | `/api/v1/taxi-realtime/*`                   | Railway  | taxi-realtime-service.railway.internal |

## Authentication Flow

### 1. User Login (Supabase)

```
POST /api/v1/auth/login
    ↓
API Gateway
    ↓
Supabase Edge Function: /functions/v1/auth/login
    ↓
Returns JWT token signed with Supabase JWT Secret
```

### 2. Authenticated Request to Railway Service

```
GET /api/v1/social/posts
Authorization: Bearer <jwt-token>
    ↓
API Gateway
    ├─ Validates JWT using Supabase JWT Secret
    ├─ Extracts user context
    └─ Forwards to Railway service
        ↓
Railway Service: social-service.railway.internal/posts
    ├─ Receives headers:
    │   - Authorization: Bearer <jwt-token>
    │   - X-User-ID: <user-id>
    │   - X-User-Email: <email>
    │   - X-User-Role: <role>
    │   - X-Request-ID: <request-id>
    └─ Validates JWT using same Supabase JWT Secret
```

## JWT Secret Configuration

**Critical**: All services must use the **same JWT Secret** from Supabase.

### Where to Find It

Supabase Dashboard → Project Settings → API → JWT Secret

### Why It Matters

1. **Token Signing**: Supabase signs all JWT tokens with this secret
2. **Token Validation**: Railway services must use the same secret to validate
   tokens
3. **Security**: Ensures tokens can't be forged
4. **Cross-Platform**: Enables seamless authentication across Supabase and
   Railway

### Environment Variable Setup

```bash
# For ALL Railway services
JWT_SECRET=<your-supabase-jwt-secret>

# NOT the anon key!
# NOT a randomly generated secret!
# MUST be the JWT Secret from Supabase Dashboard
```

## Request Headers

### Client → Gateway

```
Authorization: Bearer <jwt-token>
Content-Type: application/json
X-Client-Version: 1.0.0 (optional)
```

### Gateway → Supabase

```
Authorization: Bearer <jwt-token>
apikey: <supabase-anon-key>
Content-Type: application/json
```

### Gateway → Railway Services

```
Authorization: Bearer <jwt-token>
X-User-ID: <user-id>
X-User-Email: <email>
X-User-Role: <role>
X-Request-ID: <request-id>
Content-Type: application/json
```

## Response Headers

All responses include:

```
X-Service-ID: <service-id>
X-Service-Platform: supabase | railway
X-Request-ID: <request-id>
```

## Health Checks

### Gateway Health

```
GET /health
→ Returns gateway status (no auth required)
```

### Service Health

```
GET /api/v1/social/health
GET /api/v1/admin/health
GET /api/v1/search/health
→ Returns service-specific health (no auth required)
```

## API Documentation

Each Railway service exposes its own API documentation:

```
GET /api/v1/social/api-docs
GET /api/v1/admin/api-docs
GET /api/v1/search/api-docs
→ Returns Swagger/OpenAPI documentation (no auth required)
```

## Error Handling

### Gateway Errors

| Status | Code                     | Description                      |
| ------ | ------------------------ | -------------------------------- |
| 401    | AUTHENTICATION_REQUIRED  | No auth token provided           |
| 401    | INVALID_TOKEN            | Invalid or expired token         |
| 403    | INSUFFICIENT_PERMISSIONS | User lacks required permissions  |
| 404    | SERVICE_NOT_FOUND        | No service for endpoint          |
| 429    | RATE_LIMIT_EXCEEDED      | Too many requests                |
| 502    | PROXY_ERROR              | Error communicating with service |
| 503    | SERVICE_UNAVAILABLE      | Service temporarily unavailable  |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "metadata": {
    "timestamp": "2026-01-17T07:00:00.000Z",
    "request_id": "req_123",
    "version": "1.0.0"
  }
}
```

## Migration Status

### Migrated to Railway ✅

- Social Media Service (posts, comments, likes, feed)
- Admin Service (NIPOST admin functions)
- Search Service (unified search)
- Delivery Service (package delivery)
- Notifications Service (push, email, SMS)
- Payment Queue Service (async payment processing)
- Taxi Realtime Service (real-time location tracking)

### Remaining on Supabase ⏳

- Authentication & User Management
- Hotel Core (bookings, rooms)
- Payment Core (transactions, wallet)
- E-commerce Core (products, orders)
- Taxi Core (ride management)
- Utility Functions (settings, notifications)

## Service Communication

### Railway → Supabase Database

Railway services connect to Supabase PostgreSQL using:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Query database
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId);
```

### Railway → Railway (Internal)

Services can communicate directly using Railway's internal DNS:

```typescript
const response = await fetch(
  'http://notifications-service.railway.internal/send',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ... })
  }
);
```

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Authenticated**: Higher limits based on user tier
- **Admin**: 10,000 requests per hour

Rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1705478400
```

## Monitoring

### Metrics Collected

- Request count by service
- Response times (p50, p95, p99)
- Error rates by service and error code
- Authentication success/failure rates
- Circuit breaker states

### Logging

All requests are logged with:

- Request ID (for tracing)
- User ID (if authenticated)
- Service ID and platform
- Response time
- Status code
- Error details (if any)

## Deployment

### API Gateway

- **Platform**: Railway
- **URL**: `https://giga-giga-production.up.railway.app`
- **Health**: `/health`
- **Scaling**: Auto-scaling enabled

### Railway Services

All services deployed on Railway with:

- Internal DNS: `<service-name>.railway.internal`
- Health checks: `/health`
- API docs: `/api-docs`
- Auto-scaling: Enabled

### Supabase Functions

All functions deployed on Supabase with:

- Base URL: `https://your-project.supabase.co/functions/v1/`
- Authentication: Built-in Supabase Auth
- Database: Direct PostgreSQL access

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check JWT token is valid
   - Verify JWT_SECRET matches Supabase JWT Secret
   - Ensure token hasn't expired

2. **502 Proxy Error**
   - Check service is running on Railway
   - Verify service URL is correct
   - Check service health endpoint

3. **503 Service Unavailable**
   - Service may be starting up
   - Check Railway service logs
   - Verify environment variables are set

### Debug Headers

Add these headers to requests for debugging:

```
X-Debug: true
X-Trace-ID: custom-trace-id
```

## Support

For routing issues:

1. Check service health: `GET /api/v1/<service>/health`
2. Review API Gateway logs on Railway
3. Check service-specific logs on Railway
4. Verify environment variables are set correctly
