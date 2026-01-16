# Quick Deploy Reference - All Services

**Current Status**: API Gateway deployed ✅  
**Remaining**: 7 services to deploy

---

## 🚀 Quick Deploy (Automated)

### One Command Deployment

```bash
./scripts/deploy-all-services.sh
```

This script will:

1. Create Dockerfiles for all services
2. Create railway.toml files
3. Optionally test builds locally
4. Deploy all services to Railway
5. Set environment variables
6. Update API Gateway configuration
7. Test all health endpoints

---

## 📋 Manual Deployment (Step by Step)

### 1. Create Dockerfiles

```bash
# Run this once to create all Dockerfiles
for service in social-service admin-service payment-queue-service search-service delivery-service taxi-realtime-service notifications-service; do
  # Dockerfile will be created by the script
  echo "Creating Dockerfile for $service"
done
```

### 2. Deploy Each Service

```bash
# Deploy social service
cd social-service && railway up --service social-service && cd ..

# Deploy admin service
cd admin-service && railway up --service admin-service && cd ..

# Deploy payment service
cd payment-queue-service && railway up --service payment-queue-service && cd ..

# Deploy search service
cd search-service && railway up --service search-service && cd ..

# Deploy delivery service
cd delivery-service && railway up --service delivery-service && cd ..

# Deploy taxi realtime service
cd taxi-realtime-service && railway up --service taxi-realtime-service && cd ..

# Deploy notifications service
cd notifications-service && railway up --service notifications-service && cd ..
```

### 3. Get Service URLs

```bash
railway domain --service social-service
railway domain --service admin-service
railway domain --service payment-queue-service
railway domain --service search-service
railway domain --service delivery-service
railway domain --service taxi-realtime-service
railway domain --service notifications-service
```

### 4. Update API Gateway

```bash
# Set service URLs in API Gateway
railway variables --service giga-super-app --set "SOCIAL_SERVICE_URL=<url>"
railway variables --service giga-super-app --set "ADMIN_SERVICE_URL=<url>"
railway variables --service giga-super-app --set "PAYMENT_QUEUE_SERVICE_URL=<url>"
railway variables --service giga-super-app --set "SEARCH_SERVICE_URL=<url>"
railway variables --service giga-super-app --set "DELIVERY_SERVICE_URL=<url>"
railway variables --service giga-super-app --set "TAXI_REALTIME_SERVICE_URL=<url>"
railway variables --service giga-super-app --set "NOTIFICATIONS_SERVICE_URL=<url>"
```

---

## 🧪 Testing

### Test All Health Endpoints

```bash
# API Gateway
curl https://giga-super-app-production.up.railway.app/health

# Individual services
curl https://social-service-production.up.railway.app/health
curl https://admin-service-production.up.railway.app/health
curl https://payment-queue-service-production.up.railway.app/health
curl https://search-service-production.up.railway.app/health
curl https://delivery-service-production.up.railway.app/health
curl https://taxi-realtime-service-production.up.railway.app/health
curl https://notifications-service-production.up.railway.app/health
```

### Test Through API Gateway

```bash
# Test routing
curl https://giga-super-app-production.up.railway.app/api/v1/social/health
curl https://giga-super-app-production.up.railway.app/api/v1/admin/health
curl https://giga-super-app-production.up.railway.app/api/v1/payments/health
```

---

## 📊 Monitoring

### View Logs

```bash
# View logs for specific service
railway logs --service social-service
railway logs --service admin-service
railway logs --service payment-queue-service
```

### Check Status

```bash
# Check all services
railway status
```

---

## 🔧 Troubleshooting

### Service Won't Start

```bash
# Check logs
railway logs --service <service-name>

# Check environment variables
railway variables --service <service-name>

# Restart service
railway restart --service <service-name>
```

### Database Connection Issues

```bash
# Verify Supabase credentials
railway variables --service <service-name> | grep SUPABASE
```

---

## 📝 Service Ports

| Service               | Port | Status |
| --------------------- | ---- | ------ |
| API Gateway           | 3000 | ✅     |
| Social Service        | 3001 | 🚀     |
| Admin Service         | 3002 | 🚀     |
| Payment Queue Service | 3003 | 🚀     |
| Search Service        | 3004 | 🚀     |
| Delivery Service      | 3005 | 🚀     |
| Taxi Realtime Service | 3006 | 🚀     |
| Notifications Service | 3007 | 🚀     |

---

## 🎯 Post-Deployment Checklist

- [ ] All services deployed
- [ ] All health checks passing
- [ ] API Gateway routing configured
- [ ] Service URLs updated
- [ ] Redis provisioned (for payment & notifications)
- [ ] Environment variables set
- [ ] Payment webhooks updated
- [ ] Client apps updated
- [ ] Monitoring configured
- [ ] Team notified

---

## 💡 Quick Commands

```bash
# Deploy all services (automated)
./scripts/deploy-all-services.sh

# Check all service status
railway service list

# View logs for all services
for service in social-service admin-service payment-queue-service search-service delivery-service taxi-realtime-service notifications-service; do
  echo "=== $service ==="
  railway logs --service $service --lines 10
done

# Restart all services
for service in social-service admin-service payment-queue-service search-service delivery-service taxi-realtime-service notifications-service; do
  railway restart --service $service
done
```

---

**Ready to deploy!** 🚀

Choose your deployment method:

- **Automated**: Run `./scripts/deploy-all-services.sh`
- **Manual**: Follow the step-by-step guide above
