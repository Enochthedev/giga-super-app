#!/bin/bash

# Check health status of all deployed services
# Usage: ./scripts/check-service-health.sh [base-url]

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default base URL (Railway production)
BASE_URL="${1:-https://your-project.up.railway.app}"

# Services and their ports
declare -A SERVICES=(
  ["social-service"]="3001"
  ["admin-service"]="3002"
  ["payment-queue-service"]="3003"
  ["search-service"]="3004"
  ["delivery-service"]="3005"
  ["taxi-realtime-service"]="3006"
  ["notifications-service"]="3007"
)

echo "=========================================="
echo "Checking Service Health"
echo "=========================================="
echo ""

# Track results
HEALTHY=0
UNHEALTHY=0
UNREACHABLE=0

# Function to check service health
check_service() {
  local service=$1
  local port=$2
  local url="${BASE_URL}:${port}/health"
  
  echo -n "Checking ${service}... "
  
  # Try to reach the health endpoint
  response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" 2>/dev/null || echo "000")
  
  if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ Healthy${NC}"
    ((HEALTHY++))
  elif [ "$response" = "000" ]; then
    echo -e "${RED}✗ Unreachable${NC}"
    ((UNREACHABLE++))
  else
    echo -e "${YELLOW}⚠ Unhealthy (HTTP $response)${NC}"
    ((UNHEALTHY++))
  fi
}

# Check each service
for service in "${!SERVICES[@]}"; do
  check_service "$service" "${SERVICES[$service]}"
done

# Summary
echo ""
echo "=========================================="
echo "Health Check Summary"
echo "=========================================="
echo -e "${GREEN}Healthy:${NC} $HEALTHY"
echo -e "${YELLOW}Unhealthy:${NC} $UNHEALTHY"
echo -e "${RED}Unreachable:${NC} $UNREACHABLE"
echo ""

# Exit code based on results
if [ $UNHEALTHY -gt 0 ] || [ $UNREACHABLE -gt 0 ]; then
  echo -e "${RED}Some services are not healthy!${NC}"
  exit 1
else
  echo -e "${GREEN}All services are healthy!${NC}"
  exit 0
fi
