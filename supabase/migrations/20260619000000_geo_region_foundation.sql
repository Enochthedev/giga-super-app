-- ============================================================================
-- Geo-region foundation (Phase 0)
--
-- Goal: make every user and every admin carry a region tag from the existing
-- nipost_regions tree, add a phone dialing-code -> region mapping for
-- location-based phone registration, and provide SQL helpers to expand a
-- region into its full subtree (so a "London" admin transparently covers
-- London + its districts) and to test region containment.
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tag regular users with a region (the missing link to scope users by).
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "region_id" "uuid" REFERENCES "public"."nipost_regions"("id");

CREATE INDEX IF NOT EXISTS "idx_user_profiles_region_id"
  ON "public"."user_profiles" USING "btree" ("region_id");

COMMENT ON COLUMN "public"."user_profiles"."region_id"
  IS 'Region tag (nipost_regions) assigned at registration; drives geo-scoped admin visibility.';

-- ----------------------------------------------------------------------------
-- 2. Tag admins with a region (the admin "geolocation tag").
--    Kept alongside the legacy flat state_id/state_name for back-compat.
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."nipost_user_permissions"
  ADD COLUMN IF NOT EXISTS "region_id" "uuid" REFERENCES "public"."nipost_regions"("id");

CREATE INDEX IF NOT EXISTS "idx_nipost_user_permissions_region_id"
  ON "public"."nipost_user_permissions" USING "btree" ("region_id");

COMMENT ON COLUMN "public"."nipost_user_permissions"."region_id"
  IS 'Region scope (nipost_regions). NULL with access_level=national means global (sees everything).';

-- ----------------------------------------------------------------------------
-- 3. Phone dialing-code -> region mapping for country-level rows.
--    Ambiguous codes (e.g. +1) are resolved by an explicit region choice at
--    signup; this is the fallback derivation.
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."nipost_regions"
  ADD COLUMN IF NOT EXISTS "phone_code" "text";

CREATE INDEX IF NOT EXISTS "idx_nipost_regions_phone_code"
  ON "public"."nipost_regions" USING "btree" ("phone_code");

COMMENT ON COLUMN "public"."nipost_regions"."phone_code"
  IS 'E.164 dialing code (e.g. +234) for country-type regions; used to derive a user region from their phone number.';

-- ----------------------------------------------------------------------------
-- 4. Seed: United Kingdom + London, and dialing codes for existing countries.
-- ----------------------------------------------------------------------------
-- United Kingdom (country under Europe)
INSERT INTO "public"."nipost_regions"
  ("region_name", "region_code", "region_type", "parent_region_id", "country_code", "phone_code", "currency", "timezone")
SELECT 'United Kingdom', 'GB', 'country',
       (SELECT "id" FROM "public"."nipost_regions" WHERE "region_code" = 'EU'),
       'GB', '+44', 'GBP', 'Europe/London'
ON CONFLICT ("region_code") DO NOTHING;

-- London (city under United Kingdom)
INSERT INTO "public"."nipost_regions"
  ("region_name", "region_code", "region_type", "parent_region_id", "country_code")
SELECT 'London', 'LDN', 'city',
       (SELECT "id" FROM "public"."nipost_regions" WHERE "region_code" = 'GB'),
       'GB'
ON CONFLICT ("region_code") DO NOTHING;

-- Dialing codes for existing country rows.
UPDATE "public"."nipost_regions" SET "phone_code" = '+234' WHERE "region_code" = 'NG' AND "phone_code" IS NULL;
UPDATE "public"."nipost_regions" SET "phone_code" = '+233' WHERE "region_code" = 'GH' AND "phone_code" IS NULL;
UPDATE "public"."nipost_regions" SET "phone_code" = '+254' WHERE "region_code" = 'KE' AND "phone_code" IS NULL;

-- ----------------------------------------------------------------------------
-- 5. Helper: expand a region into its full subtree (inclusive of itself).
--    A "London" scope returns London + every descendant district/city.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."get_region_descendants"("p_region_id" "uuid")
RETURNS SETOF "uuid"
LANGUAGE "sql" STABLE
AS $$
  WITH RECURSIVE "tree" AS (
    SELECT "id" FROM "public"."nipost_regions" WHERE "id" = "p_region_id"
    UNION ALL
    SELECT "r"."id"
    FROM "public"."nipost_regions" "r"
    JOIN "tree" "t" ON "r"."parent_region_id" = "t"."id"
  )
  SELECT "id" FROM "tree";
$$;

COMMENT ON FUNCTION "public"."get_region_descendants"("uuid")
  IS 'Returns the given region id plus all of its descendant region ids (recursive over parent_region_id).';

-- ----------------------------------------------------------------------------
-- 6. Helper: is a target region within a scope region's subtree?
--    NULL scope = global (always in scope).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."is_region_in_scope"("p_target" "uuid", "p_scope" "uuid")
RETURNS boolean
LANGUAGE "sql" STABLE
AS $$
  SELECT "p_scope" IS NULL
      OR ("p_target" IS NOT NULL
          AND "p_target" IN (SELECT "public"."get_region_descendants"("p_scope")));
$$;

COMMENT ON FUNCTION "public"."is_region_in_scope"("uuid", "uuid")
  IS 'True if p_target is p_scope or any descendant of p_scope. NULL p_scope means global access (always true).';

-- ----------------------------------------------------------------------------
-- 7. Grants (admin-service + edge functions use service_role; allow callers
--    to invoke the helpers via RPC too).
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION "public"."get_region_descendants"("uuid") TO "anon", "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."is_region_in_scope"("uuid", "uuid") TO "anon", "authenticated", "service_role";
