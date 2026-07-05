-- ============================================================================
-- Add South Africa (ZAR) region + enforce region pricing-currency invariant.
--
-- South Africa is the one routing-matrix currency (ZAR, settled via Paystack)
-- that had no region. This adds it (country + Johannesburg city) consistent
-- with the geo-region foundation pattern (country_code + E.164 phone_code), and
-- enforces the currency invariant on the currency-bearing tiers so region-based
-- pricing never silently falls back to the platform default (NGN) for a
-- non-NGN region.
--
-- Routing matrix: Paystack -> NGN/GHS/KES/ZAR/USD, Stripe -> EUR/GBP.
--
-- Runs after 20260619000000_geo_region_foundation (adds phone_code, UK/London)
-- and 20260619000100_signup_region_tagging. Idempotent / safe to re-run.
-- ============================================================================

-- Defensive: ensure phone_code exists even if applied out of expected order.
ALTER TABLE "public"."nipost_regions"
  ADD COLUMN IF NOT EXISTS "phone_code" "text";

-- South Africa (country under Africa)
INSERT INTO "public"."nipost_regions"
  ("region_name", "region_code", "region_type", "parent_region_id", "country_code", "phone_code", "currency", "timezone")
SELECT 'South Africa', 'ZA', 'country',
       (SELECT "id" FROM "public"."nipost_regions" WHERE "region_code" = 'AF'),
       'ZA', '+27', 'ZAR', 'Africa/Johannesburg'
ON CONFLICT ("region_code") DO NOTHING;

-- Johannesburg (city under South Africa)
INSERT INTO "public"."nipost_regions"
  ("region_name", "region_code", "region_type", "parent_region_id", "country_code")
SELECT 'Johannesburg', 'JNB', 'city',
       (SELECT "id" FROM "public"."nipost_regions" WHERE "region_code" = 'ZA'),
       'ZA'
ON CONFLICT ("region_code") DO NOTHING;

-- ----------------------------------------------------------------------------
-- Currency invariant on the currency-bearing tiers. UPDATE-only, idempotent.
-- Continents that span multiple currencies stay NULL; their countries carry
-- the authoritative value.
-- ----------------------------------------------------------------------------
UPDATE "public"."nipost_regions"
SET "currency" = 'EUR', "updated_at" = now()
WHERE "region_code" = 'EU' AND "currency" IS DISTINCT FROM 'EUR';

UPDATE "public"."nipost_regions"
SET "currency" = 'USD', "updated_at" = now()
WHERE "region_code" = 'NA' AND "currency" IS DISTINCT FROM 'USD';

UPDATE "public"."nipost_regions" AS "r"
SET "currency" = "v"."currency", "updated_at" = now()
FROM (VALUES
  ('NG', 'NGN'),
  ('GH', 'GHS'),
  ('KE', 'KES'),
  ('ZA', 'ZAR'),
  ('GB', 'GBP')
) AS "v"("region_code", "currency")
WHERE "r"."region_code" = "v"."region_code"
  AND "r"."region_type" = 'country'
  AND "r"."currency" IS DISTINCT FROM "v"."currency";
