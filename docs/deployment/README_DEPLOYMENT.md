# Giga Super App - Deployment Guide

**Welcome!** This guide will help you deploy all services to Railway.

---

## 📖 Quick Navigation

| Document                                                         | Purpose                  | When to Use           |
| ---------------------------------------------------------------- | ------------------------ | --------------------- |
| **This File**                                                    | Overview and quick start | Start here            |
| [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)                   | Executive summary        | Quick overview        |
| [CURRENT_ARCHITECTURE_STATUS.md](CURRENT_ARCHITECTURE_STATUS.md) | Current state            | Check what's deployed |
| [DEPLOY_ALL_SERVICES_GUIDE.md](DEPLOY_ALL_SERVICES_GUIDE.md)     | Complete guide           | Detailed instructions |
| [QUICK_DEPLOY_REFERENCE.md](QUICK_DEPLOY_REFERENCE.md)           | Quick reference          | Common commands       |

---

## 🎯 Current Status

### ✅ Deployed

- **API Gateway** on Railway (Port 3000)
- URL: https://giga-super-app-production.up.railway.app
- Status: Running and healthy

### 🚀 Ready to Deploy

- **Social Service** (Port 3001) - 100% complete
- **Admin Service** (Port 3002) - 100% complete
- **Payment Queue Service** (Port 3003) - 90% complete
- **Search Service** (Port 3004) - 100% complete
- **Delivery Service** (Port 3005) - 70% complete
- **Taxi Realtime Service** (Port 3006) - 100% complete
- **Notifications Service** (Port 3007) - 60% complete

### 📍 Staying on Supabase

- **95 Edge Functions** (Hotels, Rides, Users, Cart, Calls, etc.)
- These are database-intensive and work well on Supabase
- API Gateway will route to them automatically

---

## 🚀 Deploy All Services (One Command)

```bash
./scripts/deploy-all-services.sh
```

That's it! The script will:

1. Create Dockerfiles for all services
2. Deploy each service to Railway
3. Set environment variables
4. Update API Gateway configuration
5. Test all health endpoints

**Time**: 30-45 minutes  
**Difficulty**: Easy

---

## 🏗️ Architecture

```
Client Apps
    ↓
API Gateway (Railway) ← You are here
    ↓
    ├─→ Railway Services (Social, Admin, Payment, Search, etc.)
    └─→ Supabase Functions (Hotels, Rides, Users, Cart, etc.)
         ↓
    Supabase Database (PostgreSQL)
```

**Why this architecture?**

- Database-heavy functions stay on Supabase (close to database)
- Compute-heavy services move to Railway (better for processing)
- API Gateway routes requests to the right place
- Best performance and cost efficiency

---

## 📋 Prerequisites

### 1. Railway CLI

```bash
# Check if installed
railway --version

# If not installed
brew install railway  # macOS
```

### 2. Railway Account

```bash
# Login
railway login

# Verify
railway whoami
```

### 3. Environment Variables

Make sure your `.env` file has:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET
- (Other service-specific keys)

---

## 🎬 Step-by-Step

### Step 1: Review Current Status

```bash
# Check what's deployed
railway status

# View API Gateway logs
railway logs
```

### Step 2: Run Deployment Script

```bash
# Make script executable (if not already)
chmod +x scripts/deploy-all-services.sh

# Run deployment
./scripts/deploy-all-services.sh
```

### Step 3: Follow Prompts

The script will ask you:

- Do you want to test builds locally? (Recommended: Yes)
- Continue with deployment? (Yes)

### Step 4: Wait for Completion

The script will:

- Create Dockerfiles ✅
- Build services ✅
- Deploy to Railway ✅
- Set environment variables ✅
- Test health endpoints ✅

### Step 5: Verify Deployment

```bash
# Test API Gateway
curl https://giga-super-app-production.up.railway.app/health

# Test individual services
curl https://social-service-production.up.railway.app/health
curl https://admin-service-production.up.railway.app/health
# ... etc
```

---

## 🔧 Post-Deployment Tasks

### 1. Provision Redis

Two services need Redis:

- Payment Queue Service
- Notifications Service

**How to add Redis:**

1. Go to Railway dashboard
2. Click "New" → "Database" → "Add Redis"
3. Link Redis to payment-queue-service
4. Link Redis to notifications-service

### 2. Update Payment Webhooks

Update webhook URLs in:

- **Paystack Dashboard**:
  `https://payment-queue-service-production.up.railway.app/api/v1/webhooks/paystack`
- **Stripe Dashboard**:
  `https://payment-queue-service-production.up.railway.app/api/v1/webhooks/stripe`

### 3. Set Additional Environment Variables

```bash
# Payment service
railway variables --service payment-queue-service --set "PAYSTACK_SECRET_KEY=your_key"
railway variables --service payment-queue-service --set "STRIPE_SECRET_KEY=your_key"

# Notifications service
railway variables --service notifications-service --set "SENDGRID_API_KEY=your_key"
railway variables --service notifications-service --set "TWILIO_ACCOUNT_SID=your_sid"
railway variables --service notifications-service --set "TWILIO_AUTH_TOKEN=your_token"
```

### 4. Update Client Applications

Point all API calls to:

```
https://giga-super-app-production.up.railway.app
```

The API Gateway will route requests to the appropriate service.

---

## 🧪 Testing

### Health Checks

```bash
# Test all services
for service in giga-super-app social-service admin-service payment-queue-service search-service delivery-service taxi-realtime-service notifications-service; do
  echo "Testing $service..."
  curl -s https://${service}-production.up.railway.app/health | jq
done
```

### Routing Tests

```bash
# Test API Gateway routing
curl https://giga-super-app-production.up.railway.app/api/v1/social/health
curl https://giga-super-app-production.up.railway.app/api/v1/admin/health
curl https://giga-super-app-production.up.railway.app/api/v1/payments/health
```

### Integration Tests

Test end-to-end flows:

1. Create a post (social service)
2. Search for content (search service)
3. Send notification (notifications service)
4. Process payment (payment service)

---

## 📊 Monitoring

### View Logs

```bash
# View logs for specific service
railway logs --service social-service

# View logs for all services
for service in social-service admin-service payment-queue-service search-service delivery-service taxi-realtime-service notifications-service; do
  echo "=== $service ==="
  railway logs --service $service --lines 10
done
```

### Railway Dashboard

Monitor in Railway dashboard:

- CPU usage
- Memory usage
- Request count
- Error rates
- Response times

---

## 🔥 Troubleshooting

### Service Won't Start

```bash
# Check logs
railway logs --service <service-name>

# Check environment variables
railway variables --service <service-name>

# Restart service
railway restart --service <service-name>
```

### Database Connection Issues

```bash
# Verify Supabase credentials
railway variables --service <service-name> | grep SUPABASE

# Test connection locally
node -e "const { createClient } = require('@supabase/supabase-js'); const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); client.from('user_profiles').select('count').then(console.log);"
```

### Build Failures

```bash
# Test build locally
docker build -t test -f <service>/Dockerfile .

# Check for TypeScript errors
npm run build
```

---

## 💰 Cost

### Railway

- **Pro Plan**: $20/month (recommended for 8 services)
- Includes unlimited execution time

### Supabase

- **Free Tier**: Currently using
- **Pro Plan**: $25/month (if needed)

**Total**: $20-45/month

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Supabase Documentation](https://supabase.com/docs)
- [Docker Documentation](https://docs.docker.com)

---

## 🎯 Success Checklist

- [ ] Railway CLI installed and logged in
- [ ] Environment variables configured
- [ ] Deployment script executed successfully
- [ ] All 8 services deployed
- [ ] All health checks passing
- [ ] Redis provisioned and linked
- [ ] Payment webhooks updated
- [ ] Client apps updated
- [ ] Monitoring configured
- [ ] Team notified

---

## 🚀 Ready to Deploy?

Run this command to deploy all services:

```bash
./scripts/deploy-all-services.sh
```

**Questions?** Check the detailed guides:

- [DEPLOY_ALL_SERVICES_GUIDE.md](DEPLOY_ALL_SERVICES_GUIDE.md) - Complete guide
- [QUICK_DEPLOY_REFERENCE.md](QUICK_DEPLOY_REFERENCE.md) - Quick reference

---

**Good luck with your deployment!** 🎉
