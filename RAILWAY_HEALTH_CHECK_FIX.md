# Railway Health Check Failing - Troubleshooting Guide

**Issue**: Service builds successfully but health check fails  
**Error**: `Attempt #1 failed with service unavailable`

---

## 🔍 How to Verify Which Service is Running

### Method 1: Check Railway Logs

In Railway dashboard → Service → Logs, look for:

```
Service initializing {
  "service": "social-service",  ← This tells you which service
  "port": 3001,
  "environment": "production"
}
```

### Method 2: Check Environment Variables

The Dockerfile now sets `SERVICE_NAME` environment variable:

```dockerfile
ENV SERVICE_NAME=social-service
ENV SERVICE_VERSION=1.0.0
```

In logs, you'll see:

```
Social service started successfully {
  "port": 3001,
  "service": "social-service"  ← Confirms it's the right service
}
```

### Method 3: Check Docker Labels

Each Dockerfile now has labels:

```dockerfile
LABEL service="social-service"
LABEL version="1.0.0"
LABEL port="3001"
```

---

## 🚨 Why Health Check is Failing

The service built successfully (9.24 seconds), but health check fails. This
means:

1. ✅ Dockerfile is correct
2. ✅ Build process works
3. ❌ Service isn't starting properly

**Most likely cause**: Missing environment variables

---

## ✅ Fix: Add Environment Variables

### Required Variables for Social Service

Go to Railway dashboard → social-service → Variables tab:

```bash
# Supabase (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT (REQUIRED)
JWT_SECRET=your_jwt_secret_here

# Node (REQUIRED)
NODE_ENV=production
PORT=3001

# Optional but recommended
LOG_LEVEL=info
SUPABASE_ANON_KEY=your_anon_key_here
JWT_EXPIRES_IN=7d
```

---

## 🔍 Check Railway Logs

### What to Look For

**If service is starting**:

```
✅ Service initializing
✅ Social service started successfully
✅ Listening on port 3001
```

**If service is failing**:

```
❌ Error: SUPABASE_URL is required
❌ Error: Cannot connect to database
❌ Error: Port 3001 is already in use
```

### How to Check Logs

1. Go to Railway dashboard
2. Click on "social-service"
3. Click "Logs" tab
4. Look for startup messages

---

## 🎯 Step-by-Step Fix

### Step 1: Add Environment Variables

In Railway dashboard → social-service → Variables:

1. Click "New Variable"
2. Add each variable:
   ```
   SUPABASE_URL = https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = your_key
   JWT_SECRET = your_secret
   NODE_ENV = production
   PORT = 3001
   ```

### Step 2: Redeploy

1. Click "Redeploy" button
2. Wait for build to complete
3. Watch logs for startup messages

### Step 3: Verify Health Check

Once deployed, test health endpoint:

```bash
curl https://your-service-url.railway.app/health
```

Should return:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "social-service",  ← Confirms it's the right service
    "timestamp": "2026-01-16T...",
    "uptime": 123.45,
    "version": "1.0.0",
    "database": "connected"
  }
}
```

---

## 🔧 Common Issues

### Issue 1: Missing SUPABASE_URL

**Logs show**:

```
Service initializing {
  "supabaseConfigured": false  ← Missing!
}
```

**Fix**: Add `SUPABASE_URL` environment variable

### Issue 2: Missing SUPABASE_SERVICE_ROLE_KEY

**Logs show**:

```
Service initializing {
  "serviceRoleConfigured": false  ← Missing!
}
```

**Fix**: Add `SUPABASE_SERVICE_ROLE_KEY` environment variable

### Issue 3: Port Already in Use

**Logs show**:

```
Error: listen EADDRINUSE: address already in use :::3001
```

**Fix**: Check if PORT environment variable is set correctly

### Issue 4: Database Connection Failed

**Logs show**:

```
Error: Failed to connect to database
```

**Fix**:

1. Verify SUPABASE_URL is correct
2. Verify SUPABASE_SERVICE_ROLE_KEY is correct
3. Check Supabase project is not paused

---

## 📊 Health Check Timeline

```
Build starts
  ↓ (9 seconds)
Build completes ✅
  ↓
Container starts
  ↓
Service initializes
  ↓ (should be < 10 seconds)
Service listens on port 3001
  ↓
Health check attempts
  ↓
Attempt #1: /health endpoint
  ↓
If service not ready: "service unavailable" ❌
If service ready: 200 OK ✅
```

**Current issue**: Service not ready when health check runs

**Likely cause**: Service crashes on startup due to missing env vars

---

## ✅ Verification Checklist

After adding environment variables:

- [ ] SUPABASE_URL is set
- [ ] SUPABASE_SERVICE_ROLE_KEY is set
- [ ] JWT_SECRET is set
- [ ] NODE_ENV=production
- [ ] PORT=3001
- [ ] Service redeployed
- [ ] Logs show "Service initializing"
- [ ] Logs show "Social service started successfully"
- [ ] Health check passes
- [ ] Can curl /health endpoint

---

## 🎯 Quick Fix Command

If you have Railway CLI:

```bash
cd social-service
railway link  # Link to social-service

# Add variables
railway variables --set SUPABASE_URL=your_url
railway variables --set SUPABASE_SERVICE_ROLE_KEY=your_key
railway variables --set JWT_SECRET=your_secret
railway variables --set NODE_ENV=production
railway variables --set PORT=3001

# Redeploy
railway up
```

---

## 📚 Next Steps

Once social-service is working:

1. ✅ Verify it's the correct service (check logs for "social-service")
2. ✅ Test health endpoint
3. ✅ Test API endpoints
4. ✅ Repeat for other services (admin, payment, etc.)

---

**Key Point**: The build succeeded, so the Dockerfile is correct. The health
check is failing because the service needs environment variables to start
properly! 🎯
