# Wallet & Payment Database Setup - Complete ✅

## Summary

The wallet and payment system database has been successfully configured using
Supabase MCP tools. All necessary tables, functions, and indexes are now in
place.

---

## What Was Done

### 1. Database Tables Verified ✅

**Existing tables confirmed:**

- `user_wallets` - Stores user wallet balances
- `wallet_transactions` - Records all wallet transactions

### 2. Helper Functions Created ✅

Created three PostgreSQL functions using `mcp_supabase_apply_migration`:

```sql
-- Credit wallet (add money)
credit_wallet(p_user_id UUID, p_amount NUMERIC) RETURNS NUMERIC

-- Debit wallet (remove money)
debit_wallet(p_user_id UUID, p_amount NUMERIC) RETURNS NUMERIC

-- Get wallet balance
get_wallet_balance(p_user_id UUID) RETURNS NUMERIC
```

**Features:**

- Automatic wallet creation if doesn't exist
- Balance validation for debits
- Atomic operations with proper error handling
- Security definer for proper permissions

### 3. Schema Enhanced ✅

Added missing columns to `wallet_transactions` table:

- `user_id` - Direct reference to user (for faster queries)
- `type` - Transaction type ('credit' or 'debit')
- `currency` - Currency code (default: 'NGN')
- `reference` - Unique transaction reference
- `status` - Transaction status ('pending', 'completed', 'failed')
- `metadata` - Additional transaction data (JSONB)

**Indexes created:**

- `idx_wallet_transactions_user_id` - Fast user lookups
- `idx_wallet_transactions_reference` - Fast reference lookups
- `idx_wallet_transactions_status` - Fast status filtering

### 4. Backward Compatibility ✅

Updated wallet service to work with both:

- Old schema: `wallet_id` (references user_wallets.id)
- New schema: `user_id` (direct reference to auth.users)

---

## Database Schema

### user_wallets

```sql
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id),
  balance NUMERIC DEFAULT 0 CHECK (balance >= 0),
  currency TEXT DEFAULT 'NGN',
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  lock_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### wallet_transactions

```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES user_wallets(id),
  user_id UUID REFERENCES auth.users(id),
  transaction_type TEXT NOT NULL,
  type TEXT CHECK (type IN ('credit', 'debit')),
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NGN',
  reference TEXT,
  reference_type TEXT,
  reference_id UUID,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## How to Use

### 1. Credit Wallet (Add Money)

```sql
SELECT credit_wallet('user-uuid-here', 10000);
-- Returns new balance
```

### 2. Debit Wallet (Remove Money)

```sql
SELECT debit_wallet('user-uuid-here', 5000);
-- Returns new balance or raises exception if insufficient funds
```

### 3. Get Balance

```sql
SELECT get_wallet_balance('user-uuid-here');
-- Returns current balance (0 if wallet doesn't exist)
```

### 4. Query Transactions

```sql
-- Get user's transactions
SELECT * FROM wallet_transactions
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;

-- Get pending transactions
SELECT * FROM wallet_transactions
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Get transactions by reference
SELECT * FROM wallet_transactions
WHERE reference = 'WALLET-TOPUP-123456';
```

---

## API Endpoints

The wallet service provides these endpoints:

```
GET    /api/v1/wallet/balance              - Get user's wallet balance
POST   /api/v1/wallet/topup                - Initialize wallet top-up
GET    /api/v1/wallet/topup/verify/:ref    - Verify and complete top-up
GET    /api/v1/wallet/transactions          - Get transaction history
```

---

## Testing

### Test in Demo Mode (No API Keys)

```bash
# Start service
cd payment-queue-service
npm install
npm run dev

# Test balance endpoint
curl http://localhost:3004/api/v1/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test top-up (demo mode)
curl -X POST http://localhost:3004/api/v1/wallet/topup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "email": "test@example.com"
  }'
```

### Test Database Functions

```sql
-- Test credit
SELECT credit_wallet('00000000-0000-0000-0000-000000000001', 10000);

-- Test balance
SELECT get_wallet_balance('00000000-0000-0000-0000-000000000001');

-- Test debit
SELECT debit_wallet('00000000-0000-0000-0000-000000000001', 5000);

-- View transactions
SELECT * FROM wallet_transactions
WHERE user_id = '00000000-0000-0000-0000-000000000001';
```

---

## Next Steps

1. ✅ Database setup complete
2. ✅ Helper functions created
3. ✅ Schema enhanced
4. ✅ Backward compatibility ensured
5. 📝 Test the service: `npm run dev`
6. 📝 Test API endpoints with Postman/curl
7. 📝 Add Paystack API keys for production
8. 📝 Deploy to Railway

---

## Production Setup

When ready for production:

1. Add Paystack API keys to `.env`:

```bash
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
```

2. Restart the service - it will automatically switch from demo mode to
   production mode

3. Test with real payments

---

## Documentation

- **PAYSTACK_GUIDE.md** - How Paystack works for ecommerce
- **WALLET_QUICKSTART.md** - Quick start with code examples
- **WALLET_PAYMENT_SYSTEM.md** - Complete system overview
- **WALLET_SYSTEM_READY.md** - Summary for Aaron

---

**Status: Ready to Use! 🎉**

The database is fully configured and the wallet service is ready for testing and
deployment.
