# CI/CD Setup for Railway Deployment

**Date**: January 16, 2026  
**Status**: ✅ CI/CD Pipeline Configured

---

## 🎯 Overview

This project uses **GitHub Actions** for CI/CD with automatic deployment to
**Railway**. Every push to `main` triggers:

1. **Change Detection** - Identifies which services changed
2. **Build & Test** - Compiles TypeScript and runs tests
3. **Docker Build** - Builds Docker images for changed services
4. **Auto-Deploy** - Railway automatically deploys changed services
5. **Health Check** - Verifies deployment success

---

## 🚀 How It Works

### Automatic Deployment Flow

```
Push to GitHub (main branch)
    ↓
GitHub Actions detects changes
    ↓
Builds and tests code
    ↓
Builds Docker images
    ↓
Railway detects push
    ↓
Railway deploys changed services
    ↓
Health checks verify deployment
```

### Smart Change Detection

The CI/CD pipeline only builds and deploys services that actually changed:

- **Change to `social-service/`** → Only social-service deploys
- **Change to `shared/`** → All services deploy (they all use shared code)
- **Change to `api-gateway/`** → Only API Gateway deploys
- **Multiple changes** → Multiple services deploy in parallel

---

## 📋 CI/CD Pipeline Jobs

### Job 1: Detect Changes

Uses `dorny/paths-filter` to detect which services changed:

```yaml
Monitors:
  - api-gateway/**
  - social-service/**
  - admin-service/**
  - payment-queue-service/**
  - search-service/**
  - delivery-service/**
  - taxi-realtime-service/**
  - notifications-service/**
  - shared/**
```

### Job 2: Build and Test

Runs on every push:

```bash
npm ci              # Install dependencies
npm run lint        # Lint code
npm run type-check  # TypeScript type checking
npm run build       # Build TypeScript
npm test            # Run tests
```

### Job 3: Build Docker Images

Only for changed services on `main` branch:

```bash
docker build -f <service>/Dockerfile .
```

Uses Docker layer caching for faster builds.

### Job 4: Deploy Notification

Creates a deployment summary showing which services will be deployed.

### Job 5: Health Check

Waits 2 minutes then checks service health endpoints.

---

## 🔧 Configuration Files

### GitHub Actions Workflow

**File**: `.github/workflows/railway-deploy.yml`

**Triggers**:

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Features**:

- Smart change detection
- Parallel builds
- Docker layer caching
- Deployment summaries
- Health checks

### Railway Configuration

**Files**: `<service>/railway.json`

**Key Settings**:

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "<service>/Dockerfile",
    "watchPatterns": ["<service>/**", "shared/**"]
  },
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

---

## 🎮 Usage

### Deploy a Single Service

```bash
# Make changes to a service
vim social-service/src/index.ts

# Commit and push
git add .
git commit -m "Update social service"
git push origin main

# GitHub Actions + Railway will:
# 1. Detect social-service changed
# 2. Build and test
# 3. Build Docker image
# 4. Railway auto-deploys social-service only
```

### Deploy Multiple Services

```bash
# Make changes to multiple services
vim social-service/src/index.ts
vim admin-service/src/index.ts

# Commit and push
git add .
git commit -m "Update social and admin services"
git push origin main

# Both services will deploy in parallel
```

### Deploy All Services (Shared Code Change)

```bash
# Make changes to shared code
vim shared/config/index.ts

# Commit and push
git add .
git commit -m "Update shared config"
git push origin main

# ALL services will redeploy
# (Because they all depend on shared/)
```

### Test Before Deploying

```bash
# Run full CI pipeline locally
npm run ci:all

# Or run individual checks
npm run ci:lint
npm run ci:type-check
npm run ci:build
npm run ci:test
npm run ci:security
```

---

## 🐳 Docker Build Commands

### Build Locally

```bash
# Build API Gateway
npm run docker:build

# Build Social Service
npm run docker:build:social

# Build Admin Service
npm run docker:build:admin

# Build all services
npm run docker:build:all
```

### Test Docker Image Locally

```bash
# Build image
docker build -f social-service/Dockerfile -t giga-social .

# Run container
docker run -p 3001:3001 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_ROLE_KEY=your_key \
  -e JWT_SECRET=your_secret \
  -e NODE_ENV=production \
  -e PORT=3001 \
  giga-social

# Test health endpoint
curl http://localhost:3001/health
```

---

## 📊 Monitoring Deployments

### GitHub Actions Dashboard

1. Go to: https://github.com/your-repo/actions
2. See all workflow runs
3. Click on a run to see details
4. View deployment summary

### Railway Dashboard

1. Go to: https://railway.app/project/0455788a-bd06-4e71-ba98-5c82c2ea64b6
2. See all services
3. Click on a service to see:
   - Deployment status
   - Build logs
   - Runtime logs
   - Metrics

### Check Deployment Status

```bash
# Check Railway status
railway status

# View logs
railway logs

# View logs for specific service
cd social-service
railway logs
```

---

## 🚨 Troubleshooting

### Build Fails in GitHub Actions

**Check**:

1. View GitHub Actions logs
2. Look for TypeScript errors
3. Check linting errors
4. Verify tests pass locally

**Fix**:

```bash
# Run CI checks locally
npm run ci:all

# Fix issues
npm run lint:fix
npm run format

# Commit fixes
git add .
git commit -m "Fix CI issues"
git push origin main
```

### Docker Build Fails

**Common Issues**:

1. **"Cannot find module 'shared'"**
   - **Cause**: Building from wrong directory
   - **Fix**: Ensure Dockerfile builds from monorepo root
   - **Check**: `railway.json` has correct `dockerfilePath`

2. **"Node version mismatch"**
   - **Cause**: Using Node 18 instead of Node 20
   - **Fix**: Update Dockerfile to use `node:20-alpine`

3. **"Missing dependencies"**
   - **Cause**: Dependencies not installed
   - **Fix**: Check `package.json` includes all dependencies

### Railway Deployment Fails

**Check**:

1. Railway build logs
2. Environment variables set correctly
3. Health check endpoint working
4. Port configuration correct

**Fix**:

```bash
# Verify environment variables
railway variables

# Check service logs
railway logs

# Restart service
railway restart
```

### Health Check Fails

**Check**:

1. Service is running
2. `/health` endpoint exists
3. Port is correct
4. No startup errors

**Fix**:

```bash
# Check logs
railway logs

# Verify health endpoint locally
curl http://localhost:3001/health

# Check Railway service URL
curl https://your-service.railway.app/health
```

---

## 🔐 Security Best Practices

### Secrets Management

**Never commit**:

- API keys
- Database credentials
- JWT secrets
- Service role keys

**Use**:

- Railway environment variables
- GitHub Secrets (for CI/CD)

### GitHub Secrets Setup

1. Go to: Repository → Settings → Secrets and variables → Actions
2. Add secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - Other service-specific secrets

### Railway Environment Variables

Set via:

- Railway dashboard (UI)
- Railway CLI: `railway variables --set KEY=value`
- Automated script: `./scripts/set-all-railway-env.sh`

---

## 📈 Performance Optimization

### Docker Layer Caching

GitHub Actions uses Docker layer caching to speed up builds:

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

**Benefits**:

- First build: ~5 minutes
- Subsequent builds: ~2 minutes (60% faster)

### Parallel Builds

Multiple services build in parallel:

```yaml
strategy:
  matrix:
    service: [social, admin, payment, ...]
```

**Benefits**:

- 7 services build simultaneously
- Total time: ~5 minutes (vs 35 minutes sequential)

### Smart Change Detection

Only changed services deploy:

**Example**:

- Change 1 service → 1 deployment (~2 minutes)
- Change shared code → 8 deployments (~5 minutes parallel)

---

## 🎯 Best Practices

### Commit Messages

Use conventional commits for automatic changelog:

```bash
feat: add new feature
fix: fix bug
docs: update documentation
style: format code
refactor: refactor code
test: add tests
chore: update dependencies
```

### Branch Strategy

```
main (production)
  ↑
develop (staging)
  ↑
feature/* (development)
```

**Workflow**:

1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and commit
3. Push and create PR to `develop`
4. Test on staging
5. Merge to `main` for production

### Testing Before Deploy

```bash
# Always run before pushing
npm run ci:all

# Or use pre-push hook (automatic)
git push origin main
```

---

## 📚 Additional Resources

### Documentation

- **GitHub Actions**: https://docs.github.com/en/actions
- **Railway**: https://docs.railway.app
- **Docker**: https://docs.docker.com

### Scripts

- `scripts/fix-railway-json.sh` - Fix Railway configurations
- `scripts/set-all-railway-env.sh` - Set environment variables
- `.github/workflows/railway-deploy.yml` - CI/CD workflow

### Monitoring

- **GitHub Actions**: https://github.com/your-repo/actions
- **Railway Dashboard**:
  https://railway.app/project/0455788a-bd06-4e71-ba98-5c82c2ea64b6

---

## ✅ Quick Reference

### Deploy Commands

```bash
# Deploy single service
git add social-service/
git commit -m "feat: update social service"
git push origin main

# Deploy all services
git add shared/
git commit -m "feat: update shared config"
git push origin main

# Test before deploy
npm run ci:all
```

### Check Status

```bash
# GitHub Actions
open https://github.com/your-repo/actions

# Railway
railway status
railway logs

# Health checks
curl https://your-service.railway.app/health
```

### Troubleshoot

```bash
# View logs
railway logs

# Check environment
railway variables

# Restart service
railway restart

# Rebuild
git commit --allow-empty -m "trigger rebuild"
git push origin main
```

---

## 🎉 Benefits of This Setup

✅ **Fast Deployments** - Only changed services deploy  
✅ **Automatic** - Push to GitHub, Railway deploys  
✅ **Safe** - Tests run before deployment  
✅ **Visible** - Clear deployment status in GitHub  
✅ **Rollback** - Easy to revert with git  
✅ **Scalable** - Add new services easily  
✅ **Monitored** - Health checks verify deployment

---

**Ready to deploy?** Just push to `main` and watch the magic happen! 🚀
