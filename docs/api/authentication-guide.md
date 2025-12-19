# Authentication and Authorization Guide

## Overview

This guide provides comprehensive documentation for authentication and
authorization patterns across all 94 edge functions in the Giga platform. It
covers JWT token handling, role-based access control, and security requirements
for the hybrid Supabase-Railway architecture.

## Authentication Architecture

### Token-Based Authentication

The platform uses JWT (JSON Web Tokens) for stateless authentication across all
services.

#### Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_uuid",
    "email": "user@example.com",
    "role": "user",
    "aud": "authenticated",
    "exp": 1640995200,
    "iat": 1640991600,
    "app_metadata": {
      "provider": "email",
      "providers": ["email"]
    },
    "user_metadata": {
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

#### Token Validation Process

1. **Signature Verification**: Validate JWT signature using shared secret
2. **Expiration Check**: Ensure token hasn't expired
3. **Audience Validation**: Verify token audience matches expected value
4. **User Existence**: Confirm user still exists and is active
5. **Role Verification**: Check user has required permissions

### Authentication Levels

#### 1. Public Access (No Authentication Required)

**Function Count**: 18 functions **Use Cases**: Public data access, user
registration, password reset

**Functions**:

- `get-hotels` - Hotel listings
- `get-hotel-details` - Hotel information
- `search-hotels` - Hotel search
- `get-products` - Product catalog
- `get-product-details` - Product information
- `get-room-availability` - Room availability
- `get-hotel-reviews` - Hotel reviews
- `get-hotel-amenities` - Hotel amenities
- `calculate-booking-price` - Price calculation
- `validate-booking-dates` - Date validation
- `get-ride-estimate` - Ride fare estimation
- `calculate-fees` - Payment fee calculation
- `user-register` - User registration
- `user-login` - User authentication
- `reset-password` - Password reset
- `verify-email` - Email verification
- `payment-webhook` - Payment webhooks
- `get-platform-settings` - Public configuration

**Security Considerations**:

- Rate limiting per IP address
- Input validation and sanitization
- No sensitive data exposure
- CORS restrictions

#### 2. User Authentication Required

**Function Count**: 58 functions **Use Cases**: User-specific operations,
personal data access

**JWT Requirements**:

```typescript
// Required headers
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}

// Token validation
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  throw new Error('Authentication required')
}
```

**User-Level Functions by Category**:

**Profile Management (4 functions)**:

- `get-user-profile` - User profile access
- `update-user-profile` - Profile updates
- `change-password` - Password changes
- `refresh-token` - Token refresh

**Hotel Operations (8 functions)**:

- `create-hotel-booking` - Hotel reservations
- `get-user-bookings` - Booking history
- `cancel-booking` - Booking cancellation
- `get-booking-details` - Booking information
- `update-booking` - Booking modifications
- `create-hotel-review` - Review submission
- `upload-hotel-photos` - Photo uploads

**Payment Operations (8 functions)**:

- `initialize-payment` - Payment processing
- `verify-payment` - Payment verification
- `process-refund` - Refund requests
- `get-payment-history` - Payment history
- `get-payment-methods` - Payment methods
- `add-payment-method` - Add payment method
- `remove-payment-method` - Remove payment method

**E-commerce Operations (6 functions)**:

- `add-to-cart` - Shopping cart
- `get-cart` - Cart retrieval
- `update-cart-item` - Cart modifications
- `remove-from-cart` - Cart item removal
- `create-order` - Order creation
- `get-user-orders` - Order history

**Taxi/Ride Operations (8 functions)**:

- `request-ride` - Ride requests
- `cancel-ride` - Ride cancellation
- `get-ride-history` - Ride history
- `rate-ride` - Ride rating
- `get-available-drivers` - Driver search

**Social Media Operations (7 functions)**:

- `create-social-post` - Post creation
- `get-social-feed` - Feed access
- `like-post` - Post interactions
- `comment-on-post` - Comments
- `get-post-comments` - Comment retrieval
- `delete-social-post` - Post deletion
- `report-post` - Content reporting

**Messaging Operations (3 functions)**:

- `send-message` - Message sending
- `get-conversations` - Conversation list
- `get-conversation-messages` - Message history

**Social Connections (2 functions)**:

- `send-friend-request` - Friend requests
- `manage-friend-request` - Request management

**Wallet Operations (6 functions)**:

- `get-wallet-balance` - Balance inquiry
- `add-wallet-funds` - Wallet funding
- `withdraw-wallet-funds` - Withdrawals
- `transfer-funds` - Fund transfers
- `get-wallet-transactions` - Transaction history

**Utility Operations (2 functions)**:

- `get-user-notifications` - Notifications
- `mark-notification-read` - Notification management

#### 3. Driver Authentication

**Function Count**: 6 functions **Use Cases**: Driver-specific operations in
taxi module

**Additional Requirements**:

- User must have 'driver' role
- Driver profile must be verified
- Vehicle information must be complete

**Driver-Specific Functions**:

- `accept-ride` - Accept ride requests
- `start-ride` - Start ride trips
- `complete-ride` - Complete rides
- `update-driver-location` - Location updates

**Role Validation**:

```typescript
const userRole = user.app_metadata?.role;
if (!['driver', 'admin'].includes(userRole)) {
  throw new Error('Driver privileges required');
}

// Additional driver verification
const { data: driverProfile } = await supabase
  .from('driver_profiles')
  .select('is_verified, status')
  .eq('user_id', user.id)
  .single();

if (!driverProfile?.is_verified || driverProfile.status !== 'active') {
  throw new Error('Driver verification required');
}
```

#### 4. Admin Authentication

**Function Count**: 9 functions **Use Cases**: Administrative operations, system
management

**Additional Requirements**:

- User must have 'admin' or 'moderator' role
- Enhanced audit logging
- Multi-factor authentication (recommended)
- IP address restrictions (optional)

**Admin-Level Functions**:

- `admin-dashboard-stats` - Dashboard analytics
- `get-hotel-analytics` - Hotel analytics
- `admin-manage-users` - User management
- `review-role-application` - Role reviews
- `update-platform-setting` - System configuration
- `check-hotel-integrity` - Data integrity
- `admin-process-payout` - Payout processing
- `get-ride-analytics` - Ride analytics
- `verify-driver` - Driver verification

**Admin Role Validation**:

```typescript
const userRole = user.app_metadata?.role;
if (!['admin', 'moderator'].includes(userRole)) {
  throw new Error('Administrative privileges required');
}

// Log admin action
await supabase.from('audit_logs').insert({
  user_id: user.id,
  action: 'admin_function_access',
  function_name: 'admin-dashboard-stats',
  ip_address: getClientIP(),
  user_agent: getUserAgent(),
  timestamp: new Date().toISOString(),
});
```

#### 5. Service Authentication

**Function Count**: 3 functions **Use Cases**: Service-to-service communication,
webhooks

**Authentication Methods**:

- Service role JWT tokens
- API key authentication
- Webhook signature verification

**Service-Level Functions**:

- `payment-webhook` - Payment provider webhooks
- `process-escrow` - Escrow processing
- `log-user-activity` - Activity logging

**Service Authentication Examples**:

**Webhook Signature Verification**:

```typescript
const verifyWebhookSignature = (
  signature: string,
  body: string,
  secret: string
): boolean => {
  const crypto = require('crypto');
  const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');

  return hash === signature;
};

// In webhook handler
const signature = req.headers.get('x-paystack-signature');
const body = await req.text();

if (!verifyWebhookSignature(signature, body, PAYSTACK_WEBHOOK_SECRET)) {
  throw new Error('Invalid webhook signature');
}
```

**Service Role Authentication**:

```typescript
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

## Role-Based Access Control (RBAC)

### User Roles Hierarchy

```
Admin
├── Moderator
├── Hotel Manager
├── Vendor
├── Driver
└── User (Default)
```

### Role Definitions

#### User (Default Role)

**Permissions**:

- Create and manage personal profile
- Make hotel bookings and payments
- Use taxi/ride services
- Shop e-commerce products
- Create social posts and messages
- Manage personal wallet

**Restrictions**:

- Cannot access admin functions
- Cannot manage other users
- Cannot access system configuration

#### Driver

**Inherits**: User permissions **Additional Permissions**:

- Accept and manage ride requests
- Update location and availability
- Access driver-specific analytics
- Manage driver profile and documents

**Restrictions**:

- Cannot access admin functions
- Cannot manage other drivers

#### Hotel Manager

**Inherits**: User permissions **Additional Permissions**:

- Manage assigned hotels
- View hotel analytics
- Manage room availability
- Process hotel bookings

**Restrictions**:

- Limited to assigned hotels only
- Cannot access system-wide admin functions

#### Vendor

**Inherits**: User permissions **Additional Permissions**:

- Manage product catalog
- Process orders
- Access vendor analytics
- Manage payout requests

**Restrictions**:

- Limited to own products/orders
- Cannot access other vendor data

#### Moderator

**Inherits**: User permissions **Additional Permissions**:

- Review and moderate content
- Manage user reports
- Access basic analytics
- Suspend/unsuspend users

**Restrictions**:

- Cannot access financial data
- Cannot modify system settings

#### Admin

**Full Permissions**:

- All system functions
- User management
- System configuration
- Financial operations
- Analytics and reporting
- Security management

### Permission Matrix

| Function Category    | User | Driver | Hotel Mgr | Vendor | Moderator | Admin |
| -------------------- | ---- | ------ | --------- | ------ | --------- | ----- |
| Profile Management   | ✓    | ✓      | ✓         | ✓      | ✓         | ✓     |
| Hotel Bookings       | ✓    | ✓      | ✓         | ✓      | ✓         | ✓     |
| Payment Processing   | ✓    | ✓      | ✓         | ✓      | ✓         | ✓     |
| Taxi/Ride Services   | ✓    | ✓      | ✓         | ✓      | ✓         | ✓     |
| Driver Operations    | ✗    | ✓      | ✗         | ✗      | ✗         | ✓     |
| Hotel Management     | ✗    | ✗      | ✓         | ✗      | ✗         | ✓     |
| Vendor Operations    | ✗    | ✗      | ✗         | ✓      | ✗         | ✓     |
| Content Moderation   | ✗    | ✗      | ✗         | ✗      | ✓         | ✓     |
| User Management      | ✗    | ✗      | ✗         | ✗      | ✗         | ✓     |
| System Configuration | ✗    | ✗      | ✗         | ✗      | ✗         | ✓     |
| Financial Admin      | ✗    | ✗      | ✗         | ✗      | ✗         | ✓     |

## Cross-Platform Authentication

### API Gateway Authentication

The API Gateway handles authentication for all cross-platform requests:

```typescript
// Gateway authentication middleware
const authenticateRequest = async (req: Request): Promise<UserContext> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);

  // Validate JWT token
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new Error('Invalid authentication token');
  }

  return {
    user_id: user.id,
    email: user.email,
    role: user.app_metadata?.role || 'user',
    permissions: getUserPermissions(user.app_metadata?.role),
  };
};
```

### Service-to-Service Authentication

For Railway services accessing Supabase data:

```typescript
// Service role client for Railway services
const createServiceClient = () => {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    }
  );
};

// Row Level Security bypass for service operations
const getServiceData = async (userId: string) => {
  const supabase = createServiceClient();

  // Service role can bypass RLS when needed
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return data;
};
```

## Security Best Practices

### Token Security

1. **Short Expiration Times**: Access tokens expire in 1 hour
2. **Refresh Token Rotation**: New refresh token issued on each refresh
3. **Secure Storage**: Tokens stored in httpOnly cookies or secure storage
4. **Token Revocation**: Ability to revoke tokens on logout/security events

### Rate Limiting

```typescript
const RATE_LIMITS = {
  anonymous: { requests: 100, window: 3600 }, // 100/hour
  authenticated: { requests: 1000, window: 3600 }, // 1000/hour
  premium: { requests: 5000, window: 3600 }, // 5000/hour
  admin: { requests: 10000, window: 3600 }, // 10000/hour
};
```

### Input Validation

```typescript
const validateInput = (data: any, schema: any) => {
  // Sanitize inputs
  const sanitized = sanitizeInput(data);

  // Validate against schema
  const result = schema.safeParse(sanitized);
  if (!result.success) {
    throw new ValidationError(result.error.issues);
  }

  return result.data;
};
```

### Audit Logging

```typescript
const logSecurityEvent = async (event: SecurityEvent) => {
  await supabase.from('security_logs').insert({
    event_type: event.type,
    user_id: event.userId,
    ip_address: event.ipAddress,
    user_agent: event.userAgent,
    details: event.details,
    severity: event.severity,
    timestamp: new Date().toISOString(),
  });
};
```

## Error Handling

### Authentication Errors

```typescript
const AUTH_ERRORS = {
  MISSING_TOKEN: {
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Authentication token required',
    status: 401,
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    message: 'Invalid or expired authentication token',
    status: 401,
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'Insufficient permissions to access this resource',
    status: 403,
  },
  ACCOUNT_SUSPENDED: {
    code: 'ACCOUNT_SUSPENDED',
    message: 'Account has been suspended',
    status: 403,
  },
};
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication token required",
    "details": {
      "required_auth_level": "user",
      "provided_auth_level": "none"
    }
  },
  "metadata": {
    "timestamp": "2023-12-18T10:00:00Z",
    "request_id": "req_123456",
    "version": "1.0.0"
  }
}
```

## Implementation Examples

### Function Authentication Template

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication token required',
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // 2. Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 3. Get and validate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired authentication token',
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // 4. Role-based authorization (if required)
    const userRole = user.app_metadata?.role;
    if (requiredRole && !hasPermission(userRole, requiredRole)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions to access this resource',
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // 5. Business logic here...
    const result = await performBusinessLogic(supabase, user, requestData);

    // 6. Success response
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Function error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
```

This comprehensive authentication guide ensures secure access control across the
hybrid Supabase-Railway architecture while maintaining consistent security
standards for all 94 functions.
