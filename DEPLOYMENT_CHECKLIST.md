# Deployment Checklist - Giga Super-App Backend Infrastructure

## Pre-Deployment Setup

### 1. Database Setup
- [ ] Apply database migration:
  ```bash
  psql -d your_database -f supabase/migrations/20260109_create_nipost_hierarchical_schema.sql
  ```
- [ ] Verify all tables created:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_name LIKE 'nipost_%';
  ```
- [ ] Verify RLS policies enabled:
  ```sql
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE tablename LIKE 'nipost_%';
  ```
- [ ] Create test users with different access levels:
  ```sql
  -- National admin
  INSERT INTO nipost_user_permissions (user_id, access_level, role, is_active)
  VALUES ('uuid-here', 'national', 'admin', true);
  
  -- State admin
  INSERT INTO nipost_user_permissions (user_id, access_level, state_id, state_name, role, is_active)
  VALUES ('uuid-here', 'state', 'LA', 'Lagos', 'manager', true);
  
  -- Branch staff
  INSERT INTO nipost_user_permissions (user_id, access_level, branch_id, branch_name, state_id, state_name, role, is_active)
  VALUES ('uuid-here', 'branch', 'LA-IKJ', 'Ikeja Branch', 'LA', 'Lagos', 'staff', true);
  ```

### 2. Environment Variables Setup

#### Required for All Services
```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=
JWT_SECRET=
NODE_ENV=production
LOG_LEVEL=info
```

#### Payment Queue Service (Port 3004)
```bash
PORT=3004
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLIC_KEY=
HOTEL_COMMISSION_RATE=10
TAXI_COMMISSION_RATE=15
ECOMMERCE_COMMISSION_RATE=5
PAYMENT_CALLBACK_URL=https://your-domain.com
```

#### Taxi Real-Time Service (Port 3005)
```bash
PORT=3005
```

#### Admin Service (Port 3006)
```bash
PORT=3006
```

#### Notifications Service (Port 3007)
```bash
PORT=3007
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Giga Platform <notifications@giga.com>
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

#### Search Service (Port 3008)
```bash
PORT=3008
```

### 3. External Services Setup

#### Supabase
- [ ] Create Supabase project (if not exists)
- [ ] Get project URL and service role key
- [ ] Apply database migrations
- [ ] Configure database connection pooling
- [ ] Set up database backups

#### Redis (Railway/Upstash/Local)
- [ ] Provision Redis instance
- [ ] Get connection URL
- [ ] Configure persistence (AOF or RDB)
- [ ] Set up monitoring

#### Payment Providers
- [ ] Paystack account setup
  - [ ] Get API keys (test and live)
  - [ ] Configure webhook URL
  - [ ] Test payment flow in sandbox

- [ ] Stripe account setup
  - [ ] Get API keys (test and live)
  - [ ] Configure webhook URL
  - [ ] Test payment flow in test mode

#### Email Service (SMTP)
- [ ] Gmail App Password / SendGrid / AWS SES
- [ ] Test email sending
- [ ] Configure SPF/DKIM records

#### SMS Service (Twilio)
- [ ] Twilio account setup
- [ ] Get Account SID and Auth Token
- [ ] Get phone number
- [ ] Test SMS sending
- [ ] Check SMS credits

## Local Testing

### 1. Install Dependencies
```bash
# For each service
cd payment-queue-service && npm install
cd ../taxi-realtime-service && npm install
cd ../admin-service && npm install
cd ../notifications-service && npm install
cd ../search-service && npm install
```

### 2. Build Services
```bash
# Build all services
docker-compose -f docker-compose.prod.yml build
```

### 3. Start Services
```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Test Health Endpoints
```bash
# Test each service
curl http://localhost:3004/health  # Payment Queue
curl http://localhost:3005/health  # Taxi Real-Time
curl http://localhost:3006/health  # Admin Service
curl http://localhost:3007/health  # Notifications
curl http://localhost:3008/health  # Search
```

### 5. Test Payment Flow
```bash
# Create test JWT token (use your auth service)
export JWT_TOKEN="your-jwt-token-here"

# Create payment request
curl -X POST http://localhost:3004/api/payments \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "module": "hotel",
    "amount": 10000,
    "currency": "NGN",
    "userId": "user-uuid",
    "branchId": "LA-IKJ",
    "stateId": "LA",
    "metadata": {
      "moduleTransactionId": "booking-uuid",
      "customerEmail": "test@example.com"
    }
  }'

# Check payment status
curl http://localhost:3004/api/payments/{paymentId}/status \
  -H "Authorization: Bearer $JWT_TOKEN"

# Check queue stats
curl http://localhost:3004/api/payments/queue/stats \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 6. Test WebSocket (Taxi Service)
```bash
# Install wscat
npm install -g wscat

# Connect (replace with your JWT)
wscat -c "ws://localhost:3005" -H "Authorization: Bearer YOUR_JWT"

# Or use JavaScript client
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3005', {
  auth: { token: 'YOUR_JWT' }
});
socket.on('connect', () => console.log('Connected'));
"
```

### 7. Test Admin Endpoints
```bash
# Get national dashboard (requires national admin token)
curl http://localhost:3006/api/admin/national/dashboard \
  -H "Authorization: Bearer $NATIONAL_ADMIN_TOKEN"

# Get state dashboard
curl http://localhost:3006/api/admin/state/LA/dashboard \
  -H "Authorization: Bearer $STATE_ADMIN_TOKEN"

# Get branch dashboard
curl http://localhost:3006/api/admin/branch/LA-IKJ/dashboard \
  -H "Authorization: Bearer $BRANCH_ADMIN_TOKEN"
```

### 8. Test Notifications
```bash
# Send test email
curl -X POST http://localhost:3007/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<p>This is a test email</p>",
    "text": "This is a test email"
  }'

# Send test SMS
curl -X POST http://localhost:3007/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sms",
    "to": "+1234567890",
    "message": "This is a test SMS"
  }'
```

### 9. Test Search
```bash
# Unified search
curl "http://localhost:3008/api/search?q=hotel&category=all"

# Hotel search
curl "http://localhost:3008/api/search/hotels?q=luxury&location=lagos&minPrice=5000&maxPrice=50000"

# Product search
curl "http://localhost:3008/api/search/products?q=phone&category=electronics"
```

## Railway Deployment

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### 2. Link Project
```bash
# In project root
railway link
```

### 3. Create Services
```bash
# Create each service manually in Railway dashboard or using CLI
railway service create payment-queue-service
railway service create taxi-realtime-service
railway service create admin-service
railway service create notifications-service
railway service create search-service
```

### 4. Set Environment Variables
For each service in Railway dashboard:
- [ ] Copy variables from .env.example
- [ ] Set service-specific variables
- [ ] Verify all required variables are set

### 5. Deploy Services
```bash
# Deploy all services
railway up

# Or deploy specific service
railway up --service payment-queue-service
```

### 6. Add Redis Plugin
```bash
# In Railway dashboard
# Add Redis plugin
# Copy REDIS_URL to all services
```

### 7. Configure Domains
- [ ] Set up custom domains for each service
- [ ] Configure SSL certificates
- [ ] Update CORS origins

## Post-Deployment Verification

### 1. Health Checks
```bash
# Check all services
for port in 3004 3005 3006 3007 3008; do
  echo "Checking port $port..."
  curl https://your-service-$port.railway.app/health
done
```

### 2. Database Connectivity
```bash
# Check each service can connect to database
# Look for "Database connection successful" in logs
railway logs --service payment-queue-service
```

### 3. Redis Connectivity
```bash
# Check Redis connection
redis-cli -u $REDIS_URL ping
```

### 4. Payment Provider Integration
- [ ] Test Paystack payment flow
- [ ] Test Stripe payment flow
- [ ] Verify webhook endpoints are accessible
- [ ] Test refund flow

### 5. Real-Time Features
- [ ] Test WebSocket connections
- [ ] Test driver location updates
- [ ] Test trip request/accept flow
- [ ] Verify Redis pub/sub working

### 6. Notifications
- [ ] Send test email
- [ ] Send test SMS
- [ ] Verify delivery
- [ ] Check notification logs

### 7. Admin Dashboard
- [ ] Login as national admin
- [ ] Verify dashboard data
- [ ] Test state-level access
- [ ] Test branch-level access
- [ ] Verify RLS policies working

### 8. Search Functionality
- [ ] Test search across all modules
- [ ] Verify cache is working
- [ ] Test filters
- [ ] Check performance

## Monitoring Setup

### 1. Logging
- [ ] Configure log aggregation (Railway logs, CloudWatch, etc.)
- [ ] Set up log retention policies
- [ ] Create log search queries

### 2. Alerts
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure alert emails/SMS
- [ ] Set up error rate alerts
- [ ] Configure performance alerts

### 3. Metrics
- [ ] Monitor queue lengths
- [ ] Track payment success rates
- [ ] Monitor WebSocket connections
- [ ] Track API response times

### 4. Dashboards
- [ ] Create operations dashboard
- [ ] Create business metrics dashboard
- [ ] Set up real-time monitoring

## Security Checklist

- [ ] All services use HTTPS
- [ ] JWT secrets are strong (32+ characters)
- [ ] Database credentials are secure
- [ ] Payment provider keys are in environment
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (using parameterized queries)
- [ ] XSS protection (helmet middleware)
- [ ] CSRF protection (where applicable)
- [ ] Audit trails are working
- [ ] RLS policies are enforced

## Performance Checklist

- [ ] Database indexes are created
- [ ] Redis caching is working
- [ ] Connection pooling is configured
- [ ] Queue concurrency is optimized
- [ ] WebSocket connections are stable
- [ ] Response times are acceptable (<1s for most requests)
- [ ] No memory leaks
- [ ] Graceful shutdown working

## Backup & Recovery

- [ ] Database backups scheduled (Supabase automatic)
- [ ] Redis persistence configured
- [ ] Environment variables documented
- [ ] Deployment rollback procedure tested
- [ ] Disaster recovery plan documented

## Documentation

- [ ] API documentation published (OpenAPI specs)
- [ ] Internal documentation updated
- [ ] Deployment guide finalized
- [ ] Runbook created for operations team
- [ ] Contact information for support

## Final Checks

- [ ] All services running
- [ ] All health checks passing
- [ ] No errors in logs
- [ ] Payment flow tested end-to-end
- [ ] Real-time features working
- [ ] Admin dashboards accessible
- [ ] Notifications sending
- [ ] Search returning results
- [ ] Performance acceptable
- [ ] Security measures in place
- [ ] Monitoring active
- [ ] Team trained on new features

## Rollback Plan

If issues occur:

1. **Identify the problem:**
   - Check service logs
   - Check health endpoints
   - Verify database connectivity

2. **Quick fixes:**
   - Restart affected services
   - Clear Redis cache if needed
   - Verify environment variables

3. **Rollback if needed:**
   ```bash
   # Railway rollback
   railway rollback --service SERVICE_NAME
   
   # Docker Compose
   docker-compose -f docker-compose.prod.yml down
   # Restore previous version
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Database rollback:**
   - Have migration rollback scripts ready
   - Test in staging first
   - Coordinate with team

## Support Contacts

- **Database Issues:** DBA Team
- **Payment Issues:** Payment Provider Support
- **Infrastructure Issues:** DevOps Team
- **Application Issues:** Development Team

---

## Success Criteria

✅ All services deployed and running
✅ Health checks passing
✅ Payment flow working
✅ Real-time features functional
✅ Admin dashboards accessible
✅ RLS policies enforced
✅ Monitoring active
✅ Documentation complete
✅ Team trained

---

**Prepared:** January 9, 2026
**Version:** 1.0.0
**Status:** Ready for Deployment
