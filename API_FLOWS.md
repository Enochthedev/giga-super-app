# 🌊 Giga API Flows & Usage Guide

This guide outlines the standard operational flows for the Giga application services. It is designed to help frontend developers understand which endpoints to call and in what order to achieve specific user goals.

## 🔐 Authentication & Setup

**Note**: Authentication (Sign Up, Sign In, Sign Out) is handled directly via the Supabase Auth SDK (GoTrue), not through Edge Functions.

1.  **Sign Up / Sign In**: Use Supabase Auth SDK.
    *   *Result*: You get a `session` object containing an `access_token`.
2.  **Authorization**: All Edge Functions below require the `Authorization: Bearer <access_token>` header unless otherwise stated.

### 🎭 Role Management

Giga users can have multiple roles (User, Driver, Vendor).

1.  **Apply for Role**: Request to become a driver or vendor.
    *   **Endpoint**: `apply-for-role`
    *   *Payload*: `{ "role": "driver", "documents": [...] }`
2.  **Switch Role**: Toggle active profile context.
    *   **Endpoint**: `switch-role`
    *   *Payload*: `{ "target_role": "driver" }`
    *   *Note*: This updates the user's current session context in the database.
3.  **Get Profile**: Get current profile details.
    *   **Endpoint**: `get-user-profile`

---

## 🚖 Taxi & Ride-Hailing Service

### 👤 Rider Flow

1.  **Get Estimate**: User enters pickup and dropoff.
    *   **Endpoint**: `get-ride-estimate`
    *   *Payload*: `{ "pickup": { "lat": ..., "lng": ... }, "dropoff": { "lat": ..., "lng": ... }, "ride_type": "standard" }`
2.  **Request Ride**: User confirms the ride.
    *   **Endpoint**: `request-ride`
    *   *Payload*: `{ "pickup_location": ..., "dropoff_location": ..., "fare_id": "...", "payment_method": "wallet" }`
3.  **Track Ride**: Poll for status or listen to realtime updates.
    *   **Endpoint**: `get-active-ride`
    *   *Usage*: Call periodically to check if a driver has accepted (`status: 'accepted'`) or arrived.
4.  **Cancel Ride (Optional)**: If user changes mind before ride starts.
    *   **Endpoint**: `cancel-ride`
    *   *Payload*: `{ "ride_id": "..." }`
5.  **Rate Driver**: After ride completes.
    *   **Endpoint**: `rate-driver`
    *   *Payload*: `{ "ride_id": "...", "rating": 5, "comment": "Great ride!" }`
6.  **View History**: View past rides.
    *   **Endpoint**: `get-ride-history`

### 🚗 Driver Flow

1.  **Go Online**: Driver makes themselves available.
    *   **Endpoint**: `toggle-availability`
    *   *Payload*: `{ "is_available": true }`
2.  **Update Location**: Send GPS updates (critical for matching).
    *   **Endpoint**: `update-location`
    *   *Payload*: `{ "lat": ..., "lng": ..., "heading": ... }`
3.  **Receive Request**: (Handled via Realtime/Socket, but can poll).
    *   **Endpoint**: `get-ride-requests`
4.  **Accept/Reject Ride**: Driver responds to a request.
    *   **Endpoint**: `accept-ride` OR `reject-ride`
    *   *Payload*: `{ "ride_id": "..." }`
5.  **Start Ride**: Driver picks up passenger.
    *   **Endpoint**: `start-ride`
    *   *Payload*: `{ "ride_id": "..." }`
6.  **Complete Ride**: Driver drops off passenger.
    *   **Endpoint**: `complete-ride`
    *   *Payload*: `{ "ride_id": "..." }`
7.  **View Earnings**: Check daily/weekly earnings.
    *   **Endpoint**: `get-earnings`

---

## 🏨 Hotel & Booking Service

### 🛏️ Guest Flow

1.  **Search Hotels**: User searches for hotels.
    *   **Endpoint**: `Search-hotels`
    *   *Query*: `?location=Lagos&check_in=2024-01-01&check_out=2024-01-05`
2.  **View Details**: User clicks on a hotel.
    *   **Endpoint**: `Get-hotel-details`
    *   *Query*: `?hotel_id=...`
3.  **Check Availability**: Verify room before booking.
    *   **Endpoint**: `check-room-availability`
    *   *Payload*: `{ "hotel_id": "...", "room_type_id": "...", "dates": [...] }`
4.  **Calculate Price**: Get final price with taxes/fees.
    *   **Endpoint**: `Calculate-booking-price`
5.  **Create Booking**: User confirms booking.
    *   **Endpoint**: `Create-booking`
    *   *Payload*: `{ "hotel_id": "...", "room_id": "...", "guest_details": {...} }`
6.  **Pay for Booking**: (See Payment Flow).
7.  **View Bookings**: User checks their trips.
    *   **Endpoint**: `Get-user-bookings`
8.  **Review**: After stay.
    *   **Endpoint**: `create-hotel-review`

### 🏨 Vendor (Hotelier) Flow

1.  **Create Hotel**: Onboarding a new property.
    *   **Endpoint**: `create-hotel`
2.  **Manage Rooms**: Define room types.
    *   **Endpoint**: `create-room-type` / `update-room-type`
3.  **Manage Availability**: Block dates or update stock.
    *   **Endpoint**: `update-room-availability`
4.  **Check-in Guest**: When guest arrives.
    *   **Endpoint**: `check-in-guest`
    *   *Payload*: `{ "booking_id": "..." }`
5.  **Check-out Guest**: When guest leaves.
    *   **Endpoint**: `Checkout-guest`

---

## 💬 Social & Community

### 📱 Feed & Posts

1.  **View Feed**: Main home screen.
    *   **Endpoint**: `get-social-feed`
    *   *Query*: `?limit=10&offset=0`
2.  **Create Post**: User shares content.
    *   **Endpoint**: `create-social-post`
    *   *Payload*: `{ "content": "Hello world", "media_urls": [...] }`
3.  **Interact**: Like or Comment.
    *   **Endpoint**: `like-post` / `comment-on-post`
4.  **Stories**: View or post 24h stories.
    *   **Endpoint**: `get-stories` / `create-story`

### 🤝 Connections (Friends)

1.  **Find People**: Search for users.
    *   **Endpoint**: `search-users`
2.  **Send Request**: Ask to connect.
    *   **Endpoint**: `send-friend-request`
    *   *Payload*: `{ "targetUserId": "..." }`
3.  **Respond**: Accept or decline.
    *   **Endpoint**: `respond-to-friend-request`
4.  **List Friends**: View connections.
    *   **Endpoint**: `get-friends`

---

## 📨 Messaging & Chat

1.  **List Conversations**: Inbox view.
    *   **Endpoint**: `get-conversations`
2.  **Start Chat**: New message to someone.
    *   **Endpoint**: `create-conversation`
    *   *Payload*: `{ "participantIds": ["..."] }`
3.  **Get Messages**: Inside a chat.
    *   **Endpoint**: `get-messages`
    *   *Query*: `?conversation_id=...`
4.  **Send Message**: Post a text/image.
    *   **Endpoint**: `send-message`
    *   *Payload*: `{ "conversationId": "...", "content": "..." }`

---

## 💳 Wallet & Payments

1.  **Top Up Wallet**: Add funds to system wallet.
    *   **Endpoint**: `Topup-wallet`
    *   *Payload*: `{ "amount": 5000, "currency": "NGN" }`
2.  **Initialize Payment**: Start a transaction (e.g., for booking).
    *   **Endpoint**: `Initialize-payment`
    *   *Payload*: `{ "amount": ..., "purpose": "booking" }`
3.  **Verify Payment**: Confirm success after gateway redirect.
    *   **Endpoint**: `Verify-payment`
    *   *Payload*: `{ "reference": "..." }`
4.  **Pay with Wallet**: Use internal balance.
    *   **Endpoint**: `Pay-with-wallet`

---

## 📢 Ads & Promotion

1.  **Create Campaign**: Advertiser sets up ad.
    *   **Endpoint**: `create-ad-campaign`
2.  **Fetch Ads**: App requests ads to display in feed.
    *   **Endpoint**: `fetch-ads`
    *   *Payload*: `{ "placement": "feed", "user_context": {...} }`
3.  **Track Event**: App reports impression/click.
    *   **Endpoint**: `track-ad-event`
    *   *Payload*: `{ "ad_id": "...", "event_type": "impression" }`

---

## 🛠️ Admin & Support

*   **Dashboard**: `admin-get-dashboard-stats`
*   **User Management**: `admin-manage-users`
*   **Support**: `create-support-ticket` / `get-my-tickets`
