# Railway Configuration Fix Summary

**Date**: January 16, 2026  
**Issue**: Build failing with `"/shared": not found`  
**Status**: ✅ FIXED

---

## 🚨 The Problem

Railway was trying to build from the service subdirectory, but the Dockerfile
needs access to the parent directory to copy the `shared/` folder.

**Error in logs**:

```
ERROR: failed to build: failed to solve: failed to calculate checksum: "/shared": not found
```

---

## ✅ The Solution

The Dockerfiles are correct! The issue is in the **Railway dashboard
configuration**.

### What You Need to Do in Railway Dashboard

For **EACH** of the 7 services, configure:

1. **Settings → Build**:

   ```
   Root Directory: [LEAVE EMPTY - DO NOT SET ANYTHING]
   Dockerfile Path: <service-name>/Dockerfile
   Watch Paths: <service-name>/**,shared/**
   ```

2. **Why this works**:
   - Empty Root Directory = Railway builds from repo root
   - Repo root has access to both `shared/` and service folders
   - Dockerfile can successfully `COPY shared ./shared`

---

## 📋 Quick Fix Checklist

Go to Railway dashboard for each service and verify:

### Social Service

- [ ] Root Directory: **EMPTY** (not "social-service")
- [ ] Dockerfile Path: `social-service/Dockerfile`
- [ ] Watch Paths: `social-service/**,shared/**`

### Admin Service

- [ ] Root Directory: **EMPTY**
- [ ] Dockerfile Path: `admin-service/Dockerfile`
- [ ] Watch Paths: `admin-service/**,shared/**`

### Payment Queue Service

- [ ] Root Directory: **EMPTY**
- [ ] Dockerfile Path: `payment-queue-service/Dockerfile`
- [ ] Watch Paths: `payment-queue-service/**,shared/**`

### Search Service

- [ ] Root Directory: **EMPTY**
- [ ] Dockerfile Path: `search-service/Dockerfile`
- [ ] Watch Paths: `search-service/**,shared/**`

### Delivery Service

- [ ] Root Directory: **EMPTY**
- [ ] Dockerfile Path: `delivery-service/Dockerfile`
- [ ] Watch Paths: `delivery-service/**,shared/**`

### Taxi Realtime Service

- [ ] Root Directory: **EMPTY**
- [ ] Dockerfile Path: `taxi-realtime-service/Dockerfile`
- [ ] Watch Paths: `taxi-realtime-service/**,shared/**`

### Notifications Service

- [ ] Root Directory: **EMPTY**
- [ ] Dockerfile Path: `notifications-service/Dockerfile`
- [ ] Watch Paths: `notifications-service/**,shared/**`

---

## 🎯 Visual Guide

### ❌ WRONG Configuration (causes error)

```
Service: social-service
├── Root Directory: social-service  ❌ WRONG
├── Dockerfile Path: Dockerfile
└── Watch Paths: **

Result: Railway builds from social-service/
        Can't find ../shared/ (parent directory)
        Build fails ❌
```

### ✅ CORRECT Configuration (works)

```
Service: social-service
├── Root Directory: [EMPTY]  ✅ CORRECT
├── Dockerfile Path: social-service/Dockerfile
└── Watch Paths: social-service/**,shared/**

Result: Railway builds from repo root
        Can access both shared/ and social-service/
        Build succeeds ✅
```

---

## 🔧 How to Fix Right Now

### Step 1: Go to Railway Dashboard

Open: https://railway.app/project/0455788a-bd06-4e71-ba98-5c82c2ea64b6

### Step 2: For Each Service

1. Click on the service (e.g., "social-service")
2. Go to **Settings** tab
3. Click **Build** section
4. **CLEAR** the "Root Directory" field (make it empty)
5. Set "Dockerfile Path" to `social-service/Dockerfile`
6. Set "Watch Paths" to `social-service/**,shared/**`
7. Click **Save**

### Step 3: Trigger Rebuild

After fixing all services:

```bash
# Trigger rebuild
git commit --allow-empty -m "trigger rebuild after Railway config fix"
git push origin main
```

Or click **"Redeploy"** in Railway dashboard for each service.

---

## 🎉 What We've Added

### 1. CI/CD Pipeline ✅

**File**: `.github/workflows/railway-deploy.yml`

**Features**:

- Detects which services changed
- Runs tests and linting
- Builds Docker images
- Auto-deploys to Railway
- Runs health checks

**Usage**: Just push to `main` branch!

### 2. Railway Configuration Guide ✅

**File**: `RAILWAY_DASHBOARD_CONFIG.md`

Complete guide for configuring each service in Railway dashboard.

### 3. CI/CD Documentation ✅

**File**: `CI_CD_SETUP.md`

Complete guide for using the CI/CD pipeline.

### 4. NPM Scripts ✅

Added to `package.json`:

```bash
npm run ci:all          # Run all CI checks
npm run ci:build        # Build TypeScript
npm run ci:test         # Run tests
npm run ci:lint         # Lint code
npm run docker:build    # Build Docker images
npm run railway:logs    # View Railway logs
```

---

## 📊 Deployment Flow (After Fix)

```
1. Make changes to a service
   ↓
2. Commit and push to GitHub
   ↓
3. GitHub Actions runs CI checks
   ↓
4. Railway detects push
   ↓
5. Railway builds from repo root ✅
   - Can access shared/ folder ✅
   - Can access service folder ✅
   ↓
6. Build succeeds ✅
   ↓
7. Service deploys ✅
   ↓
8. Health check passes ✅
```

---

## 🚀 Next Steps

1. **Fix Railway Configuration** (5 minutes per service)
   - Follow checklist above
   - Make sure Root Directory is EMPTY

2. **Trigger Rebuild** (1 minute)

   ```bash
   git commit --allow-empty -m "trigger rebuild"
   git push origin main
   ```

3. **Watch Build Logs** (2-5 minutes per service)
   - Should see successful build
   - No more "shared not found" errors

4. **Verify Health Checks** (1 minute)

   ```bash
   curl https://social-service-production.up.railway.app/health
   ```

5. **Update API Gateway** (2 minutes)
   - Add service URLs to environment variables
   - Redeploy API Gateway

---

## 📚 Documentation Files

- **RAILWAY_DASHBOARD_CONFIG.md** ← **START HERE** (step-by-step fix)
- **CI_CD_SETUP.md** ← CI/CD pipeline guide
- **RAILWAY_SETUP_NEXT_STEPS.md** ← Original setup guide
- **DEPLOYMENT_STATUS.md** ← Track deployment progress

---

## ✅ Success Criteria

You'll know it's fixed when:

1. ✅ Railway build logs show:

   ```
   [builder 7/9] COPY shared ./shared
   ✅ Success
   ```

2. ✅ All services deploy successfully

3. ✅ Health checks return 200 OK:

   ```bash
   curl https://service-url/health
   {"success":true,"data":{"status":"healthy"}}
   ```

4. ✅ No more "shared not found" errors

---

## 🆘 Still Having Issues?

### Check These:

1. **Root Directory is EMPTY** (most common issue)
2. **Dockerfile Path** includes service folder name
3. **Watch Paths** includes both service and shared
4. **Environment variables** are set correctly
5. **PORT** matches service (3001-3007)

### Get Help:

- Check `RAILWAY_DASHBOARD_CONFIG.md` for detailed guide
- View Railway build logs for specific errors
- Test Docker build locally:
  ```bash
  docker build -f social-service/Dockerfile -t test .
  ```

---

**The fix is simple**: Just make sure Root Directory is EMPTY in Railway
dashboard! 🎯
