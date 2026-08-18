# Documentation Index

Complete index of all documentation in the GIGA platform.

## ⚠️ Which doc should I trust?

Several API docs in this repo are stale and contradict each other. Ranked by accuracy,
**most accurate first**:

| Rank | Source | Why | Last verified |
|---|---|---|---|
| 1 | **`postman/collections/`** | every request was actually sent to production; each carries its real status | 2026-08-18 |
| 2 | **`docs/API_VERIFICATION_2026-08-18.md`** | the live behaviour report + all 14 known defects | 2026-08-18 |
| 3 | **`bruno/giga-api/`** | generated from the route definitions, covers all 335 routes | 2026-08-18 |
| 4 | **`/api-docs/`** on the gateway | generated from deployed code — but see V9/V10/V11: `/docs/{service}/` is a redirect loop, notifications & hotels specs are incomplete | live |
| ⛔ | `postman/*.json` (repo root), `postman/API_REFERENCE.md`, `API_DOCUMENTATION_COMPLETE.md`, `QUICK_API_REFERENCE.md` | 2025-12 → 2026-02; predate ~6 months of route changes | stale |

The Swagger UI URL is **`/api-docs/`** — with the trailing slash. `/docs/admin/` is an infinite
redirect (defect V9); raw JSON per service still works at `/docs/{service}/json`.

## 🚀 Quick Navigation

### For Frontend/Mobile Developers

**Start Here**: `../postman/collections/README.md`, then `flows/NIPOST_ADMIN_FLOWS.md`

### For Backend Developers

**Start Here**: `API_VERIFICATION_2026-08-18.md`, then `ARCHITECTURE_CLEANUP.md`

---

## 📁 Documentation Structure

### `flows/` - API Flows ⭐

**Purpose**: Complete API flows for frontend and mobile implementation

Files:

- `README.md` - How to use flow documentation
- `NIPOST_ADMIN_FLOWS.md` - Complete NIPOST admin flows with code examples

**Who needs this**: Frontend and mobile developers

---

### `nipost-admin/` - NIPOST Admin System

**Purpose**: Complete documentation for NIPOST admin hierarchy system

Files:

- `README.md` - Overview and quick start
- `QUICK_START.md` - Cheat sheet and quick reference
- `FRONTEND_GUIDE.md` - Detailed implementation guide
- `ARCHITECTURE.md` - System design and role hierarchy
- `WORKFLOWS.md` - Approval workflows and business logic
- `API_REFERENCE.md` - Endpoint summary
- `IMPLEMENTATION_SUMMARY.md` - Implementation status

**Who needs this**: Frontend, mobile, and backend developers working on NIPOST
admin

---

### `api/` - API Specifications

**Purpose**: OpenAPI specs, Swagger docs, test data

Files:

- `openapi-spec.yaml` - OpenAPI 3.0 specification
- `GIGA_DASHBOARD_SWAGGER.yaml` - Dashboard API spec
- `GIGA_API_Postman_Collection.json` - Postman collection
- `GIGA_API_TEST_DATA.yaml` - Test data examples

**Who needs this**: All developers

---

### `deployment/` - Deployment Guides

**Purpose**: Railway deployment, GitHub Actions, Docker, environment setup

Files:

- Railway deployment guides
- GitHub Actions CI/CD setup
- Docker configuration
- Environment variable guides
- Health check configuration

**Who needs this**: Backend developers, DevOps

---

### `database/` - Database Documentation

**Purpose**: Database schemas, migrations, types

Files:

- `DATABASE_TYPES_GUIDE.md` - TypeScript types for database

**Who needs this**: Backend developers

---

### `specs/` - Service Specifications

**Purpose**: Detailed specifications for each service

Files:

- `DELIVERY_SERVICE_SPEC.md` - Delivery service specification
- `NOTIFICATIONS_SERVICE_SPEC.md` - Notifications service specification
- `SERVICE_SPECIFICATIONS.md` - All service specifications
- `SAAS_PAYMENT_INTEGRATION.md` - Payment integration guide

**Who needs this**: Backend developers

---

### `quick-reference/` - Quick Guides

**Purpose**: Quick reference guides and checklists

Files:

- Quick command references
- Action checklists
- Environment variable guides

**Who needs this**: All developers

---

### `analysis/` - Architecture Analysis

**Purpose**: Architecture analysis and comparisons

Files:

- Architecture comparisons
- Endpoint analysis
- Dashboard API analysis

**Who needs this**: Backend developers, architects

---

### `development/` - Development Guides

**Purpose**: Development environment setup and code quality

Files:

- `environment-setup.md` - Development environment setup
- `code-quality.md` - Code quality standards

**Who needs this**: All developers

---

### `archive/` - Archived Documentation

**Purpose**: Old documentation kept for reference

**Who needs this**: Reference only, not actively maintained

---

## 🎯 Common Tasks

### Task: Implement NIPOST Admin Dashboard

1. Read `flows/NIPOST_ADMIN_FLOWS.md`
2. Read `nipost-admin/QUICK_START.md`
3. Import Postman collection from `../postman/`
4. Test APIs
5. Implement using code examples

### Task: Deploy Service to Railway

1. Read `deployment/RAILWAY_DEPLOYMENT_GUIDE.md`
2. Configure environment variables
3. Deploy service
4. Test health endpoints

### Task: Add Database Migration

1. Read `database/DATABASE_TYPES_GUIDE.md`
2. Create migration in `../supabase/migrations/`
3. Test locally
4. Deploy to Supabase

### Task: Integrate External Service

1. Read `specs/` for service specifications
2. Check API documentation in `api/`
3. Implement integration
4. Test with Postman

---

## 📚 Documentation by Role

### Frontend Developer

1. `flows/NIPOST_ADMIN_FLOWS.md` - **START HERE**
2. `nipost-admin/QUICK_START.md`
3. `nipost-admin/FRONTEND_GUIDE.md`
4. `api/` - API specifications

### Mobile Developer

1. `flows/NIPOST_ADMIN_FLOWS.md` - **START HERE** (has mobile examples)
2. `nipost-admin/QUICK_START.md`
3. `nipost-admin/FRONTEND_GUIDE.md` (check mobile sections)
4. `api/` - API specifications

### Backend Developer

1. `ARCHITECTURE_CLEANUP.md` - **START HERE**
2. `deployment/` - Deployment guides
3. `database/` - Database documentation
4. `specs/` - Service specifications
5. `nipost-admin/ARCHITECTURE.md` - NIPOST system design

### DevOps Engineer

1. `deployment/` - **START HERE**
2. `development/environment-setup.md`
3. `quick-reference/` - Quick guides

### Project Manager

1. `../README.md` - **START HERE**
2. `nipost-admin/README.md` - NIPOST overview
3. `archive/` - Historical documentation

---

## 🔍 Finding Documentation

### By Topic

**Authentication & Authorization**:

- `nipost-admin/ARCHITECTURE.md` - Role hierarchy
- `flows/NIPOST_ADMIN_FLOWS.md` - Auth patterns

**API Integration**:

- `flows/NIPOST_ADMIN_FLOWS.md` - Complete flows
- `api/` - API specifications
- `../postman/` - Postman collections

**Deployment**:

- `deployment/` - All deployment guides

**Database**:

- `database/` - Database documentation
- `../supabase/migrations/` - Migration files

**Services**:

- `specs/` - Service specifications
- `ARCHITECTURE_CLEANUP.md` - Architecture overview

---

## 📞 Getting Help

### For Implementation Questions

1. Check relevant documentation folder
2. Review code examples in `flows/`
3. Test with Postman collections
4. Check `quick-reference/` for quick answers

### For Architecture Questions

1. Read `ARCHITECTURE_CLEANUP.md`
2. Check `analysis/` folder
3. Review service specs in `specs/`

### For Deployment Questions

1. Check `deployment/` folder
2. Review environment setup in `development/`
3. Check quick reference guides

---

## ✨ Documentation Standards

### File Naming

- Use descriptive names: `NIPOST_ADMIN_FLOWS.md`
- Use UPPERCASE for major docs
- Use lowercase for supporting docs

### Organization

- Group by purpose (flows, specs, deployment)
- Keep related docs together
- Archive old docs, don't delete

### Content

- Include code examples
- Use production URLs (API Gateway)
- Provide error handling patterns
- Include mobile considerations

---

## 🎉 Key Documentation

### Most Important Files

1. `flows/NIPOST_ADMIN_FLOWS.md` - Complete API flows
2. `nipost-admin/FRONTEND_GUIDE.md` - Implementation guide
3. `ARCHITECTURE_CLEANUP.md` - Architecture overview
4. `deployment/` - Deployment guides

### Quick Reference

1. `nipost-admin/QUICK_START.md` - NIPOST cheat sheet
2. `quick-reference/` - Quick guides
3. `../README.md` - Project overview

---

**Last Updated**: 2024 **Total Documentation Files**: 40+ **Organization**: By
purpose and role **Status**: ✅ Complete and organized
