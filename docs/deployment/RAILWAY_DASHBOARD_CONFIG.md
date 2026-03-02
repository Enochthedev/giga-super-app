# Railway Dashboard Configuration Guide

**IMPORTANT**: This is the correct configuration to fix the "shared folder not
found" error.

---

## 🚨 The Problem

Railway was trying to build from the service subdirectory (e.g.,
`social-service/`), but the Dockerfile needs access to the parent directory to
copy the `shared/` folder.

**Error**: `"/shared": not found`

---

## ✅ The Solution

Configure Railway to:

1. **Build from monorepo root** (so it can access `shared/`)
2. **Use service-specific Dockerfile** (e.g., `social-service/Dockerfile`)
3. **Watch service-specific paths** (only rebuild when that service changes)

---

## 📋 Step-by-Step Configuration

### For Each Service in Railway Dashboard

Go to: https://railway.app/project/0455788a-bd06-4e71-ba98-5c82c2ea64b6

#### 1. Settings → General

**Service Name**: `social-service` (or appropriate service name)

#### 2. Settings → Build

**CRITICAL SETTINGS**:

```
Root Directory: [LEAVE EMPTY - DO NOT SET]
  ↑ This is the key! Empty = builds from repo root

Dockerfile Path: social-service/Dockerfile
  ↑ Path to Dockerfile relative to repo root

Watch Paths: social-service/**,shared/**
  ↑ Only rebuild when these paths change
```

**Why this works**:

- Empty Root Directory = Railway builds from repo root
- Repo root has access to both `shared/` and `social-service/`
- Dockerfile can successfully `COPY shared ./shared`

#### 3. Settings → Deploy

```
Health Check Path: /health
Health Check Timeout: 100
Restart Policy: ON_FAILURE
Max Retries: 10
```

#### 4. Variables

Add environment variables (see below for each service)

---

## 🎯 Configuration for Each Service

### 1. Social Service

**Settings → Build**:

```
Root Directory: [EMPTY]
Dockerfile Path: social-service/Dockerfile
Watch Paths: social-service/**,shared/**
```

**Variables**:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
LOG_LEVEL=info
PORT=3001
```

---

### 2. Admin Service

**Settings → Build**:

```
Root Directory: [EMPTY]
Dockerfile Path: admin-service/Dockerfile
Watch Paths: admin-service/**,shared/**
```

**Variables**:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
LOG_LEVEL=info
PORT=3002
```

---

### 3. Payment Queue Service

**Settings → Build**:

```
Root Directory: [EMPTY]
Dockerfile Path: payment-queue-service/Dockerfile
Watch Paths: payment-queue-service/**,shared/**
```

**Variables**:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
LOG_LEVEL=info
PORT=3003

# Payment-specific
PAYSTACK_SECRET_KEY=your_paystack_secret
STRIPE_SECRET_KEY=your_stripe_secret
REDIS_URL=redis://default:password@host:port
```

---

### 4. Search Service

**Settings → Build**:

```
Root Directory: [EMPTY]
Dockerfile Path: search-service/Dockerfile
Watch Paths: search-service/**,shared/**
```

**Variables**:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
LOG_LEVEL=info
PORT=3004

# Search-specific
ALGOLIA_APP_ID=your_algolia_app_id
ALGOLIA_API_KEY=your_algolia_api_key
```

---

### 5. Delivery Service

**Settings → Build**:

```
Root Directory: [EMPTY]
Dockerfile Path: delivery-service/Dockerfile
Watch Paths: delivery-service/**,shared/**
```

**Variables**:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
LOG_LEVEL=info
PORT=3005
```

---

### 6. Taxi Realtime Service

**Settings → Build**:

```
Root Directory: [EMPTY]
Dockerfile Path: taxi-realtime-service/Dockerfile
Watch Paths: taxi-realtime-service/**,shared/**
```

**Variables**:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
LOG_LEVEL=info
PORT=3006

# Taxi-specific
GOOGLE_MAPS_API_KEY=your_google_maps_key
REDIS_URL=redis://default:password@host:port
```

---

### 7. Notifications Service

**Settings → Build**:

```
Root Directory: [EMPTY]
Dockerfile Path: notifications-service/Dockerfile
Watch Paths: notifications-service/**,shared/**
```

**Variables**:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
LOG_LEVEL=info
PORT=3007

# Notifications-specific
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone
```

---

## 🔍 How to Verify Configuration

### Check Build Settings

1. Go to service in Railway dashboard
2. Click **Settings** → **Build**
3. Verify:
   - ✅ Root Directory is **EMPTY** (not set)
   - ✅ Dockerfile Path is `<service-name>/Dockerfile`
   - ✅ Watch Paths is `<service-name>/**,shared/**`

### Test Build

1. Click **Deploy** → **Redeploy**
2. Watch build logs
3. Should see:

   ```
   [builder 7/9] COPY shared ./shared
   ✅ Success

   [builder 8/9] COPY social-service ./social-service
   ✅ Success
   ```

---

## 🚨 Common Mistakes to Avoid

### ❌ WRONG: Setting Root Directory to service folder

```
Root Directory: social-service  ❌ DON'T DO THIS
Dockerfile Path: Dockerfile
```

**Problem**: Railway builds from `social-service/`, can't access `shared/`

### ❌ WRONG: Dockerfile path without service folder

```
Root Directory: [EMPTY]
Dockerfile Path: Dockerfile  ❌ WRONG
```

**Problem**: Railway looks for `Dockerfile` at root, but it's in
`social-service/`

### ✅ CORRECT: Empty root, full path to Dockerfile

```
Root Directory: [EMPTY]  ✅ CORRECT
Dockerfile Path: social-service/Dockerfile  ✅ CORRECT
Watch Paths: social-service/**,shared/**  ✅ CORRECT
```

**Why it works**:

- Builds from repo root (has access to everything)
- Uses correct Dockerfile
- Only rebuilds when relevant files change

---

## 🎯 Quick Checklist

For each service, verify:

- [ ] Root Directory is **EMPTY** (not set to service folder)
- [ ] Dockerfile Path is `<service-name>/Dockerfile`
- [ ] Watch Paths is `<service-name>/**,shared/**`
- [ ] Health Check Path is `/health`
- [ ] All environment variables are set
- [ ] PORT matches service (3001-3007)

---

## 🔧 If Build Still Fails

### Check Build Logs

Look for these lines in Railway build logs:

```bash
# Should see:
[builder 7/9] COPY shared ./shared
# If you see error here, Root Directory is wrong

[builder 8/9] COPY social-service ./social-service
# If you see error here, Dockerfile Path is wrong
```

### Verify File Structure

Railway should see this structure:

```
/ (repo root - this is where Railway builds from)
├── shared/
│   ├── config/
│   └── index.ts
├── social-service/
│   ├── Dockerfile
│   └── src/
├── admin-service/
│   ├── Dockerfile
│   └── src/
└── package.json
```

### Test Locally

```bash
# Test that Dockerfile works from repo root
cd /path/to/giga-super-app  # Go to repo root
docker build -f social-service/Dockerfile -t test-social .

# Should build successfully
# If it fails, Dockerfile needs fixing
# If it works, Railway configuration needs fixing
```

---

## 📚 Railway Documentation

- **Monorepo Guide**: https://docs.railway.app/guides/monorepo
- **Dockerfile Builds**: https://docs.railway.app/deploy/dockerfiles
- **Watch Paths**: https://docs.railway.app/deploy/builds#watch-paths

---

## ✅ After Configuration

Once all services are configured correctly:

1. **Trigger Deployment**:

   ```bash
   git commit --allow-empty -m "trigger rebuild"
   git push origin main
   ```

2. **Watch Build Logs** in Railway dashboard

3. **Verify Health Checks**:

   ```bash
   curl https://social-service-production.up.railway.app/health
   ```

4. **Update API Gateway** with service URLs

---

**Key Takeaway**: Leave Root Directory EMPTY so Railway builds from the monorepo
root, giving it access to both `shared/` and service folders! 🚀
