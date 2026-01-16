#!/bin/bash

# Create railway.toml files for all services
# Railway prefers .toml over .json for configuration

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Creating railway.toml files for all services...${NC}"
echo ""

# Service configurations
declare -a services=("social-service" "admin-service" "payment-queue-service" "search-service" "delivery-service" "taxi-realtime-service" "notifications-service")

# Create railway.toml for each service
for service in "${services[@]}"; do
  echo -e "${BLUE}Creating ${service}/railway.toml...${NC}"
  
  cat > ${service}/railway.toml << EOF
# Railway configuration for ${service}
# https://docs.railway.app/deploy/config-as-code

[build]
builder = "DOCKERFILE"
dockerfilePath = "${service}/Dockerfile"
watchPaths = ["${service}/**", "shared/**"]

[deploy]
numReplicas = 1
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
EOF

  echo -e "${GREEN}✅ Created ${service}/railway.toml${NC}"
done

echo ""
echo -e "${GREEN}All railway.toml files created!${NC}"
echo ""
echo -e "${BLUE}Note: Railway will use these .toml files instead of .json files${NC}"
