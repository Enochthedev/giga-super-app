-- ============================================================================
-- ADD RIDE REJECTIONS TABLE
-- Tracks which drivers have rejected which rides so they don't appear in polls
-- ============================================================================

BEGIN;

-- 1. Create Ride Rejections Table
CREATE TABLE IF NOT EXISTS public.ride_rejections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES auth.users(id) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(ride_id, driver_id)  -- A driver can only reject a ride once
);

-- 2. Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ride_rejections_driver ON public.ride_rejections(driver_id);
CREATE INDEX IF NOT EXISTS idx_ride_rejections_ride ON public.ride_rejections(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_rejections_composite ON public.ride_rejections(driver_id, ride_id);

-- 3. Enable RLS
ALTER TABLE public.ride_rejections ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Drivers can insert their own rejections
CREATE POLICY "Drivers can insert own rejections"
  ON public.ride_rejections
  FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

-- Drivers can read their own rejections
CREATE POLICY "Drivers can read own rejections"
  ON public.ride_rejections
  FOR SELECT
  USING (auth.uid() = driver_id);

-- Service role can do everything (for server-side operations)
CREATE POLICY "Service role full access on ride_rejections"
  ON public.ride_rejections
  FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
