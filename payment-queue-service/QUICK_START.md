# Payment System - Quick Start Guide

Everything you need to start using the payment system in 5 minutes.

---

## ✅ What's Ready

1. **Database** - Tables and functions created via Supabase MCP
2. **Swagger Docs** - Full API documentation at `/api-docs`
3. **Demo Mode** - Works without API keys for testing
4. **Helper Functions** - Ready-to-use client code
5. **Integration Examples** - Copy-paste code for all services

---

## 🚀 Start the Service

```bash
cd payment-queue-service
npm install
npm run dev
```

Service runs on: `http://localhost:3004`

---

## 📚 View API Documentation

Open in browser: `http://localhost:3004/api-docs`

You'll see:
- All wallet endpoints
- Request/response schemas
- Try-it-out functionality
- Example payloads

---

## 🔧 Integration in 3 Steps

### Step 1: Add Environment Variable

In your service's `.env`:
```bash
PAYMENT_SERVICE_URL=http://localhost:3004
```

### Step 2: Copy Helper File

Copy `PAYMENT_CLIENT_HELPER.ts` to your service:
```bash
cp payment-queue-service/PAYMENT_CLIENT_HELPER.ts your-service/src/utils/paymentClient.ts
```

### Step 3: Use in Your Code

```typescript
import { getPaymentOptions, deductFromWallet } from './utils/paymentClient';

// Check payment options
const options = await getPaymentOptions(50000, req.headers.authorization);

// Pay with wallet
const result = await deductFromWallet({
  amount: 50000,
  description: 'Hotel booking',
  reference: 'HOTEL-123',
  token: req.headers.authorization
});

if (result.success) {
  console.log('Payment successful! New balance:', result.newBalance);
} else {
  console.log('Payment failed:', result.error);
}
```

---

## 📖 Documentation Files

1. **PAYMENT_INTEGRATION_GUIDE.md** - Complete integration examples for all services
2. **PAYMENT_CLIENT_HELPER.ts** - Ready-to-use helper functions
3. **DATABASE_SETUP_COMPLETE.md** - Database schema and functions
4. **PAYSTACK_GUIDE.md** - How Paystack works
5. **WALLET_QUICKSTART.md** - Wallet system overview
6. **This file** - Quick start guide

---

## 🧪 Test Endpoints

### 1. Check Wallet Balance
```bash
curl http://localhost:3004/api/v1/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Top Up Wallet (Demo Mode)
```bash
curl -X POST http://localhost:3004/api/v1/wallet/topup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "email": "user@example.com"
  }'
```

### 3. Get Transactions
```bash
curl http://localhost:3004/api/v1/wallet/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 💡 Common Use Cases

### Hotels: Room Booking Payment
```typescript
// Check if user can pay with wallet
const options = await getPaymentOptions(bookingAmount, token);

if (options.wallet.available) {
  // Pay with wallet
  const result = await deductFromWallet({
    amount: bookingAmount,
    description: `Hotel booking #${bookingNumber}`,
    reference: `HOTEL-${bookingId}`,
    token
  });
} else {
  // Pay with Paystack
  const result = await initializePaystackPayment({
    amount: bookingAmount,
    email: user.email,
    reference: `HOTEL-${bookingId}`,
    token
  });
  // Redirect user to: result.authorizationUrl
}
```

### Taxi: Ride Payment
```typescript
// Auto-deduct from wallet when ride completes
const result = await deductFromWallet({
  amount: rideAmount,
  description: `Taxi ride #${rideNumber}`,
  reference: `RIDE-${rideId}`,
  token
});

if (!result.success) {
  // Insufficient balance - offer Paystack
  return { requiresPayment: true, amount: rideAmount };
}
```

### Ecommerce: Product Purchase
```typescript
// Try wallet first, fallback to Paystack
const result = await processPaymentWithFallback({
  amount: orderTotal,
  description: `Order #${orderNumber}`,
  reference: `ORDER-${orderId}`,
  email: user.email,
  token
});

if (result.method === 'wallet') {
  // Paid with wallet
  console.log('New balance:', result.newBalance);
} else if (result.method === 'paystack') {
  // Redirect to Paystack
  window.location.href = result.authorizationUrl;
}
```

---

## 🎯 Payment Flow

```
1. User initiates payment (booking, order, ride, etc.)
   ↓
2. Service checks wallet balance
   ↓
3. If sufficient → Deduct from wallet
   If insufficient → Initialize Paystack payment
   ↓
4. Update order/booking status
   ↓
5. Calculate and record commission
   ↓
6. Done!
```

---

## 🔑 Commission Rates

```typescript
const COMMISSION_RATES = {
  hotels: 0.10,      // 10%
  taxi: 0.15,        // 15%
  ecommerce: 0.05,   // 5%
  delivery: 0.12,    // 12%
};

// Example calculation
const totalAmount = 50000;
const commissionRate = 0.10;
const commission = totalAmount * commissionRate;  // 5000
const vendorAmount = totalAmount - commission;     // 45000
```

---

## 🐛 Error Handling

```typescript
const result = await deductFromWallet({ amount, description, reference, token });

if (!result.success) {
  switch (result.code) {
    case 'INSUFFICIENT_BALANCE':
      // Offer Paystack payment
      break;
    case 'UNAUTHORIZED':
      // Redirect to login
      break;
    case 'PAYMENT_ERROR':
      // Show error message
      break;
  }
}
```

---

## 🔄 Demo Mode vs Production

### Demo Mode (Default)
- No API keys needed
- Simulates successful payments
- No real money charged
- Perfect for testing

### Production Mode
Add to `.env`:
```bash
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
```

Service automatically switches to production mode when keys are present.

---

## 📊 Database Functions

Direct database access (if needed):

```sql
-- Credit wallet
SELECT credit_wallet('user-uuid', 10000);

-- Debit wallet
SELECT debit_wallet('user-uuid', 5000);

-- Get balance
SELECT get_wallet_balance('user-uuid');

-- View transactions
SELECT * FROM wallet_transactions
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

---

## 🚢 Deploy to Railway

```bash
# Service is already configured for Railway
# Just push to your repo and Railway will deploy

git add .
git commit -m "Add payment service"
git push origin main
```

Environment variables needed in Railway:
```
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
PAYSTACK_SECRET_KEY=sk_live_xxx (optional for demo mode)
PAYSTACK_PUBLIC_KEY=pk_live_xxx (optional for demo mode)
```

---

## ✅ Integration Checklist

- [ ] Start payment service: `npm run dev`
- [ ] View Swagger docs: `http://localhost:3004/api-docs`
- [ ] Copy helper file to your service
- [ ] Add `PAYMENT_SERVICE_URL` to `.env`
- [ ] Test wallet balance endpoint
- [ ] Test wallet top-up (demo mode)
- [ ] Integrate payment in your service
- [ ] Test with demo payments
- [ ] Add Paystack keys for production
- [ ] Deploy to Railway

---

## 🆘 Need Help?

1. **Swagger Docs**: `http://localhost:3004/api-docs`
2. **Integration Guide**: `PAYMENT_INTEGRATION_GUIDE.md`
3. **Helper Functions**: `PAYMENT_CLIENT_HELPER.ts`
4. **Database Info**: `DATABASE_SETUP_COMPLETE.md`

---

**You're all set! Start integrating payments in your services now! 🎉**
