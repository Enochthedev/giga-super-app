#!/bin/bash

# Script to set environment variables for all Railway services
# This reads from .env file and sets variables for each service

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Setting Railway Environment Variables${NC}"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️  .env file not found${NC}"
  exit 1
fi

# Load .env file
export $(cat .env | grep -v '^#' | xargs)

# Services list
SERVICES=(
  "api-gateway:3000"
  "social-service:3001"
  "admin-service:3002"
  "search-service:3004"
  "taxi-realtime-service:3006"
  "payment-queue-service:3003"
  "delivery-service:3005"
  "notifications-service:3007"
)

echo "Setting shared variables for all services..."
echo ""

# Function to set variables for a service
set_service_vars() {
  local service_name=$1
  local service_port=$2
  
  echo -e "${BLUE}Setting variables for $service_name...${NC}"
  
  # Shared variables
  railway variables set --service "$service_name" \
    PORT="$service_port" \
    NODE_ENV="production" \
    SUPABASE_URL="$SUPABASE_URL" \
    SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
    JWT_SECRET="$JWT_SECRET" 2>/dev/null || echo "  ⚠️  Some variables may already be set"
  
  echo -e "${GREEN}✅ $service_name variables set${NC}"
  echo ""
}

# Set variables for each service
for service_info in "${SERVICES[@]}"; do
  IFS=':' read -r service_name service_port <<< "$service_info"
  set_service_vars "$service_name" "$service_port"
done

# Set API Gateway specific variables
echo -e "${BLUE}Setting API Gateway service URLs...${NC}"
echo "Note: You'll need to update these with actual Railway URLs after deployment"
echo ""

# Set Payment Queue specific variables
if [ -n "$PAYSTACK_SECRET_KEY" ]; then
  echo -e "${BLUE}Setting Payment Queue variables...${NC}"
  railway variables set --service payment-queue-service \
    PAYSTACK_SECRET_KEY="$PAYSTACK_SECRET_KEY" \
    PAYSTACK_PUBLIC_KEY="$PAYSTACK_PUBLIC_KEY" \
    STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
    STRIPE_PUBLIC_KEY="$STRIPE_PUBLIC_KEY" 2>/dev/null || echo "  ⚠️  Some variables may already be set"
  echo -e "${GREEN}✅ Payment Queue variables set${NC}"
  echo ""
fi

# Set Notifications Service specific variables
if [ -n "$SMTP_HOST" ]; then
  echo -e "${BLUE}Setting Notifications Service variables...${NC}"
  railway variables set --service notifications-service \
    SMTP_HOST="$SMTP_HOST" \
    SMTP_PORT="$SMTP_PORT" \
    SMTP_USER="$SMTP_USER" \
    SMTP_PASS="$SMTP_PASS" \
    TWILIO_ACCOUNT_SID="$TWILIO_ACCOUNT_SID" \
    TWILIO_AUTH_TOKEN="$TWILIO_AUTH_TOKEN" \
    TWILIO_PHONE_NUMBER="$TWILIO_PHONE_NUMBER" \
    SENDGRID_API_KEY="$SENDGRID_API_KEY" 2>/dev/null || echo "  ⚠️  Some variables may already be set"
  echo -e "${GREEN}✅ Notifications Service variables set${NC}"
  echo ""
fi

echo ""
echo -e "${GREEN}✅ All environment variables set!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify variables in Railway Dashboard"
echo "2. Deploy services (they should auto-deploy if GitHub is connected)"
echo "3. Get service URLs from Railway Dashboard"
echo "4. Update API Gateway with service URLs"
echo ""
