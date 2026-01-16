# Railway Service Configuration Guide

This document provides the exact configuration settings for each service in
Railway.

## Configuration Summary Table

| Service               | Dockerfile Path                    | Watch Paths                               | Railway Config                       | Port |
| --------------------- | ---------------------------------- | ----------------------------------------- | ------------------------------------ | ---- |
| social-service        | `social-service/Dockerfile`        | `social-service/**`<br>`shared/**`        | `social-service/railway.toml`        | 3001 |
| admin-service         | `admin-service/Dockerfile`         | `admin-service/**`<br>`shared/**`         | `admin-service/railway.toml`         | 3002 |
| payment-queue-service | `payment-queue-service/Dockerfile` | `payment-queue-service/**`<br>`shared/**` | `payment-queue-service/railway.toml` | 3003 |
| search-service        | `search-service/Dockerfile`        | `search-service/**`<br>`shared/**`        | `search-service/railway.toml`        | 3004 |
| delivery-service      | `delivery-service/Dockerfile`      | `delivery-service/**`<br>`shared/**`      | `delivery-service/railway.toml`      | 3005 |
| taxi-realtime-service | `taxi-realtime-service/Dockerfile` | `taxi-realtime-service/**`<br>`shared/**` | `taxi-realtime-service/railway.toml` | 3006 |
| notifications-service | `notifications-service/Dockerfile` | `notifications-service/**`<br>`shared/**` | `notifications-service/railway.toml` | 3007 |

## Detailed Configuration for Each Service

### 1. Social Service (Port 3001)

**Build Settings:**

- **Builder**: Dockerfile
- **Dockerfile Path**: `social-service/Dockerfile`
- **Root Directory**: Leave empty (builds from repo root)
- **Watch Paths**:
  ```
  social-service/**
  shared/**
  ```

**Deploy Settings:**

- **Custom Start Command**: Leave empty (uses Dockerfile CMD)
- **Healthcheck Path**: `/health`
- **Port**: 3001

**Config-as-Code:**

- **Railway Config File**: `social-service/railway.toml`

**Environment Variables:**

```
NODE_ENV=production
PORT=3001
SERVICE_NAME=social-service
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
REDIS_URL=<your-redis-url>
```

---

### 2. Admin Service (Port 3002)

**Build Settings:**

- **Builder**: Dockerfile
- **Dockerfile Path**: `admin-service/Dockerfile`
- **Root Directory**: Leave empty
- **Watch Paths**:
  ```
  admin-service/**
  shared/**
  ```

**Deploy Settings:**

- **Custom Start Command**: Leave empty
- **Healthcheck Path**: `/health`
- **Port**: 3002

**Config-as-Code:**

- **Railway Config File**: `admin-service/railway.toml`

**Environment Variables:**

```
NODE_ENV=production
PORT=3002
SERVICE_NAME=admin-service
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

---

### 3. Payment Queue Service (Port 3003)

**Build Settings:**

- **Builder**: Dockerfile
- **Dockerfile Path**: `payment-queue-service/Dockerfile`
- **Root Directory**: Leave empty
- **Watch Paths**:
  ```
  payment-queue-service/**
  shared/**
  ```

**Deploy Settings:**

- **Custom Start Command**: Leave empty
- **Healthcheck Path**: `/health`
- **Port**: 3003

**Config-as-Code:**

- **Railway Config File**: `payment-queue-service/railway.toml`

**Environment Variables:**

```
NODE_ENV=production
PORT=3003
SERVICE_NAME=payment-queue-service
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
REDIS_URL=<your-redis-url>
PAYSTACK_SECRET_KEY=<your-paystack-key>
STRIPE_SECRET_KEY=<your-stripe-key>
```

---

### 4. Search Service (Port 3004)

**Build Settings:**

- **Builder**: Dockerfile
- **Dockerfile Path**: `search-service/Dockerfile`
- **Root Directory**: Leave empty
- **Watch Paths**:
  ```
  search-service/**
  shared/**
  ```

**Deploy Settings:**

- **Custom Start Command**: Leave empty
- **Healthcheck Path**: `/health`
- **Port**: 3004

**Config-as-Code:**

- **Railway Config File**: `search-service/railway.toml`

**Environment Variables:**

```
NODE_ENV=production
PORT=3004
SERVICE_NAME=search-service
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ALGOLIA_APP_ID=<your-algolia-app-id>
ALGOLIA_API_KEY=<your-algolia-key>
```

---

### 5. Delivery Service (Port 3005)

**Build Settings:**

- **Builder**: Dockerfile
- **Dockerfile Path**: `delivery-service/Dockerfile`
- **Root Directory**: Leave empty
- **Watch Paths**:
  ```
  delivery-service/**
  shared/**
  ```

**Deploy Settings:**

- **Custom Start Command**: Leave empty
- **Healthcheck Path**: `/health`
- **Port**: 3005

**Config-as-Code:**

- **Railway Config File**: `delivery-service/railway.toml`

**Environment Variables:**

```
NODE_ENV=production
PORT=3005
SERVICE_NAME=delivery-service
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
GOOGLE_MAPS_API_KEY=<your-google-maps-key>
```

---

### 6. Taxi Realtime Service (Port 3006)

**Build Settings:**

- **Builder**: Dockerfile
- **Dockerfile Path**: `taxi-realtime-service/Dockerfile`
- **Root Directory**: Leave empty
- **Watch Paths**:
  ```
  taxi-realtime-service/**
  shared/**
  ```

**Deploy Settings:**

- **Custom Start Command**: Leave empty
- **Healthcheck Path**: `/health`
- **Port**: 3006

**Config-as-Code:**

- **Railway Config File**: `taxi-realtime-service/railway.toml`

**Environment Variables:**

```
NODE_ENV=production
PORT=3006
SERVICE_NAME=taxi-realtime-service
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
REDIS_URL=<your-redis-url>
GOOGLE_MAPS_API_KEY=<your-google-maps-key>
```

---

### 7. Notifications Service (Port 3007)

**Build Settings:**

- **Builder**: Dockerfile
- **Dockerfile Path**: `notifications-service/Dockerfile`
- **Root Directory**: Leave empty
- **Watch Paths**:
  ```
  notifications-service/**
  shared/**
  ```

**Deploy Settings:**

- **Custom Start Command**: Leave empty
- **Healthcheck Path**: `/health`
- **Port**: 3007

**Config-as-Code:**

- **Railway Config File**: `notifications-service/railway.toml`

**Environment Variables:**

```
NODE_ENV=production
PORT=3007
SERVICE_NAME=notifications-service
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SENDGRID_API_KEY=<your-sendgrid-key>
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
FIREBASE_SERVER_KEY=<your-firebase-key>
```

---

## Common Settings for All Services

### Resource Limits

- **CPU**: 1-2 vCPU (adjust based on load)
- **Memory**: 512MB - 1GB (adjust based on service needs)

### Networking

- **Public Networking**: Enabled with generated domain
- **Private Networking**: Enabled for inter-service communication

### Regions

- **Primary Region**: Southeast Asia (Singapore) or closest to your users
- **Replicas**: 1 (increase for high availability)

### Restart Policy

- **On Failure**: Restart the container if it exits with a non-zero exit code
- **Max Restart Retries**: 3

### Healthcheck Configuration

- **Interval**: 30s
- **Timeout**: 10s
- **Start Period**: 40s
- **Retries**: 3

---

## Watch Paths Explanation

Watch paths tell Railway which files to monitor for changes. When files matching
these patterns change, Railway triggers a new deployment.

**Format**: Use gitignore-style patterns

- `service-name/**` - Watch all files in the service directory
- `shared/**` - Watch all files in the shared directory
- `!**/node_modules/**` - Exclude node_modules (optional, usually ignored by
  default)

**Important**: Each service should watch:

1. Its own service directory
2. The shared directory (since services depend on shared code)

---

## Railway Config Files (railway.toml)

Each service has a `railway.toml` file that defines its configuration. These
files are already created in each service directory.

Example structure:

```toml
[build]
builder = "dockerfile"
dockerfilePath = "social-service/Dockerfile"

[deploy]
startCommand = ""
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

---

## Step-by-Step Configuration Process

### For Each Service:

1. **Create New Service in Railway**
   - Click "New" → "Empty Service"
   - Name it (e.g., "social-service")

2. **Connect GitHub Repository**
   - Settings → Source → Connect Repository
   - Select your repository
   - Branch: `main`

3. **Configure Build Settings**
   - Settings → Build → Builder: "Dockerfile"
   - Dockerfile Path: (from table above)
   - Root Directory: Leave empty
   - Watch Paths: Add patterns from table above

4. **Configure Deploy Settings**
   - Settings → Deploy → Healthcheck Path: `/health`
   - Leave Start Command empty

5. **Add Railway Config File**
   - Settings → Config-as-Code
   - Add File Path: (from table above)

6. **Set Environment Variables**
   - Settings → Variables
   - Add all variables from the list above
   - Use Railway's shared variables for common values

7. **Configure Networking**
   - Settings → Networking
   - Generate Domain for public access
   - Note the private networking address

8. **Deploy**
   - Click "Deploy" or push to GitHub
   - Monitor build logs
   - Check health endpoint once deployed

---

## Troubleshooting

### Build Fails with "shared not found"

- **Solution**: Ensure Root Directory is empty (builds from repo root)
- **Solution**: Verify Watch Paths include `shared/**`

### TypeScript Compilation Errors

- **Expected**: Services compile with warnings but continue
- **Action**: Fix TypeScript errors in code for production quality

### Container Fails to Start

- **Check**: Environment variables are set correctly
- **Check**: Healthcheck path returns 200 OK
- **Check**: Port matches the service configuration

### Service Not Accessible

- **Check**: Public networking is enabled
- **Check**: Domain is generated
- **Check**: Firewall/security settings

---

## Next Steps

1. Configure all 7 services in Railway using this guide
2. Set up environment variables (use Railway's shared variables feature)
3. Deploy each service
4. Test health endpoints
5. Configure API Gateway to route to these services
6. Set up monitoring and logging

---

## CI/CD Integration

Once services are configured:

- Push to `main` branch triggers automatic deployment
- Railway builds using the Dockerfile
- Health checks verify deployment success
- Old deployment is terminated after new one is healthy

**Recommendation**: Set up GitHub Actions for additional testing before Railway
deployment.
