# Platform Architecture Split - Design Additions

## Additional Service Modules and Architecture Components

### New Service Modules for Railway Deployment

#### Ecommerce Service Module (Railway)

**Rationale**: High-volume product search, inventory management, and vendor
operations require compute-intensive processing

**Functions (8+ functions)**:

- `apply-vendor`, `admin-manage-vendors`, `Get-vendor-balance`
- `add-to-cart`, `get-user-cart`, `checkout-cart`
- `sync-products-to-algolia` (search integration)
- Vendor dashboard and analytics functions

**Database Tables**:

- `ecommerce_products`, `ecommerce_orders`, `ecommerce_carts`
- `ecommerce_vendors`, `vendor_profiles`, `vendor_payouts`
- `ecommerce_categories`, `ecommerce_product_reviews`

**Characteristics**:

- Database Intensity: 7.5/10 (product catalog, order management)
- Compute Intensity: 8.0/10 (search indexing, recommendation algorithms)
- Traffic Pattern: High/Burst (shopping events, product launches)
- Access Pattern: Read-heavy with burst writes during checkout

#### Advertising Service Module (Railway)

**Rationale**: Campaign optimization, real-time bidding, and analytics require
intensive computation

**Functions (8+ functions)**:

- `create-advertiser-profile`, `get-advertiser-profile`
- `create-ad-campaign`, `update-ad-campaign`, `get-ad-campaigns`
- `approve-ad-campaign`, `track-ad-event`, `get-ad-analytics`
- `fetch-ads` (ad serving with targeting)

**Database Tables**:

- `advertiser_profiles`, `ad_campaigns`
- Campaign analytics and performance tracking tables

**Characteristics**:

- Database Intensity: 6.5/10 (campaign data, analytics)
- Compute Intensity: 9.0/10 (real-time targeting, optimization algorithms)
- Traffic Pattern: High/Continuous (ad serving, event tracking)
- Access Pattern: High-frequency reads with real-time analytics

#### Customer Support Service Module (Railway)

**Rationale**: Ticket routing, escalation logic, and cross-service integration
require flexible processing

**Functions (4+ functions)**:

- `create-support-ticket`, `get-my-tickets`
- `reply-to-ticket`, `report-content`
- Support staff management and escalation functions

**Database Tables**:

- `support_tickets`, `support_staff`, `ticket_messages`
- Support analytics and performance tracking

**Characteristics**:

- Database Intensity: 7.0/10 (ticket history, conversation threads)
- Compute Intensity: 6.5/10 (routing algorithms, escalation logic)
- Traffic Pattern: Medium/Steady (support requests)
- Access Pattern: Read/write balanced with search capabilities

#### Delivery and Logistics Service Module (Railway)

**Rationale**: Route optimization, real-time tracking, and courier management
require intensive computation

**Functions (6+ functions - to be created)**:

- `assign-delivery`, `track-delivery`, `update-delivery-status`
- `get-courier-assignments`, `optimize-delivery-routes`
- `handle-delivery-exceptions`

**Database Tables (to be created)**:

- `delivery_assignments`, `courier_profiles`, `delivery_routes`
- `delivery_tracking`, `delivery_exceptions`

**Characteristics**:

- Database Intensity: 6.0/10 (tracking data, route history)
- Compute Intensity: 9.5/10 (route optimization, real-time tracking)
- Traffic Pattern: High/Real-time (location updates, status changes)
- Access Pattern: Write-heavy with real-time location processing

#### Enhanced Communication Service Module (Railway)

**Rationale**: Multi-channel notification processing and external service
integration

**Functions (6+ functions)**:

- `send-notification`, `queue-notification`, `batch-queue-notifications`
- `process-notification-queue`, `send-sms`, `send-order-confirmation`

**External Service Integrations**:

- SendGrid (email), Twilio (SMS), Firebase (push notifications)
- Integration with all platform services for event-driven notifications

**Characteristics**:

- Database Intensity: 5.5/10 (notification logs, preferences)
- Compute Intensity: 7.5/10 (message processing, channel optimization)
- Traffic Pattern: High/Burst (notification storms, batch processing)
- Access Pattern: Write-heavy with external API calls

## Updated Platform Architecture

### Service Distribution Summary

1. **Supabase Services** (Database-Intensive): 60+ functions
   - Core user management and authentication
   - Hotel booking system (27 functions)
   - Payment processing (11 functions)
   - Taxi core operations (9 functions)
   - Utility and configuration services

2. **Railway Services** (Compute-Intensive): 40+ functions
   - Social media platform (12 functions)
   - Ecommerce marketplace (8+ functions)
   - Advertising platform (8+ functions)
   - Admin and analytics (10+ functions)
   - Customer support (4+ functions)
   - Delivery and logistics (6+ functions)
   - Communication services (6+ functions)
   - Media processing (3+ functions)

### Cross-Service Communication Architecture

#### Service Mesh Pattern

```
┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │────│  Load Balancer  │
│   (Railway)     │    │   (Railway)     │
└─────────────────┘    └─────────────────┘
         │                       │
    ┌────┴────┐             ┌────┴────┐
    │ Supabase│             │ Railway │
    │Services │             │Services │
    └─────────┘             └─────────┘
         │                       │
    ┌────┴────────────────────────┴────┐
    │     Shared Supabase Database     │
    │     (Single Source of Truth)     │
    └──────────────────────────────────┘
```

#### Authentication Flow

1. **User Authentication**: Supabase Auth (centralized)
2. **Service Authorization**: JWT tokens with service-specific scopes
3. **Cross-Service Calls**: Service-to-service authentication via API keys

#### Data Consistency Strategy

1. **Database**: Single Supabase PostgreSQL instance (source of truth)
2. **Caching**: Service-level caching with TTL and invalidation
3. **Events**: Real-time updates via Supabase Realtime subscriptions
4. **Transactions**: Cross-service transactions via database-level ACID
   compliance

## Updated Correctness Properties

### Property 13: Cross-Service Data Consistency

_For any_ user action that affects multiple services, all related data updates
should be atomic and consistent across the platform **Validates: Requirements
14.2, 14.6**

### Property 14: Service Authentication Integrity

_For any_ cross-service communication, authentication tokens should be valid and
service permissions should be properly enforced **Validates: Requirements 14.1,
14.7**

### Property 15: Notification Delivery Guarantee

_For any_ platform event requiring user notification, the message should be
delivered through at least one configured channel within the specified time
window **Validates: Requirements 15.1, 15.3**

### Property 16: Vendor Commission Accuracy

_For any_ completed transaction involving vendors (hotel, ecommerce,
advertising), commission calculations should be accurate and consistent with
platform policies **Validates: Requirements 10.5, 10.6, 11.4**

### Property 17: Support Ticket Routing Consistency

_For any_ support ticket created, it should be assigned to appropriate staff
based on category and priority rules without duplication **Validates:
Requirements 12.2, 12.4**

### Property 18: Delivery Assignment Optimization

_For any_ delivery request, courier assignment should optimize for delivery
time, cost, and courier availability **Validates: Requirements 13.1, 13.2**

## Service Deployment Strategy

### Phase-Based Migration Approach

1. **Phase 1**: Core Services (Hotel, Taxi, Payment) - Already in progress
2. **Phase 2**: Social Media Service - In progress
3. **Phase 3**: Ecommerce and Advertising Services
4. **Phase 4**: Support and Communication Services
5. **Phase 5**: Delivery and Logistics Services
6. **Phase 6**: Advanced Analytics and AI Services

### Service Dependencies

- **High Priority**: Authentication, Payment, Notification services
- **Medium Priority**: Admin, Support, Media processing
- **Low Priority**: Advanced analytics, recommendation engines

### Performance Requirements

- **API Response Time**: <200ms for 95th percentile
- **Database Query Time**: <100ms for standard operations
- **Cross-Service Communication**: <50ms internal latency
- **Real-time Updates**: <100ms for notifications and live data

### Scalability Considerations

- **Horizontal Scaling**: Railway services can scale independently
- **Database Scaling**: Connection pooling and read replicas
- **Caching Strategy**: Multi-level caching (service, CDN, database)
- **Load Balancing**: Geographic distribution and service-specific routing

This comprehensive design update ensures all discovered services and user types
are properly architected for the platform split, maintaining performance,
scalability, and consistency across the entire multi-service platform.
