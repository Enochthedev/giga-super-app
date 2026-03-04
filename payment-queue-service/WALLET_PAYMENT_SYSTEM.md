# Wallet & Payment System - Complete Overview

## What We Built

A comprehensive wallet and payment system with:

1. **Paystack Integration** - Full payment gateway integration with demo mode
2. **Wallet System** - User wallets for storing and managing funds
3. **Flexible Payment Options** - Pay via Paystack or wallet balance
4. **Demo Mode** - Test without real API keys
5. **Complete Documentation** - Guides for developers and Aaron's team

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT SYSTEM                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   Paystack   │      │    Wallet    │      │  Payment  │ │
│  │   Service    │◀────▶│   Service    │◀────▶│  Processor│ │
│  └──────────────┘      └──────────────┘      └───────────┘ │
│         │                      │                     │       │
│         │                      │                     │       │
│         ▼                      ▼                     ▼       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Database (Supabase)                      │  │
│  │  - user_wallets                                       │  │
│  │  - wallet_transactions                                │  │
│  │  - nipost_financial_ledger                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Paystack Service (`src/services/paystack.service.ts`)

**What it does:**

- Initializes payment transactions
- Verifies payments
- Handles webhooks
- Automatic demo mode when API keys not configured

**Demo Mode:**

- Simulates all Paystack operations
- No real API calls
- No real money charged
- Perfect for development

**Production Mode:**

- Real Paystack API integration
- Actual payment processing
- Webhook verification

### 2. Wallet Service (`src/services/wallet.service.ts`)

**What it does:**

- Manages user wallet balances
- Handles top-ups via Paystack
- Processes wallet payments
- Tracks transaction history

**Key Functions:**

- `getBalance()` - Get user's wallet balance
- `initializeTopUp()` - Start wallet top-up via Paystack
- `verifyTopUp()` - Complete top-up after payment
- `deductFromWallet()` - Pay for services using wallet
- `getTransactions()` - View transaction history

### 3. API Endpoints (`src/routes/v1/wallet.ts`)

```
GET    /api/v1/wallet/balance              - Get wallet balance
POST   /api/v1/wallet/topup                - Initialize top-up
GET    /api/v1/wallet/topup/verify/:ref    - Verify top-up
GET    /api/v1/wallet/transactions          - Get transaction history
```

### 4. Database Schema (`database/migrations/wallet_schema.sql`)

**Tables:**

- `user_wallets` - Stores user wallet balances
- `wallet_transactions` - Records all transactions

**Functions:**

- `credit_wallet(user_id, amount)` - Add money to wallet
- `debit_wallet(user_id, amount)` - Remove money from wallet
- `get_wallet_balance(user_id)` - Get current balance

**Security:**

- Row Level Security (RLS) enabled
- Users can only access their own data
- Service role has full access

---

## How It Works

### Scenario 1: Ecommerce Purchase

```
Customer adds items to cart (Total: NGN 15,000)
       ↓
Customer clicks "Checkout"
       ↓
Customer chooses payment method:
       ├─ Option A: Pay with Paystack
       │    ↓
       │    POST /api/v1/payments/request
       │    ↓
       │    Redirect to Paystack checkout
       │    ↓
       │    Customer pays with card
       │    ↓
       │    Payment verified
       │    ↓
       │    Commission deducted (5% = NGN 750)
       │    ↓
       │    Vendor receives NGN 14,250
       │    ↓
       │    Order confirmed
       │
       └─ Option B: Pay with Wallet
            ↓
            Check wallet balance
            ↓
            If sufficient: Deduct NGN 15,000
            ↓
            Commission deducted (5% = NGN 750)
            ↓
            Vendor receives NGN 14,250
            ↓
            Order confirmed
```

### Scenario 2: Wallet Top-Up

```
User has NGN 5,000 in wallet
       ↓
User wants to add NGN 10,000
       ↓
POST /api/v1/wallet/topup
{
  "amount": 10000,
  "email": "user@example.com"
}
       ↓
Paystack transaction initialized
       ↓
User redirected to Paystack checkout
       ↓
User pays with card
       ↓
Paystack redirects back to app
       ↓
GET /api/v1/wallet/topup/verify/:reference
       ↓
Payment verified with Paystack
       ↓
Wallet credited: NGN 5,000 + NGN 10,000 = NGN 15,000
       ↓
User sees updated balance
```

### Scenario 3: Hotel Booking

```
Customer books room (NGN 50,000)
       ↓
Customer chooses payment:
       ├─ Paystack: Redirect to checkout
       └─ Wallet: Check balance → Deduct
       ↓
Payment successful
       ↓
Commission deducted (10% = NGN 5,000)
       ↓
Hotel receives NGN 45,000
       ↓
Booking confirmed
       ↓
Confirmation email sent
```

---

## For Aaron: Understanding Paystack in Ecommerce

### What is Paystack?

Paystack is like a middleman between your app and banks. It handles:

- Card payments
- Bank transfers
- Mobile money
- Security and fraud prevention

### Why Use Paystack?

1. **Security**: You don't handle card details (PCI compliance)
2. **Reliability**: 99.9% uptime
3. **Local**: Supports Nigerian banks and cards
4. **Easy**: Simple API integration
5. **Trust**: Customers trust the Paystack checkout page

### How Does It Work in Ecommerce?

**Traditional Flow (Without Paystack):**

```
Customer → Your App → Bank
❌ You handle card details (security risk)
❌ You need PCI compliance (expensive)
❌ You handle fraud detection (complex)
```

**With Paystack:**

```
Customer → Your App → Paystack → Bank
✅ Paystack handles card details (secure)
✅ Paystack is PCI compliant (free for you)
✅ Paystack detects fraud (automatic)
```

### Real-World Example

**Scenario:** Customer buys a phone for NGN 50,000

1. **Customer clicks "Buy Now"**
   - Your app creates an order (status: pending)

2. **Your app calls Paystack**

   ```javascript
   POST https://api.paystack.co/transaction/initialize
   {
     email: "customer@example.com",
     amount: 5000000,  // 50,000 NGN in kobo
     reference: "ORDER-12345"
   }
   ```

3. **Paystack responds**

   ```javascript
   {
     authorization_url: 'https://checkout.paystack.com/abc123';
   }
   ```

4. **Customer redirected to Paystack**
   - Secure checkout page
   - Customer enters card details
   - Paystack processes payment

5. **Payment successful**
   - Paystack notifies your app (webhook)
   - Your app verifies payment
   - Order status: confirmed
   - Customer receives confirmation email

6. **Money flow**
   ```
   Customer pays: NGN 50,000
   Paystack fee: NGN 850 (1.5% + NGN 100)
   Your commission: NGN 2,500 (5%)
   Vendor receives: NGN 46,650
   ```

### Demo Mode vs Production

**Demo Mode (Development):**

- No real Paystack API calls
- No real money
- Instant "success" responses
- Perfect for testing

**Production Mode (Live):**

- Real Paystack API
- Real money transactions
- Real card processing
- Actual customer payments

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd payment-queue-service
npm install
```

### 2. Run Database Migration

```bash
# Connect to Supabase
psql -h your-supabase-host -U postgres -d postgres -f database/migrations/wallet_schema.sql
```

### 3. Configure Environment

**For Demo Mode (Development):**

```bash
# .env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
REDIS_URL=redis://localhost:6379

# Leave Paystack keys empty for demo mode
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
```

**For Production:**

```bash
# .env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
REDIS_URL=redis://localhost:6379

# Add Paystack keys
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
```

### 4. Start Service

```bash
npm run dev
```

---

## Testing

### Test in Demo Mode

```bash
# 1. Get wallet balance
curl http://localhost:3004/api/v1/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Initialize top-up (demo mode)
curl -X POST http://localhost:3004/api/v1/wallet/topup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "email": "test@example.com"
  }'

# 3. Verify top-up (always succeeds in demo)
curl http://localhost:3004/api/v1/wallet/topup/verify/WALLET-TOPUP-123456
```

### Test with Paystack Test Keys

```bash
# 1. Set test keys in .env
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx

# 2. Use Paystack test cards
Card: 4084 0840 8408 4081
CVV: 408
Expiry: Any future date
PIN: 0000
```

---

## Documentation Files

1. **PAYSTACK_GUIDE.md** - Complete Paystack integration guide
   - What is Paystack
   - How it works
   - Payment flows
   - Integration examples

2. **WALLET_QUICKSTART.md** - Quick start for wallet system
   - Setup instructions
   - API endpoints
   - Frontend examples
   - Testing guide

3. **WALLET_PAYMENT_SYSTEM.md** (this file) - Complete overview
   - System architecture
   - How everything works together
   - For Aaron's understanding

---

## Key Benefits

### For Developers

- ✅ Easy integration
- ✅ Demo mode for testing
- ✅ Comprehensive documentation
- ✅ Type-safe TypeScript code
- ✅ Error handling built-in

### For Users

- ✅ Multiple payment options
- ✅ Wallet for faster checkout
- ✅ Secure payments via Paystack
- ✅ Transaction history
- ✅ Balance tracking

### For Business

- ✅ Automatic commission calculation
- ✅ Financial tracking
- ✅ Audit trail
- ✅ Flexible payment providers
- ✅ Scalable architecture

---

## Next Steps

1. ✅ Review documentation
2. ✅ Run database migration
3. ✅ Test in demo mode
4. ✅ Integrate with frontend
5. ✅ Test with Paystack test keys
6. ✅ Deploy to production
7. ✅ Configure live Paystack keys

---

## Support & Resources

- **Paystack Docs:** https://paystack.com/docs
- **Paystack Dashboard:** https://dashboard.paystack.com
- **Test Cards:** See PAYSTACK_GUIDE.md
- **API Reference:** See README.md

---

**System is ready to use! 🚀**
