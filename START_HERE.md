# Start Here - GIGA Platform

## 👋 Welcome!

Choose your path based on your role:

---

## 🎨 Frontend/Mobile Developer

### NIPOST Admin Dashboard

**Start Here**: `docs/flows/NIPOST_ADMIN_FLOWS.md`

This file contains:

- ✅ Complete API flows with diagrams
- ✅ Frontend and mobile code examples
- ✅ Error handling patterns
- ✅ Production API URLs (via API Gateway)
- ✅ All endpoints with request/response examples

**Also Check**:

- `docs/nipost-admin/QUICK_START.md` - Quick reference
- `docs/nipost-admin/FRONTEND_GUIDE.md` - Detailed implementation guide
- `postman/` - Import collections for testing

### Other Features

Check `docs/api/` for:

- OpenAPI specifications
- Swagger documentation
- Test data examples

---

## 🔧 Backend Developer

### Architecture

**Start Here**: `docs/ARCHITECTURE_CLEANUP.md`

### Deployment

**Check**: `docs/deployment/`

- Railway deployment guides
- GitHub Actions setup
- Environment configuration

### Database

**Check**: `docs/database/`

- Schema documentation
- Migration guides
- Database types

---

## 🚀 Quick Setup

### 1. Clone and Install

```bash
git clone <repo>
cd giga
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Fill in your values (see docs/quick-reference/ENV_VARIABLES.md)
```

### 3. Start Development

```bash
# All services
npm run dev

# Or individual services
npm run dev:gateway    # API Gateway (3000)
npm run dev:admin      # Admin Service (3005)
```

---

## 📚 Documentation Structure

```
docs/
├── flows/              ← Frontend/Mobile: Start here!
│   └── NIPOST_ADMIN_FLOWS.md
├── nipost-admin/       ← NIPOST admin documentation
│   ├── QUICK_START.md
│   ├── FRONTEND_GUIDE.md
│   └── ...
├── api/                ← API specifications
├── deployment/         ← Deployment guides
├── database/           ← Database documentation
├── specs/              ← Service specifications
└── quick-reference/    ← Quick guides
```

---

## 🎯 Common Tasks

### Frontend: Implement NIPOST Admin

1. Read `docs/flows/NIPOST_ADMIN_FLOWS.md`
2. Import Postman collection from `postman/`
3. Test APIs with your JWT token
4. Implement flows in your app

### Backend: Deploy Service

1. Read `docs/deployment/RAILWAY_DEPLOYMENT_GUIDE.md`
2. Configure environment variables
3. Deploy to Railway
4. Test health endpoints

### Database: Add Migration

1. Read `docs/database/DATABASE_TYPES_GUIDE.md`
2. Create migration in `supabase/migrations/`
3. Test locally
4. Deploy to Supabase

---

## 🆘 Need Help?

### Frontend/Mobile

- **API Flows**: `docs/flows/NIPOST_ADMIN_FLOWS.md`
- **Quick Start**: `docs/nipost-admin/QUICK_START.md`
- **Postman**: Import collections from `postman/`

### Backend

- **Architecture**: `docs/ARCHITECTURE_CLEANUP.md`
- **Deployment**: `docs/deployment/`
- **Database**: `docs/database/`

### General

- **Quick Reference**: `docs/quick-reference/`
- **Service Specs**: `docs/specs/`

---

## ✨ Key Features

### NIPOST Admin System

- DOP (Director of Postal Operations) - National level
- PMG (Postmaster General) - State level
- Automatic role creation on approval
- State-scoped access control

### API Gateway

- Centralized routing
- Rate limiting
- Authentication
- Request/response logging

### Microservices

- Admin Service (3005)
- Social Service (3001)
- Search Service (3007)
- Hotels Service (3008)
- Delivery Service (3003)
- And more...

---

## 🚦 Next Steps

1. **Choose your role** (Frontend/Mobile or Backend)
2. **Read the relevant documentation** (see above)
3. **Set up your environment** (`.env` file)
4. **Start coding!**

**Remember**: All API requests go through the API Gateway in production!

Production URL: `https://your-api-gateway.railway.app`
