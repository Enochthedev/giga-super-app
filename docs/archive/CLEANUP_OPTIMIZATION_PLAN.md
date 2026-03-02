# Cleanup & Optimization Plan

**Date**: January 16, 2026  
**Purpose**: Remove overlapping endpoints and optimize before Railway
deployment  
**Status**: Ready to Execute

---

## 🎯 Optimization Strategy

### Phase 1: Deprecate Overlapping Supabase Functions

### Phase 2: Enhance Railway Services with Missing Features

### Phase 3: Update API Gateway Routing

### Phase 4: Test and Verify

---

## 📋 Phase 1: Deprecate Overlapping Supabase Functions

### 1.1 Search Functions (Immediate)

**Functions to Deprecate**:

- ❌ `Search-hotels` - Replaced by Railway Search Service

**Reason**: Railway Search Service provides:

- Multi-entity search (hotels, products, drivers, posts)
- Advanced filtering and pagination
- Redis caching
- Better performance

**Action**:

```bash
# Disable the function in Supabase
supabase functions delete Search-hotels
```

**Migration Path**:

- Old: `POST /functions/v1/Search-hotels`
- New: `GET /api/v1/search/hotels`

---

### 1.2 Notification Functions (After Railway Deployment)

**Functions to Deprecate** (8 functions):

- ❌ `send-notification` → Use Railway `/api/v1/notifications/send`
- ❌ `queue-notification` → Use Railway `/api/v1/notifications/send`
- ❌ `process-notification-queue` → Handled by Railway workers
- ❌ `update-notification-preferences` → Use Railway
  `/api/v1/preferences/:userId`
- ❌ `get-notification-history` → Use Railway `/api/v1/notifications/history`
- ❌ `batch-queue-notifications` → Use Railway `/api/v1/notifications/bulk`
- ❌ `send-order-confirmation` → Use Railway with templates
- ❌ `send-sms` → Use Railway `/api/v1/notifications/send` with type=sms

**Reason**: Railway Notifications Service provides:

- Template management system
- User preferences management
- Advanced scheduling (delayed, recurring)
- Notification history & analytics
- A/B testing framework
- Rate limiting per user
- Batch processing optimization

**Action** (After Railway deployment + 1 week monitoring):

```bash
# Disable functions after verifying Railway service works
supabase functions delete send-notification
supabase functions delete queue-notification
supabase functions delete process-notification-queue
supabase functions delete update-notification-preferences
supabase functions delete get-notification-history
supabase functions delete batch-queue-notifications
supabase functions delete send-order-confirmation
supabase functions delete send-sms
```

**Migration Path**:

```typescript
// Old Supabase
POST /functions/v1/send-notification
{
  "userId": "uuid",
  "type": "email",
  "recipient": "user@example.com",
  "subject": "Test",
  "body": "Test message"
}

// New Railway
POST /api/v1/notifications/send
{
  "userId": "uuid",
  "type": "email",
  "recipient": "user@example.com",
  "templateId": "booking-confirmation", // Optional
  "variables": { "bookingId": "123" },  // Optional
  "scheduledFor": "2026-01-20T10:00:00Z" // Optional
}
```

---

### 1.3 Mock Payment Functions (Immediate)

**Functions to Deprecate** (2 functions):

- ❌ `Initialize-payment-with-mock` - Testing function, not for production
- ❌ `Mock-payment-webhook` - Testing function, not for production

**Reason**: These are testing functions that should never be in production

**Action**:

```bash
# Delete immediately
supabase functions delete Initialize-payment-with-mock
supabase functions delete Mock-payment-webhook
```

---

### 1.4 Duplicate Admin Functions (Review)

**Functions to Review** (2 functions):

- ⚠️ `admin-dashboard-stats` - General admin stats
- ⚠️ `admin-get-dashboard-stats` - Duplicate of above?

**Action**: Check if these are duplicates

```bash
# If duplicates, keep one and delete the other
# Need to review function code to confirm
```

---

### 1.5 Duplicate Profile Functions (Review)

**Functions to Review** (2 functions):

- ⚠️ `get-user-profile` - Get user profile
- ⚠️ `get-current-profile` - Get current user's profile (duplicate?)

**Action**: Check if these are duplicates

```bash
# If duplicates, keep one and delete the other
# Need to review function code to confirm
```

---

## 📋 Phase 2: Enhance Railway Services

### 2.1 Payment Queue Service - Add Missing Features

**Missing Features** (from Supabase):

1. Wallet Management
   - `Pay-with-wallet`
   - `Topup-wallet`
   - `Get-vendor-balance`

2. Escrow Management
   - `Release-escrow`

3. Payout Management
   - `Create-payout-request`
   - `Admin-process-payout`

**Implementation Plan**:

```typescript
// Add to payment-queue-service/src/routes/wallet.ts
export const walletRouter = express.Router();

// Wallet endpoints
walletRouter.post('/topup', async (req, res) => {
  // Initialize payment for wallet topup
  // Queue payment processing
});

walletRouter.post('/pay', async (req, res) => {
  // Pay using wallet balance
  // Deduct from wallet, create transaction
});

walletRouter.get('/balance', async (req, res) => {
  // Get user/vendor wallet balance
});

// Add to payment-queue-service/src/routes/escrow.ts
export const escrowRouter = express.Router();

escrowRouter.post('/release', async (req, res) => {
  // Release escrow funds
  // Transfer to vendor wallet
});

// Add to payment-queue-service/src/routes/payout.ts
export const payoutRouter = express.Router();

payoutRouter.post('/request', async (req, res) => {
  // Create payout request
  // Queue for admin approval
});

payoutRouter.post('/process', async (req, res) => {
  // Admin: Process payout request
  // Initiate bank transfer via Paystack/Stripe
});
```

**Estimated Time**: 4-6 hours

---

### 2.2 Notifications Service - Already Enhanced ✅

**Status**: ✅ Already has all enhanced features

- Template management
- User preferences
- Scheduling
- Bulk processing
- Analytics

**No action needed**

---

### 2.3 Search Service - Already Enhanced ✅

**Status**: ✅ Already comprehensive

- Multi-entity search
- Advanced filtering
- Caching
- Performance optimization

**No action needed**

---

## 📋 Phase 3: Update API Gateway Routing

### 3.1 Add Supabase Function Proxy

**Purpose**: Route Supabase function calls through API Gateway

```typescript
// api-gateway/src/middleware/supabaseProxy.ts
import { createProxyMiddleware } from 'http-proxy-middleware';

export const supabaseProxy = createProxyMiddleware({
  target: process.env.SUPABASE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/hotels': '/functions/v1',
    '^/api/v1/rides': '/functions/v1',
    '^/api/v1/users': '/functions/v1',
    '^/api/v1/cart': '/functions/v1',
    '^/api/v1/calls': '/functions/v1',
    '^/api/v1/roles': '/functions/v1',
    '^/api/v1/media': '/functions/v1',
    '^/api/v1/support': '/functions/v1',
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward authentication headers
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
  },
});
```

### 3.2 Update Service Registry

```typescript
// api-gateway/src/services/serviceRegistry.ts
const serviceRoutes = {
  // Railway Services
  '/api/v1/social': {
    url: process.env.SOCIAL_SERVICE_URL,
    type: 'railway',
  },
  '/api/v1/admin': {
    url: process.env.ADMIN_SERVICE_URL,
    type: 'railway',
  },
  '/api/v1/search': {
    url: process.env.SEARCH_SERVICE_URL,
    type: 'railway',
  },
  '/api/v1/payments': {
    url: process.env.PAYMENT_QUEUE_SERVICE_URL,
    type: 'railway',
  },
  '/api/v1/notifications': {
    url: process.env.NOTIFICATIONS_SERVICE_URL,
    type: 'railway',
  },
  '/api/v1/delivery': {
    url: process.env.DELIVERY_SERVICE_URL,
    type: 'railway',
  },
  '/api/v1/taxi/ws': {
    url: process.env.TAXI_REALTIME_SERVICE_URL,
    type: 'railway-ws',
  },

  // Supabase Functions (via proxy)
  '/api/v1/hotels': {
    url: process.env.SUPABASE_URL,
    type: 'supabase',
  },
  '/api/v1/rides': {
    url: process.env.SUPABASE_URL,
    type: 'supabase',
  },
  '/api/v1/users': {
    url: process.env.SUPABASE_URL,
    type: 'supabase',
  },
  '/api/v1/cart': {
    url: process.env.SUPABASE_URL,
    type: 'supabase',
  },
  '/api/v1/calls': {
    url: process.env.SUPABASE_URL,
    type: 'supabase',
  },
  '/api/v1/roles': {
    url: process.env.SUPABASE_URL,
    type: 'supabase',
  },
  '/api/v1/media': {
    url: process.env.SUPABASE_URL,
    type: 'supabase',
  },
  '/api/v1/support': {
    url: process.env.SUPABASE_URL,
    type: 'supabase',
  },
};
```

---

## 📋 Phase 4: Test and Verify

### 4.1 Create Migration Test Suite

```typescript
// tests/migration-tests.ts
describe('Endpoint Migration Tests', () => {
  describe('Search Migration', () => {
    it('should use Railway search instead of Supabase', async () => {
      const response = await request(app)
        .get('/api/v1/search/hotels?q=luxury')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Verify response comes from Railway (has Railway-specific fields)
    });
  });

  describe('Notifications Migration', () => {
    it('should use Railway notifications with templates', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: 'test-user',
          type: 'email',
          recipient: 'test@example.com',
          templateId: 'booking-confirmation',
          variables: { bookingId: '123' },
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Payment Migration', () => {
    it('should use Railway payment queue', async () => {
      const response = await request(app)
        .post('/api/v1/payments/initialize')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 10000,
          currency: 'NGN',
          email: 'test@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
```

### 4.2 Create Deprecation Monitoring

```typescript
// api-gateway/src/middleware/deprecationWarning.ts
export const deprecationWarning = (req, res, next) => {
  const deprecatedEndpoints = {
    '/functions/v1/Search-hotels': '/api/v1/search/hotels',
    '/functions/v1/send-notification': '/api/v1/notifications/send',
    '/functions/v1/queue-notification': '/api/v1/notifications/send',
    // ... more mappings
  };

  const newEndpoint = deprecatedEndpoints[req.path];
  if (newEndpoint) {
    res.setHeader('X-Deprecated', 'true');
    res.setHeader('X-New-Endpoint', newEndpoint);
    res.setHeader('X-Deprecation-Date', '2026-02-01');

    // Log deprecation usage
    logger.warn('Deprecated endpoint used', {
      old: req.path,
      new: newEndpoint,
      user: req.user?.id,
    });
  }

  next();
};
```

---

## 📊 Execution Timeline

### Week 1: Immediate Cleanup

- ✅ Day 1: Delete mock payment functions
- ✅ Day 1: Deprecate Search-hotels function
- ✅ Day 1-2: Review and merge duplicate functions
- ✅ Day 2-3: Update API Gateway with Supabase proxy
- ✅ Day 3-5: Deploy Railway services
- ✅ Day 5-7: Monitor and test

### Week 2: Notification Migration

- ⏳ Day 8-10: Monitor Railway notifications service
- ⏳ Day 10-12: Gradually migrate clients
- ⏳ Day 12-14: Deprecate Supabase notification functions

### Week 3: Payment Enhancement

- ⏳ Day 15-17: Add wallet features to Railway
- ⏳ Day 17-19: Add escrow features to Railway
- ⏳ Day 19-21: Add payout features to Railway

### Week 4: Final Migration

- ⏳ Day 22-24: Migrate payment clients to Railway
- ⏳ Day 24-26: Deprecate Supabase payment functions
- ⏳ Day 26-28: Final testing and documentation

---

## ✅ Cleanup Checklist

### Immediate Actions (Before Railway Deployment)

- [ ] Delete `Initialize-payment-with-mock` function
- [ ] Delete `Mock-payment-webhook` function
- [ ] Deprecate `Search-hotels` function
- [ ] Review `admin-dashboard-stats` vs `admin-get-dashboard-stats`
- [ ] Review `get-user-profile` vs `get-current-profile`
- [ ] Update API Gateway with Supabase proxy middleware
- [ ] Create migration test suite
- [ ] Set up deprecation monitoring

### After Railway Deployment (Week 1)

- [ ] Deploy all Railway services
- [ ] Update payment webhook URLs
- [ ] Test all Railway endpoints
- [ ] Monitor error rates
- [ ] Verify Railway services are stable

### After 1 Week Monitoring (Week 2)

- [ ] Deprecate Supabase notification functions
- [ ] Update client applications
- [ ] Monitor for issues
- [ ] Document migration process

### After Payment Enhancement (Week 3-4)

- [ ] Add wallet features to Railway
- [ ] Add escrow features to Railway
- [ ] Add payout features to Railway
- [ ] Migrate payment clients
- [ ] Deprecate Supabase payment functions

---

## 🚨 Rollback Procedures

### If Railway Service Fails

1. Revert API Gateway routing to Supabase
2. Re-enable deprecated Supabase functions
3. Notify clients of rollback
4. Investigate and fix Railway service
5. Retry deployment

### If Client Migration Fails

1. Keep both Supabase and Railway endpoints active
2. Gradually migrate clients in batches
3. Monitor error rates per client
4. Provide migration support

---

## 📈 Success Metrics

### Deployment Success

- [ ] All Railway services deployed and healthy
- [ ] API Gateway routing correctly
- [ ] Error rate < 1%
- [ ] Response time < 200ms
- [ ] No critical bugs reported

### Migration Success

- [ ] 100% of clients migrated to Railway endpoints
- [ ] Supabase functions deprecated successfully
- [ ] No increase in error rates
- [ ] Improved performance metrics
- [ ] Positive user feedback

---

## 🎯 Next Steps

1. **Execute Immediate Cleanup** (Today)
   - Delete mock payment functions
   - Deprecate Search-hotels
   - Review duplicate functions

2. **Prepare API Gateway** (Today)
   - Add Supabase proxy middleware
   - Update service registry
   - Create migration tests

3. **Deploy Railway Services** (Tomorrow)
   - Follow deployment guide
   - Monitor closely
   - Test all endpoints

4. **Monitor and Migrate** (Next 2 weeks)
   - Gradually migrate clients
   - Deprecate Supabase functions
   - Enhance Railway services

---

**Ready to start cleanup!** 🧹

Let's begin with the immediate actions to optimize before Railway deployment.
