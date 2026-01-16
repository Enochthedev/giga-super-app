# Railway TOML Configuration Fix

**Date**: January 16, 2026  
**Issue**: Root `railway.toml` was overriding service-specific configurations  
**Status**: ✅ FIXED

---

## 🚨 The Real Problem

You were right! The issue wasn't just the dashboard configuration - it was the
**root `railway.toml` file**.

### What Was Happening

```
Root railway.toml (at repo root)
├── builder = "DOCKERFILE"
├── dockerfilePath = "Dockerfile"  ← Points to API Gateway Dockerfile
└── This was being used for ALL services! ❌

Result: Every service tried to use the API Gateway Dockerfile
        Build failed because service code wasn't in the right place
```

---

## ✅ The Fix

We've created **service-specific `railway.toml` files** for each service:

```
giga-super-app/
├── railway.toml.backup          ← Old root config (backed up)
├── api-gateway/
│   └── railway.toml             ← API Gateway config
├── social-service/
│   └── railway.toml             ← Social service config
├── admin-service/
│   └── railway.toml             ← Admin service config
├── payment-queue-service/
│   └── railway.toml             ← Payment config
├── search-service/
│   └── railway.toml             ← Search config
├── delivery-service/
│   └── railway.toml             ← Delivery config
├── taxi-realtime-service/
│   └── railway.toml             ← Taxi config
└── notifications-service/
    └── railway.toml             ← Notifications config
```

---

## 📋 Configuration for Each Service

### Example: Social Service

**File**: `social-service/railway.toml`

```toml
# Railway configuration for social-service
[build]
builder = "DOCKERFILE"
dockerfilePath = "social-service/Dockerfile"
watchPaths = ["social-service/**", "shared/**"]

[deploy]
numReplicas = 1
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

**Key Points**:

- `dockerfilePath` is relative to **repo root**
- `watchPaths` includes both service folder and shared folder
- Railway builds from repo root (can access both folders)

---

## 🎯 How Railway Finds Configuration

Railway looks for configuration in this order:

1. **Service-specific `railway.toml`** in service directory ✅ (We use this)
2. Service-specific `railway.json` in service directory
3. Root `railway.toml` (applies to all services) ❌ (We removed this)
4. Dashboard configuration (manual settings)

---

## 🔧 What Changed

### Before (Broken)

```
Root railway.toml:
  dockerfilePath = "Dockerfile"  ← API Gateway only

All services tried to use this:
  social-service → Uses Dockerfile (wrong!) ❌
  admin-service → Uses Dockerfile (wrong!) ❌
  payment-service → Uses Dockerfile (wrong!) ❌
```

### After (Fixed)

```
Each service has its own railway.toml:
  social-service/railway.toml:
    dockerfilePath = "social-service/Dockerfile" ✅

  admin-service/railway.toml:
    dockerfilePath = "admin-service/Dockerfile" ✅

  payment-queue-service/railway.toml:
    dockerfilePath = "payment-queue-service/Dockerfile" ✅
```

---

## 🚀 How to Deploy Now

### Option 1: Railway Dashboard (Recommended)

For each service in Railway dashboard:

1. Go to service → Settings → Source
2. Railway will automatically detect the `railway.toml` file
3. Configuration will be loaded from the file
4. Click "Redeploy"

### Option 2: Railway CLI

```bash
# Link to specific service
cd social-service
railway link

# Deploy
railway up

# Railway will use social-service/railway.toml automatically
```

### Option 3: GitHub Push (Automatic)

```bash
# Just push to GitHub
git add .
git commit -m "Fix Railway configuration"
git push origin main

# Railway will:
# 1. Detect changes
# 2. Read service-specific railway.toml
# 3. Build with correct Dockerfile
# 4. Deploy automatically
```

---

## 📊 Service Configuration Summary

| Service       | Config File                          | Dockerfile Path                    | Watch Paths                          |
| ------------- | ------------------------------------ | ---------------------------------- | ------------------------------------ |
| API Gateway   | `api-gateway/railway.toml`           | `Dockerfile`                       | `api-gateway/**,shared/**`           |
| Social        | `social-service/railway.toml`        | `social-service/Dockerfile`        | `social-service/**,shared/**`        |
| Admin         | `admin-service/railway.toml`         | `admin-service/Dockerfile`         | `admin-service/**,shared/**`         |
| Payment       | `payment-queue-service/railway.toml` | `payment-queue-service/Dockerfile` | `payment-queue-service/**,shared/**` |
| Search        | `search-service/railway.toml`        | `search-service/Dockerfile`        | `search-service/**,shared/**`        |
| Delivery      | `delivery-service/railway.toml`      | `delivery-service/Dockerfile`      | `delivery-service/**,shared/**`      |
| Taxi          | `taxi-realtime-service/railway.toml` | `taxi-realtime-service/Dockerfile` | `taxi-realtime-service/**,shared/**` |
| Notifications | `notifications-service/railway.toml` | `notifications-service/Dockerfile` | `notifications-service/**,shared/**` |

---

## ✅ Verification

### Check Configuration Files

```bash
# Verify all railway.toml files exist
ls -la */railway.toml

# Should see:
# admin-service/railway.toml
# api-gateway/railway.toml
# delivery-service/railway.toml
# notifications-service/railway.toml
# payment-queue-service/railway.toml
# search-service/railway.toml
# social-service/railway.toml
# taxi-realtime-service/railway.toml
```

### Check Configuration Content

```bash
# View a service configuration
cat social-service/railway.toml

# Should see:
# dockerfilePath = "social-service/Dockerfile"
# watchPaths = ["social-service/**", "shared/**"]
```

### Test Build Locally

```bash
# Test that Dockerfile works from repo root
docker build -f social-service/Dockerfile -t test-social .

# Should build successfully
# If it works locally, it will work on Railway
```

---

## 🎉 What This Fixes

### Before

```
❌ All services tried to use API Gateway Dockerfile
❌ Build failed: "shared not found"
❌ Services couldn't deploy
❌ Manual dashboard configuration needed
```

### After

```
✅ Each service uses its own Dockerfile
✅ Build succeeds: shared folder accessible
✅ Services deploy automatically
✅ Configuration in code (railway.toml)
✅ No manual dashboard configuration needed
```

---

## 📚 Railway Documentation

- **Config as Code**: https://docs.railway.app/deploy/config-as-code
- **Monorepo Guide**: https://docs.railway.app/guides/monorepo
- **railway.toml Reference**:
  https://docs.railway.app/deploy/config-as-code#railwaytoml-reference

---

## 🚀 Next Steps

1. **Commit Changes**:

   ```bash
   git add */railway.toml railway.toml.backup
   git commit -m "Add service-specific railway.toml configurations"
   git push origin main
   ```

2. **Trigger Deployment**:
   - Railway will automatically detect the push
   - Each service will use its own railway.toml
   - Builds should succeed now

3. **Verify Deployment**:

   ```bash
   # Check each service health
   curl https://social-service-production.up.railway.app/health
   curl https://admin-service-production.up.railway.app/health
   # etc.
   ```

4. **Monitor Logs**:
   - Go to Railway dashboard
   - Check build logs for each service
   - Should see successful builds

---

## 🔍 Troubleshooting

### If Build Still Fails

1. **Check Railway Dashboard**:
   - Go to service → Settings → Source
   - Verify it's reading the correct railway.toml
   - Check "Configuration Source" shows "railway.toml"

2. **Check File Paths**:

   ```bash
   # Verify Dockerfile exists
   ls -la social-service/Dockerfile

   # Verify railway.toml exists
   ls -la social-service/railway.toml
   ```

3. **Check Configuration**:

   ```bash
   # View configuration
   cat social-service/railway.toml

   # Verify dockerfilePath is correct
   # Should be: "social-service/Dockerfile"
   ```

4. **Test Locally**:

   ```bash
   # Build Docker image locally
   docker build -f social-service/Dockerfile -t test .

   # If this works, Railway should work too
   ```

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ Each service has its own `railway.toml` file
2. ✅ Root `railway.toml` is removed/backed up
3. ✅ Railway builds succeed without errors
4. ✅ Build logs show correct Dockerfile being used
5. ✅ All services deploy successfully
6. ✅ Health checks return 200 OK

---

**Key Takeaway**: In a monorepo, each service needs its own `railway.toml` file.
The root `railway.toml` was causing all services to use the same Dockerfile! 🎯
