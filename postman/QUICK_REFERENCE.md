# Quick Reference - Common API Flows

## 🏨 Hotel Booking Flow

### 1. Search for Hotels

```http
POST /Search-hotels
{
  "location": "Lagos",
  "checkIn": "2024-12-01",
  "checkOut": "2024-12-05",
  "guests": 2,
  "minPrice": 50,
  "maxPrice": 300
}
```

### 2. Get Hotel Details

```http
POST /Get-hotel-details
{
  "hotelId": "{{hotel_id}}"
}
```

### 3. Check Room Availability

```http
POST /check-room-availability
{
  "hotelId": "{{hotel_id}}",
  "roomTypeId": "{{room_type_id}}",
  "checkIn": "2024-12-01",
  "checkOut": "2024-12-05"
}
```

### 4. Calculate Price (with Promo)

```http
POST /Calculate-booking-price
{
  "roomTypeId": "{{room_type_id}}",
  "checkIn": "2024-12-01",
  "checkOut": "2024-12-05",
  "rooms": 1,
  "promoCode": "SUMMER2024"
}
```

### 5. Create Booking

```http
POST /Create-booking
{
  "hotelId": "{{hotel_id}}",
  "roomTypeId": "{{room_type_id}}",
  "checkIn": "2024-12-01",
  "checkOut": "2024-12-05",
  "rooms": 1,
  "guests": 2,
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890",
  "promoCode": "SUMMER2024"
}
```

**Response:** Save `bookingId` and `totalAmount`

### 6. Initialize Payment

```http
POST /Initialize-payment
{
  "amount": {{total_amount}},
  "currency": "NGN",
  "purpose": "booking",
  "referenceId": "{{booking_id}}"
}
```

**Response:** Redirect user to `authorization_url`

### 7. Verify Payment

```http
POST /Verify-payment
{
  "reference": "{{payment_reference}}"
}
```

### 8. Get Booking Details

```http
POST /get-booking-details
{
  "bookingId": "{{booking_id}}"
}
```

---

## 👤 User Setup Flow

### 1. Get Current Profile

```http
GET /get-current-profile
```

### 2. Update Profile

```http
POST /update-user-profile
{
  "full_name": "John Doe",
  "phone": "+1234567890",
  "bio": "Travel enthusiast"
}
```

### 3. Upload Profile Picture

```http
POST /upload-profile-picture
[Form Data with file]
```

### 4. Add Address

```http
POST /add-user-address
{
  "street": "123 Main St",
  "city": "Lagos",
  "state": "Lagos",
  "country": "Nigeria",
  "postal_code": "100001",
  "is_default": true
}
```

### 5. Apply for Vendor Role

```http
POST /apply-for-role
{
  "role": "vendor",
  "reason": "I want to list my hotel"
}
```

---

## 🏢 Vendor Flow - Create Hotel

### 1. Create Hotel

```http
POST /create-hotel
{
  "name": "Grand Hotel Lagos",
  "description": "Luxury hotel in the heart of Lagos",
  "address": "123 Victoria Island",
  "city": "Lagos",
  "state": "Lagos",
  "country": "Nigeria",
  "postal_code": "100001",
  "latitude": 6.4281,
  "longitude": 3.4219,
  "star_rating": 5,
  "amenities": ["wifi", "pool", "gym", "restaurant"],
  "check_in_time": "14:00",
  "check_out_time": "11:00"
}
```

**Response:** Save `hotelId`

### 2. Add Room Types

```http
POST /create-room-type
{
  "hotelId": "{{hotel_id}}",
  "name": "Deluxe Suite",
  "description": "Spacious room with ocean view",
  "base_price": 150,
  "max_occupancy": 2,
  "total_rooms": 10,
  "size_sqm": 45,
  "bed_configuration": "1 King Bed",
  "amenities": ["wifi", "minibar", "tv"]
}
```

### 3. Get Analytics

```http
POST /get-hotel-analytics
{
  "hotelId": "{{hotel_id}}",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

---

## 💰 Payment & Wallet Flow

### Top Up Wallet

```http
POST /Topup-wallet
{
  "amount": 10000
}
```

### Pay with Wallet

```http
POST /Pay-with-wallet
{
  "amount": 5000,
  "purpose": "booking",
  "referenceId": "{{booking_id}}"
}
```

### Get Vendor Balance

```http
GET /Get-vendor-balance
```

### Request Payout

```http
POST /Create-payout-request
{
  "amount": 100000,
  "bankDetails": {
    "accountNumber": "1234567890",
    "bankCode": "058"
  }
}
```

---

## ⭐ Review Flow

### 1. Create Review (After Checkout)

```http
POST /create-hotel-review
{
  "bookingId": "{{booking_id}}",
  "hotelId": "{{hotel_id}}",
  "rating": 5,
  "review_text": "Excellent stay!",
  "cleanliness_rating": 5,
  "comfort_rating": 5,
  "location_rating": 4,
  "service_rating": 5,
  "value_rating": 4
}
```

### 2. Get Hotel Reviews

```http
POST /get-hotel-reviews
{
  "hotelId": "{{hotel_id}}",
  "page": 1,
  "limit": 10,
  "sortBy": "recent"
}
```

### 3. Hotel Owner Responds

```http
POST /respond-to-review
{
  "reviewId": "{{review_id}}",
  "response": "Thank you for your feedback!"
}
```

---

## 📝 Common Test Data

### Test Credentials

```javascript
// Production - Get from your Supabase dashboard
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

// Local Development
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Sample Hotel Data

```json
{
  "name": "Test Hotel",
  "city": "Lagos",
  "star_rating": 4,
  "base_price": 100
}
```

### Sample Booking Dates

```json
{
  "checkIn": "2024-12-01",
  "checkOut": "2024-12-05",
  "nights": 4
}
```

---

## 🛠️ Workflow Scripts

### Run Documentation Generator

```bash
cd /Users/user/Dev/giga
deno run --allow-read --allow-write scripts/generate-api-docs.ts
```

### Test Local Functions

```bash
supabase functions serve
```

### Deploy Function

```bash
supabase functions deploy function-name
```

---

## 🐛 Common Error Codes

| Code | Meaning          | Solution                                       |
| ---- | ---------------- | ---------------------------------------------- |
| 401  | Unauthorized     | Check auth token is valid and not expired      |
| 403  | Forbidden        | User lacks required role/permission            |
| 404  | Not Found        | Check endpoint name and base URL               |
| 409  | Conflict         | Resource already exists or constraint violated |
| 422  | Validation Error | Check request body matches schema              |
| 500  | Server Error     | Check function logs in Supabase                |

---

## 📞 Support Resources

- **Function Logs**: Supabase Dashboard → Edge Functions → [Function] → Logs
- **Local Testing**: `supabase functions serve --env-file .env.local`
- **Postman Collection**: `/postman/Giga-API-Collection.postman_collection.json`
- **Full Docs**: `/postman/README.md`
