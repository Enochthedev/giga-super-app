# Payment System - Ready to Use! 🚀

Hey Aaron! The payment/wallet system is complete and ready. Here's everything
you need to know.

## ✅ What's Done

1. **Swagger Documentation** - Visit `http://localhost:4005/api-docs` or
   `https://payment-service.railway.app/api-docs`
2. **Demo Mode** - Works without Paystack keys (perfect for testing)
3. **API Gateway Integration** - All routes configured
4. **Database Setup** - Tables and helper functions ready
5. **Full Documentation** - Multiple guides for different needs

## 🎯 Key Point: Everything Goes Through API Gateway

**Services NEVER call payment-service directly. They ALWAYS go through API
Gateway.**

```
Hotels Service  ──┐
Taxi Service    ──┼──→  API Gateway  ──→  Payment Service
Ecommerce       ──┘
```

## 📍 The Routes

When services need payments, they call API Gateway:

```typescript
// In hotels-service, taxi-service, ecommerce-service, etc.
const API_GATEWAY = 'http://api-gateway:3000'; // or Railway URL

// Check balance
GET ${API_GATEWAY}/api/v1/wallet/balance

// Top up wallet
POST ${API_GATEWAY}/api/v1/wallet/topup

// Deduct from wallet
POST ${API_GATEWAY}/api/v1/payments/deduct

// Get transactions
GET ${API_GATEWAY}/api/v1/wallet/transactions
```

API Gateway automatically routes these to payment-service.

## 🔧 How to Use in Your Services

### Example 1: Hotels Service - Booking Payment

```typescript
// hotels-service/src/services/booking.service.ts
import axios from 'axios';

const API_GATEWAY = process.env.API_GATEWAY_URL;

async function createBooking(userId, hotelId, amount, authToken) {
  // 1. Check balance
  const { data } = await axios.get(`${API_GATEWAY}/api/v1/wallet/balance`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (data.data.balance < amount) {
    throw new Error('Insufficient balance');
  }

  // 2. Create booking (pending)
  const booking = await db.createBooking(userId, hotelId, amount);

  // 3. Charge wallet
  try {
    await axios.post(
      `${API_GATEWAY}/api/v1/payments/deduct`,
      {
        userId,
        amount,
        reference: booking.id,
        description: `Hotel booking #${booking.id}`,
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    // 4. Confirm booking
    await db.confirmBooking(booking.id);
    return booking;
  } catch (error) {
    // Rollback on failure
    await db.cancelBooking(booking.id);
    throw error;
  }
}
```

### Example 2: Taxi Service - Ride Payment

```typescript
// taxi-realtime-service/src/services/ride.service.ts
import axios from 'axios';

const API_GATEWAY = process.env.API_GATEWAY_URL;

async function completeRide(rideId, fare, passengerId, authToken) {
  // Charge passenger
  await axios.post(
    `${API_GATEWAY}/api/v1/payments/deduct`,
    {
      userId: passengerId,
      amount: fare,
      reference: rideId,
      description: `Ride #${rideId}`,
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  // Update ride status
  await db.updateRide(rideId, { status: 'completed', paid: true });
}
```

### Example 3: Ecommerce - Order Payment

```typescript
// ecommerce-service/src/services/order.service.ts
import axios from 'axios';

const API_GATEWAY = process.env.API_GATEWAY_URL;

async function createOrder(userId, items, total, authToken) {
  // Check balance
  const { data } = await axios.get(`${API_GATEWAY}/api/v1/wallet/balance`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (data.data.balance < total) {
    return {
      error: 'Please top up your wallet',
      shortfall: total - data.data.balance,
    };
  }

  // Charge and create order
  await axios.post(
    `${API_GATEWAY}/api/v1/payments/deduct`,
    { userId, amount: total, reference: orderId, description: 'Order payment' },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  return { success: true, orderId };
}
```

## 🌐 Environment Variables

Add to each service's `.env`:

```bash
# In hotels-service/.env, taxi-service/.env, etc.
API_GATEWAY_URL=http://api-gateway:3000

# For Railway production:
API_GATEWAY_URL=https://api-gateway.railway.app
```

## 📚 Available Endpoints (via API Gateway)

All these go through `http://api-gateway:3000`:

| Endpoint                           | Method | Purpose                       | Auth Required |
| ---------------------------------- | ------ | ----------------------------- | ------------- |
| `/api/v1/wallet/balance`           | GET    | Get user's wallet balance     | Yes           |
| `/api/v1/wallet/topup`             | POST   | Initialize wallet top-up      | Yes           |
| `/api/v1/wallet/topup/verify/:ref` | GET    | Verify top-up payment         | No            |
| `/api/v1/wallet/transactions`      | GET    | Get transaction history       | Yes           |
| `/api/v1/payments/deduct`          | POST   | Deduct from wallet (internal) | Yes           |

## 🧪 Testing

### 1. Start services locally:

```bash
# Terminal 1
cd api-gateway && npm run dev

# Terminal 2
cd payment-queue-service && npm run dev

# Terminal 3
cd hotels-service && npm run dev  # or taxi, ecommerce, etc.
```

### 2. Test with curl (through API Gateway):

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

### 3. View Swagger docs:

```
http://localhost:4005/api-docs
```

## 🎨 Demo Mode vs Production

### Demo Mode (Current - No Setup Needed)

- Active when `PAYSTACK_SECRET_KEY` is not set
- No real money
- Perfect for testing
- Returns fake Paystack URLs

### Production Mode

Add to `payment-queue-service/.env`:

```bash
PAYSTACK_SECRET_KEY=sk_live_your_key
PAYSTACK_PUBLIC_KEY=pk_live_your_key
```

## 📖 Documentation Files

- **`HOW_TO_USE_PAYMENTS.md`** - Complete guide (start here!)
- **`PAYMENT_INTEGRATION_GUIDE.md`** - Detailed integration examples
- **`SYSTEM_DIAGRAM.md`** - Visual architecture diagrams
- **`WALLET_QUICKSTART.md`** - Quick start guide
- **`PAYSTACK_GUIDE.md`** - How Paystack works
- **`WALLET_PAYMENT_SYSTEM.md`** - System overview

## 🚀 What You Need to Do

For each service that needs payments (hotels, taxi, ecommerce):

1. **Add environment variable:**

   ```bash
   echo "API_GATEWAY_URL=http://api-gateway:3000" >> .env
   ```

2. **Install axios (if not already):**

   ```bash
   npm install axios
   ```

3. **Make HTTP calls to API Gateway** (see examples above)

That's it! The payment service handles everything else.

## ✨ Key Features

- ✅ Wallet balance tracking
- ✅ Top-up via Paystack
- ✅ Transaction history
- ✅ Demo mode for testing
- ✅ Swagger documentation
- ✅ Error handling
- ✅ Database helper functions
- ✅ API Gateway routing
- ✅ Microservices architecture

## 🔍 How API Gateway Routes Requests

```typescript
// In api-gateway/src/services/serviceRegistry.ts
patterns: [
  '/api/v1/payments*', // → payment-queue-service
  '/api/v1/wallet*', // → payment-queue-service
];
```

So when hotels-service calls:

```
http://api-gateway:3000/api/v1/wallet/balance
```

API Gateway automatically forwards to:

```
http://payment-queue-service:4005/api/v1/wallet/balance
```

## 💡 Common Patterns

### Check balance before action:

```typescript
const balance = await getBalance(token);
if (balance < amount) {
  return { error: 'Insufficient funds' };
}
```

### Charge and rollback on failure:

```typescript
const booking = await createBooking();
try {
  await chargeWallet(amount);
  await confirmBooking();
} catch (error) {
  await cancelBooking();
  throw error;
}
```

### Split payments (commission):

```typescript
await chargeWallet(passengerId, fare);
const driverAmount = fare * 0.85; // 15% commission
await creditWallet(driverId, driverAmount);
```

## 🎯 Summary

The payment system is ready! Services just need to:

1. Add `API_GATEWAY_URL` to their `.env`
2. Make HTTP requests to API Gateway
3. API Gateway routes to payment service automatically

No imports, no direct calls, just clean HTTP through the gateway. That's proper
microservices! 🎉

Questions? Check the docs or the Swagger UI at `/api-docs`!
