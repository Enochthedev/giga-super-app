# ✅ Verified Schema Patterns - Giga Platform

**Date**: 2025-11-22  
**Status**: All foreign key relationships are correctly configured

## Executive Summary

The Giga platform database schema **correctly implements** the `user_id`
reference pattern across all profile-based relationships. No code changes are
needed.

---

## Schema Architecture

### Profile Tables Structure

All profile tables follow this consistent pattern:

| Table                 | Primary Key | User Reference   | Unique Constraint  |
| --------------------- | ----------- | ---------------- | ------------------ |
| `host_profiles`       | `id` (UUID) | `user_id` (UUID) | ✅ UNIQUE NOT NULL |
| `driver_profiles`     | `id` (UUID) | `user_id` (UUID) | ✅ UNIQUE NOT NULL |
| `advertiser_profiles` | `id` (UUID) | `user_id` (UUID) | ✅ UNIQUE NOT NULL |
| `vendor_profiles`     | `id` (UUID) | `user_id` (UUID) | ✅ UNIQUE NOT NULL |
| `customer_profiles`   | `id` (UUID) | `user_id` (UUID) | ✅ UNIQUE NOT NULL |

### Business Tables Foreign Keys

All business tables reference `user_id` from profile tables:

```sql
-- Hotels → Host Profiles
CREATE TABLE hotels (
  host_id uuid NOT NULL,
  -- ...
  CONSTRAINT hotels_host_id_fkey
    FOREIGN KEY (host_id) REFERENCES public.host_profiles(user_id)
);

-- Rides → Driver Profiles
CREATE TABLE rides (
  driver_id uuid NOT NULL,
  passenger_id uuid NOT NULL,
  -- ...
  CONSTRAINT rides_driver_id_fkey
    FOREIGN KEY (driver_id) REFERENCES public.driver_profiles(user_id),
  CONSTRAINT rides_passenger_id_fkey
    FOREIGN KEY (passenger_id) REFERENCES auth.users(id)
);

-- Ad Campaigns → Advertiser Profiles
CREATE TABLE ad_campaigns (
  advertiser_id uuid NOT NULL,
  -- ...
  CONSTRAINT ad_campaigns_advertiser_id_fkey
    FOREIGN KEY (advertiser_id) REFERENCES public.advertiser_profiles(user_id)
);
```

---

## ✅ Verified Code Patterns

### 1. Create Hotel (hotels.host_id)

**File**: `/supabase/functions/create-hotel/index.ts`

```typescript
// ✅ CORRECT - Using user.id directly
const { data: hotel, error: hotelError } = await supabaseClient
  .from('hotels')
  .insert({
    host_id: user.id, // References host_profiles.user_id
    name: hotelData.name,
    // ...
  });
```

**Status**: ✅ Correct

### 2. Querying Hotels with Host Info

Multiple functions correctly use the foreign key relationship:

```typescript
// From Get-hotel-details/index.ts, Search-hotels/index.ts
.select(`
    *,
    host_profiles!hotels_host_id_fkey(
        business_name,
        description,
        rating
    )
`)
```

**Status**: ✅ Correct - Uses explicit foreign key name

### 3. Authorization Checks

Functions correctly compare `user.id` with `host_id`:

```typescript
// From update-hotel/index.ts, delete-hotel/index.ts
const { data: hotel } = await supabaseClient
  .from('hotels')
  .select('host_id')
  .eq('id', hotelId)
  .single();

if (hotel.host_id !== user.id && profile?.role !== 'admin') {
  throw new Error('Unauthorized');
}
```

**Status**: ✅ Correct

---

## Pattern Benefits

### 1. **Simplicity**

- Business tables store the auth user ID directly
- No intermediate join needed to get to the user

### 2. **Performance**

```sql
-- Single join to get user info
SELECT h.*, hp.business_name
FROM hotels h
JOIN host_profiles hp ON h.host_id = hp.user_id
WHERE h.id = 'hotel-uuid';
```

### 3. **Type Safety**

TypeScript types automatically generated from Supabase reflect this:

```typescript
// From types.ts
hotels: {
  Relationships: [{
    foreignKeyName: "hotels_host_id_fkey"
    columns: ["host_id"]
    referencedRelation: "host_profiles"
    referencedColumns: ["user_id"]  // ← References user_id
  }]
}
```

---

## Code Guidelines

### ✅ DO: Store user.id in foreign key columns

```typescript
await supabase.from('hotels').insert({
  host_id: user.id, // auth.users.id
});

await supabase.from('rides').insert({
  driver_id: user.id, // auth.users.id
  passenger_id: user.id,
});

await supabase.from('ad_campaigns').insert({
  advertiser_id: user.id, // auth.users.id
});
```

### ❌ DON'T: Fetch and use profile.id

```typescript
// ❌ WRONG
const { data: profile } = await supabase
  .from('host_profiles')
  .select('id') // Don't use this
  .eq('user_id', user.id)
  .single();

await supabase.from('hotels').insert({
  host_id: profile.id, // WRONG!
});
```

### ✅ DO: Use explicit foreign key names in joins

```typescript
.select(`
  *,
  host_profiles!hotels_host_id_fkey(business_name, rating)
`)
```

### ✅ DO: Compare user.id for authorization

```typescript
if (hotel.host_id !== user.id) {
  throw new Error('Unauthorized');
}
```

---

## Verification Checklist

- [x] Schema foreign keys reference `user_id` columns
- [x] `create-hotel` uses `user.id` for `host_id`
- [x] Authorization checks compare `host_id` with `user.id`
- [x] Joins use correct foreign key relationships
- [x] TypeScript types reflect actual schema
- [x] No code fetches `profile.id` for foreign keys

---

## Summary

✅ **All verified correct!** No changes needed to schema or code.

The Giga platform correctly implements the `user_id` reference pattern across
all profile-based relationships. This pattern provides simplicity, performance,
and type safety.

## Related Documentation

- See `SCHEMA_ANALYSIS.md` for detailed schema breakdown
- See individual Edge Function files for implementation examples
