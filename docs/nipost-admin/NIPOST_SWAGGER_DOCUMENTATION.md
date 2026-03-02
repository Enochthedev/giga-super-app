# NIPOST Admin API - Swagger Documentation Status

## Overview

Comprehensive Swagger/OpenAPI documentation has been added to all NIPOST admin
endpoints with detailed error case documentation.

## Swagger Documentation Added

### ✅ Complete Documentation

All 7 NIPOST admin endpoints now have comprehensive Swagger documentation
including:

- Full request/response schemas
- All query parameters with validation rules
- All error responses with examples
- Security requirements
- Detailed descriptions

### Endpoints Documented

#### 1. GET /api/nipost-admin/postal-staff/applications ✅

**Documentation Includes:**

- Query parameters: page, limit, status, staff_type, state
- Success response with pagination
- Error responses:
  - 401 Unauthorized (INVALID_TOKEN)
  - 403 Forbidden (NO_PERMISSIONS, STATE_ACCESS_DENIED)
  - 500 Internal Server Error

**Swagger Tags:** `[NIPOST Admin]`

---

#### 2. POST /api/nipost-admin/postal-staff/applications/{id}/approve ✅

**Documentation Includes:**

- Path parameter: id (uuid)
- Request body: user_id (required)
- Detailed validation requirements
- Automatic actions description
- Success response with created roles
- Error responses:
  - 400 Bad Request:
    - MISSING_USER_ID
    - MISSING_USER_ACCOUNT (staff member hasn't signed up)
    - USER_ACCOUNT_MISMATCH (user_id already set to different value)
  - 401 Unauthorized (INVALID_TOKEN)
  - 403 Forbidden (INSUFFICIENT_ROLE - not DOP)
  - 404 Not Found (APPLICATION_NOT_FOUND)
  - 500 Internal Server Error

**Special Features:**

- Detailed error examples for each validation failure
- Clear guidance on what staff member needs to do
- Explanation of automatic role creation

---

#### 3. POST /api/nipost-admin/postal-staff/applications/{id}/reject ✅

**Documentation Includes:**

- Path parameter: id (uuid)
- Request body: reason (required)
- Success response
- Error responses:
  - 400 Bad Request (MISSING_REASON)
  - 401 Unauthorized
  - 403 Forbidden (not DOP)
  - 404 Not Found
  - 500 Internal Server Error

---

#### 4. GET /api/nipost-admin/couriers/applications ✅

**Documentation Includes:**

- Query parameters: page, limit, status, state
- State-scoped filtering explanation
- Success response with courier details
- Error responses:
  - 401 Unauthorized
  - 403 Forbidden (STATE_ACCESS_DENIED for PMG)
  - 500 Internal Server Error

---

#### 5. POST /api/nipost-admin/couriers/applications/{id}/approve ✅

**Documentation Includes:**

- Path parameter: id (uuid)
- No request body required (user_id already in courier_profiles)
- State validation for PMG
- Automatic role creation
- Success response
- Error responses:
  - 400 Bad Request (validation failures)
  - 401 Unauthorized
  - 403 Forbidden:
    - INSUFFICIENT_ROLE (not PMG/DOP)
    - STATE_MISMATCH (PMG trying to approve courier from different state)
  - 404 Not Found
  - 500 Internal Server Error

**Special Features:**

- Detailed STATE_MISMATCH error with courier state vs PMG state
- Explanation of automatic COURIER role creation

---

#### 6. POST /api/nipost-admin/couriers/applications/{id}/reject ✅

**Documentation Includes:**

- Path parameter: id (uuid)
- Request body: reason (required)
- State validation for PMG
- Success response
- Error responses:
  - 400 Bad Request (MISSING_REASON)
  - 401 Unauthorized
  - 403 Forbidden (STATE_MISMATCH)
  - 404 Not Found
  - 500 Internal Server Error

---

#### 7. GET /api/nipost-admin/my-permissions ✅

**Documentation Includes:**

- No parameters required
- Success response with full permission details
- Error responses:
  - 401 Unauthorized
  - 500 Internal Server Error

---

## Swagger Components

### Schemas Defined

#### ErrorResponse

```yaml
ErrorResponse:
  type: object
  properties:
    success:
      type: boolean
      example: false
    error:
      type: string
      description: Human-readable error message
    code:
      type: string
      description: Machine-readable error code
    details:
      type: object
      description: Additional error context
```

### Security Schemes

#### BearerAuth

```yaml
BearerAuth:
  type: http
  scheme: bearer
  bearerFormat: JWT
  description: JWT token from Supabase Auth
```

## Error Code Documentation

All error codes are fully documented with examples:

| Code                  | HTTP Status | Description                         | Example                                                                                       |
| --------------------- | ----------- | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| MISSING_USER_ID       | 400         | user_id not provided                | "You must provide the user_id of the staff member to approve"                                 |
| MISSING_USER_ACCOUNT  | 400         | Staff member hasn't created account | "The staff member must create their user account before approval. Ask them to sign up first." |
| USER_ACCOUNT_MISMATCH | 400         | Trying to change user_id            | "Cannot change user_id after it has been set"                                                 |
| MISSING_REASON        | 400         | Rejection reason not provided       | "Rejection reason is required"                                                                |
| APPLICATION_NOT_FOUND | 404         | Application doesn't exist           | "Application not found"                                                                       |
| STATE_MISMATCH        | 403         | PMG accessing different state       | "Cannot approve courier from different state"                                                 |
| INVALID_TOKEN         | 401         | JWT token invalid                   | "Invalid token"                                                                               |
| NO_PERMISSIONS        | 403         | No NIPOST admin permissions         | "No admin permissions found for this user"                                                    |
| STATE_ACCESS_DENIED   | 403         | PMG accessing different state       | "Access denied to this state"                                                                 |
| INSUFFICIENT_ROLE     | 403         | Wrong role for operation            | "Insufficient role permissions"                                                               |

## Accessing Swagger Documentation

### Local Development

```bash
# Start admin service
cd admin-service
npm run dev

# Open Swagger UI
open http://localhost:3005/api-docs
```

### Production

```bash
# Swagger UI
https://admin-service-production.up.railway.app/api-docs

# OpenAPI JSON
https://admin-service-production.up.railway.app/api-docs.json
```

## Swagger UI Features

The Swagger UI provides:

- **Interactive API Testing**: Try out endpoints directly from the browser
- **Authentication**: Add JWT token once, use for all requests
- **Request Examples**: Pre-filled examples for all endpoints
- **Response Examples**: See all possible responses with status codes
- **Schema Validation**: Automatic validation of request bodies
- **Error Documentation**: All error cases with examples

## Testing with Swagger UI

### Step 1: Authenticate

1. Click "Authorize" button
2. Enter JWT token: `Bearer <your-token>`
3. Click "Authorize"

### Step 2: Test Endpoints

1. Expand endpoint (e.g., GET /api/nipost-admin/postal-staff/applications)
2. Click "Try it out"
3. Fill in parameters
4. Click "Execute"
5. View response

### Step 3: Test Error Cases

1. Try without authentication → 401 Unauthorized
2. Try with wrong role → 403 Forbidden
3. Try with invalid data → 400 Bad Request
4. Try with non-existent ID → 404 Not Found

## Postman Collection

A Postman collection can be generated from the Swagger spec:

```bash
# Export OpenAPI spec
curl http://localhost:3005/api-docs.json > nipost-admin-api.json

# Import into Postman
# File → Import → Upload nipost-admin-api.json
```

## Code Generation

The Swagger spec can be used to generate client SDKs:

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i http://localhost:3005/api-docs.json \
  -g typescript-axios \
  -o ./generated-client

# Generate Python client
openapi-generator-cli generate \
  -i http://localhost:3005/api-docs.json \
  -g python \
  -o ./generated-client-python
```

## Documentation Maintenance

### Adding New Endpoints

When adding new NIPOST admin endpoints:

1. **Add Swagger JSDoc comments** above route handler:

```typescript
/**
 * @swagger
 * /api/nipost-admin/new-endpoint:
 *   post:
 *     tags: [NIPOST Admin]
 *     summary: Brief description
 *     description: Detailed description
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/new-endpoint', authenticate, async (req, res) => {
  // Handler code
});
```

2. **Document all error cases** with examples
3. **Include validation rules** in parameter descriptions
4. **Add request/response examples**
5. **Test in Swagger UI**

### Updating Existing Endpoints

When modifying endpoints:

1. Update Swagger comments
2. Add new error codes if introduced
3. Update request/response schemas
4. Test changes in Swagger UI
5. Regenerate client SDKs if needed

## Summary

✅ **All 7 NIPOST admin endpoints fully documented** ✅ **All error cases
documented with examples** ✅ **Swagger UI accessible at /api-docs** ✅
**OpenAPI spec available at /api-docs.json** ✅ **Interactive testing enabled**
✅ **Client SDK generation supported** ✅ **Postman collection export
supported**

The NIPOST Admin API is now fully documented and ready for frontend integration!
