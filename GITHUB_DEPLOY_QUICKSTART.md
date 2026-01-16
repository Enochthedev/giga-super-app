# GitHub Deployment - Quick Start

**The cleanest way to deploy**: Let Railway watch your GitHub repo and
auto-deploy services.

---

## 🚀 Quick Start (5 Steps)

### Step 1: Create All Dockerfiles

```bash
./create-all-dockerfiles.sh
```

This creates Dockerfiles for all 7 services.

### Step 2: Commit and Push to GitHub

```bash
git add */Dockerfile */railway.json
git commit -m "Add Dockerfiles for all services"
git push origin main
```

### Step 3: Create Services in Railway Dashboard

Go to https://railway.app/project/0455788a-bd06-4e71-ba98-5c82c2ea64b6

For each service, click **"+ New"** → **"GitHub Repo"** → Select `giga` repo

Create these services:

1. `social-service`
2. `admin-service`
3. `payment-queue-service`
4. `search-service`
5. `delivery-service`
6. `taxi-realtime-service`
7. `notifications-service`

### Step 4: Configure Each Service

For each service in Railway dashboard:

#### Settings → Build

- **Dockerfile Path**: `<service-name>/Dockerfile`
  - Example: `social-service/Dockerfile`
- **Watch Paths**: `<service-name>/**,shared/**`
  - Example: `social-service/**,shared/**`

#### Settings → Deploy

- **Health Check Path**: `/health`
- **Health Check Timeout**: `100`

#### Variables

Add these environment variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
NODE_ENV=production
LOG_LEVEL=info
PORT=<service_port>
```

### Step 5: Trigger Deployment

```bash
# Make a small change to trigger deployment
echo "# Deployment trigger" >> social-service/README.md
git add .
git commit -m "Trigger deployment"
git push origin main
```

Railway will automatically deploy all services!

---

## 📊 What Happens Next

1. **Railway detects push** to `main` branch
2. **Checks watch paths** for each service
3. **Builds** using the correct Dockerfile
4. **Deploys** to the correct service
5. **Health checks** verify deployment
6. **URLs** are available for each service

---

## 🎯 Daily Workflow

### Update One Service

```bash
# Edit the service
vim social-service/src/index.ts

# Commit and push
git add .
git commit -m "Update social service"
git push origin main

# Railway auto-deploys ONLY social-service
```

### Update Multiple Services

```bash
# Edit multiple services
vim social-service/src/index.ts
vim admin-service/src/index.ts

# Commit and push
git add .
git commit -m "Update social and admin services"
git push origin main

# Railway auto-deploys BOTH services
```

### Update Shared Code

```bash
# Edit shared code
vim shared/config/index.ts

# Commit and push
git add .
git commit -m "Update shared config"
git push origin main

# Railway redeploys ALL services
# (Because they all depend on shared/)
```

---

## ✅ Benefits

- ✅ **No CLI needed** - Just push to GitHub
- ✅ **Automatic** - Railway handles everything
- ✅ **Selective** - Only changed services deploy
- ✅ **Git-based** - Easy rollbacks
- ✅ **Team-friendly** - Anyone can deploy

---

## 🔍 Verify Deployment

### Check Railway Dashboard

1. Go to your project
2. See all 8 services
3. Check deployment status
4. View logs for each service

### Test Health Endpoints

```bash
# Get URLs from Railway dashboard, then test:
curl https://social-service-production.up.railway.app/health
curl https://admin-service-production.up.railway.app/health
curl https://payment-queue-production.up.railway.app/health
curl https://search-service-production.up.railway.app/health
curl https://delivery-service-production.up.railway.app/health
curl https://taxi-realtime-production.up.railway.app/health
curl https://notifications-production.up.railway.app/health
```

### Update API Gateway

```bash
# Get all service URLs from Railway dashboard
# Then update API Gateway environment variables

# In Railway dashboard, go to giga-super-app → Variables
# Add/update:
SOCIAL_SERVICE_URL=https://social-service-production.up.railway.app
ADMIN_SERVICE_URL=https://admin-service-production.up.railway.app
PAYMENT_QUEUE_SERVICE_URL=https://payment-queue-production.up.railway.app
SEARCH_SERVICE_URL=https://search-service-production.up.railway.app
DELIVERY_SERVICE_URL=https://delivery-service-production.up.railway.app
TAXI_REALTIME_SERVICE_URL=https://taxi-realtime-production.up.railway.app
NOTIFICATIONS_SERVICE_URL=https://notifications-production.up.railway.app

# Restart API Gateway
```

---

## 🎉 Done!

You now have:

- ✅ 8 services deployed on Railway
- ✅ GitHub-based auto-deployment
- ✅ Each service with its own URL
- ✅ API Gateway routing to all services

**Just push to GitHub and Railway handles the rest!**
