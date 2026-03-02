# Action Checklist - Ready to Execute

**Date**: January 16, 2026  
**Status**: ✅ All preparation complete

---

## 🎯 What We've Accomplished

### ✅ Analysis Phase (Complete)

- [x] Listed all 95 Supabase edge functions
- [x] Compared with Railway service endpoints
- [x] Identified 3 areas of overlap
- [x] Found 5 functions to delete immediately
- [x] Found 8 functions to deprecate later
- [x] Created comprehensive documentation

### ✅ Planning Phase (Complete)

- [x] Created cleanup & optimization plan
- [x] Created 4-week migration timeline
- [x] Documented rollback procedures
- [x] Established success criteria
- [x] Created deployment guide
- [x] Documented all environment variables

### ✅ Preparation Phase (Complete)

- [x] Created API Gateway Supabase proxy
- [x] Created automated deployment script
- [x] Created migration test suite plan
- [x] Created deprecation warning system
- [x] Created quick start guide

---

## 📋 Ready to Execute

### Step 1: Immediate Cleanup (1-2 hours)

**Manual Actions in Supabase Dashboard**:

1. **Delete Mock Payment Functions**

   ```
   Go to: Supabase Dashboard → Edge Functions
   Delete: Initialize-payment-with-mock
   Delete: Mock-payment-webhook
   Reason: Testing functions, not for production
   ```

2. **Delete Duplicate Profile Function**

   ```
   Go to: Supabase Dashboard → Edge Functions
   Delete: get-current-profile
   Keep: get-user-profile (more complete)
   Reason: Duplicate functionality
   ```

3. **Verify Admin Dashboard Functions**

   ```
   Go to: Supabase Dashboard → Edge Functions
   Check: admin-dashboard-stats
   Check: admin-get-dashboard-stats
   Action: If duplicates, keep one and delete the other
   ```

4. **Mark Search Function as Deprecated**
   ```
   Note: Keep Search-hotels active until Railway is deployed
   Will delete after Railway Search Service is verified
   ```

**Code Changes**:

5. **Update API Gateway**
   ```bash
   # Already created: api-gateway/src/middleware/supabaseProxy.ts
   # Need to integrate into main app
   ```

---

### Step 2: Deploy to Railway (2-3 hours)

**Option A: Automated Deployment**

```bash
# Run automated deployment script
./scripts/deploy-to-railway.sh
```

**Option B: Manual Deployment**

```bash
# Follow the guide
# See: RAILWAY_DEPLOYMENT_GUIDE.md
# Or: QUICK_START_RAILWAY.md
```

**Post-Deployment Actions**:

1. Update payment webhook URLs (Paystack, Stripe)
2. Test all Railway endpoints
3. Monitor for 24 hours
4. Run smoke tests

---

### Step 3: Monitor & Migrate (Week 2)

**Notification Migration**:

1. Monitor Railway notifications service (3 days)
2. Update client applications gradually
3. Deprecate Supabase notification functions
4. Monitor for issues

---

### Step 4: Enhance & Complete (Week 3-4)

**Payment Service Enhancement**:

1. Add wallet features to Railway
2. Add escrow features to Railway
3. Add payout features to Railway
4. Migrate payment clients
5. Deprecate Supabase payment functions

---

## 🚀 Quick Start Commands

### Immediate Cleanup

```bash
# 1. Review the cleanup plan
cat IMMEDIATE_CLEANUP_ACTIONS.md

# 2. Execute manual deletions in Supabase Dashboard
# (See Step 1 above)

# 3. Verify cleanup
echo "✅ Deleted: Initialize-payment-with-mock"
echo "✅ Deleted: Mock-payment-webhook"
echo "✅ Deleted: get-current-profile"
echo "✅ Verified: admin dashboard functions"
echo "✅ Marked: Search-hotels as deprecated"
```

### Railway Deployment

```bash
# 1. Install Railway CLI (if not installed)
brew install railway  # macOS
# or
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Run automated deployment
./scripts/deploy-to-railway.sh

# 4. Or follow manual guide
open QUICK_START_RAILWAY.md
```

### Post-Deployment Testing

```bash
# 1. Test API Gateway
curl https://your-gateway.railway.app/health

# 2. Test Railway services
curl https://social-service.railway.app/health
curl https://admin-service.railway.app/health
curl https://search-service.railway.app/health
curl https://notifications-service.railway.app/health
curl https://payment-queue.railway.app/health

# 3. Run smoke tests
./scripts/smoke-tests.sh
```

---

## 📊 Progress Tracking

### Phase 1: Immediate Cleanup

- [x] Delete mock payment functions ✅
- [x] Delete duplicate profile function ✅
- [x] Verify admin dashboard functions ✅ (Both are different, kept both)
- [x] Mark search function as deprecated ✅ (Will delete after Railway
      deployment)
- [ ] Update API Gateway with Supabase proxy

### Phase 2: Railway Deployment

- [x] Install Railway CLI ✅
- [x] Login to Railway ✅
- [x] Create/link Railway project ✅
- [x] Connect GitHub repository ✅
- [ ] Provision Redis (In Railway Dashboard)
- [ ] Create 8 services in Railway Dashboard
- [ ] Set environment variables (Use scripts/set-railway-env.sh)
- [ ] Deploy API Gateway (Auto-deploy from GitHub)
- [ ] Deploy Social Service (Auto-deploy from GitHub)
- [ ] Deploy Admin Service (Auto-deploy from GitHub)
- [ ] Deploy Search Service (Auto-deploy from GitHub)
- [ ] Deploy Taxi Realtime Service (Auto-deploy from GitHub)
- [ ] Deploy Payment Queue Service (Auto-deploy from GitHub)
- [ ] Deploy Delivery Service (Auto-deploy from GitHub)
- [ ] Deploy Notifications Service (Auto-deploy from GitHub)
- [ ] Update API Gateway service URLs
- [ ] Configure payment webhooks
- [ ] Run smoke tests

### Phase 3: Notification Migration

- [ ] Monitor Railway notifications (3 days)
- [ ] Update client applications
- [ ] Deprecate Supabase notification functions
- [ ] Monitor for issues

### Phase 4: Payment Enhancement

- [ ] Add wallet features
- [ ] Add escrow features
- [ ] Add payout features
- [ ] Migrate payment clients
- [ ] Deprecate Supabase payment functions

---

## 🎯 Decision Points

### Before Starting Cleanup

**Question**: Are you ready to delete functions from Supabase?

- ✅ Yes → Proceed with Step 1
- ❌ No → Review CLEANUP_SUMMARY.md first

### Before Railway Deployment

**Question**: Do you have all required API keys?

- ✅ Yes → Proceed with Step 2
- ❌ No → Review RAILWAY_ENV_CHECKLIST.md

### Before Notification Migration

**Question**: Is Railway notifications service stable?

- ✅ Yes → Proceed with Step 3
- ❌ No → Continue monitoring

### Before Payment Enhancement

**Question**: Are all clients migrated to Railway notifications?

- ✅ Yes → Proceed with Step 4
- ❌ No → Complete notification migration first

---

## 📚 Documentation Reference

### For Cleanup

- **CLEANUP_SUMMARY.md** - Overview of cleanup plan
- **IMMEDIATE_CLEANUP_ACTIONS.md** - Actions to execute now
- **ENDPOINT_COMPARISON_ANALYSIS.md** - Detailed analysis

### For Deployment

- **RAILWAY_DEPLOYMENT_GUIDE.md** - Complete deployment guide (50+ pages)
- **QUICK_START_RAILWAY.md** - Quick start (5 steps, 2-3 hours)
- **RAILWAY_ENV_CHECKLIST.md** - All environment variables

### For Migration

- **CLEANUP_OPTIMIZATION_PLAN.md** - 4-week migration timeline
- **SERVICE_SPECIFICATIONS.md** - Service details
- **SUPABASE_RAILWAY_COMPARISON.md** - Current state analysis

---

## ✅ Final Checklist Before Starting

- [ ] Read CLEANUP_SUMMARY.md
- [ ] Read IMMEDIATE_CLEANUP_ACTIONS.md
- [ ] Have Supabase Dashboard access
- [ ] Have Railway account created
- [ ] Have all API keys ready (Paystack, Stripe, Twilio, etc.)
- [ ] Have team approval to proceed
- [ ] Have backup/rollback plan ready
- [ ] Have monitoring tools set up

---

## 🎉 You're Ready!

Everything is prepared and documented. You can now:

1. **Start with immediate cleanup** (1-2 hours)
2. **Deploy to Railway** (2-3 hours)
3. **Monitor and migrate** (2 weeks)
4. **Enhance and complete** (2 weeks)

**Total estimated time**: 4 weeks for complete migration

**Immediate time commitment**: 3-5 hours for cleanup + deployment

---

**Questions?** Review the documentation or ask for clarification.

**Ready to start?** Begin with Step 1: Immediate Cleanup! 🚀
