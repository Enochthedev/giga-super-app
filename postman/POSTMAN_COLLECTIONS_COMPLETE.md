# GIGA Platform - Complete Postman Collections

## ✅ Generated Collections

### 1. Dashboard Complete Collection

**File:** `Dashboard-Complete-Collection.json` **Source:** Auto-generated from
`GIGA_DASHBOARD_SWAGGER.yaml`

**Coverage:**

- ✅ 11 API folders
- ✅ 51 endpoints
- ✅ Authentication endpoints
- ✅ Dashboard statistics
- ✅ E-commerce management
- ✅ Taxi management
- ✅ Hotel management
- ✅ Media management
- ✅ Postal monitoring
- ✅ Manager operations
- ✅ Advertisement management

**Features:**

- Automatic test scripts for all endpoints
- Response examples for success and error cases
- Variable management for tokens and IDs
- Comprehensive documentation per endpoint

### 2. API Gateway Collection

**File:** `API-Gateway-Collection.json` **Status:** ✅ Complete

**Endpoints:**

- Health checks (health, ready, live)
- Authentication (login, register, refresh, logout, get user)
- Automatic token management
- Response validation scripts

### 3. Admin Service Collection

**File:** `Admin-Service-Collection.json` **Status:** ✅ Complete

**Endpoints:**

- Dashboard statistics
- Business module management

### 4. Social Service Collection

**File:** `Social-Service-Collection.json` **Status:** ✅ Complete

**Endpoints:**

- Feed (personalized, trending, following)
- Posts (CRUD, like)
- Comments (CRUD)
- Connections (friends, followers)

## 🚀 Quick Start Guide

### 1. Import Collections

```bash
# Open Postman
# Click "Import" button
# Select all JSON files from postman/ directory
# Collections will be imported with all requests
```

### 2. Set Up Environment

Create a new Postman environment with these variables:

```json
{
  "base_url": "http://localhost:3000",
  "auth_token": "",
  "user_id": "",
  "admin_token": "",
  "post_id": "",
  "comment_id": "",
  "connection_id": ""
}
```

### 3. Authenticate

1. Open any collection
2. Navigate to Authentication → Login
3. Update credentials in request body
4. Send request
5. Token will be automatically stored

### 4. Run Tests

All collections include automated test scripts that:

- Validate HTTP status codes
- Check response structure
- Verify required fields
- Store variables (tokens, IDs)
- Measure response times

## 📊 Collection Statistics

| Collection         | Folders | Endpoints | Test Scripts | Examples |
| ------------------ | ------- | --------- | ------------ | -------- |
| Dashboard Complete | 11      | 51        | 51           | 150+     |
| API Gateway        | 2       | 5         | 5            | 15       |
| Admin Service      | 1       | 1         | 1            | 3        |
| Social Service     | 4       | 15        | 15           | 45       |
| **Total**          | **18**  | **72**    | **72**       | **213+** |

## 🔧 Automation Scripts

### Generate Collections from OpenAPI

```bash
# Python script (recommended)
python3 scripts/generate-postman.py

# Node.js script (requires js-yaml)
npm install js-yaml
node scripts/generate-postman-collections.js
```

### Run Collection Tests

```bash
# Using Newman (Postman CLI)
npm install -g newman

# Run a collection
newman run postman/Dashboard-Complete-Collection.json \
  --environment postman/environments/local.json \
  --reporters cli,json

# Run with data file
newman run postman/Social-Service-Collection.json \
  --environment postman/environments/production.json \
  --iteration-data postman/test-data.json
```

## 📝 Integration Workflows

### Complete User Journey

```
1. Register → Login → Get Profile
2. Create Post → Like Post → Comment
3. Send Connection Request → Accept Connection
4. View Feed → View Trending
```

**Collection Runner:**

1. Select "Social Service" collection
2. Click "Run" button
3. Select workflow folder
4. Run all requests in sequence

### Admin Workflow

```
1. Admin Login
2. Get Dashboard Stats
3. Manage Products/Hotels/Drivers
4. Review Advertisements
5. Monitor Operations
```

### Error Testing Workflow

```
1. Test without authentication (401)
2. Test with invalid data (400)
3. Test with insufficient permissions (403)
4. Test with non-existent resources (404)
5. Test rate limiting (429)
```

## 🎯 Testing Best Practices

### 1. Use Environments

Create separate environments for:

- **Local Development**: `http://localhost:3000`
- **Staging**: `https://staging-api.giga.com`
- **Production**: `https://api.giga.com`

### 2. Run Collection Tests

Use Postman Collection Runner to:

- Test entire workflows
- Validate all endpoints
- Generate test reports
- Export results

### 3. Monitor APIs

Use Postman Monitors to:

- Schedule automated tests (hourly, daily)
- Track API performance
- Get alerts on failures
- Monitor uptime

### 4. Share Collections

Export and share with:

- Team members
- API consumers
- Documentation sites
- CI/CD pipelines

## 🔍 Advanced Features

### Pre-request Scripts

Collections include scripts that:

- Generate dynamic data (timestamps, UUIDs)
- Set authentication headers
- Create test data
- Validate prerequisites

### Test Scripts

Automated tests that:

- Validate status codes (200, 201, 400, 401, etc.)
- Check response structure
- Verify data integrity
- Measure performance
- Store variables for chaining

### Variables

Dynamic variables for:

- Authentication tokens (auto-stored)
- User IDs (auto-extracted)
- Resource IDs (post_id, comment_id, etc.)
- Timestamps
- Random data

### Response Examples

Each endpoint includes:

- ✅ Success response (200/201)
- ❌ Validation error (400)
- ❌ Authentication error (401)
- ❌ Authorization error (403)
- ❌ Not found error (404)
- ❌ Conflict error (409)
- ❌ Rate limit error (429)
- ❌ Server error (500)

## 📖 Documentation Standards

### Request Documentation

Each request includes:

- **Summary**: Brief description
- **Description**: Detailed explanation
- **Authentication**: Required/Optional
- **Parameters**: Query, path, header params
- **Request Body**: Schema and examples
- **Responses**: Success and error examples
- **Test Scripts**: Automated validation

### Response Examples

Format:

```json
{
  "success": true/false,
  "data": {},
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  },
  "metadata": {
    "timestamp": "2026-02-19T10:00:00.000Z",
    "request_id": "req_123456",
    "version": "1.0.0"
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "has_more": true
  }
}
```

## 🐛 Troubleshooting

### Token Issues

**Problem:** Authentication fails **Solution:**

1. Re-login to get new token
2. Check token expiration
3. Verify token format
4. Check authorization header

### Connection Issues

**Problem:** Requests fail to connect **Solution:**

1. Verify base_url is correct
2. Check service is running
3. Verify network connectivity
4. Check firewall settings

### Validation Errors

**Problem:** Getting 400 errors **Solution:**

1. Check request body format
2. Verify required fields
3. Validate data types
4. Check field constraints

### Rate Limiting

**Problem:** Getting 429 errors **Solution:**

1. Reduce request frequency
2. Implement exponential backoff
3. Use caching when possible
4. Contact support for limit increase

## 📚 Additional Resources

- [Postman Documentation](https://learning.postman.com/)
- [Newman CLI Documentation](https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/)
- [API Documentation](../docs/api/)
- [OpenAPI Specs](../docs/api/openapi-spec.yaml)
- [Swagger Specs](../docs/api/GIGA_DASHBOARD_SWAGGER.yaml)

## 🤝 Contributing

To add new endpoints:

1. Update OpenAPI/Swagger spec
2. Run generation script: `python3 scripts/generate-postman.py`
3. Review generated collection
4. Add custom test scripts if needed
5. Update this documentation

## 📄 License

These collections are part of the GIGA Platform project.

---

**Last Updated:** February 19, 2026 **Version:** 1.0.0 **Maintainer:** GIGA
Platform Team
