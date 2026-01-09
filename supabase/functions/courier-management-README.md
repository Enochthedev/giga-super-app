# Courier Management Functions

This document provides comprehensive documentation for the courier management
functions implemented as part of the delivery logistics enhancement (Task 2.1).

## Overview

The courier management system consists of 5 core functions that handle the
complete courier lifecycle from onboarding to earnings calculation and payout
processing.

## Functions

### 1. onboard-courier

**Purpose**: Handles new courier registration and verification workflow

**Endpoint**: `POST /functions/v1/onboard-courier`

**Authentication**: Required (JWT Bearer token)

**Request Body**:

```typescript
{
  first_name: string;           // Required, min 2 characters
  last_name: string;            // Required, min 2 characters
  phone_number: string;         // Required, valid phone format
  email: string;                // Required, valid email format
  license_number: string;       // Required, min 5 characters
  license_expiry_date: string;  // Required, YYYY-MM-DD format, future date
  vehicle_type: string;         // Required, min 2 characters
  vehicle_registration: string; // Required, min 3 characters
  vehicle_capacity_kg?: number; // Optional, 0-10000 kg
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  bank_account_number?: string;
  bank_name?: string;
  account_holder_name?: string;
  max_delivery_radius_km?: number; // Optional, 0-500 km
}
```

**Response**:

```typescript
{
  success: true;
  data: {
    courier_id: string;
    courier_code: string;        // Format: CUR-YYYYMMDD-XXXX
    verification_status: "pending";
    message: string;
    next_steps: string[];
  };
}
```

**Features**:

- Generates unique courier codes
- Validates license expiry dates
- Creates audit trail entries
- Prevents duplicate registrations
- Sets initial verification status to pending

### 2. update-courier-availability

**Purpose**: Real-time courier availability status and location tracking

**Endpoint**: `POST /functions/v1/update-courier-availability`

**Authentication**: Required (JWT Bearer token)

**Request Body**:

```typescript
{
  availability_status: 'available' | 'busy' | 'offline' | 'on_break';
  latitude?: number;            // -90 to 90
  longitude?: number;           // -180 to 180
  is_online?: boolean;
  shift_start_time?: string;    // HH:MM format
  shift_end_time?: string;      // HH:MM format
}
```

**Response**:

```typescript
{
  success: true;
  data: {
    courier_id: string;
    courier_code: string;
    availability_status: string;
    is_online: boolean;
    location?: {
      latitude: number;
      longitude: number;
      updated_at: string;
    };
    shift_times: {
      start: string;
      end: string;
    };
    pending_assignments: Assignment[];
    message: string;
  };
}
```

**Features**:

- Updates PostGIS location data for spatial queries
- Auto-determines online status based on availability
- Returns pending assignments when courier becomes available
- Validates coordinate ranges
- Creates audit trail for location updates

### 3. get-courier-assignments

**Purpose**: Retrieve and manage courier delivery assignments with workload
analytics

**Endpoint**: `GET /functions/v1/get-courier-assignments`

**Authentication**: Required (JWT Bearer token)

**Query Parameters**:

- `status`: Filter by assignment status (default: 'all')
  - Options: 'all', 'pending', 'assigned', 'picked_up', 'in_transit',
    'out_for_delivery', 'delivered', 'failed', 'cancelled'
- `limit`: Number of assignments to return (1-100, default: 20)
- `offset`: Pagination offset (default: 0)
- `date`: Filter by specific date (YYYY-MM-DD format)
- `include_route`: Include route optimization data (default: false)

**Response**:

```typescript
{
  success: true;
  data: {
    courier: {
      id: string;
      courier_code: string;
      availability_status: string;
      is_verified: boolean;
      rating: number;
      total_deliveries: number;
    };
    assignments: Assignment[];
    workload_stats: {
      total_assignments: number;
      completed_assignments: number;
      pending_assignments: number;
      failed_assignments: number;
      completion_rate: string;
      total_earnings: string;
    };
    performance_metrics: {
      average_rating: number;
      total_deliveries_30d: number;
      average_delivery_time: number;
      on_time_delivery_rate: number;
    };
    route_info?: RouteInfo;
    pagination: PaginationInfo;
  };
}
```

**Features**:

- Comprehensive assignment filtering and pagination
- Real-time workload statistics calculation
- Performance metrics for last 30 days
- Optional route optimization data
- Includes order and address details

### 4. track-courier-performance

**Purpose**: Courier performance tracking, ratings, and analytics system

**Endpoints**:

- `GET /functions/v1/track-courier-performance` - Retrieve performance metrics
- `POST /functions/v1/track-courier-performance` - Update performance data

**Authentication**: Required (JWT Bearer token)

#### GET Performance Metrics

**Query Parameters**:

- `courier_id`: Specific courier ID (optional, defaults to current user)
- `period`: Performance period in days (default: 30)
- `include_details`: Include detailed assignment data (default: false)

**Response**:

```typescript
{
  success: true;
  data: {
    courier: CourierInfo;
    performance_metrics: {
      period: {
        days: number;
        start_date: string;
        end_date: string;
      };
      summary: {
        total_assignments: number;
        completed_assignments: number;
        failed_assignments: number;
        completion_rate: number;
        average_rating: number;
        on_time_delivery_rate: number;
        total_earnings: number;
        average_earnings_per_delivery: number;
        average_delivery_time_minutes: number;
      };
      trends: {
        completion_rate_change: number;
        rating_change: number;
      };
      ratings_distribution: {
        counts: { 1: number; 2: number; 3: number; 4: number; 5: number; };
        percentages: { 1: number; 2: number; 3: number; 4: number; 5: number; };
      };
    };
    recent_assignments?: Assignment[];
  };
}
```

#### POST Performance Update

**Request Body**:

```typescript
{
  delivery_assignment_id: string;
  customer_rating?: number;        // 1-5
  customer_feedback?: string;
  delivery_time_minutes?: number;
  on_time_delivery?: boolean;
  delivery_issues?: string[];
  performance_notes?: string;
}
```

**Features**:

- Automatic courier metrics recalculation
- Performance trend analysis
- Ratings distribution analytics
- Authorization checks for data access
- Comprehensive audit logging

### 5. calculate-courier-earnings

**Purpose**: Courier earnings calculation and payout processing integration

**Endpoints**:

- `GET /functions/v1/calculate-courier-earnings` - Retrieve earnings summary
- `POST /functions/v1/calculate-courier-earnings` - Process payout request

**Authentication**: Required (JWT Bearer token)

#### GET Earnings Summary

**Query Parameters**:

- `courier_id`: Specific courier ID (optional, defaults to current user)
- `period`: Earnings period (default: 'current_month')
  - Options: 'today', 'yesterday', 'current_week', 'current_month',
    'last_month', 'last_30_days'
- `include_breakdown`: Include detailed earnings breakdown (default: false)

**Response**:

```typescript
{
  success: true;
  data: {
    courier: CourierInfo;
    earnings_summary: {
      period: PeriodInfo;
      earnings: {
        total_earnings: number;
        completed_earnings: number;
        pending_earnings: number;
        available_balance: number;
        total_paid_out: number;
      };
      statistics: {
        total_assignments: number;
        completed_assignments: number;
        pending_assignments: number;
        average_earnings_per_delivery: number;
        average_commission_rate: number;
      };
      payout_info: {
        bank_account_configured: boolean;
        bank_details?: BankDetails;
        minimum_payout_amount: number;
        can_request_payout: boolean;
      };
    };
    recent_payouts: Payout[];
    earnings_breakdown?: {
      daily_earnings: DailyEarning[];
      assignments_by_status: StatusEarnings;
      top_earning_assignments: Assignment[];
    };
  };
}
```

#### POST Payout Request

**Request Body**:

```typescript
{
  courier_id?: string;
  period_start?: string;          // YYYY-MM-DD
  period_end?: string;            // YYYY-MM-DD
  payout_method?: 'bank_transfer' | 'mobile_money';
  bank_details?: {
    bank_name: string;
    account_number: string;
    account_name: string;
  };
}
```

**Response**:

```typescript
{
  success: true;
  data: {
    payout_id: string;
    amount: number;
    currency: string;
    payout_method: string;
    bank_details: MaskedBankDetails;
    status: 'pending';
    estimated_processing_time: string;
    assignments_included: number;
    message: string;
  }
}
```

**Features**:

- Flexible earnings period calculation
- Minimum payout amount validation
- Bank account masking for security
- Payout history tracking
- Daily earnings breakdown
- Commission rate analytics

## Database Integration

All functions integrate with the existing courier-related database tables:

- **courier_profiles**: Main courier information and metrics
- **delivery_assignments**: Order-to-courier assignments with earnings data
- **delivery_routes**: Route optimization data
- **delivery_tracking**: Real-time GPS tracking
- **delivery_exceptions**: Issue tracking and resolution
- **vendor_payouts**: Payout processing and history
- **audit_trail**: Comprehensive audit logging

## Security Features

- **Authentication**: All endpoints require valid JWT tokens
- **Authorization**: Users can only access their own data unless admin
- **Input Validation**: Comprehensive validation with detailed error messages
- **Audit Logging**: All operations logged to audit_trail table
- **Data Masking**: Sensitive information (account numbers) masked in responses
- **Rate Limiting**: Standard rate limiting applies to all endpoints

## Error Handling

All functions use standardized error responses with appropriate HTTP status
codes:

- **400**: Validation errors with detailed field-level feedback
- **401**: Authentication required or invalid token
- **403**: Insufficient permissions
- **404**: Resource not found
- **409**: Conflict (duplicate data, insufficient balance)
- **500**: Internal server error

## Performance Considerations

- **Database Indexing**: Functions leverage existing indexes on courier_profiles
  and delivery_assignments
- **Pagination**: Large result sets are paginated to prevent performance issues
- **Caching**: Location updates use efficient PostGIS spatial indexing
- **Connection Pooling**: All functions use Supabase connection pooling

## Integration Points

These functions integrate with:

- **Payment System**: Earnings calculation and payout processing
- **Notification System**: Status updates and payout notifications
- **Location Services**: Real-time GPS tracking and route optimization
- **Order Management**: Automatic assignment creation on order status changes
- **Admin Dashboard**: Performance monitoring and courier management

## Next Steps

1. Deploy functions to Supabase
2. Configure function permissions and RLS policies
3. Set up automated testing for all endpoints
4. Integrate with mobile courier application
5. Implement real-time notifications for status changes
6. Add performance monitoring and alerting

## Requirements Fulfilled

This implementation addresses the following requirements from Task 2.1:

- ✅ **2.1**: Courier onboarding with verification workflow
- ✅ **2.2**: Real-time availability status tracking
- ✅ **2.5**: Performance tracking and rating system
- ✅ **2.6**: Earnings calculation and payout integration
- ✅ **Workload Management**: Comprehensive assignment management system

All functions follow the standardized function template and include proper error
handling, logging, and security measures as established in the platform
architecture standards.
