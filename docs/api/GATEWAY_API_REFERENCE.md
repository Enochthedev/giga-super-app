# Giga Platform API Gateway Reference

## Base URL

**Production**: `https://giga-giga-production.up.railway.app`

All API requests go through the unified API Gateway.

## Authentication

All endpoints (except health checks and public endpoints) require JWT
authentication.

### Getting a Token

Authenticate via Supabase Auth to get a JWT token:

```bash
# Login via API Gateway
POST https://giga-giga-production.up.railway.app/api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

# Response includes JWT token
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "...",
    "user": { ... }
  }
}
```

### Using the Token

Include the JWT token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### JWT Secret Configuration

**IMPORTANT**: All Railway services must use the **Supabase JWT Secret** (not
the anon key) for token validation.

Get your JWT Secret from: **Supabase Dashboard → Settings → API → JWT Secret**

Set this in your Railway service environment variables:

```bash
JWT_SECRET=your-supabase-jwt-secret-from-dashboard
```

This ensures consistent token validation across all services (both Supabase and
Railway).

## API Structure

All endpoints follow the pattern: `/api/v1/{service}/{resource}`

### Services Routed Through Gateway

#### Supabase Services (Edge Functions)

- **Authentication**: `/api/v1/auth*`, `/api/v1/user*`
- **Hotels**: `/api/v1/hotel*`, `/api/v1/booking*`, `/api/v1/room*`
- **Payments**: `/api/v1/payment*`, `/api/v1/wallet*`
- **E-commerce**: `/api/v1/product*`, `/api/v1/cart*`, `/api/v1/order*`
- **Taxi**: `/api/v1/ride*`, `/api/v1/driver*`

#### Railway Services (Microservices)

- **Social Media**: `/api/v1/social*`, `/api/v1/post*`, `/api/v1/comment*`,
  `/api/v1/like*`, `/api/v1/feed*`, `/api/v1/stor*`
- **Admin**: `/api/v1/admin*`, `/api/v1/dashboard*`, `/api/v1/nipost*`
- **Search**: `/api/v1/search*`
- **Payment Queue**: `/api/v1/payment-queue*`
- **Delivery**: `/api/v1/delivery*`, `/api/v1/courier*`, `/api/v1/tracking*`
- **Notifications**: `/api/v1/notifications*`, `/api/v1/push*`, `/api/v1/alert*`
- **Taxi Realtime**: `/api/v1/taxi-realtime*`, `/api/v1/driver-location*`

**Note**: Patterns use prefix matching (e.g., `/api/v1/courier*` matches both
`/api/v1/couriers` and `/api/v1/couriers/123`).

## Public Endpoints (No Auth Required)

### Gateway Health

```
GET /health
```

### Service Health Checks

```
GET /api/v1/social/health
GET /api/v1/admin/health
GET /api/v1/search/health
GET /api/v1/delivery/health
GET /api/v1/notifications/health
GET /api/v1/taxi-realtime/health
```

### API Documentation

```
GET /api/v1/social/api-docs
GET /api/v1/admin/api-docs
GET /api/v1/search/api-docs
GET /api/v1/delivery/api-docs
GET /api/v1/notifications/api-docs
```

## Migrated Functions (Now on Railway)

### Social Media Service

Previously Supabase edge functions, now Railway microservice:

- **Posts Management**
  - `POST /api/v1/posts` - Create post
  - `GET /api/v1/posts` - List posts
  - `GET /api/v1/posts/:id` - Get post details
  - `PUT /api/v1/posts/:id` - Update post
  - `DELETE /api/v1/posts/:id` - Delete post

- **Comments**
  - `POST /api/v1/posts/:postId/comments` - Add comment
  - `GET /api/v1/posts/:postId/comments` - List comments
  - `PUT /api/v1/posts/:postId/comments/:id` - Update comment
  - `DELETE /api/v1/posts/:postId/comments/:id` - Delete comment

- **Likes**
  - `POST /api/v1/posts/:postId/like` - Like post
  - `DELETE /api/v1/posts/:postId/like` - Unlike post
  - `GET /api/v1/posts/:postId/likes` - Get likes

- **Feed**
  - `GET /api/v1/feed` - Get personalized feed
  - `GET /api/v1/feed/trending` - Get trending posts
  - `GET /api/v1/feed/recommended` - Get recommended posts

- **Stories**
  - `POST /api/v1/stories` - Create story
  - `GET /api/v1/stories` - Get stories
  - `DELETE /api/v1/stories/:id` - Delete story

- **Connections**
  - `POST /api/v1/connections` - Send connection request
  - `GET /api/v1/connections` - List connections
  - `PUT /api/v1/connections/:id` - Accept/reject request

### Admin Service

NIPOST administrative functions, now Railway microservice:

- **National Level**
  - `GET /api/v1/admin/national/dashboard` - National HQ dashboard
  - `GET /api/v1/admin/national/financial-summary` - National financial summary
  - `GET /api/v1/admin/national/states` - List all states

- **State Level**
  - `GET /api/v1/admin/state/:stateId/dashboard` - State dashboard
  - `GET /api/v1/admin/state/:stateId/branches` - List state branches
  - `GET /api/v1/admin/state/:stateId/financial-summary` - State financial
    summary

- **Branch Level**
  - `GET /api/v1/admin/branch/:branchId/dashboard` - Branch dashboard
  - `GET /api/v1/admin/branch/:branchId/transactions` - Branch transactions
  - `GET /api/v1/admin/branch/:branchId/analytics` - Branch analytics

- **Audit Trail**
  - `GET /api/v1/admin/audit-trail` - View audit logs

### Search Service

Unified search across all modules, now Railway microservice:

- **Unified Search**
  - `GET /api/v1/search?q={query}&type={type}` - Search all content
  - `GET /api/v1/search/hotels?q={query}` - Search hotels
  - `GET /api/v1/search/products?q={query}` - Search products
  - `GET /api/v1/search/drivers?q={query}` - Search drivers

### Delivery Service

Package delivery and courier management, now Railway microservice:

- **Packages**
  - `POST /api/v1/delivery/packages` - Create delivery
  - `GET /api/v1/delivery/packages` - List packages
  - `GET /api/v1/delivery/packages/:id` - Get package details
  - `PUT /api/v1/delivery/packages/:id` - Update package

- **Couriers**
  - `GET /api/v1/delivery/couriers` - List couriers
  - `GET /api/v1/delivery/couriers/:id` - Get courier details
  - `PUT /api/v1/delivery/couriers/:id/location` - Update courier location

- **Tracking**
  - `GET /api/v1/delivery/tracking/:trackingNumber` - Track package

### Notifications Service

Push notifications, email, and SMS, now Railway microservice:

- **Notifications**
  - `POST /api/v1/notifications` - Send notification
  - `GET /api/v1/notifications` - List user notifications
  - `PUT /api/v1/notifications/:id/read` - Mark as read
  - `DELETE /api/v1/notifications/:id` - Delete notification

- **Preferences**
  - `GET /api/v1/notifications/preferences` - Get notification preferences
  - `PUT /api/v1/notifications/preferences` - Update preferences

- **Templates**
  - `GET /api/v1/notifications/templates` - List templates
  - `POST /api/v1/notifications/templates` - Create template

### Payment Queue Service

Asynchronous payment processing, now Railway microservice:

- **Queue Management**
  - `POST /api/v1/payment-queue/enqueue` - Add payment to queue
  - `GET /api/v1/payment-queue/status/:id` - Check payment status
  - `GET /api/v1/payment-queue/metrics` - Queue metrics

### Taxi Realtime Service

Real-time driver location and ride tracking, now Railway microservice:

- **Driver Location**
  - `POST /api/v1/taxi-realtime/location` - Update driver location
  - `GET /api/v1/taxi-realtime/nearby-drivers` - Find nearby drivers

## Supabase Functions (Still on Supabase)

These functions remain on Supabase and are proxied through the API Gateway. They
are accessed via `/api/v1/*` and routed to Supabase edge functions at
`/functions/v1/*`.

### Authentication & User Management (8 functions)

**Auth Level**: Public for login/register, User for profile operations

- `POST /api/v1/auth/login` - User authentication with email/password
- `POST /api/v1/auth/register` - New user account creation
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - JWT token refresh
- `POST /api/v1/auth/reset-password` - Password reset functionality
- `POST /api/v1/auth/verify-email` - Email verification process
- `GET /api/v1/users/profile` - Get user profile information
- `PUT /api/v1/users/profile` - Update user profile data
- `PUT /api/v1/users/change-password` - User password change

### Hotel Management (15 functions)

**Auth Level**: Public for listings, User for bookings

- `GET /api/v1/hotels` - List hotels with filtering (Public)
- `GET /api/v1/hotels/:id` - Get hotel details (Public)
- `GET /api/v1/hotels/search` - Hotel search with location/filters (Public)
- `POST /api/v1/bookings` - Create new hotel reservation (User)
- `GET /api/v1/bookings` - Get user's booking history (User)
- `GET /api/v1/bookings/:id` - Get booking details (User)
- `PUT /api/v1/bookings/:id` - Update existing booking (User)
- `DELETE /api/v1/bookings/:id` - Cancel hotel reservation (User)
- `GET /api/v1/rooms` - List available rooms (Public)
- `GET /api/v1/rooms/:id/availability` - Check room availability (Public)
- `POST /api/v1/hotels/:id/reviews` - Submit hotel review (User)
- `GET /api/v1/hotels/:id/reviews` - Get hotel reviews (Public)
- `POST /api/v1/hotels/:id/photos` - Upload hotel images (User)
- `GET /api/v1/hotels/:id/amenities` - List hotel amenities (Public)
- `POST /api/v1/bookings/calculate-price` - Calculate booking total (Public)

### Payment Processing (11 functions)

**Auth Level**: User for payments, Service for webhooks

- `POST /api/v1/payments/initialize` - Start payment process (User)
- `POST /api/v1/payments/verify` - Verify payment status (User)
- `POST /api/v1/payments/webhook` - Handle payment provider webhooks (Service)
- `POST /api/v1/payments/refund` - Process payment refunds (User)
- `GET /api/v1/payments/history` - Get payment history (User)
- `PUT /api/v1/payments/status` - Update payment status (Service)
- `GET /api/v1/payments/calculate-fees` - Calculate payment fees (Public)
- `GET /api/v1/payments/methods` - List user payment methods (User)
- `POST /api/v1/payments/methods` - Add new payment method (User)
- `DELETE /api/v1/payments/methods/:id` - Remove payment method (User)
- `POST /api/v1/payments/payout` - Process vendor payouts (Admin)

### Wallet & Financial (6 functions)

**Auth Level**: User for wallet operations

- `GET /api/v1/wallet` - Get user wallet balance (User)
- `POST /api/v1/wallet/topup` - Add money to wallet (User)
- `POST /api/v1/wallet/withdraw` - Withdraw from wallet (User)
- `POST /api/v1/wallet/transfer` - Transfer between wallets (User)
- `GET /api/v1/wallet/transactions` - Wallet transaction history (User)
- `POST /api/v1/wallet/escrow` - Handle escrow transactions (Service)

### E-commerce (8 functions)

**Auth Level**: Public for catalog, User for cart/orders

- `GET /api/v1/products` - List products with filtering (Public)
- `GET /api/v1/products/:id` - Get product details (Public)
- `POST /api/v1/cart` - Add product to shopping cart (User)
- `GET /api/v1/cart` - Get user's cart (User)
- `PUT /api/v1/cart/:id` - Update cart item quantity (User)
- `DELETE /api/v1/cart/:id` - Remove item from cart (User)
- `POST /api/v1/orders` - Create order from cart (User)
- `GET /api/v1/orders` - Get user's order history (User)

### Taxi/Ride Services (10 functions)

**Auth Level**: User for bookings, Driver for driver operations

- `POST /api/v1/rides` - Request a taxi ride (User)
- `GET /api/v1/rides` - Get ride history (User)
- `GET /api/v1/rides/:id` - Get ride details (User)
- `PUT /api/v1/rides/:id` - Update ride (User/Driver)
- `DELETE /api/v1/rides/:id` - Cancel ride request (User/Driver)
- `GET /api/v1/rides/estimate` - Calculate ride fare estimate (User)
- `GET /api/v1/drivers` - Find nearby drivers (User)
- `POST /api/v1/rides/:id/accept` - Driver accepts ride request (Driver)
- `POST /api/v1/rides/:id/start` - Start ride trip (Driver)
- `POST /api/v1/rides/:id/complete` - Complete ride trip (Driver)
- `POST /api/v1/rides/:id/rate` - Rate completed ride (User)
- `PUT /api/v1/drivers/location` - Update driver GPS location (Driver)

### Utility Functions (7 Supabase functions)

**Auth Level**: Mixed (Public, User, Service)

- `GET /api/v1/settings` - Get platform configuration (Public)
- `POST /api/v1/notifications/send` - Send push notifications (Service)
- `GET /api/v1/notifications` - Get user notifications (User)
- `PUT /api/v1/notifications/:id/read` - Mark notification as read (User)
- `POST /api/v1/email/send` - Send email notifications (Service)
- `POST /api/v1/sms/send` - Send SMS notifications (Service)
- `POST /api/v1/activity/log` - Log user activity events (Service)

## Response Format

All responses follow this structure:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2026-01-17T07:00:00.000Z",
    "request_id": "req_123",
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

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... }
  },
  "metadata": {
    "timestamp": "2026-01-17T07:00:00.000Z",
    "request_id": "req_123",
    "version": "1.0.0"
  }
}
```

## Error Codes

- `AUTHENTICATION_REQUIRED` - No auth token provided
- `INVALID_TOKEN` - Invalid or expired token
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable
- `PROXY_ERROR` - Error communicating with backend service
- `INTERNAL_SERVER_ERROR` - Unexpected server error

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Authenticated**: Higher limits based on user tier
- Rate limit headers included in response:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Headers

### Request Headers

- `Authorization: Bearer <token>` - JWT authentication token
- `Content-Type: application/json` - Request content type
- `X-Client-Version: 1.0.0` - Client version (optional)

### Response Headers

- `X-Service-ID` - Which service handled the request
- `X-Service-Platform` - Platform (supabase or railway)
- `X-Request-ID` - Request tracking ID

## Environment Variables

For Railway services, set these environment variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration
# IMPORTANT: Use the JWT Secret from Supabase Dashboard → Settings → API → JWT Secret
# This is NOT the anon key - it's the secret used to sign JWT tokens
JWT_SECRET=your-supabase-jwt-secret-from-dashboard

# Service URLs (for API Gateway)
SOCIAL_SERVICE_URL=social-service.railway.internal
ADMIN_SERVICE_URL=admin-service.railway.internal
SEARCH_SERVICE_URL=search-service.railway.internal
PAYMENT_QUEUE_SERVICE_URL=payment-queue-service.railway.internal
DELIVERY_SERVICE_URL=delivery-service.railway.internal
NOTIFICATIONS_SERVICE_URL=notifications-service.railway.internal
TAXI_REALTIME_SERVICE_URL=taxi-realtime-service.railway.internal
```

### Why JWT_SECRET Must Match Supabase

The JWT_SECRET environment variable must be set to your **Supabase JWT Secret**
(found in Project Settings → API) because:

1. **Token Consistency**: Supabase signs all JWT tokens with this secret
2. **Cross-Platform Validation**: Railway services need the same secret to
   validate tokens issued by Supabase
3. **Security**: Using the same secret ensures tokens can't be forged and work
   across both platforms
4. **Authentication Flow**: User logs in via Supabase → Gets JWT signed with JWT
   Secret → Railway services validate using same secret

**Where to find it**: Supabase Dashboard → Project Settings → API → JWT Secret
(scroll down, it's labeled "JWT Secret" not "anon key")

## Migration Status

| Service       | Status      | Platform | Notes                        |
| ------------- | ----------- | -------- | ---------------------------- |
| Social Media  | ✅ Migrated | Railway  | Posts, comments, likes, feed |
| Admin         | ✅ Migrated | Railway  | NIPOST admin functions       |
| Search        | ✅ Migrated | Railway  | Unified search               |
| Delivery      | ✅ Migrated | Railway  | Package delivery             |
| Notifications | ✅ Migrated | Railway  | Push, email, SMS             |
| Payment Queue | ✅ Migrated | Railway  | Async payment processing     |
| Taxi Realtime | ✅ Migrated | Railway  | Real-time location tracking  |
| Hotels        | ⏳ Supabase | Supabase | Core booking functions       |
| Payments      | ⏳ Supabase | Supabase | Payment processing           |
| E-commerce    | ⏳ Supabase | Supabase | Product catalog, orders      |
| Taxi Core     | ⏳ Supabase | Supabase | Ride management              |
| Auth          | ⏳ Supabase | Supabase | User authentication          |

## Support

For API support, contact the development team or check the service-specific API
documentation at:

- Social: `/api/v1/social/api-docs`
- Admin: `/api/v1/admin/api-docs`
- Search: `/api/v1/search/api-docs`
- Delivery: `/api/v1/delivery/api-docs`
- Notifications: `/api/v1/notifications/api-docs`
