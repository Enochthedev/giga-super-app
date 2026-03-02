# Giga Platform - Service Specifications for Distributed Development

## Overview

This document provides comprehensive specifications for all microservices in the
Giga platform to enable distributed development across multiple agents. Each
service specification includes current status, API endpoints, database schema,
implementation requirements, and next steps.

## Service Status Summary

| Service               | Status      | Port | Implementation Level                   | Ready for Agents             |
| --------------------- | ----------- | ---- | -------------------------------------- | ---------------------------- |
| Social Service        | ✅ Complete | 3001 | 100% - SaaS patterns implemented       | ✅ Reference implementation  |
| Admin Service         | ✅ Complete | 3002 | 100% - Full NIPOST admin system        | ✅ Reference implementation  |
| API Gateway           | ✅ Complete | 3000 | 100% - Full routing & auth             | ✅ Reference implementation  |
| Search Service        | ✅ Complete | 3004 | 100% - Full search functionality       | ✅ Reference implementation  |
| Payment Queue Service | ✅ Complete | 3003 | 90% - Core functionality done          | ✅ Minor enhancements needed |
| Taxi Realtime Service | ✅ Complete | 3006 | 100% - Full WebSocket implementation   | ✅ Reference implementation  |
| Delivery Service      | ⚠️ Partial  | 3005 | 70% - Core structure, needs completion | 🔧 Needs agent completion    |
| Notifications Service | ⚠️ Basic    | 3007 | 60% - Basic queues, needs enhancement  | 🔧 Needs agent enhancement   |

## Architecture Context

### Database Strategy

- **Primary Database**: Supabase PostgreSQL with RLS
- **Service Access**: Railway services connect via secure connection pooling
- **Authentication**: JWT tokens validated through Supabase Auth
- **Data Compliance**: Soft deletes, audit trails, GDPR compliance

### Service Communication

- **API Gateway**: Central routing and authentication (port 3000)
- **Inter-service**: HTTP REST APIs with standardized response formats
- **Real-time**: WebSocket connections for taxi and delivery tracking
- **Async Processing**: Redis queues for notifications and payments

### Deployment Strategy

- **Supabase**: Database, Auth, Storage, Edge Functions (being migrated)
- **Railway**: All microservices deployed as Docker containers
- **Development**: Docker Compose for local development simulation

---

## 1. Social Service ✅ COMPLETE (Reference Implementation)

**Status**: ✅ Fully implemented with SaaS Builder patterns **Port**: 3001
**Implementation Level**: 100%

### Current Implementation

- Complete CRUD operations for posts, comments, likes
- SaaS Builder patterns: tenant authentication, feature gating, usage tracking
- Database views and functions for RLS compliance
- Comprehensive error handling and logging
- Working demo with real database operations

### Key Features Implemented

- Multi-tenant architecture with tenant isolation
- Feature gating and quota enforcement
- Usage tracking and analytics
- Secure database operations with RLS bypass functions
- Standardized API responses

### Database Schema

```sql
-- Tables (with tenant_id columns added)
social_posts (id, user_id, tenant_id, content, media_urls, visibility, created_at, updated_at, deleted_at)
post_comments (id, post_id, user_id, tenant_id, content, created_at, updated_at, deleted_at)
post_likes (id, post_id, user_id, tenant_id, created_at)

-- Views for profile joins
social_posts_with_profiles
post_comments_with_profiles

-- Functions for RLS compliance
create_social_post(p_user_id, p_content, p_media_urls, p_visibility, p_tenant_id)
create_post_comment(p_post_id, p_user_id, p_content, p_tenant_id)
toggle_post_like(p_post_id, p_user_id, p_tenant_id)
```

### API Endpoints

```
GET    /health                           - Health check
GET    /api/v1/posts                     - List public posts
POST   /api/v1/posts                     - Create post
GET    /api/v1/posts/:id                 - Get specific post
GET    /api/v1/feed                      - Get personalized feed
GET    /api/v1/posts/:id/comments        - Get post comments
POST   /api/v1/posts/:id/comments        - Create comment
POST   /api/v1/posts/:id/like            - Like/unlike post
DELETE /api/v1/posts/:id/like            - Unlike post

# SaaS Builder Tenant Routes
GET    /api/v1/tenant/posts              - Tenant-scoped posts
POST   /api/v1/tenant/posts              - Create tenant post
GET    /api/v1/tenant/analytics          - Tenant usage analytics
GET    /api/v1/tenant/quotas             - Tenant quota status
```

### Agent Instructions

**No action needed** - This service is complete and serves as a reference
implementation for other agents. Study the patterns used here:

- Tenant authentication middleware
- Database function usage for RLS compliance
- SaaS Builder pattern implementation
- Error handling and logging standards

---

## 2. Admin Service ✅ COMPLETE (Reference Implementation)

**Status**: ✅ Fully implemented NIPOST admin system **Port**: 3002
**Implementation Level**: 100%

### Current Implementation

- Complete hierarchical admin system (National → State → Branch)
- Role-based access control with RLS enforcement
- Comprehensive audit logging
- Financial reporting and analytics
- Multi-level dashboard system

### Key Features Implemented

- Three-tier admin hierarchy with proper access controls
- Comprehensive audit trail for all admin actions
- Financial ledger integration with commission tracking
- Real-time dashboard data with helper functions
- Secure authentication with JWT validation

### Database Schema

```sql
-- Core admin tables
nipost_user_permissions (user_id, access_level, branch_id, state_id, role, is_active)
nipost_admin_audit (admin_id, action_type, resource_type, resource_id, created_at)
nipost_financial_ledger (transaction_id, module, gross_amount, commission_amount, state_id, branch_id)

-- Helper functions
get_national_summary() - National level dashboard data
get_state_summary(p_state_id) - State level dashboard data
get_branch_summary(p_branch_id) - Branch level dashboard data
```

### API Endpoints

```
GET    /health                                    - Health check

# National Level (National HQ)
GET    /api/admin/national/dashboard              - National dashboard
GET    /api/admin/national/financial-summary     - National financial data
GET    /api/admin/national/states                - List all states

# State Level (State Centers)
GET    /api/admin/state/:stateId/dashboard       - State dashboard
GET    /api/admin/state/:stateId/branches        - State branches
GET    /api/admin/state/:stateId/financial-summary - State financial data

# Branch Level (Local Branches)
GET    /api/admin/branch/:branchId/dashboard     - Branch dashboard
GET    /api/admin/branch/:branchId/transactions  - Branch transactions
GET    /api/admin/branch/:branchId/analytics     - Branch analytics

# Audit System
GET    /api/admin/audit-trail                    - Audit log with filtering
```

### Agent Instructions

**No action needed** - This service is complete and serves as a reference
implementation. Study the patterns used here:

- Hierarchical access control implementation
- Comprehensive audit logging patterns
- Financial data aggregation techniques
- RLS policy enforcement in multi-tenant scenarios

---

## 3. API Gateway ✅ COMPLETE (Reference Implementation)

**Status**: ✅ Fully implemented with routing and authentication **Port**: 3000
**Implementation Level**: 100%

### Current Implementation

- Complete service registry and routing system
- JWT authentication middleware
- Rate limiting and security headers
- Service health monitoring
- Request/response logging

### Key Features Implemented

- Dynamic service registration and discovery
- Intelligent request routing based on URL patterns
- Comprehensive authentication and authorization
- Rate limiting with configurable limits
- Error handling and standardized responses

### Service Registry

```typescript
// Registered services
{
  'social-service': { url: 'http://localhost:3001', health: '/health' },
  'admin-service': { url: 'http://localhost:3002', health: '/health' },
  'payment-queue-service': { url: 'http://localhost:3003', health: '/health' },
  'search-service': { url: 'http://localhost:3004', health: '/health' },
  'delivery-service': { url: 'http://localhost:3005', health: '/health' },
  'taxi-realtime-service': { url: 'http://localhost:3006', health: '/health' },
  'notifications-service': { url: 'http://localhost:3007', health: '/health' }
}
```

### Routing Rules

```
/api/v1/social/*     → social-service
/api/v1/admin/*      → admin-service
/api/v1/payments/*   → payment-queue-service
/api/v1/search/*     → search-service
/api/v1/delivery/*   → delivery-service
/api/v1/taxi/*       → taxi-realtime-service
/api/v1/notifications/* → notifications-service
```

### Agent Instructions

**No action needed** - This service is complete. All new services should
register themselves with the gateway by following the existing patterns.

---

## 4. Search Service ✅ COMPLETE (Reference Implementation)

**Status**: ✅ Fully implemented search functionality **Port**: 3004
**Implementation Level**: 100%

### Current Implementation

- Comprehensive search across hotels, products, drivers, posts
- Advanced filtering and pagination
- Caching layer with Redis
- Performance monitoring and rate limiting
- Elasticsearch-ready architecture

### Key Features Implemented

- Multi-entity search with relevance scoring
- Advanced filtering with multiple operators
- Response caching with intelligent invalidation
- Performance monitoring and metrics
- Comprehensive error handling

### Search Entities

```
Hotels: name, description, location, amenities, rating
Products: name, description, category, vendor, price range
Drivers: name, vehicle type, location, rating, availability
Posts: content, hashtags, user, visibility
Users: name, email, role (admin only)
```

### API Endpoints

```
GET    /health                           - Health check
GET    /api/v1/search                    - Universal search
GET    /api/v1/search/hotels             - Hotel-specific search
GET    /api/v1/search/products           - Product search
GET    /api/v1/search/drivers            - Driver search
POST   /api/v1/search/advanced           - Advanced search with complex filters
```

### Agent Instructions

**No action needed** - This service is complete and optimized. Can be used as
reference for implementing search functionality in other services.

---

## 5. Payment Queue Service ✅ COMPLETE (Minor Enhancements Needed)

**Status**: ✅ Core functionality implemented **Port**: 3003 **Implementation
Level**: 90%

### Current Implementation

- Redis-based queue system with BullMQ
- Paystack and Stripe payment processing
- Webhook handling and verification
- Transaction logging and audit trails
- Retry logic and error handling

### Key Features Implemented

- Multi-provider payment processing (Paystack, Stripe)
- Secure webhook verification
- Comprehensive transaction logging
- Queue-based processing with retry logic
- Financial compliance and audit trails

### Queue Types

```
payment-processing: Handle payment initialization
webhook-processing: Process payment webhooks
refund-processing: Handle refund requests
notification-queue: Send payment notifications
audit-queue: Log financial transactions
```

### API Endpoints

```
GET    /health                           - Health check
POST   /api/v1/payments/initialize       - Initialize payment
POST   /api/v1/payments/verify           - Verify payment
POST   /api/v1/payments/refund           - Process refund
POST   /api/v1/webhooks/paystack         - Paystack webhook
POST   /api/v1/webhooks/stripe           - Stripe webhook
GET    /api/v1/payments/status/:id       - Payment status
GET    /api/v1/payments/history          - Payment history
```

### Minor Enhancements Needed

1. **Payment Analytics Dashboard** - Add endpoint for payment metrics
2. **Subscription Billing** - Add recurring payment support
3. **Multi-currency Support** - Enhance currency handling
4. **Payment Method Management** - Add saved payment methods

### Agent Instructions for Enhancement

```typescript
// Add these endpoints:
GET    /api/v1/payments/analytics        - Payment analytics
POST   /api/v1/subscriptions/create      - Create subscription
GET    /api/v1/payment-methods           - List saved methods
POST   /api/v1/payment-methods           - Save payment method
```

---

## 6. Taxi Realtime Service ✅ COMPLETE (Reference Implementation)

**Status**: ✅ Fully implemented WebSocket service **Port**: 3006
**Implementation Level**: 100%

### Current Implementation

- Complete WebSocket server with Socket.IO
- Redis adapter for horizontal scaling
- Real-time location tracking
- Trip management system
- Rate limiting and authentication

### Key Features Implemented

- Real-time driver location updates
- Trip request and acceptance flow
- Live trip tracking for riders
- Driver availability management
- Scalable WebSocket architecture with Redis

### WebSocket Events

```
# Driver Events
driver:location:update    - Update driver location
trip:accept              - Accept trip request
trip:status:update       - Update trip status

# Rider Events
rider:request:nearby-drivers - Find nearby drivers
trip:request             - Request a trip
rider:track:driver       - Start tracking driver
rider:untrack:driver     - Stop tracking driver

# Broadcast Events
driver:location          - Driver location update
trip:new-request         - New trip request for driver
trip:accepted           - Trip accepted by driver
trip:status             - Trip status change
```

### Database Schema

```sql
taxi_drivers (user_id, current_lat, current_lng, is_available, last_location_update)
taxi_trips (id, rider_id, driver_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status, created_at, accepted_at)
```

### Agent Instructions

**No action needed** - This service is complete and serves as a reference for
real-time WebSocket implementations.

---

## 7. Delivery Service ⚠️ NEEDS COMPLETION

**Status**: ⚠️ 70% implemented - Core structure exists, needs completion
**Port**: 3005 **Implementation Level**: 70%

### Current Implementation Status

✅ Basic Express server setup ✅ WebSocket service initialization  
✅ Route structure defined ✅ Configuration and logging ❌ Route implementations
incomplete ❌ Database operations missing ❌ Business logic not implemented

### Required Completion Work

#### 1. Complete Route Implementations

Current routes exist but are not implemented:

- `/api/v1/tracking/*` - Package tracking
- `/api/v1/assignments/*` - Delivery assignments
- `/api/v1/scheduler/*` - Route optimization
- `/api/v1/websocket/*` - Real-time updates

#### 2. Database Schema Implementation

```sql
-- Required tables to create/use
delivery_packages (id, sender_id, recipient_id, pickup_address, delivery_address, status, created_at)
delivery_assignments (id, package_id, courier_id, assigned_at, status)
delivery_routes (id, courier_id, packages, optimized_route, estimated_duration)
courier_locations (courier_id, lat, lng, timestamp, is_active)
delivery_tracking (package_id, status, location, timestamp, notes)
```

#### 3. Core Features to Implement

- **Package Management**: CRUD operations for packages
- **Route Optimization**: Google Maps integration for optimal routes
- **Real-time Tracking**: WebSocket updates for package status
- **Courier Assignment**: Automatic assignment based on location/capacity
- **Status Updates**: Package lifecycle management

### API Endpoints to Implement

```
# Package Management
GET    /api/v1/packages                  - List packages
POST   /api/v1/packages                  - Create package
GET    /api/v1/packages/:id              - Get package details
PUT    /api/v1/packages/:id              - Update package
DELETE /api/v1/packages/:id              - Cancel package

# Tracking
GET    /api/v1/tracking/:packageId       - Track package
POST   /api/v1/tracking/:packageId/update - Update package status
GET    /api/v1/tracking/courier/:courierId - Courier's packages

# Assignments
GET    /api/v1/assignments               - List assignments
POST   /api/v1/assignments               - Create assignment
PUT    /api/v1/assignments/:id/accept    - Accept assignment
PUT    /api/v1/assignments/:id/complete  - Complete assignment

# Route Optimization
POST   /api/v1/routes/optimize           - Optimize delivery route
GET    /api/v1/routes/courier/:id        - Get courier route
PUT    /api/v1/routes/:id/update         - Update route progress

# Real-time WebSocket Events
courier:location:update                  - Courier location update
package:status:update                    - Package status change
assignment:new                          - New assignment for courier
route:optimized                         - Optimized route ready
```

### Agent Instructions for Completion

**Priority 1: Database Setup**

```sql
-- Create delivery tables in Supabase
-- Add RLS policies for data security
-- Create helper functions for complex operations
-- Add indexes for performance
```

**Priority 2: Core API Implementation**

```typescript
// Implement all CRUD operations
// Add Google Maps integration for route optimization
// Implement assignment algorithm
// Add comprehensive error handling
```

**Priority 3: Real-time Features**

```typescript
// Complete WebSocket event handlers
// Add real-time location tracking
// Implement status broadcast system
// Add courier mobile app support
```

**Priority 4: Business Logic**

```typescript
// Implement delivery cost calculation
// Add delivery time estimation
// Create courier performance metrics
// Add customer notification system
```

### Dependencies

- Google Maps API for route optimization
- WebSocket for real-time updates
- Redis for caching and sessions
- Supabase for data persistence

---

## 8. Notifications Service ⚠️ NEEDS ENHANCEMENT

**Status**: ⚠️ 60% implemented - Basic queues exist, needs enhancement **Port**:
3007 **Implementation Level**: 60%

### Current Implementation Status

✅ Basic BullMQ queue setup ✅ Email worker with Nodemailer ✅ SMS worker with
Twilio ✅ Basic push notification placeholder ❌ Template system missing ❌ User
preferences not implemented ❌ Advanced scheduling missing ❌ Notification
history missing

### Required Enhancement Work

#### 1. Template System Implementation

```typescript
// Create notification templates
interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  subject?: string;
  body: string;
  variables: string[];
}

// Templates for different events
const templates = {
  'booking-confirmation': {
    email: {
      subject: 'Booking Confirmed',
      body: 'Your booking {{bookingId}} is confirmed...',
    },
    sms: { body: 'Booking {{bookingId}} confirmed for {{date}}' },
  },
  'payment-success': {
    email: {
      subject: 'Payment Successful',
      body: 'Payment of {{amount}} received...',
    },
    push: {
      title: 'Payment Success',
      body: 'Your payment was processed successfully',
    },
  },
};
```

#### 2. User Preferences System

```sql
-- Database schema for user preferences
notification_preferences (
  user_id UUID,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  booking_notifications BOOLEAN DEFAULT true,
  payment_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. Advanced Features to Implement

- **Scheduled Notifications**: Delay and schedule notifications
- **Notification History**: Track all sent notifications
- **Delivery Status**: Track email opens, SMS delivery, push receipt
- **A/B Testing**: Test different notification templates
- **Rate Limiting**: Prevent notification spam
- **Batch Processing**: Send bulk notifications efficiently

### API Endpoints to Implement

```
# Current (basic)
POST   /api/notifications/send           - Send single notification

# To implement
POST   /api/v1/notifications/send        - Enhanced send with templates
POST   /api/v1/notifications/bulk        - Send bulk notifications
POST   /api/v1/notifications/schedule    - Schedule notification
GET    /api/v1/notifications/history     - Notification history
GET    /api/v1/notifications/status/:id  - Delivery status

# Templates
GET    /api/v1/templates                 - List templates
POST   /api/v1/templates                 - Create template
PUT    /api/v1/templates/:id             - Update template
DELETE /api/v1/templates/:id             - Delete template

# User Preferences
GET    /api/v1/preferences/:userId       - Get user preferences
PUT    /api/v1/preferences/:userId       - Update preferences
POST   /api/v1/preferences/unsubscribe   - Unsubscribe from notifications

# Analytics
GET    /api/v1/analytics/delivery-rates  - Delivery success rates
GET    /api/v1/analytics/engagement      - Notification engagement metrics
```

### Queue Enhancements Needed

```typescript
// Add new queue types
export const scheduledQueue = new Queue('scheduled-notifications', {
  connection,
});
export const bulkQueue = new Queue('bulk-notifications', { connection });
export const retryQueue = new Queue('retry-notifications', { connection });

// Enhanced job data structure
interface NotificationJob {
  templateId: string;
  userId: string;
  type: 'email' | 'sms' | 'push';
  variables: Record<string, any>;
  scheduledFor?: Date;
  priority?: number;
  retryCount?: number;
}
```

### Agent Instructions for Enhancement

**Priority 1: Template System**

```typescript
// Create template management system
// Implement variable substitution
// Add template validation
// Create default templates for common events
```

**Priority 2: User Preferences**

```typescript
// Implement preference management
// Add unsubscribe functionality
// Respect user notification settings
// Add GDPR compliance features
```

**Priority 3: Advanced Scheduling**

```typescript
// Add delayed job processing
// Implement recurring notifications
// Add timezone support
// Create notification campaigns
```

**Priority 4: Analytics & Monitoring**

```typescript
// Track delivery success rates
// Monitor queue performance
// Add notification engagement metrics
// Create admin dashboard for monitoring
```

### Integration Requirements

- **Firebase Cloud Messaging** for push notifications
- **SendGrid/Mailgun** for enhanced email delivery
- **Twilio** for SMS (already integrated)
- **Redis** for queue management (already integrated)

---

## Development Guidelines for Agents

### 1. Code Standards

- Follow existing TypeScript patterns from reference implementations
- Use standardized error handling and response formats
- Implement comprehensive logging with Winston
- Add proper input validation and sanitization

### 2. Database Operations

- Use Supabase client with service role key
- Implement RLS policies for data security
- Create database functions for complex operations
- Add proper indexes for performance

### 3. API Design

- Follow RESTful conventions
- Use standardized response format:

```typescript
{
  success: boolean;
  data?: any;
  error?: { code: string; message: string; };
  metadata: { timestamp: string; service: string; };
}
```

### 4. Security Requirements

- Validate JWT tokens for authentication
- Implement rate limiting on all endpoints
- Use CORS and security headers
- Sanitize all user inputs

### 5. Testing Requirements

- Add unit tests for business logic
- Create integration tests for API endpoints
- Test database operations and RLS policies
- Add performance tests for critical paths

### 6. Documentation Requirements

- Update API documentation with new endpoints
- Add inline code comments for complex logic
- Create deployment guides for new features
- Update this specification document

## Next Steps for Distributed Development

1. **Assign Agents to Services**:
   - Agent A: Complete Delivery Service implementation
   - Agent B: Enhance Notifications Service
   - Agent C: Add Payment Service enhancements
   - Agent D: Create integration tests across services

2. **Coordination Points**:
   - All agents should use the Social Service as reference implementation
   - Database schema changes must be coordinated
   - API Gateway registration for new endpoints
   - Shared utilities and middleware should be consistent

3. **Testing Strategy**:
   - Each agent tests their service independently
   - Integration testing after all services are complete
   - Load testing on the complete system
   - Security testing across all endpoints

4. **Deployment Preparation**:
   - Docker containers for each service
   - Railway deployment configurations
   - Environment variable management
   - Health check implementations

This specification provides everything needed for agents to work independently
while maintaining consistency across the platform.
