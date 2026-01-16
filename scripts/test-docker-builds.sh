#!/bin/bash

# Test Docker builds for all services
# This script builds each service Docker image locally to verify they work

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Services to test
SERVICES=(
  "social-service"
  "admin-service"
  "payment-queue-service"
  "search-service"
  "delivery-service"
  "taxi-realtime-service"
  "notifications-service"
)

# Track results
PASSED=()
FAILED=()

echo "=========================================="
echo "Testing Docker Builds for All Services"
echo "=========================================="
echo ""

# Function to test a service build
test_service_build() {
  local service=$1
  local dockerfile="${service}/Dockerfile"
  
  echo -e "${YELLOW}Testing ${service}...${NC}"
  
  # Check if Dockerfile exists
  if [ ! -f "$dockerfile" ]; then
    echo -e "${RED}✗ Dockerfile not found: ${dockerfile}${NC}"
    FAILED+=("$service")
    return 1
  fi
  
  # Build the Docker image
  if docker build -f "$dockerfile" -t "giga-${service}:test" . > "/tmp/${service}-build.log" 2>&1; then
    echo -e "${GREEN}✓ ${service} build successful${NC}"
    PASSED+=("$service")
    
    # Clean up the test image
    docker rmi "giga-${service}:test" > /dev/null 2>&1 || true
    
    return 0
  else
    echo -e "${RED}✗ ${service} build failed${NC}"
    echo -e "${RED}  See /tmp/${service}-build.log for details${NC}"
    FAILED+=("$service")
    
    # Show last 20 lines of error
    echo -e "${RED}  Last 20 lines of build log:${NC}"
    tail -n 20 "/tmp/${service}-build.log"
    
    return 1
  fi
}

# Test each service
for service in "${SERVICES[@]}"; do
  test_service_build "$service"
  echo ""
done

# Summary
echo "=========================================="
echo "Build Test Summary"
echo "=========================================="
echo ""

if [ ${#PASSED[@]} -gt 0 ]; then
  echo -e "${GREEN}Passed (${#PASSED[@]}):${NC}"
  for service in "${PASSED[@]}"; do
    echo -e "  ${GREEN}✓${NC} $service"
  done
  echo ""
fi

if [ ${#FAILED[@]} -gt 0 ]; then
  echo -e "${RED}Failed (${#FAILED[@]}):${NC}"
  for service in "${FAILED[@]}"; do
    echo -e "  ${RED}✗${NC} $service"
  done
  echo ""
  echo -e "${RED}Check /tmp/*-build.log files for detailed error messages${NC}"
  exit 1
else
  echo -e "${GREEN}All services built successfully!${NC}"
  exit 0
fi
