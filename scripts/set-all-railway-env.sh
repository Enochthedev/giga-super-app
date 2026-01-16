#!/bin/bash

# Set environment variables for all Railway services
# This script helps you set common environment variables across all services

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Railway Environment Variables Setup (All Services)     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo -e "${YELLOW}Install it with: brew install railway${NC}"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo -e "${YELLOW}Run: railway login${NC}"
    exit 1
fi

echo -e "${YELLOW}This script will set environment variables for all services.${NC}"
echo -e "${YELLOW}You'll need to provide values for common variables.${NC}"
echo ""

# Prompt for common environment variables
echo -e "${BLUE}Enter common environment variables:${NC}"
echo ""

read -p "SUPABASE_URL: " SUPABASE_URL
read -p "SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
read -sp "SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
echo ""
read -sp "JWT_SECRET: " JWT_SECRET
echo ""
read -p "JWT_EXPIRES_IN (default: 7d): " JWT_EXPIRES_IN
JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-7d}

echo ""
echo -e "${BLUE}Enter service-specific variables (press Enter to skip):${NC}"
echo ""

# Payment service variables
echo -e "${YELLOW}Payment Queue Service:${NC}"
read -sp "PAYSTACK_SECRET_KEY (optional): " PAYSTACK_SECRET_KEY
echo ""
read -sp "STRIPE_SECRET_KEY (optional): " STRIPE_SECRET_KEY
echo ""
read -p "REDIS_URL for payment (optional): " PAYMENT_REDIS_URL
echo ""

# Notifications service variables
echo -e "${YELLOW}Notifications Service:${NC}"
read -sp "SENDGRID_API_KEY (optional): " SENDGRID_API_KEY
echo ""
read -p "TWILIO_ACCOUNT_SID (optional): " TWILIO_ACCOUNT_SID
read -sp "TWILIO_AUTH_TOKEN (optional): " TWILIO_AUTH_TOKEN
echo ""
read -p "TWILIO_PHONE_NUMBER (optional): " TWILIO_PHONE_NUMBER
echo ""

# Taxi realtime service variables
echo -e "${YELLOW}Taxi Realtime Service:${NC}"
read -p "GOOGLE_MAPS_API_KEY (optional): " GOOGLE_MAPS_API_KEY
read -p "REDIS_URL for taxi (optional): " TAXI_REDIS_URL
echo ""

# Search service variables
echo -e "${YELLOW}Search Service:${NC}"
read -p "ALGOLIA_APP_ID (optional): " ALGOLIA_APP_ID
read -sp "ALGOLIA_API_KEY (optional): " ALGOLIA_API_KEY
echo ""
echo ""

# Service configurations
declare -a services=("social-service" "admin-service" "payment-queue-service" "search-service" "delivery-service" "taxi-realtime-service" "notifications-service")
declare -a ports=("3001" "3002" "3003" "3004" "3005" "3006" "3007")

echo -e "${BLUE}Setting environment variables for all services...${NC}"
echo ""

# Function to set variables for a service
set_service_env() {
    local service=$1
    local port=$2
    
    echo -e "${BLUE}Setting variables for ${service}...${NC}"
    
    # Link to service
    cd "${service}"
    
    # Set common variables
    railway variables --set SUPABASE_URL="${SUPABASE_URL}"
    railway variables --set SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"
    railway variables --set SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
    railway variables --set JWT_SECRET="${JWT_SECRET}"
    railway variables --set JWT_EXPIRES_IN="${JWT_EXPIRES_IN}"
    railway variables --set NODE_ENV="production"
    railway variables --set LOG_LEVEL="info"
    railway variables --set PORT="${port}"
    
    # Set service-specific variables
    case $service in
        "payment-queue-service")
            if [ ! -z "$PAYSTACK_SECRET_KEY" ]; then
                railway variables --set PAYSTACK_SECRET_KEY="${PAYSTACK_SECRET_KEY}"
            fi
            if [ ! -z "$STRIPE_SECRET_KEY" ]; then
                railway variables --set STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY}"
            fi
            if [ ! -z "$PAYMENT_REDIS_URL" ]; then
                railway variables --set REDIS_URL="${PAYMENT_REDIS_URL}"
            fi
            ;;
        "notifications-service")
            if [ ! -z "$SENDGRID_API_KEY" ]; then
                railway variables --set SENDGRID_API_KEY="${SENDGRID_API_KEY}"
            fi
            if [ ! -z "$TWILIO_ACCOUNT_SID" ]; then
                railway variables --set TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID}"
            fi
            if [ ! -z "$TWILIO_AUTH_TOKEN" ]; then
                railway variables --set TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN}"
            fi
            if [ ! -z "$TWILIO_PHONE_NUMBER" ]; then
                railway variables --set TWILIO_PHONE_NUMBER="${TWILIO_PHONE_NUMBER}"
            fi
            ;;
        "taxi-realtime-service")
            if [ ! -z "$GOOGLE_MAPS_API_KEY" ]; then
                railway variables --set GOOGLE_MAPS_API_KEY="${GOOGLE_MAPS_API_KEY}"
            fi
            if [ ! -z "$TAXI_REDIS_URL" ]; then
                railway variables --set REDIS_URL="${TAXI_REDIS_URL}"
            fi
            ;;
        "search-service")
            if [ ! -z "$ALGOLIA_APP_ID" ]; then
                railway variables --set ALGOLIA_APP_ID="${ALGOLIA_APP_ID}"
            fi
            if [ ! -z "$ALGOLIA_API_KEY" ]; then
                railway variables --set ALGOLIA_API_KEY="${ALGOLIA_API_KEY}"
            fi
            ;;
    esac
    
    cd ..
    echo -e "${GREEN}✅ Variables set for ${service}${NC}"
    echo ""
}

# Set variables for each service
for i in "${!services[@]}"; do
    service="${services[$i]}"
    port="${ports[$i]}"
    
    if [ -d "$service" ]; then
        set_service_env "$service" "$port"
    else
        echo -e "${YELLOW}⚠️  Directory ${service} not found, skipping...${NC}"
    fi
done

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Environment Variables Set for All Services!            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Verify variables in Railway dashboard"
echo -e "  2. Deploy services: ${GREEN}railway up${NC} (in each service directory)"
echo -e "  3. Or wait for GitHub auto-deployment"
echo ""
