# GitHub-Based Deployment Guide

**Best Practice**: Let Railway watch your GitHub repo and auto-deploy services
based on file changes.

---

## 🎯 Strategy Overview

```
GitHub Repo (main branch)
    ↓ (push)
Railway watches specific paths
    ↓
Auto-deploys the right service
```

### Benefits

- ✅ No CLI linking needed
- ✅ Automatic deployments on git push
- ✅ Each service watches its own folder
- ✅ Clean separation
- ✅ Easy rollbacks via GitHub
- ✅ CI/CD built-in

---

## 📋 Step-by-Step Setup

### Step 1: Create All Services in Railway Dashboard

1. Go to https://railway.app/project/0455788a-bd06-4e71-ba98-5c82c2ea64b6

2. For each service, click **"+ New"** → **"GitHub Repo"**

3. Select your repository: `giga`

4. Configure each service:

#### Service 1: social-service

- **Name**: `social-service`
- **Root Directory**: Leave empty (monorepo)
- **Dockerfile Path**: `social-service/Dockerfile`
- **Watch Paths**: `social-service/**`, `shared/**`

#### Service 2: admin-service

- **Name**: `admin-service`
- **Root Directory**: Leave empty
- **Dockerfile Path**: `admin-service/Dockerfile`
- **Watch Paths**: `admin-service/**`, `shared/**`

#### Service 3: payment-queue-service

- **Name**: `payment-queue-service`
- **Root Directory**: Leave empty
- **Dockerfile Path**: `payment-queue-service/Dockerfile`
- **Watch Paths**: `payment-queue-service/**`, `shared/**`

#### Service 4: search-service

- **Name**: `search-service`
- **Root Directory**: Leave empty
- **Dockerfile Path**: `search-service/Dockerfile`
- **Watch Paths**: `search-service/**`, `shared/**`

#### Service 5: delivery-service

- **Name**: `delivery-service`
- **Root Directory**: Leave empty
- **Dockerfile Path**: `delivery-service/Dockerfile`
- **Watch Paths**: `delivery-service/**`, `shared/**`

#### Service 6: taxi-realtime-service

- **Name**: `taxi-realtime-service`
- **Root Directory**: Leave empty
- **Dockerfile Path**: `taxi-realtime-service/Dockerfile`
- **Watch Paths**: `taxi-realtime-service/**`, `shared/**`

#### Service 7: notifications-service

- **Name**: `notifications-service`
- **Root Directory**: Leave empty
- **Dockerfile Path**: `notifications-service/Dockerfile`
- **Watch Paths**: `notifications-service/**`, `shared/**`

### Step 2: Create Dockerfiles for All Services

Run this script to create all Dockerfiles:

```bash
#!/bin/bash

# Create Dockerfile for each service
for service in social-service admin-service payment-queue-service search-service delivery-service taxi-realtime-service notifications-service; do

  # Get port number
  case $service in
    social-service) port=3001 ;;
    admin-service) port=3002 ;;
    payment-queue-service) port=3003 ;;
    search-service) port=3004 ;;
    delivery-service) port=3005 ;;
    taxi-realtime-service) port=3006 ;;
    notifications-service) port=3007 ;;
  esac

  # Create Dockerfile
  cat > ${service}/Dockerfile << EOF
# Multi-stage build for ${service} (Monorepo)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Install dependencies
RUN npm ci --include=dev --ignore-scripts

# Copy shared code and service code
COPY shared ./shared
COPY ${service} ./${service}

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts

# Copy built files and shared code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared

# Set environment
ENV NODE_ENV=production
ENV PORT=${port}

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:${port}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service
CMD ["node", "dist/${service}/src/index.js"]
EOF

  echo "✅ Created Dockerfile for ${service}"
done
```

Save this as `create-dockerfiles.sh` and run:

```bash
chmod +x create-dockerfiles.sh
./create-dockerfiles.sh
```

### Step 3: Create railway.json for Each Service

Railway can use `railway.json` to configure build settings:

```bash
#!/bin/bash

for service in social-service admin-service payment-queue-service search-service delivery-service taxi-realtime-service notifications-service; do

  cat > ${service}/railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF

  echo "✅ Created railway.json for ${service}"
done
```

### Step 4: Commit and Push to GitHub

```bash
# Add all Dockerfiles
git add */Dockerfile
git add */railway.json

# Commit
git commit -m "Add Dockerfiles for all services"

# Push to main branch
git push origin main
```

### Step 5: Railway Auto-Deploys

Railway will automatically:

1. Detect the push to `main`
2. Check which files changed
3. Deploy only the services whose watch paths were affected
4. Build using the correct Dockerfile
5. Deploy to the correct service

### Step 6: Set Environment Variables

For each service in Railway dashboard:

1. Go to service settings
2. Click "Variables"
3. Add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `LOG_LEVEL=info`
   - `PORT` (specific to each service)

---

## 🔄 How It Works

### When You Push to GitHub

```
1. You edit social-service/src/index.ts
2. git add . && git commit -m "Update social service"
3. git push origin main
4. Railway detects change in social-service/**
5. Railway builds using social-service/Dockerfile
6. Railway deploys ONLY social-service
7. Other services are NOT affected
```

### Watch Paths

Each service watches:

- Its own folder: `social-service/**`
- Shared code: `shared/**`

If you change `shared/`, ALL services redeploy (because they all depend on it).

---

## 📊 Railway Dashboard Configuration

### For Each Service

1. **Settings** → **Source**
   - Repository: `your-username/giga`
   - Branch: `main`
   - Root Directory: (leave empty for monorepo)

2. **Settings** → **Build**
   - Builder: `DOCKERFILE`
   - Dockerfile Path: `social-service/Dockerfile`
   - Watch Paths: `social-service/**,shared/**`

3. **Settings** → **Deploy**
   - Health Check Path: `/health`
   - Health Check Timeout: 100s
   - Restart Policy: `ON_FAILURE`

4. **Variables**
   - Add all environment variables

---

## 🎯 Deployment Workflow

### Initial Setup (One Time)

```bash
# 1. Create all Dockerfiles
./create-dockerfiles.sh

# 2. Commit and push
git add */Dockerfile */railway.json
git commit -m "Add service Dockerfiles"
git push origin main

# 3. Configure services in Railway dashboard
# (Set watch paths, environment variables)
```

### Daily Development

```bash
# 1. Make changes to a service
vim social-service/src/index.ts

# 2. Commit and push
git add .
git commit -m "Update social service"
git push origin main

# 3. Railway auto-deploys social-service
# (No CLI commands needed!)
```

### Update Multiple Services

```bash
# 1. Make changes to multiple services
vim social-service/src/index.ts
vim admin-service/src/index.ts

# 2. Commit and push
git add .
git commit -m "Update social and admin services"
git push origin main

# 3. Railway auto-deploys BOTH services
```

### Update Shared Code

```bash
# 1. Update shared code
vim shared/config/index.ts

# 2. Commit and push
git add .
git commit -m "Update shared config"
git push origin main

# 3. Railway redeploys ALL services
# (Because they all watch shared/**)
```

---

## ✅ Advantages of GitHub-Based Deployment

1. **No CLI Linking** - No need to `railway link` in each directory
2. **Automatic** - Push to GitHub, Railway handles the rest
3. **Selective Deployment** - Only changed services redeploy
4. **Git History** - Easy rollbacks via GitHub
5. **CI/CD Ready** - Can add GitHub Actions for tests
6. **Team Friendly** - Anyone can push, Railway deploys
7. **Monorepo Support** - All services in one repo, deployed separately

---

## 🔧 Troubleshooting

### Service Not Deploying

1. Check watch paths in Railway dashboard
2. Verify Dockerfile path is correct
3. Check build logs in Railway

### Wrong Service Deploying

1. Verify watch paths don't overlap
2. Check Dockerfile path points to correct service
3. Ensure root directory is empty (for monorepo)

### All Services Deploying

1. Check if you changed `shared/**`
2. All services watch shared, so they all redeploy
3. This is expected behavior

---

## 📝 Summary

**GitHub-based deployment is the cleanest approach for monorepos:**

1. Create services in Railway dashboard
2. Configure watch paths for each service
3. Create Dockerfiles for each service
4. Push to GitHub
5. Railway auto-deploys the right services

**No CLI linking needed!** Just push to GitHub and Railway handles everything.
