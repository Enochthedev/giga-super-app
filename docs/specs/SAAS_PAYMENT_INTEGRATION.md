# SaaS Builder + Payment Service Integration

## 🎯 Overview

This document shows how to integrate the **Payment Queue Service** with your
**SaaS Builder patterns** to create a complete multi-tenant SaaS platform with
billing.

## 🏗️ Architecture Integration

### Current State

- **Social Service**: Multi-tenant with feature gating and usage tracking
- **Payment Service**: Enterprise-grade payment processing with BullMQ
- **Integration Needed**: Connect usage events to billing

### Target Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Social Service │    │  Payment Service │    │   Billing Logic │
│                 │    │                  │    │                 │
│ • Multi-tenant  │───▶│ • BullMQ Queues  │───▶│ • Usage-based   │
│ • Feature gates │    │ • Paystack/Stripe│    │ • Subscriptions │
│ • Usage tracking│    │ • Commission calc│    │ • Plan upgrades │
│ • Quota enforce │    │ • Admin reports  │    │ • Tenant billing│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔌 Integration Points

### 1. Usage Event Publishing

**Current**: Social service logs usage events to console **Enhanced**: Publish
to Payment Service queues

```typescript
// In social-service/src/utils/tenant-database.ts
private async trackUsage(eventType: string, metadata: Record<string, any>) {
  try {
    // Publish to Payment Service notification queue
    await fetch(`${process.env.PAYMENT_SERVICE_URL}/api/v1/usage/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceToken}`,
      },
      body: JSON.stringify({
        tenant_id: this.tenantId,
        event_type: eventType,
        timestamp: new Date().toISOString(),
        metadata,
      }),
    });
  } catch (error) {
    console.error('Failed to track usage:', error);
  }
}
```

### 2. Subscription Status Checking

**Current**: Static plan checking from headers **Enhanced**: Real-time
subscription status from Payment Service

```typescript
// In social-service/src/middleware/tenant-auth.ts
export const tenantAuthMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    // Get real-time subscription status from Payment Service
    const subscriptionResponse = await fetch(
      `${process.env.PAYMENT_SERVICE_URL}/api/v1/subscriptions/${tenantId}/status`,
      {
        headers: { Authorization: `Bearer ${serviceToken}` },
      }
    );

    const subscription = await subscriptionResponse.json();

    req.tenant = {
      id: tenantId,
      name: subscription.data.tenant_name,
      plan: subscription.data.plan, // 'trial', 'basic', 'premium', 'enterprise'
      status: subscription.data.status, // 'active', 'past_due', 'canceled'
      features: getTenantFeatures(subscription.data.plan),
      quotas: getTenantQuotas(subscription.data.plan),
      billing: {
        current_period_start: subscription.data.current_period_start,
        current_period_end: subscription.data.current_period_end,
        usage_this_period: subscription.data.usage_this_period,
      },
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TENANT_AUTH_ERROR',
        message: 'Failed to authenticate tenant context',
      },
    });
  }
};
```

### 3. Quota Enforcement with Real Usage

**Current**: Simulated quota checking **Enhanced**: Real usage data from Payment
Service

```typescript
// In social-service/src/middleware/tenant-auth.ts
export const checkQuota = (quotaType: 'posts_per_month' | 'storage_mb') => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const quota = req.tenant.quotas[quotaType];

      // Unlimited quota (enterprise plan)
      if (quota === -1) {
        return next();
      }

      // Get real usage from Payment Service
      const usageResponse = await fetch(
        `${process.env.PAYMENT_SERVICE_URL}/api/v1/usage/${req.tenant.id}/current`,
        {
          headers: { Authorization: `Bearer ${serviceToken}` },
        }
      );

      const usage = await usageResponse.json();
      const currentUsage = usage.data[quotaType] || 0;

      if (currentUsage >= quota) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: `You have exceeded your ${quotaType} quota`,
            details: {
              quota,
              current_usage: currentUsage,
              upgrade_url: `/billing/upgrade?tenant=${req.tenant.id}`,
              billing_portal_url: `/billing/portal?tenant=${req.tenant.id}`,
            },
          },
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUOTA_CHECK_ERROR',
          message: 'Failed to check quota',
        },
      });
    }
  };
};
```

## 💳 Payment Service Enhancements

### 1. Subscription Management Endpoints

Add these endpoints to the Payment Service:

```typescript
// In payment-queue-service/src/routes/v1/subscriptions.ts
import { Router } from 'express';

const router = Router();

// Get subscription status for a tenant
router.get('/:tenantId/status', async (req, res) => {
  const { tenantId } = req.params;

  // Query subscription from database
  const subscription = await getSubscriptionByTenant(tenantId);

  res.json({
    success: true,
    data: {
      tenant_id: tenantId,
      plan: subscription.plan,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      features: getPlanFeatures(subscription.plan),
      quotas: getPlanQuotas(subscription.plan),
    },
  });
});

// Create subscription for new tenant
router.post('/', async (req, res) => {
  const { tenant_id, plan, payment_method } = req.body;

  // Create subscription in Stripe/Paystack
  const subscription = await createSubscription({
    tenant_id,
    plan,
    payment_method,
  });

  res.status(201).json({
    success: true,
    data: subscription,
  });
});

// Upgrade/downgrade subscription
router.put('/:tenantId/plan', async (req, res) => {
  const { tenantId } = req.params;
  const { new_plan } = req.body;

  // Update subscription with proration
  const updatedSubscription = await updateSubscriptionPlan(tenantId, new_plan);

  res.json({
    success: true,
    data: updatedSubscription,
  });
});

export default router;
```

### 2. Usage Tracking Endpoints

```typescript
// In payment-queue-service/src/routes/v1/usage.ts
import { Router } from 'express';
import { usageQueue } from '../../queues/usage.queue';

const router = Router();

// Track usage event from services
router.post('/track', async (req, res) => {
  const { tenant_id, event_type, metadata } = req.body;

  // Add to usage tracking queue
  await usageQueue.add('track-usage', {
    tenant_id,
    event_type,
    timestamp: new Date(),
    metadata,
  });

  res.json({
    success: true,
    message: 'Usage event queued for processing',
  });
});

// Get current usage for a tenant
router.get('/:tenantId/current', async (req, res) => {
  const { tenantId } = req.params;

  const usage = await getCurrentUsage(tenantId);

  res.json({
    success: true,
    data: usage,
  });
});

// Get usage history for billing
router.get('/:tenantId/history', async (req, res) => {
  const { tenantId } = req.params;
  const { start_date, end_date } = req.query;

  const usage = await getUsageHistory(tenantId, start_date, end_date);

  res.json({
    success: true,
    data: usage,
  });
});

export default router;
```

### 3. Usage Queue Worker

```typescript
// In payment-queue-service/src/queues/workers/usage.worker.ts
import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis';

export const usageWorker = new Worker(
  'usage-queue',
  async job => {
    const { tenant_id, event_type, timestamp, metadata } = job.data;

    try {
      // Store usage event in database
      await storeUsageEvent({
        tenant_id,
        event_type,
        timestamp,
        metadata,
      });

      // Update aggregated usage counters
      await updateUsageCounters(tenant_id, event_type);

      // Check if tenant is approaching quota limits
      await checkQuotaWarnings(tenant_id);

      // For billable events, calculate charges
      if (isBillableEvent(event_type)) {
        await calculateUsageCharges(tenant_id, event_type, metadata);
      }

      console.log(`Usage tracked: ${event_type} for tenant ${tenant_id}`);
    } catch (error) {
      console.error('Usage tracking failed:', error);
      throw error; // Will trigger retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

// Helper functions
async function storeUsageEvent(event: any) {
  // Store in usage_events table
}

async function updateUsageCounters(tenantId: string, eventType: string) {
  // Update aggregated counters for quick quota checking
}

async function checkQuotaWarnings(tenantId: string) {
  // Send warnings when approaching limits (80%, 90%, 95%)
}

async function calculateUsageCharges(
  tenantId: string,
  eventType: string,
  metadata: any
) {
  // Calculate charges for usage-based billing
}

function isBillableEvent(eventType: string): boolean {
  return ['post_created', 'media_uploaded', 'api_call'].includes(eventType);
}
```

## 📊 Database Schema Updates

### 1. Social Service Schema (Add Tenant Support)

```sql
-- Add tenant_id to existing tables
ALTER TABLE social_posts ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE post_comments ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE post_likes ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Create indexes for tenant queries
CREATE INDEX idx_social_posts_tenant ON social_posts(tenant_id, created_at);
CREATE INDEX idx_post_comments_tenant ON post_comments(tenant_id, post_id);
CREATE INDEX idx_post_likes_tenant ON post_likes(tenant_id, post_id, user_id);

-- Add RLS policies
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policies
CREATE POLICY "Tenant isolation for posts" ON social_posts
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "Tenant isolation for comments" ON post_comments
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "Tenant isolation for likes" ON post_likes
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### 2. Payment Service Schema (Add Subscription Support)

```sql
-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  tenant_name TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('trial', 'basic', 'premium', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'expired')),
  stripe_subscription_id TEXT,
  paystack_subscription_id TEXT,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage events table
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage counters (for quick quota checking)
CREATE TABLE usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  posts_created INTEGER DEFAULT 0,
  comments_created INTEGER DEFAULT 0,
  likes_given INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, period_start)
);

-- Plan features table
CREATE TABLE plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  quota_value INTEGER, -- NULL means unlimited
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan, feature_name)
);

-- Insert default plan features
INSERT INTO plan_features (plan, feature_name, is_enabled, quota_value) VALUES
('trial', 'basic_posts', true, 10),
('trial', 'comments', true, 50),
('trial', 'storage_mb', true, 100),

('basic', 'basic_posts', true, 100),
('basic', 'comments', true, 500),
('basic', 'likes', true, 1000),
('basic', 'storage_mb', true, 1000),

('premium', 'basic_posts', true, 1000),
('premium', 'comments', true, 5000),
('premium', 'likes', true, 10000),
('premium', 'media_posts', true, 500),
('premium', 'analytics', true, NULL),
('premium', 'storage_mb', true, 10000),

('enterprise', 'basic_posts', true, NULL),
('enterprise', 'comments', true, NULL),
('enterprise', 'likes', true, NULL),
('enterprise', 'media_posts', true, NULL),
('enterprise', 'analytics', true, NULL),
('enterprise', 'custom_branding', true, NULL),
('enterprise', 'api_access', true, NULL),
('enterprise', 'storage_mb', true, NULL);
```

## 🚀 Implementation Steps

### Phase 1: Basic Integration (1-2 days)

1. **Add subscription endpoints** to Payment Service
2. **Update tenant middleware** in Social Service to check real subscriptions
3. **Set up usage event publishing** from Social Service to Payment Service
4. **Test basic flow**: Create tenant → Subscribe → Use features

### Phase 2: Advanced Features (3-5 days)

1. **Implement usage tracking queue** in Payment Service
2. **Add real quota enforcement** with database usage counters
3. **Create billing portal** for plan upgrades
4. **Add webhook handlers** for subscription changes
5. **Implement usage-based billing** calculations

### Phase 3: Production Ready (1-2 weeks)

1. **Add comprehensive testing** for all integration points
2. **Implement monitoring** and alerting for billing events
3. **Add admin dashboard** for tenant management
4. **Set up automated invoicing** and payment collection
5. **Add compliance features** (tax calculation, receipts)

## 🎯 Benefits of This Integration

### For Tenants

- **Transparent billing** based on actual usage
- **Flexible plans** that grow with their needs
- **Real-time quota monitoring** with upgrade prompts
- **Self-service billing portal** for plan management

### For Platform

- **Automated revenue collection** with minimal manual work
- **Usage-based pricing** that scales with value delivered
- **Detailed analytics** on feature usage and tenant behavior
- **Compliance-ready** billing with proper audit trails

### For Developers

- **Clean separation** between business logic and billing
- **Reusable patterns** for adding new billable features
- **Comprehensive testing** with mock billing scenarios
- **Easy deployment** with containerized services

## 🔧 Testing the Integration

### 1. Create Test Tenant

```bash
curl -X POST http://localhost:3004/api/v1/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "test-tenant-123",
    "plan": "premium",
    "payment_method": "stripe"
  }'
```

### 2. Test Feature Access

```bash
curl -X POST http://localhost:3001/api/v1/tenant/posts \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: test-tenant-123" \
  -d '{
    "content": "Test post with billing integration",
    "media_urls": ["https://example.com/image.jpg"]
  }'
```

### 3. Check Usage Tracking

```bash
curl http://localhost:3004/api/v1/usage/test-tenant-123/current
```

### 4. Test Quota Enforcement

```bash
# Create posts until quota is reached
for i in {1..15}; do
  curl -X POST http://localhost:3001/api/v1/tenant/posts \
    -H "X-Tenant-ID: test-tenant-123" \
    -d "{\"content\": \"Test post $i\"}"
done
```

## 🎉 Next Steps

1. **Start with Phase 1** - Basic subscription checking
2. **Set up the database schemas** for both services
3. **Test the integration** with the provided examples
4. **Gradually add more features** following the phases above
5. **Deploy to production** with proper monitoring

This integration gives you a **complete SaaS platform** with:

- Multi-tenant social features
- Usage-based billing
- Real-time quota enforcement
- Automated payment processing
- Enterprise-grade reliability

**You're building something amazing! 🚀**
