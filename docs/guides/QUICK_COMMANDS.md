# Quick Command Reference

## Local Testing

### Test All Docker Builds

```bash
./scripts/test-docker-builds.sh
```

### Test Individual Service

```bash
docker build -f social-service/Dockerfile -t test .
docker build -f admin-service/Dockerfile -t test .
docker build -f search-service/Dockerfile -t test .
```

### Check TypeScript Compilation

```bash
# Check for errors (no output)
npx tsc -p social-service/tsconfig.json --noEmit

# Count errors
npx tsc -p social-service/tsconfig.json --noEmit 2>&1 | grep "error TS" | wc -l

# Build (generates JavaScript)
npx tsc -p social-service/tsconfig.json
```

---

## Deployment

### Deploy All Services

```bash
git add .
git commit -m "Deploy all services"
git push origin main
```

### Deploy Specific Service

Railway automatically deploys when files in watch paths change:

```bash
# Only triggers social-service deployment
git add social-service/
git commit -m "Update social service"
git push origin main
```

---

## Health Checks

### Check Local Service

```bash
# If running locally
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### Check Deployed Services

```bash
# Replace with your Railway URLs
curl https://social-service.railway.app/health
curl https://admin-service.railway.app/health

# Or use the script
./scripts/check-service-health.sh https://your-project.railway.app
```

---

## Fixing Issues

### Fix TypeScript Types

```bash
./scripts/fix-typescript-types.sh
```

### Fix All Dockerfiles

```bash
./scripts/fix-all-dockerfiles.sh
```

### Rebuild After Changes

```bash
# Clean dist folder
rm -rf dist/

# Rebuild specific service
npx tsc -p social-service/tsconfig.json

# Test Docker build
docker build -f social-service/Dockerfile -t test .
```

---

## Railway CLI (Optional)

### Install Railway CLI

```bash
npm install -g @railway/cli
```

### Login

```bash
railway login
```

### Link Project

```bash
railway link
```

### View Logs

```bash
railway logs
```

### Deploy

```bash
railway up
```

---

## Environment Variables

### Set Local Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### Check Environment in Railway

```bash
railway variables
```

### Set Variable in Railway

```bash
railway variables set KEY=value
```

---

## Docker Commands

### Build Image

```bash
docker build -f {service}/Dockerfile -t {service}:latest .
```

### Run Container

```bash
docker run -p 3001:3001 --env-file .env {service}:latest
```

### View Logs

```bash
docker logs {container-id}
```

### Stop Container

```bash
docker stop {container-id}
```

### Remove Image

```bash
docker rmi {service}:latest
```

### Clean Up

```bash
# Remove all stopped containers
docker container prune

# Remove all unused images
docker image prune -a
```

---

## Git Commands

### Check Status

```bash
git status
```

### View Changes

```bash
git diff
```

### Commit Changes

```bash
git add .
git commit -m "Your message"
```

### Push to GitHub

```bash
git push origin main
```

### View Commit History

```bash
git log --oneline
```

---

## NPM Commands

### Install Dependencies

```bash
npm install
```

### Install Dev Dependencies

```bash
npm install --save-dev {package}
```

### Update Dependencies

```bash
npm update
```

### Check for Outdated Packages

```bash
npm outdated
```

### Run Scripts

```bash
npm run build
npm run dev
npm test
```

---

## Debugging

### View Service Logs (Railway)

```bash
railway logs --service {service-name}
```

### View Build Logs (Railway)

```bash
# In Railway dashboard, click on deployment → View Logs
```

### Test Database Connection

```bash
# From service container
psql $DATABASE_URL
```

### Test Supabase Connection

```bash
curl -H "apikey: $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/rest/v1/"
```

---

## Monitoring

### Check Service Status

```bash
# Health endpoint
curl https://{service}.railway.app/health

# Ready endpoint
curl https://{service}.railway.app/ready

# Live endpoint
curl https://{service}.railway.app/live
```

### Check All Services

```bash
./scripts/check-service-health.sh https://your-project.railway.app
```

---

## Quick Fixes

### Service Won't Start

```bash
# Check environment variables
railway variables

# Check logs
railway logs

# Restart service
railway restart
```

### Build Fails

```bash
# Check Dockerfile
cat {service}/Dockerfile

# Test build locally
docker build -f {service}/Dockerfile -t test .

# Check tsconfig
cat {service}/tsconfig.json
```

### TypeScript Errors

```bash
# Fix types
./scripts/fix-typescript-types.sh

# Check compilation
npx tsc -p {service}/tsconfig.json --noEmit

# Rebuild
npx tsc -p {service}/tsconfig.json
```

---

## Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Docker
alias dps='docker ps'
alias dimg='docker images'
alias dlog='docker logs'
alias dstop='docker stop'
alias drm='docker rm'
alias drmi='docker rmi'

# Railway
alias rl='railway logs'
alias rv='railway variables'
alias rs='railway status'

# Git
alias gs='git status'
alias ga='git add'
alias gc='git commit -m'
alias gp='git push'
alias gl='git log --oneline'

# Project specific
alias test-builds='./scripts/test-docker-builds.sh'
alias check-health='./scripts/check-service-health.sh'
alias fix-types='./scripts/fix-typescript-types.sh'
```

---

## Emergency Commands

### Rollback Deployment

```bash
# In Railway dashboard
# Click on previous deployment → "Redeploy"
```

### Stop All Services

```bash
# In Railway dashboard
# For each service → Settings → "Pause Service"
```

### View All Logs

```bash
railway logs --follow
```

### Force Rebuild

```bash
# Delete and recreate service in Railway
# Or trigger rebuild with empty commit
git commit --allow-empty -m "Force rebuild"
git push origin main
```

---

## Documentation Quick Links

- **Quick Setup**: `RAILWAY_QUICK_SETUP.md`
- **Full Config**: `RAILWAY_SERVICE_CONFIGURATION.md`
- **Docker Fixes**: `DOCKER_BUILD_FIX_SUMMARY.md`
- **TypeScript Fixes**: `TYPESCRIPT_FIXES_SUMMARY.md`
- **Final Status**: `FINAL_STATUS.md`
- **This File**: `QUICK_COMMANDS.md`
