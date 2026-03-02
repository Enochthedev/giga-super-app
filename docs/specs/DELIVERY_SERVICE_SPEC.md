# Delivery Service - Agent Implementation Specification

## 🎯 Mission: Complete the Delivery Service Implementation

**Status**: ⚠️ 70% Complete - Core structure exists, needs full implementation
**Port**: 3005 **Priority**: High **Estimated Effort**: 8-12 hours

## Current State Analysis

### ✅ What's Already Done

- Express server setup with middleware
- WebSocket service initialization
- Route structure defined (`/routes/tracking`, `/routes/assignments`, etc.)
- Configuration and logging setup
- Package.json with all required dependencies
- TypeScript configuration

### ❌ What Needs Implementation

- **All route handlers are empty** - No business logic implemented
- **Database operations missing** - No Supabase integration
- **WebSocket events not handled** - Real-time features incomplete
- **Google Maps integration missing** - No route optimization
- **Business logic absent** - No delivery algorithms

## 🗄️ Database Schema to Implement

Create these tables in Supabase:

```sql
-- Delivery packages
CREATE TABLE delivery_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id),
  recipient_id UUID REFERENCES auth.users(id),
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  package_description TEXT,
  package_weight DECIMAL(10,2),
  package_dimensions JSONB, -- {length, width, height}
  delivery_fee DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  delivery_instructions TEXT,
  estimated_delivery TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Courier profiles
CREATE TABLE delivery_couriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('bicycle', 'motorcycle', 'car', 'van', 'truck')),
  license_number TEXT,
  phone_number TEXT NOT NULL,
  is_available BOOLEAN DEFAULT false,
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  max_capacity_kg DECIMAL(10,2) DEFAULT 50,
  current_load_kg DECIMAL(10,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_deliveries INTEGER DEFAULT 0,
  last_location_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery assignments
CREATE TABLE delivery_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES delivery_packages(id),
  courier_id UUID REFERENCES delivery_couriers(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'rejected', 'picked_up', 'delivered', 'failed')),
  estimated_duration INTEGER, -- minutes
  actual_duration INTEGER, -- minutes
  distance_km DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery routes (for optimization)
CREATE TABLE delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID REFERENCES delivery_couriers(id),
  route_date DATE DEFAULT CURRENT_DATE,
  packages UUID[] NOT NULL, -- Array of package IDs
  optimized_route JSONB, -- Google Maps route data
  total_distance_km DECIMAL(10,2),
  estimated_duration INTEGER, -- minutes
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package tracking history
CREATE TABLE delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES delivery_packages(id),
  status TEXT NOT NULL,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_name TEXT,
  notes TEXT,
  courier_id UUID REFERENCES delivery_couriers(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_delivery_packages_status ON delivery_packages(status);
CREATE INDEX idx_delivery_packages_sender ON delivery_packages(sender_id);
CREATE INDEX idx_delivery_packages_recipient ON delivery_packages(recipient_id);
CREATE INDEX idx_delivery_couriers_available ON delivery_couriers(is_available);
CREATE INDEX idx_delivery_couriers_location ON delivery_couriers(current_lat, current_lng);
CREATE INDEX idx_delivery_assignments_courier ON delivery_assignments(courier_id);
CREATE INDEX idx_delivery_assignments_package ON delivery_assignments(package_id);
CREATE INDEX idx_delivery_tracking_package ON delivery_tracking(package_id);

-- RLS Policies
ALTER TABLE delivery_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

-- Package access policies
CREATE POLICY "Users can view their own packages" ON delivery_packages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create packages" ON delivery_packages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Couriers can view assigned packages" ON delivery_packages
  FOR SELECT USING (
    id IN (
      SELECT package_id FROM delivery_assignments
      WHERE courier_id IN (
        SELECT id FROM delivery_couriers WHERE user_id = auth.uid()
      )
    )
  );

-- Courier policies
CREATE POLICY "Couriers can manage their profile" ON delivery_couriers
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view available couriers" ON delivery_couriers
  FOR SELECT USING (is_available = true);
```

## 🚀 API Endpoints to Implement

### 1. Package Management Routes (`/routes/tracking.ts`)

```typescript
// GET /api/v1/packages - List user's packages
app.get(
  '/api/v1/packages',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Get user's packages (sent and received)
    // 2. Apply filters (status, date range)
    // 3. Add pagination
    // 4. Return with tracking info
  }
);

// POST /api/v1/packages - Create new package
app.post(
  '/api/v1/packages',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Validate package data
    // 2. Calculate delivery fee
    // 3. Estimate delivery time
    // 4. Create package record
    // 5. Find available couriers
    // 6. Return package with tracking ID
  }
);

// GET /api/v1/packages/:id - Get package details
app.get(
  '/api/v1/packages/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Verify user access (sender/recipient/courier)
    // 2. Get package with full tracking history
    // 3. Include courier info if assigned
    // 4. Return real-time status
  }
);

// PUT /api/v1/packages/:id - Update package
app.put(
  '/api/v1/packages/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Verify sender access
    // 2. Check if package can be modified (status)
    // 3. Update allowed fields
    // 4. Log changes in tracking
  }
);

// DELETE /api/v1/packages/:id - Cancel package
app.delete(
  '/api/v1/packages/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Verify sender access
    // 2. Check if cancellation allowed
    // 3. Soft delete package
    // 4. Notify courier if assigned
    // 5. Process refund if applicable
  }
);

// GET /api/v1/tracking/:packageId - Track package
app.get(
  '/api/v1/tracking/:packageId',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Get package tracking history
    // 2. Include real-time courier location
    // 3. Calculate ETA
    // 4. Return tracking timeline
  }
);

// POST /api/v1/tracking/:packageId/update - Update package status (courier only)
app.post(
  '/api/v1/tracking/:packageId/update',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Verify courier access
    // 2. Validate status transition
    // 3. Update package status
    // 4. Add tracking entry
    // 5. Notify sender/recipient
    // 6. Broadcast WebSocket update
  }
);
```

### 2. Assignment Routes (`/routes/assignments.ts`)

```typescript
// GET /api/v1/assignments - List courier assignments
app.get(
  '/api/v1/assignments',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Verify courier role
    // 2. Get courier's assignments
    // 3. Filter by status/date
    // 4. Include package details
    // 5. Add route optimization data
  }
);

// POST /api/v1/assignments - Create assignment (admin/system)
app.post(
  '/api/v1/assignments',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Find optimal courier
    // 2. Check courier capacity
    // 3. Calculate route impact
    // 4. Create assignment
    // 5. Notify courier
    // 6. Update route optimization
  }
);

// PUT /api/v1/assignments/:id/accept - Accept assignment
app.put(
  '/api/v1/assignments/:id/accept',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Verify courier access
    // 2. Check assignment status
    // 3. Update assignment
    // 4. Update package status
    // 5. Notify sender/recipient
    // 6. Add to courier route
  }
);

// PUT /api/v1/assignments/:id/reject - Reject assignment
app.put(
  '/api/v1/assignments/:id/reject',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Verify courier access
    // 2. Update assignment status
    // 3. Find alternative courier
    // 4. Log rejection reason
    // 5. Reassign if possible
  }
);

// PUT /api/v1/assignments/:id/complete - Complete delivery
app.put(
  '/api/v1/assignments/:id/complete',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Verify courier access
    // 2. Validate completion data (signature, photo)
    // 3. Update package status to delivered
    // 4. Calculate actual duration
    // 5. Update courier stats
    // 6. Process payment
    // 7. Send completion notifications
  }
);
```

### 3. Route Optimization (`/routes/scheduler.ts`)

```typescript
// POST /api/v1/routes/optimize - Optimize delivery route
app.post(
  '/api/v1/routes/optimize',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Get courier's assigned packages
    // 2. Extract pickup/delivery locations
    // 3. Call Google Maps Directions API
    // 4. Optimize route for minimum time/distance
    // 5. Save optimized route
    // 6. Return route with ETA
  }
);

// GET /api/v1/routes/courier/:id - Get courier route
app.get(
  '/api/v1/routes/courier/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Verify courier access
    // 2. Get active route
    // 3. Include package details
    // 4. Calculate progress
    // 5. Return route with navigation data
  }
);

// PUT /api/v1/routes/:id/update - Update route progress
app.put(
  '/api/v1/routes/:id/update',
  async (req: AuthenticatedRequest, res: Response) => {
    // Implementation needed:
    // 1. Verify courier access
    // 2. Update route progress
    // 3. Mark completed stops
    // 4. Recalculate ETA
    // 5. Broadcast updates
  }
);
```

### 4. Courier Management

```typescript
// GET /api/v1/couriers - List available couriers (admin)
// POST /api/v1/couriers/register - Register as courier
// PUT /api/v1/couriers/availability - Update availability
// POST /api/v1/couriers/location - Update location
```

## 🌐 WebSocket Events to Implement

Update `/services/websocket.ts`:

```typescript
// Courier location updates
socket.on(
  'courier:location:update',
  async (data: { lat: number; lng: number }) => {
    // 1. Verify courier authentication
    // 2. Update courier location in database
    // 3. Broadcast to tracking clients
    // 4. Update ETA for assigned packages
  }
);

// Package status updates
socket.on(
  'package:status:update',
  async (data: { packageId: string; status: string; location?: any }) => {
    // 1. Verify courier access to package
    // 2. Update package status
    // 3. Add tracking entry
    // 4. Broadcast to sender/recipient
    // 5. Trigger notifications
  }
);

// Real-time tracking
socket.on('track:package', (data: { packageId: string }) => {
  // 1. Verify user access to package
  // 2. Join tracking room
  // 3. Send current status
});

// Route updates
socket.on(
  'route:progress:update',
  (data: { routeId: string; completedStops: string[] }) => {
    // 1. Update route progress
    // 2. Recalculate ETAs
    // 3. Broadcast updates
  }
);
```

## 🧠 Business Logic to Implement

### 1. Courier Assignment Algorithm

```typescript
// /utils/assignment.ts
export class CourierAssignment {
  async findOptimalCourier(packageData: any): Promise<string | null> {
    // Implementation needed:
    // 1. Get available couriers near pickup location
    // 2. Check capacity constraints
    // 3. Calculate route impact
    // 4. Consider courier ratings
    // 5. Return best match
  }

  async calculateDeliveryFee(
    distance: number,
    weight: number,
    priority: string
  ): Promise<number> {
    // Implementation needed:
    // 1. Base fee calculation
    // 2. Distance-based pricing
    // 3. Weight surcharges
    // 4. Priority multipliers
    // 5. Return total fee
  }

  async estimateDeliveryTime(
    pickupLocation: any,
    deliveryLocation: any
  ): Promise<number> {
    // Implementation needed:
    // 1. Calculate distance via Google Maps
    // 2. Consider traffic conditions
    // 3. Add pickup/delivery time
    // 4. Return estimated minutes
  }
}
```

### 2. Route Optimization

```typescript
// /utils/routeOptimizer.ts
export class RouteOptimizer {
  async optimizeRoute(courierId: string, packages: any[]): Promise<any> {
    // Implementation needed:
    // 1. Extract all pickup/delivery locations
    // 2. Create waypoints array
    // 3. Call Google Maps Directions API
    // 4. Optimize for shortest time
    // 5. Return optimized route
  }

  async calculateRouteMetrics(route: any): Promise<any> {
    // Implementation needed:
    // 1. Total distance
    // 2. Estimated duration
    // 3. Fuel cost estimation
    // 4. Return metrics
  }
}
```

### 3. Notification Integration

```typescript
// /utils/notifications.ts
export class DeliveryNotifications {
  async notifyPackageCreated(packageId: string): Promise<void> {
    // Send confirmation to sender
  }

  async notifyAssignmentCreated(assignmentId: string): Promise<void> {
    // Notify courier of new assignment
  }

  async notifyStatusUpdate(packageId: string, status: string): Promise<void> {
    // Notify sender/recipient of status change
  }

  async notifyDeliveryCompleted(packageId: string): Promise<void> {
    // Send delivery confirmation
  }
}
```

## 🔧 Google Maps Integration

Add to `/utils/maps.ts`:

```typescript
import { Client } from '@googlemaps/google-maps-services-js';

export class MapsService {
  private client = new Client({});

  async calculateDistance(origin: string, destination: string): Promise<any> {
    // Implementation needed:
    // 1. Call Distance Matrix API
    // 2. Return distance and duration
  }

  async optimizeWaypoints(
    origin: string,
    destination: string,
    waypoints: string[]
  ): Promise<any> {
    // Implementation needed:
    // 1. Call Directions API with waypoint optimization
    // 2. Return optimized route
  }

  async geocodeAddress(address: string): Promise<any> {
    // Implementation needed:
    // 1. Call Geocoding API
    // 2. Return lat/lng coordinates
  }
}
```

## 📋 Implementation Checklist

### Phase 1: Database Setup (2 hours)

- [ ] Create all database tables in Supabase
- [ ] Add RLS policies for security
- [ ] Create indexes for performance
- [ ] Test database operations

### Phase 2: Core API Implementation (4 hours)

- [ ] Implement package CRUD operations
- [ ] Add courier management endpoints
- [ ] Create assignment system
- [ ] Add tracking functionality

### Phase 3: Business Logic (3 hours)

- [ ] Implement courier assignment algorithm
- [ ] Add delivery fee calculation
- [ ] Create route optimization
- [ ] Add notification integration

### Phase 4: Real-time Features (2 hours)

- [ ] Complete WebSocket event handlers
- [ ] Add real-time location tracking
- [ ] Implement status broadcasting
- [ ] Test real-time updates

### Phase 5: Google Maps Integration (1 hour)

- [ ] Add distance calculation
- [ ] Implement route optimization
- [ ] Add geocoding support
- [ ] Test maps functionality

## 🧪 Testing Requirements

### Unit Tests

```typescript
// Test courier assignment algorithm
// Test delivery fee calculation
// Test route optimization
// Test status transitions
```

### Integration Tests

```typescript
// Test complete delivery flow
// Test WebSocket events
// Test Google Maps integration
// Test notification sending
```

### API Tests

```typescript
// Test all CRUD operations
// Test authentication/authorization
// Test error handling
// Test rate limiting
```

## 🚀 Success Criteria

1. **All API endpoints functional** - Complete CRUD operations for packages,
   assignments, routes
2. **Real-time tracking working** - WebSocket updates for location and status
3. **Route optimization functional** - Google Maps integration working
4. **Database operations secure** - RLS policies enforced
5. **Comprehensive error handling** - Proper error responses and logging
6. **Performance optimized** - Efficient queries and caching

## 📚 Reference Implementations

Study these existing services for patterns:

- **Social Service** (`social-service/src/index.ts`) - Database operations,
  error handling
- **Taxi Realtime Service** (`taxi-realtime-service/src/index.ts`) - WebSocket
  implementation
- **Admin Service** (`admin-service/src/index.ts`) - Authentication and
  authorization

## 🔗 Dependencies

- `@googlemaps/google-maps-services-js` - Already installed
- `@supabase/supabase-js` - Already installed
- `socket.io` - Already installed
- `express-validator` - Already installed

## 📞 Support

If you need clarification on any requirements or run into issues:

1. Check the reference implementations first
2. Review the database schema carefully
3. Test each endpoint as you implement it
4. Use the existing error handling patterns

**Good luck! This is a substantial but well-defined implementation task.** 🚀
