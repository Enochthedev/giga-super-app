# Railway Separate Deployments - Step by Step Guide

**Strategy**: Deploy each service as a separate Railway service with its own URL

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Railway Project: Giga                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Service 1: api-gateway (Port 3000) ✅ DEPLOYED             │
│  URL: https://giga-super-app-production.up.railway.app      │
│                                                              │
│  Service 2: social-service (Port 3001) 🚀 TO DEPLOY         │
│  URL: https://social-service-production.up.railway.app      │
│                                                              │
│  Service 3: admin-service (Port 3002) 🚀 TO DEPLOY          │
│  URL: https://admin-service-production.up.railway.app       │
│                                                              │
│  Service 4: payment-queue-service (Port 3003) 🚀 TO DEPLOY  │
│  URL: https://payment-queue-production.up.railway.app       │
│                                                              │
│  Service 5: search-service (Port 3004) 🚀 TO DEPLOY         │
│  URL: https://search-service-production.up.railway.app      │
│                                                              │
│  Service 6: delivery-service (Port 3005) 🚀 TO DEPLOY       │
│  URL: https://delivery-service-production.up.railway.app    │
│                                                              │
│  Service 7: taxi-realtime-service (Port 3006) 🚀 TO DEPLOY  │
│  URL: https://taxi-realtime-production.up.railway.app       │
│                                                              │
│  Service 8: notifications-service (Port 3007) 🚀 TO DEPLOY  │
│  URL: https://notifications-production.up.railway.app       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Step-by-Step Deployment

### Step 1: Create Dockerfile for Social Service

```bash
cat > social-service/Dockerfile << 'EOF'
# Multi-stage build for Social Service
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Install dependencies
RUN npm ci --include=dev --ignore-scripts

# Copy source code
COPY shared ./shared
COPY social-service ./social-service

# Build
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service
CMD ["node", "dist/social-service/src/index.js"]
EOF
```

### Step 2: Create railway.toml for Social Service

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

### Step 3: Test Build Locally

```bash
# Build the Docker image
docker build -t social-service:test -f social-service/Dockerfile .

# Test run locally
docker run -p 3001:3001 \
  -e SUPABASE_URL=$SUPABASE_URL \
  -e SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
  -e JWT_SECRET=$JWT_SECRET \
  social-service:test

# In another terminal, test health endpoint
curl http://localhost:3001/health
```

### Step 4: Create New Railway Service for Social Service

**Option A: Using Railway Dashboard (Recommended for beginners)**

1. Go to https://railway.app/project/0455788a-bd06-4e71-ba98-5c82c2ea64b6
2. Click "New Service"
3. Select "GitHub Repo"
4. Choose your repository
5. Name it: `social-service`
6. Set root directory: `social-service` (if Railway asks)
7. Railway will detect the Dockerfile automatically

**Option B: Using Railway CLI**

```bash
# Create new service in the same project
railway service create social-service

# Link to the service
railway service link social-service

# Deploy from social-service directory
cd social-service
railway up
cd ..
```

### Step 5: Set Environment Variables for Social Service

```bash
# Set environment variables for social service
railway variables --service social-service --set "SUPABASE_URL=$SUPABASE_URL"
railway variables --service social-service --set "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
railway variables --service social-service --set "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY"
railway variables --service social-service --set "JWT_SECRET=$JWT_SECRET"
railway variables --service social-service --set "NODE_ENV=production"
railway variables --service social-service --set "LOG_LEVEL=info"
railway variables --service social-service --set "PORT=3001"
```

### Step 6: Get Social Service URL

```bash
# Get the public URL
railway domain --service social-service

# Example output: https://social-service-production.up.railway.app
```

### Step 7: Test Social Service

```bash
# Test health endpoint
curl https://social-service-production.up.railway.app/health

# Should return:
# {"success":true,"data":{"status":"healthy","service":"social-service",...}}
```

### Step 8: Update API Gateway with Social Service URL

```bash
# Set the social service URL in API Gateway
railway variables --service giga-super-app --set "SOCIAL_SERVICE_URL=https://social-service-production.up.railway.app"

# Restart API Gateway to pick up new environment variable
railway restart --service giga-super-app
```

### Step 9: Test Routing Through API Gateway

```bash
# Test that API Gateway can route to social service
curl https://giga-super-app-production.up.railway.app/api/v1/social/health

# Should return the same health response
```

---

## 🔄 Repeat for All Services

Now repeat Steps 1-9 for each remaining service:

### Admin Service (Port 3002)

```bash
# 1. Create Dockerfile
cat > admin-service/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
RUN npm ci --include=dev --ignore-scripts
COPY shared ./shared
COPY admin-service ./admin-service
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
ENV NODE_ENV=production
ENV PORT=3002
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "dist/admin-service/src/index.js"]
EOF

# 2. Create railway.toml
cat > admin-service/railway.toml << 'EOF'
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

# 3. Test locally
docker build -t admin-service:test -f admin-service/Dockerfile .

# 4. Create Railway service
railway service create admin-service

# 5. Deploy
cd admin-service
railway up --service admin-service
cd ..

# 6. Set environment variables
railway variables --service admin-service --set "SUPABASE_URL=$SUPABASE_URL"
railway variables --service admin-service --set "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY"
railway variables --service admin-service --set "JWT_SECRET=$JWT_SECRET"
railway variables --service admin-service --set "NODE_ENV=production"
railway variables --service admin-service --set "PORT=3002"

# 7. Get URL
railway domain --service admin-service

# 8. Update API Gateway
railway variables --service giga-super-app --set "ADMIN_SERVICE_URL=https://admin-service-production.up.railway.app"
```

### Payment Queue Service (Port 3003)

```bash
# Same pattern as above, change:
# - Service name: payment-queue-service
# - Port: 3003
# - Additional env vars: PAYSTACK_SECRET_KEY, STRIPE_SECRET_KEY
# - Need Redis: Provision in Railway dashboard and link to this service
```

### Search Service (Port 3004)

```bash
# Same pattern, Port 3004
```

### Delivery Service (Port 3005)

```bash
# Same pattern, Port 3005
```

### Taxi Realtime Service (Port 3006)

```bash
# Same pattern, Port 3006
```

### Notifications Service (Port 3007)

```bash
# Same pattern, Port 3007
# Need Redis: Provision in Railway dashboard and link to this service
# Additional env vars: SENDGRID_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
```

---

## 🎯 Quick Deployment Script (Fixed for macOS)

Here's a simpler script that works on macOS:

```bash
#!/bin/bash

# Deploy a single service to Railway
# Usage: ./deploy-service.sh <service-name> <port>

SERVICE_NAME=$1
PORT=$2

if [ -z "$SERVICE_NAME" ] || [ -z "$PORT" ]; then
  echo "Usage: ./deploy-service.sh <service-name> <port>"
  echo "Example: ./deploy-service.sh social-service 3001"
  exit 1
fi

echo "🚀 Deploying $SERVICE_NAME on port $PORT..."

# Create Dockerfile
cat > ${SERVICE_NAME}/Dockerfile << EOF
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
RUN npm ci --include=dev --ignore-scripts
COPY shared ./shared
COPY ${SERVICE_NAME} ./${SERVICE_NAME}
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
ENV NODE_ENV=production
ENV PORT=${PORT}
EXPOSE ${PORT}
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "dist/${SERVICE_NAME}/src/index.js"]
EOF

# Create railway.toml
cat > ${SERVICE_NAME}/railway.toml << 'EOF'
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

echo "✅ Created Dockerfile and railway.toml"

# Test build locally
echo "🔨 Testing build locally..."
docker build -t ${SERVICE_NAME}:test -f ${SERVICE_NAME}/Dockerfile .

if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed"
  exit 1
fi

# Create Railway service
echo "📦 Creating Railway service..."
railway service create ${SERVICE_NAME}

# Deploy
echo "🚀 Deploying to Railway..."
cd ${SERVICE_NAME}
railway up --service ${SERVICE_NAME}
cd ..

# Set environment variables
echo "🔧 Setting environment variables..."
railway variables --service ${SERVICE_NAME} --set "SUPABASE_URL=$SUPABASE_URL"
railway variables --service ${SERVICE_NAME} --set "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
railway variables --service ${SERVICE_NAME} --set "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY"
railway variables --service ${SERVICE_NAME} --set "JWT_SECRET=$JWT_SECRET"
railway variables --service ${SERVICE_NAME} --set "NODE_ENV=production"
railway variables --service ${SERVICE_NAME} --set "LOG_LEVEL=info"
railway variables --service ${SERVICE_NAME} --set "PORT=${PORT}"

# Get URL
echo "🌐 Getting service URL..."
SERVICE_URL=$(railway domain --service ${SERVICE_NAME} 2>/dev/null | grep "https://" || echo "")

if [ -n "$SERVICE_URL" ]; then
  echo "✅ Service deployed: $SERVICE_URL"

  # Test health endpoint
  echo "🧪 Testing health endpoint..."
  sleep 10  # Wait for service to start
  curl -s $SERVICE_URL/health | jq
else
  echo "⚠️  URL not available yet"
fi

echo "✅ Deployment complete!"
```

Save this as `deploy-service.sh` and use it:

```bash
chmod +x deploy-service.sh

# Deploy each service
./deploy-service.sh social-service 3001
./deploy-service.sh admin-service 3002
./deploy-service.sh payment-queue-service 3003
./deploy-service.sh search-service 3004
./deploy-service.sh delivery-service 3005
./deploy-service.sh taxi-realtime-service 3006
./deploy-service.sh notifications-service 3007
```

---

## 📊 After All Services Are Deployed

### Update API Gateway with All Service URLs

```bash
# Get all service URLs
railway domain --service social-service
railway domain --service admin-service
railway domain --service payment-queue-service
railway domain --service search-service
railway domain --service delivery-service
railway domain --service taxi-realtime-service
railway domain --service notifications-service

# Set them in API Gateway
railway variables --service giga-super-app --set "SOCIAL_SERVICE_URL=https://social-service-production.up.railway.app"
railway variables --service giga-super-app --set "ADMIN_SERVICE_URL=https://admin-service-production.up.railway.app"
railway variables --service giga-super-app --set "PAYMENT_QUEUE_SERVICE_URL=https://payment-queue-production.up.railway.app"
railway variables --service giga-super-app --set "SEARCH_SERVICE_URL=https://search-service-production.up.railway.app"
railway variables --service giga-super-app --set "DELIVERY_SERVICE_URL=https://delivery-service-production.up.railway.app"
railway variables --service giga-super-app --set "TAXI_REALTIME_SERVICE_URL=https://taxi-realtime-production.up.railway.app"
railway variables --service giga-super-app --set "NOTIFICATIONS_SERVICE_URL=https://notifications-production.up.railway.app"

# Restart API Gateway
railway restart --service giga-super-app
```

### Test All Routes Through API Gateway

```bash
curl https://giga-super-app-production.up.railway.app/api/v1/social/health
curl https://giga-super-app-production.up.railway.app/api/v1/admin/health
curl https://giga-super-app-production.up.railway.app/api/v1/payments/health
curl https://giga-super-app-production.up.railway.app/api/v1/search/health
curl https://giga-super-app-production.up.railway.app/api/v1/delivery/health
curl https://giga-super-app-production.up.railway.app/api/v1/taxi/health
curl https://giga-super-app-production.up.railway.app/api/v1/notifications/health
```

---

## ✅ Benefits of Separate Services

1. **Independent Scaling** - Scale each service based on its needs
2. **Independent Deployments** - Deploy one service without affecting others
3. **Isolated Failures** - If one service fails, others keep running
4. **Clear Monitoring** - See metrics for each service separately
5. **Cost Optimization** - Pay only for what each service uses

---

## 🎯 Summary

**Current State**:

- ✅ API Gateway deployed (giga-super-app)

**To Deploy** (7 services):

1. social-service (Port 3001)
2. admin-service (Port 3002)
3. payment-queue-service (Port 3003)
4. search-service (Port 3004)
5. delivery-service (Port 3005)
6. taxi-realtime-service (Port 3006)
7. notifications-service (Port 3007)

**Strategy**:

- Each service = Separate Railway service
- Each service has its own URL
- API Gateway routes to each service
- All services in the same Railway project

**Next Step**: Start with social-service using the steps above!
