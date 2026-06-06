-- Route Optimization Enhancement Migration
-- This migration adds the route_optimizations table for advanced route optimization functionality
-- Requirements: 3.1, 3.2, 3.5

-- Create route optimization table
CREATE TABLE IF NOT EXISTS "public"."route_optimizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "courier_id" "uuid" NOT NULL REFERENCES "public"."courier_profiles"("id") ON DELETE CASCADE,
    "assignment_ids" "uuid"[] NOT NULL,
    "optimized_sequence" integer[] NOT NULL,
    "total_distance_km" numeric(10,2) NOT NULL,
    "estimated_duration_minutes" integer NOT NULL,
    "estimated_fuel_cost" numeric(8,2) NOT NULL,
    "efficiency_score" integer DEFAULT 0,
    "waypoints" "jsonb" NOT NULL DEFAULT '[]',
    "time_window_violations" "jsonb" DEFAULT '[]',
    "traffic_adjustments" "jsonb" DEFAULT '[]',
    "optimization_algorithm" "text" DEFAULT 'nearest_neighbor',
    "optimization_preferences" "jsonb" DEFAULT '{}',
    "traffic_conditions" "jsonb" DEFAULT '{}',
    "alternative_routes" "jsonb" DEFAULT '[]',
    "route_status" "text" DEFAULT 'active',
    "start_location" "public"."geography"(Point,4326),
    "end_location" "public"."geography"(Point,4326),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    
    CONSTRAINT "route_optimizations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "route_optimizations_distance_check" CHECK ("total_distance_km" >= 0),
    CONSTRAINT "route_optimizations_duration_check" CHECK ("estimated_duration_minutes" >= 0),
    CONSTRAINT "route_optimizations_fuel_cost_check" CHECK ("estimated_fuel_cost" >= 0),
    CONSTRAINT "route_optimizations_efficiency_check" CHECK ("efficiency_score" >= 0 AND "efficiency_score" <= 100),
    CONSTRAINT "route_optimizations_status_check" CHECK ("route_status" IN ('active', 'completed', 'cancelled', 'expired')),
    CONSTRAINT "route_optimizations_algorithm_check" CHECK ("optimization_algorithm" IN ('nearest_neighbor', 'google_maps', 'genetic_algorithm', 'simulated_annealing', 'two_opt'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_route_optimizations_courier_id" ON "public"."route_optimizations" ("courier_id");
CREATE INDEX IF NOT EXISTS "idx_route_optimizations_status" ON "public"."route_optimizations" ("route_status");
CREATE INDEX IF NOT EXISTS "idx_route_optimizations_created_at" ON "public"."route_optimizations" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_route_optimizations_expires_at" ON "public"."route_optimizations" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_route_optimizations_efficiency" ON "public"."route_optimizations" ("efficiency_score" DESC);
CREATE INDEX IF NOT EXISTS "idx_route_optimizations_active" ON "public"."route_optimizations" ("courier_id", "route_status") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_route_optimizations_assignment_ids" ON "public"."route_optimizations" USING GIN ("assignment_ids");

-- Enable Row Level Security
ALTER TABLE "public"."route_optimizations" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for route_optimizations
CREATE POLICY "Couriers can view their route optimizations" ON "public"."route_optimizations"
    FOR SELECT USING (
        courier_id IN (
            SELECT id FROM "public"."courier_profiles" WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Couriers can insert their route optimizations" ON "public"."route_optimizations"
    FOR INSERT WITH CHECK (
        courier_id IN (
            SELECT id FROM "public"."courier_profiles" WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Couriers can update their route optimizations" ON "public"."route_optimizations"
    FOR UPDATE USING (
        courier_id IN (
            SELECT id FROM "public"."courier_profiles" WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all route optimizations" ON "public"."route_optimizations"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "public"."user_roles" ur
            WHERE ur.user_id = auth.uid() AND ur.role_name IN ('ADMIN', 'DISPATCHER')
        )
    );

-- Create trigger for updated_at column
CREATE TRIGGER "update_route_optimizations_updated_at"
    BEFORE UPDATE ON "public"."route_optimizations"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Create function to clean up expired route optimizations
CREATE OR REPLACE FUNCTION "public"."cleanup_expired_route_optimizations"()
RETURNS INTEGER AS $
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Soft delete expired route optimizations
    UPDATE "public"."route_optimizations"
    SET 
        deleted_at = NOW(),
        deletion_reason = 'expired_cleanup'
    WHERE 
        expires_at < NOW() 
        AND deleted_at IS NULL
        AND route_status != 'completed';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get route optimization statistics
CREATE OR REPLACE FUNCTION "public"."get_route_optimization_stats"(
    courier_uuid UUID DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_routes INTEGER,
    avg_efficiency_score NUMERIC,
    total_distance_km NUMERIC,
    total_duration_minutes INTEGER,
    total_fuel_cost NUMERIC,
    avg_assignments_per_route NUMERIC
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_routes,
        ROUND(AVG(ro.efficiency_score), 2) as avg_efficiency_score,
        ROUND(SUM(ro.total_distance_km), 2) as total_distance_km,
        SUM(ro.estimated_duration_minutes)::INTEGER as total_duration_minutes,
        ROUND(SUM(ro.estimated_fuel_cost), 2) as total_fuel_cost,
        ROUND(AVG(array_length(ro.assignment_ids, 1)), 2) as avg_assignments_per_route
    FROM "public"."route_optimizations" ro
    WHERE 
        ro.deleted_at IS NULL
        AND (courier_uuid IS NULL OR ro.courier_id = courier_uuid)
        AND (start_date IS NULL OR DATE(ro.created_at) >= start_date)
        AND (end_date IS NULL OR DATE(ro.created_at) <= end_date);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to find optimal courier for new assignment
CREATE OR REPLACE FUNCTION "public"."find_optimal_courier_for_assignment"(
    pickup_lat DOUBLE PRECISION,
    pickup_lng DOUBLE PRECISION,
    delivery_lat DOUBLE PRECISION,
    delivery_lng DOUBLE PRECISION,
    package_weight_kg NUMERIC DEFAULT NULL,
    priority INTEGER DEFAULT 3,
    max_radius_km DOUBLE PRECISION DEFAULT 25.0
)
RETURNS TABLE (
    courier_id UUID,
    courier_code TEXT,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    vehicle_type TEXT,
    rating NUMERIC,
    distance_to_pickup_km DOUBLE PRECISION,
    current_assignments INTEGER,
    efficiency_score NUMERIC,
    recommendation_score NUMERIC
) AS $
BEGIN
    RETURN QUERY
    WITH courier_distances AS (
        SELECT 
            cp.id,
            cp.courier_code,
            cp.first_name,
            cp.last_name,
            cp.phone_number,
            cp.vehicle_type,
            cp.rating,
            ST_Distance(
                cp.current_location,
                ST_SetSRID(ST_MakePoint(pickup_lng, pickup_lat), 4326)::geography
            ) / 1000.0 AS distance_to_pickup_km
        FROM "public"."courier_profiles" cp
        WHERE 
            cp.is_active = true 
            AND cp.is_verified = true
            AND cp.availability_status = 'available'
            AND cp.is_online = true
            AND cp.deleted_at IS NULL
            AND cp.current_location IS NOT NULL
            AND ST_DWithin(
                cp.current_location,
                ST_SetSRID(ST_MakePoint(pickup_lng, pickup_lat), 4326)::geography,
                max_radius_km * 1000
            )
            AND (package_weight_kg IS NULL OR cp.vehicle_capacity_kg >= package_weight_kg)
    ),
    courier_workload AS (
        SELECT 
            cd.*,
            COALESCE(
                (SELECT COUNT(*) 
                 FROM "public"."delivery_assignments" da 
                 WHERE da.courier_id = cd.id 
                 AND da.status IN ('assigned', 'picked_up', 'in_transit')
                 AND da.deleted_at IS NULL), 
                0
            ) AS current_assignments
        FROM courier_distances cd
    ),
    courier_efficiency AS (
        SELECT 
            cw.*,
            COALESCE(
                (SELECT AVG(ro.efficiency_score)
                 FROM "public"."route_optimizations" ro
                 WHERE ro.courier_id = cw.id
                 AND ro.created_at >= NOW() - INTERVAL '30 days'
                 AND ro.deleted_at IS NULL),
                50.0
            ) AS efficiency_score
        FROM courier_workload cw
    )
    SELECT 
        ce.id,
        ce.courier_code,
        ce.first_name,
        ce.last_name,
        ce.phone_number,
        ce.vehicle_type,
        ce.rating,
        ce.distance_to_pickup_km,
        ce.current_assignments,
        ce.efficiency_score,
        -- Calculate recommendation score (weighted combination of factors)
        ROUND(
            (
                -- Distance factor (40% weight, closer is better)
                (CASE WHEN ce.distance_to_pickup_km <= 5 THEN 40
                      WHEN ce.distance_to_pickup_km <= 10 THEN 30
                      WHEN ce.distance_to_pickup_km <= 20 THEN 20
                      ELSE 10 END) +
                -- Rating factor (25% weight)
                (ce.rating * 5) +
                -- Workload factor (20% weight, fewer assignments is better)
                (CASE WHEN ce.current_assignments = 0 THEN 20
                      WHEN ce.current_assignments <= 2 THEN 15
                      WHEN ce.current_assignments <= 4 THEN 10
                      ELSE 5 END) +
                -- Efficiency factor (15% weight)
                (ce.efficiency_score * 0.15)
            ), 2
        ) AS recommendation_score
    FROM courier_efficiency ce
    WHERE ce.current_assignments < 5  -- Max assignments limit
    ORDER BY 
        recommendation_score DESC,
        ce.distance_to_pickup_km ASC
    LIMIT 10;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON TABLE "public"."route_optimizations" TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."cleanup_expired_route_optimizations"() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_route_optimization_stats"(UUID, DATE, DATE) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."find_optimal_courier_for_assignment"(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC, INTEGER, DOUBLE PRECISION) TO "authenticated";

-- Add comments for documentation
COMMENT ON TABLE "public"."route_optimizations" IS 'Stores optimized delivery routes with efficiency metrics and traffic adjustments';
COMMENT ON COLUMN "public"."route_optimizations"."assignment_ids" IS 'Array of delivery assignment UUIDs included in this route';
COMMENT ON COLUMN "public"."route_optimizations"."optimized_sequence" IS 'Optimized order of assignments (indices into assignment_ids array)';
COMMENT ON COLUMN "public"."route_optimizations"."waypoints" IS 'JSON array of route waypoints with coordinates and timing';
COMMENT ON COLUMN "public"."route_optimizations"."time_window_violations" IS 'JSON array of time window constraint violations';
COMMENT ON COLUMN "public"."route_optimizations"."traffic_adjustments" IS 'JSON array of traffic-based route adjustments';
COMMENT ON COLUMN "public"."route_optimizations"."efficiency_score" IS 'Route efficiency score (0-100, higher is better)';
COMMENT ON COLUMN "public"."route_optimizations"."expires_at" IS 'When this route optimization expires and should be recalculated';

COMMENT ON FUNCTION "public"."cleanup_expired_route_optimizations"() IS 'Cleans up expired route optimizations to maintain database performance';
COMMENT ON FUNCTION "public"."get_route_optimization_stats"(UUID, DATE, DATE) IS 'Returns route optimization statistics for analysis and reporting';
COMMENT ON FUNCTION "public"."find_optimal_courier_for_assignment"(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC, INTEGER, DOUBLE PRECISION) IS 'Finds the optimal courier for a new assignment based on multiple factors';