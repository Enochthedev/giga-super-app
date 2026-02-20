# GIGA Platform Postman Collections

Comprehensive Postman collections for testing all GIGA Platform services.

## 📦 Available Collections

### 1. API Gateway Collection

**File:** `API-Gateway-Collection.json`

Complete collection for the API Gateway with:

- ✅ Health checks and status endpoints
- ✅ Authentication (login, register, refresh, logout)
- ✅ Automatic token management
- ✅ Pre-request and test scripts
- ✅ Multiple response examples (success and error scenarios)
- ✅ Comprehensive documentation per endpoint

**Features:**

- Auto-stores JWT tokens after login
- Validates response structure
- Includes error handling examples
- Response time assertions

### 2. Admin Service Collection

**File:** `Admin-Service-Collection.json`

Admin dashboard and management endpoints:

- Dashboard statistics and analytics
- E-commerce management (products, orders, vendors)
- Taxi management (drivers, rides, earnings)
- Hotel management (hotels, bookings, reviews)
- Advertisement management (review, approve, reject)
- Manager operations
- Postal monitoring

### 3. Social Service Collection

**File:** `Social-Service-Collection.json` (To be created)

Social media features:

- Posts (create, read, update, delete)
- Comments and replies
- Likes and reactions
- User connections
- Feed generation
- Stories

### 4. Search Service Collection

**File:** `Search-Service-Collection.json` (To be created)

Search functionality:

- Hotel search
- Product search
- User search
- Advanced filtering
- Autocomplete

### 5. Notifications Service Collection

**File:** `Notifications-Service-Collection.json` (To be created)

Notification management:

- Send notifications
- Get notification history
- Mark as read
- Notification preferences
- Push notification testing

### 6. Delivery Service Collection

**File:** `Delivery-Service-Collection.json` (To be created)

Package delivery:

- Create delivery
- Track package
- Update status
- Driver assignment
- Delivery history

### 7. Payment Queue Service Collection

**File:** `Payment-Queue-Service-Collection.json` (To be created)

Payment processing:

- Initialize payment
- Process webhook
- Check payment status
- Refund processing
- Payment history

### 8. Taxi Realtime Service Collection

**File:** `Taxi-Realtime-Service-Collection.json` (To be created)

Real-time taxi features:

- Request ride
- Track driver location
- Update ride status
- Driver availability
- Ride history

## 🚀 Quick Start

### 1. Import Collections

1. Open Postman
2. Click "Import" button
3. Select all JSON files from this directory
4. Collections will be imported with all requests and examples

### 2. Set Up Environment

Create a new environment with these variables:

```
base_url: http://localhost:3000 (or your API Gateway URL)
auth_token: (will be auto-set after login)
user_id: (will be auto-set after login)
refresh_token: (will be auto-set after login)
```

### 3. Authenticate

1. Open "API Gateway" collection
2. Navigate to "Authentication" → "Login"
3. Update email/password in request body
4. Send request
5. Token will be automatically stored

### 4. Test Endpoints

All subsequent requests will use the stored token automatically.

## 📝 Collection Features

### Automatic Token Management

All collections include scripts that automatically:

- Store JWT tokens after login
- Include tokens in subsequent requests
- Handle token refresh
- Clear tokens on logout

### Response Validation

Test scripts validate:

- HTTP status codes
- Response structure
- Required fields
- Data types
- Response times

### Error Handling Examples

Each endpoint includes multiple response examples:

- ✅ Success responses
- ❌ Validation errors (400)
- ❌ Authentication errors (401)
- ❌ Authorization errors (403)
- ❌ Not found errors (404)
- ❌ Conflict errors (409)
- ❌ Rate limit errors (429)
- ❌ Server errors (500)

### Comprehensive Documentation

Every request includes:

- Detailed description
- Parameter documentation
- Request body examples
- Response examples
- Error scenarios
- Usage notes

## 🔧 Environment Variables

### Required Variables

| Variable        | Description          | Example                 |
| --------------- | -------------------- | ----------------------- |
| `base_url`      | API Gateway base URL | `http://localhost:3000` |
| `auth_token`    | JWT access token     | Auto-set after login    |
| `user_id`       | Current user ID      | Auto-set after login    |
| `refresh_token` | Token for refresh    | Auto-set after login    |

### Optional Variables

| Variable             | Description        | Example             |
| -------------------- | ------------------ | ------------------- |
| `admin_token`        | Admin user token   | For admin endpoints |
| `test_user_email`    | Test user email    | `test@example.com`  |
| `test_user_password` | Test user password | `password123`       |

## 📊 Testing Workflows

### 1. Complete User Flow

```
1. Register new user
2. Login
3. Get current user profile
4. Update profile
5. Perform actions (create post, book hotel, etc.)
6. Logout
```

### 2. Admin Workflow

```
1. Login as admin
2. Get dashboard stats
3. Manage products/hotels/drivers
4. Review and approve ads
5. Monitor operations
```

### 3. Error Testing

```
1. Test without authentication (401)
2. Test with invalid data (400)
3. Test with insufficient permissions (403)
4. Test with non-existent resources (404)
```

## 🎯 Best Practices

### 1. Use Environments

Create separate environments for:

- Local development
- Staging
- Production

### 2. Run Collections

Use Postman Collection Runner to:

- Test entire workflows
- Validate all endpoints
- Generate test reports

### 3. Monitor APIs

Use Postman Monitors to:

- Schedule automated tests
- Track API performance
- Get alerts on failures

### 4. Share Collections

Export and share collections with:

- Team members
- API consumers
- Documentation

## 📖 Documentation Standards

Each request follows these standards:

### Request Documentation

````markdown
# Endpoint Name

Brief description of what the endpoint does.

**Authentication:** Required/Optional **Authorization:** Roles required

**Request Parameters:**

- param1 (required): Description
- param2 (optional): Description

**Request Body:**

```json
{
  "field": "value"
}
```
````

**Success Response (200):**

```json
{
  "success": true,
  "data": {}
}
```

**Error Responses:**

- 400: Validation error
- 401: Authentication required
- 403: Insufficient permissions

```

### Response Examples

Each endpoint includes:
- Success response example
- Multiple error response examples
- Edge case examples
- Validation error details

## 🔍 Advanced Features

### Pre-request Scripts

Collections include scripts that:
- Generate dynamic data
- Set timestamps
- Create test data
- Validate prerequisites

### Test Scripts

Automated tests that:
- Validate status codes
- Check response structure
- Verify data integrity
- Measure performance
- Store variables

### Variables

Dynamic variables for:
- Authentication tokens
- User IDs
- Resource IDs
- Timestamps
- Random data

## 🐛 Troubleshooting

### Token Issues

If authentication fails:
1. Check token expiration
2. Re-login to get new token
3. Verify token format
4. Check authorization header

### Connection Issues

If requests fail:
1. Verify base_url is correct
2. Check service is running
3. Verify network connectivity
4. Check firewall settings

### Validation Errors

If getting 400 errors:
1. Check request body format
2. Verify required fields
3. Validate data types
4. Check field constraints

## 📚 Additional Resources

- [Postman Documentation](https://learning.postman.com/)
- [API Documentation](../docs/api/)
- [Swagger Specs](../docs/api/openapi-spec.yaml)
- [Authentication Guide](../docs/api/authentication-guide.md)

## 🤝 Contributing

To add new endpoints:

1. Follow existing collection structure
2. Include comprehensive documentation
3. Add multiple response examples
4. Include test scripts
5. Update this README

## 📄 License

These collections are part of the GIGA Platform project.
```
