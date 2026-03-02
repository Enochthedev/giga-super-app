# NIPOST Admin Hierarchy System

Complete documentation for the NIPOST (Nigerian Postal Service) admin hierarchy
system.

## Quick Start

**For Frontend Developers**: Start with the Swagger UI documentation at:

```
http://localhost:3005/api-docs
```

All NIPOST admin endpoints are fully documented with:

- Request/response schemas
- Authentication requirements
- Error codes and examples
- Validation rules

## Documentation Structure

- [API Reference](./API_REFERENCE.md) - Complete endpoint documentation
- [Frontend Guide](./FRONTEND_GUIDE.md) - Implementation guide for frontend
  developers
- [Architecture](./ARCHITECTURE.md) - System design and hierarchy overview
- [Workflows](./WORKFLOWS.md) - Approval workflows and business logic

## System Overview

### Two Separate Worlds

**World 1 - The App (unchanged)**:

- CUSTOMER, VENDOR, HOST, DRIVER, ADVERTISER roles
- User-facing application functionality

**World 2 - NIPOST Admin Dashboard (new)**:

- DOP (Director of Postal Operations) - National level, full admin access
- PMG (Postmaster General) - State-level postal monitoring + courier approval
- REGIONAL_MANAGER - Read-only regional oversight
- MODULE_ADMIN - Module-specific dashboard access
- COURIER - Delivery operations

## Key Features

✅ **Automatic Role Creation**: Approval triggers automatically create roles and
permissions ✅ **State-Scoped Access**: PMG can only manage their assigned state
✅ **User Account Validation**: Staff must create account before DOP approval ✅
**Comprehensive Swagger Docs**: All endpoints fully documented ✅ **Audit
Logging**: All actions tracked for compliance

## API Endpoints

All endpoints are prefixed with `/api/nipost-admin`:

### Postal Staff Management (DOP only)

- `GET /postal-staff/applications` - List applications
- `POST /postal-staff/applications/:id/approve` - Approve staff
- `POST /postal-staff/applications/:id/reject` - Reject staff

### Courier Management (PMG or DOP)

- `GET /couriers/applications` - List courier applications
- `POST /couriers/applications/:id/approve` - Approve courier
- `POST /couriers/applications/:id/reject` - Reject courier

### User Permissions

- `GET /my-permissions` - Get current user's permissions

## Authentication

All endpoints require JWT Bearer token:

```
Authorization: Bearer <jwt_token>
```

## Getting Started

1. **Backend**: Admin service runs on port 3005
2. **Swagger UI**: Visit http://localhost:3005/api-docs
3. **Frontend**: Follow the [Frontend Guide](./FRONTEND_GUIDE.md)

## Support

For questions or issues, refer to the Swagger documentation first. All error
codes and validation rules are documented there.
