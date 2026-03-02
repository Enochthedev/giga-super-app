# NIPOST Admin API Reference

## Base URL

```
http://localhost:3005/api/nipost-admin
```

## Authentication

All endpoints require JWT Bearer token from Supabase Auth.

## Swagger Documentation

Complete interactive documentation available at:

```
http://localhost:3005/api-docs
```

The Swagger UI provides:

- Interactive API testing
- Complete request/response schemas
- All error codes with examples
- Authentication testing
- Example requests and responses

## Quick Reference

### Endpoints Summary

| Method | Endpoint                                 | Role Required | Description                    |
| ------ | ---------------------------------------- | ------------- | ------------------------------ |
| GET    | `/postal-staff/applications`             | PMG+          | List postal staff applications |
| POST   | `/postal-staff/applications/:id/approve` | DOP           | Approve postal staff           |
| POST   | `/postal-staff/applications/:id/reject`  | DOP           | Reject postal staff            |
| GET    | `/couriers/applications`                 | PMG+          | List courier applications      |
| POST   | `/couriers/applications/:id/approve`     | PMG+          | Approve courier                |
| POST   | `/couriers/applications/:id/reject`      | PMG+          | Reject courier                 |
| GET    | `/my-permissions`                        | Any           | Get user permissions           |

### Role Hierarchy

- **DOP**: Full access nationwide
- **PMG**: State-scoped access
- **PMG+**: PMG or DOP

## Detailed Documentation

For complete API documentation including:

- Full request/response schemas
- All query parameters
- All error codes
- Validation rules
- Example requests

**Visit the Swagger UI**: http://localhost:3005/api-docs
