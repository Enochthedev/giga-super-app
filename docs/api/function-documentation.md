# Giga Platform Function Documentation

## Overview

This document provides comprehensive documentation for all 94 active edge
functions in the Giga platform. Functions are organized by module and include
detailed information about their purpose, authentication requirements,
dependencies, and platform placement recommendations.

## Function Distribution

- **Core Module (Supabase)**: 58 functions - Database-intensive operations
- **Social Module (Railway)**: 12 functions - Social media and messaging
- **Admin Module (Railway)**: 9 functions - Administrative operations
- **Media Module (Railway)**: 3 functions - Media processing
- **Utility Module**: 12 functions (7 Supabase, 5 Railway) - Configuration and
  utilities

## Authentication Requirements

All functions require JWT authentication unless explicitly marked as public.
Authentication levels:

- **Public**: No authentication required
- **User**: Standard user authentication
- **Admin**: Administrative privileges required
- **Service**: Service-to-service authentication

## Function Categories

### Core Module Functions (Supabase) - 58 Functions

#### Authentication & User Management (8 functions)

- **Purpose**: Core user authentication, registration, and profile management
- **Platform**: Supabase (tight database coupling, built-in auth integration)
- **Authentication**: Mixed (public registration/login, user-level for profile
  operations)

| Function              | Purpose                                 | Auth Level | External Deps | Primary Tables |
| --------------------- | --------------------------------------- | ---------- | ------------- | -------------- |
| `user-login`          | User authentication with email/password | Public     | None          | user_profiles  |
| `user-register`       | New user account creation               | Public     | None          | user_profiles  |
| `get-user-profile`    | Retrieve user profile information       | User       | None          | user_profiles  |
| `update-user-profile` | Update user profile data                | User       | None          | user_profiles  |
| `change-password`     | User password change                    | User       | None          | user_profiles  |
| `reset-password`      | Password reset functionality            | Public     | SendGrid      | user_profiles  |
| `verify-email`        | Email verification process              | Public     | None          | user_profiles  |
| `refresh-token`       | JWT token refresh                       | User       | None          | user_profiles  |

#### Hotel Management (15 functions)

- **Purpose**: Hotel listings, bookings, and management operations
- **Platform**: Supabase (complex database relationships, ACID requirements)
- **Authentication**: User-level for bookings, mixed for listings

| Function                  | Purpose                            | Auth Level | External Deps   | Primary Tables        |
| ------------------------- | ---------------------------------- | ---------- | --------------- | --------------------- |
| `get-hotels`              | List hotels with filtering         | Public     | None            | hotels                |
| `get-hotel-details`       | Detailed hotel information         | Public     | None            | hotels, rooms         |
| `search-hotels`           | Hotel search with location/filters | Public     | Google Maps     | hotels                |
| `create-hotel-booking`    | Create new hotel reservation       | User       | Paystack/Stripe | hotel_bookings        |
| `get-user-bookings`       | User's booking history             | User       | None            | hotel_bookings        |
| `cancel-booking`          | Cancel hotel reservation           | User       | Paystack/Stripe | hotel_bookings        |
| `get-booking-details`     | Detailed booking information       | User       | None            | hotel_bookings        |
| `update-booking`          | Modify existing booking            | User       | None            | hotel_bookings        |
| `get-room-availability`   | Check room availability            | Public     | None            | room_availability     |
| `create-hotel-review`     | Submit hotel review                | User       | None            | hotel_reviews         |
| `get-hotel-reviews`       | Retrieve hotel reviews             | Public     | None            | hotel_reviews         |
| `upload-hotel-photos`     | Upload hotel images                | User       | AWS S3          | hotel_photos          |
| `get-hotel-amenities`     | List hotel amenities               | Public     | None            | hotel_amenities       |
| `calculate-booking-price` | Calculate booking total            | Public     | None            | rooms, hotel_bookings |
| `validate-booking-dates`  | Validate booking date range        | Public     | None            | room_availability     |

#### Payment Processing (11 functions)

- **Purpose**: Payment initialization, processing, and webhook handling
- **Platform**: Supabase (financial data integrity, ACID compliance)
- **Authentication**: User-level for payments, service-level for webhooks

| Function                | Purpose                          | Auth Level | External Deps   | Primary Tables       |
| ----------------------- | -------------------------------- | ---------- | --------------- | -------------------- |
| `initialize-payment`    | Start payment process            | User       | Paystack/Stripe | payments             |
| `verify-payment`        | Verify payment status            | User       | Paystack/Stripe | payments             |
| `payment-webhook`       | Handle payment provider webhooks | Service    | Paystack/Stripe | payments             |
| `process-refund`        | Process payment refunds          | User       | Paystack/Stripe | payments             |
| `get-payment-history`   | User payment history             | User       | None            | payments             |
| `update-payment-status` | Update payment status            | Service    | None            | payments             |
| `calculate-fees`        | Calculate payment fees           | Public     | None            | None                 |
| `get-payment-methods`   | List user payment methods        | User       | Paystack/Stripe | user_payment_methods |
| `add-payment-method`    | Add new payment method           | User       | Paystack/Stripe | user_payment_methods |
| `remove-payment-method` | Remove payment method            | User       | Paystack/Stripe | user_payment_methods |
| `process-payout`        | Process vendor payouts           | Admin      | Paystack        | payout_requests      |

#### E-commerce (8 functions)

- **Purpose**: Product catalog, shopping cart, and order management
- **Platform**: Supabase (complex product relationships, inventory management)
- **Authentication**: User-level for cart/orders, public for catalog

| Function              | Purpose                      | Auth Level | External Deps   | Primary Tables       |
| --------------------- | ---------------------------- | ---------- | --------------- | -------------------- |
| `get-products`        | List products with filtering | Public     | None            | ecommerce_products   |
| `get-product-details` | Detailed product information | Public     | None            | ecommerce_products   |
| `add-to-cart`         | Add product to shopping cart | User       | None            | ecommerce_carts      |
| `get-cart`            | Retrieve user's cart         | User       | None            | ecommerce_carts      |
| `update-cart-item`    | Update cart item quantity    | User       | None            | ecommerce_cart_items |
| `remove-from-cart`    | Remove item from cart        | User       | None            | ecommerce_cart_items |
| `create-order`        | Create order from cart       | User       | Paystack/Stripe | ecommerce_orders     |
| `get-user-orders`     | User's order history         | User       | None            | ecommerce_orders     |

#### Taxi/Ride Services (10 functions)

- **Purpose**: Ride booking, driver management, and trip tracking
- **Platform**: Supabase (location data, real-time updates)
- **Authentication**: User-level for bookings, driver-level for driver
  operations

| Function                 | Purpose                      | Auth Level  | External Deps | Primary Tables   |
| ------------------------ | ---------------------------- | ----------- | ------------- | ---------------- |
| `request-ride`           | Request a taxi ride          | User        | Google Maps   | rides            |
| `get-ride-estimate`      | Calculate ride fare estimate | User        | Google Maps   | None             |
| `get-available-drivers`  | Find nearby drivers          | User        | Google Maps   | driver_profiles  |
| `accept-ride`            | Driver accepts ride request  | Driver      | None          | rides            |
| `start-ride`             | Start ride trip              | Driver      | None          | rides            |
| `complete-ride`          | Complete ride trip           | Driver      | Paystack      | rides            |
| `cancel-ride`            | Cancel ride request          | User/Driver | None          | rides            |
| `get-ride-history`       | User's ride history          | User        | None          | rides            |
| `update-driver-location` | Update driver GPS location   | Driver      | None          | driver_locations |
| `rate-ride`              | Rate completed ride          | User        | None          | ride_ratings     |

#### Wallet & Financial (6 functions)

- **Purpose**: User wallet management and financial transactions
- **Platform**: Supabase (financial data integrity, ACID compliance)
- **Authentication**: User-level for wallet operations

| Function                  | Purpose                    | Auth Level | External Deps   | Primary Tables      |
| ------------------------- | -------------------------- | ---------- | --------------- | ------------------- |
| `get-wallet-balance`      | Get user wallet balance    | User       | None            | user_wallets        |
| `add-wallet-funds`        | Add money to wallet        | User       | Paystack/Stripe | wallet_transactions |
| `withdraw-wallet-funds`   | Withdraw from wallet       | User       | Paystack        | wallet_transactions |
| `transfer-funds`          | Transfer between wallets   | User       | None            | wallet_transactions |
| `get-wallet-transactions` | Wallet transaction history | User       | None            | wallet_transactions |
| `process-escrow`          | Handle escrow transactions | Service    | None            | escrow_transactions |

### Social Module Functions (Railway) - 12 Functions

#### Social Posts & Interactions (7 functions)

- **Purpose**: Social media posts, likes, comments, and feed generation
- **Platform**: Railway (high-frequency writes, feed algorithms,
  compute-intensive)
- **Authentication**: User-level for all operations

| Function             | Purpose                      | Auth Level | External Deps | Primary Tables  |
| -------------------- | ---------------------------- | ---------- | ------------- | --------------- |
| `create-social-post` | Create new social media post | User       | AWS S3        | social_posts    |
| `get-social-feed`    | Generate personalized feed   | User       | None          | social_posts    |
| `like-post`          | Like/unlike social post      | User       | None          | post_likes      |
| `comment-on-post`    | Add comment to post          | User       | None          | post_comments   |
| `get-post-comments`  | Retrieve post comments       | User       | None          | post_comments   |
| `delete-social-post` | Delete user's post           | User       | None          | social_posts    |
| `report-post`        | Report inappropriate content | User       | None          | content_reports |

#### Messaging & Conversations (3 functions)

- **Purpose**: Direct messaging and real-time chat
- **Platform**: Railway (real-time processing, high-frequency updates)
- **Authentication**: User-level for all operations

| Function                    | Purpose                        | Auth Level | External Deps | Primary Tables |
| --------------------------- | ------------------------------ | ---------- | ------------- | -------------- |
| `send-message`              | Send direct message            | User       | None          | messages       |
| `get-conversations`         | List user conversations        | User       | None          | conversations  |
| `get-conversation-messages` | Retrieve conversation messages | User       | None          | messages       |

#### Social Connections (2 functions)

- **Purpose**: Friend connections and social graph management
- **Platform**: Railway (graph algorithms, relationship processing)
- **Authentication**: User-level for all operations

| Function                | Purpose                        | Auth Level | External Deps | Primary Tables   |
| ----------------------- | ------------------------------ | ---------- | ------------- | ---------------- |
| `send-friend-request`   | Send friend connection request | User       | None          | user_connections |
| `manage-friend-request` | Accept/decline friend request  | User       | None          | user_connections |

### Admin Module Functions (Railway) - 9 Functions

#### Analytics & Reporting (2 functions)

- **Purpose**: Administrative dashboard statistics and analytics
- **Platform**: Railway (compute-intensive analytics, isolated from user
  traffic)
- **Authentication**: Admin-level required

| Function                | Purpose                       | Auth Level | External Deps | Primary Tables           |
| ----------------------- | ----------------------------- | ---------- | ------------- | ------------------------ |
| `admin-dashboard-stats` | Generate dashboard statistics | Admin      | None          | Multiple tables          |
| `get-hotel-analytics`   | Hotel performance analytics   | Admin      | None          | hotel_bookings, payments |

#### User Management (2 functions)

- **Purpose**: Administrative user management operations
- **Platform**: Railway (enhanced security, audit logging)
- **Authentication**: Admin-level required

| Function                  | Purpose                          | Auth Level | External Deps | Primary Tables    |
| ------------------------- | -------------------------------- | ---------- | ------------- | ----------------- |
| `admin-manage-users`      | Admin user management operations | Admin      | None          | user_profiles     |
| `review-role-application` | Review user role applications    | Admin      | None          | role_applications |

#### System Configuration (1 function)

- **Purpose**: Platform settings and configuration management
- **Platform**: Railway (isolated admin operations)
- **Authentication**: Admin-level required

| Function                  | Purpose                       | Auth Level | External Deps | Primary Tables    |
| ------------------------- | ----------------------------- | ---------- | ------------- | ----------------- |
| `update-platform-setting` | Update platform configuration | Admin      | None          | platform_settings |

#### Hotel Administration (1 function)

- **Purpose**: Administrative hotel management
- **Platform**: Railway (admin-specific operations)
- **Authentication**: Admin-level required

| Function                | Purpose                       | Auth Level | External Deps | Primary Tables |
| ----------------------- | ----------------------------- | ---------- | ------------- | -------------- |
| `check-hotel-integrity` | Validate hotel data integrity | Admin      | None          | hotels, rooms  |

#### Payment Administration (1 function)

- **Purpose**: Administrative payment processing
- **Platform**: Railway (enhanced security for financial operations)
- **Authentication**: Admin-level required

| Function               | Purpose                | Auth Level | External Deps | Primary Tables  |
| ---------------------- | ---------------------- | ---------- | ------------- | --------------- |
| `admin-process-payout` | Process vendor payouts | Admin      | Paystack      | payout_requests |

#### Taxi Administration (2 functions)

- **Purpose**: Administrative taxi/ride management
- **Platform**: Railway (admin analytics and verification)
- **Authentication**: Admin-level required

| Function             | Purpose                 | Auth Level | External Deps | Primary Tables         |
| -------------------- | ----------------------- | ---------- | ------------- | ---------------------- |
| `get-ride-analytics` | Generate ride analytics | Admin      | None          | rides, driver_earnings |
| `verify-driver`      | Verify driver documents | Admin      | None          | driver_profiles        |

### Media Module Functions (Railway) - 3 Functions

#### File Processing (3 functions)

- **Purpose**: Media upload, processing, and optimization
- **Platform**: Railway (compute-intensive processing, CDN integration)
- **Authentication**: User-level for uploads

| Function              | Purpose                           | Auth Level | External Deps | Primary Tables |
| --------------------- | --------------------------------- | ---------- | ------------- | -------------- |
| `upload-file`         | Handle file uploads               | User       | AWS S3        | file_metadata  |
| `process-image`       | Image processing and optimization | Service    | AWS S3        | file_metadata  |
| `generate-thumbnails` | Generate image thumbnails         | Service    | AWS S3        | file_metadata  |

### Utility Module Functions - 12 Functions

#### Supabase Utilities (7 functions)

- **Purpose**: Configuration, notifications, and database-heavy utilities
- **Platform**: Supabase (database integration, built-in features)
- **Authentication**: Mixed levels

| Function                 | Purpose                         | Auth Level | External Deps | Primary Tables     |
| ------------------------ | ------------------------------- | ---------- | ------------- | ------------------ |
| `get-platform-settings`  | Retrieve platform configuration | Public     | None          | platform_settings  |
| `send-notification`      | Send push notifications         | Service    | Firebase      | notifications      |
| `get-user-notifications` | Retrieve user notifications     | User       | None          | notifications      |
| `mark-notification-read` | Mark notification as read       | User       | None          | notifications      |
| `send-email`             | Send email notifications        | Service    | SendGrid      | None               |
| `send-sms`               | Send SMS notifications          | Service    | Twilio        | None               |
| `log-user-activity`      | Log user activity events        | Service    | None          | user_activity_logs |

#### Railway Utilities (5 functions)

- **Purpose**: Compute-intensive utilities and external service integrations
- **Platform**: Railway (processing power, external API calls)
- **Authentication**: Mixed levels

| Function             | Purpose                           | Auth Level | External Deps | Primary Tables |
| -------------------- | --------------------------------- | ---------- | ------------- | -------------- |
| `geocode-address`    | Convert address to coordinates    | Service    | Google Maps   | None           |
| `calculate-distance` | Calculate distance between points | Service    | Google Maps   | None           |
| `generate-qr-code`   | Generate QR codes                 | Service    | None          | None           |
| `validate-phone`     | Validate phone numbers            | Service    | Twilio        | None           |
| `compress-data`      | Data compression utility          | Service    | None          | None           |

## Function Dependencies

### Database Table Dependencies

#### High-Dependency Tables (>10 functions)

- **user_profiles**: 25+ functions (authentication, profiles, bookings)
- **payments**: 15+ functions (all payment-related operations)
- **hotel_bookings**: 12+ functions (hotel reservation system)
- **hotels**: 10+ functions (hotel listings and management)

#### Medium-Dependency Tables (5-10 functions)

- **social_posts**: 8 functions (social media operations)
- **messages**: 6 functions (messaging system)
- **rides**: 8 functions (taxi/ride services)
- **ecommerce_orders**: 6 functions (e-commerce operations)

#### Low-Dependency Tables (<5 functions)

- **notifications**: 4 functions (notification system)
- **file_metadata**: 3 functions (media processing)
- **platform_settings**: 2 functions (configuration)

### External Service Dependencies

#### Payment Providers

- **Paystack**: 15 functions (primary for Nigerian market)
- **Stripe**: 8 functions (international payments)

#### Communication Services

- **SendGrid**: 3 functions (email notifications)
- **Twilio**: 4 functions (SMS and phone validation)
- **Firebase**: 2 functions (push notifications)

#### Location & Maps

- **Google Maps**: 8 functions (geocoding, distance calculation)

#### Storage & CDN

- **AWS S3**: 6 functions (file storage and media processing)

## Authentication & Authorization Matrix

### Permission Levels

| Level   | Description                  | Function Count | Examples                        |
| ------- | ---------------------------- | -------------- | ------------------------------- |
| Public  | No authentication required   | 18             | Hotel listings, product catalog |
| User    | Standard user authentication | 58             | Bookings, profile, social posts |
| Driver  | Driver-specific operations   | 6              | Accept rides, update location   |
| Admin   | Administrative privileges    | 9              | User management, analytics      |
| Service | Service-to-service calls     | 3              | Webhooks, internal processing   |

### JWT Token Requirements

All authenticated endpoints require:

```
Authorization: Bearer <jwt_token>
```

Token validation includes:

- Signature verification
- Expiration check
- User existence validation
- Role/permission verification

## Error Handling Standards

All functions implement consistent error handling:

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific_field",
      "value": "invalid_value"
    }
  },
  "metadata": {
    "timestamp": "2023-12-18T10:00:00Z",
    "request_id": "req_123456",
    "version": "1.0.0"
  }
}
```

### Standard Error Codes

- **VALIDATION_ERROR**: Input validation failures
- **AUTHENTICATION_ERROR**: Authentication required/invalid
- **AUTHORIZATION_ERROR**: Insufficient permissions
- **NOT_FOUND**: Resource not found
- **CONFLICT**: Resource conflict/duplicate
- **RATE_LIMIT_EXCEEDED**: Rate limiting triggered
- **EXTERNAL_SERVICE_ERROR**: Third-party service failures
- **INTERNAL_ERROR**: Unexpected server errors

## Performance Characteristics

### Response Time Targets

- **Core Functions**: <500ms for 95% of requests
- **Social Functions**: <200ms for feed generation
- **Admin Functions**: <1000ms (acceptable for admin operations)
- **Media Functions**: <2000ms for processing operations

### Scalability Patterns

- **Database-Heavy (Supabase)**: Vertical scaling, connection pooling
- **Compute-Heavy (Railway)**: Horizontal scaling, auto-scaling
- **Real-time (Social)**: WebSocket connections, event streaming

## Migration Considerations

### Platform Placement Rationale

#### Functions Staying on Supabase

- High database intensity (score >7)
- ACID transaction requirements
- Built-in auth integration benefits
- Real-time subscription needs

#### Functions Moving to Railway

- High compute intensity (score >7)
- Administrative isolation requirements
- Scalability needs for social features
- Media processing requirements

### Migration Complexity

- **Low**: Utility functions with minimal dependencies
- **Medium**: Social functions with moderate database coupling
- **High**: Admin functions requiring enhanced security
- **Critical**: Payment functions requiring zero downtime

## Testing Requirements

### Unit Testing

- Input validation testing
- Business logic verification
- Error handling validation
- Authentication/authorization checks

### Integration Testing

- Database operation testing
- External service integration
- Cross-function dependency testing
- End-to-end user journey testing

### Property-Based Testing

- Function categorization completeness
- Platform placement optimization
- API contract preservation
- Performance SLA compliance

## Monitoring & Observability

### Metrics Collection

- Response times and latency percentiles
- Error rates by function and error type
- Authentication success/failure rates
- External service dependency health

### Logging Standards

- Structured JSON logging
- Request/response correlation IDs
- User context and attribution
- Security event logging

### Alerting Thresholds

- Error rate >5% for 5 minutes
- Response time >1000ms for 95th percentile
- Authentication failure rate >10%
- External service failures

## Security Considerations

### Data Protection

- PII encryption at rest and in transit
- Audit logging for sensitive operations
- Rate limiting per user/IP
- Input sanitization and validation

### Access Control

- JWT token validation
- Role-based access control (RBAC)
- Resource-level permissions
- Service-to-service authentication

### Compliance Requirements

- GDPR compliance for EU users
- PCI DSS for payment processing
- Data retention policies
- Right to erasure implementation

This comprehensive documentation serves as the foundation for the platform
architecture split, ensuring all 94 functions are properly documented,
categorized, and prepared for migration to their optimal platforms.
