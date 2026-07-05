-- ============================================================================
-- Per-entity pricing currency (region-based pricing, data layer).
--
-- Currency for a transaction is determined by the region of the listing/service
-- being sold (not the buyer). To make that resolvable at payment time without
-- fragile joins, the priced entities carry their own currency, stamped at
-- creation from the owner's region:
--   * hotels            <- host's region
--   * ecommerce_products<- vendor's region
--   * rides             <- driver's region
--   * hotel_bookings    <- copied from the booked hotel
--   * ecommerce_orders  <- from the cart's items (carts are single-currency)
--
-- All columns default to 'NGN' so existing rows and flows are unchanged until
-- the write-paths begin populating real currencies. region_id is added to the
-- listing/service tables for traceability back to the source region.
--
-- Additive and idempotent. Safe no-op behaviour for the existing all-NGN data.
-- ============================================================================

-- Listings / services: carry currency + source region.
ALTER TABLE "public"."hotels"
  ADD COLUMN IF NOT EXISTS "currency" "text" NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS "region_id" "uuid" REFERENCES "public"."nipost_regions"("id");

ALTER TABLE "public"."ecommerce_products"
  ADD COLUMN IF NOT EXISTS "currency" "text" NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS "region_id" "uuid" REFERENCES "public"."nipost_regions"("id");

ALTER TABLE "public"."rides"
  ADD COLUMN IF NOT EXISTS "currency" "text" NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS "region_id" "uuid" REFERENCES "public"."nipost_regions"("id");

-- Transaction records: inherit currency from the listing at creation.
ALTER TABLE "public"."hotel_bookings"
  ADD COLUMN IF NOT EXISTS "currency" "text" NOT NULL DEFAULT 'NGN';

ALTER TABLE "public"."ecommerce_orders"
  ADD COLUMN IF NOT EXISTS "currency" "text" NOT NULL DEFAULT 'NGN';

-- Indexes for region_id lookups.
CREATE INDEX IF NOT EXISTS "idx_hotels_region_id"
  ON "public"."hotels" USING "btree" ("region_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_products_region_id"
  ON "public"."ecommerce_products" USING "btree" ("region_id");
CREATE INDEX IF NOT EXISTS "idx_rides_region_id"
  ON "public"."rides" USING "btree" ("region_id");

COMMENT ON COLUMN "public"."hotels"."currency"
  IS 'ISO-4217 pricing currency, stamped from the host''s region at creation. Drives payment processor routing.';
COMMENT ON COLUMN "public"."ecommerce_products"."currency"
  IS 'ISO-4217 pricing currency, stamped from the vendor''s region at creation.';
COMMENT ON COLUMN "public"."rides"."currency"
  IS 'ISO-4217 pricing currency, stamped from the driver''s region.';
COMMENT ON COLUMN "public"."hotel_bookings"."currency"
  IS 'ISO-4217 currency copied from the booked hotel at booking time.';
COMMENT ON COLUMN "public"."ecommerce_orders"."currency"
  IS 'ISO-4217 currency from the cart''s items; carts are constrained to a single currency.';
