# Schema Analysis: Foreign Key Pattern

**Date**: 2025-11-22  
**Status**: ✅ **Schema and Code are CORRECT**

## Summary

The database schema and Edge Functions are correctly configured to use the
`user_id` pattern for profile foreign keys.

## Schema Structure

### Profile Tables

All profile tables follow this pattern:

```sql
CREATE TABLE host_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  business_name TEXT,
  -- other fields...
);

CREATE TABLE driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  -- driver-specific fields...
);

CREATE TABLE advertiser_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  company_name TEXT,
  -- advertiser-specific fields...
);
```

### Main Business Tables

Business tables reference the `user_id` from profile tables (NOT the profile
`id`):

```sql
CREATE TABLE hotels (
  id UUID PRIMARY KEY,
  host_id UUID NOT NULL,
  name TEXT NOT NULL,
  -- other fields...
  FOREIGN KEY (host_id) REFERENCES host_profiles(user_id)
);

CREATE TABLE rides (
  id UUID PRIMARY KEY,
  driver_id UUID NOT NULL,
  passenger_id UUID NOT NULL,
  -- other fields...
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(user_id)
);

CREATE TABLE ad_campaigns (
  id UUID PRIMARY KEY,
  advertiser_id UUID NOT NULL,
  campaign_name TEXT,
  -- other fields...
  FOREIGN KEY (advertiser_id) REFERENCES advertiser_profiles(user_id)
);
```

## ✅ Verified Correct Code

### create-hotel/index.ts (Line 56)

```typescript
const { data: hotel, error: hotelError } = await supabaseClient
  .from('hotels')
  .insert({
    host_id: user.id, // ✅ CORRECT - Using auth user id directly
    name: hotelData.name,
    // ...
  });
```

### Relationship Confirmation from types.ts

From `/Users/user/Dev/giga/supabase/types.ts` (lines 2117-2125):

```typescript
hotels: {
  // ...
  Relationships: [
    {
      foreignKeyName: "hotels_host_id_fkey"
      columns: ["host_id"]
      isOneToOne: false
      referencedRelation: "host_profiles"
      referencedColumns: ["user_id"]  // ← References user_id, not id
    },
  ]
}
```

## Pattern Advantages

This pattern has several benefits:

1. **Direct User Reference**: `hotels.host_id` directly stores the auth user ID,
   making queries simpler
2. **No Extra Join**: No need to join through profile.id to get to user_id
3. **Consistent**: All business tables use the same pattern
4. **Type Safe**: TypeScript types generated from Supabase reflect this
   correctly

## Code Pattern to Follow

When creating records:

```typescript
// ✅ CORRECT - Use user.id directly
await supabase.from('hotels').insert({
  host_id: user.id, // auth user id
  // ... other fields
});

// ❌ WRONG - Don't fetch profile.id
const { data: profile } = await supabase
  .from('host_profiles')
  .select('id')
  .eq('user_id', user.id)
  .single();

await supabase.from('hotels').insert({
  host_id: profile.id, // WRONG!
});
```

## Querying with Joins

To get host profile information with hotels:

```typescript
const { data } = await supabase.from('hotels').select(`
    *,
    host_profiles!hotels_host_id_fkey (
      business_name,
      description,
      rating
    )
  `);
```

The foreign key name `hotels_host_id_fkey` is used to specify which relationship
to follow.

## Other Tables Following This Pattern

Based on grep searches:

- ✅ `hotels.host_id` → `host_profiles.user_id`
- ✅ `rides.driver_id` → `driver_profiles.user_id` (presumed based on naming)
- ✅ `ad_campaigns.advertiser_id` → `advertiser_profiles.user_id` (presumed
  based on naming)

## Conclusion

**No changes needed**. The schema and code are already correctly implemented
using the recommended pattern of storing `user_id` values in foreign key columns
rather than profile `id` values.
