#!/bin/bash

# Railway Deployment Script for Giga Platform
# This script automates the deployment of all 8 microservices to Railway

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service directories in deployment order
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

# Function to print colored output
print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Function to check if Railway CLI is installed
check_railway_cli() {
  if ! command -v railway &> /dev/null; then
    print_error "Railway CLI is not installed"
    echo "Install it with: npm install -g @railway/cli"
    echo "Or with Homebrew: brew install railway"
    exit 1
  fi
  print_success "Railway CLI is installed"
}

# Function to check if logged in to Railway
check_railway_auth() {
  if ! railway whoami &> /dev/null; then
    print_error "Not logged in to Railway"
    echo "Run: railway login"
    exit 1
  fi
  print_success "Logged in to Railway as $(railway whoami)"
}

# Function to check if project is linked
check_railway_project() {
  if ! railway status &> /dev/null; then
    print_warning "No Railway project linked"
    echo "Would you like to:"
    echo "1. Create a new project"
    echo "2. Link to an existing project"
    read -p "Enter choice (1 or 2): " choice
    
    case $choice in
      1)
        print_info "Creating new Railway project..."
        railway init
        ;;
      2)
        print_info "Linking to existing project..."
        railway link
        ;;
      *)
        print_error "Invalid choice"
        exit 1
        ;;
    esac
  fi
  print_success "Railway project linked"
}

# Function to check if Redis is provisioned
check_redis() {
  print_info "Checking Redis provisioning..."
  
  # This is a placeholder - Railway doesn't have a direct CLI command to check plugins
  print_warning "Please ensure Redis is provisioned in Railway dashboard"
  echo "Go to: Railway Dashboard → Your Project → New → Database → Add Redis"
  read -p "Press Enter when Redis is provisioned..."
  
  print_success "Redis check completed"
}

# Function to set shared environment variables
set_shared_variables() {
  print_info "Setting shared environment variables..."
  
  # Check if .env file exists
  if [ ! -f .env ]; then
    print_warning ".env file not found"
    echo "Please create .env file from .env.example"
    read -p "Press Enter when .env is ready..."
  fi
  
  # Load .env file
  export $(cat .env | grep -v '^#' | xargs)
  
  # Set Supabase variables (shared by all services)
  if [ -n "$SUPABASE_URL" ]; then
    print_info "Setting SUPABASE_URL..."
    railway variables set SUPABASE_URL="$SUPABASE_URL"
  fi
  
  if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    print_info "Setting SUPABASE_SERVICE_ROLE_KEY..."
    railway variables set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
  fi
  
  if [ -n "$JWT_SECRET" ]; then
    print_info "Setting JWT_SECRET..."
    railway variables set JWT_SECRET="$JWT_SECRET"
  fi
  
  print_success "Shared variables set"
}

# Function to deploy a single service
deploy_service() {
  local service_dir=$1
  local service_port=$2
  
  print_info "Deploying $service_dir..."
  
  # Check if service directory exists
  if [ ! -d "$service_dir" ]; then
    print_error "Service directory $service_dir not found"
    return 1
  fi
  
  # Navigate to service directory
  cd "$service_dir"
  
  # Set service-specific PORT variable
  print_info "Setting PORT=$service_port for $service_dir..."
  railway variables set --service "$service_dir" PORT="$service_port" || true
  
  # Deploy service
  print_info "Deploying $service_dir to Railway..."
  railway up --service "$service_dir" || {
    print_error "Failed to deploy $service_dir"
    cd ..
    return 1
  }
  
  # Wait for deployment to complete
  print_info "Waiting for deployment to complete..."
  sleep 10
  
  # Get service URL
  SERVICE_URL=$(railway domain --service "$service_dir" 2>/dev/null || echo "")
  
  if [ -n "$SERVICE_URL" ]; then
    print_success "$service_dir deployed to: https://$SERVICE_URL"
    
    # Test health endpoint
    print_info "Testing health endpoint..."
    if curl -f -s "https://$SERVICE_URL/health" > /dev/null; then
      print_success "Health check passed for $service_dir"
    else
      print_warning "Health check failed for $service_dir (may need time to start)"
    fi
  else
    print_warning "Could not get service URL for $service_dir"
  fi
  
  # Return to root directory
  cd ..
  
  print_success "$service_dir deployment completed"
  echo ""
}

# Function to update API Gateway service URLs
update_gateway_urls() {
  print_info "Updating API Gateway service URLs..."
  
  # Get URLs for all services
  declare -A SERVICE_URLS
  
  for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service_dir service_port <<< "$service_info"
    
    if [ "$service_dir" != "api-gateway" ]; then
      SERVICE_URL=$(railway domain --service "$service_dir" 2>/dev/null || echo "")
      if [ -n "$SERVICE_URL" ]; then
        # Convert service-dir to UPPER_SNAKE_CASE_URL
        VAR_NAME=$(echo "$service_dir" | tr '[:lower:]' '[:upper:]' | tr '-' '_')_URL
        SERVICE_URLS[$VAR_NAME]="https://$SERVICE_URL"
        print_info "$VAR_NAME=https://$SERVICE_URL"
      fi
    fi
  done
  
  # Set variables for API Gateway
  for var_name in "${!SERVICE_URLS[@]}"; do
    railway variables set --service api-gateway "$var_name=${SERVICE_URLS[$var_name]}"
  done
  
  # Restart API Gateway to pick up new URLs
  print_info "Restarting API Gateway..."
  railway restart --service api-gateway
  
  print_success "API Gateway URLs updated"
}

# Function to run smoke tests
run_smoke_tests() {
  print_info "Running smoke tests..."
  
  # Get API Gateway URL
  GATEWAY_URL=$(railway domain --service api-gateway 2>/dev/null || echo "")
  
  if [ -z "$GATEWAY_URL" ]; then
    print_warning "Could not get API Gateway URL, skipping smoke tests"
    return
  fi
  
  GATEWAY_URL="https://$GATEWAY_URL"
  print_info "Testing API Gateway at: $GATEWAY_URL"
  
  # Test health endpoint
  if curl -f -s "$GATEWAY_URL/health" > /dev/null; then
    print_success "API Gateway health check passed"
  else
    print_error "API Gateway health check failed"
    return 1
  fi
  
  print_success "Smoke tests completed"
}

# Function to display deployment summary
display_summary() {
  echo ""
  echo "=========================================="
  print_success "DEPLOYMENT SUMMARY"
  echo "=========================================="
  echo ""
  
  print_info "Deployed Services:"
  for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service_dir service_port <<< "$service_info"
    SERVICE_URL=$(railway domain --service "$service_dir" 2>/dev/null || echo "Not available")
    echo "  • $service_dir (port $service_port): https://$SERVICE_URL"
  done
  
  echo ""
  print_info "Next Steps:"
  echo "  1. Update webhook URLs in external services (Paystack, Stripe)"
  echo "  2. Configure custom domains (optional)"
  echo "  3. Set up monitoring and alerts"
  echo "  4. Run comprehensive integration tests"
  echo "  5. Monitor error rates for 48 hours"
  echo ""
  
  print_info "Useful Commands:"
  echo "  • View logs: railway logs --service <service-name> --follow"
  echo "  • View variables: railway variables --service <service-name>"
  echo "  • Restart service: railway restart --service <service-name>"
  echo "  • Rollback: railway rollback --service <service-name>"
  echo ""
  
  print_success "Deployment completed successfully! 🚀"
}

# Main deployment flow
main() {
  echo "=========================================="
  echo "  Giga Platform - Railway Deployment"
  echo "=========================================="
  echo ""
  
  # Pre-deployment checks
  print_info "Running pre-deployment checks..."
  check_railway_cli
  check_railway_auth
  check_railway_project
  check_redis
  
  # Set shared variables
  read -p "Do you want to set shared environment variables? (y/n): " set_vars
  if [ "$set_vars" = "y" ]; then
    set_shared_variables
  fi
  
  echo ""
  print_info "Ready to deploy ${#SERVICES[@]} services"
  read -p "Continue with deployment? (y/n): " continue_deploy
  
  if [ "$continue_deploy" != "y" ]; then
    print_warning "Deployment cancelled"
    exit 0
  fi
  
  # Deploy services in order
  echo ""
  print_info "Starting deployment..."
  echo ""
  
  for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service_dir service_port <<< "$service_info"
    deploy_service "$service_dir" "$service_port"
    
    # Pause between deployments
    if [ "$service_dir" != "notifications-service" ]; then
      print_info "Waiting 30 seconds before next deployment..."
      sleep 30
    fi
  done
  
  # Update API Gateway URLs
  echo ""
  read -p "Update API Gateway service URLs? (y/n): " update_urls
  if [ "$update_urls" = "y" ]; then
    update_gateway_urls
  fi
  
  # Run smoke tests
  echo ""
  read -p "Run smoke tests? (y/n): " run_tests
  if [ "$run_tests" = "y" ]; then
    run_smoke_tests
  fi
  
  # Display summary
  display_summary
}

# Run main function
main
