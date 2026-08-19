-- T1: a ride has at most one earnings row. Adds the UNIQUE constraint the ride-completion
-- upsert(onConflict: 'ride_id') needs so a retried completion is idempotent rather than failing
-- or double-crediting. No existing duplicate ride_id rows. Applied live 2026-08-19 via MCP.
ALTER TABLE public.driver_earnings
  ADD CONSTRAINT driver_earnings_ride_id_key UNIQUE (ride_id);
