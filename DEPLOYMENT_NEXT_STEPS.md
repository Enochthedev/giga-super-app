# 🚀 Deployment Next Steps - Ready to Execute

**Date**: January 16, 2026  
**Status**: Phase 1 Complete ✅ | Phase 2 Ready to Start ⏳

---

## ✅ What We've Completed

### Phase 1: Immediate Cleanup (DONE)

- ✅ Deleted 3 Supabase edge functions:
  - `Initialize-payment-with-mock`
  - `Mock-payment-webhook`
  - `get-current-profile`
- ✅ Verified admin dashboard functions (both are different, kept both)
- ✅ Marked `Search-hotels` for deprecation (will delete after Railway
  deployment)

### Pre-Deployment Setup (DONE)

- ✅ Railway CLI installed and authenticated
- ✅ Railway project linked (ID: 0455788a-bd06-4e71-ba98-5c82c2ea64b6)
- ✅ GitHub repository connected to Railway
- ✅ All Dockerfiles present (8 services)
- ✅ Environment variables configured (.env file)
- ✅ Deployment scripts created and ready

---

## 🎯 What You Need to Do Now

### Step 1: Railway Dashboard Setup (30 minutes)

**Go to**: https://railway.app/project/0455788a-bd06-4e71-ba98-5c82c2ea64b6

#### 1.1 Provision Redis (5 minutes)

1. Click **"New"** → **"Database"** → **"Add Redis"**
2. Wait for provisioning
3. Redis URL will be auto-available as `REDIS_URL`

#### 1.2 Create 8 Services (25 minutes)

For each service, click **"New"** → **"GitHub Repo"** → Select your repo:

| Service Name          | Root Directory        | Port |
| --------------------- | --------------------- | ---- |
| api-gateway           | api-gateway           | 3000 |
| social-service        | social-service        | 3001 |
| admin-service         | admin-service         | 3002 |
| search-service        | search-service        | 3004 |
| taxi-realtime-service | taxi-realtime-service | 3006 |
| payment-queue-service | payment-queue-service | 3003 |
| delivery-service      | delivery-service      | 3005 |
| notifications-service | notifications-service | 3007 |

**For each service:**

- Set **Root Directory** to the service folder name
- Railway will auto-detect Dockerfile
- Enable **Auto Deploy** on git push
- Set **Watch Paths** to `{service-name}/**`
- Configure **Health Check** path: `/health`

---

### Step 2: Set Environment Variables (15 minutes)

**Option A: Use CLI Script (Recommended)**

```bash
# This will set all variables from your .env file
./scripts/set-railway-env.sh
```

**Option B: Manual in Dashboard**

For each service, go to **Settings** → **Variables** and add:

**Shared Variables (ALL services):**

```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
NODE_ENV=production
PORT={service-specific-port}
```

**Payment Queue Service Additional:**

```
PAYSTACK_SECRET_KEY=your-key
PAYSTACK_PUBLIC_KEY=your-key
STRIPE_SECRET_KEY=your-key
STRIPE_PUBLIC_KEY=your-key
```

**Notifications Service Additional:**

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-app-password
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=your-number
SENDGRID_API_KEY=your-key
```

---

### Step 3: Deploy Services (Automatic - 30 minutes)

Once services are created and variables are set:

**Option A: Auto-Deploy (Recommended)**

- Railway will automatically deploy all services
- Monitor progress in Railway Dashboard
- Check deployment logs for each service

**Option B: Manual Trigger**

```bash
# Trigger deployment
git commit --allow-empty -m "Deploy to Railway"
git push origin main
```

**Monitor Deployments:**

- Go to Railway Dashboard
- Click on each service
- View "Deployments" tab
- Check logs for any errors

---

### Step 4: Get Service URLs (10 minutes)

After all services are deployed:

1. Go to each service in Railway Dashboard
2. Click **Settings** → **Networking** → **Generate Domain**
3. Copy the generated URL
4. Save all URLs for next step

**Example URLs:**

```
API Gateway: https://api-gateway-production-abc123.up.railway.app
Social Service: https://social-service-production-def456.up.railway.app
Admin Service: https://admin-service-production-ghi789.up.railway.app
...
```

---

### Step 5: Update API Gateway URLs (10 minutes)

Update API Gateway with all service URLs:

**In Railway Dashboard:**

1. Go to **api-gateway** service
2. Click **Settings** → **Variables**
3. Add these variables with your actual URLs:

```
SOCIAL_SERVICE_URL=https://social-service-production-xxx.up.railway.app
ADMIN_SERVICE_URL=https://admin-service-production-xxx.up.railway.app
SEARCH_SERVICE_URL=https://search-service-production-xxx.up.railway.app
TAXI_REALTIME_SERVICE_URL=https://taxi-realtime-service-production-xxx.up.railway.app
PAYMENT_QUEUE_SERVICE_URL=https://payment-queue-service-production-xxx.up.railway.app
DELIVERY_SERVICE_URL=https://delivery-service-production-xxx.up.railway.app
NOTIFICATIONS_SERVICE_URL=https://notifications-service-production-xxx.up.railway.app
```

4. Redeploy API Gateway (it will auto-redeploy when you save variables)

---

### Step 6: Configure Payment Webhooks (10 minutes)

#### Paystack

1. Go to: https://dashboard.paystack.com/#/settings/developer
2. Add webhook URL:
   `https://payment-queue-production-xxx.up.railway.app/api/v1/webhooks/paystack`
3. Select events: `charge.success`, `charge.failed`, `refund.processed`

#### Stripe

1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint:
   `https://payment-queue-production-xxx.up.railway.app/api/v1/webhooks/stripe`
3. Select events: `payment_intent.succeeded`, `payment_intent.failed`,
   `refund.created`

---

### Step 7: Test Deployments (15 minutes)

Test each service health endpoint:

```bash
# Replace xxx with your actual Railway URLs

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

**Expected Response:**

```json
{
  "status": "healthy",
  "service": "service-name",
  "timestamp": "2026-01-16T..."
}
```

---

## 📋 Deployment Checklist

Use this to track your progress:

- [ ] Redis provisioned in Railway
- [ ] 8 services created in Railway
- [ ] Environment variables set for all services
- [ ] All services deployed successfully
- [ ] All health checks passing (8/8)
- [ ] Service URLs collected
- [ ] API Gateway URLs updated
- [ ] Payment webhooks configured
- [ ] All endpoints tested

---

## 🆘 Troubleshooting

### Service Won't Build

- Check Dockerfile exists in service directory
- Verify Root Directory is set correctly
- Check build logs for errors

### Service Won't Start

- Verify environment variables are set
- Check PORT variable matches service port
- Verify SUPABASE_URL and keys are correct
- Check service logs for startup errors

### Health Check Failing

- Wait 2-3 minutes for service to fully start
- Check service logs for errors
- Verify service is listening on correct PORT
- Test health endpoint manually with curl

### Can't Connect to Database

- Verify SUPABASE_URL is correct
- Check SUPABASE_SERVICE_ROLE_KEY is valid
- Ensure Supabase project is accessible
- Check service logs for connection errors

---

## 📊 Expected Timeline

| Step                      | Time        | Status |
| ------------------------- | ----------- | ------ |
| Railway Dashboard Setup   | 30 min      | ⏳     |
| Set Environment Variables | 15 min      | ⏳     |
| Deploy Services           | 30 min      | ⏳     |
| Get Service URLs          | 10 min      | ⏳     |
| Update API Gateway        | 10 min      | ⏳     |
| Configure Webhooks        | 10 min      | ⏳     |
| Test Deployments          | 15 min      | ⏳     |
| **Total**                 | **2 hours** |        |

---

## 📚 Documentation Reference

- **Detailed Guide**: `RAILWAY_GITHUB_DEPLOYMENT.md`
- **Environment Variables**: `RAILWAY_ENV_CHECKLIST.md`
- **Service Specs**: `SERVICE_SPECIFICATIONS.md`
- **Deployment Script**: `scripts/deploy-to-railway.sh`
- **Env Setup Script**: `scripts/set-railway-env.sh`

---

## 🎯 After Deployment

Once everything is deployed and tested:

1. ✅ Update task completion tracking
2. ✅ Delete `Search-hotels` function from Supabase
3. ✅ Monitor services for 24-48 hours
4. ✅ Set up monitoring alerts
5. ✅ Update client applications with new URLs
6. ✅ Run integration tests
7. ✅ Proceed to Phase 3: Notification Migration

---

## 💡 Quick Tips

- **Use Railway Dashboard** for initial setup (easier than CLI)
- **Enable Auto-Deploy** so changes deploy automatically
- **Watch Paths** prevent unnecessary rebuilds
- **Check Logs** if anything fails
- **Test Incrementally** - test each service as it deploys
- **Save URLs** - you'll need them multiple times

---

**Ready to deploy!** Start with Step 1 and work through systematically. The
whole process should take about 2 hours.

**Questions?** Check the detailed guides or Railway documentation.

🚀 **Let's ship it!**
