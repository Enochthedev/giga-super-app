# Development Environment Setup Guide

## Overview

This guide establishes standardized development environment setup procedures for
the Giga Platform Architecture Split project. It ensures consistent development
experiences across all team members and supports both local development and
CI/CD workflows.

## Prerequisites

### Required Software

- **Node.js**: v18.0.0 or higher (LTS recommended)
- **npm**: v8.0.0 or higher (comes with Node.js)
- **Git**: v2.30.0 or higher
- **Docker**: v20.10.0 or higher
- **Docker Compose**: v2.0.0 or higher
- **VS Code**: Latest stable version (recommended IDE)

### Platform-Specific Tools

- **Supabase CLI**: v1.100.0 or higher
- **Railway CLI**: Latest version
- **Deno**: v1.40.0 or higher (for Supabase Edge Functions)

### Installation Commands

#### macOS (using Homebrew)

```bash
# Install Node.js and npm
brew install node

# Install Docker Desktop
brew install --cask docker

# Install Supabase CLI
brew install supabase/tap/supabase

# Install Railway CLI
npm install -g @railway/cli

# Install Deno
brew install deno
```

#### Ubuntu/Debian

```bash
# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Install Supabase CLI
npm install -g supabase

# Install Railway CLI
npm install -g @railway/cli

# Install Deno
curl -fsSL https://deno.land/x/install/install.sh | sh
```

#### Windows (using Chocolatey)

```powershell
# Install Node.js and npm
choco install nodejs

# Install Docker Desktop
choco install docker-desktop

# Install Supabase CLI
npm install -g supabase

# Install Railway CLI
npm install -g @railway/cli

# Install Deno
choco install deno
```

## Project Setup

### 1. Repository Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd giga-platform

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Install Git hooks
npm run prepare
```

### 2. Environment Configuration

#### Required Environment Variables

Create `.env.local` file with the following variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Railway Configuration (when applicable)
RAILWAY_TOKEN=your-railway-token

# External Services
PAYSTACK_SECRET_KEY=your-paystack-secret
STRIPE_SECRET_KEY=your-stripe-secret
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-certificate
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
SENDGRID_API_KEY=your-sendgrid-key
GOOGLE_MAPS_API_KEY=your-google-maps-key

# Development Settings
NODE_ENV=development
LOG_LEVEL=debug
```

#### Environment Validation

```bash
# Validate environment setup
npm run env:validate

# Test database connection
npm run db:test

# Test external services
npm run services:test
```

### 3. Database Setup

#### Local Supabase Development

```bash
# Start local Supabase instance
supabase start

# Apply migrations
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > src/types/database.ts

# Seed development data
npm run db:seed
```

#### Database Health Check

```bash
# Check database compliance
npm run db:check-compliance

# Validate RLS policies
npm run db:check-rls

# Test ACID compliance
npm run db:check-acid
```

## Docker Development Environment

### Docker Compose Configuration

#### `docker-compose.dev.yml`

```yaml
version: '3.8'

services:
  # API Gateway (Railway simulation)
  api-gateway:
    build:
      context: .
      dockerfile: docker/gateway.Dockerfile
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=development
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    volumes:
      - ./src:/app/src
      - ./package.json:/app/package.json
    depends_on:
      - redis
      - postgres

  # Social Media Service (Railway simulation)
  social-service:
    build:
      context: .
      dockerfile: docker/social.Dockerfile
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=development
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - ./services/social:/app/src
    depends_on:
      - postgres
      - redis

  # Admin Service (Railway simulation)
  admin-service:
    build:
      context: .
      dockerfile: docker/admin.Dockerfile
    ports:
      - '3002:3002'
    environment:
      - NODE_ENV=development
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - ./services/admin:/app/src
    depends_on:
      - postgres

  # Redis for caching and sessions
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  # PostgreSQL for local development
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: giga_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d

volumes:
  postgres_data:
  redis_data:
```

### Docker Commands

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop environment
docker-compose -f docker-compose.dev.yml down

# Rebuild services
docker-compose -f docker-compose.dev.yml up --build
```

## VS Code Configuration

### Recommended Extensions

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "supabase.supabase-vscode",
    "ms-vscode-remote.remote-containers",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-docker",
    "github.copilot",
    "github.copilot-chat"
  ]
}
```

### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  },
  "eslint.workingDirectories": [".", "./services/social", "./services/admin"],
  "supabase.projectRef": "your-project-ref"
}
```

### Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API Gateway",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/gateway/index.ts",
      "env": {
        "NODE_ENV": "development"
      },
      "runtimeArgs": ["-r", "ts-node/register"],
      "sourceMaps": true,
      "restart": true,
      "protocol": "inspector",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Social Service",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/services/social/index.ts",
      "env": {
        "NODE_ENV": "development"
      },
      "runtimeArgs": ["-r", "ts-node/register"],
      "sourceMaps": true
    },
    {
      "name": "Debug Edge Function",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/supabase/functions/${input:functionName}/index.ts",
      "env": {
        "SUPABASE_URL": "${env:SUPABASE_URL}",
        "SUPABASE_ANON_KEY": "${env:SUPABASE_ANON_KEY}"
      },
      "runtimeExecutable": "deno",
      "runtimeArgs": ["run", "--allow-all", "--inspect"]
    }
  ],
  "inputs": [
    {
      "id": "functionName",
      "description": "Edge function name",
      "default": "hello-world",
      "type": "promptString"
    }
  ]
}
```

## Development Workflows

### Daily Development Workflow

```bash
# 1. Start development environment
npm run dev:start

# 2. Pull latest changes
git pull origin main

# 3. Install any new dependencies
npm install

# 4. Run database migrations
npm run db:migrate

# 5. Start development servers
npm run dev

# 6. Run tests in watch mode
npm run test:watch
```

### Feature Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes and test locally
npm run test
npm run lint
npm run type-check

# 3. Run integration tests
npm run test:integration

# 4. Commit changes
git add .
git commit -m "feat: your feature description"

# 5. Push and create PR
git push origin feature/your-feature-name
```

### Database Development Workflow

```bash
# 1. Create new migration
supabase migration new your_migration_name

# 2. Edit migration file
# Edit supabase/migrations/[timestamp]_your_migration_name.sql

# 3. Apply migration locally
supabase db reset

# 4. Test migration
npm run db:test

# 5. Generate updated types
supabase gen types typescript --local > src/types/database.ts
```

## Testing Environment

### Test Configuration

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run property-based tests
npm run test:property

# Run performance tests
npm run test:performance
```

### Test Database Setup

```bash
# Create test database
createdb giga_test

# Run test migrations
NODE_ENV=test npm run db:migrate

# Seed test data
NODE_ENV=test npm run db:seed:test
```

## Code Quality Checks

### Pre-commit Hooks

The following checks run automatically before each commit:

- ESLint for code quality
- Prettier for formatting
- TypeScript type checking
- Unit tests
- Migration validation

### Manual Quality Checks

```bash
# Run all quality checks
npm run quality:check

# Fix auto-fixable issues
npm run quality:fix

# Check security vulnerabilities
npm audit

# Check for outdated dependencies
npm outdated
```

## Debugging and Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Issues

```bash
# Check database status
supabase status

# Restart local Supabase
supabase stop
supabase start

# Check connection string
echo $DATABASE_URL
```

#### 2. Environment Variable Issues

```bash
# Validate environment
npm run env:validate

# Check missing variables
npm run env:check
```

#### 3. Port Conflicts

```bash
# Check port usage
lsof -i :3000
lsof -i :5432

# Kill processes on port
kill -9 $(lsof -t -i:3000)
```

#### 4. Docker Issues

```bash
# Clean Docker environment
docker-compose down -v
docker system prune -f

# Rebuild containers
docker-compose up --build
```

### Logging and Monitoring

#### Development Logging

```bash
# View application logs
npm run logs

# View database logs
supabase logs

# View specific service logs
docker-compose logs -f api-gateway
```

#### Performance Monitoring

```bash
# Monitor database performance
npm run db:monitor

# Check memory usage
npm run monitor:memory

# Profile application
npm run profile
```

## Team Collaboration

### Code Review Process

1. **Create Feature Branch**: Always work on feature branches
2. **Write Tests**: Ensure adequate test coverage
3. **Run Quality Checks**: All checks must pass
4. **Create Pull Request**: Use PR template
5. **Peer Review**: At least one approval required
6. **Merge**: Use squash and merge

### Communication Channels

- **Daily Standups**: Development progress and blockers
- **Code Reviews**: Technical discussions and feedback
- **Architecture Decisions**: Major technical decisions
- **Bug Reports**: Issue tracking and resolution

### Documentation Standards

- **Code Comments**: Explain complex business logic
- **API Documentation**: Keep OpenAPI specs updated
- **README Updates**: Document new setup procedures
- **Migration Notes**: Document breaking changes

## Deployment Preparation

### Pre-deployment Checklist

- [ ] All tests passing
- [ ] Code quality checks passing
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Security scan completed
- [ ] Performance benchmarks met

### Staging Environment

```bash
# Deploy to staging
npm run deploy:staging

# Run smoke tests
npm run test:smoke:staging

# Validate deployment
npm run validate:staging
```

This development environment setup ensures consistency, quality, and efficiency
across the entire development team while supporting the hybrid Supabase +
Railway architecture.
