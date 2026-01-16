-- ============================================================================
-- Delivery Service Database Schema
-- Complete schema for delivery/logistics functionality
-- ============================================================================

-- ============================================================================
-- Tables
-- ============================================================================

-- Delivery packages
CREATE TABLE IF NOT EXISTS delivery_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES user_profiles(id),
  recipient_id UUID REFERENCES user_profiles(id),
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  sender_lat DECIMAL(10, 8),
  sender_lng DECIMAL(11, 8),
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  recipient_lat DECIMAL(10, 8),
  recipient_lng DECIMAL(11, 8),
  package_description TEXT,
  package_weight DECIMAL(10,2),
  package_dimensions JSONB, -- {length, width, height}
  delivery_fee DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  delivery_instructions TEXT,
  estimated_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  proof_of_delivery JSONB, -- {signature, photo_url, notes}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Courier profiles (aligns with existing code)
CREATE TABLE IF NOT EXISTS courier_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) UNIQUE NOT NULL,
  courier_code TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('bicycle', 'motorcycle', 'car', 'van', 'truck')),
  vehicle_registration TEXT,
  vehicle_capacity_kg DECIMAL(10,2) DEFAULT 50,
  max_delivery_radius_km DECIMAL(10,2) DEFAULT 20,
  license_number TEXT,
  license_expiry DATE,
  is_online BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  current_load_kg DECIMAL(10,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_deliveries INTEGER DEFAULT 0,
  completed_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  cancelled_deliveries INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  average_delivery_time_minutes INTEGER,
  on_time_delivery_rate DECIMAL(5,2) DEFAULT 100.0,
  last_location_update TIMESTAMPTZ,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
  availability_status TEXT DEFAULT 'offline' CHECK (availability_status IN ('available', 'busy', 'offline', 'on_break')),
  verification_documents JSONB,
  performance_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery assignments (aligns with existing code)
CREATE TABLE IF NOT EXISTS delivery_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID, -- References ecommerce_orders(id) - external table
  package_id UUID REFERENCES delivery_packages(id),
  courier_id UUID REFERENCES courier_profiles(id) NOT NULL,
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10, 8),
  pickup_lng DECIMAL(11, 8),
  pickup_instructions TEXT,
  delivery_address TEXT NOT NULL,
  delivery_lat DECIMAL(10, 8),
  delivery_lng DECIMAL(11, 8),
  delivery_instructions TEXT,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  sender_name TEXT,
  sender_phone TEXT,
  package_weight_kg DECIMAL(10,2),
  package_dimensions JSONB,
  package_description TEXT,
  special_instructions TEXT,
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  delivery_fee DECIMAL(10,2) NOT NULL,
  courier_commission DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'assigned', 'accepted', 'rejected',
    'courier_en_route_pickup', 'arrived_at_pickup', 'picked_up',
    'in_transit', 'arrived_at_delivery', 'out_for_delivery',
    'delivered', 'failed', 'cancelled', 'returned'
  )),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  rejection_reason TEXT,
  failure_reason TEXT,
  cancellation_reason TEXT,
  estimated_pickup_time TIMESTAMPTZ,
  estimated_delivery_time TIMESTAMPTZ,
  actual_pickup_time TIMESTAMPTZ,
  actual_delivery_time TIMESTAMPTZ,
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  distance_km DECIMAL(10,2),
  estimated_distance_km DECIMAL(10,2),
  delivery_scheduled_at TIMESTAMPTZ,
  proof_of_delivery JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Route optimizations (aligns with existing code)
CREATE TABLE IF NOT EXISTS route_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID REFERENCES courier_profiles(id) NOT NULL,
  assignment_ids UUID[] NOT NULL, -- Array of assignment IDs
  optimized_sequence INTEGER[] NOT NULL, -- Optimized order of assignments
  route_date DATE DEFAULT CURRENT_DATE,
  optimized_route_data JSONB, -- Google Maps route data
  waypoints JSONB, -- Array of waypoint details
  total_distance_km DECIMAL(10,2),
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  efficiency_score DECIMAL(5,2),
  estimated_fuel_cost DECIMAL(10,2),
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package tracking history (aligns with existing code)
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES delivery_assignments(id) NOT NULL,
  courier_id UUID REFERENCES courier_profiles(id) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy_meters DECIMAL(10,2),
  speed_kmh DECIMAL(10,2),
  heading_degrees DECIMAL(5,2),
  battery_level INTEGER,
  status TEXT NOT NULL,
  location_name TEXT,
  notes TEXT,
  photo_urls TEXT[],
  device_info JSONB,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courier ratings and reviews
CREATE TABLE IF NOT EXISTS delivery_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES delivery_assignments(id) NOT NULL,
  courier_id UUID REFERENCES courier_profiles(id) NOT NULL,
  reviewer_id UUID REFERENCES user_profiles(id) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  tags TEXT[], -- ['punctual', 'professional', 'friendly']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, reviewer_id)
);

-- Courier earnings and payouts
CREATE TABLE IF NOT EXISTS delivery_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID REFERENCES courier_profiles(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  payment_method TEXT,
  payment_reference TEXT,
  deliveries_count INTEGER NOT NULL,
  total_distance_km DECIMAL(10,2),
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Packages indexes
CREATE INDEX IF NOT EXISTS idx_delivery_packages_status ON delivery_packages(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_packages_sender ON delivery_packages(sender_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_packages_recipient ON delivery_packages(recipient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_packages_created ON delivery_packages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_packages_priority ON delivery_packages(priority, status);
CREATE INDEX IF NOT EXISTS idx_delivery_packages_location ON delivery_packages(sender_lat, sender_lng);

-- Couriers indexes
CREATE INDEX IF NOT EXISTS idx_courier_profiles_available ON courier_profiles(is_available, is_active);
CREATE INDEX IF NOT EXISTS idx_courier_profiles_online ON courier_profiles(is_online, is_available);
CREATE INDEX IF NOT EXISTS idx_courier_profiles_location ON courier_profiles(current_lat, current_lng) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_courier_profiles_user ON courier_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_courier_profiles_rating ON courier_profiles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_courier_profiles_code ON courier_profiles(courier_code);

-- Assignments indexes
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_courier ON delivery_assignments(courier_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_package ON delivery_assignments(package_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_status ON delivery_assignments(status, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_created ON delivery_assignments(created_at DESC);

-- Tracking indexes
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_assignment ON delivery_tracking(assignment_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_courier ON delivery_tracking(courier_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_timestamp ON delivery_tracking(timestamp DESC);

-- Routes indexes
CREATE INDEX IF NOT EXISTS idx_route_optimizations_courier ON route_optimizations(courier_id, route_date DESC);
CREATE INDEX IF NOT EXISTS idx_route_optimizations_status ON route_optimizations(status, route_date);
CREATE INDEX IF NOT EXISTS idx_route_optimizations_date ON route_optimizations(route_date DESC);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_delivery_reviews_courier ON delivery_reviews(courier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_reviews_assignment ON delivery_reviews(assignment_id);

-- Payouts indexes
CREATE INDEX IF NOT EXISTS idx_delivery_payouts_courier ON delivery_payouts(courier_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_payouts_status ON delivery_payouts(status, created_at DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE delivery_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_payouts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Packages Policies
-- ============================================================================

CREATE POLICY "Users can view their own packages" ON delivery_packages
  FOR SELECT USING (
    auth.uid() = sender_id OR
    auth.uid() = recipient_id OR
    EXISTS (
      SELECT 1 FROM courier_profiles cp
      JOIN delivery_assignments da ON cp.id = da.courier_id
      WHERE cp.user_id = auth.uid() AND da.package_id = delivery_packages.id
    )
  );

CREATE POLICY "Users can create packages" ON delivery_packages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Senders can update their packages" ON delivery_packages
  FOR UPDATE USING (
    auth.uid() = sender_id AND
    status IN ('pending', 'assigned') AND
    deleted_at IS NULL
  );

CREATE POLICY "Senders can cancel their packages" ON delivery_packages
  FOR UPDATE USING (
    auth.uid() = sender_id AND
    status IN ('pending', 'assigned', 'picked_up')
  );

CREATE POLICY "Service role has full access to packages" ON delivery_packages
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Couriers Policies
-- ============================================================================

CREATE POLICY "Couriers can manage their own profile" ON courier_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view active available couriers" ON courier_profiles
  FOR SELECT USING (is_available = true AND is_active = true);

CREATE POLICY "Service role has full access to couriers" ON courier_profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Assignments Policies
-- ============================================================================

CREATE POLICY "Couriers can view their assignments" ON delivery_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courier_profiles
      WHERE id = courier_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Package owners can view assignments" ON delivery_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM delivery_packages
      WHERE id = package_id AND (sender_id = auth.uid() OR recipient_id = auth.uid())
    ) OR
    -- Allow viewing by order_id if ecommerce integration
    (order_id IS NOT NULL)
  );

CREATE POLICY "Couriers can update their assignments" ON delivery_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM courier_profiles
      WHERE id = courier_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to assignments" ON delivery_assignments
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Routes Policies
-- ============================================================================

CREATE POLICY "Couriers can manage their routes" ON route_optimizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courier_profiles
      WHERE id = courier_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to routes" ON route_optimizations
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Tracking Policies
-- ============================================================================

CREATE POLICY "Assignment owners can view tracking" ON delivery_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM delivery_assignments da
      LEFT JOIN delivery_packages dp ON da.package_id = dp.id
      WHERE da.id = assignment_id AND (
        dp.sender_id = auth.uid() OR
        dp.recipient_id = auth.uid() OR
        da.order_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Couriers can view their tracking data" ON delivery_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courier_profiles
      WHERE id = courier_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to tracking" ON delivery_tracking
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Reviews Policies
-- ============================================================================

CREATE POLICY "Users can view reviews for their assignments" ON delivery_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM delivery_assignments da
      LEFT JOIN delivery_packages dp ON da.package_id = dp.id
      WHERE da.id = assignment_id AND (
        dp.sender_id = auth.uid() OR
        dp.recipient_id = auth.uid() OR
        da.order_id IS NOT NULL
      )
    ) OR
    EXISTS (
      SELECT 1 FROM courier_profiles
      WHERE id = courier_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Assignment owners can create reviews" ON delivery_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM delivery_assignments da
      LEFT JOIN delivery_packages dp ON da.package_id = dp.id
      WHERE da.id = assignment_id AND
      (dp.sender_id = auth.uid() OR dp.recipient_id = auth.uid() OR da.order_id IS NOT NULL) AND
      da.status = 'delivered'
    )
  );

CREATE POLICY "Reviewers can update their own reviews" ON delivery_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- ============================================================================
-- Payouts Policies
-- ============================================================================

CREATE POLICY "Couriers can view their payouts" ON delivery_payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courier_profiles
      WHERE id = courier_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to payouts" ON delivery_payouts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Functions
-- ============================================================================

-- Update courier rating
CREATE OR REPLACE FUNCTION update_courier_rating(target_courier_id UUID)
RETURNS VOID AS $$
DECLARE
  avg_rating DECIMAL(3,2);
BEGIN
  SELECT COALESCE(AVG(rating), 5.0)
  INTO avg_rating
  FROM delivery_reviews
  WHERE courier_id = target_courier_id;

  UPDATE courier_profiles
  SET rating = avg_rating,
      updated_at = NOW()
  WHERE id = target_courier_id;
END;
$$ LANGUAGE plpgsql;

-- Update courier stats
CREATE OR REPLACE FUNCTION update_courier_stats(target_courier_id UUID)
RETURNS VOID AS $$
DECLARE
  avg_time INTEGER;
  on_time_rate DECIMAL(5,2);
BEGIN
  -- Calculate average delivery time
  SELECT AVG(actual_duration_minutes)
  INTO avg_time
  FROM delivery_assignments
  WHERE courier_id = target_courier_id AND status = 'delivered';

  -- Calculate on-time delivery rate
  SELECT COALESCE(
    (COUNT(*) FILTER (WHERE actual_delivery_time <= estimated_delivery_time)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    100.0
  )
  INTO on_time_rate
  FROM delivery_assignments
  WHERE courier_id = target_courier_id AND status = 'delivered';

  UPDATE courier_profiles
  SET
    total_deliveries = (
      SELECT COUNT(*)
      FROM delivery_assignments
      WHERE courier_id = target_courier_id
    ),
    completed_deliveries = (
      SELECT COUNT(*)
      FROM delivery_assignments
      WHERE courier_id = target_courier_id AND status = 'delivered'
    ),
    failed_deliveries = (
      SELECT COUNT(*)
      FROM delivery_assignments
      WHERE courier_id = target_courier_id AND status IN ('failed', 'returned')
    ),
    cancelled_deliveries = (
      SELECT COUNT(*)
      FROM delivery_assignments
      WHERE courier_id = target_courier_id AND status IN ('cancelled', 'rejected')
    ),
    total_earnings = (
      SELECT COALESCE(SUM(courier_commission), 0)
      FROM delivery_assignments
      WHERE courier_id = target_courier_id AND status = 'delivered'
    ),
    average_delivery_time_minutes = avg_time,
    on_time_delivery_rate = on_time_rate,
    updated_at = NOW()
  WHERE id = target_courier_id;
END;
$$ LANGUAGE plpgsql;

-- Get available couriers near location
CREATE OR REPLACE FUNCTION get_nearby_couriers(
  target_lat DECIMAL(10,8),
  target_lng DECIMAL(11,8),
  radius_km DECIMAL DEFAULT 10,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  courier_id UUID,
  distance_km DECIMAL,
  rating DECIMAL,
  vehicle_type TEXT,
  current_load_kg DECIMAL,
  vehicle_capacity_kg DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    (6371 * acos(
      cos(radians(target_lat)) *
      cos(radians(cp.current_lat)) *
      cos(radians(cp.current_lng) - radians(target_lng)) +
      sin(radians(target_lat)) *
      sin(radians(cp.current_lat))
    )) AS distance_km,
    cp.rating,
    cp.vehicle_type,
    cp.current_load_kg,
    cp.vehicle_capacity_kg
  FROM courier_profiles cp
  WHERE
    cp.is_available = true
    AND cp.is_active = true
    AND cp.current_lat IS NOT NULL
    AND cp.current_lng IS NOT NULL
    AND (6371 * acos(
      cos(radians(target_lat)) *
      cos(radians(cp.current_lat)) *
      cos(radians(cp.current_lng) - radians(target_lng)) +
      sin(radians(target_lat)) *
      sin(radians(cp.current_lat))
    )) <= radius_km
  ORDER BY distance_km ASC, cp.rating DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_courier_rating TO authenticated;
GRANT EXECUTE ON FUNCTION update_courier_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_couriers TO authenticated;
