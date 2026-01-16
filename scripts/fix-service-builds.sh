#!/bin/bash

# Fix service builds - create correct tsconfig and Dockerfiles

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Fixing service build configurations...${NC}"
echo ""

# Service configurations
declare -A services
services=(
  ["social-service"]="3001"
  ["admin-service"]="3002"
  ["payment-queue-service"]="3003"
  ["search-service"]="3004"
  ["delivery-service"]="3005"
  ["taxi-realtime-service"]="3006"
  ["notifications-service"]="3007"
)

for service in "${!services[@]}"; do
  port="${services[$service]}"
  
  echo -e "${BLUE}Fixing ${service}...${NC}"
  
  # Create service-specific tsconfig.json
  cat > "${service}/tsconfig.json" << 'EOF'
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../dist/SERVICE_NAME",
    "rootDir": "."
  },
  "include": [
    "src/**/*",
    "../shared/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
EOF
  
  # Replace SERVICE_NAME placeholder
  sed -i.bak "s/SERVICE_NAME/${service}/g" "${service}/tsconfig.json"
  rm "${service}/tsconfig.json.bak"
  
  echo -e "${GREEN}✅ Created ${service}/tsconfig.json${NC}"
  
  # Create correct Dockerfile
  cat > "${service}/Dockerfile" << EOF
# Multi-stage build for ${service} (Monorepo)
FROM node:20-alpine AS builder

# Labels for identification
LABEL service="${service}"
LABEL version="1.0.0"
LABEL description="${service} for Giga platform"

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci --include=dev --ignore-scripts

# Copy shared code and service code
COPY shared ./shared
COPY ${service} ./${service}

# Build TypeScript for this service
WORKDIR /app/${service}
RUN npx tsc -p tsconfig.json

# Production stage
FROM node:20-alpine

# Labels for identification
LABEL service="${service}"
LABEL version="1.0.0"
LABEL port="${port}"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts

# Copy built files and shared code
COPY --from=builder /app/dist/${service} ./dist
COPY --from=builder /app/shared ./shared

# Set environment
ENV NODE_ENV=production
ENV PORT=${port}
ENV SERVICE_NAME=${service}
ENV SERVICE_VERSION=1.0.0

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:${port}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service
CMD ["node", "dist/src/index.js"]
EOF
  
  echo -e "${GREEN}✅ Created ${service}/Dockerfile${NC}"
  echo ""
done

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          All service builds fixed!                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Test build locally: ${GREEN}docker build -f social-service/Dockerfile -t test .${NC}"
echo -e "  2. Commit changes: ${GREEN}git add . && git commit -m 'Fix service builds'${NC}"
echo -e "  3. Push to GitHub: ${GREEN}git push origin main${NC}"
echo ""
