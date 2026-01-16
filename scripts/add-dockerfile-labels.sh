#!/bin/bash

# Add identifying labels to all Dockerfiles

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Adding labels to all Dockerfiles...${NC}"
echo ""

# Service configurations
declare -A services
services=(
  ["admin-service"]="3002"
  ["payment-queue-service"]="3003"
  ["search-service"]="3004"
  ["delivery-service"]="3005"
  ["taxi-realtime-service"]="3006"
  ["notifications-service"]="3007"
)

for service in "${!services[@]}"; do
  port="${services[$service]}"
  dockerfile="${service}/Dockerfile"
  
  if [ ! -f "$dockerfile" ]; then
    echo -e "${BLUE}Skipping ${service} - Dockerfile not found${NC}"
    continue
  fi
  
  echo -e "${BLUE}Adding labels to ${service}/Dockerfile...${NC}"
  
  # Create temp file with labels
  cat > "${dockerfile}.tmp" << EOF
# Multi-stage build for ${service} (Monorepo)
FROM node:20-alpine AS builder

# Labels for identification
LABEL service="${service}"
LABEL version="1.0.0"
LABEL description="${service} for Giga platform"

EOF

  # Append rest of Dockerfile (skip first 2 lines)
  tail -n +3 "$dockerfile" | head -n -18 >> "${dockerfile}.tmp"
  
  # Add production stage with labels
  cat >> "${dockerfile}.tmp" << EOF

# Production stage
FROM node:20-alpine

# Labels for identification
LABEL service="${service}"
LABEL version="1.0.0"
LABEL port="${port}"

EOF

  # Append rest of production stage
  tail -n 16 "$dockerfile" >> "${dockerfile}.tmp"
  
  # Replace original
  mv "${dockerfile}.tmp" "$dockerfile"
  
  echo -e "${GREEN}✅ Added labels to ${service}/Dockerfile${NC}"
done

echo ""
echo -e "${GREEN}All Dockerfiles updated with labels!${NC}"
echo ""
echo -e "${BLUE}You can now identify services by checking Docker labels:${NC}"
echo -e "  docker inspect <container> | grep -A 3 Labels"
