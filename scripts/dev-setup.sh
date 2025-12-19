#!/bin/bash

# Development Environment Setup Script
# This script automates the initial setup of the development environment

set -e

echo "🚀 Setting up Giga Platform development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "Node.js $NODE_VERSION is installed"
    else
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_status "npm $NPM_VERSION is installed"
    else
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_status "Docker is installed: $DOCKER_VERSION"
    else
        print_warning "Docker is not installed. Some features may not work."
    fi
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version)
        print_status "Docker Compose is installed: $COMPOSE_VERSION"
    else
        print_warning "Docker Compose is not installed. Local services may not work."
    fi
    
    # Check Supabase CLI
    if command -v supabase &> /dev/null; then
        SUPABASE_VERSION=$(supabase --version)
        print_status "Supabase CLI is installed: $SUPABASE_VERSION"
    else
        print_warning "Supabase CLI is not installed. Installing now..."
        npm install -g supabase
    fi
    
    # Check Deno
    if command -v deno &> /dev/null; then
        DENO_VERSION=$(deno --version | head -n 1)
        print_status "Deno is installed: $DENO_VERSION"
    else
        print_warning "Deno is not installed. Edge functions may not work locally."
    fi
}

# Install project dependencies
install_dependencies() {
    echo "📦 Installing project dependencies..."
    
    if [ -f "package.json" ]; then
        npm install
        print_status "Project dependencies installed"
    else
        print_error "package.json not found. Are you in the project root?"
        exit 1
    fi
}

# Setup environment variables
setup_environment() {
    echo "🔧 Setting up environment variables..."
    
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            print_status "Created .env.local from .env.example"
            print_warning "Please update .env.local with your actual values"
        else
            print_error ".env.example not found"
            exit 1
        fi
    else
        print_status ".env.local already exists"
    fi
}

# Setup Git hooks
setup_git_hooks() {
    echo "🔗 Setting up Git hooks..."
    
    if [ -f "package.json" ] && grep -q "husky" package.json; then
        npm run prepare
        print_status "Git hooks installed"
    else
        print_warning "Husky not configured in package.json"
    fi
}

# Initialize Supabase
init_supabase() {
    echo "🗄️ Initializing Supabase..."
    
    if [ -d "supabase" ]; then
        print_status "Supabase directory already exists"
        
        # Check if Supabase is running
        if supabase status &> /dev/null; then
            print_status "Supabase is already running"
        else
            print_status "Starting Supabase..."
            supabase start
        fi
        
        # Apply migrations
        print_status "Applying database migrations..."
        supabase db reset --debug
        
        # Generate types
        print_status "Generating TypeScript types..."
        mkdir -p src/types
        supabase gen types typescript --local > src/types/database.ts
        
    else
        print_warning "Supabase directory not found. Skipping Supabase initialization."
    fi
}

# Setup Docker environment
setup_docker() {
    echo "🐳 Setting up Docker environment..."
    
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        if [ -f "docker-compose.dev.yml" ]; then
            print_status "Building Docker images..."
            docker-compose -f docker-compose.dev.yml build
            print_status "Docker environment ready"
        else
            print_warning "docker-compose.dev.yml not found"
        fi
    else
        print_warning "Docker not available. Skipping Docker setup."
    fi
}

# Run initial tests
run_tests() {
    echo "🧪 Running initial tests..."
    
    # Type checking
    if npm run type-check &> /dev/null; then
        print_status "TypeScript compilation successful"
    else
        print_warning "TypeScript compilation failed. Check your code."
    fi
    
    # Linting
    if npm run lint &> /dev/null; then
        print_status "Linting passed"
    else
        print_warning "Linting failed. Run 'npm run lint:fix' to auto-fix issues."
    fi
    
    # Unit tests
    if npm run test &> /dev/null; then
        print_status "Unit tests passed"
    else
        print_warning "Some unit tests failed. Check test output."
    fi
}

# Validate environment
validate_environment() {
    echo "✅ Validating environment setup..."
    
    # Check if environment variables are set
    if [ -f ".env.local" ]; then
        source .env.local
        
        if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
            print_status "Supabase configuration found"
        else
            print_warning "Supabase configuration incomplete in .env.local"
        fi
        
        if [ -n "$DATABASE_URL" ]; then
            print_status "Database URL configured"
        else
            print_warning "Database URL not configured"
        fi
    fi
    
    # Test database connection
    if command -v supabase &> /dev/null && supabase status &> /dev/null; then
        print_status "Database connection successful"
    else
        print_warning "Cannot connect to database"
    fi
}

# Main setup function
main() {
    echo "🎯 Giga Platform Development Environment Setup"
    echo "============================================="
    
    check_prerequisites
    install_dependencies
    setup_environment
    setup_git_hooks
    init_supabase
    setup_docker
    run_tests
    validate_environment
    
    echo ""
    echo "🎉 Development environment setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Update .env.local with your actual API keys and configuration"
    echo "2. Run 'npm run dev' to start the development server"
    echo "3. Run 'docker-compose -f docker-compose.dev.yml up' for full stack development"
    echo "4. Visit http://localhost:3000 to see the application"
    echo ""
    echo "For more information, see docs/development/environment-setup.md"
}

# Run main function
main "$@"