# SaaS Builder Patterns Demo

This demo shows how to enhance your existing social service with **SaaS Builder
patterns** for building production-ready multi-tenant SaaS applications.

## 🎯 What You'll Learn

- **Multi-tenant data isolation** - Automatic tenant scoping for all database
  operations
- **Feature gating** - Control features based on subscription plans
- **Usage tracking** - Track billable events for usage-based pricing
- **Quota enforcement** - Prevent abuse and encourage plan upgrades

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd social-service
npm install axios  # For the demo script
```

### 2. Start Your Social Service

```bash
npm run dev
```

The service should start on port 3001.

### 3. Run the Demo

```bash
node demo-saas-patterns.js
```

This will demonstrate all the SaaS Builder patterns with different tenant
scenarios.

## 🏗️ Architecture Overview

### Before (Single-Tenant)

```
User Request → API → Database
- No tenant isolation
- All users see all data
- No feature restrictions
- No usage tracking
```

### After (Multi-Tenant SaaS)

```
User Request → Tenant Auth → Feature Gate → Quota Check → Tenant DB → Usage Tracking
- Automatic tenant isolation
- Plan-based feature access
- Usage quota enforcement
- Billing event tracking
```

## 🔧 Key Components

### 1. Tenant Authentication Middleware (`middleware/tenant-auth.ts`)

Extracts tenant context from JWT claims and adds it to every request:

```typescript
// Tenant context automatically added to requests
req.tenant = {
  id: 'tenant_123',
  plan: 'premium',
  features: ['basic_posts', 'media_posts', 'analytics'],
  quotas: { posts_per_month: 1000, storage_mb: 10000 },
};
```

### 2. Tenant Database Utility (`utils/tenant-database.ts`)

Ensures all database operations are automatically scoped to the current tenant:

```typescript
// All queries automatically include tenant_id
const posts = await tenantDb.getPosts(); // Only returns current tenant's posts
const post = await tenantDb.createPost(data); // Automatically adds tenant_id
```

### 3. Feature Gating

Control access to features based on subscription plans:

```typescript
// Only allow media posts for premium+ plans
router.post('/posts',
  requireFeature('media_posts'),  // ✅ Feature gate
  async (req, res) => { ... }
);
```

### 4. Quota Enforcement

Prevent abuse and encourage upgrades:

```typescript
// Check quota before expensive operations
router.post('/posts',
  checkQuota('posts_per_month'),  // ✅ Quota check
  async (req, res) => { ... }
);
```

### 5. Usage Tracking

Track billable events for usage-based pricing:

```typescript
// Automatically track usage events
await tenantDb.createPost(data); // Tracks 'post_created' event
await tenantDb.createComment(data); // Tracks 'comment_created' event
```

## 📊 API Examples

### Multi-Tenant Endpoints

All tenant endpoints require tenant context in headers:

```bash
# Create a post (tenant-scoped)
curl -X POST http://localhost:3001/api/v1/tenant/posts \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant_123" \
  -H "X-Tenant-Plan: premium" \
  -H "X-User-ID: user_456" \
  -d '{"content": "Hello from tenant 123!"}'

# Get posts (only returns tenant's posts)
curl http://localhost:3001/api/v1/tenant/posts \
  -H "X-Tenant-ID: tenant_123" \
  -H "X-Tenant-Plan: premium"

# Get usage analytics (premium feature)
curl http://localhost:3001/api/v1/tenant/usage \
  -H "X-Tenant-ID: tenant_123" \
  -H "X-Tenant-Plan: premium"
```

### Feature Gating Examples

```bash
# Trial tenant tries media post (will fail)
curl -X POST http://localhost:3001/api/v1/tenant/posts \
  -H "X-Tenant-ID: tenant_trial" \
  -H "X-Tenant-Plan: trial" \
  -d '{"content": "Post", "media_urls": ["image.jpg"]}'

# Response: 403 Forbidden
{
  "success": false,
  "error": {
    "code": "FEATURE_NOT_AVAILABLE",
    "message": "Feature 'media_posts' is not available on your current plan",
    "details": {
      "upgrade_url": "/billing/upgrade?feature=media_posts"
    }
  }
}
```

## 🎛️ Subscription Plans

The demo includes different subscription tiers:

| Plan           | Features                      | Quotas                         |
| -------------- | ----------------------------- | ------------------------------ |
| **Trial**      | Basic posts, Comments         | 10 posts/month, 100MB storage  |
| **Basic**      | + Likes                       | 100 posts/month, 1GB storage   |
| **Premium**    | + Media posts, Analytics      | 1000 posts/month, 10GB storage |
| **Enterprise** | + Custom branding, API access | Unlimited                      |

## 🔒 Security Features

### Tenant Isolation

- All database queries automatically scoped by `tenant_id`
- No cross-tenant data access possible
- Tenant validation on every operation

### Feature Security

- Features checked at API boundary
- Clear error messages with upgrade paths
- No client-side feature checks (server-side only)

### Usage Security

- Quota enforcement prevents abuse
- Rate limiting per tenant
- Usage tracking for billing accuracy

## 📈 Usage Tracking Events

The system tracks these billable events:

```json
{
  "event_type": "post_created",
  "tenant_id": "tenant_123",
  "timestamp": "2024-01-10T10:00:00Z",
  "metadata": {
    "post_id": "post_456",
    "user_id": "user_789",
    "has_media": true
  }
}
```

Events tracked:

- `post_created` - New post creation
- `comment_created` - New comment
- `post_liked` - Post likes (for engagement metrics)
- `media_uploaded` - File uploads (for storage billing)

## 🚀 Production Deployment

To deploy this as a real SaaS application:

### 1. Database Schema Updates

Add tenant columns to your existing tables:

```sql
-- Add tenant_id to all user-facing tables
ALTER TABLE social_posts ADD COLUMN tenant_id UUID NOT NULL;
ALTER TABLE post_comments ADD COLUMN tenant_id UUID NOT NULL;
ALTER TABLE post_likes ADD COLUMN tenant_id UUID NOT NULL;

-- Create indexes for tenant queries
CREATE INDEX idx_social_posts_tenant ON social_posts(tenant_id, created_at);
CREATE INDEX idx_post_comments_tenant ON post_comments(tenant_id, post_id);
```

### 2. JWT Authentication

Replace header-based auth with real JWT validation:

```typescript
// Use AWS Cognito, Auth0, or similar
const token = req.headers.authorization?.replace('Bearer ', '');
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.tenant = decoded.tenant;
req.user = decoded.user;
```

### 3. Billing Integration

Set up Stripe for subscription management:

```typescript
// Track usage events to Stripe
await stripe.billing.meterEvents.create({
  event_name: 'post_created',
  payload: {
    tenant_id: req.tenant.id,
    value: '1',
  },
});
```

### 4. AWS Lambda Deployment

Convert to serverless functions using the SaaS Builder power's AWS tools:

```typescript
// Lambda function with tenant context from authorizer
export const handler = async (event, context) => {
  const tenantId = event.requestContext.authorizer.tenantId;
  const userRoles = event.requestContext.authorizer.roles;

  // Your business logic here
};
```

## 🎯 Next Steps

1. **Try the Demo**: Run `node demo-saas-patterns.js` to see all patterns in
   action
2. **Explore the Code**: Check out the middleware and utilities to understand
   the patterns
3. **Adapt to Your Needs**: Use these patterns in your other services
4. **Deploy to Production**: Follow the production deployment guide above

## 🤝 SaaS Builder Power Integration

This demo uses patterns from the SaaS Builder power. To use the full power:

1. **AWS Integration**: Use the AWS knowledge server for deployment guidance
2. **DynamoDB**: Use the DynamoDB server for serverless database operations
3. **Stripe Integration**: Enable Stripe for real payment processing
4. **Serverless Deployment**: Use AWS CDK/SAM for infrastructure as code

The SaaS Builder power provides additional tools for building complete SaaS
applications with proper multi-tenancy, billing, and serverless architecture.

---

**Happy building! 🚀**
