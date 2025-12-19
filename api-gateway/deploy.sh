#!/bin/bash

# Giga API Gateway Deployment Script
set -e

echo "🚀 Starting Giga API Gateway deployment..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run:"
    echo "   railway login"
    exit 1
fi

# Validate environment variables
echo "🔍 Validating environment variables..."

required_vars=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY" 
    "SUPABASE_SERVICE_ROLE_KEY"
    "JWT_SECRET"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        echo "   Please set it with: railway variables set $var=your-value"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Build and test locally first
echo "🔨 Building and testing locally..."
npm ci
npm run lint
npm test

echo "✅ Local build and tests passed"

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

# Wait for deployment to complete
echo "⏳ Waiting for deployment to complete..."
sleep 30

# Get the deployment URL
DEPLOYMENT_URL=$(railway domain)
if [ -z "$DEPLOYMENT_URL" ]; then
    echo "⚠️  No custom domain configured. Using Railway-generated URL..."
    DEPLOYMENT_URL=$(railway status --json | jq -r '.deployments[0].url')
fi

# Health check
echo "🏥 Performing health check..."
if curl -f -s "$DEPLOYMENT_URL/health" > /dev/null; then
    echo "✅ Health check passed!"
    echo "🎉 Deployment successful!"
    echo "📍 Gateway URL: $DEPLOYMENT_URL"
    echo ""
    echo "📊 Service endpoints:"
    echo "   Health: $DEPLOYMENT_URL/health"
    echo "   Detailed Health: $DEPLOYMENT_URL/health/detailed"
    echo "   Admin Dashboard: $DEPLOYMENT_URL/admin/services"
    echo ""
    echo "🔗 API Base URL: $DEPLOYMENT_URL/api/v1"
else
    echo "❌ Health check failed!"
    echo "🔍 Check Railway logs: railway logs"
    exit 1
fi

echo "✨ Deployment complete!"