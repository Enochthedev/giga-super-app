# Observability Quick Reference

Quick commands and snippets for monitoring GIGA platform services.

## Health Checks

```bash
# Check if service is alive
curl http://localhost:3000/health/live

# Check if service is ready
curl http://localhost:3000/health/ready

# Get detailed health status
curl http://localhost:3000/health
```

## Metrics

```bash
# Get Prometheus metrics
curl http://localhost:3000/metrics

# Query specific metric
curl http://localhost:9090/api/v1/query?query=giga_http_requests_total

# Get error rate (last 5 minutes)
curl 'http://localhost:9090/api/v1/query?query=rate(giga_http_request_errors_total[5m])'
```

## Logging

```typescript
// Import logger
import { createContextLogger } from '@giga/shared/observability';

// Create logger with context
const logger = createContextLogger('service-name', {
  userId: user.id,
  traceId: req.traceContext?.traceId,
});

// Log messages
logger.info('Operation completed', { result: 'success' });
logger.warn('Approaching limit', { remaining: 10 });
logger.error('Operation failed', error, { context: 'data' });
logger.debug('Debug info', { details: 'verbose' });

// Specialized logging
logger.logRequest('GET', '/api/users', 200, 45);
logger.logQuery('SELECT', 'users', 12);
logger.logExternalCall('stripe', 'payment', 234, true);
logger.logBusinessEvent('user_signup');
logger.logSecurityEvent('failed_login', 'high');
```

## Error Tracking

```typescript
// Import Sentry utilities
import {
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  setContext,
} from '@giga/shared/observability';

// Capture exception
try {
  await riskyOperation();
} catch (error) {
  captureException(error, { userId: user.id });
  throw error;
}

// Capture message
captureMessage('Important event', 'info', { data: 'context' });

// Add breadcrumb
addBreadcrumb({
  category: 'auth',
  message: 'Login attempt',
  level: 'info',
});

// Set user context
setUser({ id: user.id, email: user.email });

// Set custom context
setContext('payment', { amount: 100, currency: 'USD' });
```

## Distributed Tracing

```typescript
// Import tracing utilities
import {
  tracingMiddleware,
  createTraceHeaders,
  traceOperation,
  createSpan,
} from '@giga/shared/observability';

// Add tracing middleware
app.use(tracingMiddleware('service-name'));

// Forward trace to downstream service
const headers = createTraceHeaders(req);
await axios.get('http://other-service/api', { headers });

// Trace an operation
const result = await traceOperation('operation_name', req, async () => {
  return await performOperation();
});

// Manual span
const span = createSpan('custom_operation', req);
try {
  await operation();
} finally {
  span.end();
  console.log(`Duration: ${span.duration()}ms`);
}
```

## Custom Metrics

```typescript
// Import metrics
import {
  httpRequestDuration,
  httpRequestTotal,
  databaseQueryDuration,
  businessEvents,
  cacheHits,
  cacheMisses,
  trackDatabaseQuery,
  trackExternalService,
} from '@giga/shared/observability';

// Track HTTP metrics (automatic via middleware)
// Just use: app.use(metricsMiddleware('service-name'));

// Track database query
await trackDatabaseQuery('SELECT', 'users', 'service-name', async () => {
  return await db.query('SELECT * FROM users');
});

// Track external service
await trackExternalService('stripe', 'payment', 'service-name', async () => {
  return await stripe.charges.create({ amount: 1000 });
});

// Track business event
businessEvents.inc({
  event_type: 'user_signup',
  status: 'success',
  service: 'service-name',
});

// Track cache
cacheHits.inc({ cache_name: 'user_cache', service: 'service-name' });
cacheMisses.inc({ cache_name: 'user_cache', service: 'service-name' });
```

## Environment Variables

```bash
# Sentry
SENTRY_DSN=https://key@sentry.io/project
SENTRY_ENABLED=true
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

## Common PromQL Queries

```promql
# Request rate (requests per second)
rate(giga_http_requests_total[5m])

# Error rate
rate(giga_http_request_errors_total[5m])

# P95 response time
histogram_quantile(0.95, rate(giga_http_request_duration_seconds_bucket[5m]))

# P99 response time
histogram_quantile(0.99, rate(giga_http_request_duration_seconds_bucket[5m]))

# Database query rate
rate(giga_database_queries_total[5m])

# Cache hit rate
rate(giga_cache_hits_total[5m]) / (rate(giga_cache_hits_total[5m]) + rate(giga_cache_misses_total[5m]))

# Active connections
giga_active_connections

# Memory usage
process_resident_memory_bytes / 1024 / 1024

# CPU usage
rate(process_cpu_seconds_total[5m])
```

## Grafana Dashboard Panels

### Request Rate

```promql
sum(rate(giga_http_requests_total[5m])) by (service)
```

### Error Rate by Service

```promql
sum(rate(giga_http_request_errors_total[5m])) by (service, status_code)
```

### Response Time Percentiles

```promql
histogram_quantile(0.50, sum(rate(giga_http_request_duration_seconds_bucket[5m])) by (le, service))
histogram_quantile(0.95, sum(rate(giga_http_request_duration_seconds_bucket[5m])) by (le, service))
histogram_quantile(0.99, sum(rate(giga_http_request_duration_seconds_bucket[5m])) by (le, service))
```

### Database Performance

```promql
sum(rate(giga_database_query_duration_seconds_sum[5m])) by (service, operation)
```

## Alert Rules

### High Error Rate

```yaml
- alert: HighErrorRate
  expr: rate(giga_http_request_errors_total[5m]) > 0.05
  for: 5m
  labels:
    severity: critical
```

### Slow Response Time

```yaml
- alert: SlowResponseTime
  expr:
    histogram_quantile(0.95,
    rate(giga_http_request_duration_seconds_bucket[5m])) > 1
  for: 5m
  labels:
    severity: warning
```

### Service Down

```yaml
- alert: ServiceDown
  expr: up{job=~"giga-.*"} == 0
  for: 1m
  labels:
    severity: critical
```

### High Memory Usage

```yaml
- alert: HighMemoryUsage
  expr: (process_resident_memory_bytes / 1024 / 1024 / 1024) > 1
  for: 5m
  labels:
    severity: warning
```

## Debugging Tips

### Find Slow Requests

```bash
# In logs, filter by duration
cat logs/combined.log | jq 'select(.http.duration_ms > 1000)'

# In Prometheus
topk(10, giga_http_request_duration_seconds_sum)
```

### Find Error Patterns

```bash
# In logs
cat logs/error.log | jq '.error.message' | sort | uniq -c | sort -rn

# In Sentry
# Go to Issues → Sort by frequency
```

### Trace a Request

```bash
# Get trace ID from response headers
curl -v http://localhost:3000/api/users | grep X-Trace-Id

# Search logs by trace ID
cat logs/combined.log | jq 'select(.traceId == "abc-123")'
```

### Check Service Health

```bash
# All services
for port in 3000 3001 3005; do
  echo "Port $port:"
  curl -s http://localhost:$port/health | jq '.status'
done
```

## Service Endpoints

| Service          | Port | Health  | Metrics  |
| ---------------- | ---- | ------- | -------- |
| API Gateway      | 3000 | /health | /metrics |
| Social Service   | 3001 | /health | /metrics |
| Admin Service    | 3005 | /health | /metrics |
| Search Service   | 3007 | /health | /metrics |
| Delivery Service | 3003 | /health | /metrics |
| Payment Queue    | 3004 | /health | /metrics |
| Taxi Realtime    | 3006 | /health | /metrics |
| Notifications    | 3007 | /health | /metrics |

## Links

- **Sentry**: https://sentry.io
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
- **Full Documentation**: [OBSERVABILITY_SETUP.md](./OBSERVABILITY_SETUP.md)
