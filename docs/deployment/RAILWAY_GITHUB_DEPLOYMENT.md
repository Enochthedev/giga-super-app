# Railway GitHub Deployment Guide

**Date**: January 16, 2026  
**Project**: Giga (0455788a-bd06-4e71-ba98-5c82c2ea64b6)  
**Deployment Method**: GitHub Integration ✅

---

## ✅ Current Status

- [x] Railway project linked
- [x] GitHub repository connected to Railway
- [x] railway.toml configuration file exists
- [x] All Dockerfiles present
- [x] Environment variables in .env file

---

## 🚀 Deployment Steps

### Step 1: Create Services in Railway Dashboard (15 minutes)

Since you've linked the GitHub repo, Railway can automatically deploy from it.
You need to create 8 services:

**Go to Railway Dashboard**:
https://railway.app/project/0455788a-bd06-4e71-ba98-5c82c2ea64b6

For each service below, click **"New"** → **"GitHub Repo"** → Select your repo →
Configure:

#### 1. API Gateway

- **Service Name**: `api-gateway`
- **Root Directory**: `api-gateway`
- **Build Command**: (Auto-detected from Dockerfile)
- **Start Command**: (Auto-detected from Dockerfile)
- **Port**: `3000`

#### 2. Social Service

- **Service Name**: `social-service`
- **Root Directory**: `social-service`
- **Port**: `3001`

#### 3. Admin Service

- **Service Name**: `admin-service`
- **Root Directory**: `admin-service`
- **Port**: `3002`

#### 4. Search Service

- **Service Name**: `search-service`
- **Root Directory**: `search-service`
- **Port**: `3004`

#### 5. Taxi Realtime Service

- **Service Name**: `taxi-realtime-service`
- **Root Directory**: `taxi-realtime-service`
- **Port**: `3006`

#### 6. Payment Queue Service

- **Service Name**: `payment-queue-service`
- **Root Directory**: `payment-queue-service`
- **Port**: `3003`

#### 7. Delivery Service

- **Service Name**: `delivery-service`
- **Root Directory**: `delivery-service`
- **Port**: `3005`

#### 8. Notifications Service

- **Service Name**: `notifications-service`
- **Root Directory**: `notifications-service`
- **Port**: `3007`

---

### Step 2: Provision Redis (5 minutes)

1. In Railway Dashboard, click **"New"** → **"Database"** → **"Add Redis"**
2. Wait for provisioning (1-2 minutes)
3. Redis URL will be automatically available as `REDIS_URL` to all services

---

### Step 3: Set Environment Variables (20 minutes)

You need to set environment variables for each service. Here's what each service
needs:

#### Shared Variables (Set for ALL services)

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
REDIS_URL=redis://default:password@host:port  # Auto-set by Railway
NODE_ENV=production
PORT=3000  # Different for each service
```

#### API Gateway Specific Variables

```bash
PORT=3000
SOCIAL_SERVICE_URL=https://social-service-production.up.railway.app
ADMIN_SERVICE_URL=https://admin-service-production.up.railway.app
SEARCH_SERVICE_URL=https://search-service-production.up.railway.app
TAXI_REALTIME_SERVICE_URL=https://taxi-realtime-service-production.up.railway.app
PAYMENT_QUEUE_SERVICE_URL=https://payment-queue-service-production.up.railway.app
DELIVERY_SERVICE_URL=https://delivery-service-production.up.railway.app
NOTIFICATIONS_SERVICE_URL=https://notifications-service-production.up.railway.app
```

#### Payment Queue Service Specific Variables

```bash
PORT=3003
PAYSTACK_SECRET_KEY=your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=your-paystack-public-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLIC_KEY=your-stripe-public-key
```

#### Notifications Service Specific Variables

```bash
PORT=3007
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-phone
SENDGRID_API_KEY=your-sendgrid-key
```

---

### Step 4: Configure Service Settings (10 minutes)

For each service in Railway Dashboard:

1. **Settings** → **Deploy**:
   - ✅ Enable "Auto Deploy" (deploy on git push)
   - ✅ Set "Watch Paths" to the service directory (e.g., `api-gateway/**`)

2. **Settings** → **Networking**:
   - ✅ Generate Domain (click "Generate Domain")
   - ✅ Note the domain URL for later

3. **Settings** → **Health Check**:
   - ✅ Path: `/health`
   - ✅ Timeout: 100 seconds

---

### Step 5: Deploy Services (Automatic)

Once you've created the services and set environment variables:

1. Railway will automatically detect the `railway.toml` configuration
2. Each service will build and deploy automatically
3. Monitor the deployment logs in Railway Dashboard

**Or trigger manual deployment:**

```bash
# Trigger deployment for all services
git commit --allow-empty -m "Trigger Railway deployment"
git push origin main
```

---

### Step 6: Update API Gateway URLs (10 minutes)

After all services are deployed and have domain URLs:

1. Get each service's domain from Railway Dashboard
2. Update API Gateway environment variables with the URLs
3. Redeploy API Gateway

**Example URLs:**

```
SOCIAL_SERVICE_URL=https://social-service-production-abc123.up.railway.app
ADMIN_SERVICE_URL=https://admin-service-production-def456.up.railway.app
SEARCH_SERVICE_URL=https://search-service-production-ghi789.up.railway.app
...
```

---

### Step 7: Configure Payment Webhooks (10 minutes)

#### Paystack Webhook

1. Go to Paystack Dashboard → Settings → API Keys & Webhooks
2. Add webhook URL:
   `https://payment-queue-production-xxx.up.railway.app/api/v1/webhooks/paystack`
3. Select events: `charge.success`, `charge.failed`, `refund.processed`

#### Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint:
   `https://payment-queue-production-xxx.up.railway.app/api/v1/webhooks/stripe`
3. Select events: `payment_intent.succeeded`, `payment_intent.failed`,
   `refund.created`

---

### Step 8: Test Deployments (15 minutes)

Test each service's health endpoint:

```bash
# Get service URLs from Railway Dashboard, then test:

# API Gateway
curl https://api-gateway-production-xxx.up.railway.app/health

# Social Service
curl https://social-service-production-xxx.up.railway.app/health

# Admin Service
curl https://admin-service-production-xxx.up.railway.app/health

# Search Service
curl https://search-service-production-xxx.up.railway.app/health

# Taxi Realtime Service
curl https://taxi-realtime-service-production-xxx.up.railway.app/health

# Payment Queue Service
curl https://payment-queue-service-production-xxx.up.railway.app/health

# Delivery Service
curl https://delivery-service-production-xxx.up.railway.app/health

# Notifications Service
curl https://notifications-service-production-xxx.up.railway.app/health
```

---

## 🔧 Alternative: Use Railway CLI to Set Variables

If you prefer using CLI instead of dashboard:

```bash
# Set variables for a specific service
railway variables set --service api-gateway PORT=3000
railway variables set --service api-gateway SUPABASE_URL="your-url"
railway variables set --service api-gateway JWT_SECRET="your-secret"

# Repeat for each service...
```

---

## 📊 Deployment Checklist

### Pre-Deployment

- [x] GitHub repo connected to Railway
- [ ] Redis provisioned
- [ ] All 8 services created in Railway
- [ ] Environment variables set for each service
- [ ] Health check paths configured

### Deployment

- [ ] All services deployed successfully
- [ ] All health checks passing
- [ ] Service URLs generated
- [ ] API Gateway updated with service URLs

### Post-Deployment

- [ ] Payment webhooks configured
- [ ] All endpoints tested
- [ ] Monitoring set up
- [ ] Error tracking configured

---

## 🆘 Troubleshooting

### Service Won't Build

**Check:**

1. Dockerfile exists in service directory
2. Root directory is set correctly in Railway
3. Build logs for specific errors

### Service Won't Start

**Check:**

1. Environment variables are set correctly
2. PORT variable matches the service port
3. Database connection strings are correct
4. Redis URL is available

### Health Check Failing

**Check:**

1. Service is actually running (check logs)
2. Health endpoint path is `/health`
3. Service is listening on correct PORT
4. No startup errors in logs

---

## 📈 Monitoring

### View Logs

In Railway Dashboard:

1. Select service
2. Click "Deployments"
3. Click on latest deployment
4. View "Logs" tab

### Check Metrics

In Railway Dashboard:

1. Select service
2. Click "Metrics"
3. View CPU, Memory, Network usage

---

## 🎯 Next Steps After Deployment

1. ✅ Verify all services are running
2. ✅ Test API endpoints through API Gateway
3. ✅ Configure custom domains (optional)
4. ✅ Set up monitoring alerts
5. ✅ Run integration tests
6. ✅ Update client applications with new URLs
7. ✅ Monitor for 48 hours

---

## 💡 Tips

1. **Use Railway's Auto-Deploy**: Automatically deploy on git push
2. **Watch Paths**: Configure each service to only deploy when its directory
   changes
3. **Environment Groups**: Use Railway's environment groups for shared variables
4. **Staging Environment**: Create a staging environment for testing
5. **Rollback**: Railway keeps deployment history for easy rollback

---

## 📚 Resources

- Railway Dashboard:
  https://railway.app/project/0455788a-bd06-4e71-ba98-5c82c2ea64b6
- Railway Docs: https://docs.railway.app
- Railway CLI Docs: https://docs.railway.app/develop/cli

---

**Ready to deploy!** Start with Step 1 and work through each step
systematically.
