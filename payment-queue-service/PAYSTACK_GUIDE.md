# Paystack Payment Integration Guide

## Table of Contents

1. [What is Paystack?](#what-is-paystack)
2. [How Paystack Works](#how-paystack-works)
3. [Payment Flow Explained](#payment-flow-explained)
4. [Demo Mode vs Production](#demo-mode-vs-production)
5. [Integration Examples](#integration-examples)
6. [Use Cases](#use-cases)

---

## What is Paystack?

Paystack is a payment gateway that allows businesses in Africa to accept
payments online. Think of it like Stripe, but optimized for African markets
(Nigeria, Ghana, South Africa, etc.).

### Key Features:

- Accept card payments (Visa, Mastercard, Verve)
- Bank transfers
- Mobile money
- USSD payments
- Recurring payments
- Split payments
- Refunds

### Why Paystack?

- **Local**: Built for African markets with local payment methods
- **Reliable**: 99.9% uptime
- **Secure**: PCI-DSS compliant
- **Easy**: Simple API integration
- **Affordable**: Competitive transaction fees (1.5% + NGN 100 per transaction)

---

## How Paystack Works

### The Three-Step Payment Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Your App  │────────▶│   Paystack   │────────▶│  Customer   │
│  (Backend)  │         │     API      │         │   Browser   │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                        │
      │  1. Initialize         │                        │
      │────────────────────────▶                        │
      │                        │                        │
      │  2. Get Checkout URL   │                        │
      │◀────────────────────────                        │
      │                        │                        │
      │  3. Redirect Customer  │                        │
      │────────────────────────────────────────────────▶│
      │                        │                        │
      │                        │  4. Customer Pays      │
      │                        │◀────────────────────────│
      │                        │                        │
      │  5. Webhook Notification                        │
      │◀────────────────────────                        │
      │                        │                        │
      │  6. Verify Payment     │                        │
      │────────────────────────▶                        │
      │                        │                        │
      │  7. Confirmation       │                        │
      │◀────────────────────────                        │
```

### Step-by-Step Breakdown

#### Step 1: Initialize Transaction

Your backend calls Paystack API to create a payment session:

```typescript
POST https://api.paystack.co/transaction/initialize
Headers: {
  Authorization: "Bearer sk_test_xxxxx",
  Content-Type: "application/json"
}
Body: {
  email: "customer@example.com",
  amount: 500000,  // Amount in kobo (5000 NGN = 500000 kobo)
  currency: "NGN",
  reference: "TXN-123456",
  callback_url: "https://yourapp.com/payment/callback"
}
```

#### Step 2: Get Checkout URL

Paystack responds with a checkout URL:

```json
{
  "status": true,
  "message": "Authorization URL created",
  "data": {
    "authorization_url": "https://checkout.paystack.com/abc123xyz",
    "access_code": "abc123xyz",
    "reference": "TXN-123456"
  }
}
```

#### Step 3: Redirect Customer

Send the customer to the `authorization_url` where they'll enter their card
details and complete payment.

#### Step 4: Customer Pays

Customer completes payment on Paystack's secure checkout page.

#### Step 5: Webhook Notification (Optional but Recommended)

Paystack sends a webhook to your server immediately after payment:

```json
POST https://yourapp.com/webhooks/paystack
Headers: {
  x-paystack-signature: "hash_signature"
}
Body: {
  event: "charge.success",
  data: {
    reference: "TXN-123456",
    amount: 500000,
    status: "success",
    customer: { email: "customer@example.com" }
  }
}
```

#### Step 6: Verify Payment

Always verify the payment on your backend (don't trust the frontend):

```typescript
GET https://api.paystack.co/transaction/verify/TXN-123456
Headers: {
  Authorization: "Bearer sk_test_xxxxx"
}
```

#### Step 7: Confirmation

Paystack confirms the payment status:

```json
{
  "status": true,
  "message": "Verification successful",
  "data": {
    "status": "success",
    "reference": "TXN-123456",
    "amount": 500000,
    "currency": "NGN",
    "paid_at": "2024-03-04T10:30:00.000Z"
  }
}
```

---

## Payment Flow Explained

### For Ecommerce (Online Store)

```
Customer adds items to cart
       ↓
Customer clicks "Checkout"
       ↓
Your app calls: POST /api/v1/payments/request
       ↓
Payment service initializes Paystack transaction
       ↓
Customer redirected to Paystack checkout
       ↓
Customer enters card details and pays
       ↓
Paystack sends webhook to your server
       ↓
Your app verifies payment
       ↓
Order is confirmed and fulfilled
```

**Example Code:**

```typescript
// 1. Customer clicks checkout
const response = await fetch('/api/v1/payments/request', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    module: 'ecommerce',
    amount: 15000, // NGN 15,000
    currency: 'NGN',
    userId: user.id,
    metadata: {
      orderId: 'ORD-12345',
      customerEmail: 'customer@example.com',
      items: [
        { name: 'Product A', quantity: 2, price: 5000 },
        { name: 'Product B', quantity: 1, price: 5000 },
      ],
    },
  }),
});

const { authorization_url, reference } = await response.json();

// 2. Redirect customer to Paystack
window.location.href = authorization_url;

// 3. After payment, customer returns to callback URL
// Your backend verifies the payment
const verification = await fetch(`/api/v1/payments/${reference}/status`);
const { status } = await verification.json();

if (status === 'success') {
  // Show order confirmation
  // Send order to fulfillment
}
```

### For Hotel Booking

```
Customer selects room and dates
       ↓
Customer clicks "Book Now"
       ↓
Your app creates booking (status: pending)
       ↓
Payment initialized via Paystack
       ↓
Customer pays
       ↓
Webhook received → Payment verified
       ↓
Booking confirmed (status: confirmed)
       ↓
Confirmation email sent
```

### For Taxi Ride

```
Ride completed
       ↓
Driver ends trip
       ↓
Fare calculated (e.g., NGN 2,500)
       ↓
Payment initialized
       ↓
Customer pays via Paystack
       ↓
Payment verified
       ↓
Commission deducted (15% = NGN 375)
       ↓
Driver receives net amount (NGN 2,125)
```

### For Wallet Top-Up

```
User clicks "Add Money to Wallet"
       ↓
User enters amount (e.g., NGN 10,000)
       ↓
POST /api/v1/wallet/topup
       ↓
Paystack checkout URL returned
       ↓
User pays on Paystack
       ↓
Payment verified
       ↓
Wallet balance updated (+NGN 10,000)
       ↓
User can now use wallet for payments
```

---

## Demo Mode vs Production

### Demo Mode (No API Keys)

When `PAYSTACK_SECRET_KEY` is not configured, the service runs in **demo mode**:

✅ **What Works:**

- All API endpoints work normally
- Payment flow is simulated
- Returns fake checkout URLs
- Verification always succeeds
- No real money is charged
- Perfect for development and testing

❌ **What Doesn't Work:**

- No real Paystack API calls
- No actual payment processing
- Webhooks won't be received from Paystack

**Example Demo Response:**

```json
{
  "success": true,
  "data": {
    "authorization_url": "https://demo-checkout.paystack.com/TXN-123456",
    "reference": "TXN-123456",
    "isDemoMode": true
  },
  "message": "DEMO MODE: Payment initialized (no real charge will occur)"
}
```

### Production Mode (With API Keys)

When `PAYSTACK_SECRET_KEY` is configured:

✅ **What Works:**

- Real Paystack API integration
- Actual payment processing
- Real money transactions
- Webhook notifications
- Full payment verification

**Setup:**

1. Sign up at https://paystack.com
2. Get your API keys from dashboard
3. Add to `.env`:
   ```bash
   PAYSTACK_SECRET_KEY=sk_live_xxxxx
   PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
   ```
4. Restart service

---

## Integration Examples

### Example 1: Ecommerce Checkout

```typescript
// Frontend: Checkout button click
async function handleCheckout(cart) {
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const response = await fetch('/api/v1/payments/request', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      module: 'ecommerce',
      amount: totalAmount,
      currency: 'NGN',
      userId: currentUser.id,
      metadata: {
        orderId: generateOrderId(),
        customerEmail: currentUser.email,
        cart: cart,
      },
    }),
  });

  const { authorization_url } = await response.json();
  window.location.href = authorization_url;
}

// Backend: Webhook handler
app.post('/api/v1/webhooks/paystack', async (req, res) => {
  // Verify webhook signature
  const signature = req.headers['x-paystack-signature'];
  const isValid = paystackService.verifyWebhookSignature(
    signature,
    JSON.stringify(req.body)
  );

  if (!isValid) {
    return res.status(400).send('Invalid signature');
  }

  const { event, data } = req.body;

  if (event === 'charge.success') {
    // Verify payment
    const verification = await paystackService.verifyTransaction(
      data.reference
    );

    if (verification.status === 'success') {
      // Update order status
      await db.orders.update({
        where: { reference: data.reference },
        data: { status: 'paid', paidAt: new Date() },
      });

      // Send confirmation email
      await sendOrderConfirmation(data.metadata.orderId);
    }
  }

  res.status(200).send('OK');
});
```

### Example 2: Wallet Top-Up

```typescript
// Frontend: Top-up wallet
async function topUpWallet(amount) {
  const response = await fetch('/api/v1/wallet/topup', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amount,
      email: currentUser.email,
      callbackUrl: 'https://yourapp.com/wallet/topup/callback',
    }),
  });

  const { authorization_url, reference, isDemoMode } = await response.json();

  if (isDemoMode) {
    alert('Demo mode: No real payment will be made');
  }

  // Redirect to Paystack
  window.location.href = authorization_url;
}

// Callback page after payment
async function handleTopUpCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('reference');

  // Verify the top-up
  const response = await fetch(`/api/v1/wallet/topup/verify/${reference}`);
  const { success, amount, newBalance } = await response.json();

  if (success) {
    alert(
      `Wallet topped up with NGN ${amount}. New balance: NGN ${newBalance}`
    );
    window.location.href = '/wallet';
  }
}
```

### Example 3: Pay with Wallet Balance

```typescript
// Check if user has sufficient balance
async function payWithWallet(orderId, amount) {
  const balanceResponse = await fetch('/api/v1/wallet/balance', {
    headers: { Authorization: `Bearer ${userToken}` },
  });

  const { balance } = await balanceResponse.json();

  if (balance < amount) {
    // Insufficient balance - redirect to top-up
    alert('Insufficient wallet balance. Please top up your wallet.');
    window.location.href = '/wallet/topup';
    return;
  }

  // Deduct from wallet
  const paymentResponse = await fetch('/api/v1/payments/wallet-deduct', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId: orderId,
      amount: amount,
      description: `Payment for order ${orderId}`,
    }),
  });

  const { success, newBalance } = await paymentResponse.json();

  if (success) {
    alert(`Payment successful! New balance: NGN ${newBalance}`);
  }
}
```

---

## Use Cases

### 1. Ecommerce Platform

- Customer buys products
- Payment via Paystack
- Commission deducted (5%)
- Vendor receives net amount
- Platform keeps commission

### 2. Hotel Booking

- Customer books room
- Payment via Paystack
- Commission deducted (10%)
- Hotel receives net amount
- Platform keeps commission

### 3. Taxi Service

- Ride completed
- Fare calculated
- Payment via Paystack
- Commission deducted (15%)
- Driver receives net amount
- Platform keeps commission

### 4. Delivery Service

- Package delivered
- Payment via Paystack
- Commission deducted
- Courier receives net amount
- Platform keeps commission

### 5. Wallet System

- User tops up wallet via Paystack
- Balance stored in database
- User can pay for services using wallet
- Faster checkout (no redirect to Paystack)
- Better user experience

---

## Testing

### Test Cards (Paystack Test Mode)

```
Success:
Card: 4084 0840 8408 4081
CVV: 408
Expiry: Any future date
PIN: 0000

Insufficient Funds:
Card: 5060 6666 6666 6666 6666
CVV: 123
Expiry: Any future date
PIN: 1234

Declined:
Card: 5060 0000 0000 0000 0000
CVV: 123
Expiry: Any future date
```

### Testing Workflow

1. **Start in Demo Mode** (no API keys)
   - Test all endpoints
   - Verify flow works
   - No real charges

2. **Switch to Test Mode** (test API keys)
   - Use Paystack test keys
   - Use test cards
   - Verify webhooks
   - No real charges

3. **Go Live** (live API keys)
   - Use Paystack live keys
   - Real payments
   - Real money

---

## Security Best Practices

1. **Never expose secret keys** in frontend code
2. **Always verify payments** on backend (don't trust frontend)
3. **Validate webhook signatures** to prevent fake webhooks
4. **Use HTTPS** for all API calls
5. **Store sensitive data encrypted** (card details, etc.)
6. **Implement rate limiting** to prevent abuse
7. **Log all transactions** for audit trail

---

## Common Issues & Solutions

### Issue: Payment succeeds but order not updated

**Solution:** Implement webhook handler to catch payment events

### Issue: Duplicate payments

**Solution:** Use unique references and check for existing transactions

### Issue: Webhook not received

**Solution:** Verify webhook URL is publicly accessible and HTTPS

### Issue: Amount mismatch

**Solution:** Remember Paystack uses kobo (multiply by 100)

---

## Support

- **Paystack Docs:** https://paystack.com/docs
- **Paystack Support:** support@paystack.com
- **Test Dashboard:** https://dashboard.paystack.com/test
- **Live Dashboard:** https://dashboard.paystack.com/live

---

**Happy Coding! 🚀**
