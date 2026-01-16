# Railway Environment Variables Checklist

**Purpose**: Complete checklist of all environment variables needed for Railway
deployment  
**Date**: January 16, 2026

---

## 📋 Quick Reference

| Category               | Variables Count | Priority |
| ---------------------- | --------------- | -------- |
| Core Configuration     | 8               | CRITICAL |
| Supabase               | 3               | CRITICAL |
| Redis                  | 1               | CRITICAL |
| Payment Providers      | 6               | HIGH     |
| Communication Services | 6               | MEDIUM   |
| Maps & Search          | 3               | MEDIUM   |
| Storage                | 4               | LOW      |
| Monitoring             | 2               | MEDIUM   |

**Total Variables**: 33 (minimum for basic deployment)

---

## 🔴 CRITICAL - Required for All Services

### Core Configuration

```bash
# Environment
NODE_ENV=production                    # ✅ Required
LOG_LEVEL=info                         # ✅ Required

# Security
JWT_SECRET=your-jwt-secret-min-32-chars  # ✅ Required (min 32 characters)
TRUST_PROXY=true                       # ✅ Required for Railway

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000           # ✅ Required (15 minutes)
RATE_LIMIT_MAX_REQUESTS=100           # ✅ Required

# CORS
CORS_ORIGIN=*                         # ✅ Required (or specific domains)

# Application URLs
BASE_URL=https://yourdomain.com       # ⚠️ Optional but recommended
```

### Supabase (All Services)

```bash
SUPABASE_URL=https://your-project.supabase.co           # ✅ Required
SUPABASE_ANON_KEY=your-anon-key                         # ⚠️ Optional (for client-side)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key         # ✅ Required
```

**Where to find**:

1. Go to Supabase Dashboard
2. Select your project
3. Settings → API
4. Copy URL and keys

### Redis (Automatic on Railway)

```bash
REDIS_URL=redis://default:password@host:port  # ✅ Auto-set by Railway Redis plugin
```

**Setup**:

1. Railway Dashboard → Your Project
2. New → Database → Add Redis
3. REDIS_URL automatically available to all services

---

## 🟡 HIGH PRIORITY - Required for Core Features

### Payment Providers (Payment Queue Service)

#### Paystack (Primary for Nigeria)

```bash
PAYSTACK_SECRET_KEY=sk_live_xxxxx     # ✅ Required for payments
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx     # ✅ Required for frontend
PAYSTACK_WEBHOOK_SECRET=xxxxx         # ✅ Required for webhooks
```

**Where to find**:

1. Login to Paystack Dashboard
2. Settings → API Keys & Webhooks
3. Copy Live keys (use Test keys for staging)

**Webhook Setup**:

- URL: `https://payment-queue.railway.app/api/v1/webhooks/paystack`
- Events: `charge.success`, `charge.failed`, `refund.processed`

#### Stripe (International)

```bash
STRIPE_SECRET_KEY=sk_live_xxxxx       # ✅ Required for payments
STRIPE_PUBLIC_KEY=pk_live_xxxxx       # ✅ Required for frontend
STRIPE_WEBHOOK_SECRET=whsec_xxxxx     # ✅ Required for webhooks
```

**Where to find**:

1. Login to Stripe Dashboard
2. Developers → API keys
3. Copy Live keys (use Test keys for staging)

**Webhook Setup**:

- URL: `https://payment-queue.railway.app/api/v1/webhooks/stripe`
- Events: `payment_intent.succeeded`, `payment_intent.failed`, `refund.created`

---

## 🟢 MEDIUM PRIORITY - Required for Specific Features

### Communication Services

#### Email (Notifications Service)

```bash
SMTP_HOST=smtp.gmail.com              # ✅ Required for emails
SMTP_PORT=587                         # ✅ Required
SMTP_USER=your_email@gmail.com        # ✅ Required
SMTP_PASS=your_app_password           # ✅ Required (use App Password for Gmail)
SMTP_FROM=notifications@yourdomain.com # ✅ Required
```

**Gmail Setup**:

1. Enable 2FA on your Google account
2. Generate App Password: Account → Security → App passwords
3. Use App Password as SMTP_PASS

**Alternative Providers**:

- SendGrid: `smtp.sendgrid.net:587`
- Mailgun: `smtp.mailgun.org:587`
- AWS SES: `email-smtp.region.amazonaws.com:587`

#### SMS (Notifications Service)

```bash
TWILIO_ACCOUNT_SID=ACxxxxx            # ✅ Required for SMS
TWILIO_AUTH_TOKEN=xxxxx               # ✅ Required
TWILIO_PHONE_NUMBER=+1234567890       # ✅ Required (your Twilio number)
```

**Where to find**:

1. Login to Twilio Console
2. Account → Account Info
3. Copy Account SID and Auth Token
4. Phone Numbers → Active Numbers

#### Push Notifications (Notifications Service - Optional)

```bash
FIREBASE_PROJECT_ID=your-project      # ⚠️ Optional
FIREBASE_PRIVATE_KEY=xxxxx            # ⚠️ Optional
FIREBASE_CLIENT_EMAIL=xxxxx           # ⚠️ Optional
```

**Setup**:

1. Firebase Console → Project Settings
2. Service Accounts → Generate new private key
3. Download JSON file
4. Extract values from JSON

### Maps & Location (Delivery & Taxi Services)

```bash
GOOGLE_MAPS_API_KEY=AIzaxxxxx         # ✅ Required for delivery/taxi
```

**Where to find**:

1. Google Cloud Console
2. APIs & Services → Credentials
3. Create API Key
4. Enable: Maps JavaScript API, Geocoding API, Distance Matrix API

**API Restrictions** (Recommended):

- Application restrictions: HTTP referrers
- API restrictions: Maps, Geocoding, Distance Matrix

### Search (Search Service - Optional)

```bash
ALGOLIA_APP_ID=xxxxx                  # ⚠️ Optional (for advanced search)
ALGOLIA_API_KEY=xxxxx                 # ⚠️ Optional
ALGOLIA_SEARCH_KEY=xxxxx              # ⚠️ Optional
```

---

## 🔵 LOW PRIORITY - Optional Features

### Storage (Media Service - Optional)

```bash
AWS_ACCESS_KEY_ID=AKIAxxxxx           # ⚠️ Optional (for S3 storage)
AWS_SECRET_ACCESS_KEY=xxxxx           # ⚠️ Optional
AWS_REGION=us-east-1                  # ⚠️ Optional
AWS_S3_BUCKET=your-bucket-name        # ⚠️ Optional
```

**Alternative**: Use Supabase Storage instead of S3

### Monitoring & Analytics

```bash
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx  # ⚠️ Optional but recommended
SENTRY_ENVIRONMENT=production              # ⚠️ Optional
```

**Setup**:

1. Create Sentry account
2. Create new project
3. Copy DSN from Project Settings

---

## 📦 Service-Specific Variables

### API Gateway (Port 3000)

```bash
# Core
PORT=3000
NODE_ENV=production
TRUST_PROXY=true

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# JWT
JWT_SECRET=xxxxx

# Service URLs (update after deploying each service)
SOCIAL_SERVICE_URL=https://social-service.railway.app
ADMIN_SERVICE_URL=https://admin-service.railway.app
PAYMENT_QUEUE_SERVICE_URL=https://payment-queue.railway.app
SEARCH_SERVICE_URL=https://search-service.railway.app
DELIVERY_SERVICE_URL=https://delivery-service.railway.app
TAXI_REALTIME_SERVICE_URL=https://taxi-realtime.railway.app
NOTIFICATIONS_SERVICE_URL=https://notifications-service.railway.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
```

### Social Service (Port 3001)

```bash
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
REDIS_URL=${REDIS_URL}
DB_POOL_SIZE=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### Admin Service (Port 3002)

```bash
PORT=3002
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
REDIS_URL=${REDIS_URL}
DB_POOL_SIZE=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
ADMIN_SESSION_TIMEOUT=3600000
AUDIT_LOG_RETENTION_DAYS=2555
```

### Search Service (Port 3004)

```bash
PORT=3004
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
REDIS_URL=${REDIS_URL}
SEARCH_CACHE_TTL=300
SEARCH_MAX_RESULTS=100
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200
LOG_LEVEL=info
```

### Taxi Realtime Service (Port 3006)

```bash
PORT=3006
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
REDIS_URL=${REDIS_URL}
WS_PING_TIMEOUT=60000
WS_PING_INTERVAL=25000
WS_MAX_CONNECTIONS=10000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500
LOG_LEVEL=info
```

### Payment Queue Service (Port 3003)

```bash
PORT=3003
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
REDIS_URL=${REDIS_URL}

# Paystack
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
PAYSTACK_WEBHOOK_SECRET=xxxxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLIC_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Queue Configuration
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY=5000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# Webhook URLs
WEBHOOK_BASE_URL=https://payment-queue.railway.app
```

### Delivery Service (Port 3005)

```bash
PORT=3005
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
REDIS_URL=${REDIS_URL}
GOOGLE_MAPS_API_KEY=AIzaxxxxx
DEFAULT_DELIVERY_RADIUS_KM=50
MAX_COURIER_ASSIGNMENTS=5
ASSIGNMENT_TIMEOUT_MINUTES=15
WS_PING_TIMEOUT=60000
WS_PING_INTERVAL=25000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### Notifications Service (Port 3007)

```bash
PORT=3007
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
REDIS_URL=${REDIS_URL}

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=notifications@yourdomain.com

# SMS
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Push (Optional)
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=xxxxx
FIREBASE_CLIENT_EMAIL=xxxxx

# Queue Configuration
EMAIL_QUEUE_CONCURRENCY=5
SMS_QUEUE_CONCURRENCY=10
BULK_QUEUE_CONCURRENCY=2

# Application URLs
BASE_URL=https://yourdomain.com
UNSUBSCRIBE_URL=https://yourdomain.com/unsubscribe

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

---

## 🔧 Setting Variables in Railway

### Method 1: Railway Dashboard (Recommended)

1. Go to Railway Dashboard
2. Select your project
3. Click on a service
4. Go to "Variables" tab
5. Click "New Variable"
6. Enter name and value
7. Click "Add"

### Method 2: Railway CLI

```bash
# Set single variable
railway variables set VARIABLE_NAME=value

# Set for specific service
railway variables set --service service-name VARIABLE_NAME=value

# Set multiple variables from .env file
railway variables set $(cat .env | grep -v '^#' | xargs)
```

### Method 3: Bulk Import

1. Create a file with variables (one per line):

```
VARIABLE_NAME=value
ANOTHER_VAR=another_value
```

2. Import using CLI:

```bash
railway variables set $(cat variables.txt | xargs)
```

---

## ✅ Validation Checklist

### Before Deployment

- [ ] All CRITICAL variables set
- [ ] Supabase URL and keys verified
- [ ] Redis provisioned on Railway
- [ ] JWT_SECRET is at least 32 characters
- [ ] Payment provider keys obtained (if using payments)
- [ ] Email SMTP credentials tested
- [ ] SMS Twilio credentials tested (if using SMS)

### After Deployment

- [ ] All services can connect to Supabase
- [ ] All services can connect to Redis
- [ ] Payment webhooks configured in provider dashboards
- [ ] Email sending works
- [ ] SMS sending works (if configured)
- [ ] API Gateway can reach all backend services

---

## 🔐 Security Best Practices

### DO ✅

- Use strong, unique JWT_SECRET (min 32 characters)
- Use environment-specific keys (dev/staging/prod)
- Rotate secrets regularly (every 90 days)
- Use Railway's secret variables for sensitive data
- Enable 2FA on all external service accounts
- Use App Passwords for Gmail SMTP
- Restrict API keys to specific domains/IPs when possible

### DON'T ❌

- Never commit secrets to git
- Never use test keys in production
- Never share secrets in plain text
- Never use the same JWT_SECRET across environments
- Never use personal email passwords for SMTP
- Never expose service role keys to frontend

---

## 📝 Environment Variables Template

Copy this template to create your `.env` file:

```bash
# =============================================================================
# GIGA PLATFORM - RAILWAY ENVIRONMENT VARIABLES
# =============================================================================

# -----------------------------------------------------------------------------
# CRITICAL - Required for all services
# -----------------------------------------------------------------------------
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=your-jwt-secret-min-32-characters-here
TRUST_PROXY=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=*

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (auto-set by Railway)
# REDIS_URL=redis://default:password@host:port

# -----------------------------------------------------------------------------
# HIGH PRIORITY - Payment Providers
# -----------------------------------------------------------------------------
# Paystack (Nigeria)
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
PAYSTACK_WEBHOOK_SECRET=xxxxx

# Stripe (International)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLIC_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# -----------------------------------------------------------------------------
# MEDIUM PRIORITY - Communication Services
# -----------------------------------------------------------------------------
# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=notifications@yourdomain.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Maps
GOOGLE_MAPS_API_KEY=AIzaxxxxx

# -----------------------------------------------------------------------------
# OPTIONAL - Additional Services
# -----------------------------------------------------------------------------
# Push Notifications (Firebase)
# FIREBASE_PROJECT_ID=your-project
# FIREBASE_PRIVATE_KEY=xxxxx
# FIREBASE_CLIENT_EMAIL=xxxxx

# Storage (AWS S3)
# AWS_ACCESS_KEY_ID=AKIAxxxxx
# AWS_SECRET_ACCESS_KEY=xxxxx
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=your-bucket-name

# Search (Algolia)
# ALGOLIA_APP_ID=xxxxx
# ALGOLIA_API_KEY=xxxxx
# ALGOLIA_SEARCH_KEY=xxxxx

# Monitoring (Sentry)
# SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
# SENTRY_ENVIRONMENT=production

# -----------------------------------------------------------------------------
# Application URLs
# -----------------------------------------------------------------------------
BASE_URL=https://yourdomain.com
UNSUBSCRIBE_URL=https://yourdomain.com/unsubscribe

# Service URLs (update after deployment)
SOCIAL_SERVICE_URL=https://social-service.railway.app
ADMIN_SERVICE_URL=https://admin-service.railway.app
PAYMENT_QUEUE_SERVICE_URL=https://payment-queue.railway.app
SEARCH_SERVICE_URL=https://search-service.railway.app
DELIVERY_SERVICE_URL=https://delivery-service.railway.app
TAXI_REALTIME_SERVICE_URL=https://taxi-realtime.railway.app
NOTIFICATIONS_SERVICE_URL=https://notifications-service.railway.app
```

---

## 🆘 Troubleshooting

### "Missing environment variable" error

- Check variable name spelling (case-sensitive)
- Verify variable is set in Railway dashboard
- Restart service after setting variables

### "Cannot connect to database" error

- Verify SUPABASE_URL is correct
- Check SUPABASE_SERVICE_ROLE_KEY is valid
- Test connection from Railway shell:
  `railway run node -e "console.log(process.env.SUPABASE_URL)"`

### "Redis connection failed" error

- Verify Redis plugin is provisioned
- Check REDIS_URL is available: `railway variables | grep REDIS_URL`
- Restart service after provisioning Redis

### "Payment webhook not working" error

- Verify webhook URL is correct in provider dashboard
- Check WEBHOOK_SECRET matches provider settings
- Test webhook with provider's test tools

---

**Ready to configure!** 🔧

Use this checklist to ensure all environment variables are properly set before
deployment.
