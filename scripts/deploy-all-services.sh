#!/bin/bash

# Deploy All Services to Railway
# This script automates the deployment of all microservices

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service list
SERVICES=(
  "social-service"
  "admin-service"
  "payment-queue-service"
  "search-service"
  "delivery-service"
  "taxi-realtime-service"
  "notifications-service"
)

# Ports for each service
declare -A SERVICE_PORTS=(
  ["social-service"]="3001"
  ["admin-service"]="3002"
  ["payment-queue-service"]="3003"
  ["search-service"]="3004"
  ["delivery-service"]="3005"
  ["taxi-realtime-service"]="3006"
  ["notifications-service"]="3007"
)

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Deploy All Services to Railway - Automated Script     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI is not installed${NC}"
    echo -e "${YELLOW}Install it with: brew install railway${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI is installed${NC}"

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo -e "${YELLOW}Run: railway login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Logged in to Railway${NC}"
echo ""

# Function to create Dockerfile for a service
create_dockerfile() {
  local service=$1
  local port=$2
  
  echo -e "${BLUE}📝 Creating Dockerfile for ${service}...${NC}"
  
  cat > ${service}/Dockerfile << EOF
# Multi-stage build for ${service}
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
COPY ${service} ./${service}

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
ENV PORT=${port}

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:${port}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service
CMD ["node", "dist/${service}/src/index.js"]
EOF

  echo -e "${GREEN}✅ Dockerfile created for ${service}${NC}"
}

# Function to create railway.toml for a service
create_railway_toml() {
  local service=$1
  
  echo -e "${BLUE}📝 Creating railway.toml for ${service}...${NC}"
  
  cat > ${service}/railway.toml << EOF
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

  echo -e "${GREEN}✅ railway.toml created for ${service}${NC}"
}

# Step 1: Create Dockerfiles and railway.toml for all services
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Step 1: Creating Dockerfiles and railway.toml files${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""

for service in "${SERVICES[@]}"; do
  port=${SERVICE_PORTS[$service]}
  create_dockerfile "$service" "$port"
  create_railway_toml "$service"
  echo ""
done

echo -e "${GREEN}✅ All Dockerfiles and railway.toml files created${NC}"
echo ""

# Step 2: Test build locally (optional)
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Step 2: Test Local Builds (Optional)${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""

read -p "Do you want to test builds locally before deploying? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  for service in "${SERVICES[@]}"; do
    echo -e "${BLUE}🔨 Building ${service} locally...${NC}"
    
    if docker build -t ${service}:test -f ${service}/Dockerfile .; then
      echo -e "${GREEN}✅ ${service} built successfully${NC}"
    else
      echo -e "${RED}❌ ${service} build failed${NC}"
      echo -e "${YELLOW}Fix the build errors before deploying${NC}"
      exit 1
    fi
    echo ""
  done
  
  echo -e "${GREEN}✅ All services built successfully locally${NC}"
  echo ""
fi

# Step 3: Deploy to Railway
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Step 3: Deploy Services to Railway${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${BLUE}This will deploy all services to Railway.${NC}"
echo -e "${BLUE}Each service will be created as a separate Railway service.${NC}"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Deployment cancelled${NC}"
  exit 0
fi

# Array to store service URLs
declare -A SERVICE_URLS

for service in "${SERVICES[@]}"; do
  echo -e "${BLUE}🚀 Deploying ${service}...${NC}"
  
  cd ${service}
  
  # Deploy to Railway
  if railway up --service ${service}; then
    echo -e "${GREEN}✅ ${service} deployed successfully${NC}"
    
    # Get the service URL
    SERVICE_URL=$(railway domain --service ${service} 2>/dev/null | grep "https://" || echo "")
    
    if [ -n "$SERVICE_URL" ]; then
      SERVICE_URLS[$service]=$SERVICE_URL
      echo -e "${GREEN}   URL: ${SERVICE_URL}${NC}"
    else
      echo -e "${YELLOW}   ⚠️  URL not available yet (may take a few minutes)${NC}"
    fi
  else
    echo -e "${RED}❌ ${service} deployment failed${NC}"
    cd ..
    exit 1
  fi
  
  cd ..
  echo ""
done

echo -e "${GREEN}✅ All services deployed to Railway${NC}"
echo ""

# Step 4: Set environment variables for each service
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Step 4: Set Environment Variables${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo -e "${GREEN}✅ Loaded environment variables from .env${NC}"
else
  echo -e "${RED}❌ .env file not found${NC}"
  echo -e "${YELLOW}Please create .env file with required variables${NC}"
  exit 1
fi

for service in "${SERVICES[@]}"; do
  echo -e "${BLUE}🔧 Setting environment variables for ${service}...${NC}"
  
  # Set common environment variables
  railway variables --service ${service} --set "SUPABASE_URL=${SUPABASE_URL}"
  railway variables --service ${service} --set "SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}"
  railway variables --service ${service} --set "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}"
  railway variables --service ${service} --set "JWT_SECRET=${JWT_SECRET}"
  railway variables --service ${service} --set "NODE_ENV=production"
  railway variables --service ${service} --set "LOG_LEVEL=info"
  railway variables --service ${service} --set "PORT=${SERVICE_PORTS[$service]}"
  
  echo -e "${GREEN}✅ Environment variables set for ${service}${NC}"
  echo ""
done

# Step 5: Update API Gateway with service URLs
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Step 5: Update API Gateway Configuration${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${BLUE}🔧 Updating API Gateway with service URLs...${NC}"

# Map service names to environment variable names
declare -A SERVICE_ENV_VARS=(
  ["social-service"]="SOCIAL_SERVICE_URL"
  ["admin-service"]="ADMIN_SERVICE_URL"
  ["payment-queue-service"]="PAYMENT_QUEUE_SERVICE_URL"
  ["search-service"]="SEARCH_SERVICE_URL"
  ["delivery-service"]="DELIVERY_SERVICE_URL"
  ["taxi-realtime-service"]="TAXI_REALTIME_SERVICE_URL"
  ["notifications-service"]="NOTIFICATIONS_SERVICE_URL"
)

for service in "${SERVICES[@]}"; do
  if [ -n "${SERVICE_URLS[$service]}" ]; then
    env_var=${SERVICE_ENV_VARS[$service]}
    railway variables --service giga-super-app --set "${env_var}=${SERVICE_URLS[$service]}"
    echo -e "${GREEN}✅ Set ${env_var}=${SERVICE_URLS[$service]}${NC}"
  fi
done

echo ""
echo -e "${GREEN}✅ API Gateway configuration updated${NC}"
echo ""

# Step 6: Test all services
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Step 6: Test All Services${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${BLUE}🧪 Testing health endpoints...${NC}"
echo ""

# Wait a bit for services to start
echo -e "${YELLOW}⏳ Waiting 30 seconds for services to start...${NC}"
sleep 30

for service in "${SERVICES[@]}"; do
  if [ -n "${SERVICE_URLS[$service]}" ]; then
    echo -e "${BLUE}Testing ${service}...${NC}"
    
    if curl -s -f "${SERVICE_URLS[$service]}/health" > /dev/null; then
      echo -e "${GREEN}✅ ${service} is healthy${NC}"
    else
      echo -e "${RED}❌ ${service} health check failed${NC}"
      echo -e "${YELLOW}   Check logs: railway logs --service ${service}${NC}"
    fi
  fi
done

echo ""

# Summary
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Deployment Summary${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}Deployed Services:${NC}"
for service in "${SERVICES[@]}"; do
  if [ -n "${SERVICE_URLS[$service]}" ]; then
    echo -e "  • ${service}: ${SERVICE_URLS[$service]}"
  else
    echo -e "  • ${service}: URL not available yet"
  fi
done

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Check logs for each service: ${YELLOW}railway logs --service <service-name>${NC}"
echo -e "  2. Monitor Railway dashboard for resource usage"
echo -e "  3. Update payment webhooks (Paystack, Stripe)"
echo -e "  4. Update client applications with new API Gateway URL"
echo -e "  5. Test all endpoints through API Gateway"
echo ""
echo -e "${GREEN}🎉 All services deployed successfully!${NC}"
