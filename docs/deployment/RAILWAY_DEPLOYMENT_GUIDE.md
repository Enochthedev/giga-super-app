# Railway Deployment Guide - Giga Platform

**Date**: January 16, 2026  
**Status**: Ready for Deployment  
**Services**: 8 microservices ready for Railway

---

## 📋 Pre-Deployment Checklist

### ✅ Completed

- [x] All services have Dockerfiles
- [x] Health check endpoints implemented
- [x] Authentication middleware configured
- [x] Database connections tested
- [x] Railway.toml configuration created
- [x] Environment variables documented
- [x] Service dependencies mapped

### 🔧 Required Before Deployment

- [ ] Railway account created and CLI installed
- [ ] Supabase project URL and keys ready
- [ ] Redis instance provisioned (Railway addon)
- [ ] External service API keys obtained (Paystack, Stripe, Twilio, etc.)
- [ ] Domain names configured (optional)
- [ ] Monitoring tools set up (Sentry recommended)

---

## 🚀 Deployment Strategy

### Phase 1: Infrastructure Setup (30 minutes)

1. Create Railway project
2. Provision Redis addon
3. Configure environment variables
4. Set up custom domains (optional)

### Phase 2: Core Services Deployment (1 hour)

1. Deploy API Gateway (port 3000)
2. Deploy Social Service (port 3001)
3. Deploy Admin Service (port 3002)
4. Deploy Search Service (port 3004)

### Phase 3: Specialized Services (1 hour)

5. Deploy Taxi Realtime Service (port 3006)
6. Deploy Payment Queue Service (port 3003)
7. Deploy Delivery Service (port 3005)
8. Deploy Notifications Service (port 3007)

### Phase 4: Testing & Monitoring (30 minutes)

- Run smoke tests on all services
- Configure monitoring and alerts
- Update API Gateway service URLs
- Test end-to-end flows

---

## 📦 Service Deployment Order

### 1. API Gateway (Priority: CRITICAL)

**Why First**: Central routing hub for all services

**Port**: 3000  
**Health Check**: `/health`  
**Dependencies**: None (can start independently)

**Environment Variables**:

```bash
# Core Configuration
NODE_ENV=production
PORT=3000
TRUST_PROXY=true

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-jwt-secret-min-32-chars

# Service URLs (Update after deploying each service)
SOCIAL_SERVICE_URL=https://social-service.railway.app
ADMIN_SERVICE_URL=https://admin-service.railway.app
PAYMENT_QUEUE_SERVICE_URL=https://payment-queue.railway.app
SEARCH_SERVICE_URL=https://search-service.railway.app
DELIVERY_SERVICE_URL=https://delivery-service.railway.app
TAXI_REALTIME_SERVICE_URL=https://taxi-realtime.railway.app
NOTIFICATIONS_SERVICE_URL=https://notifications-service.railway.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
```

**Deployment Command**:

```bash
cd api-gateway
railway up
```

**Verification**:

```bash
curl https://your-gateway.railway.app/health
# Expected: {"status":"healthy","service":"api-gateway",...}
```

---

### 2. Social Service (Priority: HIGH)

**Why Second**: Reference implementation, well-tested

**Port**: 3001  
**Health Check**: `/health`  
**Dependencies**: Supabase database

**Environment Variables**:

```bash
# Core Configuration
NODE_ENV=production
PORT=3001

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DB_POOL_SIZE=10

# Redis (Railway addon)
REDIS_URL=${REDIS_URL}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

**Deployment Command**:

```bash
cd social-service
railway up
```

**Verification**:

```bash
curl https://social-service.railway.app/health
# Test authenticated endpoint
curl -H "Authorization: Bearer YOUR_JWT" \
  https://social-service.railway.app/api/v1/posts
```

---

### 3. Admin Service (Priority: HIGH)

**Why Third**: NIPOST system, critical for admin operations

**Port**: 3002  
**Health Check**: `/health`  
**Dependencies**: Supabase database

**Environment Variables**:

```bash
# Core Configuration
NODE_ENV=production
PORT=3002

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DB_POOL_SIZE=10

# Redis
REDIS_URL=${REDIS_URL}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# Admin Security
ADMIN_SESSION_TIMEOUT=3600000
AUDIT_LOG_RETENTION_DAYS=2555
```

**Deployment Command**:

```bash
cd admin-service
railway up
```

**Verification**:

```bash
curl https://admin-service.railway.app/health
# Test admin endpoint (requires admin JWT)
curl -H "Authorization: Bearer ADMIN_JWT" \
  https://admin-service.railway.app/api/admin/national/dashboard
```

---

### 4. Search Service (Priority: MEDIUM)

**Why Fourth**: Search functionality, no critical dependencies

**Port**: 3004  
**Health Check**: `/health`  
**Dependencies**: Supabase database, Redis

**Environment Variables**:

```bash
# Core Configuration
NODE_ENV=production
PORT=3004

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_URL=${REDIS_URL}

# Search Configuration
SEARCH_CACHE_TTL=300
SEARCH_MAX_RESULTS=100

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

# Logging
LOG_LEVEL=info
```

**Deployment Command**:

```bash
cd search-service
railway up
```

**Verification**:

```bash
curl "https://search-service.railway.app/api/v1/search?q=hotel&type=hotels"
```

---

### 5. Taxi Realtime Service (Priority: HIGH)

**Why Fifth**: WebSocket service, real-time tracking

**Port**: 3006  
**Health Check**: `/health`  
**Dependencies**: Supabase database, Redis

**Environment Variables**:

```bash
# Core Configuration
NODE_ENV=production
PORT=3006

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (for Socket.IO adapter)
REDIS_URL=${REDIS_URL}

# WebSocket Configuration
WS_PING_TIMEOUT=60000
WS_PING_INTERVAL=25000
WS_MAX_CONNECTIONS=10000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500

# Logging
LOG_LEVEL=info
```

**Deployment Command**:

```bash
cd taxi-realtime-service
railway up
```

**Verification**:

```bash
curl https://taxi-realtime.railway.app/health
# Test WebSocket connection
wscat -c wss://taxi-realtime.railway.app
```

---

### 6. Payment Queue Service (Priority: CRITICAL)

**Why Sixth**: Financial transactions, needs careful deployment

**Port**: 3003  
**Health Check**: `/health`  
**Dependencies**: Supabase database, Redis, Paystack, Stripe

**Environment Variables**:

```bash
# Core Configuration
NODE_ENV=production
PORT=3003

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (for BullMQ)
REDIS_URL=${REDIS_URL}

# Paystack (Primary for Nigeria)
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret
PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# Stripe (International)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
STRIPE_PUBLIC_KEY=pk_live_your_stripe_public
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Queue Configuration
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY=5000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# Webhook URLs
WEBHOOK_BASE_URL=https://payment-queue.railway.app
```

**Deployment Command**:

```bash
cd payment-queue-service
railway up
```

**Verification**:

```bash
curl https://payment-queue.railway.app/health
# Test payment initialization (requires auth)
curl -X POST -H "Authorization: Bearer JWT" \
  -H "Content-Type: application/json" \
  -d '{"amount":1000,"currency":"NGN","email":"test@example.com"}' \
  https://payment-queue.railway.app/api/v1/payments/initialize
```

**⚠️ Important**: Update webhook URLs in Paystack and Stripe dashboards:

- Paystack: `https://payment-queue.railway.app/api/v1/webhooks/paystack`
- Stripe: `https://payment-queue.railway.app/api/v1/webhooks/stripe`

---

### 7. Delivery Service (Priority: MEDIUM)

**Why Seventh**: 70% complete, non-critical for initial launch

**Port**: 3005  
**Health Check**: `/health`  
**Dependencies**: Supabase database, Redis, Google Maps

**Environment Variables**:

```bash
# Core Configuration
NODE_ENV=production
PORT=3005

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_URL=${REDIS_URL}

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Delivery Configuration
DEFAULT_DELIVERY_RADIUS_KM=50
MAX_COURIER_ASSIGNMENTS=5
ASSIGNMENT_TIMEOUT_MINUTES=15

# WebSocket Configuration
WS_PING_TIMEOUT=60000
WS_PING_INTERVAL=25000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

**Deployment Command**:

```bash
cd delivery-service
railway up
```

**Verification**:

```bash
curl https://delivery-service.railway.app/health
```

**⚠️ Note**: Some routes may return 501 Not Implemented until completion work is
done.

---

### 8. Notifications Service (Priority: MEDIUM)

**Why Last**: Enhanced features, non-blocking for core functionality

**Port**: 3007  
**Health Check**: `/health`  
**Dependencies**: Supabase database, Redis, SMTP, Twilio

**Environment Variables**:

```bash
# Core Configuration
NODE_ENV=production
PORT=3007

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (for BullMQ)
REDIS_URL=${REDIS_URL}

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=notifications@yourdomain.com

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase (Push Notifications - Optional)
FIREBASE_PROJECT_ID=your_firebase_project
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Queue Configuration
EMAIL_QUEUE_CONCURRENCY=5
SMS_QUEUE_CONCURRENCY=10
BULK_QUEUE_CONCURRENCY=2

# Application URLs
BASE_URL=https://yourdomain.com
UNSUBSCRIBE_URL=https://yourdomain.com/unsubscribe

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

**Deployment Command**:

```bash
cd notifications-service
railway up
```

**Verification**:

```bash
curl https://notifications-service.railway.app/health
curl https://notifications-service.railway.app/ready
# Test notification sending (requires auth)
curl -X POST -H "Authorization: Bearer JWT" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-id","type":"email","recipient":"test@example.com","subject":"Test","body":"Test notification"}' \
  https://notifications-service.railway.app/api/v1/notifications/send
```

---

## 🔧 Railway CLI Setup

### Install Railway CLI

```bash
# macOS
brew install railway

# npm
npm install -g @railway/cli

# Verify installation
railway --version
```

### Login to Railway

```bash
railway login
```

### Create New Project

```bash
railway init
# Follow prompts to create project
```

### Link Existing Project

```bash
railway link
# Select your project from the list
```

---

## 🗄️ Redis Setup on Railway

### Option 1: Railway Redis Plugin (Recommended)

```bash
# In Railway dashboard
1. Go to your project
2. Click "New" → "Database" → "Add Redis"
3. Redis will be provisioned automatically
4. REDIS_URL environment variable will be available to all services
```

### Option 2: External Redis (Upstash, Redis Cloud)

```bash
# Set REDIS_URL manually for each service
REDIS_URL=redis://username:password@host:port
```

---

## 🔐 Environment Variables Management

### Shared Variables (Set at Project Level)

```bash
# Supabase (shared by all services)
railway variables set SUPABASE_URL=https://your-project.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (automatically set by Railway Redis plugin)
# REDIS_URL is automatically available

# JWT
railway variables set JWT_SECRET=your-jwt-secret-min-32-chars
```

### Service-Specific Variables

```bash
# Set for specific service
railway variables set --service api-gateway PORT=3000
railway variables set --service social-service PORT=3001
# ... repeat for each service
```

### Using .env Files (Development)

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env with your values
nano .env

# Railway will NOT use .env files in production
# All production variables must be set in Railway dashboard
```

---

## 🔄 Update API Gateway Service URLs

After deploying each service, update the API Gateway environment variables:

```bash
# Get service URLs from Railway dashboard
# Then update API Gateway
railway variables set --service api-gateway \
  SOCIAL_SERVICE_URL=https://social-service-production.up.railway.app

railway variables set --service api-gateway \
  ADMIN_SERVICE_URL=https://admin-service-production.up.railway.app

# ... repeat for all services

# Restart API Gateway to pick up new URLs
railway restart --service api-gateway
```

---

## 🧪 Post-Deployment Testing

### Smoke Tests Script

Create `scripts/smoke-tests.sh`:

```bash
#!/bin/bash

GATEWAY_URL="https://your-gateway.railway.app"
JWT_TOKEN="your-test-jwt-token"

echo "🧪 Running smoke tests..."

# Test API Gateway
echo "Testing API Gateway..."
curl -f "$GATEWAY_URL/health" || exit 1

# Test Social Service
echo "Testing Social Service..."
curl -f -H "Authorization: Bearer $JWT_TOKEN" \
  "$GATEWAY_URL/api/v1/social/posts" || exit 1

# Test Admin Service
echo "Testing Admin Service..."
curl -f -H "Authorization: Bearer $JWT_TOKEN" \
  "$GATEWAY_URL/api/v1/admin/health" || exit 1

# Test Search Service
echo "Testing Search Service..."
curl -f "$GATEWAY_URL/api/v1/search?q=test" || exit 1

# Test Payment Service
echo "Testing Payment Service..."
curl -f "$GATEWAY_URL/api/v1/payments/health" || exit 1

echo "✅ All smoke tests passed!"
```

Run tests:

```bash
chmod +x scripts/smoke-tests.sh
./scripts/smoke-tests.sh
```

---

## 📊 Monitoring Setup

### Option 1: Sentry (Recommended)

```bash
# Install Sentry SDK in each service
npm install @sentry/node @sentry/tracing

# Add to each service's environment variables
railway variables set SENTRY_DSN=your-sentry-dsn
railway variables set SENTRY_ENVIRONMENT=production
```

### Option 2: Railway Metrics (Built-in)

- Railway provides built-in metrics for CPU, memory, network
- Access via Railway dashboard → Service → Metrics tab

### Option 3: Custom Logging

```bash
# All services use Winston for logging
# Logs are available in Railway dashboard → Service → Logs tab

# View logs in real-time
railway logs --service api-gateway --follow
```

---

## 🚨 Troubleshooting

### Service Won't Start

```bash
# Check logs
railway logs --service service-name

# Common issues:
# 1. Missing environment variables
railway variables --service service-name

# 2. Port conflicts (ensure PORT env var is set)
railway variables set --service service-name PORT=3000

# 3. Database connection issues (check SUPABASE_URL and keys)
```

### Health Check Failing

```bash
# Test health endpoint directly
curl https://service-name.railway.app/health

# Check if service is listening on correct port
railway logs --service service-name | grep "listening"
```

### Redis Connection Issues

```bash
# Verify Redis is provisioned
railway variables --service service-name | grep REDIS_URL

# Test Redis connection
railway run --service service-name redis-cli -u $REDIS_URL ping
```

### Database Connection Issues

```bash
# Verify Supabase credentials
railway variables --service service-name | grep SUPABASE

# Test database connection
railway run --service service-name node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
client.from('user_profiles').select('count').then(console.log);
"
```

---

## 🔄 Rollback Procedures

### Rollback Single Service

```bash
# View deployment history
railway deployments --service service-name

# Rollback to previous deployment
railway rollback --service service-name
```

### Rollback All Services

```bash
# Create rollback script
for service in api-gateway social-service admin-service search-service \
               taxi-realtime-service payment-queue-service \
               delivery-service notifications-service; do
  echo "Rolling back $service..."
  railway rollback --service $service
done
```

---

## 📈 Scaling Configuration

### Horizontal Scaling

```bash
# Railway Pro plan required for multiple replicas
# Configure in railway.toml or dashboard

# Example: Scale API Gateway to 3 replicas
railway scale --service api-gateway --replicas 3
```

### Vertical Scaling

```bash
# Upgrade service resources in Railway dashboard
# Settings → Resources → Select plan
```

---

## 💰 Cost Estimation

### Railway Pricing (as of 2026)

- **Hobby Plan**: $5/month + usage
- **Pro Plan**: $20/month + usage
- **Usage**: ~$0.000463/GB-hour for memory, $0.000231/vCPU-hour

### Estimated Monthly Cost

- **8 Services** × 512MB RAM × 730 hours = ~$1,355/month
- **Redis** (256MB) = ~$85/month
- **Total**: ~$1,440/month for basic deployment

### Cost Optimization

1. Use Railway's sleep feature for non-critical services
2. Implement aggressive caching to reduce compute
3. Use connection pooling to reduce database costs
4. Monitor and optimize resource usage

---

## ✅ Deployment Checklist

### Before Deployment

- [ ] Railway account created and verified
- [ ] Railway CLI installed and authenticated
- [ ] All environment variables documented
- [ ] External service API keys obtained
- [ ] Supabase project ready and accessible
- [ ] Redis provisioned on Railway
- [ ] Domain names configured (optional)
- [ ] Monitoring tools set up

### During Deployment

- [ ] Deploy services in order (Gateway → Social → Admin → Search → Taxi →
      Payment → Delivery → Notifications)
- [ ] Verify health checks after each deployment
- [ ] Update API Gateway service URLs
- [ ] Test authentication flow
- [ ] Verify database connections
- [ ] Check Redis connectivity

### After Deployment

- [ ] Run smoke tests on all services
- [ ] Test end-to-end user flows
- [ ] Configure monitoring and alerts
- [ ] Update DNS records (if using custom domains)
- [ ] Document deployment URLs
- [ ] Train team on new architecture
- [ ] Set up backup and recovery procedures
- [ ] Monitor error rates for 48 hours

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Supabase Documentation](https://supabase.com/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

**Ready to deploy!** 🚀

Follow this guide step-by-step for a successful Railway deployment of all 8
microservices.
