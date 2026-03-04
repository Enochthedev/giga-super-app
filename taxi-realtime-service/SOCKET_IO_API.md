# Taxi Real-Time Service - Socket.IO API Documentation

## Connection

### Endpoint

```
wss://your-server.com
```

### Authentication

Socket.IO connections require JWT authentication via the `auth` parameter:

```javascript
const socket = io('wss://your-server.com', {
  auth: {
    token: 'your-jwt-token',
  },
});
```

The token is validated using Supabase auth. User role (driver/rider) is
determined from:

1. JWT metadata (`user_metadata.role`)
2. Database lookup (presence in `driver_profiles` table)

### Connection Events

#### `connect`

Emitted when successfully connected to the server.

```javascript
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

#### `disconnect`

Emitted when disconnected from the server.

```javascript
socket.on('disconnect', reason => {
  console.log('Disconnected:', reason);
});
```

#### `error`

Emitted when an error occurs.

```javascript
socket.on('error', error => {
  console.error('Socket error:', error);
});
```

---

## Events for Drivers

### Listening Events (Server → Driver)

#### `ride:new-request`

Broadcasted when a passenger creates a new ride request.

**Payload:**

```typescript
{
  rideId: string;              // UUID of the ride
  rideNumber: string;          // Human-readable ride number (e.g., "RIDE-ABC123")
  pickupLocation: {
    latitude: number;
    longitude: number;
  };
  pickupAddress?: string;      // Optional address
  dropoffLocation: {
    latitude: number;
    longitude: number;
  };
  dropoffAddress?: string;     // Optional address
  estimatedFare: number;       // Base fare in NGN
  distance: number;            // Distance in kilometers
  estimatedDuration: number;   // Duration in minutes
  passengerName: string;       // Passenger's first name
  passengerRating: number | null; // Passenger rating (1-5)
  timestamp: string;           // ISO 8601 timestamp
}
```

**Example:**

```javascript
socket.on('ride:new-request', data => {
  console.log('New ride request:', data);
  // {
  //   rideId: "123e4567-e89b-12d3-a456-426614174000",
  //   rideNumber: "RIDE-ABC123",
  //   pickupLocation: { latitude: 6.5244, longitude: 3.3792 },
  //   pickupAddress: "123 Main St, Lagos",
  //   dropoffLocation: { latitude: 6.4281, longitude: 3.4219 },
  //   dropoffAddress: "456 Market St, Lagos",
  //   estimatedFare: 1500,
  //   distance: 8.5,
  //   estimatedDuration: 20,
  //   passengerName: "John",
  //   passengerRating: 4.8,
  //   timestamp: "2024-03-04T10:30:00.000Z"
  // }

  showRideNotification(data);
});
```

#### `ride:unavailable`

Broadcasted when a ride is no longer available (another driver accepted it).

**Payload:**

```typescript
{
  rideId: string; // UUID of the ride
  timestamp: string; // ISO 8601 timestamp
}
```

**Example:**

```javascript
socket.on('ride:unavailable', data => {
  console.log('Ride no longer available:', data.rideId);
  removeRideFromList(data.rideId);
});
```

#### `ride:cancelled`

Sent when the passenger cancels the ride.

**Payload:**

```typescript
{
  rideId: string;
  cancelledBy: 'passenger' | 'driver';
  reason?: string;
  fee: number;        // Cancellation fee in NGN
  timestamp: string;
}
```

**Example:**

```javascript
socket.on('ride:cancelled', data => {
  console.log('Ride cancelled by passenger:', data);
  showCancellationAlert(data.reason, data.fee);
});
```

#### `ride:status-update`

Sent when ride status changes.

**Payload:**

```typescript
{
  rideId: string;
  status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  timestamp: string;
}
```

---

## Events for Passengers

### Listening Events (Server → Passenger)

#### `ride:accepted`

Sent when a driver accepts the passenger's ride request.

**Payload:**

```typescript
{
  rideId: string;
  rideNumber: string;
  status: 'accepted';
  driver: {
    id: string;              // Driver user ID
    name: string;            // Full name
    photo?: string;          // Avatar URL
    rating: number;          // Driver rating (1-5)
    vehicle: {
      type: string;          // e.g., "standard", "premium", "suv"
      make?: string;         // e.g., "Toyota"
      model?: string;        // e.g., "Camry"
      year?: number;
      color?: string;
      plate_number?: string;
    };
    phone?: string;          // Contact number
  };
  eta: number;               // Estimated time of arrival in minutes
  timestamp: string;
}
```

**Example:**

```javascript
socket.on('ride:accepted', data => {
  console.log('Driver accepted:', data);
  // {
  //   rideId: "123e4567-e89b-12d3-a456-426614174000",
  //   rideNumber: "RIDE-ABC123",
  //   status: "accepted",
  //   driver: {
  //     id: "driver-uuid",
  //     name: "Michael Johnson",
  //     photo: "https://example.com/photo.jpg",
  //     rating: 4.9,
  //     vehicle: {
  //       type: "standard",
  //       make: "Toyota",
  //       model: "Camry",
  //       year: 2020,
  //       color: "Black",
  //       plate_number: "ABC-123-XY"
  //     },
  //     phone: "+234-xxx-xxx-xxxx"
  //   },
  //   eta: 5,
  //   timestamp: "2024-03-04T10:31:00.000Z"
  // }

  showDriverDetails(data.driver, data.eta);
});
```

#### `ride:cancelled`

Sent when the driver cancels the ride.

**Payload:**

```typescript
{
  rideId: string;
  cancelledBy: 'passenger' | 'driver';
  reason?: string;
  fee: number;
  timestamp: string;
}
```

**Example:**

```javascript
socket.on('ride:cancelled', data => {
  console.log('Ride cancelled by driver:', data);
  showCancellationAlert(data.reason);
});
```

#### `ride:status-update`

Sent when ride status changes.

**Payload:**

```typescript
{
  rideId: string;
  status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  timestamp: string;
}
```

**Example:**

```javascript
socket.on('ride:status-update', data => {
  console.log('Ride status:', data.status);
  updateRideStatus(data.status);
});
```

#### `driver:location`

Sent when tracking a driver's location (after joining tracking room).

**Payload:**

```typescript
{
  driverId: string;
  lat: number;
  lng: number;
  timestamp: number;
}
```

**Example:**

```javascript
// First, start tracking
socket.emit('rider:track:driver', { driverId: 'driver-uuid' });

// Then listen for updates
socket.on('driver:location', data => {
  console.log('Driver location:', data);
  updateDriverMarker(data.lat, data.lng);
});
```

---

## Emitting Events (Client → Server)

### Driver Events

#### `driver:location:update`

Send driver's current location (should be sent every 5-10 seconds while online).

**Payload:**

```typescript
{
  lat: number;
  lng: number;
}
```

**Example:**

```javascript
socket.emit('driver:location:update', {
  lat: 6.5244,
  lng: 3.3792,
});
```

**Rate Limit:** 100 requests per minute per socket

---

### Passenger Events

#### `rider:request:nearby-drivers`

Request list of nearby available drivers.

**Payload:**

```typescript
{
  lat: number;
  lng: number;
  radius: number; // Search radius in kilometers
}
```

**Response:** Emits `rider:nearby-drivers` event

**Example:**

```javascript
socket.emit('rider:request:nearby-drivers', {
  lat: 6.5244,
  lng: 3.3792,
  radius: 5,
});

socket.on('rider:nearby-drivers', data => {
  console.log('Nearby drivers:', data.drivers);
  // data.drivers is an array of driver objects with distance
});
```

#### `rider:track:driver`

Start tracking a specific driver's location.

**Payload:**

```typescript
{
  driverId: string;
}
```

**Example:**

```javascript
socket.emit('rider:track:driver', {
  driverId: 'driver-uuid',
});

// Now you'll receive 'driver:location' events for this driver
```

#### `rider:untrack:driver`

Stop tracking a driver's location.

**Payload:**

```typescript
{
  driverId: string;
}
```

**Example:**

```javascript
socket.emit('rider:untrack:driver', {
  driverId: 'driver-uuid',
});
```

---

## Error Handling

### Authentication Errors

If authentication fails, the connection will be rejected:

```javascript
socket.on('connect_error', error => {
  console.error('Connection failed:', error.message);
  // "Authentication required" or "Invalid token"
});
```

### Rate Limiting

If you exceed the rate limit (100 requests per minute), you'll receive an error
event:

```javascript
socket.on('error', error => {
  if (error.message === 'Rate limit exceeded') {
    console.warn('Slow down! Rate limit exceeded');
  }
});
```

---

## Best Practices

### Connection Management

```javascript
// Reconnection with exponential backoff
const socket = io('wss://your-server.com', {
  auth: { token: getAuthToken() },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

// Update token on reconnection
socket.on('reconnect_attempt', () => {
  socket.auth.token = getAuthToken();
});
```

### Driver Location Updates

```javascript
// Send location updates every 5 seconds while online
let locationInterval;

function startLocationUpdates() {
  locationInterval = setInterval(() => {
    navigator.geolocation.getCurrentPosition(position => {
      socket.emit('driver:location:update', {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
  }, 5000);
}

function stopLocationUpdates() {
  clearInterval(locationInterval);
}
```

### Handling Disconnections

```javascript
socket.on('disconnect', reason => {
  if (reason === 'io server disconnect') {
    // Server disconnected the socket, reconnect manually
    socket.connect();
  }
  // else the socket will automatically try to reconnect

  // Update UI to show offline status
  showOfflineIndicator();
});

socket.on('connect', () => {
  // Update UI to show online status
  showOnlineIndicator();
});
```

---

## Testing with Socket.IO Client

### Install

```bash
npm install socket.io-client
```

### Test Connection

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3006', {
  auth: {
    token: 'your-jwt-token',
  },
});

socket.on('connect', () => {
  console.log('Connected!');
});

socket.on('ride:new-request', data => {
  console.log('New ride:', data);
});
```

---

## Production Considerations

### Redis Adapter

For multi-instance deployments, the service uses Redis adapter to sync Socket.IO
events across instances.

**Environment Variables:**

- `REDIS_URL` - Redis connection URL
- `FORCE_REDIS=true` - Force enable Redis even on free tiers
- `DISABLE_REDIS=true` - Disable Redis (single instance mode)

### Scaling

- Each Socket.IO instance can handle ~10,000 concurrent connections
- Redis adapter enables horizontal scaling
- Use sticky sessions or Redis adapter for load balancing

### Monitoring

Monitor these metrics:

- Active connections (drivers/passengers)
- Events per second
- Average latency
- Failed authentications
- Rate limit violations
