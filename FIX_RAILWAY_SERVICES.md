# Fix Railway Services - Create Separate Services

## 🔴 The Problem

When you run `railway up` from `social-service/`, it's deploying to the existing
`giga-super-app` service instead of creating a new service.

**Why?** Railway CLI is still linked to `giga-super-app` from when you deployed
the API Gateway.

## ✅ The Solution

You need to create **separate Railway services** for each microservice.

---

## 🎯 Method 1: Using Railway Dashboard (Recommended)

### Step 1: Create Services in Dashboard

1. Go to https://railway.app/project/0455788a-bd06-4e71-ba98-5c82c2ea64b6

2. Click **"+ New"** button (top right)

3. Select **"Empty Service"**

4. Name it: `social-service`

5. Click **"Add Service"**

6. Repeat for all services:
   - `social-service`
   - `admin-service`
   - `payment-queue-service`
   - `search-service`
   - `delivery-service`
   - `taxi-realtime-service`
   - `notifications-service`

Now you have 8 services in Railway:

- `giga-super-app` (API Gateway) ✅
- `social-service` (empty, ready to deploy)
- `admin-service` (empty, ready to deploy)
- ... and so on

### Step 2: Deploy to Each Service

Now deploy to each service:

```bash
# Deploy social service
cd social-service

# Unlink from current service
railway unlink

# Link to social-service
railway link
# Select: social-service (from the list)

# Deploy
railway up

cd ..
```

Repeat for each service.

---

## 🎯 Method 2: Using Railway CLI Only

### Create and Deploy Each Service

```bash
# From project root
cd social-service

# Unlink from giga-super-app
railway unlink

# Create new service
railway service create social-service

# Link to it
railway service link social-service

# Deploy
railway up

cd ..
```

Repeat for each service.

---

## 🎯 Method 3: Using Updated Script

The `deploy-service.sh` script has been updated to handle this:

```bash
# It will:
# 1. Create a new Railway service
# 2. Link to it
# 3. Deploy

./deploy-service.sh social-service 3001
```

---

## 📋 Step-by-Step: Deploy Social Service Correctly

### 1. Create the Service in Railway

**Option A: Dashboard**

- Go to Railway dashboard
- Click "+ New" → "Empty Service"
- Name: `social-service`

**Option B: CLI**

```bash
railway service create social-service
```

### 2. Create Dockerfile

```bash
cat > social-service/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
RUN npm ci --include=dev --ignore-scripts
COPY shared ./shared
COPY social-service ./social-service
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "dist/social-service/src/index.js"]
EOF
```

### 3. Create railway.toml

```bash
cat > social-service/railway.toml << 'EOF'
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
numReplicas = 1
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
EOF
```

### 4. Link and Deploy

```bash
cd social-service

# Unlink from giga-super-app
railway unlink

# Link to social-service
railway link
# Choose: social-service

# Deploy
railway up

cd ..
```

### 5. Verify

```bash
# Check which service you're linked to
railway service

# Should show: social-service (not giga-super-app)

# Get the URL
railway domain

# Should show: https://social-service-production.up.railway.app
```

### 6. Test

```bash
# Wait for deployment to complete
sleep 30

# Test health endpoint
curl https://social-service-production.up.railway.app/health

# Should return social service health, NOT api-gateway
```

---

## 🔍 How to Check Which Service You're Deploying To

Before running `railway up`, always check:

```bash
# Check current service
railway service

# Should show the service name you want to deploy to
# If it shows "giga-super-app" but you want to deploy social-service,
# you need to unlink and link to the correct service
```

---

## 📊 Expected Railway Project Structure

After creating all services, your Railway project should look like:

```
Railway Project: Giga (0455788a-bd06-4e71-ba98-5c82c2ea64b6)
│
├─ giga-super-app
│  Status: Deployed ✅
│  URL: https://giga-super-app-production.up.railway.app
│  Dockerfile: Dockerfile (root)
│
├─ social-service
│  Status: Empty / Ready to deploy
│  Dockerfile: social-service/Dockerfile
│
├─ admin-service
│  Status: Empty / Ready to deploy
│  Dockerfile: admin-service/Dockerfile
│
├─ payment-queue-service
│  Status: Empty / Ready to deploy
│  Dockerfile: payment-queue-service/Dockerfile
│
├─ search-service
│  Status: Empty / Ready to deploy
│  Dockerfile: search-service/Dockerfile
│
├─ delivery-service
│  Status: Empty / Ready to deploy
│  Dockerfile: delivery-service/Dockerfile
│
├─ taxi-realtime-service
│  Status: Empty / Ready to deploy
│  Dockerfile: taxi-realtime-service/Dockerfile
│
└─ notifications-service
   Status: Empty / Ready to deploy
   Dockerfile: notifications-service/Dockerfile
```

---

## ✅ Checklist for Each Service

- [ ] Create service in Railway (dashboard or CLI)
- [ ] Create Dockerfile in service directory
- [ ] Create railway.toml in service directory
- [ ] Unlink from current service (`railway unlink`)
- [ ] Link to new service (`railway link`)
- [ ] Verify correct service (`railway service`)
- [ ] Deploy (`railway up`)
- [ ] Get URL (`railway domain`)
- [ ] Test health endpoint
- [ ] Update API Gateway environment variable

---

## 🎯 Quick Commands

```bash
# Create all services at once (in Railway dashboard)
# Or use CLI:

railway service create social-service
railway service create admin-service
railway service create payment-queue-service
railway service create search-service
railway service create delivery-service
railway service create taxi-realtime-service
railway service create notifications-service

# Then deploy each one:

cd social-service && railway unlink && railway link && railway up && cd ..
cd admin-service && railway unlink && railway link && railway up && cd ..
cd payment-queue-service && railway unlink && railway link && railway up && cd ..
cd search-service && railway unlink && railway link && railway up && cd ..
cd delivery-service && railway unlink && railway link && railway up && cd ..
cd taxi-realtime-service && railway unlink && railway link && railway up && cd ..
cd notifications-service && railway unlink && railway link && railway up && cd ..
```

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Not Creating Service First

```bash
cd social-service
railway up  # ❌ Deploys to giga-super-app
```

### ✅ Correct:

```bash
railway service create social-service  # Create first
cd social-service
railway link  # Link to it
railway up  # Now deploys to social-service
```

### ❌ Mistake 2: Not Unlinking

```bash
cd social-service
railway link  # Still linked to giga-super-app
railway up  # ❌ Deploys to giga-super-app
```

### ✅ Correct:

```bash
cd social-service
railway unlink  # Unlink first
railway link  # Then link to correct service
railway up  # Now deploys correctly
```

---

## 🎉 Summary

**The key insight**: Railway CLI maintains a link to a specific service. You
must:

1. **Create** a new service (dashboard or CLI)
2. **Unlink** from current service
3. **Link** to the new service
4. **Deploy** to the new service

Each service directory should be linked to its corresponding Railway service.
