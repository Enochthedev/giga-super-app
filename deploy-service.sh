#!/bin/bash

# Deploy a single service to Railway
# Usage: ./deploy-service.sh <service-name> <port>
# Example: ./deploy-service.sh social-service 3001

set -e

SERVICE_NAME=$1
PORT=$2

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$SERVICE_NAME" ] || [ -z "$PORT" ]; then
  echo -e "${RED}Usage: ./deploy-service.sh <service-name> <port>${NC}"
  echo -e "${YELLOW}Example: ./deploy-service.sh social-service 3001${NC}"
  exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Deploy ${SERVICE_NAME} to Railway                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if service directory exists
if [ ! -d "$SERVICE_NAME" ]; then
  echo -e "${RED}❌ Service directory not found: $SERVICE_NAME${NC}"
  exit 1
fi

# Step 1: Create Dockerfile
echo -e "${YELLOW}Step 1: Creating Dockerfile...${NC}"

cat > ${SERVICE_NAME}/Dockerfile << EOF
# Multi-stage build for ${SERVICE_NAME}
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
COPY ${SERVICE_NAME} ./${SERVICE_NAME}

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
ENV PORT=${PORT}

# Expose port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service
CMD ["node", "dist/${SERVICE_NAME}/src/index.js"]
EOF

echo -e "${GREEN}✅ Dockerfile created${NC}"
echo ""

# Step 2: Create railway.toml
echo -e "${YELLOW}Step 2: Creating railway.toml...${NC}"

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

echo -e "${GREEN}✅ railway.toml created${NC}"
echo ""

# Step 3: Test build locally
echo -e "${YELLOW}Step 3: Testing build locally...${NC}"
read -p "Do you want to test the build locally? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  docker build -t ${SERVICE_NAME}:test -f ${SERVICE_NAME}/Dockerfile .
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
  else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⏭️  Skipping local build test${NC}"
fi
echo ""

# Step 4: Create New Railway Service
echo -e "${YELLOW}Step 4: Creating new Railway service...${NC}"
echo -e "${BLUE}This will create a new service named: ${SERVICE_NAME}${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Deployment cancelled${NC}"
  exit 0
fi

# Go to project root to create service
railway service create ${SERVICE_NAME}

echo -e "${GREEN}✅ Service created: ${SERVICE_NAME}${NC}"
echo ""

# Step 5: Deploy to the new service
echo -e "${YELLOW}Step 5: Deploying to Railway...${NC}"

# Deploy from service directory
cd ${SERVICE_NAME}

# Link to the service we just created
railway service link ${SERVICE_NAME}

# Deploy
railway up

cd ..

echo -e "${GREEN}✅ Deployed to Railway${NC}"
echo ""

# Step 5: Set environment variables
echo -e "${YELLOW}Step 5: Setting environment variables...${NC}"

# Load from .env if exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo -e "${GREEN}✅ Loaded environment variables from .env${NC}"
fi

# Set common environment variables
railway variables --set "SUPABASE_URL=$SUPABASE_URL"
railway variables --set "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
railway variables --set "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY"
railway variables --set "JWT_SECRET=$JWT_SECRET"
railway variables --set "NODE_ENV=production"
railway variables --set "LOG_LEVEL=info"
railway variables --set "PORT=${PORT}"

echo -e "${GREEN}✅ Environment variables set${NC}"
echo ""

# Step 6: Get service URL
echo -e "${YELLOW}Step 6: Getting service URL...${NC}"
echo -e "${BLUE}Waiting for deployment to complete...${NC}"
sleep 15

SERVICE_URL=$(railway domain 2>/dev/null | grep "https://" || echo "")

if [ -n "$SERVICE_URL" ]; then
  echo -e "${GREEN}✅ Service URL: ${SERVICE_URL}${NC}"
  
  # Step 7: Test health endpoint
  echo ""
  echo -e "${YELLOW}Step 7: Testing health endpoint...${NC}"
  echo -e "${BLUE}Waiting for service to start...${NC}"
  sleep 10
  
  if curl -s -f "${SERVICE_URL}/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    curl -s "${SERVICE_URL}/health" | python3 -m json.tool || curl -s "${SERVICE_URL}/health"
  else
    echo -e "${RED}❌ Health check failed${NC}"
    echo -e "${YELLOW}Check logs: railway logs${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  URL not available yet. Check Railway dashboard.${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Deployment Complete!                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Service: ${SERVICE_NAME}${NC}"
echo -e "${BLUE}Port: ${PORT}${NC}"
if [ -n "$SERVICE_URL" ]; then
  echo -e "${BLUE}URL: ${SERVICE_URL}${NC}"
fi
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Check logs: ${BLUE}railway logs${NC}"
echo -e "  2. View in dashboard: ${BLUE}railway open${NC}"
echo -e "  3. Update API Gateway with service URL"
echo ""
