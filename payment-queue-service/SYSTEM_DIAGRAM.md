# Payment System Architecture Diagram

## Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MOBILE/WEB CLIENTS                              │
│  (React Native, Flutter, Web Browser)                                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │ HTTP Requests
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY                                     │
│  Port: 3000                                                              │
│  Routes: /api/v1/*                                                       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Service Registry                                                 │  │
│  │  - Matches request paths to services                             │  │
│  │  - Health checks                                                 │  │
│  │  - Circuit breakers                                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────┬──────────┬──────────┬──────────┬──────────┬──────────┬───────────┘
      │          │          │          │          │          │
      │          │          │          │          │          │
      ▼          ▼          ▼          ▼          ▼          ▼
┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
│ Hotels   │ │ Taxi   │ │Ecommerce│ │Social  │ │ Admin  │ │ Search   │
│ Service  │ │Service │ │ Service │ │Service │ │Service │ │ Service  │
└────┬─────┘ └───┬────┘ └────┬────┘ └────────┘ └────────┘ └──────────┘
     │           │           │
     │           │           │
     │ When they need to charge/check wallet
     │           │           │
     └───────────┴───────────┘
                 │
                 │ HTTP Request to API Gateway
                 │ /api/v1/wallet/* or /api/v1/payments/*
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PAYMENT QUEUE SERVICE                                 │
│  Port: 4005                                                              │
│  Swagger: /api-docs                                                      │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Wallet Endpoints                                                 │  │
│  │  - GET  /api/v1/wallet/balance                                   │  │
│  │  - POST /api/v1/wallet/topup                                     │  │
│  │  - GET  /api/v1/wallet/topup/verify/:reference                  │  │
│  │  - GET  /api/v1/wallet/transactions                              │  │
│  │  - POST /api/v1/payments/deduct (internal)                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Services                                                         │  │
│  │  - Paystack Service (payment provider)                           │  │
│  │  - Wallet Service (balance, transactions)                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────┬────────────────────────────────┘
                     │                    │
                     │                    │
                     ▼                    ▼
         ┌────────────────────┐  ┌────────────────────┐
         │   PAYSTACK API     │  │   SUPABASE DB      │
         │   (Production)     │  │                    │
         │                    │  │  Tables:           │
         │ - Initialize       │  │  - user_wallets    │
         │ - Verify           │  │  - wallet_trans... │
         │ - Webhooks         │  │                    │
         └────────────────────┘  │  Functions:        │
                                 │  - credit_wallet() │
                                 │  - debit_wallet()  │
                                 │  - get_balance()   │
                                 └────────────────────┘
```

## Request Flow Example: Hotel Booking

```
1. User books hotel
   ↓
2. Hotels Service receives request
   ↓
3. Hotels Service → API Gateway
   GET /api/v1/wallet/balance
   ↓
4. API Gateway → Payment Service
   ↓
5. Payment Service → Supabase
   Query user_wallets table
   ↓
6. Return balance: 10,000 NGN
   ↓
7. Hotels Service checks: booking costs 5,000 NGN ✓
   ↓
8. Hotels Service → API Gateway
   POST /api/v1/payments/deduct
   { userId, amount: 5000, reference: booking_id }
   ↓
9. API Gateway → Payment Service
   ↓
10. Payment Service → Supabase
    Call debit_wallet(user_id, 5000)
    ↓
11. Wallet updated: 10,000 - 5,000 = 5,000 NGN
    ↓
12. Return success
    ↓
13. Hotels Service confirms booking
    ↓
14. User receives confirmation
```

## Request Flow Example: Wallet Top-Up

```
1. User wants to add money
   ↓
2. Mobile App → API Gateway
   POST /api/v1/wallet/topup
   { amount: 5000, email: "user@example.com" }
   ↓
3. API Gateway → Payment Service
   ↓
4. Payment Service → Paystack API
   Initialize transaction
   ↓
5. Paystack returns checkout URL
   ↓
6. Payment Service → Supabase
   Create pending transaction record
   ↓
7. Return checkout URL to user
   ↓
8. User redirected to Paystack
   ↓
9. User completes payment on Paystack
   ↓
10. Paystack webhook → Payment Service
    (or user returns and we verify)
    ↓
11. Payment Service → Paystack API
    Verify transaction
    ↓
12. Payment Service → Supabase
    Call credit_wallet(user_id, 5000)
    Update transaction status: completed
    ↓
13. User wallet updated: 5,000 + 5,000 = 10,000 NGN
    ↓
14. User sees new balance
```

## Service Communication Pattern

### ❌ WRONG WAY (Don't do this)

```typescript
// In hotels-service
import { WalletService } from 'payment-queue-service'; // NO!

const wallet = new WalletService();
await wallet.deduct(userId, amount); // NO!
```

### ✅ RIGHT WAY (Do this)

```typescript
// In hotels-service
import axios from 'axios';

const API_GATEWAY = process.env.API_GATEWAY_URL;

const response = await axios.post(
  `${API_GATEWAY}/api/v1/payments/deduct`,
  { userId, amount, reference },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

## Environment Variables Setup

### API Gateway (.env)

```bash
PORT=3000
PAYMENT_SERVICE_URL=http://payment-queue-service:4005
HOTELS_SERVICE_URL=http://hotels-service:3001
TAXI_SERVICE_URL=http://taxi-realtime-service:3002
```

### Payment Service (.env)

```bash
PORT=4005
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Optional - for production
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_PUBLIC_KEY=pk_live_xxx
```

### Hotels/Taxi/Ecommerce Services (.env)

```bash
PORT=3001
API_GATEWAY_URL=http://api-gateway:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

## Key Points

1. **All payment requests go through API Gateway**
   - Services never call payment-service directly
   - API Gateway handles routing, auth, rate limiting

2. **Services communicate via HTTP**
   - No code imports between services
   - Clean separation of concerns
   - Easy to scale independently

3. **Payment Service is stateless**
   - All state stored in Supabase
   - Can scale horizontally
   - No session management needed

4. **Demo mode by default**
   - No Paystack keys = demo mode
   - Safe for testing
   - Add keys when ready for production

5. **Swagger documentation**
   - Visit `/api-docs` on payment service
   - Interactive API testing
   - Complete request/response examples

## Testing the System

### 1. Start all services locally

```bash
# Terminal 1
cd api-gateway && npm run dev

# Terminal 2
cd payment-queue-service && npm run dev

# Terminal 3
cd hotels-service && npm run dev
```

### 2. Test wallet balance

```bash
curl http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test top-up

```bash
curl -X POST http://localhost:3000/api/v1/wallet/topup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "email": "test@example.com"}'
```

### 4. View Swagger docs

```
http://localhost:4005/api-docs
```

## Production Deployment (Railway)

All services auto-discover each other:

- API Gateway knows all service URLs
- Services know API Gateway URL
- Environment variables set automatically
- Health checks monitor service status

## Summary

The payment system is a microservice that:

- Handles all wallet operations
- Integrates with Paystack
- Stores data in Supabase
- Communicates via HTTP/REST
- Has Swagger documentation
- Works in demo mode by default
- Scales independently

Other services just make HTTP calls to it through the API Gateway!
