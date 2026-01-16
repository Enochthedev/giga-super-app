# START HERE - Deploy Your Services

**You're right!** Each service should be a separate Railway deployment. Here's
how to do it:

---

## 🎯 The Strategy

```
Railway Project: Giga
├── Service 1: giga-super-app (API Gateway) ✅ DEPLOYED
├── Service 2: social-service 🚀 TO DEPLOY
├── Service 3: admin-service 🚀 TO DEPLOY
├── Service 4: payment-queue-service 🚀 TO DEPLOY
├── Service 5: search-service 🚀 TO DEPLOY
├── Service 6: delivery-service 🚀 TO DEPLOY
├── Service 7: taxi-realtime-service 🚀 TO DEPLOY
└── Service 8: notifications-service 🚀 TO DEPLOY
```

Each service gets its own:

- Dockerfile
- Railway deployment
- Public URL
- Environment variables
- Logs and monitoring

The API Gateway routes requests to each service.

---

## 🚀 Quick Start - Deploy One Service

### Step 1: Deploy Social Service

```bash
./deploy-service.sh social-service 3001
```

This script will:

1. Create Dockerfile for social-service
2. Create railway.toml
3. Test build locally (optional)
4. Deploy to Railway
5. Set environment variables
6. Get the service URL
7. Test health endpoint

### Step 2: Update API Gateway

After deployment, you'll get a URL like:
`https://social-service-production.up.railway.app`

Update the API Gateway:

```bash
railway variables --service giga-super-app --set "SOCIAL_SERVICE_URL=https://social-service-production.up.railway.app"

# Restart API Gateway
railway restart --service giga-super-app
```

### Step 3: Test Routing

```bash
# Test direct access
curl https://social-service-production.up.railway.app/health

# Test through API Gateway
curl https://giga-super-app-production.up.railway.app/api/v1/social/health
```

---

## 📋 Deploy All Services (One by One)

Deploy each service using the same pattern:

```bash
# 1. Social Service
./deploy-service.sh social-service 3001

# 2. Admin Service
./deploy-service.sh admin-service 3002

# 3. Payment Queue Service
./deploy-service.sh payment-queue-service 3003

# 4. Search Service
./deploy-service.sh search-service 3004

# 5. Delivery Service
./deploy-service.sh delivery-service 3005

# 6. Taxi Realtime Service
./deploy-service.sh taxi-realtime-service 3006

# 7. Notifications Service
./deploy-service.sh notifications-service 3007
```

After each deployment, update the API Gateway with the new service URL.

---

## 🔧 Manual Deployment (If You Prefer)

### For Social Service:

#### 1. Create Dockerfile

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

#### 2. Create railway.toml

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

#### 3. Test Build

```bash
docker build -t social-service:test -f social-service/Dockerfile .
```

#### 4. Deploy to Railway

```bash
cd social-service
railway up
cd ..
```

#### 5. Set Environment Variables

```bash
railway variables --set "SUPABASE_URL=$SUPABASE_URL"
railway variables --set "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY"
railway variables --set "JWT_SECRET=$JWT_SECRET"
railway variables --set "NODE_ENV=production"
railway variables --set "PORT=3001"
```

#### 6. Get URL and Test

```bash
railway domain
curl https://social-service-production.up.railway.app/health
```

---

## 📊 After All Services Are Deployed

### Update API Gateway with All URLs

```bash
# Get all URLs first
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

### Test All Routes

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

## 🎯 Why Separate Services?

✅ **Independent Scaling** - Scale social service without affecting payment
service  
✅ **Independent Deployments** - Deploy admin service without redeploying
everything  
✅ **Isolated Failures** - If search service crashes, others keep running  
✅ **Clear Monitoring** - See CPU/memory for each service separately  
✅ **Cost Optimization** - Pay based on each service's actual usage

---

## 📚 More Details

- **RAILWAY_SEPARATE_DEPLOYMENTS_GUIDE.md** - Complete step-by-step guide
- **deploy-service.sh** - Automated deployment script for one service

---

## 🚀 Ready to Start?

```bash
# Deploy your first service
./deploy-service.sh social-service 3001
```

Then repeat for the other 6 services!
