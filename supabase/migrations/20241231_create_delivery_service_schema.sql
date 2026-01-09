-- Delivery Logistics Enhancement Schema
-- This migration creates the database schema for delivery service functionality
-- Requirements: 1.1, 2.1, 3.1

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "public";

-- Create delivery status enum
CREATE TYPE "public"."delivery_status" AS ENUM (
    'pending',
    'assigned',
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'failed',
    'cancelled',
    'returned'
);

-- Create courier availability status enum
CREATE TYPE "public"."courier_availability_status" AS ENUM (
    'available',
    'busy',
    'offline',
    'on_break'
);

-- Create delivery exception type enum
CREATE TYPE "public"."delivery_exception_type" AS ENUM (
    'address_not_found',
    'recipient_unavailable',
    'damaged_package',
    'weather_delay',
    'vehicle_breakdown',
    'traffic_delay',
    'security_issue',
    'other'
);

-- 1. Courier Profiles Table
CREATE TABLE IF NOT EXISTS "public"."courier_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "courier_code" "text" NOT NULL UNIQUE,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "phone_number" "text" NOT NULL,
    "email" "text" NOT NULL,
    "license_number" "text" NOT NULL,
    "license_expiry_date" "date" NOT NULL,
    "vehicle_type" "text" NOT NULL,
    "vehicle_registration" "text" NOT NULL,
    "vehicle_capacity_kg" numeric(8,2) DEFAULT 50.00,
    "current_location" "public"."geography"(Point,4326),
    "current_latitude" double precision,
    "current_longitude" double precision,
    "availability_status" "public"."courier_availability_status" DEFAULT 'offline',
    "is_online" boolean DEFAULT false,
    "is_verified" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "rating" numeric(3,2) DEFAULT 0.00,
    "total_deliveries" integer DEFAULT 0,
    "successful_deliveries" integer DEFAULT 0,
    "failed_deliveries" integer DEFAULT 0,
    "average_delivery_time_minutes" integer DEFAULT 0,
    "last_location_update" timestamp with time zone,
    "shift_start_time" time without time zone,
    "shift_end_time" time without time zone,
    "max_delivery_radius_km" numeric(5,2) DEFAULT 10.00,
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "bank_account_number" "text",
    "bank_name" "text",
    "account_holder_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    
    CONSTRAINT "courier_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "courier_profiles_user_id_unique" UNIQUE ("user_id"),
    CONSTRAINT "courier_profiles_courier_code_unique" UNIQUE ("courier_code"),
    CONSTRAINT "courier_profiles_rating_check" CHECK (("rating" >= 0 AND "rating" <= 5)),
    CONSTRAINT "courier_profiles_capacity_check" CHECK ("vehicle_capacity_kg" > 0),
    CONSTRAINT "courier_profiles_radius_check" CHECK ("max_delivery_radius_km" > 0)
);

-- 2. Delivery Assignments Table
CREATE TABLE IF NOT EXISTS "public"."delivery_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assignment_number" "text" NOT NULL UNIQUE,
    "order_id" "uuid" NOT NULL REFERENCES "public"."ecommerce_orders"("id") ON DELETE CASCADE,
    "courier_id" "uuid" NOT NULL REFERENCES "public"."courier_profiles"("id") ON DELETE RESTRICT,
    "pickup_address_id" "uuid" REFERENCES "public"."shipping_addresses"("id"),
    "delivery_address_id" "uuid" NOT NULL REFERENCES "public"."shipping_addresses"("id"),
    "pickup_location" "public"."geography"(Point,4326),
    "delivery_location" "public"."geography"(Point,4326),
    "pickup_latitude" double precision,
    "pickup_longitude" double precision,
    "delivery_latitude" double precision,
    "delivery_longitude" double precision,
    "status" "public"."delivery_status" DEFAULT 'pending',
    "priority" integer DEFAULT 3,
    "estimated_distance_km" numeric(8,2),
    "estimated_duration_minutes" integer,
    "actual_distance_km" numeric(8,2),
    "actual_duration_minutes" integer,
    "package_weight_kg" numeric(8,2),
    "package_dimensions" "jsonb",
    "special_instructions" "text",
    "pickup_instructions" "text",
    "delivery_instructions" "text",
    "recipient_name" "text" NOT NULL,
    "recipient_phone" "text" NOT NULL,
    "sender_name" "text",
    "sender_phone" "text",
    "delivery_fee" numeric(10,2) DEFAULT 0.00,
    "courier_commission" numeric(10,2) DEFAULT 0.00,
    "assigned_at" timestamp with time zone,
    "pickup_scheduled_at" timestamp with time zone,
    "delivery_scheduled_at" timestamp with time zone,
    "picked_up_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancellation_reason" "text",
    "delivery_proof_url" "text",
    "recipient_signature_url" "text",
    "delivery_photo_url" "text",
    "courier_notes" "text",
    "customer_rating" integer,
    "customer_feedback" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    
    CONSTRAINT "delivery_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "delivery_assignments_assignment_number_unique" UNIQUE ("assignment_number"),
    CONSTRAINT "delivery_assignments_priority_check" CHECK ("priority" >= 1 AND "priority" <= 5),
    CONSTRAINT "delivery_assignments_weight_check" CHECK ("package_weight_kg" > 0),
    CONSTRAINT "delivery_assignments_fee_check" CHECK ("delivery_fee" >= 0),
    CONSTRAINT "delivery_assignments_commission_check" CHECK ("courier_commission" >= 0),
    CONSTRAINT "delivery_assignments_rating_check" CHECK ("customer_rating" >= 1 AND "customer_rating" <= 5)
);

-- 3. Delivery Routes Table
CREATE TABLE IF NOT EXISTS "public"."delivery_routes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "route_name" "text" NOT NULL,
    "courier_id" "uuid" NOT NULL REFERENCES "public"."courier_profiles"("id") ON DELETE CASCADE,
    "route_date" "date" NOT NULL,
    "delivery_assignments" "uuid"[] DEFAULT '{}',
    "optimized_sequence" "jsonb",
    "total_distance_km" numeric(10,2),
    "estimated_total_duration_minutes" integer,
    "actual_total_duration_minutes" integer,
    "route_efficiency_score" numeric(3,2),
    "fuel_cost_estimate" numeric(8,2),
    "route_status" "text" DEFAULT 'planned',
    "optimization_algorithm" "text" DEFAULT 'basic',
    "optimization_parameters" "jsonb",
    "start_location" "public"."geography"(Point,4326),
    "end_location" "public"."geography"(Point,4326),
    "waypoints" "jsonb",
    "traffic_conditions" "jsonb",
    "weather_conditions" "jsonb",
    "route_started_at" timestamp with time zone,
    "route_completed_at" timestamp with time zone,
    "break_times" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    
    CONSTRAINT "delivery_routes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "delivery_routes_efficiency_check" CHECK ("route_efficiency_score" >= 0 AND "route_efficiency_score" <= 1),
    CONSTRAINT "delivery_routes_status_check" CHECK ("route_status" IN ('planned', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT "delivery_routes_distance_check" CHECK ("total_distance_km" >= 0),
    CONSTRAINT "delivery_routes_duration_check" CHECK ("estimated_total_duration_minutes" >= 0)
);

-- 4. Delivery Tracking Table
CREATE TABLE IF NOT EXISTS "public"."delivery_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "delivery_assignment_id" "uuid" NOT NULL REFERENCES "public"."delivery_assignments"("id") ON DELETE CASCADE,
    "courier_id" "uuid" NOT NULL REFERENCES "public"."courier_profiles"("id") ON DELETE CASCADE,
    "location" "public"."geography"(Point,4326) NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "altitude" double precision,
    "accuracy_meters" numeric(8,2),
    "speed_kmh" numeric(6,2),
    "heading_degrees" numeric(5,2),
    "battery_level" integer,
    "signal_strength" integer,
    "tracking_source" "text" DEFAULT 'mobile_app',
    "activity_type" "text",
    "distance_from_destination_km" numeric(8,2),
    "estimated_arrival_minutes" integer,
    "is_active_tracking" boolean DEFAULT true,
    "network_type" "text",
    "device_info" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    
    CONSTRAINT "delivery_tracking_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "delivery_tracking_accuracy_check" CHECK ("accuracy_meters" >= 0),
    CONSTRAINT "delivery_tracking_speed_check" CHECK ("speed_kmh" >= 0),
    CONSTRAINT "delivery_tracking_heading_check" CHECK ("heading_degrees" >= 0 AND "heading_degrees" < 360),
    CONSTRAINT "delivery_tracking_battery_check" CHECK ("battery_level" >= 0 AND "battery_level" <= 100),
    CONSTRAINT "delivery_tracking_signal_check" CHECK ("signal_strength" >= 0 AND "signal_strength" <= 100),
    CONSTRAINT "delivery_tracking_source_check" CHECK ("tracking_source" IN ('mobile_app', 'gps_device', 'manual', 'api'))
);

-- 5. Delivery Exceptions Table
CREATE TABLE IF NOT EXISTS "public"."delivery_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "delivery_assignment_id" "uuid" NOT NULL REFERENCES "public"."delivery_assignments"("id") ON DELETE CASCADE,
    "courier_id" "uuid" NOT NULL REFERENCES "public"."courier_profiles"("id") ON DELETE CASCADE,
    "exception_type" "public"."delivery_exception_type" NOT NULL,
    "exception_code" "text",
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "severity" "text" DEFAULT 'medium',
    "location" "public"."geography"(Point,4326),
    "latitude" double precision,
    "longitude" double precision,
    "photo_urls" "text"[] DEFAULT '{}',
    "audio_note_url" "text",
    "resolution_status" "text" DEFAULT 'open',
    "resolution_notes" "text",
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "escalated_to" "uuid",
    "escalation_reason" "text",
    "escalated_at" timestamp with time zone,
    "customer_notified" boolean DEFAULT false,
    "customer_notification_sent_at" timestamp with time zone,
    "impact_on_delivery" "text",
    "additional_cost" numeric(8,2) DEFAULT 0.00,
    "delay_minutes" integer DEFAULT 0,
    "retry_scheduled_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}',
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    
    CONSTRAINT "delivery_exceptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "delivery_exceptions_severity_check" CHECK ("severity" IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT "delivery_exceptions_resolution_check" CHECK ("resolution_status" IN ('open', 'in_progress', 'resolved', 'escalated', 'closed')),
    CONSTRAINT "delivery_exceptions_cost_check" CHECK ("additional_cost" >= 0),
    CONSTRAINT "delivery_exceptions_delay_check" CHECK ("delay_minutes" >= 0)
);

-- Create indexes for performance optimization

-- Courier Profiles indexes
CREATE INDEX IF NOT EXISTS "idx_courier_profiles_user_id" ON "public"."courier_profiles" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_courier_profiles_availability" ON "public"."courier_profiles" ("availability_status", "is_online", "is_active");
CREATE INDEX IF NOT EXISTS "idx_courier_profiles_location" ON "public"."courier_profiles" USING GIST ("current_location");
CREATE INDEX IF NOT EXISTS "idx_courier_profiles_rating" ON "public"."courier_profiles" ("rating" DESC);
CREATE INDEX IF NOT EXISTS "idx_courier_profiles_active" ON "public"."courier_profiles" ("is_active", "is_verified") WHERE "deleted_at" IS NULL;

-- Delivery Assignments indexes
CREATE INDEX IF NOT EXISTS "idx_delivery_assignments_order_id" ON "public"."delivery_assignments" ("order_id");
CREATE INDEX IF NOT EXISTS "idx_delivery_assignments_courier_id" ON "public"."delivery_assignments" ("courier_id");
CREATE INDEX IF NOT EXISTS "idx_delivery_assignments_status" ON "public"."delivery_assignments" ("status");
CREATE INDEX IF NOT EXISTS "idx_delivery_assignments_priority" ON "public"."delivery_assignments" ("priority" DESC, "created_at");
CREATE INDEX IF NOT EXISTS "idx_delivery_assignments_pickup_location" ON "public"."delivery_assignments" USING GIST ("pickup_location");
CREATE INDEX IF NOT EXISTS "idx_delivery_assignments_delivery_location" ON "public"."delivery_assignments" USING GIST ("delivery_location");
CREATE INDEX IF NOT EXISTS "idx_delivery_assignments_scheduled" ON "public"."delivery_assignments" ("delivery_scheduled_at");
CREATE INDEX IF NOT EXISTS "idx_delivery_assignments_active" ON "public"."delivery_assignments" ("status", "courier_id") WHERE "deleted_at" IS NULL;

-- Delivery Routes indexes
CREATE INDEX IF NOT EXISTS "idx_delivery_routes_courier_date" ON "public"."delivery_routes" ("courier_id", "route_date");
CREATE INDEX IF NOT EXISTS "idx_delivery_routes_status" ON "public"."delivery_routes" ("route_status");
CREATE INDEX IF NOT EXISTS "idx_delivery_routes_efficiency" ON "public"."delivery_routes" ("route_efficiency_score" DESC);
CREATE INDEX IF NOT EXISTS "idx_delivery_routes_active" ON "public"."delivery_routes" ("courier_id", "route_date") WHERE "deleted_at" IS NULL;

-- Delivery Tracking indexes
CREATE INDEX IF NOT EXISTS "idx_delivery_tracking_assignment" ON "public"."delivery_tracking" ("delivery_assignment_id", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_delivery_tracking_courier" ON "public"."delivery_tracking" ("courier_id", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_delivery_tracking_location" ON "public"."delivery_tracking" USING GIST ("location");
CREATE INDEX IF NOT EXISTS "idx_delivery_tracking_timestamp" ON "public"."delivery_tracking" ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_delivery_tracking_active" ON "public"."delivery_tracking" ("is_active_tracking", "timestamp" DESC);

-- Delivery Exceptions indexes
CREATE INDEX IF NOT EXISTS "idx_delivery_exceptions_assignment" ON "public"."delivery_exceptions" ("delivery_assignment_id");
CREATE INDEX IF NOT EXISTS "idx_delivery_exceptions_courier" ON "public"."delivery_exceptions" ("courier_id");
CREATE INDEX IF NOT EXISTS "idx_delivery_exceptions_type" ON "public"."delivery_exceptions" ("exception_type");
CREATE INDEX IF NOT EXISTS "idx_delivery_exceptions_status" ON "public"."delivery_exceptions" ("resolution_status");
CREATE INDEX IF NOT EXISTS "idx_delivery_exceptions_severity" ON "public"."delivery_exceptions" ("severity", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_delivery_exceptions_active" ON "public"."delivery_exceptions" ("resolution_status", "created_at" DESC) WHERE "deleted_at" IS NULL;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE "public"."courier_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."delivery_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."delivery_routes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."delivery_tracking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."delivery_exceptions" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courier_profiles
CREATE POLICY "Couriers can view their own profile" ON "public"."courier_profiles"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Couriers can update their own profile" ON "public"."courier_profiles"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all courier profiles" ON "public"."courier_profiles"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "public"."user_roles" ur
            WHERE ur.user_id = auth.uid() AND ur.role_name IN ('ADMIN', 'DISPATCHER')
        )
    );

-- RLS Policies for delivery_assignments
CREATE POLICY "Couriers can view their assignments" ON "public"."delivery_assignments"
    FOR SELECT USING (
        courier_id IN (
            SELECT id FROM "public"."courier_profiles" WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Couriers can update their assignments" ON "public"."delivery_assignments"
    FOR UPDATE USING (
        courier_id IN (
            SELECT id FROM "public"."courier_profiles" WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Customers can view their delivery assignments" ON "public"."delivery_assignments"
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM "public"."ecommerce_orders" WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all delivery assignments" ON "public"."delivery_assignments"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "public"."user_roles" ur
            WHERE ur.user_id = auth.uid() AND ur.role_name IN ('ADMIN', 'DISPATCHER')
        )
    );

-- RLS Policies for delivery_routes
CREATE POLICY "Couriers can view their routes" ON "public"."delivery_routes"
    FOR SELECT USING (
        courier_id IN (
            SELECT id FROM "public"."courier_profiles" WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all delivery routes" ON "public"."delivery_routes"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "public"."user_roles" ur
            WHERE ur.user_id = auth.uid() AND ur.role_name IN ('ADMIN', 'DISPATCHER')
        )
    );

-- RLS Policies for delivery_tracking
CREATE POLICY "Couriers can insert their tracking data" ON "public"."delivery_tracking"
    FOR INSERT WITH CHECK (
        courier_id IN (
            SELECT id FROM "public"."courier_profiles" WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Couriers can view their tracking data" ON "public"."delivery_tracking"
    FOR SELECT USING (
        courier_id IN (
            SELECT id FROM "public"."courier_profiles" WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Customers can view tracking for their orders" ON "public"."delivery_tracking"
    FOR SELECT USING (
        delivery_assignment_id IN (
            SELECT da.id FROM "public"."delivery_assignments" da
            JOIN "public"."ecommerce_orders" eo ON da.order_id = eo.id
            WHERE eo.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all tracking data" ON "public"."delivery_tracking"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."user_roles" ur
            WHERE ur.user_id = auth.uid() AND ur.role_name IN ('ADMIN', 'DISPATCHER')
        )
    );

-- RLS Policies for delivery_exceptions
CREATE POLICY "Couriers can manage their exceptions" ON "public"."delivery_exceptions"
    FOR ALL USING (
        courier_id IN (
            SELECT id FROM "public"."courier_profiles" WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Customers can view exceptions for their orders" ON "public"."delivery_exceptions"
    FOR SELECT USING (
        delivery_assignment_id IN (
            SELECT da.id FROM "public"."delivery_assignments" da
            JOIN "public"."ecommerce_orders" eo ON da.order_id = eo.id
            WHERE eo.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all delivery exceptions" ON "public"."delivery_exceptions"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "public"."user_roles" ur
            WHERE ur.user_id = auth.uid() AND ur.role_name IN ('ADMIN', 'DISPATCHER')
        )
    );

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "update_courier_profiles_updated_at"
    BEFORE UPDATE ON "public"."courier_profiles"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "update_delivery_assignments_updated_at"
    BEFORE UPDATE ON "public"."delivery_assignments"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "update_delivery_routes_updated_at"
    BEFORE UPDATE ON "public"."delivery_routes"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "update_delivery_exceptions_updated_at"
    BEFORE UPDATE ON "public"."delivery_exceptions"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Create function to generate assignment numbers
CREATE OR REPLACE FUNCTION "public"."generate_assignment_number"()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    -- Get current date in YYYYMMDD format
    SELECT TO_CHAR(NOW(), 'YYYYMMDD') INTO new_number;
    
    -- Get count of assignments created today
    SELECT COUNT(*) + 1 INTO counter
    FROM "public"."delivery_assignments"
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Format: DEL-YYYYMMDD-NNNN
    new_number := 'DEL-' || new_number || '-' || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate courier codes
CREATE OR REPLACE FUNCTION "public"."generate_courier_code"()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    counter INTEGER;
BEGIN
    -- Get count of couriers created
    SELECT COUNT(*) + 1 INTO counter
    FROM "public"."courier_profiles";
    
    -- Format: COU-NNNNNN
    new_code := 'COU-' || LPAD(counter::TEXT, 6, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-generate codes
CREATE OR REPLACE FUNCTION "public"."set_assignment_number"()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.assignment_number IS NULL OR NEW.assignment_number = '' THEN
        NEW.assignment_number := generate_assignment_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "public"."set_courier_code"()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.courier_code IS NULL OR NEW.courier_code = '' THEN
        NEW.courier_code := generate_courier_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "set_assignment_number_trigger"
    BEFORE INSERT ON "public"."delivery_assignments"
    FOR EACH ROW EXECUTE FUNCTION "public"."set_assignment_number"();

CREATE TRIGGER "set_courier_code_trigger"
    BEFORE INSERT ON "public"."courier_profiles"
    FOR EACH ROW EXECUTE FUNCTION "public"."set_courier_code"();

-- Create function to update courier location
CREATE OR REPLACE FUNCTION "public"."update_courier_location"(
    courier_uuid UUID,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE "public"."courier_profiles"
    SET 
        current_latitude = lat,
        current_longitude = lng,
        current_location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
        last_location_update = NOW()
    WHERE id = courier_uuid AND deleted_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to find nearby couriers
CREATE OR REPLACE FUNCTION "public"."find_nearby_couriers"(
    search_lat DOUBLE PRECISION,
    search_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 10.0,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    courier_id UUID,
    courier_code TEXT,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    vehicle_type TEXT,
    rating NUMERIC,
    distance_km DOUBLE PRECISION,
    availability_status courier_availability_status,
    is_online BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
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
            ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography
        ) / 1000.0 AS distance_km,
        cp.availability_status,
        cp.is_online
    FROM "public"."courier_profiles" cp
    WHERE 
        cp.is_active = true 
        AND cp.is_verified = true
        AND cp.deleted_at IS NULL
        AND cp.current_location IS NOT NULL
        AND ST_DWithin(
            cp.current_location,
            ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
            radius_km * 1000
        )
    ORDER BY 
        cp.availability_status = 'available' DESC,
        cp.is_online DESC,
        cp.rating DESC,
        ST_Distance(
            cp.current_location,
            ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography
        )
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT ALL ON ALL TABLES IN SCHEMA "public" TO "authenticated";
GRANT ALL ON ALL SEQUENCES IN SCHEMA "public" TO "authenticated";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA "public" TO "authenticated";

-- Add comments for documentation
COMMENT ON TABLE "public"."courier_profiles" IS 'Stores courier/driver profile information with location tracking and availability status';
COMMENT ON TABLE "public"."delivery_assignments" IS 'Links orders to couriers with delivery details and tracking information';
COMMENT ON TABLE "public"."delivery_routes" IS 'Stores optimized delivery routes for couriers with efficiency metrics';
COMMENT ON TABLE "public"."delivery_tracking" IS 'Real-time GPS tracking data for active deliveries';
COMMENT ON TABLE "public"."delivery_exceptions" IS 'Records delivery issues and exceptions with resolution tracking';

COMMENT ON COLUMN "public"."courier_profiles"."current_location" IS 'PostGIS geography point for spatial queries';
COMMENT ON COLUMN "public"."delivery_assignments"."priority" IS 'Delivery priority: 1=Urgent, 2=High, 3=Normal, 4=Low, 5=Scheduled';
COMMENT ON COLUMN "public"."delivery_tracking"."accuracy_meters" IS 'GPS accuracy in meters';
COMMENT ON COLUMN "public"."delivery_exceptions"."severity" IS 'Exception severity level affecting delivery timeline';