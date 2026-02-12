# Observability Setup Guide

Complete guide for monitoring, logging, error tracking, and performance analysis
across the GIGA platform microservices.

## Overview

The GIGA platform uses a comprehensive observability stack:

- **Sentry**: Error tracking, performance monitoring, and profiling
- **Prometheus**: Metrics collection and monitoring
- **Structured Logging**: Winston-based JSON logging with trace context
- **Distributed Tracing**: Request tracking across services
- **Health Checks**: Kubernetes/Railway-compatible health endpoints

## Table of Contents

1. [Quick Start](#quick-start)
2. [Sentry Setup](#sentry-setup)
3. [Metrics & Prometheus](#metrics--prometheus)
4. [Logging](#logging)
5. [Distributed Tracing](#distributed-tracing)
6. [Health Checks](#health-checks)
7. [Dashboards](#dashboards)
8. [Alerting](#alerting)

## Quick Start

### 1. Install Dependencies

```bash
# Install shared observability package
cd shared
npm install

# Install in services
cd ../api-gateway
npm install

cd ../admin-service
npm install
```

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Sentry Configuration
SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_ENABLED=true
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

### 3. Verify Setup

```bash
# Start a service
npm run dev

# Check health endpoint
curl http://localhost:3000/health

# Check metrics endpoint
curl http://localhost:3000/metrics
```

## Sentry Setup

### Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project for each service:
   - `giga-api-gateway`
   - `giga-admin-service`
   - `giga-social-service`
   - etc.
3. Copy the DSN for each project

### Configure Sentry

Each service automatically initializes Sentry with:

```typescript
initializeSentry({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  serviceName: 'api-gateway',
  release: 'api-gateway@2.1.1',
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1, // 10% profiling
  enabled: process.env.SENTRY_ENABLED === 'true',
});
```

### Features Enabled

- **Error Tracking**: Automatic capture of unhandled errors
- **Performance Monitoring**: Transaction tracing for slow requests
- **Profiling**: CPU and memory profiling for performance issues
- **Breadcrumbs**: Automatic logging of HTTP requests, database queries
- **User Context**: Automatic user identification from JWT tokens
- **Release Tracking**: Track errors by deployment version

### Manual Error Capture

```typescript
import {
  captureException,
  captureMessage,
  addBreadcrumb,
} from '@giga/shared/observability';

// Capture exception
try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    userId: user.id,
    operation: 'riskyOperation',
  });
}

// Capture message
captureMessage('Important event occurred', 'info', {
  eventType: 'user_signup',
  userId: user.id,
});

// Add breadcrumb
addBreadcrumb({
  category: 'auth',
  message: 'User login attempt',
  level: 'info',
  data: { email: user.email },
});
```

## Metrics & Prometheus

### Available Metrics

#### HTTP Metrics

- `giga_http_request_duration_seconds`: Request duration histogram
- `giga_http_requests_total`: Total request counter
- `giga_http_request_errors_total`: Error counter by type

#### Database Metrics

- `giga_database_query_duration_seconds`: Query duration histogram
- `giga_database_queries_total`: Query counter by operation
- `giga_database_connection_pool`: Connection pool status

#### External Service Metrics

- `giga_external_service_duration_seconds`: External call duration
- `giga_external_service_errors_total`: External service errors

#### Cache Metrics

- `giga_cache_hits_total`: Cache hit counter
- `giga_cache_misses_total`: Cache miss counter

#### Business Metrics

- `giga_business_events_total`: Business event counter
- `giga_active_connections`: Active connection gauge

### Accessing Metrics

```bash
# Get metrics for a service
curl http://localhost:3000/metrics

# Example output:
# giga_http_request_duration_seconds_bucket{method="GET",route="/api/users",status_code="200",service="api-gateway",le="0.005"} 45
# giga_http_requests_total{method="GET",route="/api/users",status_code="200",service="api-gateway"} 150
```

### Custom Metrics

```typescript
import {
  businessEvents,
  trackDatabaseQuery,
  trackExternalService,
} from '@giga/shared/observability';

// Track business event
businessEvents.inc({
  event_type: 'user_signup',
  status: 'success',
  service: 'api-gateway',
});

// Track database query
await trackDatabaseQuery('SELECT', 'users', 'api-gateway', async () => {
  return await supabase.from('users').select('*');
});

// Track external service call
await trackExternalService(
  'stripe',
  'create_payment',
  'payment-service',
  async () => {
    return await stripe.paymentIntents.create({ amount: 1000 });
  }
);
```

### Prometheus Setup

1. **Install Prometheus** (for local development):

```bash
# macOS
brew install prometheus

# Ubuntu
sudo apt-get install prometheus
```

2. **Configure Prometheus** (`prometheus.yml`):

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'giga-api-gateway'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'

  - job_name: 'giga-admin-service'
    static_configs:
      - targets: ['localhost:3005']
    metrics_path: '/metrics'
```

3. **Start Prometheus**:

```bash
prometheus --config.file=prometheus.yml
```

4. **Access Prometheus UI**: http://localhost:9090

## Logging

### Structured Logging

All services use Winston for structured JSON logging:

```typescript
import { createContextLogger } from '@giga/shared/observability';

const logger = createContextLogger('api-gateway', {
  userId: user.id,
  traceId: req.traceContext.traceId,
});

// Log levels
logger.info('User logged in', { email: user.email });
logger.warn('Rate limit approaching', { remaining: 10 });
logger.error('Payment failed', error, { paymentId: payment.id });
logger.debug('Cache hit', { key: 'user:123' });

// Specialized logging
logger.logRequest('GET', '/api/users', 200, 45);
logger.logQuery('SELECT', 'users', 12);
logger.logExternalCall('stripe', 'create_payment', 234, true);
logger.logBusinessEvent('user_signup', { plan: 'premium' });
logger.logSecurityEvent('failed_login', 'high', { ip: req.ip });
```

### Log Format

```json
{
  "level": "info",
  "message": "User logged in",
  "service": "api-gateway",
  "environment": "production",
  "version": "2.1.1",
  "timestamp": "2024-12-19T10:30:00.000Z",
  "traceId": "abc-123-def",
  "spanId": "span-456",
  "userId": "user-789",
  "email": "user@example.com"
}
```

### Log Aggregation

For production, integrate with log aggregation services:

#### Option 1: Datadog

```bash
# Install Datadog agent
DD_API_KEY=your-key DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Configure log collection
# Add to /etc/datadog-agent/conf.d/nodejs.d/conf.yaml
logs:
  - type: file
    path: /var/log/giga/*.log
    service: giga-platform
    source: nodejs
```

#### Option 2: Grafana Loki

```bash
# Install Loki
docker run -d --name=loki -p 3100:3100 grafana/loki

# Install Promtail for log shipping
docker run -d --name=promtail \
  -v /var/log:/var/log \
  -v $(pwd)/promtail-config.yml:/etc/promtail/config.yml \
  grafana/promtail
```

#### Option 3: ELK Stack

```bash
# Use Elasticsearch, Logstash, Kibana
docker-compose up -d elasticsearch logstash kibana
```

## Distributed Tracing

### Trace Context

Every request gets a unique trace ID that follows it across services:

```typescript
import {
  tracingMiddleware,
  createTraceHeaders,
} from '@giga/shared/observability';

// Middleware automatically adds trace context
app.use(tracingMiddleware('api-gateway'));

// Forward trace to downstream services
const headers = createTraceHeaders(req);
await axios.get('http://admin-service/api/users', { headers });
```

### Trace Operations

```typescript
import { traceOperation } from '@giga/shared/observability';

// Trace an async operation
const result = await traceOperation(
  'fetch_user_data',
  req,
  async () => {
    return await supabase.from('users').select('*').eq('id', userId);
  },
  { userId }
);
```

### Trace Headers

- `X-Trace-Id`: Unique ID for the entire request chain
- `X-Span-Id`: Unique ID for this service's processing
- `X-Parent-Span-Id`: ID of the calling service's span

## Health Checks

### Endpoints

Each service exposes three health endpoints:

#### 1. Liveness Probe (`/health/live`)

Checks if the service is running:

```bash
curl http://localhost:3000/health/live

# Response:
{
  "status": "healthy",
  "service": "api-gateway",
  "timestamp": "2024-12-19T10:30:00.000Z"
}
```

#### 2. Readiness Probe (`/health/ready`)

Checks if the service is ready to accept traffic:

```bash
curl http://localhost:3000/health/ready

# Response:
{
  "status": "healthy",
  "timestamp": "2024-12-19T10:30:00.000Z",
  "service": "api-gateway",
  "version": "2.1.1",
  "uptime": 3600,
  "checks": {
    "supabase": {
      "status": "pass",
      "message": "Database connection healthy",
      "responseTime": 12
    },
    "social-service": {
      "status": "pass",
      "message": "social-service is reachable",
      "responseTime": 45
    },
    "memory": {
      "status": "pass",
      "message": "Heap usage: 45.23%",
      "responseTime": 0
    }
  }
}
```

#### 3. Detailed Health (`/health`)

Full health information including all checks:

```bash
curl http://localhost:3000/health
```

### Kubernetes/Railway Configuration

```yaml
# Kubernetes deployment
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: api-gateway
      livenessProbe:
        httpGet:
          path: /health/live
          port: 3000
        initialDelaySeconds: 30
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 3000
        initialDelaySeconds: 5
        periodSeconds: 5
```

## Dashboards

### Grafana Dashboard

1. **Install Grafana**:

```bash
# macOS
brew install grafana

# Ubuntu
sudo apt-get install grafana
```

2. **Add Prometheus Data Source**:

- Go to Configuration → Data Sources
- Add Prometheus: http://localhost:9090

3. **Import Dashboard**:

Use the provided dashboard JSON in `docs/grafana-dashboard.json`

### Key Metrics to Monitor

- **Request Rate**: `rate(giga_http_requests_total[5m])`
- **Error Rate**: `rate(giga_http_request_errors_total[5m])`
- **Response Time (p95)**:
  `histogram_quantile(0.95, giga_http_request_duration_seconds_bucket)`
- **Database Query Time**: `rate(giga_database_query_duration_seconds_sum[5m])`
- **Active Connections**: `giga_active_connections`

## Alerting

### Prometheus Alerting Rules

Create `alerts.yml`:

```yaml
groups:
  - name: giga_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(giga_http_request_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value }} errors/sec'

      # Slow response time
      - alert: SlowResponseTime
        expr:
          histogram_quantile(0.95, giga_http_request_duration_seconds_bucket) >
          1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'Slow response time detected'
          description: 'P95 response time is {{ $value }}s'

      # Service down
      - alert: ServiceDown
        expr: up{job=~"giga-.*"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Service {{ $labels.job }} is down'
```

### Sentry Alerts

Configure in Sentry dashboard:

1. Go to Alerts → Create Alert Rule
2. Set conditions:
   - Error rate > 10 errors/minute
   - Response time > 1 second (p95)
   - New error types
3. Configure notifications (email, Slack, PagerDuty)

## Best Practices

### 1. Error Handling

```typescript
// Always capture errors with context
try {
  await operation();
} catch (error) {
  captureException(error, {
    userId: user.id,
    operation: 'operation_name',
    metadata: { key: 'value' },
  });
  throw error; // Re-throw after capturing
}
```

### 2. Performance Monitoring

```typescript
// Track slow operations
const span = createSpan('slow_operation', req);
try {
  await slowOperation();
} finally {
  span.end();
  if (span.duration() > 1000) {
    logger.warn('Slow operation detected', { duration: span.duration() });
  }
}
```

### 3. Business Metrics

```typescript
// Track important business events
businessEvents.inc({
  event_type: 'payment_completed',
  status: 'success',
  service: 'payment-service',
});
```

### 4. Security Events

```typescript
// Log security-relevant events
logger.logSecurityEvent('failed_login_attempt', 'medium', {
  ip: req.ip,
  email: req.body.email,
  attempts: 3,
});
```

## Troubleshooting

### Sentry Not Capturing Errors

1. Check `SENTRY_ENABLED=true` in `.env`
2. Verify DSN is correct
3. Check network connectivity to sentry.io
4. Look for initialization errors in logs

### Metrics Not Appearing

1. Verify `/metrics` endpoint is accessible
2. Check Prometheus scrape configuration
3. Ensure metrics middleware is installed
4. Check for metric naming conflicts

### Traces Not Correlating

1. Verify trace headers are forwarded
2. Check `tracingMiddleware` is installed
3. Ensure downstream services accept trace headers
4. Verify trace IDs in logs match

## Next Steps

1. Set up Grafana dashboards for each service
2. Configure Sentry alerts for critical errors
3. Integrate with PagerDuty for on-call rotation
4. Set up log aggregation (Datadog/Loki)
5. Create runbooks for common alerts
