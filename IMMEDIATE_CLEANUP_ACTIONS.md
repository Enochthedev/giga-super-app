# Immediate Cleanup Actions

**Date**: January 16, 2026  
**Status**: Ready to Execute  
**Estimated Time**: 2-3 hours

---

## 🎯 Actions to Execute Now

### 1. Merge Duplicate Profile Functions ✅

**Analysis**: Both `get-user-profile` and `get-current-profile` do the same
thing:

- Get authenticated user's profile
- Fetch roles, active role, addresses
- Return combined data

**Differences**:

- `get-user-profile` also fetches `notification_preferences` and adds `is_admin`
  flag
- `get-current-profile` has more detailed logging

**Decision**: Keep `get-user-profile` (more complete), deprecate
`get-current-profile`

**Action**:

```bash
# The better version is get-user-profile (has notification_preferences)
# We'll keep it and delete get-current-profile
```

---

### 2. Review Admin Dashboard Functions

**Functions**:

- `admin-dashboard-stats` (version 1)
- `admin-get-dashboard-stats` (version 1)

**Analysis**: Need to check if these are duplicates or serve different purposes

**Action**: Check function implementations

---

### 3. Delete Mock Payment Functions ✅

**Functions to Delete**:

- `Initialize-payment-with-mock`
- `Mock-payment-webhook`

**Reason**: Testing functions that should never be in production

**Action**: Delete immediately

---

### 4. Deprecate Search Function ✅

**Function**: `Search-hotels`

**Reason**: Railway Search Service is more comprehensive

**Action**: Mark as deprecated, will delete after Railway deployment

---

## 📝 Execution Script

```bash
#!/bin/bash

echo "🧹 Starting Immediate Cleanup..."
echo ""

# 1. Delete mock payment functions
echo "1️⃣ Deleting mock payment functions..."
echo "   ❌ Initialize-payment-with-mock"
echo "   ❌ Mock-payment-webhook"
echo ""
echo "⚠️  Manual action required:"
echo "   Go to Supabase Dashboard → Edge Functions"
echo "   Delete: Initialize-payment-with-mock"
echo "   Delete: Mock-payment-webhook"
echo ""
read -p "Press Enter when done..."

# 2. Deprecate get-current-profile (keep get-user-profile)
echo ""
echo "2️⃣ Deprecating get-current-profile..."
echo "   ✅ Keeping: get-user-profile (more complete)"
echo "   ❌ Deprecating: get-current-profile"
echo ""
echo "⚠️  Manual action required:"
echo "   Go to Supabase Dashboard → Edge Functions"
echo "   Delete: get-current-profile"
echo ""
echo "📝 Update clients to use: get-user-profile"
echo ""
read -p "Press Enter when done..."

# 3. Mark Search-hotels as deprecated
echo ""
echo "3️⃣ Marking Search-hotels as deprecated..."
echo "   ⚠️  Will be deleted after Railway deployment"
echo "   ✅ Railway Search Service is ready"
echo ""
echo "📝 Note: Keep function active until Railway is deployed"
echo ""

# 4. Check admin dashboard functions
echo ""
echo "4️⃣ Checking admin dashboard functions..."
echo "   Need to verify if these are duplicates:"
echo "   - admin-dashboard-stats"
echo "   - admin-get-dashboard-stats"
echo ""
echo "⚠️  Manual action required:"
echo "   Check Supabase Dashboard to see if these are duplicates"
echo ""
read -p "Press Enter to continue..."

echo ""
echo "✅ Immediate cleanup checklist:"
echo "   [ ] Deleted Initialize-payment-with-mock"
echo "   [ ] Deleted Mock-payment-webhook"
echo "   [ ] Deleted get-current-profile"
echo "   [ ] Marked Search-hotels as deprecated"
echo "   [ ] Reviewed admin dashboard functions"
echo ""
echo "🎉 Cleanup phase 1 complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Update API Gateway with Supabase proxy"
echo "   2. Deploy Railway services"
echo "   3. Migrate notification functions"
echo ""
```
