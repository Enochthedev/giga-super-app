# Quick API Reference

## Base URL

```
https://giga-giga-production.up.railway.app
```

## Authentication

### Login

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

### Use Token

```bash
Authorization: Bearer <your-jwt-token>
```

## JWT Secret Setup (IMPORTANT!)

**For all Railway services:**

```bash
JWT_SECRET=<your-supabase-jwt-secret>
```

**Where to find it**: Supabase Dashboard → Project Settings → API → JWT Secret

**NOT the anon key!** Must be the JWT Secret that Supabase uses to sign tokens.

## Quick Endpoint Reference

### Supabase Functions (via Gateway)

#### Auth

- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Register
- `GET /api/v1/users/profile` - Get profile

#### Hotels

- `GET /api/v1/hotels` - List hotels
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings` - My bookings

#### Payments

- `POST /api/v1/payments/initialize` - Start payment
- `POST /api/v1/payments/verify` - Verify payment
- `GET /api/v1/wallet` - Wallet balance

#### E-commerce

- `GET /api/v1/products` - List products
- `POST /api/v1/cart` - Add to cart
- `POST /api/v1/orders` - Create order

#### Taxi

- `POST /api/v1/rides` - Request ride
- `GET /api/v1/drivers` - Find drivers

### Railway Services (via Gateway)

#### Social Media

- `POST /api/v1/posts` - Create post
- `GET /api/v1/feed` - Get feed
- `POST /api/v1/posts/:id/like` - Like post
- `POST /api/v1/posts/:id/comments` - Add comment

#### Admin

- `GET /api/v1/admin/national/dashboard` - National dashboard
- `GET /api/v1/admin/state/:id/dashboard` - State dashboard
- `GET /api/v1/admin/audit-trail` - Audit logs

#### Search

- `GET /api/v1/search?q=query&type=hotels` - Search

#### Delivery

- `POST /api/v1/delivery/packages` - Create delivery
- `GET /api/v1/delivery/tracking/:number` - Track package

#### Notifications

- `GET /api/v1/notifications` - My notifications
- `PUT /api/v1/notifications/:id/read` - Mark read

## Health Checks (No Auth)

```bash
GET /health                          # Gateway health
GET /api/v1/social/health           # Social service
GET /api/v1/admin/health            # Admin service
GET /api/v1/search/health           # Search service
```

## API Documentation (No Auth)

```bash
GET /api/v1/social/api-docs         # Social service docs
GET /api/v1/admin/api-docs          # Admin service docs
GET /api/v1/search/api-docs         # Search service docs
```

## Response Format

### Success

```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2026-01-17T07:00:00.000Z",
    "request_id": "req_123",
    "version": "1.0.0"
  }
}
```

### Error

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

## Common Error Codes

- `AUTHENTICATION_REQUIRED` (401) - No token provided
- `INVALID_TOKEN` (401) - Invalid/expired token
- `INSUFFICIENT_PERMISSIONS` (403) - Lacks permissions
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (400) - Invalid input
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `SERVICE_UNAVAILABLE` (503) - Service down
- `PROXY_ERROR` (502) - Backend communication error

## Environment Variables (Railway Services)

```bash
# Required for ALL services
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-supabase-jwt-secret  # From Supabase Dashboard!
NODE_ENV=production

# Service-specific
PORT=3000  # Auto-set by Railway
```

## Testing with cURL

### Login

```bash
curl -X POST https://giga-giga-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### Authenticated Request

```bash
curl -X GET https://giga-giga-production.up.railway.app/api/v1/feed \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Health Check

```bash
curl https://giga-giga-production.up.railway.app/health
```

## Troubleshooting

### 401 Unauthorized

- Check token is valid and not expired
- Verify JWT_SECRET matches Supabase JWT Secret
- Ensure Authorization header is set

### 502 Proxy Error

- Check service is running on Railway
- Verify service URL is correct
- Check service health endpoint

### 503 Service Unavailable

- Service may be starting up
- Check Railway service logs
- Verify environment variables

## Full Documentation

- **Complete API Reference**: `docs/api/GATEWAY_API_REFERENCE.md`
- **Routing Architecture**: `docs/api/ROUTING_ARCHITECTURE.md`
- **Function Details**: `docs/api/function-documentation.md`
