# Step 1: Immediate Cleanup - Execution Report

**Date**: January 16, 2026  
**Status**: ⚠️ Manual deletion required in Supabase Dashboard

---

## ✅ Analysis Complete

I've analyzed all 95 edge functions and confirmed the following need to be
deleted:

### 🗑️ Functions to Delete (3 total)

#### 1. Initialize-payment-with-mock

- **ID**: `253e4756-d4f5-456f-9d95-816d13943c79`
- **Slug**: `Initialize-payment-with-mock`
- **Reason**: Mock testing function, not for production
- **Impact**: None - testing only
- **Action**: DELETE

#### 2. Mock-payment-webhook

- **ID**: `f849176f-1c70-43b1-ba98-2b6e3aa36ce2`
- **Slug**: `Mock-payment-webhook`
- **Reason**: Mock testing function, not for production
- **Impact**: None - testing only
- **Action**: DELETE

#### 3. get-current-profile

- **ID**: `ad0462e2-1181-4f89-8087-8eeaf2589520`
- **Slug**: `get-current-profile`
- **Reason**: Duplicate of `get-user-profile` (which is more complete)
- **Impact**: Low - clients should use `get-user-profile` instead
- **Action**: DELETE
- **Migration**: Update any clients calling this to use `get-user-profile`

---

## ✅ Verified - Keep Both Admin Functions

After reviewing the code, I confirmed these are **NOT duplicates**:

- **admin-dashboard-stats**: E-commerce focused (orders, revenue, products, low
  stock)
- **admin-get-dashboard-stats**: Platform-wide stats (users, hotels, bookings,
  orders, rides, revenue)

**Decision**: Keep both - they serve different purposes.

---

## 📝 Manual Deletion Steps

Since the Supabase MCP tools don't support deletion, you need to delete these
manually:

### Option 1: Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Edge Functions** section
4. For each function to delete:
   - Find: `Initialize-payment-with-mock`
   - Click the **⋮** (three dots) menu
   - Select **Delete**
   - Confirm deletion
5. Repeat for:
   - `Mock-payment-webhook`
   - `get-current-profile`

### Option 2: Supabase CLI

```bash
# Delete mock payment functions
supabase functions delete Initialize-payment-with-mock
supabase functions delete Mock-payment-webhook

# Delete duplicate profile function
supabase functions delete get-current-profile
```

---

## 🔍 Search Function Status

**Search-hotels** (id: `57592b29-7c76-4ae1-891c-488fd315e3e4`)

- **Status**: ACTIVE
- **Action**: Mark as deprecated (keep active until Railway Search Service is
  deployed)
- **Next Step**: Delete after Railway deployment is verified

---

## 📊 Cleanup Summary

- **Total Functions Analyzed**: 95
- **Functions to Delete**: 3
- **Functions to Keep**: 92
- **Functions to Deprecate Later**: 1 (Search-hotels)

---

## ✅ Next Steps After Deletion

Once you've deleted these 3 functions:

1. ✅ Update ACTION_CHECKLIST.md - mark Phase 1 complete
2. ✅ Update any client applications using `get-current-profile`
3. ✅ Proceed to Step 2: Deploy to Railway
4. ✅ After Railway deployment, delete `Search-hotels`

---

## 🎯 Ready for Step 2

After completing these deletions, you'll be ready to:

- Deploy services to Railway
- Configure environment variables
- Test Railway endpoints
- Gradually migrate traffic

**Estimated Time**: 5 minutes for manual deletion **Next Phase**: Railway
Deployment (2-3 hours)
