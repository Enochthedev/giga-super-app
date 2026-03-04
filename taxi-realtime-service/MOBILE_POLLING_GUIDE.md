# Mobile Polling Implementation Guide

## Overview

This guide explains how to implement real-time ride tracking using REST API
polling, similar to how Uber's mobile apps work. Polling is more reliable than
WebSockets for mobile apps because it handles network changes, app
backgrounding, and battery optimization better.

## Why Polling Over WebSockets?

1. **Network Resilience**: Mobile networks frequently switch (WiFi ↔ 4G/5G),
   polling handles this automatically
2. **Battery Efficient**: Modern polling with smart intervals uses less battery
   than maintaining persistent connections
3. **Simpler Implementation**: No need to manage WebSocket lifecycle,
   reconnection logic, or state synchronization
4. **App Backgrounding**: Works seamlessly when app goes to
   background/foreground
5. **Platform Native**: Works with iOS Background App Refresh and Android
   WorkManager

## Core Polling Endpoint

### GET `/api/v1/taxi/rides/active`

This is your main polling endpoint. Call it every 3-5 seconds when a ride is
active.

**Response:**

```json
{
  "success": true,
  "data": {
    "ride": {
      "id": "uuid",
      "ride_number": "RIDE-ABC123",
      "status": "accepted",
      "passenger_id": "uuid",
      "driver_id": "uuid",
      "pickup_location": { "latitude": 6.5244, "longitude": 3.3792 },
      "pickup_address": "123 Main St, Lagos",
      "dropoff_location": { "latitude": 6.4281, "longitude": 3.4219 },
      "dropoff_address": "456 Market Rd, Lagos",
      "distance_km": 12.5,
      "estimated_duration_minutes": 25,
      "total_fare": 2500,
      "driver_eta_minutes": 5,
      "created_at": "2024-03-04T10:00:00Z",
      "accepted_at": "2024-03-04T10:01:00Z"
    },
    "driver": {
      "user_id": "uuid",
      "vehicle_info": {
        "make": "Toyota",
        "model": "Camry",
        "year": 2020,
        "color": "Silver",
        "plate_number": "ABC-123-XY"
      },
      "rating": 4.8,
      "total_rides": 1250,
      "vehicle_type": "standard",
      "current_location": {
        "latitude": 6.52,
        "longitude": 3.38,
        "timestamp": "2024-03-04T10:05:30Z"
      },
      "heading": 45,
      "user": {
        "first_name": "John",
        "last_name": "Doe",
        "avatar_url": "https://...",
        "phone": "+234..."
      }
    }
  }
}
```

**When no active ride:**

```json
{
  "success": true,
  "data": {},
  "message": "No active ride found"
}
```

## Polling Strategy (Like Uber)

### 1. Adaptive Polling Intervals

Adjust polling frequency based on ride status:

```javascript
// React Native / JavaScript example
const POLLING_INTERVALS = {
  requested: 2000, // 2 seconds - waiting for driver
  accepted: 3000, // 3 seconds - driver coming
  arrived: 2000, // 2 seconds - driver at pickup
  in_progress: 5000, // 5 seconds - during ride
  completed: 0, // Stop polling
  cancelled: 0, // Stop polling
};

function getPollingInterval(rideStatus) {
  return POLLING_INTERVALS[rideStatus] || 5000;
}
```

### 2. Smart Polling Implementation

```javascript
class RidePollingService {
  constructor() {
    this.pollingTimer = null;
    this.currentRide = null;
    this.isPolling = false;
  }

  startPolling() {
    if (this.isPolling) return;
    this.isPolling = true;
    this.poll();
  }

  stopPolling() {
    this.isPolling = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  async poll() {
    if (!this.isPolling) return;

    try {
      const response = await fetch(
        'https://api.giga.com/api/v1/taxi/rides/active',
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.success && result.data.ride) {
        this.handleRideUpdate(result.data);

        // Schedule next poll based on ride status
        const interval = getPollingInterval(result.data.ride.status);

        if (interval > 0) {
          this.pollingTimer = setTimeout(() => this.poll(), interval);
        } else {
          this.stopPolling(); // Ride completed or cancelled
        }
      } else {
        // No active ride, stop polling
        this.stopPolling();
        this.handleNoActiveRide();
      }
    } catch (error) {
      console.error('Polling error:', error);
      // Retry with exponential backoff on error
      this.pollingTimer = setTimeout(() => this.poll(), 5000);
    }
  }

  handleRideUpdate(data) {
    const { ride, driver } = data;

    // Update UI with new ride data
    this.updateRideStatus(ride.status);

    // Update driver location on map
    if (driver?.current_location) {
      this.updateDriverMarker(driver.current_location, driver.heading);
    }

    // Update ETA
    if (ride.driver_eta_minutes) {
      this.updateETA(ride.driver_eta_minutes);
    }

    // Trigger notifications for status changes
    if (this.currentRide?.status !== ride.status) {
      this.handleStatusChange(this.currentRide?.status, ride.status);
    }

    this.currentRide = ride;
  }

  handleStatusChange(oldStatus, newStatus) {
    const messages = {
      accepted: 'Driver accepted your ride!',
      arrived: 'Driver has arrived at pickup location',
      in_progress: 'Your ride has started',
      completed: 'Ride completed. Please rate your driver.',
    };

    if (messages[newStatus]) {
      this.showNotification(messages[newStatus]);
      this.playSound(newStatus);
    }
  }
}
```

### 3. React Native Implementation

```javascript
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

function useRidePolling() {
  const [rideData, setRideData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const pollingService = useRef(new RidePollingService());
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Start polling when component mounts
    pollingService.current.startPolling();

    // Handle app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground, resume polling
        pollingService.current.startPolling();
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background, pause polling (iOS will handle background refresh)
        pollingService.current.stopPolling();
      }
      appState.current = nextAppState;
    });

    return () => {
      pollingService.current.stopPolling();
      subscription.remove();
    };
  }, []);

  return { rideData, isLoading };
}
```

### 4. iOS Background Refresh

```swift
// AppDelegate.swift
func application(_ application: UIApplication,
                 performFetchWithCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {

    // Poll for ride updates in background
    RideAPI.shared.getActiveRide { result in
        switch result {
        case .success(let ride):
            if let ride = ride {
                // Update local notification with ride status
                self.updateRideNotification(ride)
                completionHandler(.newData)
            } else {
                completionHandler(.noData)
            }
        case .failure:
            completionHandler(.failed)
        }
    }
}
```

### 5. Android WorkManager

```kotlin
// RidePollingWorker.kt
class RidePollingWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val ride = RideRepository.getActiveRide()

            if (ride != null) {
                // Update notification
                NotificationHelper.updateRideNotification(applicationContext, ride)
                Result.success()
            } else {
                // No active ride, cancel periodic work
                Result.success()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }
}

// Schedule periodic polling
val pollingRequest = PeriodicWorkRequestBuilder<RidePollingWorker>(
    15, TimeUnit.MINUTES // Minimum interval for background work
).build()

WorkManager.getInstance(context).enqueueUniquePeriodicWork(
    "ride_polling",
    ExistingPeriodicWorkPolicy.KEEP,
    pollingRequest
)
```

## Ride Status Flow

```
PASSENGER FLOW:
1. requested    → Poll every 2s (waiting for driver to accept)
2. accepted     → Poll every 3s (driver coming to pickup)
3. arrived      → Poll every 2s (driver at pickup location)
4. in_progress  → Poll every 5s (ride in progress)
5. completed    → Stop polling, show rating screen

DRIVER FLOW:
1. View requests → Poll /api/v1/taxi/rides/requests every 5s
2. Accept ride   → Poll /api/v1/taxi/rides/active every 3s
3. Start ride    → Poll every 5s
4. Complete ride → Stop polling
```

## Optimizations

### 1. Conditional Requests (Save Bandwidth)

Use `If-Modified-Since` header to avoid downloading unchanged data:

```javascript
let lastModified = null;

async function pollWithConditional() {
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (lastModified) {
    headers['If-Modified-Since'] = lastModified;
  }

  const response = await fetch(url, { headers });

  if (response.status === 304) {
    // Not modified, use cached data
    return cachedData;
  }

  lastModified = response.headers.get('Last-Modified');
  return await response.json();
}
```

### 2. Delta Updates

Only send changed fields in response (backend optimization):

```javascript
// Backend can track what changed since last poll
{
  "success": true,
  "data": {
    "ride": {
      "status": "in_progress",  // Only changed fields
      "driver_location": { ... }
    },
    "changes": ["status", "driver_location"]
  }
}
```

### 3. Battery Optimization

```javascript
// Reduce polling when battery is low
function getOptimizedInterval(status, batteryLevel) {
  let baseInterval = POLLING_INTERVALS[status];

  if (batteryLevel < 20) {
    baseInterval *= 2; // Double interval when battery low
  }

  return baseInterval;
}
```

## Error Handling

```javascript
class PollingErrorHandler {
  constructor() {
    this.retryCount = 0;
    this.maxRetries = 5;
  }

  async handleError(error) {
    this.retryCount++;

    if (this.retryCount >= this.maxRetries) {
      // Show error to user
      this.showErrorMessage(
        'Unable to connect. Please check your internet connection.'
      );
      this.retryCount = 0;
      return false;
    }

    // Exponential backoff: 2s, 4s, 8s, 16s, 32s
    const delay = Math.min(2000 * Math.pow(2, this.retryCount - 1), 32000);
    await this.sleep(delay);

    return true; // Retry
  }

  resetRetryCount() {
    this.retryCount = 0;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Testing Polling

```javascript
// Mock server for testing different scenarios
const mockScenarios = {
  driverAccepted: {
    ride: { status: 'accepted', driver_eta_minutes: 5 },
    driver: { current_location: { latitude: 6.52, longitude: 3.38 } },
  },
  driverArrived: {
    ride: { status: 'arrived' },
    driver: { current_location: { latitude: 6.5244, longitude: 3.3792 } },
  },
  rideStarted: {
    ride: { status: 'in_progress' },
  },
};

// Simulate polling responses
function simulatePolling(scenario) {
  return mockScenarios[scenario];
}
```

## Complete Example: Passenger App

```javascript
// PassengerRideScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function PassengerRideScreen() {
  const [ride, setRide] = useState(null);
  const [driver, setDriver] = useState(null);
  const pollingService = useRef(null);

  useEffect(() => {
    // Initialize polling service
    pollingService.current = new RidePollingService();

    // Set up callback for ride updates
    pollingService.current.onUpdate = data => {
      setRide(data.ride);
      setDriver(data.driver);
    };

    // Start polling
    pollingService.current.startPolling();

    return () => {
      pollingService.current.stopPolling();
    };
  }, []);

  if (!ride) {
    return <Text>No active ride</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        region={{
          latitude: ride.pickup_location.latitude,
          longitude: ride.pickup_location.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Pickup marker */}
        <Marker
          coordinate={ride.pickup_location}
          title="Pickup"
          pinColor="green"
        />

        {/* Dropoff marker */}
        <Marker
          coordinate={ride.dropoff_location}
          title="Dropoff"
          pinColor="red"
        />

        {/* Driver marker (if available) */}
        {driver?.current_location && (
          <Marker
            coordinate={driver.current_location}
            title={`${driver.user.first_name} - ${driver.vehicle_info.make}`}
            rotation={driver.heading}
          >
            <Image source={require('./car-icon.png')} />
          </Marker>
        )}
      </MapView>

      <View style={{ padding: 20, backgroundColor: 'white' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
          Status: {ride.status.toUpperCase()}
        </Text>

        {ride.driver_eta_minutes && (
          <Text style={{ fontSize: 16, marginTop: 10 }}>
            Driver arriving in {ride.driver_eta_minutes} minutes
          </Text>
        )}

        {driver && (
          <View style={{ marginTop: 15 }}>
            <Text style={{ fontSize: 16 }}>
              {driver.user.first_name} - {driver.vehicle_info.make}{' '}
              {driver.vehicle_info.model}
            </Text>
            <Text style={{ color: 'gray' }}>
              {driver.vehicle_info.color} • {driver.vehicle_info.plate_number}
            </Text>
            <Text style={{ marginTop: 5 }}>
              ⭐ {driver.rating} ({driver.total_rides} rides)
            </Text>
          </View>
        )}

        <Button
          title="Cancel Ride"
          onPress={() => cancelRide(ride.id)}
          color="red"
        />
      </View>
    </View>
  );
}
```

## Summary

✅ **Use polling instead of WebSockets** for mobile apps ✅ **Adaptive
intervals** based on ride status (2-5 seconds) ✅ **Handle app backgrounding**
with native background refresh ✅ **Implement error handling** with exponential
backoff ✅ **Optimize battery** by adjusting intervals when battery is low ✅
**Show real-time updates** on map with driver location and ETA

This approach is battle-tested by Uber, Lyft, and other ride-sharing apps. It's
more reliable and battery-efficient than WebSockets for mobile use cases.
