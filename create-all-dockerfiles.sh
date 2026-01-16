#!/bin/bash

# Create Dockerfiles for all services
# This script creates production-ready Dockerfiles for monorepo deployment

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Creating Dockerfiles for all services...${NC}"
echo ""

# Service configurations
declare -a services=("social-service" "admin-service" "payment-queue-service" "search-service" "delivery-service" "taxi-realtime-service" "notifications-service")
declare -a ports=("3001" "3002" "3003" "3004" "3005" "3006" "3007")

# Create Dockerfile for each service
for i in "${!services[@]}"; do
  service="${services[$i]}"
  port="${ports[$i]}"
  
  echo -e "${BLUE}Creating Dockerfile for ${service} (port ${port})...${NC}"
  
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

  echo -e "${GREEN}✅ Created ${service}/Dockerfile${NC}"
  
  # Create railway.json
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

  echo -e "${GREEN}✅ Created ${service}/railway.json${NC}"
  echo ""
done

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          All Dockerfiles Created Successfully!             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Review the Dockerfiles"
echo -e "  2. Commit to git: ${GREEN}git add */Dockerfile */railway.json${NC}"
echo -e "  3. Push to GitHub: ${GREEN}git push origin main${NC}"
echo -e "  4. Configure services in Railway dashboard"
echo ""
