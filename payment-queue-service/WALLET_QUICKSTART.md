# Wallet System - Quick Start Guide

## Overview

The wallet system allows users to:

- Store money in their account
- Top up via Paystack
- Pay for services using wallet balance
- View transaction history

## Setup

### 1. Run Database Migration

```bash
# Connect to your Supabase database
psql -h your-supabase-host -U postgres -d postgres -f database/migrations/wallet_schema.sql
```

This creates:

- `user_wallets` table
- `wallet_transactions` table
- Helper functions (`credit_wallet`, `debit_wallet`, `get_wallet_balance`)

### 2. Configure Environment Variables

```bash
# Optional: Paystack API keys (if not set, runs in demo mode)
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx

# Frontend URL for callbacks
FRONTEND_URL=https://yourapp.com
```

### 3. Start the Service

```bash
cd payment-queue-service
npm install
npm run dev
```

## API Endpoints

### Get Wallet Balance

```bash
GET /api/v1/wallet/balance
Authorization: Bearer <user_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "balance": 15000.0,
    "currency": "NGN",
    "lastUpdated": "2024-03-04T10:30:00.000Z"
  }
}
```

### Initialize Wallet Top-Up

```bash
POST /api/v1/wallet/topup
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "amount": 10000,
  "email": "user@example.com",
  "callbackUrl": "https://yourapp.com/wallet/callback"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "authorization_url": "https://checkout.paystack.com/abc123",
    "reference": "WALLET-TOPUP-1234567890-abc123",
    "isDemoMode": false
  },
  "message": "Payment initialized successfully"
}
```

**Demo Mode Response:**

```json
{
  "success": true,
  "data": {
    "authorization_url": "https://demo-checkout.paystack.com/WALLET-TOPUP-1234567890-abc123",
    "reference": "WALLET-TOPUP-1234567890-abc123",
    "isDemoMode": true
  },
  "message": "DEMO MODE: Payment initialized (no real charge will occur)"
}
```

### Verify Top-Up

```bash
GET /api/v1/wallet/topup/verify/:reference
```

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "amount": 10000,
    "newBalance": 25000
  },
  "message": "Wallet top-up completed successfully"
}
```

### Get Transaction History

```bash
GET /api/v1/wallet/transactions?limit=20&offset=0&type=credit&status=completed
Authorization: Bearer <user_token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "type": "credit",
      "amount": 10000,
      "currency": "NGN",
      "description": "Wallet top-up",
      "reference": "WALLET-TOPUP-1234567890-abc123",
      "status": "completed",
      "metadata": {},
      "createdAt": "2024-03-04T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

## Frontend Integration

### React Example

```typescript
import { useState } from 'react';

function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  // Get wallet balance
  const fetchBalance = async () => {
    const response = await fetch('/api/v1/wallet/balance', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    const data = await response.json();
    setBalance(data.data.balance);
  };

  // Top up wallet
  const topUpWallet = async (amount: number) => {
    setLoading(true);

    const response = await fetch('/api/v1/wallet/topup', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        email: user.email,
        callbackUrl: `${window.location.origin}/wallet/callback`
      })
    });

    const data = await response.json();

    if (data.success) {
      // Redirect to Paystack checkout
      window.location.href = data.data.authorization_url;
    }

    setLoading(false);
  };

  return (
    <div>
      <h1>My Wallet</h1>
      <p>Balance: NGN {balance.toLocaleString()}</p>
      <button onClick={() => topUpWallet(10000)} disabled={loading}>
        Top Up NGN 10,000
      </button>
    </div>
  );
}

// Callback page after payment
function WalletCallback() {
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const verifyPayment = async () => {
      const params = new URLSearchParams(window.location.search);
      const reference = params.get('reference');

      const response = await fetch(`/api/v1/wallet/topup/verify/${reference}`);
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        // Redirect to wallet page after 2 seconds
        setTimeout(() => {
          window.location.href = '/wallet';
        }, 2000);
      } else {
        setStatus('failed');
      }
    };

    verifyPayment();
  }, []);

  return (
    <div>
      {status === 'verifying' && <p>Verifying payment...</p>}
      {status === 'success' && <p>Payment successful! Redirecting...</p>}
      {status === 'failed' && <p>Payment failed. Please try again.</p>}
    </div>
  );
}
```

### Flutter Example

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class WalletService {
  final String baseUrl = 'https://api.yourapp.com';
  final String token;

  WalletService(this.token);

  // Get wallet balance
  Future<double> getBalance() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/wallet/balance'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['data']['balance'].toDouble();
    } else {
      throw Exception('Failed to load balance');
    }
  }

  // Top up wallet
  Future<String> topUpWallet(double amount, String email) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/wallet/topup'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: json.encode({
        'amount': amount,
        'email': email,
        'callbackUrl': 'yourapp://wallet/callback',
      }),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['data']['authorization_url'];
    } else {
      throw Exception('Failed to initialize top-up');
    }
  }

  // Verify top-up
  Future<Map<String, dynamic>> verifyTopUp(String reference) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/wallet/topup/verify/$reference'),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['data'];
    } else {
      throw Exception('Failed to verify payment');
    }
  }
}

// Usage in widget
class WalletScreen extends StatefulWidget {
  @override
  _WalletScreenState createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  double balance = 0.0;
  bool loading = false;

  @override
  void initState() {
    super.initState();
    loadBalance();
  }

  Future<void> loadBalance() async {
    final walletService = WalletService(userToken);
    final newBalance = await walletService.getBalance();
    setState(() {
      balance = newBalance;
    });
  }

  Future<void> topUp(double amount) async {
    setState(() {
      loading = true;
    });

    final walletService = WalletService(userToken);
    final checkoutUrl = await walletService.topUpWallet(amount, userEmail);

    // Open checkout URL in webview or browser
    // After payment, verify using the reference from callback

    setState(() {
      loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('My Wallet')),
      body: Column(
        children: [
          Text('Balance: NGN ${balance.toStringAsFixed(2)}'),
          ElevatedButton(
            onPressed: loading ? null : () => topUp(10000),
            child: Text('Top Up NGN 10,000'),
          ),
        ],
      ),
    );
  }
}
```

## Payment Flow

### Top-Up Flow

```
1. User clicks "Top Up Wallet"
   ↓
2. App calls POST /api/v1/wallet/topup
   ↓
3. Backend initializes Paystack transaction
   ↓
4. User redirected to Paystack checkout
   ↓
5. User enters card details and pays
   ↓
6. Paystack redirects to callback URL
   ↓
7. App calls GET /api/v1/wallet/topup/verify/:reference
   ↓
8. Backend verifies with Paystack
   ↓
9. Wallet balance updated
   ↓
10. User sees updated balance
```

### Pay with Wallet Flow

```
1. User selects "Pay with Wallet"
   ↓
2. App checks balance (GET /api/v1/wallet/balance)
   ↓
3. If sufficient, deduct amount
   ↓
4. Service completes transaction
   ↓
5. Wallet balance updated
   ↓
6. Transaction recorded
```

## Demo Mode

When `PAYSTACK_SECRET_KEY` is not configured, the service runs in demo mode:

- All endpoints work normally
- No real Paystack API calls
- No real money charged
- Perfect for development

**To enable demo mode:**

```bash
# Simply don't set PAYSTACK_SECRET_KEY in .env
# Or set it to empty string
PAYSTACK_SECRET_KEY=
```

**To use production mode:**

```bash
# Set your Paystack API keys
PAYSTACK_SECRET_KEY=sk_test_xxxxx  # or sk_live_xxxxx for production
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx  # or pk_live_xxxxx for production
```

## Testing

### Test in Demo Mode

```bash
# 1. Start service without Paystack keys
npm run dev

# 2. Test top-up
curl -X POST http://localhost:3004/api/v1/wallet/topup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "email": "test@example.com"
  }'

# 3. Verify (will always succeed in demo mode)
curl http://localhost:3004/api/v1/wallet/topup/verify/WALLET-TOPUP-123456
```

### Test with Paystack Test Keys

```bash
# 1. Set test keys in .env
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx

# 2. Restart service
npm run dev

# 3. Test with real Paystack test cards
# Use card: 4084 0840 8408 4081
# CVV: 408
# PIN: 0000
```

## Troubleshooting

### Issue: Balance not updating after payment

**Solution:** Check that you're calling the verify endpoint after payment

### Issue: "Insufficient balance" error

**Solution:** Check wallet balance before attempting payment

### Issue: Demo mode not working

**Solution:** Ensure `PAYSTACK_SECRET_KEY` is not set or is empty

### Issue: Webhook not received

**Solution:** Webhooks only work in production mode with real Paystack keys

## Next Steps

1. ✅ Run database migration
2. ✅ Configure environment variables
3. ✅ Test in demo mode
4. ✅ Integrate frontend
5. ✅ Test with Paystack test keys
6. ✅ Go live with production keys

## Support

For issues or questions:

- Check the [Paystack Guide](./PAYSTACK_GUIDE.md)
- Review the [API Documentation](./README.md)
- Contact support

---

**Happy Coding! 💰**
