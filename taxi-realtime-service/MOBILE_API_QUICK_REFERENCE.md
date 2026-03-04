# Mobile API Quick Reference - Polling Endpoints

## No WebSockets Needed! ✅

Just use regular GET requests with your existing HTTP library. Poll these
endpoints at the intervals shown below.

---

## Passenger Flow

### 1. Request a Ride

```http
POST /api/v1/taxi/rides
Authorization: Bearer {token}

{
  "pickup_lat": 6.5244,
  "pickup_lng": 3.3792,
  "pickup_address": "123 Main St, Lagos",
  "dropoff_lat": 6.4281,
  "dropoff_lng": 3.4219,
  "dropoff_address": "456 Market Rd, Lagos"
}
```

### 2. Poll for Updates (After Requesting Ride)

```http
GET /api/v1/taxi/rides/active
Authorization: Bearer {token}
```

**Poll every 2-3 seconds** until ride is completed/cancelled

**Response includes:**

- Ride status (requested → accepted → arrived → in_progress → completed)
- Driver info (name, photo, vehicle, rating)
- Driver's current location (lat/lng)
- Driver ETA in minutes
- Fare details

### 3. Cancel Ride (if needed)

```http
POST /api/v1/taxi/rides/{rideId}/cancel
Authorization: Bearer {token}

{
  "reason": "Changed my mind"
}
```

### 4. Rate Driver (after completion)

```http
POST /api/v1/taxi/rides/{rideId}/rate
Authorization: Bearer {token}

{
  "rating": 5,
  "review_comment": "Great driver!"
}
```

---

## Driver Flow

### 1. Poll for Available Rides

```http
GET /api/v1/taxi/rides/requests?limit=20
Authorization: Bearer {token}
```

**Poll every 5 seconds** when driver is online and available

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ride_number": "RIDE-ABC123",
      "status": "requested",
      "pickup_location": { "latitude": 6.5244, "longitude": 3.3792 },
      "pickup_address": "123 Main St, Lagos",
      "dropoff_location": { "latitude": 6.4281, "longitude": 3.4219 },
      "distance_km": 12.5,
      "estimated_duration_minutes": 25,
      "total_fare": 2500,
      "passenger": {
        "first_name": "John",
        "last_name": "Doe",
        "avatar_url": "https://...",
        "rating": 4.8
      }
    }
  ]
}
```

### 2. Accept a Ride

```http
POST /api/v1/taxi/rides/{rideId}/accept
Authorization: Bearer {token}

{
  "driver_eta_minutes": 5
}
```

### 3. Poll Active Ride (After Accepting)

```http
GET /api/v1/taxi/rides/active
Authorization: Bearer {token}
```

**Poll every 3 seconds** while driving to pickup, then **every 5 seconds**
during ride

### 4. Update Ride Status

```http
PUT /api/v1/taxi/rides/{rideId}/status
Authorization: Bearer {token}

{
  "status": "arrived"  // or "in_progress", "completed"
}
```

### 5. Start Ride (When Passenger Gets In)

```http
POST /api/v1/taxi/rides/{rideId}/start
Authorization: Bearer {token}
```

### 6. Complete Ride

```http
POST /api/v1/taxi/rides/{rideId}/complete
Authorization: Bearer {token}

{
  "dropoff_lat": 6.4281,
  "dropoff_lng": 3.4219,
  "actual_distance_km": 12.8
}
```

---

## Polling Intervals Summary

| Scenario                         | Endpoint          | Interval        |
| -------------------------------- | ----------------- | --------------- |
| Passenger waiting for driver     | `/rides/active`   | **2-3 seconds** |
| Driver looking for rides         | `/rides/requests` | **5 seconds**   |
| Driver accepted, going to pickup | `/rides/active`   | **3 seconds**   |
| Ride in progress                 | `/rides/active`   | **5 seconds**   |
| Ride completed/cancelled         | **STOP POLLING**  | -               |

---

## Example: React Native with Axios

```javascript
import axios from 'axios';

const API_BASE = 'https://api.giga.com/api/v1/taxi';

// Set up axios instance with auth
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  },
});

// Passenger: Poll for active ride
let pollingInterval;

function startPolling() {
  pollingInterval = setInterval(async () => {
    try {
      const response = await api.get('/rides/active');

      if (response.data.success && response.data.data.ride) {
        const { ride, driver } = response.data.data;

        // Update UI
        updateRideStatus(ride.status);
        updateDriverLocation(driver?.current_location);
        updateETA(ride.driver_eta_minutes);

        // Stop polling if ride is done
        if (ride.status === 'completed' || ride.status === 'cancelled') {
          stopPolling();
        }
      } else {
        // No active ride
        stopPolling();
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 3000); // Poll every 3 seconds
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// Driver: Poll for ride requests
function pollForRideRequests() {
  setInterval(async () => {
    try {
      const response = await api.get('/rides/requests?limit=20');

      if (response.data.success) {
        updateAvailableRides(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  }, 5000); // Poll every 5 seconds
}
```

---

## Example: Flutter with Dio

```dart
import 'package:dio/dio.dart';
import 'dart:async';

class RideService {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: 'https://api.giga.com/api/v1/taxi',
    headers: {'Authorization': 'Bearer $authToken'},
  ));

  Timer? _pollingTimer;

  // Passenger: Start polling for active ride
  void startPolling() {
    _pollingTimer = Timer.periodic(Duration(seconds: 3), (timer) async {
      try {
        final response = await _dio.get('/rides/active');

        if (response.data['success'] && response.data['data']['ride'] != null) {
          final ride = response.data['data']['ride'];
          final driver = response.data['data']['driver'];

          // Update UI
          _updateRideStatus(ride['status']);
          _updateDriverLocation(driver?['current_location']);

          // Stop polling if done
          if (ride['status'] == 'completed' || ride['status'] == 'cancelled') {
            stopPolling();
          }
        } else {
          stopPolling();
        }
      } catch (e) {
        print('Polling error: $e');
      }
    });
  }

  void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  // Driver: Poll for ride requests
  void pollForRideRequests() {
    Timer.periodic(Duration(seconds: 5), (timer) async {
      try {
        final response = await _dio.get('/rides/requests?limit=20');

        if (response.data['success']) {
          _updateAvailableRides(response.data['data']);
        }
      } catch (e) {
        print('Error: $e');
      }
    });
  }
}
```

---

## Important Notes

1. **No WebSocket setup needed** - Just regular HTTP GET requests
2. **Stop polling** when ride is completed/cancelled to save battery
3. **Handle errors gracefully** - If request fails, keep polling (don't crash)
4. **Pause polling** when app goes to background (resume on foreground)
5. **Use your existing HTTP library** - Axios, Dio, Fetch, etc. all work fine

---

## Testing Endpoints

Base URL: `https://api.giga.com/api/v1/taxi`

All endpoints require authentication:

```
Authorization: Bearer {your_jwt_token}
```

Get your token from the login endpoint:

```http
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

---

## Need Help?

- Check `MOBILE_POLLING_GUIDE.md` for detailed implementation examples
- All endpoints return standard JSON responses with `success`, `data`, and
  `error` fields
- Driver location updates automatically in the `/rides/active` response
- ETA is calculated server-side and included in the response

That's it! No complex WebSocket setup needed. Just poll these endpoints and
you're good to go! 🚀
