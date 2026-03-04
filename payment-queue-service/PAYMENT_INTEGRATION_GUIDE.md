# Payment Integration Guide for Services

This guide shows how other services in the Giga platform integrate with the
Payment Queue Service using proper microservices architecture.

## Architecture Overview

```
┌─────────────────┐      ┌─────────────────┐      ┌──────────────────────┐
│  Hotels Service │      │  Taxi Service   │      │  Ecommerce Service   │
│                 │      │                 │      │                      │
│  Makes HTTP     │      │  Makes HTTP     │      │  Makes HTTP          │
│  requests       │      │  requests       │      │  requests            │
└────────┬────────┘      └────────┬────────┘      └──────────┬───────────┘
         │                        │                           │
         │                        │                           │
         └────────────────────────┼───────────────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  API Gateway    │
                         │                 │
                         │  Routes to      │
                         │  services       │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────────┐
                         │  Payment Service    │
                         │                     │
                         │  /api/v1/payments   │
                         │  /api/v1/wallet     │
                         └─────────────────────┘
```

## Key Principle: Services Communicate via HTTP

**DO NOT** import payment service code into other services. Instead, make HTTP
requests through the API Gateway.

## API Gateway Configuration

The API Gateway routes payment requests to the payment-queue-service:

```typescript
// In api-gateway/src/services/serviceRegistry.ts
patterns: ['/api/v1/payments*', '/api/v1/wallet*'];
```

This means any request to `/api/v1/payments/*` or `/api/v1/wallet/*` gets routed
to the payment service.

## Available Payment Endpoints

### Wallet Endpoints

1. **Get Wallet Balance**
   - `GET /api/v1/wallet/balance`
   - Requires: Authentication token
   - Returns: Current wallet balance

2. **Initialize Top-Up**
   - `POST /api/v1/wallet/topup`
   - Requires: Authentication token, amount, email
   - Returns: Paystack checkout URL

3. **Verify Top-Up**
   - `GET /api/v1/wallet/topup/verify/:reference`
   - Returns: Verification status and new balance

4. **Get Transactions**
   - `GET /api/v1/wallet/transactions`
   - Requires: Authentication token
   - Returns: Transaction history

### Payment Endpoints

1. **Initialize Payment**
   - `POST /api/v1/payments/initialize`
   - For direct payments (not wallet)

2. **Verify Payment**
   - `GET /api/v1/payments/verify/:reference`
   - Verify payment status

## Integration Examples

### Example 1: Hotels Service - Booking Payment

When a user books a hotel, the hotels-service needs to charge their wallet:

```typescript
// hotels-service/src/services/booking.service.ts
import axios from 'axios';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

async function createBooking(
  userId: string,
  hotelId: string,
  amount: number,
  authToken: string
) {
  // 1. Check wallet balance first
  const balanceResponse = await axios.get(
    `${API_GATEWAY_URL}/api/v1/wallet/balance`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const balance = balanceResponse.data.data.balance;

  if (balance < amount) {
    throw new Error('Insufficient wallet balance');
  }

  // 2. Create booking in database (pending status)
  const booking = await createPendingBooking(userId, hotelId, amount);

  // 3. Deduct from wallet via payment service
  try {
    const paymentResponse = await axios.post(
      `${API_GATEWAY_URL}/api/v1/payments/deduct`,
      {
        userId,
        amount,
        reference: booking.id,
        description: `Hotel booking #${booking.id}`,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (paymentResponse.data.success) {
      // 4. Confirm booking
      await confirmBooking(booking.id);
      return booking;
    } else {
      // 5. Cancel booking if payment failed
      await cancelBooking(booking.id);
      throw new Error('Payment failed');
    }
  } catch (error) {
    await cancelBooking(booking.id);
    throw error;
  }
}
```

### Example 2: Taxi Service - Ride Payment

When a ride is completed, charge the passenger:

```typescript
// taxi-realtime-service/src/services/ride.service.ts
import axios from 'axios';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

async function completeRide(
  rideId: string,
  fare: number,
  passengerId: string,
  authToken: string
) {
  // 1. Update ride status to completed
  await updateRideStatus(rideId, 'completed');

  // 2. Charge passenger wallet
  try {
    const paymentResponse = await axios.post(
      `${API_GATEWAY_URL}/api/v1/payments/deduct`,
      {
        userId: passengerId,
        amount: fare,
        reference: rideId,
        description: `Ride payment #${rideId}`,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (paymentResponse.data.success) {
      // 3. Credit driver wallet (minus commission)
      const driverAmount = fare * 0.85; // 15% commission
      await creditDriverWallet(rideId, driverAmount);

      return { success: true, fare, charged: true };
    } else {
      // Handle payment failure
      await handlePaymentFailure(rideId);
      return { success: false, error: 'Payment failed' };
    }
  } catch (error) {
    await handlePaymentFailure(rideId);
    throw error;
  }
}
```

### Example 3: Ecommerce Service - Order Payment

When a user places an order:

```typescript
// ecommerce-service/src/services/order.service.ts
import axios from 'axios';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

async function createOrder(
  userId: string,
  items: any[],
  total: number,
  authToken: string
) {
  // 1. Check wallet balance
  const balanceResponse = await axios.get(
    `${API_GATEWAY_URL}/api/v1/wallet/balance`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );

  const balance = balanceResponse.data.data.balance;

  if (balance < total) {
    // Redirect to top-up
    return {
      success: false,
      error: 'Insufficient balance',
      action: 'topup_required',
      shortfall: total - balance,
    };
  }

  // 2. Create order (pending)
  const order = await createPendingOrder(userId, items, total);

  // 3. Charge wallet
  try {
    const paymentResponse = await axios.post(
      `${API_GATEWAY_URL}/api/v1/payments/deduct`,
      {
        userId,
        amount: total,
        reference: order.id,
        description: `Order #${order.id}`,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (paymentResponse.data.success) {
      await confirmOrder(order.id);
      return { success: true, order };
    } else {
      await cancelOrder(order.id);
      return { success: false, error: 'Payment failed' };
    }
  } catch (error) {
    await cancelOrder(order.id);
    throw error;
  }
}
```

## Environment Variables

Each service needs to know the API Gateway URL:

```bash
# In hotels-service/.env, taxi-service/.env, etc.
API_GATEWAY_URL=https://api-gateway.railway.app
# or for local development:
API_GATEWAY_URL=http://localhost:3000
```

## Error Handling

Always handle these scenarios:

1. **Insufficient Balance**: Check balance before attempting payment
2. **Network Errors**: Wrap API calls in try-catch
3. **Payment Failures**: Rollback any database changes
4. **Timeout**: Set reasonable timeouts for HTTP requests

```typescript
try {
  const response = await axios.post(url, data, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10000, // 10 second timeout
  });

  if (response.data.success) {
    // Handle success
  } else {
    // Handle failure
  }
} catch (error) {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      // Timeout
    } else if (error.response) {
      // Server responded with error
      console.error('Payment error:', error.response.data);
    } else {
      // Network error
      console.error('Network error:', error.message);
    }
  }
  // Rollback changes
  throw error;
}
```

## Testing

### Local Development

1. Start API Gateway: `cd api-gateway && npm run dev`
2. Start Payment Service: `cd payment-queue-service && npm run dev`
3. Start your service: `cd hotels-service && npm run dev`

### Test with curl

```bash
# Get wallet balance
curl -X GET http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN"

# Initialize top-up
curl -X POST http://localhost:3000/api/v1/wallet/topup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "email": "user@example.com"}'
```

## Production Deployment

On Railway, services automatically discover each other through environment
variables:

```bash
# API Gateway knows payment service URL
PAYMENT_SERVICE_URL=https://payment-queue-service.railway.app

# Other services know API Gateway URL
API_GATEWAY_URL=https://api-gateway.railway.app
```

## Summary

- Services communicate via HTTP through API Gateway
- Never import payment service code directly
- Always check balance before charging
- Handle errors and rollback on failure
- Use proper authentication tokens
- Set reasonable timeouts
- Test locally before deploying

For more details, see:

- `WALLET_QUICKSTART.md` - Quick start guide
- `WALLET_PAYMENT_SYSTEM.md` - System overview
- `PAYSTACK_GUIDE.md` - Paystack integration details
