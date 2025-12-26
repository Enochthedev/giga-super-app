# Giga Platform - Deployment Guide

**Last Updated**: 2025-12-26
**Status**: Ready for Railway Deployment

---

## Prerequisites

### Required Tools
- [Node.js](https://nodejs.org/) >= 18.0.0
- [npm](https://www.npmjs.com/) >= 8.0.0
- [Railway CLI](https://docs.railway.app/develop/cli) (for deployment)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for database migrations)
- Git

### Required Accounts
- [Railway](https://railway.app/) account
- [Supabase](https://supabase.com/) project
- External service API keys (Paystack, Stripe, Google Maps, etc.)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd giga
```

### 2. Install Dependencies

```bash
# Root dependencies
npm install

# API Gateway dependencies
cd api-gateway
npm install
cd ..

# Social Service dependencies
cd social-service
npm install
cd ..
```

### 3. Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your actual credentials
# Required variables:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - DATABASE_URL
# - External service keys (Paystack, Stripe, etc.)
```

### 4. Validate Environment

```bash
# Run environment validation
node scripts/env-validate.js

# This will check:
# ✓ All required environment variables are set
# ✓ Environment variables have correct format
# ✓ Supabase connection is working
# ✓ Database URL is valid
```

---

## Local Development

### Start Services Locally

#### Option 1: Run Individual Services

```bash
# Terminal 1: API Gateway
cd api-gateway
npm run dev

# Terminal 2: Social Service
cd social-service
npm run dev
```

#### Option 2: Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Run Tests

```bash
# API Gateway tests
cd api-gateway
npm test

# Property-based tests
npm run test:property

# All tests
npm run test:all
```

### Health Checks

```bash
# Check API Gateway health
curl http://localhost:3000/health

# Check Social Service health
curl http://localhost:3001/health
```

---

## Railway Deployment

### 1. Install Railway CLI

```bash
# macOS
brew install railway

# Windows
scoop install railway

# Linux
npm install -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

### 3. Create Railway Project

```bash
# Initialize Railway project
railway init

# Link to existing project (if applicable)
railway link [project-id]
```

### 4. Configure Services

#### Deploy API Gateway

```bash
cd api-gateway

# Create new service
railway up

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set SUPABASE_URL=<your-supabase-url>
railway variables set SUPABASE_ANON_KEY=<your-anon-key>
railway variables set SUPABASE_SERVICE_ROLE_KEY=<your-service-key>

# Configure service name
railway service rename api-gateway
```

#### Deploy Social Service

```bash
cd ../social-service

# Create new service
railway up

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set SUPABASE_URL=<your-supabase-url>
railway variables set SUPABASE_SERVICE_ROLE_KEY=<your-service-key>

# Configure service name
railway service rename social-service
```

### 5. Configure API Gateway to Point to Social Service

```bash
cd api-gateway

# Set social service URL (Railway internal networking)
railway variables set SOCIAL_SERVICE_URL=http://social-service.railway.internal:3001

# Or use public URL
railway variables set SOCIAL_SERVICE_URL=https://social-service-production.railway.app
```

### 6. Deploy Services

```bash
# Deploy API Gateway
cd api-gateway
railway up

# Deploy Social Service
cd ../social-service
railway up
```

### 7. Verify Deployments

```bash
# Check API Gateway
curl https://your-api-gateway.railway.app/health

# Check Social Service
curl https://your-social-service.railway.app/health

# Check service logs
railway logs --service api-gateway
railway logs --service social-service
```

---

## Database Migrations

### Apply Migrations to Supabase

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push

# Verify schema
supabase db diff
```

### Seed Database (Development)

```bash
# Run database seeding
npm run db:seed

# For test environment
npm run db:seed:test
```

---

## Health Checks & Monitoring

### Service Health Endpoints

```bash
# API Gateway health
GET /health

Response:
{
  "status": "healthy",
  "service": "api-gateway",
  "version": "1.0.0",
  "uptime": 12345,
  "timestamp": "2025-12-26T..."
}

# Social Service health
GET /health

Response:
{
  "status": "healthy",
  "service": "social-service",
  "database": "connected",
  "timestamp": "2025-12-26T..."
}
```

### Circuit Breaker Stats

```bash
# Get circuit breaker statistics
GET /health/circuit-breakers

Response:
{
  "railway-social": {
    "state": "closed",
    "failures": 0,
    "successes": 1234,
    "latencyMean": 45
  },
  ...
}
```

---

## Troubleshooting

### Common Issues

#### 1. Health Check Failing

```bash
# Check logs
railway logs --service <service-name>

# Common causes:
# - Environment variables not set
# - Database connection failed
# - Service not started properly

# Solution:
railway variables
railway restart
```

#### 2. Database Connection Error

```bash
# Verify Supabase credentials
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test connection
curl $SUPABASE_URL/rest/v1/ \
  -H "apikey: $SUPABASE_ANON_KEY"

# Solution:
# - Check Supabase dashboard for correct keys
# - Ensure SSL is enabled in connection
```

#### 3. Circuit Breaker Open

```bash
# Check circuit breaker stats
curl https://your-gateway.railway.app/health/circuit-breakers

# Solution:
# - Check downstream service health
# - Wait for circuit to reset (30 seconds)
# - Check service logs for errors
```

#### 4. Rate Limiting Triggered

```bash
# Response:
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests"
  }
}

# Solution:
# - Wait 15 minutes
# - Implement request throttling
# - Contact support for rate limit increase
```

---

## Rollback Procedures

### Rollback Railway Deployment

```bash
# List deployments
railway status

# Rollback to previous deployment
railway rollback

# Rollback to specific deployment
railway rollback <deployment-id>
```

### Rollback Database Migration

```bash
# Reset to specific migration
supabase db reset --version <migration-timestamp>

# Or reset to remote schema
supabase db pull
supabase db push
```

---

## Performance Optimization

### 1. Enable Caching

```bash
# Set Redis URL for caching
railway variables set REDIS_URL=<your-redis-url>

# Restart services
railway restart
```

### 2. Connection Pooling

```bash
# Configure database pool size
railway variables set DB_POOL_SIZE=20

# Restart services
railway restart
```

### 3. CDN Configuration

- Configure Supabase Storage with CDN
- Set appropriate cache headers
- Use image transformations

---

## Security Checklist

Before deploying to production:

- [ ] All environment variables are set in Railway (not in code)
- [ ] Service role keys are kept secret (never in client code)
- [ ] HTTPS is enabled for all endpoints
- [ ] Rate limiting is configured
- [ ] CORS origins are restricted in production
- [ ] Helmet security headers are enabled
- [ ] Database RLS policies are in place
- [ ] Circuit breakers are configured
- [ ] Health checks are working
- [ ] Monitoring is set up

---

## Monitoring & Alerts

### Railway Dashboard

- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time service logs
- **Deployments**: Deployment history
- **Variables**: Environment variable management

### Recommended Setup

1. **Error Tracking**: Sentry integration
   ```bash
   railway variables set SENTRY_DSN=<your-sentry-dsn>
   ```

2. **Uptime Monitoring**: UptimeRobot or Pingdom
   - Monitor `/health` endpoints
   - Alert on 5xx errors

3. **Log Aggregation**: Railway Logs or external service
   - Set up log drains
   - Configure alerts for errors

---

## Production Checklist

Before going live:

### Infrastructure
- [ ] Railway services deployed
- [ ] Database migrations applied
- [ ] Health checks passing
- [ ] Environment variables configured

### Security
- [ ] All secrets in Railway variables
- [ ] HTTPS enforced
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Security headers enabled

### Performance
- [ ] Circuit breakers working
- [ ] Connection pooling configured
- [ ] Caching enabled (if using Redis)
- [ ] CDN configured for media

### Monitoring
- [ ] Error tracking set up
- [ ] Uptime monitoring configured
- [ ] Log aggregation working
- [ ] Alerts configured

### Testing
- [ ] All tests passing
- [ ] Integration tests run
- [ ] Load testing completed
- [ ] Security scan passed

---

## Support & Resources

### Documentation
- [Railway Docs](https://docs.railway.app/)
- [Supabase Docs](https://supabase.com/docs)
- [API Gateway README](./api-gateway/README.md)
- [Social Service README](./social-service/README.md)

### Getting Help
- Create an issue in the repository
- Check Railway community forum
- Consult technical debt document: `claude.md`

---

**Next Steps**: After deployment is complete, refer to `claude.md` for Phase 2 improvements (Delivery Service, Enhanced Support, Advanced Analytics).
