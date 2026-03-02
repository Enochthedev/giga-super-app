# GIGA Platform

Multi-service platform with API Gateway, microservices architecture, and
comprehensive admin dashboard.

## 🚀 Quick Start

### For Frontend/Mobile Developers

- **NIPOST Admin Flows**: See `docs/flows/NIPOST_ADMIN_FLOWS.md`
- **API Documentation**: Check `docs/api/` folder
- **Postman Collections**: See `postman/` folder

### For Backend Developers

- **Architecture**: See `docs/ARCHITECTURE_CLEANUP.md`
- **Deployment**: See `docs/deployment/`
- **Database**: See `docs/database/`

## 📁 Project Structure

```
giga/
├── api-gateway/          # API Gateway (Port 3000)
├── admin-service/        # Admin Service (Port 3005)
├── social-service/       # Social Media Service (Port 3001)
├── search-service/       # Search Service (Port 3007)
├── hotels-service/       # Hotels Service (Port 3008)
├── delivery-service/     # Delivery Service (Port 3003)
├── payment-queue-service/# Payment Queue (Port 3002)
├── taxi-realtime-service/# Taxi Realtime (Port 3006)
├── notifications-service/# Notifications (Port 3004)
├── shared/               # Shared utilities
├── docs/                 # Documentation
│   ├── api/             # API specs and Swagger
│   ├── flows/           # User flows and diagrams
│   ├── nipost-admin/    # NIPOST admin documentation
│   ├── deployment/      # Deployment guides
│   ├── database/        # Database documentation
│   ├── specs/           # Service specifications
│   ├── quick-reference/ # Quick reference guides
│   ├── analysis/        # Architecture analysis
│   └── archive/         # Archived documentation
├── scripts/             # Deployment and utility scripts
├── postman/             # Postman collections
└── supabase/            # Supabase migrations and functions
```

## 🔑 Key Documentation

### For Frontend/Mobile

1. **NIPOST Admin Flows** - `docs/flows/NIPOST_ADMIN_FLOWS.md`
   - Complete API flows with examples
   - Frontend and mobile implementations
   - Error handling patterns

2. **NIPOST Admin Guide** - `docs/nipost-admin/`
   - Quick start guide
   - Frontend implementation guide
   - Architecture overview

3. **Postman Collections** - `postman/`
   - Import and test all APIs
   - Pre-configured environments

### For Backend

1. **Architecture** - `docs/ARCHITECTURE_CLEANUP.md`
2. **Deployment** - `docs/deployment/`
3. **Service Specs** - `docs/specs/`

## 🌐 Production URLs

**API Gateway**: `https://your-api-gateway.railway.app`

All API requests go through the gateway:

- Admin APIs: `/api/admin/*`
- Social APIs: `/api/social/*`
- Search APIs: `/api/search/*`
- Hotels APIs: `/api/hotels/*`

## 🛠️ Development

### Prerequisites

- Node.js >= 20.0.0
- npm >= 8.0.0
- Supabase account
- Railway account (for deployment)

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Fill in your environment variables
# See docs/quick-reference/ENV_VARIABLES.md

# Start all services
npm run dev
```

### Individual Services

```bash
npm run dev:gateway    # API Gateway (3000)
npm run dev:admin      # Admin Service (3005)
npm run dev:social     # Social Service (3001)
```

## 📚 Documentation Index

### Essential Docs (Keep in Root)

- `README.md` - This file
- `START_HERE.md` - Getting started guide
- `.env.example` - Environment template

### Organized Documentation

- `docs/flows/` - User flows and API flows
- `docs/nipost-admin/` - NIPOST admin system
- `docs/api/` - API specifications
- `docs/deployment/` - Deployment guides
- `docs/database/` - Database documentation
- `docs/specs/` - Service specifications
- `docs/quick-reference/` - Quick guides
- `docs/analysis/` - Architecture analysis
- `docs/archive/` - Old documentation (reference only)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific service tests
npm test -- api-gateway
npm test -- admin-service

# Run with coverage
npm run test:coverage
```

## 🚢 Deployment

See `docs/deployment/` for detailed deployment guides:

- Railway deployment
- GitHub Actions CI/CD
- Environment configuration
- Health checks

## 📞 Support

- **Frontend/Mobile**: Check `docs/flows/NIPOST_ADMIN_FLOWS.md`
- **Backend**: Check `docs/deployment/`
- **API Issues**: Import Postman collections for testing

## 📝 License

Proprietary - All rights reserved
