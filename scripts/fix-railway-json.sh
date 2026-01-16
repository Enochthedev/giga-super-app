#!/bin/bash

# Fix railway.json files to use correct Dockerfile paths from root

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Fixing railway.json files...${NC}"
echo ""

# Service configurations
declare -a services=("social-service" "admin-service" "payment-queue-service" "search-service" "delivery-service" "taxi-realtime-service" "notifications-service")

# Fix railway.json for each service
for service in "${services[@]}"; do
  echo -e "${BLUE}Fixing ${service}/railway.json...${NC}"
  
  cat > ${service}/railway.json << EOF
{
  "\$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "${service}/Dockerfile",
    "watchPatterns": [
      "${service}/**",
      "shared/**"
    ]
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

  echo -e "${GREEN}✅ Fixed ${service}/railway.json${NC}"
done

echo ""
echo -e "${GREEN}All railway.json files fixed!${NC}"
