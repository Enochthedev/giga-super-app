# API Flows Documentation

This folder contains complete API flow diagrams and implementation guides for
frontend and mobile developers.

## Available Flows

### NIPOST Admin Flows

**File**: `NIPOST_ADMIN_FLOWS.md`

Complete implementation guide for NIPOST admin dashboard including:

- DOP Dashboard - Postal staff approval flow
- PMG Dashboard - Courier approval flow
- Rejection workflows
- Error handling
- Frontend and mobile code examples
- Production API URLs (via API Gateway)

**Start here if you're building the NIPOST admin dashboard!**

## How to Use These Flows

### 1. Read the Flow Diagram

Each flow shows the complete user journey from login to completion, including:

- API endpoints to call
- Request/response examples
- Error scenarios
- Success handling

### 2. Check Request/Response Format

All examples show:

- HTTP method and endpoint
- Required headers (JWT token)
- Request body structure
- Success response format
- Error response format with codes

### 3. Implement in Your App

Use the provided code examples:

- Frontend (React/Vue/Angular)
- Mobile (React Native)
- Error handling patterns
- Token management

### 4. Test with Postman

Import collections from `postman/` folder to test APIs before implementing.

## Production API Base URL

All requests go through the API Gateway:

```
https://your-api-gateway.railway.app
```

**Never call services directly!** Always use the gateway.

## Common Patterns

### Authentication

```javascript
headers: {
  'Authorization': `Bearer ${jwtToken}`,
  'Content-Type': 'application/json'
}
```

### Error Handling

```javascript
if (!response.success) {
  switch (response.code) {
    case 'INVALID_TOKEN':
      // Redirect to login
      break;
    case 'MISSING_USER_ACCOUNT':
      // Show warning
      break;
    // ... handle other errors
  }
}
```

### Pagination

```javascript
GET /api/endpoint?page=1&limit=20
```

## Need Help?

- **Quick Reference**: `docs/nipost-admin/QUICK_START.md`
- **Detailed Guide**: `docs/nipost-admin/FRONTEND_GUIDE.md`
- **Postman Collections**: `postman/`
- **API Specs**: `docs/api/`
