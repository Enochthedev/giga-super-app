# Frontend Integration Guide

This guide explains how to integrate the Giga Platform API into your frontend
application (React, Vue, Mobile, etc.).

## 🚀 Quick Start

### 1. Setup Supabase Client

Ensure you have the Supabase client initialized with your project URL and Anon
Key.

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);
```

### 2. Calling Edge Functions

We use Supabase Edge Functions for all business logic. Use the
`functions.invoke` method.

```typescript
// Example: Check Room Availability
const { data, error } = await supabase.functions.invoke(
  'check-room-availability',
  {
    body: {
      hotelId: '123-456',
      checkIn: '2024-12-01',
      checkOut: '2024-12-05',
    },
  }
);

if (error) {
  console.error('API Error:', error);
  alert(error.message);
} else {
  console.log('Success:', data);
}
```

---

## 📦 Standard Response Format

All Edge Functions return a consistent JSON structure:

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    // ... result data here
  },
  "message": "Optional success message"
}
```

**Error Response (400/500):**

```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

**Frontend Helper:**

```typescript
async function callApi(functionName: string, body: any) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) throw error;
  if (!data.success) throw new Error(data.error);

  return data.data;
}
```

---

## 🔑 Authentication

Most functions require the user to be logged in. The Supabase client handles
this automatically! Just ensure the user is signed in via
`supabase.auth.signInWithPassword(...)` before calling functions.

The `Authorization: Bearer <token>` header is automatically injected by the SDK.

---

## 🏨 Key Workflows

### 1. Booking Flow

1.  **Search**: `Search-hotels` -> List of hotels.
2.  **Details**: `Get-hotel-details` -> Hotel info + Room Types.
3.  **Availability**: `check-room-availability` -> Check if dates are open.
4.  **Book**: `Create-booking` -> Returns `booking_id` and
    `payment_status: 'pending'`.
5.  **Pay**: `Initialize-payment` -> Returns payment link or intent.

### 2. Vendor Management

1.  **Create Hotel**: `create-hotel`
2.  **Add Rooms**: `create-room-type`
3.  **Manage Pricing**: `bulk-update-pricing` (New!)
4.  **View Stats**: `get-hotel-analytics`

### 3. Reviews

1.  **List**: `get-hotel-reviews`
2.  **Post**: `create-hotel-review` (Only after checkout)
3.  **Vote**: `mark-review-helpful` (New!)

---

## 🧪 Testing with Postman

We have a complete Postman collection available.

1.  Import `Giga-API-Collection.postman_collection.json`.
2.  Set your Environment Variables (`base_url`, `supabase_anon_key`,
    `supabase_auth_token`).
3.  Run the **"Supabase Auth"** folder first to get a token.
4.  All endpoints have **Automated Tests** to verify they work correctly.

---

## ❓ Troubleshooting

| Error                       | Meaning            | Fix                                               |
| :-------------------------- | :----------------- | :------------------------------------------------ |
| `FunctionsFetchError`       | Network/CORS issue | Check your internet or CORS settings in Supabase. |
| `401 Unauthorized`          | Not logged in      | Call `supabase.auth.signIn...` first.             |
| `400 Bad Request`           | Invalid params     | Check the `body` matches the API docs.            |
| `500 Internal Server Error` | Server bug         | Contact the backend team with the Request ID.     |
