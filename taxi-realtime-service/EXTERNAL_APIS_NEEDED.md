# External APIs Required for Taxi Service

## Currently Needed

### 1. Google Maps APIs ⚠️ CRITICAL

#### Distance Matrix API

**Purpose:** Calculate accurate distance and duration between pickup and dropoff

**Current Implementation:** Using Haversine formula (straight-line distance)

```typescript
// Current: Simplified calculation
const distance_km = calculateDistance(
  pickup_lat,
  pickup_lng,
  dropoff_lat,
  dropoff_lng
);
const duration_minutes = Math.ceil((distance_km / 25) * 60); // Assumes 25 km/h average
```

**What We Need:**

```typescript
// With Google Maps Distance Matrix API
const response = await googleMaps.distanceMatrix({
  origins: [{ lat: pickup_lat, lng: pickup_lng }],
  destinations: [{ lat: dropoff_lat, lng: dropoff_lng }],
  mode: 'driving',
  departure_time: 'now', // For real-time traffic
  traffic_model: 'best_guess',
});

const distance_km = response.rows[0].elements[0].distance.value / 1000;
const duration_minutes =
  response.rows[0].elements[0].duration_in_traffic.value / 60;
```

**Benefits:**

- Accurate road distance (not straight-line)
- Real-time traffic consideration
- Multiple route options
- Accurate ETA

**Cost:** $5 per 1,000 requests (first $200/month free)

**Setup:**

```bash
# Environment variable needed
GOOGLE_MAPS_API_KEY=your_api_key_here
```

---

#### Directions API

**Purpose:** Get turn-by-turn navigation for drivers

**Use Case:**

- Show route on map
- Provide navigation instructions
- Calculate alternative routes

**Example:**

```typescript
const directions = await googleMaps.directions({
  origin: { lat: pickup_lat, lng: pickup_lng },
  destination: { lat: dropoff_lat, lng: dropoff_lng },
  mode: 'driving',
  alternatives: true,
  departure_time: 'now',
});
```

**Cost:** $5 per 1,000 requests

---

#### Geocoding API

**Purpose:** Convert addresses to coordinates and vice versa

**Use Cases:**

- User enters address → Get coordinates
- Show human-readable address from coordinates
- Autocomplete address suggestions

**Example:**

```typescript
// Address to coordinates
const geocode = await googleMaps.geocode({
  address: '123 Main St, Lagos, Nigeria',
});
const { lat, lng } = geocode.results[0].geometry.location;

// Coordinates to address
const reverseGeocode = await googleMaps.reverseGeocode({
  latlng: { lat: 6.5244, lng: 3.3792 },
});
const address = reverseGeocode.results[0].formatted_address;
```

**Cost:** $5 per 1,000 requests

---

#### Places API (Autocomplete)

**Purpose:** Address autocomplete as user types

**Use Case:**

- User types "123 Main" → Show suggestions
- Improve UX for address entry

**Example:**

```typescript
const autocomplete = await googleMaps.placeAutocomplete({
  input: '123 Main',
  location: { lat: 6.5244, lng: 3.3792 },
  radius: 50000, // 50km
  components: { country: 'ng' }, // Nigeria only
});
```

**Cost:** $2.83 per 1,000 requests (Autocomplete - Per Session)

---

### 2. Push Notification Services

#### Firebase Cloud Messaging (FCM)

**Purpose:** Send push notifications to mobile apps

**Use Cases:**

- Notify drivers of new rides when app is in background
- Notify passengers when driver accepts
- Send ride status updates

**Setup:**

```bash
# Environment variables needed
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

**Cost:** Free

---

#### Apple Push Notification Service (APNS)

**Purpose:** Push notifications for iOS apps

**Setup:**

```bash
# Environment variables needed
APNS_KEY_ID=your_key_id
APNS_TEAM_ID=your_team_id
APNS_PRIVATE_KEY=your_private_key
```

**Cost:** Free

---

## Recommended (Future Enhancements)

### 3. SMS Service (Twilio or Africa's Talking)

**Purpose:** Send SMS notifications as fallback

**Use Cases:**

- OTP for phone verification
- Ride confirmation SMS
- Emergency notifications

**Twilio Setup:**

```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

**Cost:** ~$0.0075 per SMS (Nigeria)

**Africa's Talking (Better for Africa):**

```bash
AFRICAS_TALKING_API_KEY=your_api_key
AFRICAS_TALKING_USERNAME=your_username
```

**Cost:** ~$0.01 per SMS (Nigeria)

---

### 4. Payment Gateway

**Purpose:** Process ride payments

**Options:**

- Paystack (Nigeria) - Already integrated
- Flutterwave (Africa-wide)
- Stripe (International)

**Current:** Using Paystack (already configured)

---

### 5. Background Check Services (For Driver Verification)

**Purpose:** Verify driver identity and background

**Options:**

- Smile Identity (Africa)
- Youverify (Nigeria)
- Trulioo (Global)

**Use Case:**

- Verify driver's license
- Criminal background check
- Identity verification

---

## Implementation Priority

### Phase 1: Critical (Implement Now)

1. **Google Maps Distance Matrix API** - For accurate fare calculation
2. **Google Maps Geocoding API** - For address handling

### Phase 2: Important (Next Sprint)

3. **Google Maps Directions API** - For navigation
4. **FCM/APNS** - For push notifications
5. **Google Places Autocomplete** - For better UX

### Phase 3: Nice to Have

6. **SMS Service** - For fallback notifications
7. **Background Check Service** - For driver verification

---

## Cost Estimation (Monthly)

### Assuming 10,000 rides/month:

**Google Maps APIs:**

- Distance Matrix: 10,000 requests × $0.005 = $50
- Geocoding: 20,000 requests × $0.005 = $100
- Directions: 10,000 requests × $0.005 = $50
- Places Autocomplete: 20,000 sessions × $0.00283 = $56.60

**Total Google Maps:** ~$256.60/month **Less Free Tier:** -$200/month **Net
Cost:** ~$56.60/month

**Push Notifications (FCM/APNS):** Free

**SMS (Optional):**

- 10,000 SMS × $0.01 = $100/month

**Total Estimated Cost:** ~$56.60 - $156.60/month

---

## Setup Instructions

### 1. Google Cloud Platform Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable APIs:
   - Distance Matrix API
   - Directions API
   - Geocoding API
   - Places API
4. Create API Key:
   - Go to "Credentials"
   - Click "Create Credentials" → "API Key"
   - Restrict key to your APIs
   - Add HTTP referrer restrictions (for web)
   - Add application restrictions (for mobile)

5. Add to environment:

```bash
GOOGLE_MAPS_API_KEY=AIzaSy...your_key_here
```

### 2. Firebase Setup (for FCM)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create project or select existing
3. Add Android/iOS apps
4. Download service account key:
   - Project Settings → Service Accounts
   - Generate new private key
5. Add to environment:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

---

## Implementation Example

### Google Maps Distance Matrix

```typescript
// src/services/googleMaps.ts
import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

export async function getDistanceAndDuration(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  try {
    const response = await client.distancematrix({
      params: {
        origins: [`${origin.lat},${origin.lng}`],
        destinations: [`${destination.lat},${destination.lng}`],
        mode: 'driving',
        departure_time: 'now',
        traffic_model: 'best_guess',
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });

    const element = response.data.rows[0].elements[0];

    if (element.status !== 'OK') {
      throw new Error('Unable to calculate distance');
    }

    return {
      distance_km: element.distance.value / 1000,
      duration_minutes:
        Math.ceil(
          element.duration_in_traffic?.value || element.duration.value
        ) / 60,
      distance_text: element.distance.text,
      duration_text: element.duration_in_traffic?.text || element.duration.text,
    };
  } catch (error) {
    console.error('Google Maps API error:', error);
    // Fallback to Haversine formula
    return fallbackCalculation(origin, destination);
  }
}
```

### Usage in Rides Route

```typescript
// In POST /api/rides
const { distance_km, duration_minutes } = await getDistanceAndDuration(
  { lat: pickup_lat, lng: pickup_lng },
  { lat: dropoff_lat, lng: dropoff_lng }
);

const base_fare =
  500 + Math.round(distance_km * 100) + Math.round(duration_minutes * 20);
```

---

## Testing Without API Keys

For development/testing without API keys, the current Haversine formula works as
a fallback:

```typescript
// Fallback calculation (current implementation)
function fallbackCalculation(origin, destination) {
  const distance_km = calculateDistance(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );
  const duration_minutes = Math.ceil((distance_km / 25) * 60);

  return {
    distance_km,
    duration_minutes,
    distance_text: `${distance_km.toFixed(1)} km`,
    duration_text: `${duration_minutes} mins`,
  };
}
```

This allows the service to work without external APIs, but with less accuracy.
