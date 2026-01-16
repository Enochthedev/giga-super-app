# Quick Start - Railway Deployment

**Time Required**: 2-3 hours  
**Difficulty**: Intermediate  
**Prerequisites**: Railway account, Supabase project, external service API keys

---

## 🚀 5-Step Deployment Process

### Step 1: Install Railway CLI (5 minutes)

```bash
# macOS
brew install railway

# Or via npm
npm install -g @railway/cli

# Verify installation
railway --version

# Login to Railway
railway login
```

---

### Step 2: Prepare Environment Variables (30 minutes)

1. **Copy environment template**:

```bash
cp .env.example .env
```

2. **Fill in CRITICAL variables** (see `RAILWAY_ENV_CHECKLIST.md`):
   - ✅ `SUPABASE_URL` - From Supabase Dashboard → Settings → API
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` - From Supabase Dashboard → Settings → API
   - ✅ `JWT_SECRET` - Generate: `openssl rand -base64 32`
   - ✅ Payment keys (Paystack/Stripe) - From provider dashboards
   - ✅ SMTP credentials - Gmail App Password or SendGrid
   - ✅ Twilio credentials - From Twilio Console

3. **Verify all critical variables are set**:

```bash
node scripts/env-validate.js
```

---

### Step 3: Create Railway Project & Provision Redis (10 minutes)

```bash
# Create new Railway project
railway init
# Follow prompts to name your project

# Or link to existing project
railway link
# Select your project from the list
```

**Provision Redis**:

1. Go to Railway Dashboard
2. Select your project
3. Click "New" → "Database" → "Add Redis"
4. Wait for provisioning (1-2 minutes)
5. `REDIS_URL` will be automatically available to all services

---

### Step 4: Deploy Services (1-2 hours)

#### Option A: Automated Deployment (Recommended)

```bash
# Run automated deployment script
./scripts/deploy-to-railway.sh
```

The script will:

- ✅ Check Railway CLI and authentication
- ✅ Verify project is linked
- ✅ Set shared environment variables
- ✅ Deploy all 8 services in order
- ✅ Update API Gateway service URLs
- ✅ Run smoke tests
- ✅ Display deployment summary

#### Option B: Manual Deployment

Deploy services one by one:

```bash
# 1. API Gateway
cd api-gateway
railway up --service api-gateway
cd ..

# 2. Social Service
cd social-service
railway up --service social-service
cd ..

# 3. Admin Service
cd admin-service
railway up --service admin-service
cd ..

# 4. Search Service
cd search-service
railway up --service search-service
cd ..

# 5. Taxi Realtime Service
cd taxi-realtime-service
railway up --service taxi-realtime-service
cd ..

# 6. Payment Queue Service
cd payment-queue-service
railway up --service payment-queue-service
cd ..

# 7. Delivery Service
cd delivery-service
railway up --service delivery-service
cd ..

# 8. Notifications Service
cd notifications-service
railway up --service notifications-service
cd ..
```

---

### Step 5: Post-Deployment Configuration (30 minutes)

#### 5.1 Update API Gateway Service URLs

Get service URLs from Railway dashboard and update API Gateway:

```bash
# Get URLs
railway domain --service social-service
railway domain --service admin-service
# ... repeat for all services

# Set in API Gateway
railway variables set --service api-gateway \
  SOCIAL_SERVICE_URL=https://social-service-production.up.railway.app

railway variables set --service api-gateway \
  ADMIN_SERVICE_URL=https://admin-service-production.up.railway.app

# ... repeat for all services

# Restart API Gateway
railway restart --service api-gateway
```

#### 5.2 Configure Payment Webhooks

**Paystack**:

1. Login to Paystack Dashboard
2. Settings → API Keys & Webhooks
3. Add webhook URL:
   `https://payment-queue-production.up.railway.app/api/v1/webhooks/paystack`
4. Select events: `charge.success`, `charge.failed`, `refund.processed`

**Stripe**:

1. Login to Stripe Dashboard
2. Developers → Webhooks
3. Add endpoint:
   `https://payment-queue-production.up.railway.app/api/v1/webhooks/stripe`
4. Select events: `payment_intent.succeeded`, `payment_intent.failed`,
   `refund.created`

#### 5.3 Run Smoke Tests

```bash
# Get API Gateway URL
GATEWAY_URL=$(railway domain --service api-gateway)

# Test health endpoints
curl https://$GATEWAY_URL/health

# Test authenticated endpoint (replace JWT_TOKEN)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://$GATEWAY_URL/api/v1/social/posts

# Test search
curl "https://$GATEWAY_URL/api/v1/search?q=test&type=hotels"
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] All 8 services show "Active" status in Railway dashboard
- [ ] Health checks passing for all services (`/health` endpoints return 200)
- [ ] API Gateway can route to all backend services
- [ ] Database connections working (check service logs)
- [ ] Redis connections working (check service logs)
- [ ] Payment webhooks configured in provider dashboards
- [ ] Email sending works (test notification)
- [ ] SMS sending works (test notification)
- [ ] No critical errors in service logs

---

## 🔍 Monitoring & Logs

### View Service Logs

```bash
# View logs for specific service
railway logs --service api-gateway --follow

# View logs for all services
railway logs --follow
```

### Check Service Status

```bash
# Check all services
railway status

# Check specific service
railway status --service api-gateway
```

### View Environment Variables

```bash
# View all variables for a service
railway variables --service api-gateway

# Check if specific variable is set
railway variables --service api-gateway | grep SUPABASE_URL
```

---

## 🆘 Common Issues & Solutions

### Issue: Service won't start

**Solution**:

```bash
# Check logs for errors
railway logs --service service-name

# Verify environment variables
railway variables --service service-name

# Restart service
railway restart --service service-name
```

### Issue: Health check failing

**Solution**:

```bash
# Test health endpoint directly
curl https://service-name.railway.app/health

# Check if PORT is set correctly
railway variables --service service-name | grep PORT

# Check service logs for startup errors
railway logs --service service-name
```

### Issue: Database connection failed

**Solution**:

```bash
# Verify Supabase credentials
railway variables --service service-name | grep SUPABASE

# Test connection
railway run --service service-name node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
client.from('user_profiles').select('count').then(console.log);
"
```

### Issue: Redis connection failed

**Solution**:

```bash
# Verify Redis is provisioned
railway variables | grep REDIS_URL

# Restart service
railway restart --service service-name
```

---

## 📊 Cost Estimation

### Railway Pricing

- **Hobby Plan**: $5/month + usage
- **Pro Plan**: $20/month + usage

### Estimated Monthly Cost

- 8 services × 512MB RAM × 730 hours ≈ $1,355/month
- Redis (256MB) ≈ $85/month
- **Total**: ~$1,440/month

### Cost Optimization Tips

1. Use Railway's sleep feature for non-critical services
2. Implement aggressive caching
3. Use connection pooling
4. Monitor and optimize resource usage

---

## 🎯 Next Steps After Deployment

1. **Set up monitoring**:
   - Configure Sentry for error tracking
   - Set up uptime monitoring (UptimeRobot, Pingdom)
   - Create alerts for critical errors

2. **Configure custom domains** (optional):

   ```bash
   railway domain --service api-gateway yourdomain.com
   ```

3. **Run comprehensive tests**:
   - Integration tests
   - Load tests
   - Security tests

4. **Update documentation**:
   - Document service URLs
   - Update API documentation
   - Create runbooks for common operations

5. **Train team**:
   - Share deployment guide
   - Demonstrate monitoring tools
   - Document troubleshooting procedures

---

## 📚 Additional Resources

- **Deployment Guide**: `RAILWAY_DEPLOYMENT_GUIDE.md` - Comprehensive deployment
  documentation
- **Environment Variables**: `RAILWAY_ENV_CHECKLIST.md` - Complete variable
  checklist
- **Service Specifications**: `SERVICE_SPECIFICATIONS.md` - Detailed service
  documentation
- **Comparison Document**: `SUPABASE_RAILWAY_COMPARISON.md` - Current state
  analysis

---

## 🚀 Ready to Deploy!

You now have everything needed for a successful Railway deployment:

✅ Comprehensive deployment guide  
✅ Environment variables checklist  
✅ Automated deployment script  
✅ Post-deployment verification steps  
✅ Troubleshooting guide  
✅ Monitoring setup instructions

**Start with Step 1 and follow the guide step-by-step!**

---

**Questions or issues?** Check the troubleshooting section or review the
comprehensive deployment guide.
