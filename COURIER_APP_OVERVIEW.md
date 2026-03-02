# Courier App Overview - Giga Platform

## Overview

Yes, we have a **complete courier/delivery app** as part of the Giga platform!
The courier functionality is handled by the **Delivery Service**, which provides
a full-featured delivery and logistics system.

## Courier App Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      COURIER APP ECOSYSTEM                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  Courier Mobile App  │  ← Frontend (to be built)
│  (iOS/Android)       │
└──────────┬───────────┘
           │
           │ REST API + WebSocket
           │
           ▼
┌──────────────────────┐
│  Delivery Service    │  ← Backend (COMPLETE ✅)
│  Port 3003           │
│  TypeScript/Express  │
└──────────┬───────────┘
           │
           ├─→ Supabase PostgreSQL (courier_profiles, delivery_assignments, tracking)
           ├─→ Google Maps API (route optimization, geocoding)
           ├─→ WebSocket (real-time tracking)
           └─→ NIPOST Admin (approval workflow)
```

## Courier Lifecycle

### 1. Courier Onboarding (Application)

**User Journey:**

1. User creates account via Supabase Auth
2. User applies to become courier via Delivery Service
3. Application stored in `courier_profiles` table with status='pending'
4. PMG reviews application in NIPOST Admin Dashboard
5. PMG approves → COURIER role created automatically
6. Courier can now log in to courier app

**API Endpoint:**

```http
POST /api/v1/couriers
Authorization: Bearer <user-jwt-token>

{
  "first_name": "Jane",
  "last_name": "Smith",
  "phone_number": "+2348012345678",
  "email": "jane@example.com",
  "license_number": "ABC123456",
  "license_expiry_date": "2027-12-31",
  "vehicle_type": "motorcycle",
  "vehicle_registration": "LAG-123-XY",
  "vehicle_capacity_kg": 50,
  "state": "Lagos",
  "state_id": "lagos"
}
```

### 2. Courier Approval (NIPOST Admin)

**PMG Workflow:**

1. PMG logs in to NIPOST Admin Dashboard
2. Views courier applications in their state
3. Reviews courier details (license, vehicle, etc.)
4. Approves or rejects application
5. System automatically creates COURIER role

**API Endpoint:**

```http
POST /api/nipost-admin/couriers/applications/{id}/approve
Authorization: Bearer <pmg-jwt-token>

# No body required - user_id already in courier_profiles
```

**What Happens Automatically:**

- `courier_profiles.approval_status` → 'approved'
- `courier_profiles.is_verified` → true
- `courier_profiles.approving_state` → PMG's state
- Entry created in `user_roles` with role='COURIER'
- Entry created in `user_active_roles` with active_role='COURIER'

### 3. Courier Operations (Daily Use)

Once approved, couriers can:

#### A. Update Availability

```http
POST /api/v1/couriers/{courierId}/availability
{
  "availability_status": "available",  // available, busy, offline
  "is_online": true
}
```

#### B. Update Location (Real-time)

```http
POST /api/v1/couriers/{courierId}/location
{
  "latitude": 6.5244,
  "longitude": 3.3792
}
```

#### C. View Assigned Deliveries

```http
GET /api/v1/assignments/courier/{courierId}?status=assigned
```

#### D. Update Delivery Status

```http
PUT /api/v1/assignments/{assignmentId}/status
{
  "status": "picked_up",  // assigned, picked_up, in_transit, delivered, failed
  "notes": "Package picked up from sender"
}
```

#### E. Track Delivery Progress

```http
POST /api/v1/track-delivery
{
  "assignment_id": "uuid",
  "latitude": 6.5244,
  "longitude": 3.3792,
  "status": "in_transit",
  "notes": "On the way to delivery location"
}
```

#### F. View Optimized Route

```http
GET /api/v1/routes/{courierId}/current
```

#### G. View Performance Stats

```http
GET /api/v1/couriers/{courierId}/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "total_deliveries": 150,
    "successful_deliveries": 145,
    "failed_deliveries": 5,
    "rating": 4.8,
    "average_delivery_time_minutes": 35,
    "success_rate": 96.67,
    "current_assignments": 2,
    "earnings_this_month": 45000
  }
}
```

## Real-time Features (WebSocket)

### Connect to WebSocket

```http
GET /api/v1/websocket/token
Authorization: Bearer <courier-jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "websocket-auth-token",
    "url": "wss://delivery-service.railway.app"
  }
}
```

### WebSocket Events

**Courier Receives:**

- `assignment:new` - New delivery assigned
- `route:optimized` - Route optimization completed
- `status:update` - Delivery status changed by system

**Courier Sends:**

- `tracking:update` - Real-time location updates
- `status:update` - Delivery status changes

## Intelligent Courier Matching

When a new package is created, the system automatically finds the best courier
using a scoring algorithm:

### Matching Criteria (Weighted)

1. **Distance** (40%): Proximity to pickup location
2. **Rating** (25%): Courier performance rating
3. **Experience** (15%): Total completed deliveries
4. **Workload** (10%): Current assignment load
5. **Availability** (5%): Online status
6. **Priority Bonus** (5%): High-priority delivery bonus

### Matching Process

```http
POST /api/v1/assignments
{
  "package_id": "uuid",
  "pickup_location": {
    "latitude": 6.5244,
    "longitude": 3.3792
  },
  "delivery_location": {
    "latitude": 6.4281,
    "longitude": 3.4219
  },
  "priority": "high"
}
```

**System Actions:**

1. Finds couriers within delivery radius (default 25km)
2. Filters by vehicle capacity and type
3. Checks availability and verification status
4. Scores each courier using weighted algorithm
5. Assigns to top-scored courier
6. Sends real-time notification via WebSocket

## Route Optimization

The system automatically optimizes delivery routes using Google Maps:

### Features

- **Traveling Salesman Problem (TSP)** solving
- **Multi-waypoint routing** for multiple deliveries
- **Traffic consideration** for accurate ETAs
- **Fuel cost estimation**
- **Automatic re-optimization** when new assignments added

### Optimization Endpoint

```http
POST /api/v1/routes/optimize
{
  "courier_id": "uuid",
  "assignments": ["assignment-id-1", "assignment-id-2", "assignment-id-3"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "optimized_sequence": [1, 3, 2],
    "total_distance_km": 15.5,
    "estimated_duration_minutes": 45,
    "fuel_cost_estimate": 2500,
    "waypoints": [
      {
        "assignment_id": "uuid-1",
        "sequence": 1,
        "location": { "lat": 6.5244, "lng": 3.3792 },
        "eta": "2026-03-02T14:30:00Z"
      }
    ]
  }
}
```

## Courier App Features Summary

### ✅ Implemented (Backend Complete)

1. **Onboarding & Verification**
   - Courier application submission
   - Document upload (license, vehicle registration)
   - PMG approval workflow
   - Automatic role creation

2. **Profile Management**
   - Update personal information
   - Update vehicle details
   - Update availability status
   - View performance statistics

3. **Delivery Management**
   - View assigned deliveries
   - Accept/reject assignments
   - Update delivery status
   - Add delivery notes and photos
   - Mark deliveries as complete

4. **Real-time Tracking**
   - GPS location updates
   - Live tracking for customers
   - WebSocket real-time updates
   - Delivery history

5. **Route Optimization**
   - Automatic route planning
   - Multi-stop optimization
   - Traffic-aware routing
   - ETA calculations

6. **Performance Analytics**
   - Delivery success rate
   - Average delivery time
   - Customer ratings
   - Earnings tracking

7. **Communication**
   - Real-time notifications
   - Assignment alerts
   - Status update confirmations

### 🚧 To Be Built (Frontend)

1. **Mobile App UI**
   - iOS app (React Native / Flutter)
   - Android app (React Native / Flutter)
   - Courier dashboard
   - Map integration

2. **Features to Implement**
   - Camera integration for proof of delivery
   - Offline mode for poor connectivity
   - Push notifications
   - In-app messaging with customers
   - Earnings dashboard
   - Weekly/monthly reports

## Database Tables

### courier_profiles

- Courier information, vehicle details, performance metrics
- Approval status and verification
- Location tracking
- Performance statistics

### delivery_assignments

- Links packages to couriers
- Assignment status and history
- Pickup and delivery locations
- Route information

### delivery_tracking

- GPS tracking history
- Status updates with timestamps
- Delivery notes and photos

### route_optimizations

- Optimized routes with waypoints
- Sequence and ETAs
- Distance and duration estimates

## Integration with NIPOST Admin

The courier approval workflow integrates seamlessly with NIPOST Admin:

```
User Applies → Delivery Service → courier_profiles (pending)
                                         ↓
PMG Reviews → NIPOST Admin Dashboard → View Applications
                                         ↓
PMG Approves → NIPOST Admin API → Trigger Creates COURIER Role
                                         ↓
Courier Logs In → Delivery Service → Full Access to Courier Features
```

## API Documentation

Full API documentation available at:

- **Swagger UI**: `http://localhost:3003/api-docs` (when running locally)
- **OpenAPI Spec**: `delivery-service/openapi.json`
- **README**: `delivery-service/README.md`

## Environment Setup

The Delivery Service requires:

```bash
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Service Configuration
PORT=3003
NODE_ENV=production
```

## Deployment

The Delivery Service is configured for Railway deployment:

- **Service Name**: delivery-service
- **Port**: 3003
- **Health Check**: `/health`
- **Docker**: Multi-stage build
- **Status**: ✅ Ready for deployment

## Next Steps for Courier App

1. **Frontend Development**
   - Build React Native mobile app
   - Implement map integration (Google Maps / Mapbox)
   - Add camera for proof of delivery
   - Implement push notifications

2. **Testing**
   - Test courier onboarding flow
   - Test approval workflow with PMG
   - Test real-time tracking
   - Test route optimization

3. **Deployment**
   - Deploy Delivery Service to Railway
   - Configure Google Maps API
   - Set up WebSocket infrastructure
   - Deploy mobile apps to App Store / Play Store

## Summary

✅ **Backend is 100% complete** - The Delivery Service provides all courier
functionality 🚧 **Frontend needs to be built** - Mobile app UI for couriers ✅
**NIPOST integration complete** - PMG can approve couriers ✅ **Real-time
tracking ready** - WebSocket infrastructure in place ✅ **Route optimization
ready** - Google Maps integration complete

The courier app backend is production-ready and waiting for frontend
development! f
 