# Mobile Payment Guide - Wallet & Direct Paystack

Complete guide for mobile developers (Aaron & Wave) on implementing payments in
the Giga app.

## Two Payment Methods

Users can pay in two ways:

1. **Wallet Payment** - Pay from pre-loaded wallet balance (faster, no redirect)
2. **Direct Paystack Payment** - Pay directly with card/bank (redirects to
   Paystack)

## Method 1: Wallet Payment (Recommended)

### Flow

```
1. User books hotel/orders product/requests ride
2. App checks wallet balance
3. If sufficient → Charge wallet (instant)
4. If insufficient → Prompt to top up wallet
```

### React Native Example

```typescript
import axios from 'axios';

const API_BASE = 'https://api-gateway.railway.app';

// Check wallet balance
async function checkBalance(authToken: string) {
  const response = await axios.get(`${API_BASE}/api/v1/wallet/balance`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  return response.data.data.balance; // Returns number (e.g., 5000)
}

// Book hotel with wallet
async function bookHotelWithWallet(
  hotelId: string,
  amount: number,
  authToken: string
) {
  // 1. Check balance first
  const balance = await checkBalance(authToken);

  if (balance < amount) {
    // Show top-up screen
    return {
      success: false,
      error: 'Insufficient balance',
      shortfall: amount - balance,
      action: 'TOP_UP_REQUIRED',
    };
  }

  // 2. Create booking (this will charge wallet automatically)
  const response = await axios.post(
    `${API_BASE}/api/v1/bookings`,
    {
      hotelId,
      amount,
      paymentMethod: 'wallet',
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  return response.data;
}
```

### Flutter Example

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

const String API_BASE = 'https://api-gateway.railway.app';

// Check wallet balance
Future<double> checkBalance(String authToken) async {
  final response = await http.get(
    Uri.parse('$API_BASE/api/v1/wallet/balance'),
    headers: {'Authorization': 'Bearer $authToken'},
  );

  final data = json.decode(response.body);
  return data['data']['balance'].toDouble();
}

// Book hotel with wallet
Future<Map<String, dynamic>> bookHotelWithWallet(
  String hotelId,
  double amount,
  String authToken,
) async {
  // 1. Check balance
  final balance = await checkBalance(authToken);

  if (balance < amount) {
    return {
      'success': false,
      'error': 'Insufficient balance',
      'shortfall': amount - balance,
      'action': 'TOP_UP_REQUIRED',
    };
  }

  // 2. Create booking
  final response = await http.post(
    Uri.parse('$API_BASE/api/v1/bookings'),
    headers: {
      'Authorization': 'Bearer $authToken',
      'Content-Type': 'application/json',
    },
    body: json.encode({
      'hotelId': hotelId,
      'amount': amount,
      'paymentMethod': 'wallet',
    }),
  );

  return json.decode(response.body);
}
```

## Method 2: Direct Paystack Payment

### Flow

```
1. User chooses to pay with card/bank
2. App calls initialize payment endpoint
3. Backend returns Paystack checkout URL
4. App opens WebView/browser with URL
5. User completes payment on Paystack
6. Paystack redirects back to app
7. App verifies payment
```

### React Native Example

```typescript
import { WebView } from 'react-native-webview';

// Initialize direct payment
async function initializeDirectPayment(
  amount: number,
  email: string,
  bookingId: string,
  authToken: string
) {
  const response = await axios.post(
    `${API_BASE}/api/v1/payments/initialize`,
    {
      amount,
      email,
      reference: bookingId,
      callback_url: 'gigaapp://payment/callback'
    },
    { headers: { 'Authorization': `Bearer ${authToken}` }}
  );

  return {
    checkoutUrl: response.data.data.authorization_url,
    reference: response.data.data.reference
  };
}

// Payment screen component
function PaymentScreen({ amount, email, bookingId, authToken }) {
  const [paymentUrl, setPaymentUrl] = useState(null);

  useEffect(() => {
    initializeDirectPayment(amount, email, bookingId, authToken)
      .then(data => setPaymentUrl(data.checkoutUrl));
  }, []);

  const handleNavigationStateChange = async (navState) => {
    // Check if redirected back to app
    if (navState.url.includes('gigaapp://payment/callback')) {
      const reference = extractReference(navState.url);

      // Verify payment
      const verification = await axios.get(
        `${API_BASE}/api/v1/payments/verify/${reference}`,
        { headers: { 'Authorization': `Bearer ${authToken}` }}
      );

      if (verification.data.success) {
        // Payment successful!
        navigation.navigate('BookingConfirmed');
      } else {
        // Payment failed
        Alert.alert('Payment Failed', verification.data.error);
      }
    }
  };

  return (
    <WebView
      source={{ uri: paymentUrl }}
      onNavigationStateChange={handleNavigationStateChange}
    />
  );
}
```

### Flutter Example

```dart
import 'package:webview_flutter/webview_flutter.dart';

// Initialize direct payment
Future<Map<String, String>> initializeDirectPayment(
  double amount,
  String email,
  String bookingId,
  String authToken,
) async {
  final response = await http.post(
    Uri.parse('$API_BASE/api/v1/payments/initialize'),
    headers: {
      'Authorization': 'Bearer $authToken',
      'Content-Type': 'application/json',
    },
    body: json.encode({
      'amount': amount,
      'email': email,
      'reference': bookingId,
      'callback_url': 'gigaapp://payment/callback',
    }),
  );

  final data = json.decode(response.body);
  return {
    'checkoutUrl': data['data']['authorization_url'],
    'reference': data['data']['reference'],
  };
}

// Payment screen widget
class PaymentScreen extends StatefulWidget {
  final double amount;
  final String email;
  final String bookingId;
  final String authToken;

  @override
  _PaymentScreenState createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  late WebViewController _controller;
  String? _paymentUrl;

  @override
  void initState() {
    super.initState();
    _initializePayment();
  }

  Future<void> _initializePayment() async {
    final data = await initializeDirectPayment(
      widget.amount,
      widget.email,
      widget.bookingId,
      widget.authToken,
    );

    setState(() {
      _paymentUrl = data['checkoutUrl'];
    });
  }

  Future<void> _verifyPayment(String reference) async {
    final response = await http.get(
      Uri.parse('$API_BASE/api/v1/payments/verify/$reference'),
      headers: {'Authorization': 'Bearer ${widget.authToken}'},
    );

    final data = json.decode(response.body);

    if (data['success']) {
      // Payment successful!
      Navigator.pushReplacementNamed(context, '/booking-confirmed');
    } else {
      // Payment failed
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Payment Failed'),
          content: Text(data['error']),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_paymentUrl == null) {
      return Center(child: CircularProgressIndicator());
    }

    return WebView(
      initialUrl: _paymentUrl,
      javascriptMode: JavascriptMode.unrestricted,
      navigationDelegate: (NavigationRequest request) {
        if (request.url.contains('gigaapp://payment/callback')) {
          final reference = extractReference(request.url);
          _verifyPayment(reference);
          return NavigationDecision.prevent;
        }
        return NavigationDecision.navigate;
      },
    );
  }
}
```

## Wallet Top-Up Flow

When user needs to add money to wallet:

### React Native

```typescript
async function topUpWallet(amount: number, email: string, authToken: string) {
  // 1. Initialize top-up
  const response = await axios.post(
    `${API_BASE}/api/v1/wallet/topup`,
    { amount, email },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  const { authorization_url, reference, isDemoMode } = response.data.data;

  if (isDemoMode) {
    Alert.alert(
      'Demo Mode',
      'This is a test transaction - no real money will be charged'
    );
  }

  // 2. Open Paystack checkout in WebView
  // (same as direct payment flow above)

  // 3. After payment, verify
  const verification = await axios.get(
    `${API_BASE}/api/v1/wallet/topup/verify/${reference}`
  );

  if (verification.data.success) {
    const newBalance = verification.data.data.newBalance;
    Alert.alert('Success', `Wallet topped up! New balance: ₦${newBalance}`);
  }
}
```

### Flutter

```dart
Future<void> topUpWallet(
  double amount,
  String email,
  String authToken,
) async {
  // 1. Initialize top-up
  final response = await http.post(
    Uri.parse('$API_BASE/api/v1/wallet/topup'),
    headers: {
      'Authorization': 'Bearer $authToken',
      'Content-Type': 'application/json',
    },
    body: json.encode({'amount': amount, 'email': email}),
  );

  final data = json.decode(response.body);
  final authUrl = data['data']['authorization_url'];
  final reference = data['data']['reference'];
  final isDemoMode = data['data']['isDemoMode'];

  if (isDemoMode) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Demo Mode'),
        content: Text('This is a test - no real money will be charged'),
      ),
    );
  }

  // 2. Open Paystack checkout
  // (same as direct payment flow)

  // 3. Verify after payment
  final verifyResponse = await http.get(
    Uri.parse('$API_BASE}/api/v1/wallet/topup/verify/$reference'),
  );

  final verifyData = json.decode(verifyResponse.body);

  if (verifyData['success']) {
    final newBalance = verifyData['data']['newBalance'];
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Success'),
        content: Text('Wallet topped up! New balance: ₦$newBalance'),
      ),
    );
  }
}
```

## Complete Payment UI Flow

### Recommended UX

```
1. Booking/Order Screen
   ├─ Show total amount
   ├─ Payment method selector:
   │  ├─ [●] Pay from Wallet (₦5,000 available)
   │  └─ [ ] Pay with Card/Bank
   └─ [Continue] button

2. If Wallet selected & insufficient:
   ├─ Show: "Insufficient balance. You need ₦2,000 more"
   ├─ [Top Up Wallet] button
   └─ [Pay with Card Instead] button

3. If Card selected:
   ├─ Open Paystack WebView
   ├─ User completes payment
   └─ Return to app with result

4. Success Screen
   ├─ Show confirmation
   ├─ Show new wallet balance (if wallet used)
   └─ [View Booking/Order] button
```

## Transaction History

Show users their wallet transactions:

```typescript
// React Native
async function getTransactions(authToken: string, limit = 20) {
  const response = await axios.get(
    `${API_BASE}/api/v1/wallet/transactions?limit=${limit}`,
    { headers: { 'Authorization': `Bearer ${authToken}` }}
  );

  return response.data.data; // Array of transactions
}

// Flutter
Future<List<dynamic>> getTransactions(String authToken, {int limit = 20}) async {
  final response = await http.get(
    Uri.parse('$API_BASE/api/v1/wallet/transactions?limit=$limit'),
    headers: {'Authorization': 'Bearer $authToken'},
  );

  final data = json.decode(response.body);
  return data['data'];
}
```

## Error Handling

```typescript
try {
  const result = await bookHotelWithWallet(hotelId, amount, authToken);

  if (!result.success) {
    if (result.action === 'TOP_UP_REQUIRED') {
      // Show top-up screen
      navigation.navigate('TopUpWallet', {
        requiredAmount: result.shortfall,
      });
    } else {
      Alert.alert('Error', result.error);
    }
  }
} catch (error) {
  if (error.response?.status === 401) {
    // Token expired - redirect to login
    navigation.navigate('Login');
  } else if (error.response?.status === 503) {
    // Service unavailable
    Alert.alert('Service Unavailable', 'Please try again in a moment');
  } else {
    // Network error
    Alert.alert('Connection Error', 'Please check your internet connection');
  }
}
```

## Demo Mode vs Production

The system automatically detects demo mode:

- **Demo Mode**: When `PAYSTACK_SECRET_KEY` is not configured
  - No real money charged
  - Returns fake Paystack URLs
  - Perfect for testing
  - `isDemoMode: true` in responses

- **Production Mode**: When Paystack keys are configured
  - Real payments processed
  - Real Paystack checkout
  - `isDemoMode: false` in responses

Your app doesn't need to change - just check the `isDemoMode` flag to show
appropriate messages to users.

## Summary

**For most transactions, use Wallet Payment:**

- Faster (no redirect)
- Better UX
- Instant confirmation
- Users can pre-load funds

**Use Direct Paystack Payment for:**

- First-time users (no wallet balance yet)
- Large one-time purchases
- Users who prefer not to pre-load

**All payment operations are audited automatically:**

- Every wallet top-up, deduction, and balance check is logged
- Audit logs include user ID, action type, old/new values, IP address, user
  agent, and timestamp
- Logs are stored in the `audit_logs` table for compliance and security
- Audit logging happens automatically - no extra work needed from mobile
  developers

## Need Help?

Check these files:

- `WALLET_QUICKSTART.md` - Quick start guide
- `PAYSTACK_GUIDE.md` - How Paystack works
- `HOW_TO_USE_PAYMENTS.md` - Complete system overview

Or visit Swagger docs at `https://payment-service.railway.app/api-docs`
