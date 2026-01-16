# Railway Dashboard Settings - Complete Guide

**What to fill in for each service in Railway dashboard**

---

## 🎯 Quick Answer

For each service, you need to configure:

1. **Source** → Connect to GitHub repo
2. **Build** → Set Dockerfile path and watch paths
3. **Deploy** → Set health check and restart policy
4. **Variables** → Add environment variables

---

## 📋 Step-by-Step for Each Service

### 1. Source Settings

**Source Repo**: `Enochthedev/giga-super-app` ✅ (Already connected)

**Root Directory**: **[LEAVE EMPTY]** ← CRITICAL!

**Branch**: `main` ✅

**Wait for CI**: ☐ Unchecked (optional - check if you want to wait for GitHub
Actions)

---

### 2. Build Settings

#### For Social Service:

```
Builder: Dockerfile (Automatically Detected) ✅

Dockerfile Path: social-service/Dockerfile

Watch Paths:
  - social-service/**
  - shared/**

Metal Build Environment: ☑ Enabled (faster builds)
```

#### For Admin Service:

```
Builder: Dockerfile

Dockerfile Path: admin-service/Dockerfile

Watch Paths:
  - admin-service/**
  - shared/**
```

#### For Payment Queue Service:

```
Builder: Dockerfile

Dockerfile Path: payment-queue-service/Dockerfile

Watch Paths:
  - payment-queue-service/**
  - shared/**
```

#### For Search Service:

```
Builder: Dockerfile

Dockerfile Path: search-service/Dockerfile

Watch Paths:
  - search-service/**
  - shared/**
```

#### For Delivery Service:

```
Builder: Dockerfile

Dockerfile Path: delivery-service/Dockerfile

Watch Paths:
  - delivery-service/**
  - shared/**
```

#### For Taxi Realtime Service:

```
Builder: Dockerfile

Dockerfile Path: taxi-realtime-service/Dockerfile

Watch Paths:
  - taxi-realtime-service/**
  - shared/**
```

#### For Notifications Service:

```
Builder: Dockerfile

Dockerfile Path: notifications-service/Dockerfile

Watch Paths:
  - notifications-service/**
  - shared/**
```

---

### 3. Deploy Settings

**For ALL services, use these settings**:

```
Custom Start Command: [LEAVE EMPTY]
  ↑ Dockerfile already has CMD

Region: Southeast Asia (Singapore) ✅
Replicas: 1

CPU: 8 vCPU (or adjust based on needs)
Memory: 8 GB (or adjust based on needs)

Healthcheck Path: /health

Serverless: ☐ Unchecked (keep containers running)

Restart Policy: On Failure
Max restart retries: 10
```

---

### 4. Config-as-code

**Railway Config File**:

```
Add File Path: <service-name>/railway.toml

Examples:
  - social-service/railway.toml
  - admin-service/railway.toml
  - payment-queue-service/railway.toml
  - etc.
```

This tells Railway to use the `railway.toml` file we created in each service
folder.

---

### 5. Variables (Environment Variables)

#### Common Variables (ALL services need these):

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
NODE_ENV=production
LOG_LEVEL=info
```

#### Service-Specific PORT:

```bash
# Social Service
PORT=3001

# Admin Service
PORT=3002

# Payment Queue Service
PORT=3003

# Search Service
PORT=3004

# Delivery Service
PORT=3005

# Taxi Realtime Service
PORT=3006

# Notifications Service
PORT=3007
```

#### Additional Variables by Service:

**Payment Queue Service** (add these extra):

```bash
PAYSTACK_SECRET_KEY=your_paystack_secret
STRIPE_SECRET_KEY=your_stripe_secret
REDIS_URL=redis://default:password@host:port
```

**Search Service** (add these extra):

```bash
ALGOLIA_APP_ID=your_algolia_app_id
ALGOLIA_API_KEY=your_algolia_api_key
```

**Taxi Realtime Service** (add these extra):

```bash
GOOGLE_MAPS_API_KEY=your_google_maps_key
REDIS_URL=redis://default:password@host:port
```

**Notifications Service** (add these extra):

```bash
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone
```

---

## 🎯 Complete Configuration Checklist

### Social Service

**Source**:

- [ ] Repo: `Enochthedev/giga-super-app`
- [ ] Root Directory: **[EMPTY]**
- [ ] Branch: `main`

**Build**:

- [ ] Dockerfile Path: `social-service/Dockerfile`
- [ ] Watch Paths: `social-service/**`, `shared/**`

**Deploy**:

- [ ] Healthcheck Path: `/health`
- [ ] Restart Policy: `On Failure`
- [ ] Max retries: `10`

**Config-as-code**:

- [ ] Railway Config File: `social-service/railway.toml`

**Variables**:

- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] JWT_SECRET
- [ ] JWT_EXPIRES_IN=7d
- [ ] NODE_ENV=production
- [ ] LOG_LEVEL=info
- [ ] PORT=3001

---

### Admin Service

**Source**:

- [ ] Repo: `Enochthedev/giga-super-app`
- [ ] Root Directory: **[EMPTY]**
- [ ] Branch: `main`

**Build**:

- [ ] Dockerfile Path: `admin-service/Dockerfile`
- [ ] Watch Paths: `admin-service/**`, `shared/**`

**Deploy**:

- [ ] Healthcheck Path: `/health`
- [ ] Restart Policy: `On Failure`
- [ ] Max retries: `10`

**Config-as-code**:

- [ ] Railway Config File: `admin-service/railway.toml`

**Variables**:

- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] JWT_SECRET
- [ ] JWT_EXPIRES_IN=7d
- [ ] NODE_ENV=production
- [ ] LOG_LEVEL=info
- [ ] PORT=3002

---

### Payment Queue Service

**Source**:

- [ ] Repo: `Enochthedev/giga-super-app`
- [ ] Root Directory: **[EMPTY]**
- [ ] Branch: `main`

**Build**:

- [ ] Dockerfile Path: `payment-queue-service/Dockerfile`
- [ ] Watch Paths: `payment-queue-service/**`, `shared/**`

**Deploy**:

- [ ] Healthcheck Path: `/health`
- [ ] Restart Policy: `On Failure`
- [ ] Max retries: `10`

**Config-as-code**:

- [ ] Railway Config File: `payment-queue-service/railway.toml`

**Variables**:

- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] JWT_SECRET
- [ ] JWT_EXPIRES_IN=7d
- [ ] NODE_ENV=production
- [ ] LOG_LEVEL=info
- [ ] PORT=3003
- [ ] PAYSTACK_SECRET_KEY
- [ ] STRIPE_SECRET_KEY
- [ ] REDIS_URL

---

### Search Service

**Source**:

- [ ] Repo: `Enochthedev/giga-super-app`
- [ ] Root Directory: **[EMPTY]**
- [ ] Branch: `main`

**Build**:

- [ ] Dockerfile Path: `search-service/Dockerfile`
- [ ] Watch Paths: `search-service/**`, `shared/**`

**Deploy**:

- [ ] Healthcheck Path: `/health`
- [ ] Restart Policy: `On Failure`
- [ ] Max retries: `10`

**Config-as-code**:

- [ ] Railway Config File: `search-service/railway.toml`

**Variables**:

- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] JWT_SECRET
- [ ] JWT_EXPIRES_IN=7d
- [ ] NODE_ENV=production
- [ ] LOG_LEVEL=info
- [ ] PORT=3004
- [ ] ALGOLIA_APP_ID
- [ ] ALGOLIA_API_KEY

---

### Delivery Service

**Source**:

- [ ] Repo: `Enochthedev/giga-super-app`
- [ ] Root Directory: **[EMPTY]**
- [ ] Branch: `main`

**Build**:

- [ ] Dockerfile Path: `delivery-service/Dockerfile`
- [ ] Watch Paths: `delivery-service/**`, `shared/**`

**Deploy**:

- [ ] Healthcheck Path: `/health`
- [ ] Restart Policy: `On Failure`
- [ ] Max retries: `10`

**Config-as-code**:

- [ ] Railway Config File: `delivery-service/railway.toml`

**Variables**:

- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] JWT_SECRET
- [ ] JWT_EXPIRES_IN=7d
- [ ] NODE_ENV=production
- [ ] LOG_LEVEL=info
- [ ] PORT=3005

---

### Taxi Realtime Service

**Source**:

- [ ] Repo: `Enochthedev/giga-super-app`
- [ ] Root Directory: **[EMPTY]**
- [ ] Branch: `main`

**Build**:

- [ ] Dockerfile Path: `taxi-realtime-service/Dockerfile`
- [ ] Watch Paths: `taxi-realtime-service/**`, `shared/**`

**Deploy**:

- [ ] Healthcheck Path: `/health`
- [ ] Restart Policy: `On Failure`
- [ ] Max retries: `10`

**Config-as-code**:

- [ ] Railway Config File: `taxi-realtime-service/railway.toml`

**Variables**:

- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] JWT_SECRET
- [ ] JWT_EXPIRES_IN=7d
- [ ] NODE_ENV=production
- [ ] LOG_LEVEL=info
- [ ] PORT=3006
- [ ] GOOGLE_MAPS_API_KEY
- [ ] REDIS_URL

---

### Notifications Service

**Source**:

- [ ] Repo: `Enochthedev/giga-super-app`
- [ ] Root Directory: **[EMPTY]**
- [ ] Branch: `main`

**Build**:

- [ ] Dockerfile Path: `notifications-service/Dockerfile`
- [ ] Watch Paths: `notifications-service/**`, `shared/**`

**Deploy**:

- [ ] Healthcheck Path: `/health`
- [ ] Restart Policy: `On Failure`
- [ ] Max retries: `10`

**Config-as-code**:

- [ ] Railway Config File: `notifications-service/railway.toml`

**Variables**:

- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] JWT_SECRET
- [ ] JWT_EXPIRES_IN=7d
- [ ] NODE_ENV=production
- [ ] LOG_LEVEL=info
- [ ] PORT=3007
- [ ] SENDGRID_API_KEY
- [ ] TWILIO_ACCOUNT_SID
- [ ] TWILIO_AUTH_TOKEN
- [ ] TWILIO_PHONE_NUMBER

---

## 🚨 Critical Settings

### ❌ DON'T Set These:

- **Root Directory**: Leave EMPTY (don't set to service folder)
- **Custom Start Command**: Leave EMPTY (Dockerfile has CMD)

### ✅ DO Set These:

- **Dockerfile Path**: Must include service folder name
- **Watch Paths**: Must include both service and shared folders
- **Healthcheck Path**: Must be `/health`
- **PORT**: Must match service port (3001-3007)

---

## 🎯 Quick Copy-Paste

### For Social Service:

```
Dockerfile Path: social-service/Dockerfile
Watch Paths: social-service/**,shared/**
Healthcheck Path: /health
Railway Config File: social-service/railway.toml
PORT: 3001
```

### For Admin Service:

```
Dockerfile Path: admin-service/Dockerfile
Watch Paths: admin-service/**,shared/**
Healthcheck Path: /health
Railway Config File: admin-service/railway.toml
PORT: 3002
```

### For Payment Queue Service:

```
Dockerfile Path: payment-queue-service/Dockerfile
Watch Paths: payment-queue-service/**,shared/**
Healthcheck Path: /health
Railway Config File: payment-queue-service/railway.toml
PORT: 3003
```

---

## ✅ After Configuration

Once all settings are configured:

1. Click **"Update"** or **"Save"** in Railway dashboard
2. Click **"Redeploy"** to trigger deployment
3. Watch build logs for success
4. Check health endpoint: `https://service-url/health`

---

**Key Point**: The most important setting is **Root Directory = EMPTY**. This
lets Railway build from the repo root where it can access both the service
folder and the `shared/` folder! 🎯
