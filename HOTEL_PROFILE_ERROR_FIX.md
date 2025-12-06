# Hotel "Profile Not Found" Error - Root Cause Analysis

**Date**: 2025-11-22  
**Reporter**: Aaron  
**Issue**: 404 "profile not found" when fetching hotels

---

## Problem Summary

Aaron is getting "profile not found" errors when fetching hotels, even though:
- ✅ The current code is correct (uses `user.id`)
- ✅ The schema foreign keys are correct (reference `user_id`)

## Root Cause

**Legacy data issue**: Hotels created before the code was corrected may have **incorrect `host_id` values** stored in the database.

### What Happened

1. **Past mistake**: At some point, hotels were created using `profile.id` instead of `user.id`
2. **Code was fixed**: Current `create-hotel` function now correctly uses `user.id`
3. **Old data remains**: Hotels created with the old pattern still have bad data
4. **Queries fail**: When joining hotels to profiles, the join fails for old hotels

## The Mismatch

```sql
-- What's in the database (BAD DATA):
hotels.host_id = 'abc-123'  -- This is a profile.id

-- What the join expects:
host_profiles.user_id = 'xyz-789'  -- This is the correct user_id

-- The join fails because:
'abc-123' != 'xyz-789'
```

## Evidence

When fetching hotels:
```typescript
.from('hotels')
.select(`
    *,
    host_profiles!hotels_host_id_fkey(*)
`)
```

This join **fails** for hotels where `host_id` is a `profile.id` instead of `user_id`, resulting in:
- `host_profiles` is `null`
- Error: "profile not found"

---

## Solution

### Step 1: Diagnose the Issue

Run the diagnostic query:

```bash
# Option A: Use Supabase SQL Editor
# Copy and paste: check_data_integrity.sql

# Option B: Deploy and call the diagnostic function
supabase functions deploy check-hotel-integrity
curl https://YOUR_PROJECT.supabase.co/functions/v1/check-hotel-integrity \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

This will show:
- How many hotels have correct references
- How many hotels are using `profile.id` (wrong pattern)
- How many hotels are orphaned (no profile at all)

### Step 2: Fix the Data

**Option A: Use SQL (Recommended)**

1. Open Supabase SQL Editor
2. Run queries from `check_data_integrity.sql` to see issues
3. Review the dry-run from `fix_hotel_host_ids.sql`
4. Uncomment and run the FIX section
5. Verify with the verification query

**Option B: Manual Fix in Dashboard**

For each broken hotel:
1. Find the hotel's current `host_id`
2. Find the matching `host_profiles` record where `id = host_id`
3. Update hotel's `host_id` to that profile's `user_id`

### Step 3: Verify the Fix

After running the fix:

```sql
-- This should return 0 rows
SELECT h.id, h.name, h.host_id
FROM hotels h
LEFT JOIN host_profiles hp ON h.host_id = hp.user_id
WHERE hp.user_id IS NULL;
```

---

## Prevention

### ✅ Current Code is Correct

The current `create-hotel` function already prevents this:

```typescript
// supabase/functions/create-hotel/index.ts (Line 56)
const { data: hotel } = await supabaseClient
    .from('hotels')
    .insert({
        host_id: user.id,  // ✅ Correct!
        // ...
    });
```

### Future-Proofing

Consider adding a database trigger to prevent bad data:

```sql
-- Trigger to validate host_id references
CREATE OR REPLACE FUNCTION validate_hotel_host_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM host_profiles 
        WHERE user_id = NEW.host_id
    ) THEN
        RAISE EXCEPTION 'Invalid host_id: must reference host_profiles.user_id';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_hotel_host_id
    BEFORE INSERT OR UPDATE OF host_id ON hotels
    FOR EACH ROW
    EXECUTE FUNCTION validate_hotel_host_id();
```

---

## Files Created

1. **`check_data_integrity.sql`** - Diagnostic queries to find issues
2. **`fix_hotel_host_ids.sql`** - SQL script to fix bad data
3. **`supabase/functions/check-hotel-integrity/index.ts`** - API endpoint to check integrity

---

## Quick Fix Commands

```bash
# 1. Diagnose
cd /Users/user/Dev/giga
# Then run check_data_integrity.sql in Supabase SQL Editor

# 2. Fix (after reviewing dry-run results)
# Run fix_hotel_host_ids.sql in Supabase SQL Editor

# 3. Verify
# Run verification query from fix_hotel_host_ids.sql

# 4. Test
# Have Aaron fetch hotels again - should work now!
```

---

## Summary

- **Root Cause**: Legacy hotels stored `profile.id` in `host_id` instead of `user_id`
- **Current Code**: Already correct, won't create more bad data
- **Fix Needed**: Update existing hotels to use correct `user_id` values
- **Time to Fix**: ~5 minutes with SQL script
- **Impact**: After fix, all hotel queries will work correctly
