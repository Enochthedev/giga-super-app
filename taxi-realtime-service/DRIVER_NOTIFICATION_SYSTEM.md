# Driver Notification System

## Current Implementation

### How Drivers Get Ride Requests

**Method 1: Polling (Currently Implemented)**

- Drivers poll `GET /api/rides/requests` endpoint
- Returns list of rides with `status='requested'` and `driver_id IS NULL`
- Drivers must poll every few seconds to see new rides
- **Downside:** High latency, increased server load

**Method 2: Socket.IO Real-time (Partially Implemented)**

- Socket.IO server is set up with `drivers` room
- Drivers connect via WebSocket and join the `drivers` room
- **Missing:** Broadcast to drivers room when new ride is created
- **Advantage:** Instant notification, low latency

## Recommended Flow (Uber-style)

### 1. Passenger Requests Ride

```
POST /api/rides
{
  "pickup_lat": 6.5244,
  "pickup_lng": 3.3792,
  "dropoff_lat": 6.4281,
  "dropoff_lng": 3.4219
}
```

**What Should Happen:**

1. Create ride in database with `driver_id=NULL`, `status='requested'`
2. Find nearby online drivers (within 5km radius)
3. Broadcast ride request to those drivers via Socket.IO:
   ```javascript
   io.to('drivers').emit('ride:new-request', {
     rideId: ride.id,
     pickupLocation: { lat, lng },
     dropoffLocation: { lat, lng },
     estimatedFare: ride.base_fare,
     distance: ride.distance_km,
   });
   ```
4. Also send push notification to nearby drivers (optional)

### 2. Driver Sees Request

**Via Socket.IO (Real-time):**

- Driver app listens for `ride:new-request` event
- Shows notification with ride details
- Driver can accept or ignore

**Via Polling (Fallback):**

- Driver app polls `GET /api/rides/requests` every 5-10 seconds
- Shows list of available rides

### 3. Driver Accepts Ride

```
POST /api/rides/:rideId/accept
{
  "driver_eta_minutes": 5
}
```

**What Happens:**

1. Update ride: `driver_id=<driver_id>`, `status='accepted'`
2. Notify passenger via Socket.IO:
   ```javascript
   io.to(passengerSocketId).emit('ride:accepted', {
     rideId,
     driver: { name, photo, vehicle, rating },
     eta: 5,
   });
   ```
3. Notify other drivers that ride is no longer available

## Implementation TODO

### Phase 1: Add Socket.IO Broadcast (High Priority)

**File:** `taxi-realtime-service/src/routes/rides.ts`

After creating ride, add:

```typescript
// Broadcast to all online drivers
// Note: Need to pass io instance to router or use a shared event emitter
io.to('drivers').emit('ride:new-request', {
  rideId: ride.id,
  pickupLocation: ride.pickup_location,
  dropoffLocation: ride.dropoff_location,
  estimatedFare: ride.base_fare,
  distance: ride.distance_km,
  passengerName: passengerProfile?.first_name,
});
```

### Phase 2: Geo-targeted Notifications (Medium Priority)

Instead of broadcasting to ALL drivers, only notify nearby drivers:

```typescript
// Find nearby online drivers
const nearbyDrivers = await findNearbyDrivers(pickup_lat, pickup_lng, 5); // 5km radius

// Emit to specific drivers
nearbyDrivers.forEach(driver => {
  const driverSocketId = activeDrivers.get(driver.user_id);
  if (driverSocketId) {
    io.to(driverSocketId).emit('ride:new-request', rideData);
  }
});
```

### Phase 3: Push Notifications (Low Priority)

Send push notifications to driver mobile apps using FCM/APNS

## Current Endpoints

### For Passengers

- `POST /api/rides` - Create ride request
- `GET /api/rides/active` - Get current active ride
- `GET /api/rides/history` - Get ride history
- `POST /api/rides/:rideId/cancel` - Cancel ride
- `POST /api/rides/:rideId/rate` - Rate driver

### For Drivers

- `GET /api/rides/requests` - Poll for available rides (current method)
- `POST /api/rides/:rideId/accept` - Accept a ride
- `POST /api/rides/:rideId/reject` - Reject a ride
- `POST /api/rides/:rideId/start` - Start the ride
- `POST /api/rides/:rideId/complete` - Complete the ride
- `PUT /api/drivers/availability` - Toggle online/offline
- `PUT /api/drivers/location` - Update location
- `GET /api/drivers/earnings` - View earnings

### Socket.IO Events (Implemented)

**Driver Events:**

- `driver:location:update` - Driver sends location updates
- `trip:accept` - Driver accepts trip
- `trip:status:update` - Update trip status

**Rider Events:**

- `rider:request:nearby-drivers` - Get nearby drivers
- `rider:track:driver` - Start tracking driver location
- `rider:untrack:driver` - Stop tracking driver

### Socket.IO Events (Missing - Need to Implement)

- `ride:new-request` - Broadcast new ride to drivers
- `ride:accepted` - Notify passenger that driver accepted
- `ride:cancelled` - Notify other party of cancellation

## Architecture Note

The Socket.IO instance (`io`) is created in `index.ts` but routes are in
separate files. To broadcast from routes, we need to either:

1. **Pass io instance to routes** (Recommended)

   ```typescript
   // index.ts
   app.use(
     '/api/rides',
     (req, res, next) => {
       req.io = io;
       next();
     },
     ridesRouter
   );
   ```

2. **Use event emitter pattern**

   ```typescript
   // Create shared event emitter
   const rideEvents = new EventEmitter();

   // In routes: emit event
   rideEvents.emit('ride:created', ride);

   // In index.ts: listen and broadcast
   rideEvents.on('ride:created', ride => {
     io.to('drivers').emit('ride:new-request', ride);
   });
   ```

3. **Create a notification service module**
   ```typescript
   // services/notifications.ts
   export class NotificationService {
     constructor(private io: Server) {}

     notifyDriversOfNewRide(ride) {
       this.io.to('drivers').emit('ride:new-request', ride);
     }
   }
   ```
