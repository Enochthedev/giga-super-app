# Simple Polling Flow - No WebSockets!

## For Mobile Team: Aaron & Wave

You don't need WebSockets. Just use normal GET requests with your HTTP library's
polling feature.

---

## Passenger App Flow

```
1. User requests ride
   POST /api/v1/taxi/rides
   ↓

2. Start polling (every 2-3 seconds)
   GET /api/v1/taxi/rides/active
   ↓

3. Response shows ride status:

   Status: "requested"
   → Keep polling, waiting for driver

   Status: "accepted"
   → Show driver info, vehicle, ETA
   → Keep polling for driver location updates

   Status: "arrived"
   → Show "Driver has arrived" notification
   → Keep polling

   Status: "in_progress"
   → Show "Ride started"
   → Keep polling (can slow down to every 5 seconds)

   Status: "completed"
   → STOP POLLING
   → Show rating screen

4. User rates driver
   POST /api/v1/taxi/rides/{rideId}/rate
```

---

## Driver App Flow

```
1. Driver goes online
   Start polling (every 5 seconds)
   GET /api/v1/taxi/rides/requests
   ↓

2. See list of available rides
   Show on map with pickup/dropoff locations
   ↓

3. Driver accepts a ride
   POST /api/v1/taxi/rides/{rideId}/accept
   ↓

4. Start polling active ride (every 3 seconds)
   GET /api/v1/taxi/rides/active
   → Shows passenger info, pickup location
   ↓

5. Driver arrives at pickup
   PUT /api/v1/taxi/rides/{rideId}/status
   { "status": "arrived" }
   ↓

6. Passenger gets in, driver starts ride
   POST /api/v1/taxi/rides/{rideId}/start
   ↓

7. Keep polling (every 5 seconds)
   GET /api/v1/taxi/rides/active
   ↓

8. Driver completes ride
   POST /api/v1/taxi/rides/{rideId}/complete
   ↓

9. STOP POLLING
   Wait for passenger rating
```

---

## What You Get from `/rides/active`

Every time you poll, you get:

```json
{
  "ride": {
    "status": "accepted",           // Current status
    "driver_eta_minutes": 5,        // How long until driver arrives
    "pickup_location": {...},       // Pickup coordinates
    "dropoff_location": {...},      // Dropoff coordinates
    "total_fare": 2500             // Fare in Naira
  },
  "driver": {
    "user": {
      "first_name": "John",
      "last_name": "Doe",
      "avatar_url": "https://...",
      "phone": "+234..."
    },
    "vehicle_info": {
      "make": "Toyota",
      "model": "Camry",
      "color": "Silver",
      "plate_number": "ABC-123-XY"
    },
    "current_location": {
      "latitude": 6.5200,          // Driver's current position
      "longitude": 3.3800,
      "timestamp": "2024-03-04..."
    },
    "heading": 45,                  // Direction driver is facing (for car icon rotation)
    "rating": 4.8
  }
}
```

---

## Simple Code Example

```javascript
// Start polling when ride is requested
function startRidePolling() {
  const pollInterval = setInterval(async () => {
    const response = await fetch(
      'https://api.giga.com/api/v1/taxi/rides/active',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await response.json();

    if (data.success && data.data.ride) {
      // Update your UI
      updateMap(data.data.driver?.current_location);
      updateStatus(data.data.ride.status);
      updateETA(data.data.ride.driver_eta_minutes);

      // Stop polling when done
      if (data.data.ride.status === 'completed') {
        clearInterval(pollInterval);
      }
    }
  }, 3000); // Poll every 3 seconds
}
```

---

## Polling Intervals

| When                           | How Often       |
| ------------------------------ | --------------- |
| Waiting for driver to accept   | Every 2 seconds |
| Driver accepted, coming to you | Every 3 seconds |
| During ride                    | Every 5 seconds |
| Ride completed                 | STOP            |

---

## That's It!

No WebSocket connection to manage. No reconnection logic. Just simple HTTP
polling that your library already supports.

Questions? Check:

- `MOBILE_API_QUICK_REFERENCE.md` - All endpoints
- `MOBILE_POLLING_GUIDE.md` - Detailed examples
