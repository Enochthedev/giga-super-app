# Railway Setup - Next Steps

**Status**: ✅ Dockerfiles pushed to GitHub  
**Date**: January 16, 2026

---

## ✅ What's Done

1. ✅ Created production-ready Dockerfiles for all 7 services
2. ✅ Created railway.json configuration for each service
3. ✅ Committed and pushed to GitHub (commit: ac9f626)
4. ✅ API Gateway already deployed and running

**Current Deployment**:

- API Gateway: https://giga-super-app-production.up.railway.app ✅ LIVE

**Services Ready to Deploy**:

- social-service
- admin-service
- payment-queue-service
- search-service
- delivery-service
- taxi-realtime-service
- notifications-service

---

## 🚀 Next Steps: Create Services in Railway

### Step 1: Go to Railway Dashboard

Open: https://railway.app/project/0455788a-bd06-4e71-ba98-5c82c2ea64b6

### Step 2: Create Each Service

For each of the 7 services, follow these steps:

#### 2.1 Create New Service

1. Click **"+ New"** button
2. Select **"GitHub Repo"**
3. Select your **"giga-super-app"** repository
4. Railway will create a new service

#### 2.2 Configure Build Settings

Go to **Settings → Build** and set:

**For social-service**:

- **Root Directory**: Leave empty (monorepo root)
- **Dockerfile Path**: `social-service/Dockerfile`
- **Watch Paths**: `social-service/**,shared/**`

**For admin-service**:

- **Root Directory**: Leave empty
- **Dockerfile Path**: `admin-service/Dockerfile`
- **Watch Paths**: `admin-service/**,shared/**`

**For payment-queue-service**:

- **Root Directory**: Leave empty
- **Dockerfile Path**: `payment-queue-service/Dockerfile`
- **Watch Paths**: `payment-queue-service/**,shared/**`

**For search-service**:

- **Root Directory**: Leave empty
- **Dockerfile Path**: `search-service/Dockerfile`
- **Watch Paths**: `search-service/**,shared/**`

**For delivery-service**:

- **Root Directory**: Leave empty
- **Dockerfile Path**: `delivery-service/Dockerfile`
- **Watch Paths**: `delivery-service/**,shared/**`

**For taxi-realtime-service**:

- **Root Directory**: Leave empty
- **Dockerfile Path**: `taxi-realtime-service/Dockerfile`
- **Watch Paths**: `taxi-realtime-service/**,shared/**`

**For notifications-service**:

- **Root Directory**: Leave empty
- **Dockerfile Path**: `notifications-service/Dockerfile`
- **Watch Paths**: `notifications-service/**,shared/**`

#### 2.3 Configure Deploy Settings

Go to **Settings → Deploy** and set:

- **Health Check Path**: `/health`
- **Health Check Timeout**: `100` seconds
- **Restart Policy**: `ON_FAILURE`

#### 2.4 Add Environment Variables

Go to **Variables** tab and add these for EACH service:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Node Configuration
NODE_ENV=production
LOG_LEVEL=info

# Service-Specific Port (IMPORTANT - Different for each service!)
# social-service: PORT=3001
# admin-service: PORT=3002
# payment-queue-service: PORT=3003
# search-service: PORT=3004
# delivery-service: PORT=3005
# taxi-realtime-service: PORT=3006
# notifications-service: PORT=3007
PORT=<service_specific_port>
```

**Service-Specific Variables**:

**For payment-queue-service** (add these extra):

```bash
PAYSTACK_SECRET_KEY=your_paystack_secret
STRIPE_SECRET_KEY=your_stripe_secret
REDIS_URL=redis://default:password@host:port
```

**For notifications-service** (add these extra):

```bash
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone
```

**For taxi-realtime-service** (add these extra):

```bash
GOOGLE_MAPS_API_KEY=your_google_maps_key
REDIS_URL=redis://default:password@host:port
```

**For search-service** (add these extra):

```bash
ALGOLIA_APP_ID=your_algolia_app_id
ALGOLIA_API_KEY=your_algolia_api_key
```

#### 2.5 Trigger Deployment

After configuring each service:

1. Click **"Deploy"** button
2. Railway will automatically build and deploy
3. Wait for deployment to complete (2-5 minutes)
4. Check logs for any errors

---

## 📊 Deployment Checklist

Track your progress:

- [ ] **social-service**
  - [ ] Created service in Railway
  - [ ] Configured Dockerfile path: `social-service/Dockerfile`
  - [ ] Configured watch paths: `social-service/**,shared/**`
  - [ ] Added environment variables (PORT=3001)
  - [ ] Deployed successfully
  - [ ] Health check passing: `/health`
  - [ ] Noted service URL: `___________________`

- [ ] **admin-service**
  - [ ] Created service in Railway
  - [ ] Configured Dockerfile path: `admin-service/Dockerfile`
  - [ ] Configured watch paths: `admin-service/**,shared/**`
  - [ ] Added environment variables (PORT=3002)
  - [ ] Deployed successfully
  - [ ] Health check passing: `/health`
  - [ ] Noted service URL: `___________________`

- [ ] **payment-queue-service**
  - [ ] Created service in Railway
  - [ ] Configured Dockerfile path: `payment-queue-service/Dockerfile`
  - [ ] Configured watch paths: `payment-queue-service/**,shared/**`
  - [ ] Added environment variables (PORT=3003)
  - [ ] Added payment provider keys (Paystack, Stripe)
  - [ ] Added Redis URL
  - [ ] Deployed successfully
  - [ ] Health check passing: `/health`
  - [ ] Noted service URL: `___________________`

- [ ] **search-service**
  - [ ] Created service in Railway
  - [ ] Configured Dockerfile path: `search-service/Dockerfile`
  - [ ] Configured watch paths: `search-service/**,shared/**`
  - [ ] Added environment variables (PORT=3004)
  - [ ] Added Algolia keys
  - [ ] Deployed successfully
  - [ ] Health check passing: `/health`
  - [ ] Noted service URL: `___________________`

- [ ] **delivery-service**
  - [ ] Created service in Railway
  - [ ] Configured Dockerfile path: `delivery-service/Dockerfile`
  - [ ] Configured watch paths: `delivery-service/**,shared/**`
  - [ ] Added environment variables (PORT=3005)
  - [ ] Deployed successfully
  - [ ] Health check passing: `/health`
  - [ ] Noted service URL: `___________________`

- [ ] **taxi-realtime-service**
  - [ ] Created service in Railway
  - [ ] Configured Dockerfile path: `taxi-realtime-service/Dockerfile`
  - [ ] Configured watch paths: `taxi-realtime-service/**,shared/**`
  - [ ] Added environment variables (PORT=3006)
  - [ ] Added Google Maps API key
  - [ ] Added Redis URL
  - [ ] Deployed successfully
  - [ ] Health check passing: `/health`
  - [ ] Noted service URL: `___________________`

- [ ] **notifications-service**
  - [ ] Created service in Railway
  - [ ] Configured Dockerfile path: `notifications-service/Dockerfile`
  - [ ] Configured watch paths: `notifications-service/**,shared/**`
  - [ ] Added environment variables (PORT=3007)
  - [ ] Added SendGrid API key
  - [ ] Added Twilio credentials
  - [ ] Deployed successfully
  - [ ] Health check passing: `/health`
  - [ ] Noted service URL: `___________________`

---

## 🔍 After All Services Are Deployed

### Step 3: Update API Gateway Environment Variables

Once all services are deployed and you have their URLs, update the API Gateway:

1. Go to **giga-super-app** service in Railway
2. Go to **Variables** tab
3. Add/update these variables:

```bash
SOCIAL_SERVICE_URL=https://social-service-production.up.railway.app
ADMIN_SERVICE_URL=https://admin-service-production.up.railway.app
PAYMENT_QUEUE_SERVICE_URL=https://payment-queue-production.up.railway.app
SEARCH_SERVICE_URL=https://search-service-production.up.railway.app
DELIVERY_SERVICE_URL=https://delivery-service-production.up.railway.app
TAXI_REALTIME_SERVICE_URL=https://taxi-realtime-production.up.railway.app
NOTIFICATIONS_SERVICE_URL=https://notifications-production.up.railway.app
```

4. Click **"Redeploy"** to restart API Gateway with new URLs

### Step 4: Test All Services

Test each service health endpoint:

```bash
# API Gateway
curl https://giga-super-app-production.up.railway.app/health

# Social Service
curl https://social-service-production.up.railway.app/health

# Admin Service
curl https://admin-service-production.up.railway.app/health

# Payment Queue Service
curl https://payment-queue-production.up.railway.app/health

# Search Service
curl https://search-service-production.up.railway.app/health

# Delivery Service
curl https://delivery-service-production.up.railway.app/health

# Taxi Realtime Service
curl https://taxi-realtime-production.up.railway.app/health

# Notifications Service
curl https://notifications-production.up.railway.app/health
```

All should return:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "<service-name>",
    "timestamp": "2026-01-16T..."
  }
}
```

### Step 5: Test API Gateway Routing

Test that API Gateway correctly routes to services:

```bash
# Test social service through gateway
curl https://giga-super-app-production.up.railway.app/api/social/health

# Test admin service through gateway
curl https://giga-super-app-production.up.railway.app/api/admin/health

# Test search service through gateway
curl https://giga-super-app-production.up.railway.app/api/search/health
```

---

## 🎯 Quick Reference: Service Ports

| Service       | Port | Dockerfile Path                    | Watch Paths                          |
| ------------- | ---- | ---------------------------------- | ------------------------------------ |
| API Gateway   | 3000 | `Dockerfile`                       | `api-gateway/**,shared/**`           |
| Social        | 3001 | `social-service/Dockerfile`        | `social-service/**,shared/**`        |
| Admin         | 3002 | `admin-service/Dockerfile`         | `admin-service/**,shared/**`         |
| Payment Queue | 3003 | `payment-queue-service/Dockerfile` | `payment-queue-service/**,shared/**` |
| Search        | 3004 | `search-service/Dockerfile`        | `search-service/**,shared/**`        |
| Delivery      | 3005 | `delivery-service/Dockerfile`      | `delivery-service/**,shared/**`      |
| Taxi Realtime | 3006 | `taxi-realtime-service/Dockerfile` | `taxi-realtime-service/**,shared/**` |
| Notifications | 3007 | `notifications-service/Dockerfile` | `notifications-service/**,shared/**` |

---

## 🚨 Common Issues and Solutions

### Issue: Build fails with "Cannot find module 'shared'"

**Solution**: Make sure **Root Directory** is empty (not set to service folder).
The Dockerfile needs to build from monorepo root.

### Issue: Health check fails

**Solution**:

1. Check logs for errors
2. Verify PORT environment variable is set correctly
3. Ensure service has `/health` endpoint implemented

### Issue: Service can't connect to Supabase

**Solution**:

1. Verify SUPABASE_URL is correct
2. Verify SUPABASE_SERVICE_ROLE_KEY is set
3. Check Supabase project is not paused

### Issue: Watch paths not triggering deployment

**Solution**:

1. Verify watch paths include both service folder and shared folder
2. Format: `service-name/**,shared/**` (no spaces)
3. Make sure to include `/**` after folder names

---

## 📚 Additional Resources

- **Railway Documentation**: https://docs.railway.app
- **Monorepo Guide**: https://docs.railway.app/guides/monorepo
- **Health Checks**: https://docs.railway.app/deploy/healthchecks
- **Environment Variables**: https://docs.railway.app/develop/variables

---

## ✅ Success Criteria

You'll know everything is working when:

1. ✅ All 8 services show "Active" status in Railway dashboard
2. ✅ All health endpoints return 200 OK
3. ✅ API Gateway can route to all services
4. ✅ No errors in service logs
5. ✅ Services restart automatically on failure

---

## 🎉 What's Next After Deployment

Once all services are deployed:

1. **Update Client Applications**: Point mobile/web apps to new API Gateway URL
2. **Configure Webhooks**: Update Paystack/Stripe webhook URLs
3. **Monitor Services**: Set up monitoring and alerts
4. **Test End-to-End**: Run full integration tests
5. **Gradual Migration**: Start migrating traffic from Supabase edge functions

---

**Ready to start?** Go to Railway dashboard and create your first service! 🚀
