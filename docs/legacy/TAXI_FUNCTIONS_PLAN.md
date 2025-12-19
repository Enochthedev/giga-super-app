# Giga Taxi Service - Edge Functions Plan

## Overview

Complete ride-hailing service similar to Uber with real-time features, dynamic
pricing, and driver matching.

---

## External Services Integration

### 1. **Google Maps Platform / Mapbox**

- Distance Matrix API - Calculate distances and ETAs
- Directions API - Get route information
- Geocoding API - Convert addresses to coordinates
- Places API - Autocomplete for pickup/dropoff locations

### 2. **Twilio**

- SMS notifications for ride updates
- Driver verification via SMS

### 3. **Real-time Updates**

- Supabase Realtime for live location tracking
- Driver availability updates
- Ride status changes

---

## Rider Functions

### 1. **get-ride-estimate** ✅

- **Method**: POST
- **Purpose**: Get price estimate before booking
- **Input**:
  - `pickup_lat`, `pickup_lng`
  - `dropoff_lat`, `dropoff_lng`
  - `vehicle_type` (optional)
- **Output**:
  - Estimated fare
  - Estimated duration
  - Estimated distance
  - Available vehicle types
- **External**: Google Maps Distance Matrix API

### 2. **request-ride** ✅

- **Method**: POST
- **Purpose**: Create a new ride request
- **Input**:
  - `pickup_location` (address, lat, lng)
  - `dropoff_location` (address, lat, lng)
  - `vehicle_type`
  - `payment_method_id`
  - `notes` (optional)
- **Logic**:
  - Create ride record with status 'pending'
  - Find nearby available drivers
  - Send notifications to nearby drivers
  - Return ride details
- **External**: Notification service

### 3. **cancel-ride** ✅

- **Method**: POST
- **Purpose**: Cancel an active or pending ride
- **Input**: `ride_id`, `reason`
- **Logic**:
  - Check cancellation policy
  - Calculate cancellation fee if applicable
  - Update ride status
  - Notify driver if assigned
  - Process refund if needed

### 4. **get-active-ride** ✅

- **Method**: GET
- **Purpose**: Get rider's currently active ride
- **Output**: Active ride details with driver info and real-time location

### 5. **get-ride-history** ✅

- **Method**: GET
- **Purpose**: Get past rides
- **Query**: `limit`, `offset`, `status`
- **Output**: Paginated list of rides

### 6. **rate-driver** ✅

- **Method**: POST
- **Purpose**: Rate driver after ride completion
- **Input**: `ride_id`, `rating` (1-5), `comment`, `tips` (optional)

### 7. **get-nearby-drivers** ✅

- **Method**: POST
- **Purpose**: See available drivers nearby
- **Input**: `lat`, `lng`, `radius_km`
- **Output**: List of available drivers with location and ETA

---

## Driver Functions

### 8. **toggle-availability** ✅

- **Method**: POST
- **Purpose**: Go online/offline
- **Input**: `is_available`
- **Logic**:
  - Update driver_profiles.is_available
  - Update last_location if going online
  - Clear active sessions if going offline

### 9. **update-location** ✅

- **Method**: POST
- **Purpose**: Update driver's real-time location
- **Input**: `lat`, `lng`, `heading` (optional)
- **Logic**:
  - Update driver_profiles.last_location
  - Update driver_profiles.last_location_update
  - If on active ride, update ride tracking

### 10. **get-ride-requests** ✅

- **Method**: GET
- **Purpose**: Get pending ride requests in driver's area
- **Output**: List of nearby ride requests with fare estimates

### 11. **accept-ride** ✅

- **Method**: POST
- **Purpose**: Accept a ride request
- **Input**: `ride_id`
- **Logic**:
  - Check if ride still available
  - Assign driver to ride
  - Update ride status to 'accepted'
  - Notify rider
  - Calculate ETA and route

### 12. **reject-ride** ✅

- **Method**: POST
- **Purpose**: Reject a ride request
- **Input**: `ride_id`, `reason`

### 13. **start-ride** ✅

- **Method**: POST
- **Purpose**: Mark ride as started (driver arrived and rider in car)
- **Input**: `ride_id`
- **Logic**:
  - Verify driver at pickup location
  - Update ride status to 'in_progress'
  - Record actual start time
  - Start trip tracking

### 14. **complete-ride** ✅

- **Method**: POST
- **Purpose**: Mark ride as completed
- **Input**: `ride_id`, `final_location` (lat, lng)
- **Logic**:
  - Calculate final fare (actual distance vs estimate)
  - Update ride status to 'completed'
  - Process payment
  - Update driver earnings
  - Send receipt to rider

### 15. **get-earnings** ✅

- **Method**: GET
- **Purpose**: Get driver earnings summary
- **Query**: `period` (today, week, month, custom)
- **Output**:
  - Total earnings
  - Number of rides
  - Average rating
  - Breakdown by day

---

## Admin Functions

### 16. **get-ride-analytics** ✅

- **Method**: GET
- **Purpose**: Platform analytics
- **Auth**: Admin only
- **Output**:
  - Total rides
  - Active riders/drivers
  - Revenue metrics
  - Popular routes

### 17. **verify-driver** ✅

- **Method**: POST
- **Purpose**: Verify driver documents
- **Auth**: Admin only
- **Input**: `driver_id`, `verification_status`

---

## Shared/Utility Functions

### 18. **calculate-fare** (Internal utility)

- Dynamic pricing based on:
  - Distance
  - Duration
  - Time of day (surge pricing)
  - Demand in area
  - Vehicle type

### 19. **find-nearby-drivers** (Internal utility)

- Use PostGIS for geospatial queries
- Find drivers within radius
- Filter by availability and vehicle type

### 20. **send-ride-notification** (Internal utility)

- Send push notifications
- Send SMS via Twilio
- Email notifications

---

## Database Schema Requirements

### Tables Needed:

- ✅ `rides` - Main ride records
- ✅ `driver_profiles` - Driver information
- ✅ `user_profiles` - Rider information
- ✅ `ride_tracking` - Real-time location tracking during ride
- ✅ `driver_earnings` - Earnings records
- ✅ `surge_pricing_zones` - Dynamic pricing areas
- ✅ `vehicle_types` - Car types and base pricing

### Key Fields:

- `rides`:
  - Pickup/dropoff locations (geography points)
  - Status (pending, accepted, in_progress, completed, cancelled)
  - Fare information
  - Driver assignment
- `driver_profiles`:
  - Current location (geography point)
  - Availability status
  - Vehicle information
  - Rating

---

## Priority Implementation Order

### Phase 1 - Core Ride Flow (MVP)

1. request-ride
2. accept-ride
3. start-ride
4. complete-ride
5. get-active-ride

### Phase 2 - Essential Features

6. get-ride-estimate
7. cancel-ride
8. toggle-availability
9. update-location

### Phase 3 - Driver Features

10. get-ride-requests
11. get-earnings
12. reject-ride

### Phase 4 - Rider Features

13. get-ride-history
14. rate-driver
15. get-nearby-drivers

### Phase 5 - Admin & Analytics

16. get-ride-analytics
17. verify-driver

---

## Environment Variables Needed

```bash
# Google Maps
GOOGLE_MAPS_API_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Pricing
BASE_FARE=500
COST_PER_KM=100
COST_PER_MINUTE=20
SURGE_MULTIPLIER_MAX=3.0
CANCELLATION_FEE=200

# Commission
DRIVER_COMMISSION_RATE=0.80  # Driver keeps 80%
```

---

## Next Steps

1. Create all edge functions
2. Add proper error handling
3. Implement real-time tracking
4. Set up notifications
5. Add surge pricing logic
6. Create admin dashboard functions
