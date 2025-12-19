# Giga Taxi Service - Edge Functions Summary

## ✅ Functions Created

### Rider Functions

#### 1. **get-ride-estimate** ✅

- **File**: `supabase/functions/get-ride-estimate/index.ts`
- **Method**: POST
- **Features**:
  - Google Maps Distance Matrix API integration
  - Haversine distance calculation fallback
  - Surge pricing support
  - Multiple vehicle types with different pricing
  - Detailed fare breakdown
  - Dynamic pricing based on time and distance

#### 2. **request-ride** ✅

- **File**: `supabase/functions/request-ride/index.ts`
- **Method**: POST
- **Features**:
  - Creates ride request
  - Finds nearby drivers (using PostGIS function)
  - Sends notifications to top 5 nearest drivers
  - Validates no active rides
  - Supports scheduled rides
  - Automatic fare estimation
  - **Updated**: Fixed to use `passenger_id` column

#### 3. **get-active-ride** ✅

- **File**: `supabase/functions/get-active-ride/index.ts`
- **Method**: GET
- **Features**:
  - Fetches current active ride for rider OR driver
  - Includes full driver/rider profile details
  - Returns real-time driver location (parsed from PostGIS)
  - Returns vehicle details

#### 4. **cancel-ride** ✅

- **File**: `supabase/functions/cancel-ride/index.ts`
- **Method**: POST
- **Features**:
  - Handles cancellations by Rider or Driver
  - Applies cancellation fee logic (e.g. 5 min grace period)
  - Updates ride status
  - Sends notification to the other party

#### 5. **get-ride-history** ✅

- **File**: `supabase/functions/get-ride-history/index.ts`
- **Method**: GET
- **Features**:
  - List past rides with pagination
  - Role-based filtering (rider/driver)
  - Includes profile details of the other party

#### 6. **rate-driver** ✅

- **File**: `supabase/functions/rate-driver/index.ts`
- **Method**: POST
- **Features**:
  - Submit rating and review for a completed ride
  - Updates driver's average rating in profile

#### 7. **get-nearby-drivers** ✅

- **File**: `supabase/functions/get-nearby-drivers/index.ts`
- **Method**: POST
- **Features**:
  - Wrapper for `find_nearby_drivers` RPC
  - Returns available drivers within radius

### Driver Functions

#### 8. **accept-ride** ✅

- **File**: `supabase/functions/accept-ride/index.ts`
- **Method**: POST
- **Features**:
  - Driver verification
  - Availability check
  - Optimistic locking (prevents double-booking)
  - ETA calculation
  - Rider notification
  - Scheduled ride validation

#### 9. **start-ride** ✅

- **File**: `supabase/functions/start-ride/index.ts`
- **Method**: POST
- **Features**:
  - Transitions ride to 'in_progress'
  - Verifies driver authorization
  - Records start time
  - Notifies rider

#### 10. **complete-ride** ✅

- **File**: `supabase/functions/complete-ride/index.ts`
- **Method**: POST
- **Features**:
  - Calculates final fare based on actual time/distance
  - Updates ride status to 'completed'
  - Records driver earnings and platform commission
  - Notifies rider with receipt

#### 11. **toggle-availability** ✅

- **File**: `supabase/functions/toggle-availability/index.ts`
- **Method**: POST
- **Features**:
  - Toggles driver online/offline status
  - Updates timestamp

#### 12. **update-location** ✅

- **File**: `supabase/functions/update-location/index.ts`
- **Method**: POST
- **Features**:
  - Updates driver's real-time location (PostGIS)
  - Updates heading and speed
  - If on an active ride, logs location to `ride_tracking` history

#### 13. **get-ride-requests** ✅

- **File**: `supabase/functions/get-ride-requests/index.ts`
- **Method**: GET
- **Features**:
  - List pending ride requests for drivers
  - Includes rider details

#### 14. **get-earnings** ✅

- **File**: `supabase/functions/get-earnings/index.ts`
- **Method**: GET
- **Features**:
  - View earnings history and summary stats

#### 15. **reject-ride** ✅

- **File**: `supabase/functions/reject-ride/index.ts`
- **Method**: POST
- **Features**:
  - Explicitly decline a request (logging only for now)

### Admin Features

#### 16. **verify-driver** ✅

- **File**: `supabase/functions/verify-driver/index.ts`
- **Method**: POST
- **Features**:
  - Approve/Verify driver status

#### 17. **get-ride-analytics** ✅

- **File**: `supabase/functions/get-ride-analytics/index.ts`
- **Method**: GET
- **Features**:
  - Platform stats (total rides, active drivers, etc.)

#### 18. **get-platform-settings** ✅

- **File**: `supabase/functions/get-platform-settings/index.ts`
- **Method**: GET
- **Features**:
  - Fetch dynamic platform configuration

#### 19. **update-platform-setting** ✅

- **File**: `supabase/functions/update-platform-setting/index.ts`
- **Method**: POST
- **Features**:
  - Update platform configuration

---

## Database Functions

### PostGIS Functions

```sql
-- Find nearby drivers (RPC)
-- Used by request-ride and get-nearby-drivers
CREATE OR REPLACE FUNCTION find_nearby_drivers(
  target_lat DOUBLE PRECISION,
  target_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION,
  vehicle_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  distance_km DOUBLE PRECISION,
  last_location GEOGRAPHY,
  vehicle_type TEXT,
  rating NUMERIC,
  total_rides INTEGER
)
```

---

## Deployment Commands

```bash
# Deploy all functions
cd /Users/user/Dev/giga
supabase functions deploy get-ride-estimate request-ride accept-ride start-ride complete-ride cancel-ride toggle-availability update-location get-active-ride get-ride-history rate-driver get-nearby-drivers get-ride-requests get-earnings reject-ride verify-driver get-ride-analytics get-platform-settings update-platform-setting
```
