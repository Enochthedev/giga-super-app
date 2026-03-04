# How to Use the Payment System - Complete Guide

## Quick Overview

The payment system is ready to use! It has two modes:

1. **Demo Mode** (default) - No real money, perfect for testing
2. **Production Mode** - Real Paystack payments when you add API keys

## For Aaron: What You Need to Know

### 1. Swagger Documentation ✅

Yes, Swagger is fully configured! Access it at:

```
http://localhost:4005/api-docs
```

Or in production:

```
https://payment-queue-service.railway.app/api-docs
```

The Swagger UI shows all wallet endpoints with:

- Request/response examples
- Required parameters
- Authentication requirements
- Try-it-out functionality

### 2. How Services Use Payments

Services DON'T import payment code. They make HTTP requests through the API
Gateway.

**Simple Flow:**

```
Hotels Service → API Gateway → Payment Service
Taxi Service   → API Gateway → Payment Service
Ecommerce      → API Gateway → Payment Service
```

### 3. Example: Hotel Booking Payment

```typescript
// In hotels-service
import axios from 'axios';

// When user books a hotel
async function bookHotel(userId, hotelId, amount, authToken) {
  // 1. Check if user has enough money
  const balance = await axios.get('http://api-gateway/api/v1/wallet/balance', {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (balance.data.data.balance < amount) {
    return { error: 'Not enough money in wallet' };
  }

  // 2. Charge the wallet
  const payment = await axios.post(
    'http://api-gateway/api/v1/payments/deduct',
    {
      userId: userId,
      amount: amount,
      reference: bookingId,
      description: 'Hotel booking',
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  if (payment.data.success) {
    // Booking confirmed!
    return { success: true };
  }
}
```

### 4. Example: Taxi Ride Payment

```typescript
// In taxi-realtime-service
async function completeRide(rideId, fare, passengerId, authToken) {
  // Charge passenger
  const payment = await axios.post(
    'http://api-gateway/api/v1/payments/deduct',
    {
      userId: passengerId,
      amount: fare,
      reference: rideId,
      description: 'Taxi ride',
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  if (payment.data.success) {
    // Ride paid!
    return { success: true };
  }
}
```

### 5. Example: Ecommerce Order Payment

```typescript
// In ecommerce-service
async function createOrder(userId, items, total, authToken) {
  // Check balance
  const balance = await axios.get('http://api-gateway/api/v1/wallet/balance', {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (balance.data.data.balance < total) {
    return { error: 'Please top up your wallet' };
  }

  // Charge wallet
  const payment = await axios.post(
    'http://api-gateway/api/v1/payments/deduct',
    {
      userId: userId,
      amount: total,
      reference: orderId,
      description: 'Order payment',
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  return payment.data;
}
```

## Available Endpoints

### 1. Get Wallet Balance

```bash
GET /api/v1/wallet/balance
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "userId": "123",
    "balance": 5000,
    "currency": "NGN"
  }
}
```

### 2. Top Up Wallet

```bash
POST /api/v1/wallet/topup
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 5000,
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "reference": "ref_123",
    "isDemoMode": true
  }
}
```

### 3. Verify Top Up

```bash
GET /api/v1/wallet/topup/verify/:reference

Response:
{
  "success": true,
  "data": {
    "success": true,
    "amount": 5000,
    "newBalance": 10000
  }
}
```

### 4. Get Transaction History

```bash
GET /api/v1/wallet/transactions?limit=20&offset=0
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "tx_123",
      "type": "credit",
      "amount": 5000,
      "status": "completed",
      "created_at": "2024-03-04T10:00:00Z"
    }
  ]
}
```

## How API Gateway Routes Requests

The API Gateway automatically routes payment requests:

```typescript
// In api-gateway/src/services/serviceRegistry.ts
patterns: [
  '/api/v1/payments*', // All payment endpoints
  '/api/v1/wallet*', // All wallet endpoints
];
```

So when hotels-service calls:

```
http://api-gateway/api/v1/wallet/balance
```

API Gateway forwards it to:

```
http://payment-service/api/v1/wallet/balance
```

## Demo Mode vs Production Mode

### Demo Mode (Current - No Setup Needed)

- Automatically active when `PAYSTACK_SECRET_KEY` is not set
- No real money charged
- Perfect for testing
- Returns fake Paystack URLs
- Simulates successful payments

### Production Mode (When Ready)

Add to `.env`:

```bash
PAYSTACK_SECRET_KEY=sk_live_your_key_here
PAYSTACK_PUBLIC_KEY=pk_live_your_key_here
```

## Testing Locally

1. Start services:

```bash
# Terminal 1 - API Gateway
cd api-gateway && npm run dev

# Terminal 2 - Payment Service
cd payment-queue-service && npm run dev

# Terminal 3 - Your service (hotels, taxi, etc)
cd hotels-service && npm run dev
```

2. Test with curl:

```bash
# Get balance
curl http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN"

# Top up
curl -X POST http://localhost:3000/api/v1/wallet/topup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "email": "test@example.com"}'
```

## What's Already Done

✅ Payment service with Paystack integration ✅ Wallet system (balance, top-up,
transactions) ✅ Demo mode for testing ✅ Swagger documentation ✅ Database
setup with helper functions ✅ API Gateway routing configured ✅ Error handling
and validation ✅ Transaction history tracking

## What You Need to Do

1. **In each service** (hotels, taxi, ecommerce):
   - Add `API_GATEWAY_URL` to `.env`
   - Install axios: `npm install axios`
   - Make HTTP calls to payment endpoints (see examples above)

2. **For production**:
   - Get Paystack API keys from https://paystack.com
   - Add keys to payment-service `.env`
   - Deploy to Railway

## Common Patterns

### Pattern 1: Check Balance Before Action

```typescript
const balance = await getBalance(authToken);
if (balance < amount) {
  return { error: 'Insufficient funds' };
}
// Proceed with action
```

### Pattern 2: Charge and Rollback on Failure

```typescript
const booking = await createBooking(); // Create pending

try {
  const payment = await chargeWallet(amount);
  if (payment.success) {
    await confirmBooking(booking.id);
  } else {
    await cancelBooking(booking.id);
  }
} catch (error) {
  await cancelBooking(booking.id);
  throw error;
}
```

### Pattern 3: Split Payments (Commission)

```typescript
// Charge passenger
await chargeWallet(passengerId, fare);

// Pay driver (minus commission)
const driverAmount = fare * 0.85; // 15% commission
await creditWallet(driverId, driverAmount);
```

## Need Help?

Check these files:

- `PAYMENT_INTEGRATION_GUIDE.md` - Detailed integration examples
- `WALLET_QUICKSTART.md` - Quick start guide
- `PAYSTACK_GUIDE.md` - How Paystack works
- `WALLET_PAYMENT_SYSTEM.md` - System architecture

Or visit Swagger docs at `/api-docs` for interactive API testing!
