# Supabase Join Fixes Summary

## Problem

Tables with `user_id` that reference `auth.users(id)` (not `user_profiles(id)`)
need the `!inner` hint when joining to `user_profiles` because there's no direct
foreign key relationship.

## Root Cause

The schema has:

```sql
-- driver_profiles.user_id points to auth.users
CONSTRAINT driver_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)

-- NOT to user_profiles
-- user_profiles.id also equals auth.users.id (same UUID)
```

PostgREST needs explicit `!inner` to join on matching `user_id` values.

## Tables Affected

All tables with `user_id → auth.users(id)` that need to join `user_profiles`:

✅ `driver_profiles` → needs `!inner` ✅ `ecommerce_vendors` → needs `!inner` ✅
`file_metadata` → needs `!inner` ✅ `hotel_bookings` → needs `!inner` ✅
`hotel_reviews` → needs `!inner` ✅ `ecommerce_product_reviews` → needs `!inner`
✅ `nipost_officials` → needs `!inner` ✅ `host_profiles` → needs `!inner` ✅
`advertiser_profiles` → needs `!inner`

## Files Fixed

### 1. admin-service/src/utils/database.ts

**Line 24**: Added `!inner` to `SELECT_FIELDS.VENDOR`

```typescript
// BEFORE
user_profiles(first_name, last_name, email, avatar_url)

// AFTER
user_profiles!inner(first_name, last_name, email, avatar_url)
```

### 2. admin-service/src/routes/business-modules.ts

Fixed 9 endpoints:

1. **GET /media/content/:id** (Line ~1410)
2. **GET /media/content** (Line ~454)
3. **GET /hotel/hotels/:id** - host info (Line ~1270)
4. **GET /hotel/hotels** (Line ~387)
5. **GET /ecommerce/traders/:id** - reviews (Line ~815)
6. **GET /hotel/hotels/:id** - reviews (Line ~1350)
7. **GET /taxi/drivers** (Line ~327)
8. **GET /hotel/hotels/:id** - bookings (Line ~1330)
9. **GET /taxi/drivers/:id** (Line ~1120)

**Also fixed**: ecommerce orders query (Line ~801)

```typescript
// BEFORE - ecommerce_orders doesn't have vendor_id
const { data: orders } = await supabase
  .from('ecommerce_orders')
  .select('id, total_amount, status, created_at')
  .eq('vendor_id', id);

// AFTER - query through ecommerce_order_items
const { data: orderItems } = await supabase
  .from('ecommerce_order_items')
  .select(
    `
    order_id,
    ecommerce_orders!inner(id, order_number, total_amount, status, created_at)
  `
  )
  .eq('vendor_id', id);
```

### 3. admin-service/src/routes/advertisements.ts

**Line 143**: Added `!inner` to advertiser_profiles → user_profiles join

```typescript
// BEFORE
advertiser_profiles(
  company_name,
  user_profiles(email, phone)
)

// AFTER
advertiser_profiles(
  company_name,
  user_profiles!inner(email, phone)
)
```

### 4. admin-service/src/routes/postal-monitoring.ts

**Line 148**: Added `!inner` to nipost_officials → user_profiles join

```typescript
// BEFORE
user_profiles(first_name, last_name, email, phone)

// AFTER
user_profiles!inner(first_name, last_name, email, phone)
```

### 5. admin-service/src/routes/managers.ts

**Line 205**: Added `!inner` to admin actions → user_profiles join

```typescript
// BEFORE
user_profiles(first_name, last_name, email)

// AFTER
user_profiles!inner(first_name, last_name, email)
```

## Total Fixes Applied

- **5 files** modified
- **13 join queries** fixed with `!inner`
- **1 schema issue** fixed (ecommerce orders vendor_id)

## Testing Checklist

Test these endpoints to verify fixes:

### Business Modules

- [ ] GET /api/ecommerce/traders
- [ ] GET /api/ecommerce/traders/:id
- [ ] GET /api/taxi/drivers
- [ ] GET /api/taxi/drivers/:id
- [ ] GET /api/hotel/hotels
- [ ] GET /api/hotel/hotels/:id
- [ ] GET /api/media/content
- [ ] GET /api/media/content/:id

### Admin Operations

- [ ] GET /api/advertisements
- [ ] GET /api/postal/officials
- [ ] GET /api/admin/actions

## Pattern to Remember

When querying any table with `user_id → auth.users(id)`:

```typescript
// ❌ WRONG - Will fail with "Could not find a relationship"
.select('*, user_profiles(first_name, last_name)')

// ✅ CORRECT - Explicitly tells PostgREST to join on user_id
.select('*, user_profiles!inner(first_name, last_name)')
```

## Prevention

Add this to code review checklist:

- Any new table with `user_id → auth.users(id)` must use `!inner` when joining
  `user_profiles`
- Test all endpoints that join user data before merging
