-- ============================================================================
-- GIGA TAXI SERVICE - SCHEMA MIGRATION
-- ============================================================================

BEGIN;

-- 1. Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create Vehicle Types Table
CREATE TABLE IF NOT EXISTS public.vehicle_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER DEFAULT 4,
  price_multiplier DECIMAL(3,2) DEFAULT 1.0,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed Vehicle Types
INSERT INTO public.vehicle_types (slug, name, description, capacity, price_multiplier, icon) VALUES
('economy', 'Economy', 'Affordable rides for everyday', 4, 0.8, '🚗'),
('standard', 'Standard', 'Comfortable sedans', 4, 1.0, '🚙'),
('premium', 'Premium', 'Luxury vehicles for style', 4, 1.5, '🚘'),
('xl', 'XL', 'Larger vehicles for groups', 6, 1.3, '🚐')
ON CONFLICT (slug) DO NOTHING;

-- 3. Create Surge Pricing Zones Table
CREATE TABLE IF NOT EXISTS public.surge_pricing_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  area GEOGRAPHY(POLYGON, 4326) NOT NULL,
  multiplier DECIMAL(3,2) DEFAULT 1.5,
  is_active BOOLEAN DEFAULT true,
  start_time TIME,
  end_time TIME,
  days_of_week INTEGER[], -- 0=Sunday, 6=Saturday
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surge_zones_area ON public.surge_pricing_zones USING GIST(area);

-- 4. Create Driver Earnings Table
CREATE TABLE IF NOT EXISTS public.driver_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES auth.users(id) NOT NULL,
  ride_id UUID REFERENCES public.rides(id),
  amount DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2) NOT NULL,
  net_earning DECIMAL(10,2) NOT NULL,
  payout_status TEXT DEFAULT 'pending', -- pending, processing, paid
  payout_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver ON public.driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_date ON public.driver_earnings(created_at);

-- 5. Create Ride Tracking Table (History of location points)
CREATE TABLE IF NOT EXISTS public.ride_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID REFERENCES public.rides(id) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  heading DECIMAL(5,2),
  speed DECIMAL(5,2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ride_tracking_ride ON public.ride_tracking(ride_id);

-- 6. Update Rides Table with new columns
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS driver_eta_minutes INTEGER;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10,2);
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS actual_distance_km DECIMAL(10,2);
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS final_fare DECIMAL(10,2);
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS cancelled_by TEXT; -- 'rider' or 'driver'
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP WITH TIME ZONE;

-- 7. Update Driver Profiles Table
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS last_location GEOGRAPHY(POINT, 4326);
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS last_location_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS heading DECIMAL(5,2);
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS speed DECIMAL(5,2);
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'standard';
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS total_rides INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_driver_location ON public.driver_profiles USING GIST(last_location);

-- 8. Create Function to Find Nearby Drivers
CREATE OR REPLACE FUNCTION public.find_nearby_drivers(
  target_lat DOUBLE PRECISION,
  target_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION,
  vehicle_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  distance_km DOUBLE PRECISION,
  last_location GEOGRAPHY,
  vehicle_type TEXT,
  rating NUMERIC,
  total_rides INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.user_id,
    ST_Distance(
      dp.last_location::geography,
      ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography
    ) / 1000 AS distance_km,
    dp.last_location,
    dp.vehicle_type,
    dp.rating,
    dp.total_rides
  FROM public.driver_profiles dp
  WHERE dp.is_available = true
    AND dp.is_verified = true
    AND (vehicle_type_filter IS NULL OR dp.vehicle_type = vehicle_type_filter)
    AND dp.last_location IS NOT NULL
    AND ST_DWithin(
      dp.last_location::geography,
      ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- 9. Create Platform Settings Table (Admin Configurable)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  value_type TEXT DEFAULT 'string', -- string, number, boolean, json
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(category, key)
);

-- Seed Taxi Pricing Settings
INSERT INTO public.platform_settings (category, key, value, value_type, description) VALUES
('taxi_pricing', 'base_fare', '500', 'number', 'Base fare for all rides (NGN)'),
('taxi_pricing', 'cost_per_km', '100', 'number', 'Cost per kilometer (NGN)'),
('taxi_pricing', 'cost_per_minute', '20', 'number', 'Cost per minute (NGN)'),
('taxi_pricing', 'min_fare', '300', 'number', 'Minimum fare (NGN)'),
('taxi_pricing', 'surge_multiplier_max', '3.0', 'number', 'Maximum surge multiplier'),
('taxi_pricing', 'cancellation_fee', '200', 'number', 'Cancellation fee after grace period (NGN)'),
('taxi_pricing', 'cancellation_grace_period_minutes', '5', 'number', 'Free cancellation within this period'),
('taxi_commission', 'driver_commission_rate', '0.80', 'number', 'Driver keeps this % (0.80 = 80%)'),
('taxi_commission', 'platform_commission_rate', '0.20', 'number', 'Platform takes this % (0.20 = 20%)'),
('taxi_settings', 'driver_search_radius_km', '10', 'number', 'How far to search for drivers'),
('taxi_settings', 'max_drivers_to_notify', '5', 'number', 'How many drivers to notify per request')
ON CONFLICT (category, key) DO NOTHING;

-- Create Function to Get Setting
CREATE OR REPLACE FUNCTION public.get_platform_setting(
  setting_category TEXT,
  setting_key TEXT,
  default_value TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT value INTO result
  FROM public.platform_settings
  WHERE category = setting_category AND key = setting_key;
  
  RETURN COALESCE(result, default_value);
END;
$$ LANGUAGE plpgsql;

COMMIT;
