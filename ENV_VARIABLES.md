# Environment Variables Reference

This document lists all environment variables used across the Giga platform
services.

## Quick Reference Table

| Variable                    | Required       | Services                                   | Description                              |
| --------------------------- | -------------- | ------------------------------------------ | ---------------------------------------- |
| `SUPABASE_URL`              | ✅ Yes         | All                                        | Supabase project URL                     |
| `SUPABASE_ANON_KEY`         | ✅ Yes         | All                                        | Supabase anonymous/public key            |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes         | All                                        | Supabase service role key (admin access) |
| `JWT_SECRET`                | ✅ Yes         | All                                        | Secret for JWT token signing             |
| `REDIS_URL`                 | ✅ Yes         | search, taxi, notifications, payment-queue | Redis connection URL                     |
| `NODE_ENV`                  | ⚠️ Recommended | All                                        | Environment (development/production)     |
| `PORT`                      | ⚠️ Recommended | All                                        | Service port (has defaults)              |

---

## Core Configuration

### Supabase (Required for ALL services)

```bash
# Supabase Project URL
SUPABASE_URL=https://your-project.supabase.co

# Supabase Anonymous Key (public, safe for client-side)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key (KEEP SECRET - server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Used by:** ALL services **How to get:** Supabase Dashboard → Settings → API

---

### JWT Authentication (Required for ALL services)

```bash
# Secret key for signing JWT tokens
JWT_SECRET=your-secure-random-string-at-least-32-chars

# Token expiration time (optional, default: 7d)
JWT_EXPIRES_IN=7d
```

**Used by:** ALL services **Note:** Use a strong, random string. Generate with:
`openssl rand -base64 32`

---

### Redis (Required for queue-based services)

```bash
# Redis connection URL
REDIS_URL=redis://localhost:6379

# For Railway/production with authentication:
REDIS_URL=redis://default:password@host:port
```

**Used by:**

- ✅ `search-service` - Caching search results
- ✅ `taxi-realtime-service` - Real-time driver locations, Socket.IO adapter
- ✅ `notifications-service` - Job queues (BullMQ)
- ✅ `payment-queue-service` - Payment processing queues (BullMQ)
- ❌ `social-service` - Not required
- ❌ `admin-service` - Not required
- ❌ `delivery-service` - Not required (uses in-memory cache)

---

## Service-Specific Configuration

### API Gateway (Port 3000)

```bash
PORT=3000
NODE_ENV=development

# Service URLs for routing
SOCIAL_SERVICE_URL=http://localhost:3001
ADMIN_SERVICE_URL=http://localhost:3005
SEARCH_SERVICE_URL=http://localhost:3007

# CORS origins (comma-separated)
CORS_ORIGIN=http://localhost:3000,http://localhost:8080

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Service-to-service authentication
SERVICE_JWT_SECRET=your-service-secret
```

---

### Social Service (Port 3001)

```bash
PORT=3001
NODE_ENV=development

# Required
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...

# Optional
LOG_LEVEL=info
```

**Redis:** Not required

---

### Admin Service (Port 3005)

```bash
PORT=3005
NODE_ENV=development

# Required
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...

# Optional
LOG_LEVEL=info
```

**Redis:** Not required

---

### Delivery Service (Port 3003)

```bash
PORT=3003
NODE_ENV=development

# Required
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...

# Google Maps (required for route optimization)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Optional - Delivery settings
DEFAULT_DELIVERY_RADIUS_KM=10
MAX_DELIVERY_RADIUS_KM=50
COURIER_LOCATION_UPDATE_INTERVAL_MS=30000
ROUTE_OPTIMIZATION_ENABLED=true

# Optional - Notifications
ENABLE_PUSH_NOTIFICATIONS=false
ENABLE_SMS_NOTIFICATIONS=false
ENABLE_EMAIL_NOTIFICATIONS=false

# Optional - Pagination
PAGINATION_DEFAULT_LIMIT=20
PAGINATION_MAX_LIMIT=100

# Optional - Cache
CACHE_TTL=300
CACHE_MAX_KEYS=1000
```

**Redis:** Not required (uses in-memory cache)

---

### Search Service (Port 3007)

```bash
PORT=3007
NODE_ENV=development

# Required
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Required for caching
REDIS_URL=redis://localhost:6379
```

**Redis:** ✅ Required for search result caching

---

### Taxi Realtime Service (Port 3006)

```bash
PORT=3006
NODE_ENV=development

# Required
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...

# Required for real-time features
REDIS_URL=redis://localhost:6379
```

**Redis:** ✅ Required for Socket.IO adapter and real-time driver tracking

---

### Notifications Service (Port 3007)

```bash
PORT=3007
NODE_ENV=development

# Required
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Required for job queues
REDIS_URL=redis://localhost:6379

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourapp.com

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase (Push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

**Redis:** ✅ Required for BullMQ job queues

---

### Payment Queue Service (Port 3004)

```bash
PORT=3004
NODE_ENV=development

# Required
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...

# Required for job queues
REDIS_URL=redis://localhost:6379

# Stripe (International payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Paystack (Nigerian payments)
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_WEBHOOK_SECRET=...
```

**Redis:** ✅ Required for BullMQ payment processing queues

---

## Environment Templates

### Development (.env.development)

```bash
# Core
NODE_ENV=development
LOG_LEVEL=debug

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Auth
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_EXPIRES_IN=7d

# Redis (local)
REDIS_URL=redis://localhost:6379

# Service Ports (defaults)
# API Gateway: 3000
# Social: 3001
# Payment Queue: 3004
# Delivery: 3003
# Admin: 3005
# Taxi Realtime: 3006
# Notifications: 3007
# Search: 3007
```

### Production (.env.production)

```bash
# Core
NODE_ENV=production
LOG_LEVEL=info

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Auth (USE STRONG SECRETS!)
JWT_SECRET=generate-with-openssl-rand-base64-64
JWT_EXPIRES_IN=1d

# Redis (Railway provides this)
REDIS_URL=redis://default:password@containers-us-west-xxx.railway.app:6379

# Payment Providers
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYSTACK_SECRET_KEY=sk_live_...

# External Services
GOOGLE_MAPS_API_KEY=your-production-key
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
```

---

## Railway Deployment

When deploying to Railway, set these variables in each service:

### All Services Need:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `NODE_ENV=production`

### Services That Need Redis:

Add `REDIS_URL` from your Railway Redis instance to:

- `search-service`
- `taxi-realtime-service`
- `notifications-service`
- `payment-queue-service`

### Payment Service Additionally Needs:

- `STRIPE_SECRET_KEY`
- `PAYSTACK_SECRET_KEY`

### Delivery Service Additionally Needs:

- `GOOGLE_MAPS_API_KEY`

### Notifications Service Additionally Needs:

- `SMTP_*` variables for email
- `TWILIO_*` variables for SMS
- `FIREBASE_*` variables for push notifications

---

## Security Notes

⚠️ **Never commit `.env` files to git!**

⚠️ **Keep these SECRET:**

- `SUPABASE_SERVICE_ROLE_KEY` - Full database access
- `JWT_SECRET` - Token signing
- `STRIPE_SECRET_KEY` - Payment processing
- `PAYSTACK_SECRET_KEY` - Payment processing
- `TWILIO_AUTH_TOKEN` - SMS sending

✅ **Safe to expose (but still don't commit):**

- `SUPABASE_URL` - Public project URL
- `SUPABASE_ANON_KEY` - Public key with RLS protection
