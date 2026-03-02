# Deploy All Services to Railway - Complete Guide

**Date**: January 16, 2026  
**Current Status**: API Gateway deployed ✅  
**Remaining**: 7 services to deploy

---

## 🎯 Overview

### What We're Deploying

1. ✅ **API Gateway** (Port 3000) - Already deployed
2. 🚀 **Social Service** (Port 3001) - Ready to deploy
3. 🚀 **Admin Service** (Port 3002) - Ready to deploy
4. 🚀 **Payment Queue Service** (Port 3003) - Ready to deploy
5. 🚀 **Search Service** (Port 3004) - Ready to deploy
6. 🚀 **Delivery Service** (Port 3005) - Ready to deploy
7. 🚀 **Taxi Realtime Service** (Port 3006) - Ready to deploy
8. 🚀 **Notifications Service** (Port 3007) - Ready to deploy

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Railway)                    │
│              https://giga-super-app.railway.app              │
│                         Port 3000                            │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│   Railway    │      │   Railway    │     │   Supabase   │
│   Services   │      │   Services   │     │   Functions  │
│              │      │              │     │              │
│ • Social     │      │ • Delivery   │     │ • Hotels     │
│ • Admin      │      │ • Taxi RT    │     │ • Rides      │
│ • Payment    │      │ • Notifs     │     │ • Users      │
│ • Search     │      │              │     │ • Calls      │
└──────────────┘      └──────────────┘     └──────────────┘
```

---

## 📋 Prerequisites

### 1. Railway CLI Installed

```bash
# Check if installed
railway --version

# If not installed
brew install railway  # macOS
# or
npm install -g @railway/cli
```

### 2. Railway Account & Project

```bash
# Login
railway login

# Link to existing project
railway link 0455788a-bd06-4e71-ba98-5c82c2ea64b6
```

### 3. Environment Variables Ready

All environment variables are already set in Railway for the main service. We'll
need to create separate services for each microservice.

---

## 🚀 Deployment Strategy

### Option 1: Multi-Service Deployment (Recommended)

Create separate Railway services for each microservice. This gives:

- Independent scaling
- Isolated logs and monitoring
- Better resource allocation
- Independent deployments

### Option 2: Monorepo Deployment (Current)

Use the existing Dockerfile that builds all services. This is simpler but less
flexible.

**We'll use Option 1 for production-grade deployment.**

---

## 📦 Step-by-Step Deployment

### Step 1: Create Individual Dockerfiles

Each service needs its own Dockerfile for independent deployment.

#### Social Service Dockerfile

```bash
# Create Dockerfile for social service
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

#### Admin Service Dockerfile

```bash
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
```

#### Payment Queue Service Dockerfile

```bash
cat > payment-queue-service/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
RUN npm ci --include=dev --ignore-scripts
COPY shared ./shared
COPY payment-queue-service ./payment-queue-service
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
ENV NODE_ENV=production
ENV PORT=3003
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "dist/payment-queue-service/src/index.js"]
EOF
```

#### Search Service Dockerfile

```bash
cat > search-service/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
RUN npm ci --include=dev --ignore-scripts
COPY shared ./shared
COPY search-service ./search-service
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
ENV NODE_ENV=production
ENV PORT=3004
EXPOSE 3004
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "dist/search-service/src/index.js"]
EOF
```

#### Delivery Service Dockerfile

```bash
cat > delivery-service/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
RUN npm ci --include=dev --ignore-scripts
COPY shared ./shared
COPY delivery-service ./delivery-service
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
ENV NODE_ENV=production
ENV PORT=3005
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "dist/delivery-service/src/index.js"]
EOF
```

#### Taxi Realtime Service Dockerfile

```bash
cat > taxi-realtime-service/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
RUN npm ci --include=dev --ignore-scripts
COPY shared ./shared
COPY taxi-realtime-service ./taxi-realtime-service
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
ENV NODE_ENV=production
ENV PORT=3006
EXPOSE 3006
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3006/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "dist/taxi-realtime-service/src/index.js"]
EOF
```

#### Notifications Service Dockerfile

```bash
cat > notifications-service/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
RUN npm ci --include=dev --ignore-scripts
COPY shared ./shared
COPY notifications-service ./notifications-service
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
ENV NODE_ENV=production
ENV PORT=3007
EXPOSE 3007
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3007/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "dist/notifications-service/src/index.js"]
EOF
```

### Step 2: Create Railway Configuration Files

Each service needs a `railway.toml` file:

```bash
# Create railway.toml for each service
for service in social-service admin-service payment-queue-service search-service delivery-service taxi-realtime-service notifications-service; do
  cat > $service/railway.toml << EOF
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
done
```

### Step 3: Deploy Services to Railway

Now we'll deploy each service. Railway will create a new service for each
deployment.

#### Deploy Social Service

```bash
cd social-service
railway up --service social-service
cd ..
```

#### Deploy Admin Service

```bash
cd admin-service
railway up --service admin-service
cd ..
```

#### Deploy Payment Queue Service

```bash
cd payment-queue-service
railway up --service payment-queue-service
cd ..
```

#### Deploy Search Service

```bash
cd search-service
railway up --service search-service
cd ..
```

#### Deploy Delivery Service

```bash
cd delivery-service
railway up --service delivery-service
cd ..
```

#### Deploy Taxi Realtime Service

```bash
cd taxi-realtime-service
railway up --service taxi-realtime-service
cd ..
```

#### Deploy Notifications Service

```bash
cd notifications-service
railway up --service notifications-service
cd ..
```

### Step 4: Get Service URLs

After deployment, get the URLs for each service:

```bash
# List all services
railway service list

# Get domain for each service
railway domain --service social-service
railway domain --service admin-service
railway domain --service payment-queue-service
railway domain --service search-service
railway domain --service delivery-service
railway domain --service taxi-realtime-service
railway domain --service notifications-service
```

### Step 5: Update API Gateway Configuration

Update the API Gateway environment variables with the new service URLs:

```bash
# Set service URLs in API Gateway
railway variables --service giga-super-app --set "SOCIAL_SERVICE_URL=https://social-service-production.up.railway.app"
railway variables --service giga-super-app --set "ADMIN_SERVICE_URL=https://admin-service-production.up.railway.app"
railway variables --service giga-super-app --set "PAYMENT_QUEUE_SERVICE_URL=https://payment-queue-service-production.up.railway.app"
railway variables --service giga-super-app --set "SEARCH_SERVICE_URL=https://search-service-production.up.railway.app"
railway variables --service giga-super-app --set "DELIVERY_SERVICE_URL=https://delivery-service-production.up.railway.app"
railway variables --service giga-super-app --set "TAXI_REALTIME_SERVICE_URL=https://taxi-realtime-service-production.up.railway.app"
railway variables --service giga-super-app --set "NOTIFICATIONS_SERVICE_URL=https://notifications-service-production.up.railway.app"
```

### Step 6: Set Environment Variables for Each Service

Each service needs database and other environment variables:

```bash
# Function to set common env vars for a service
set_service_env() {
  local service=$1
  railway variables --service $service --set "SUPABASE_URL=$SUPABASE_URL"
  railway variables --service $service --set "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
  railway variables --service $service --set "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY"
  railway variables --service $service --set "JWT_SECRET=$JWT_SECRET"
  railway variables --service $service --set "NODE_ENV=production"
  railway variables --service $service --set "LOG_LEVEL=info"
}

# Set for all services
set_service_env "social-service"
set_service_env "admin-service"
set_service_env "payment-queue-service"
set_service_env "search-service"
set_service_env "delivery-service"
set_service_env "taxi-realtime-service"
set_service_env "notifications-service"
```

### Step 7: Add Redis for Services That Need It

Payment Queue and Notifications services need Redis:

```bash
# In Railway dashboard:
# 1. Go to your project
# 2. Click "New" → "Database" → "Add Redis"
# 3. Link Redis to payment-queue-service and notifications-service
# 4. Railway will automatically set REDIS_URL variable
```

---

## 🧪 Testing Deployment

### Test Each Service Health Endpoint

```bash
# Test all services
curl https://giga-super-app-production.up.railway.app/health
curl https://social-service-production.up.railway.app/health
curl https://admin-service-production.up.railway.app/health
curl https://payment-queue-service-production.up.railway.app/health
curl https://search-service-production.up.railway.app/health
curl https://delivery-service-production.up.railway.app/health
curl https://taxi-realtime-service-production.up.railway.app/health
curl https://notifications-service-production.up.railway.app/health
```

### Test API Gateway Routing

```bash
# Test routing through API Gateway
curl https://giga-super-app-production.up.railway.app/api/v1/social/health
curl https://giga-super-app-production.up.railway.app/api/v1/admin/health
curl https://giga-super-app-production.up.railway.app/api/v1/payments/health
```

---

## 📊 Monitoring

### View Logs for All Services

```bash
# View logs for specific service
railway logs --service social-service
railway logs --service admin-service
railway logs --service payment-queue-service
```

### Monitor Resource Usage

Check Railway dashboard for:

- CPU usage
- Memory usage
- Request count
- Error rates
- Response times

---

## 🔧 Troubleshooting

### Service Won't Start

1. Check logs: `railway logs --service <service-name>`
2. Verify environment variables: `railway variables --service <service-name>`
3. Check health endpoint locally:
   `docker build -t test . && docker run -p 3001:3001 test`

### Database Connection Issues

1. Verify SUPABASE_URL is set correctly
2. Check SUPABASE_SERVICE_ROLE_KEY is valid
3. Test connection from local machine
4. Check Supabase project is active

### Redis Connection Issues

1. Verify Redis is provisioned in Railway
2. Check Redis is linked to the service
3. Verify REDIS_URL environment variable is set

---

## 📝 Post-Deployment Checklist

- [ ] All 8 services deployed to Railway
- [ ] All health checks passing
- [ ] API Gateway routing configured
- [ ] Service URLs updated in API Gateway
- [ ] Redis provisioned and linked
- [ ] Environment variables set for all services
- [ ] Payment webhooks updated (Paystack, Stripe)
- [ ] Monitoring and alerts configured
- [ ] Documentation updated
- [ ] Team notified of new URLs

---

## 🎯 Next Steps

1. **Update Payment Webhooks**: Update Paystack and Stripe webhook URLs
2. **Update Client Apps**: Point mobile/web apps to new API Gateway URL
3. **Monitor for 24 Hours**: Watch logs and error rates closely
4. **Gradual Traffic Shift**: Use Railway's traffic splitting if needed
5. **Deprecate Supabase Functions**: After successful migration

---

## 💡 Tips

- Deploy during low-traffic hours
- Keep Supabase functions active as fallback
- Use Railway's preview environments for testing
- Monitor error rates closely for first 48 hours
- Have rollback plan ready

---

**Ready to deploy all services!** 🚀
