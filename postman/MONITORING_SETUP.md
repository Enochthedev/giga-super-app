# Postman Monitoring Setup

## Quick Setup

### 1. Create Monitors

**Health Check Monitor** (Every 5 minutes)

- Collection: API-Gateway-Collection
- Folder: Health & Status
- Alert on: Any failure

**Authentication Monitor** (Every 15 minutes)

- Collection: API-Gateway-Collection
- Folder: Authentication
- Alert on: Login failures

**Integration Workflow** (Every 2 hours)

- Collection: Integration-Workflows
- Alert on: Workflow failures

### 2. Configure Alerts

**Slack Integration:**

```
Webhook URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
Channel: #api-monitoring
Events: All failures
```

**Email Alerts:**

```
Recipients: team@giga.com
Events: Critical failures only
```

### 3. Monitor Metrics

Track:

- Uptime %
- Response times
- Error rates
- Test pass rates

## Alert Levels

- **Critical**: Health check failures (immediate)
- **High**: Error rate > 10% (15 min)
- **Medium**: Response time > 2s (1 hour)
- **Low**: Individual test failures (daily review)

## Resources

- [Postman Monitors Docs](https://learning.postman.com/docs/monitoring-your-api/intro-monitors/)
- [Newman CLI](https://learning.postman.com/docs/running-collections/using-newman-cli/)
