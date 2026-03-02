# Railway Quick Setup Guide

## Quick Copy-Paste Configuration

Use this guide to quickly configure each service in Railway. Just copy and paste
the values.

---

## 🔵 Social Service

### Build Section

```
Builder: Dockerfile
Dockerfile Path: social-service/Dockerfile
Root Directory: (leave empty)
```

### Watch Paths (click "Add pattern" for each)

```
social-service/**
shared/**
```

### Deploy Section

```
Healthcheck Path: /health
Start Command: (leave empty)
```

### Config-as-Code

```
Railway Config File: social-service/railway.toml
```

### Environment Variables

```
NODE_ENV=production
PORT=3001
SERVICE_NAME=social-service
```

---

## 🟢 Admin Service

### Build Section

```
Builder: Dockerfile
Dockerfile Path: admin-service/Dockerfile
Root Directory: (leave empty)
```

### Watch Paths

```
admin-service/**
shared/**
```

### Deploy Section

```
Healthcheck Path: /health
Start Command: (leave empty)
```

### Config-as-Code

```
Railway Config File: admin-service/railway.toml
```

### Environment Variables

```
NODE_ENV=production
PORT=3002
SERVICE_NAME=admin-service
```

---

## 🟡 Payment Queue Service

### Build Section

```
Builder: Dockerfile
Dockerfile Path: payment-queue-service/Dockerfile
Root Directory: (leave empty)
```

### Watch Paths

```
payment-queue-service/**
shared/**
```

### Deploy Section

```
Healthcheck Path: /health
Start Command: (leave empty)
```

### Config-as-Code

```
Railway Config File: payment-queue-service/railway.toml
```

### Environment Variables

```
NODE_ENV=production
PORT=3003
SERVICE_NAME=payment-queue-service
```

---

## 🟠 Search Service

### Build Section

```
Builder: Dockerfile
Dockerfile Path: search-service/Dockerfile
Root Directory: (leave empty)
```

### Watch Paths

```
search-service/**
shared/**
```

### Deploy Section

```
Healthcheck Path: /health
Start Command: (leave empty)
```

### Config-as-Code

```
Railway Config File: search-service/railway.toml
```

### Environment Variables

```
NODE_ENV=production
PORT=3004
SERVICE_NAME=search-service
```

---

## 🔴 Delivery Service

### Build Section

```
Builder: Dockerfile
Dockerfile Path: delivery-service/Dockerfile
Root Directory: (leave empty)
```

### Watch Paths

```
delivery-service/**
shared/**
```

### Deploy Section

```
Healthcheck Path: /health
Start Command: (leave empty)
```

### Config-as-Code

```
Railway Config File: delivery-service/railway.toml
```

### Environment Variables

```
NODE_ENV=production
PORT=3005
SERVICE_NAME=delivery-service
```

---

## 🟣 Taxi Realtime Service

### Build Section

```
Builder: Dockerfile
Dockerfile Path: taxi-realtime-service/Dockerfile
Root Directory: (leave empty)
```

### Watch Paths

```
taxi-realtime-service/**
shared/**
```

### Deploy Section

```
Healthcheck Path: /health
Start Command: (leave empty)
```

### Config-as-Code

```
Railway Config File: taxi-realtime-service/railway.toml
```

### Environment Variables

```
NODE_ENV=production
PORT=3006
SERVICE_NAME=taxi-realtime-service
```

---

## 🟤 Notifications Service

### Build Section

```
Builder: Dockerfile
Dockerfile Path: notifications-service/Dockerfile
Root Directory: (leave empty)
```

### Watch Paths

```
notifications-service/**
shared/**
```

### Deploy Section

```
Healthcheck Path: /health
Start Command: (leave empty)
```

### Config-as-Code

```
Railway Config File: notifications-service/railway.toml
```

### Environment Variables

```
NODE_ENV=production
PORT=3007
SERVICE_NAME=notifications-service
```

---

## Common Settings for All Services

### Restart Policy

```
Restart Policy: On Failure
Max Restart Retries: 3
```

### Resource Limits (adjust as needed)

```
CPU: 1 vCPU
Memory: 512 MB
```

### Regions

```
Primary Region: Southeast Asia (Singapore)
Replicas: 1
```

---

## Setup Checklist

For each service:

- [ ] Create new service in Railway
- [ ] Connect GitHub repository (branch: main)
- [ ] Set Builder to "Dockerfile"
- [ ] Set Dockerfile Path
- [ ] Leave Root Directory empty
- [ ] Add both watch paths
- [ ] Set Healthcheck Path to `/health`
- [ ] Leave Start Command empty
- [ ] Add Railway Config File path
- [ ] Add environment variables
- [ ] Generate domain for public access
- [ ] Deploy and verify

---

## Verification Steps

After deploying each service:

1. **Check Build Logs**: Should complete without fatal errors
2. **Check Deploy Logs**: Should start successfully
3. **Test Health Endpoint**: `https://<your-domain>/health` should return 200 OK
4. **Check Private Network**: Service should be accessible at
   `<service-name>.railway.internal`

---

## Troubleshooting

### Build fails with "shared not found"

✅ **Fix**: Ensure Root Directory is empty

### Build fails with TypeScript errors

✅ **Expected**: Builds continue despite type errors (warnings only)

### Service won't start

✅ **Check**: Environment variables are set ✅ **Check**: Port matches
configuration

### Health check fails

✅ **Check**: Service is listening on correct port ✅ **Check**: `/health`
endpoint exists and returns 200

---

## Next Steps After All Services Are Deployed

1. Note all service URLs (both public and private)
2. Update API Gateway configuration with service URLs
3. Test inter-service communication
4. Set up monitoring and logging
5. Configure CI/CD pipeline

---

## Quick Deploy Command

Once configured, deploy all services by pushing to main:

```bash
git add .
git commit -m "Deploy all services"
git push origin main
```

Railway will automatically:

- Detect changes in watch paths
- Build affected services
- Run health checks
- Deploy new versions
- Terminate old deployments

---

## Support

If you encounter issues:

1. Check Railway build logs
2. Check Railway deploy logs
3. Review `RAILWAY_SERVICE_CONFIGURATION.md` for detailed explanations
4. Review `DOCKER_BUILD_FIX_SUMMARY.md` for technical details
