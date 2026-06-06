-- Baseline schema for Giga (snapshot of live prod DB taken 2026-06-06)
-- Generated via supabase db dump (public schema) + trigger DDL supplemented from pg_get_triggerdef.
-- Supersedes the 11 archived migrations in supabase/_archive_migrations/.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."courier_availability_status" AS ENUM (
    'available',
    'busy',
    'offline',
    'on_break'
);


ALTER TYPE "public"."courier_availability_status" OWNER TO "postgres";


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


ALTER TYPE "public"."delivery_exception_type" OWNER TO "postgres";


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


ALTER TYPE "public"."delivery_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_status" AS ENUM (
    'pending',
    'sent',
    'delivered',
    'failed',
    'read'
);


ALTER TYPE "public"."notification_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'email',
    'sms',
    'push',
    'in_app'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'user',
    'admin',
    'moderator',
    'driver',
    'merchant',
    'hotel_manager'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'active',
    'inactive',
    'suspended',
    'pending_verification'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."analyze_function_classification"() RETURNS TABLE("total_functions" integer, "supabase_recommended" integer, "railway_recommended" integer, "high_confidence" integer, "medium_confidence" integer, "low_confidence" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_count INTEGER;
  supabase_count INTEGER;
  railway_count INTEGER;
  high_conf INTEGER;
  med_conf INTEGER;
  low_conf INTEGER;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO total_count FROM function_classification;
  
  SELECT COUNT(*) INTO supabase_count 
  FROM function_classification 
  WHERE recommended_platform = 'supabase';
  
  SELECT COUNT(*) INTO railway_count 
  FROM function_classification 
  WHERE recommended_platform = 'railway';
  
  SELECT COUNT(*) INTO high_conf 
  FROM function_classification 
  WHERE platform_confidence >= 0.8;
  
  SELECT COUNT(*) INTO med_conf 
  FROM function_classification 
  WHERE platform_confidence >= 0.6 AND platform_confidence < 0.8;
  
  SELECT COUNT(*) INTO low_conf 
  FROM function_classification 
  WHERE platform_confidence < 0.6;
  
  RETURN QUERY SELECT total_count, supabase_count, railway_count, high_conf, med_conf, low_conf;
END;
$$;


ALTER FUNCTION "public"."analyze_function_classification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assess_migration_readiness"() RETURNS TABLE("module_type" "text", "function_count" integer, "avg_complexity_score" numeric, "high_priority_count" integer, "estimated_effort_hours" integer, "readiness_score" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fc.module_type,
    COUNT(*)::INTEGER as function_count,
    AVG(
      CASE fc.migration_complexity
        WHEN 'low' THEN 1.0
        WHEN 'medium' THEN 2.0
        WHEN 'high' THEN 3.0
        WHEN 'critical' THEN 4.0
      END
    )::DECIMAL(3,2) as avg_complexity_score,
    COUNT(*) FILTER (WHERE fc.migration_priority >= 4)::INTEGER as high_priority_count,
    (COUNT(*) * 
      CASE 
        WHEN fc.module_type = 'core' THEN 8
        WHEN fc.module_type = 'social' THEN 6
        WHEN fc.module_type = 'admin' THEN 10
        WHEN fc.module_type = 'media' THEN 12
        WHEN fc.module_type = 'utility' THEN 4
        ELSE 6
      END
    )::INTEGER as estimated_effort_hours,
    (1.0 - (AVG(
      CASE fc.migration_complexity
        WHEN 'low' THEN 0.1
        WHEN 'medium' THEN 0.3
        WHEN 'high' THEN 0.6
        WHEN 'critical' THEN 0.9
      END
    )))::DECIMAL(3,2) as readiness_score
  FROM function_classification fc
  GROUP BY fc.module_type
  ORDER BY readiness_score DESC;
END;
$$;


ALTER FUNCTION "public"."assess_migration_readiness"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_platform_recommendation"("db_intensity" integer, "compute_intensity" integer, "memory_intensity" integer, "io_intensity" integer, "traffic_pattern" "text", "business_criticality" "text", "security_level" "text") RETURNS TABLE("recommended_platform" "text", "confidence" numeric, "reasoning" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  supabase_score DECIMAL(5,2) := 0.0;
  railway_score DECIMAL(5,2) := 0.0;
  platform TEXT;
  conf DECIMAL(3,2);
  reason TEXT;
BEGIN
  -- Database intensity scoring (higher = more suitable for Supabase)
  supabase_score := supabase_score + (db_intensity * 1.5);
  railway_score := railway_score + ((10 - db_intensity) * 0.8);
  
  -- Compute intensity scoring (higher = more suitable for Railway)
  railway_score := railway_score + (compute_intensity * 1.5);
  supabase_score := supabase_score + ((10 - compute_intensity) * 0.8);
  
  -- Memory and I/O intensity (favor Railway for high requirements)
  railway_score := railway_score + (memory_intensity * 0.7);
  railway_score := railway_score + (io_intensity * 0.6);
  
  -- Traffic pattern adjustments
  CASE traffic_pattern
    WHEN 'low' THEN supabase_score := supabase_score + 2.0;
    WHEN 'medium' THEN supabase_score := supabase_score + 1.0;
    WHEN 'high' THEN railway_score := railway_score + 2.0;
    WHEN 'burst' THEN railway_score := railway_score + 3.0;
    WHEN 'spike' THEN railway_score := railway_score + 2.5;
    ELSE NULL; -- Handle any other cases
  END CASE;
  
  -- Business criticality (critical functions prefer Supabase for stability)
  CASE business_criticality
    WHEN 'critical' THEN supabase_score := supabase_score + 2.0;
    WHEN 'high' THEN supabase_score := supabase_score + 1.0;
    WHEN 'low' THEN railway_score := railway_score + 1.0;
    ELSE NULL; -- Handle medium and other cases
  END CASE;
  
  -- Security level (elevated security prefers Railway for isolation)
  CASE security_level
    WHEN 'critical' THEN railway_score := railway_score + 2.0;
    WHEN 'elevated' THEN railway_score := railway_score + 1.5;
    WHEN 'public' THEN supabase_score := supabase_score + 1.0;
    ELSE NULL; -- Handle standard and other cases
  END CASE;
  
  -- Determine recommendation
  IF supabase_score > railway_score THEN
    platform := 'supabase';
    conf := LEAST(0.95, (supabase_score / (supabase_score + railway_score)));
    reason := format('Database-heavy operation (DB: %s, Compute: %s). Supabase score: %s, Railway score: %s', 
                    db_intensity, compute_intensity, supabase_score, railway_score);
  ELSE
    platform := 'railway';
    conf := LEAST(0.95, (railway_score / (supabase_score + railway_score)));
    reason := format('Compute-heavy operation (DB: %s, Compute: %s). Railway score: %s, Supabase score: %s', 
                    db_intensity, compute_intensity, railway_score, supabase_score);
  END IF;
  
  RETURN QUERY SELECT platform, conf, reason;
END;
$$;


ALTER FUNCTION "public"."calculate_platform_recommendation"("db_intensity" integer, "compute_intensity" integer, "memory_intensity" integer, "io_intensity" integer, "traffic_pattern" "text", "business_criticality" "text", "security_level" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_acid_compliance"() RETURNS TABLE("function_name" "text", "has_error_handling" boolean, "has_row_locking" boolean, "compliance_score" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.proname::TEXT,
    (p.prosrc LIKE '%EXCEPTION%')::BOOLEAN,
    (p.prosrc LIKE '%FOR UPDATE%')::BOOLEAN,
    CASE 
      WHEN p.prosrc LIKE '%EXCEPTION%' AND p.prosrc LIKE '%FOR UPDATE%' THEN 100
      WHEN p.prosrc LIKE '%EXCEPTION%' OR p.prosrc LIKE '%FOR UPDATE%' THEN 75
      ELSE 50
    END::INTEGER
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'handle_new_user',
      'update_conversation_last_message', 
      'update_hotel_rating',
      'update_post_counts',
      'update_product_rating'
    )
  ORDER BY p.proname;
END;
$$;


ALTER FUNCTION "public"."check_acid_compliance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_migration_readiness"() RETURNS TABLE("module" "text", "platform" "text", "tables_ready" bigint, "tables_pending" bigint, "critical_dependencies" bigint, "readiness_score" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    smm.module_type::TEXT,
    smm.primary_service::TEXT,
    COUNT(*) FILTER (WHERE smm.table_name IN (
      SELECT component_name FROM platform_migration_status 
      WHERE migration_status = 'completed'
    ))::BIGINT,
    COUNT(*) FILTER (WHERE smm.table_name NOT IN (
      SELECT component_name FROM platform_migration_status 
      WHERE migration_status = 'completed'
    ))::BIGINT,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM function_dependencies fd 
      WHERE fd.depends_on_table = smm.table_name 
      AND fd.is_critical = true
    ))::BIGINT,
    (COUNT(*) FILTER (WHERE smm.table_name IN (
      SELECT component_name FROM platform_migration_status 
      WHERE migration_status = 'completed'
    ))::NUMERIC / NULLIF(COUNT(*), 0) * 100)::NUMERIC(5,2)
  FROM service_module_mapping smm
  GROUP BY smm.module_type, smm.primary_service
  ORDER BY readiness_score DESC NULLS LAST;
END;
$$;


ALTER FUNCTION "public"."check_migration_readiness"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_security_compliance"() RETURNS TABLE("table_name" "text", "security_issue" "text", "severity" "text", "recommendation" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  -- Check for tables without RLS
  SELECT 
    t.tablename::TEXT,
    'Missing Row Level Security'::TEXT,
    'HIGH'::TEXT,
    'Enable RLS on this table'::TEXT
  FROM pg_tables t
  LEFT JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND NOT c.relrowsecurity
    AND t.tablename != 'spatial_ref_sys'
  
  UNION ALL
  
  -- Check for overly permissive policies
  SELECT 
    p.tablename::TEXT,
    'Overly permissive policy: ' || p.policyname::TEXT,
    CASE 
      WHEN 'public' = ANY(p.roles) AND p.qual = 'true' THEN 'CRITICAL'
      WHEN 'service_role' = ANY(p.roles) AND p.qual = 'true' THEN 'HIGH'
      ELSE 'MEDIUM'
    END::TEXT,
    'Restrict policy to specific conditions'::TEXT
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND (
      ('public' = ANY(p.roles) AND p.qual = 'true') OR
      ('service_role' = ANY(p.roles) AND p.qual = 'true')
    )
  
  UNION ALL
  
  -- Check for unencrypted sensitive data
  SELECT 
    dc.table_name::TEXT,
    'Sensitive data not encrypted: ' || dc.column_name::TEXT,
    'HIGH'::TEXT,
    'Implement encryption for this field'::TEXT
  FROM data_classification dc
  WHERE dc.encryption_required = true
    AND dc.classification IN ('restricted', 'confidential');
END;
$$;


ALTER FUNCTION "public"."check_security_compliance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_post_comment"("p_post_id" "uuid", "p_user_id" "uuid", "p_content" "text", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "post_id" "uuid", "user_id" "uuid", "content" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  INSERT INTO post_comments (
    post_id,
    user_id,
    content,
    tenant_id
  ) VALUES (
    p_post_id,
    p_user_id,
    p_content,
    p_tenant_id
  )
  RETURNING 
    post_comments.id,
    post_comments.post_id,
    post_comments.user_id,
    post_comments.content,
    post_comments.created_at;
END;
$$;


ALTER FUNCTION "public"."create_post_comment"("p_post_id" "uuid", "p_user_id" "uuid", "p_content" "text", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_role_specific_profile"("p_user_id" "uuid", "p_role_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  CASE p_role_name
    WHEN 'DRIVER' THEN
      INSERT INTO public.driver_profiles (user_id, created_at, updated_at)
      VALUES (p_user_id, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING;
      
    WHEN 'HOST' THEN
      INSERT INTO public.host_profiles (user_id, created_at, updated_at)
      VALUES (p_user_id, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING;
      
    WHEN 'VENDOR' THEN
      INSERT INTO public.vendor_profiles (user_id, created_at, updated_at)
      VALUES (p_user_id, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING;
      
    WHEN 'ADVERTISER' THEN
      INSERT INTO public.advertiser_profiles (user_id, created_at, updated_at)
      VALUES (p_user_id, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING;
      
    ELSE
      NULL;
  END CASE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating % profile for user %: %', p_role_name, p_user_id, SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_role_specific_profile"("p_user_id" "uuid", "p_role_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_role_specific_profile"("p_user_id" "uuid", "p_role_name" "text") IS 'Creates role-specific profile entries (driver_profiles, host_profiles, vendor_profiles, advertiser_profiles) when a role is granted';



CREATE OR REPLACE FUNCTION "public"."create_social_post"("p_user_id" "uuid", "p_content" "text", "p_media_urls" "text"[] DEFAULT '{}'::"text"[], "p_visibility" "text" DEFAULT 'public'::"text", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "content" "text", "media_urls" "text"[], "visibility" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  INSERT INTO social_posts (
    user_id,
    content,
    media_urls,
    visibility,
    tenant_id
  ) VALUES (
    p_user_id,
    p_content,
    p_media_urls,
    p_visibility,
    p_tenant_id
  )
  RETURNING 
    social_posts.id,
    social_posts.user_id,
    social_posts.content,
    social_posts.media_urls,
    social_posts.visibility,
    social_posts.created_at,
    social_posts.updated_at;
END;
$$;


ALTER FUNCTION "public"."create_social_post"("p_user_id" "uuid", "p_content" "text", "p_media_urls" "text"[], "p_visibility" "text", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."credit_wallet"("p_user_id" "uuid", "p_amount" numeric) RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- Update wallet balance
  UPDATE user_wallets
  SET 
    balance = balance + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  -- If wallet doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO user_wallets (user_id, balance, currency)
    VALUES (p_user_id, p_amount, 'NGN')
    RETURNING balance INTO v_new_balance;
  END IF;
  
  RETURN v_new_balance;
END;
$$;


ALTER FUNCTION "public"."credit_wallet"("p_user_id" "uuid", "p_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debit_wallet"("p_user_id" "uuid", "p_amount" numeric) RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM user_wallets
  WHERE user_id = p_user_id;
  
  -- Check if wallet exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;
  
  -- Check if sufficient balance
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', v_current_balance, p_amount;
  END IF;
  
  -- Debit wallet
  UPDATE user_wallets
  SET 
    balance = balance - p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  RETURN v_new_balance;
END;
$$;


ALTER FUNCTION "public"."debit_wallet"("p_user_id" "uuid", "p_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_sensitive_data"("encrypted_data" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF encrypted_data IS NULL OR encrypted_data = '' THEN
    RETURN encrypted_data;
  END IF;
  
  RETURN convert_from(
    decrypt(
      decode(encrypted_data, 'base64'),
      digest(COALESCE(current_setting('app.encryption_key', true), 'giga_default_key_2024'), 'sha256'),
      'aes'
    ),
    'UTF8'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN '[ENCRYPTED]';
END;
$$;


ALTER FUNCTION "public"."decrypt_sensitive_data"("encrypted_data" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."document_table_relationships"("target_table" "text") RETURNS TABLE("relationship_type" "text", "related_table" "text", "constraint_name" "text", "foreign_key_column" "text", "referenced_column" "text", "on_delete_action" "text", "on_update_action" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  -- Outgoing foreign keys (this table references others)
  SELECT 
    'REFERENCES'::TEXT,
    ccu.table_name::TEXT,
    tc.constraint_name::TEXT,
    kcu.column_name::TEXT,
    ccu.column_name::TEXT,
    rc.delete_rule::TEXT,
    rc.update_rule::TEXT
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = target_table
  
  UNION ALL
  
  -- Incoming foreign keys (other tables reference this one)
  SELECT 
    'REFERENCED_BY'::TEXT,
    tc.table_name::TEXT,
    tc.constraint_name::TEXT,
    kcu.column_name::TEXT,
    ccu.column_name::TEXT,
    rc.delete_rule::TEXT,
    rc.update_rule::TEXT
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND ccu.table_name = target_table
  
  ORDER BY relationship_type, related_table;
END;
$$;


ALTER FUNCTION "public"."document_table_relationships"("target_table" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."encrypt_sensitive_data"("data" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN data;
  END IF;
  
  -- Use AES encryption with a key derived from environment
  RETURN encode(
    encrypt(
      data::bytea, 
      digest(COALESCE(current_setting('app.encryption_key', true), 'giga_default_key_2024'), 'sha256'),
      'aes'
    ), 
    'base64'
  );
END;
$$;


ALTER FUNCTION "public"."encrypt_sensitive_data"("data" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_nearby_couriers"("search_lat" double precision, "search_lng" double precision, "radius_km" double precision DEFAULT 10.0, "limit_count" integer DEFAULT 10) RETURNS TABLE("courier_id" "uuid", "courier_code" "text", "first_name" "text", "last_name" "text", "phone_number" "text", "vehicle_type" "text", "rating" numeric, "distance_km" double precision, "availability_status" "public"."courier_availability_status", "is_online" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."find_nearby_couriers"("search_lat" double precision, "search_lng" double precision, "radius_km" double precision, "limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_nearby_drivers"("user_lat" double precision, "user_lng" double precision, "search_radius_km" double precision DEFAULT 10) RETURNS TABLE("driver_id" "uuid", "distance_km" double precision, "driver_name" "text", "vehicle_type" "text", "rating" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.user_id,
    ST_Distance(
      ST_MakePoint(user_lng, user_lat)::geography,
      ST_MakePoint(dp.current_longitude, dp.current_latitude)::geography
    ) / 1000 as distance_km,
    up.full_name,
    vt.name as vehicle_type,
    dp.rating
  FROM public.driver_profiles dp
  JOIN public.user_profiles up ON dp.user_id = up.user_id
  JOIN public.vehicle_types vt ON dp.vehicle_type_id = vt.id
  WHERE 
    dp.is_online = true
    AND dp.is_verified = true
    AND dp.is_available = true
    AND ST_DWithin(
      ST_MakePoint(user_lng, user_lat)::geography,
      ST_MakePoint(dp.current_longitude, dp.current_latitude)::geography,
      search_radius_km * 1000
    )
  ORDER BY distance_km ASC;
END;
$$;


ALTER FUNCTION "public"."find_nearby_drivers"("user_lat" double precision, "user_lng" double precision, "search_radius_km" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_nearby_drivers"("target_lat" double precision, "target_lng" double precision, "radius_km" double precision, "vehicle_type_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("user_id" "uuid", "distance_km" double precision, "last_location" "public"."geography", "vehicle_type" "text", "rating" numeric, "total_rides" integer)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."find_nearby_drivers"("target_lat" double precision, "target_lng" double precision, "radius_km" double precision, "vehicle_type_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_assignment_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_assignment_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_courier_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_courier_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_module_summary"() RETURNS TABLE("module" "text", "recommended_platform" "text", "table_count" bigint, "total_database_intensity" numeric, "total_compute_intensity" numeric, "high_traffic_tables" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    smm.module_type::TEXT,
    smm.primary_service::TEXT,
    COUNT(*)::BIGINT,
    AVG(smm.database_intensity)::NUMERIC(10,2),
    AVG(smm.compute_intensity)::NUMERIC(10,2),
    COUNT(*) FILTER (WHERE smm.traffic_pattern IN ('high', 'burst'))::BIGINT
  FROM service_module_mapping smm
  GROUP BY smm.module_type, smm.primary_service
  ORDER BY smm.module_type;
END;
$$;


ALTER FUNCTION "public"."generate_module_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_branch_summary"("p_branch_id" character varying) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'branch_id', p_branch_id,
        'hotels', (SELECT COUNT(*) FROM nipost_hotels WHERE branch_id = p_branch_id),
        'ecommerce', (SELECT COUNT(*) FROM nipost_ecommerce WHERE branch_id = p_branch_id),
        'taxi', (SELECT COUNT(*) FROM nipost_taxi WHERE branch_id = p_branch_id),
        'total_revenue', (
            SELECT COALESCE(SUM(gross_amount), 0)
            FROM nipost_financial_ledger
            WHERE branch_id = p_branch_id AND payment_status = 'completed'
        ),
        'total_commission', (
            SELECT COALESCE(SUM(commission_amount), 0)
            FROM nipost_financial_ledger
            WHERE branch_id = p_branch_id AND payment_status = 'completed'
        )
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_branch_summary"("p_branch_id" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_business_categories"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'categories', json_agg(
      json_build_object(
        'id', cat.id,
        'name', cat.name,
        'slug', cat.slug,
        'description', cat.description,
        'is_active', cat.is_active
      )
    )
  ) INTO result
  FROM (
    SELECT 'ecommerce' as id, 'E-Commerce' as name, 'ecommerce' as slug, 
           'Online marketplace for goods' as description, true as is_active
    UNION ALL
    SELECT 'hotel', 'Hotels & Lodging', 'hotel', 
           'Hotel booking and accommodation', true
    UNION ALL
    SELECT 'taxi', 'Taxi Services', 'taxi', 
           'Ride-hailing and transportation', true
    UNION ALL
    SELECT 'media', 'Media & Content', 'media', 
           'Digital media and content platform', true
  ) cat;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_business_categories"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_category_breakdown"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'ecommerce', COALESCE((
      SELECT SUM(total_amount)
      FROM ecommerce_orders
      WHERE payment_status = 'paid'
    ), 0),
    'hotel', COALESCE((
      SELECT SUM(total_amount)
      FROM hotel_bookings
      WHERE payment_status = 'paid'
    ), 0),
    'taxi', COALESCE((
      SELECT SUM(fare_amount)
      FROM taxi_rides
      WHERE payment_status = 'paid'
    ), 0),
    'media', 0
  ) INTO result;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_category_breakdown"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_giga_dashboard_stats"("start_date" "date" DEFAULT (CURRENT_DATE - '30 days'::interval), "end_date" "date" DEFAULT CURRENT_DATE) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result JSON;
  total_revenue DECIMAL(15,2);
  total_orders INTEGER;
  total_visitors INTEGER;
  conversion_rate DECIMAL(5,2);
BEGIN
  -- Calculate total revenue from financial ledger
  SELECT COALESCE(SUM(gross_amount), 0) INTO total_revenue
  FROM nipost_financial_ledger
  WHERE created_at BETWEEN start_date AND end_date
  AND payment_status = 'completed';

  -- Calculate total orders
  SELECT COUNT(*) INTO total_orders
  FROM ecommerce_orders
  WHERE created_at BETWEEN start_date AND end_date;

  -- Estimate visitors (using unique users from orders and bookings only)
  -- Multiply by 10 for visitor estimation
  SELECT COUNT(DISTINCT user_id) * 10 INTO total_visitors
  FROM (
    SELECT user_id FROM ecommerce_orders WHERE created_at BETWEEN start_date AND end_date
    UNION
    SELECT user_id FROM hotel_bookings WHERE created_at BETWEEN start_date AND end_date
  ) unique_users;

  -- Calculate conversion rate
  IF total_visitors > 0 THEN
    conversion_rate := (total_orders::DECIMAL / total_visitors::DECIMAL) * 100;
  ELSE
    conversion_rate := 0;
  END IF;

  -- Build result JSON
  SELECT json_build_object(
    'revenue', json_build_object(
      'value', total_revenue,
      'change', '+22%',
      'trend', 'up'
    ),
    'orders', json_build_object(
      'value', total_orders,
      'change', CASE WHEN total_orders > 100 THEN '+15%' ELSE '-5%' END,
      'trend', CASE WHEN total_orders > 100 THEN 'up' ELSE 'down' END
    ),
    'visitors', json_build_object(
      'value', total_visitors,
      'change', '+49%',
      'trend', 'up'
    ),
    'conversion', json_build_object(
      'value', conversion_rate,
      'change', '+1.9%',
      'trend', 'up'
    )
  ) INTO result;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_giga_dashboard_stats"("start_date" "date", "end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_national_summary"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'states', (SELECT COUNT(DISTINCT state) FROM user_profiles WHERE state IS NOT NULL AND deleted_at IS NULL),
        'branches', 0, -- No branch concept in main platform
        'hotels', (SELECT COUNT(*) FROM hotels WHERE is_active = true AND deleted_at IS NULL),
        'ecommerce', (SELECT COUNT(*) FROM ecommerce_vendors WHERE is_active = true AND deleted_at IS NULL),
        'taxi', (SELECT COUNT(*) FROM driver_profiles WHERE is_verified = true AND deleted_at IS NULL),
        'total_revenue', (
            SELECT COALESCE(SUM(amount::numeric), 0)
            FROM payments
            WHERE payment_status = 'completed' AND deleted_at IS NULL
        ),
        'total_commission', (
            SELECT COALESCE(SUM(amount::numeric * 0.05), 0) -- 5% commission estimate
            FROM payments
            WHERE payment_status = 'completed' AND deleted_at IS NULL
        )
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_national_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_nipost_access_level"("uid" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT access_level FROM nipost_user_permissions
  WHERE user_id = uid AND is_active = true
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_nipost_access_level"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_nipost_role"("uid" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM nipost_user_permissions
  WHERE user_id = uid AND is_active = true
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_nipost_role"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_nipost_state_id"("uid" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT state_id FROM nipost_user_permissions
  WHERE user_id = uid AND is_active = true
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_nipost_state_id"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_platform_setting"("setting_key" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  setting_value text;
BEGIN
  SELECT value INTO setting_value
  FROM public.platform_settings
  WHERE key = setting_key AND is_active = true
  LIMIT 1;
  
  RETURN setting_value;
END;
$$;


ALTER FUNCTION "public"."get_platform_setting"("setting_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_platform_setting"("setting_category" "text", "setting_key" "text", "default_value" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT value INTO result
  FROM public.platform_settings
  WHERE category = setting_category AND key = setting_key;
  
  RETURN COALESCE(result, default_value);
END;
$$;


ALTER FUNCTION "public"."get_platform_setting"("setting_category" "text", "setting_key" "text", "default_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pmg_state"("uid" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT nup.state_id FROM nipost_user_permissions nup
  WHERE nup.user_id = uid AND nup.is_active = true
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_pmg_state"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sales_comparison"("current_period_start" "date" DEFAULT NULL::"date", "current_period_end" "date" DEFAULT NULL::"date") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result JSON;
  current_sales DECIMAL(15,2);
  previous_sales DECIMAL(15,2);
  percent_change DECIMAL(5,2);
  start_date DATE;
  end_date DATE;
  period_days INTEGER;
BEGIN
  start_date := COALESCE(current_period_start, CURRENT_DATE - INTERVAL '30 days');
  end_date := COALESCE(current_period_end, CURRENT_DATE);
  period_days := end_date - start_date;

  SELECT COALESCE(SUM(total_amount), 0) INTO current_sales
  FROM ecommerce_orders
  WHERE created_at BETWEEN start_date AND end_date
  AND payment_status = 'paid';

  SELECT COALESCE(SUM(total_amount), 0) INTO previous_sales
  FROM ecommerce_orders
  WHERE created_at BETWEEN (start_date - period_days) AND start_date
  AND payment_status = 'paid';

  IF previous_sales > 0 THEN
    percent_change := ((current_sales - previous_sales) / previous_sales) * 100;
  ELSE
    percent_change := 100;
  END IF;

  SELECT json_build_object(
    'current_period', json_build_object(
      'start_date', start_date,
      'end_date', end_date,
      'sales', current_sales
    ),
    'previous_period', json_build_object(
      'start_date', start_date - period_days,
      'end_date', start_date,
      'sales', previous_sales
    ),
    'change', json_build_object(
      'amount', current_sales - previous_sales,
      'percentage', percent_change,
      'trend', CASE WHEN percent_change >= 0 THEN 'up' ELSE 'down' END
    )
  ) INTO result;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_sales_comparison"("current_period_start" "date", "current_period_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_state_summary"("p_state_id" character varying) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'state_id', p_state_id,
        'branches', (SELECT COUNT(DISTINCT branch_id) FROM nipost_user_permissions WHERE state_id = p_state_id),
        'hotels', (SELECT COUNT(*) FROM nipost_hotels WHERE state_id = p_state_id),
        'ecommerce', (SELECT COUNT(*) FROM nipost_ecommerce WHERE state_id = p_state_id),
        'taxi', (SELECT COUNT(*) FROM nipost_taxi WHERE state_id = p_state_id),
        'total_revenue', (
            SELECT COALESCE(SUM(gross_amount), 0)
            FROM nipost_financial_ledger
            WHERE state_id = p_state_id AND payment_status = 'completed'
        ),
        'total_commission', (
            SELECT COALESCE(SUM(commission_amount), 0)
            FROM nipost_financial_ledger
            WHERE state_id = p_state_id AND payment_status = 'completed'
        )
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_state_summary"("p_state_id" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_access_level"("uid" "uuid") RETURNS TABLE("access_level" character varying, "branch_id" character varying, "state_id" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT p.access_level, p.branch_id, p.state_id
    FROM nipost_user_permissions p
    WHERE p.user_id = uid AND p.is_active = true
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_user_access_level"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_wallet_balance"("p_user_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT balance INTO v_balance
  FROM user_wallets
  WHERE user_id = p_user_id;
  
  -- If wallet doesn't exist, return 0
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  RETURN v_balance;
END;
$$;


ALTER FUNCTION "public"."get_wallet_balance"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_courier_approval"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_pmg_state_id TEXT;
  v_pmg_state_name TEXT;
BEGIN
  -- Only process when status changes to 'approved'
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    
    -- Get PMG's state information from nipost_user_permissions
    SELECT state_id, state_name
    INTO v_pmg_state_id, v_pmg_state_name
    FROM nipost_user_permissions
    WHERE user_id = NEW.approved_by
      AND role = 'PMG'
      AND is_active = true
    LIMIT 1;

    -- If PMG not found, use courier's state
    IF v_pmg_state_id IS NULL THEN
      v_pmg_state_id := NEW.state_id;
      v_pmg_state_name := NEW.state;
    END IF;

    -- Update courier profile with approving state information
    NEW.approving_state_id := v_pmg_state_id;
    NEW.approving_state := v_pmg_state_name;

    -- 1. Create entry in user_roles
    INSERT INTO user_roles (user_id, role_name, assigned_by, assigned_at)
    VALUES (NEW.user_id, 'COURIER', NEW.approved_by, NEW.approved_at)
    ON CONFLICT (user_id, role_name) DO NOTHING;

    -- 2. Create entry in user_active_roles (set as active role)
    INSERT INTO user_active_roles (user_id, active_role)
    VALUES (NEW.user_id, 'COURIER')
    ON CONFLICT (user_id) DO UPDATE SET
      active_role = EXCLUDED.active_role,
      updated_at = NOW();

    RAISE NOTICE 'Created COURIER role for user % approved by PMG in state %', NEW.user_id, v_pmg_state_name;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_courier_approval"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_courier_approval"() IS 'Automatically create COURIER role when courier profile is approved by PMG';



CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is being created as an admin
  v_is_admin := (NEW.raw_app_meta_data->>'role' = 'ADMIN');
  
  -- 1. Create user profile (for all users)
  INSERT INTO public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- 2. For regular users (not admins), create customer profile
  IF NOT v_is_admin THEN
    INSERT INTO public.customer_profiles (user_id, created_at, updated_at)
    VALUES (NEW.id, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  -- 3. Assign default role based on user type
  IF v_is_admin THEN
    -- Admin gets ADMIN role
    INSERT INTO public.user_roles (user_id, role_name, granted_at)
    VALUES (NEW.id, 'ADMIN', NOW())
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.user_active_roles (user_id, active_role, updated_at)
    VALUES (NEW.id, 'ADMIN', NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET active_role = 'ADMIN', updated_at = NOW();
  ELSE
    -- Regular user gets CUSTOMER role
    INSERT INTO public.user_roles (user_id, role_name, granted_at)
    VALUES (NEW.id, 'CUSTOMER', NOW())
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.user_active_roles (user_id, active_role, updated_at)
    VALUES (NEW.id, 'CUSTOMER', NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET active_role = 'CUSTOMER', updated_at = NOW();
  END IF;
  
  -- 4. Create wallet ONLY for regular customers (not admins)
  IF NOT v_is_admin THEN
    INSERT INTO public.user_wallets (
      user_id, 
      balance, 
      currency,
      is_active,
      is_locked,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id, 
      0.00, 
      'NGN',
      true,
      false,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_auth_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.role_name IN ('DRIVER', 'HOST', 'VENDOR', 'ADVERTISER') THEN
    PERFORM public.create_role_specific_profile(NEW.user_id, NEW.role_name);
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is being created as an admin
  v_is_admin := (NEW.raw_app_meta_data->>'role' = 'ADMIN');
  
  -- 1. Create user profile (for all users)
  INSERT INTO public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- 2. For regular users (not admins), create customer profile
  IF NOT v_is_admin THEN
    INSERT INTO public.customer_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  -- 3. Assign default role based on user type
  IF v_is_admin THEN
    -- Admin gets ADMIN role
    INSERT INTO public.user_roles (user_id, role_name, granted_at)
    VALUES (NEW.id, 'ADMIN', NOW())
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.user_active_roles (user_id, active_role, updated_at)
    VALUES (NEW.id, 'ADMIN', NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET active_role = 'ADMIN', updated_at = NOW();
  ELSE
    -- Regular user gets CUSTOMER role
    INSERT INTO public.user_roles (user_id, role_name, granted_at)
    VALUES (NEW.id, 'CUSTOMER', NOW())
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.user_active_roles (user_id, active_role, updated_at)
    VALUES (NEW.id, 'CUSTOMER', NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET active_role = 'CUSTOMER', updated_at = NOW();
  END IF;
  
  -- 4. Create wallet ONLY for regular customers (not admins)
  IF NOT v_is_admin THEN
    INSERT INTO public.user_wallets (
      user_id, 
      balance, 
      currency,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id, 
      0.00, 
      'NGN',
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Auto-creates user setup on signup: user_profile (all users), customer_profile (customers only), appropriate role (ADMIN or CUSTOMER), and wallet (customers only, not admins)';



CREATE OR REPLACE FUNCTION "public"."handle_postal_staff_approval"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_role TEXT;
  v_permissions TEXT[];
  v_state_id TEXT;
  v_state_name TEXT;
BEGIN
  -- Only process when status changes to 'approved'
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    
    -- Map staff_type to role
    CASE NEW.staff_type
      WHEN 'postmaster' THEN
        v_role := 'PMG';
        v_permissions := ARRAY[
          'postal:read', 'postal:write', 'postal:monitor',
          'courier:read', 'courier:approve', 'courier:manage',
          'financial:read', 'financial:ledger',
          'reports:read', 'reports:generate'
        ];
      WHEN 'regional_manager' THEN
        v_role := 'REGIONAL_MANAGER';
        v_permissions := ARRAY[
          'postal:read', 'postal:monitor',
          'courier:read',
          'reports:read'
        ];
      WHEN 'admin_staff' THEN
        v_role := 'MODULE_ADMIN';
        v_permissions := ARRAY[
          'module:read', 'module:write', 'module:manage',
          'reports:read'
        ];
      ELSE
        -- Unknown staff_type, skip
        RETURN NEW;
    END CASE;

    -- Get state information from postal_staff record
    v_state_name := NEW.state;
    v_state_id := NEW.state; -- Using state name as ID for now

    -- Ensure user_id is set
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'user_id must be set before approval';
    END IF;

    -- 1. Create entry in user_roles
    INSERT INTO user_roles (user_id, role_name, assigned_by, assigned_at)
    VALUES (NEW.user_id, v_role, NEW.approved_by, NEW.approved_at)
    ON CONFLICT (user_id, role_name) DO NOTHING;

    -- 2. Create entry in nipost_user_permissions
    INSERT INTO nipost_user_permissions (
      user_id,
      role,
      access_level,
      state_id,
      state_name,
      permissions,
      is_active,
      created_by
    )
    VALUES (
      NEW.user_id,
      v_role,
      'state', -- PMG, REGIONAL_MANAGER, and MODULE_ADMIN all have state-level access
      v_state_id,
      v_state_name,
      v_permissions,
      true,
      NEW.approved_by
    )
    ON CONFLICT (user_id) DO UPDATE SET
      role = EXCLUDED.role,
      access_level = EXCLUDED.access_level,
      state_id = EXCLUDED.state_id,
      state_name = EXCLUDED.state_name,
      permissions = EXCLUDED.permissions,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();

    -- 3. Create entry in user_active_roles (set as active role)
    INSERT INTO user_active_roles (user_id, active_role)
    VALUES (NEW.user_id, v_role)
    ON CONFLICT (user_id) DO UPDATE SET
      active_role = EXCLUDED.active_role,
      updated_at = NOW();

    RAISE NOTICE 'Created NIPOST admin permissions for user % with role %', NEW.user_id, v_role;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_postal_staff_approval"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_postal_staff_approval"() IS 'Automatically create user roles and permissions when postal staff is approved';



CREATE OR REPLACE FUNCTION "public"."has_permission"("required_permission" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM nipost_user_permissions 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND permissions @> ARRAY[required_permission]::TEXT[]
  );
END;
$$;


ALTER FUNCTION "public"."has_permission"("required_permission" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_permission"("required_permission" "text") IS 'Check if the current user has a specific permission string';



CREATE OR REPLACE FUNCTION "public"."has_role"("required_roles" "text"[]) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM nipost_user_permissions 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND role = ANY(required_roles)
  );
END;
$$;


ALTER FUNCTION "public"."has_role"("required_roles" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_role"("required_roles" "text"[]) IS 'Check if the current user has any of the specified roles';



CREATE OR REPLACE FUNCTION "public"."is_admin_user"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM nipost_user_permissions 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND access_level IN ('national', 'state', 'branch')
  );
END;
$$;


ALTER FUNCTION "public"."is_admin_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin_user"() IS 'Check if the current user has any admin access level (national, state, or branch)';



CREATE OR REPLACE FUNCTION "public"."is_courier"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = uid 
      AND role_name = 'COURIER'
  );
$$;


ALTER FUNCTION "public"."is_courier"("uid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_courier"("uid" "uuid") IS 'Check if user has COURIER role in user_roles';



CREATE OR REPLACE FUNCTION "public"."is_dop"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM nipost_officials
    WHERE user_id = uid AND position = 'DOP' AND approval_status = 'approved' AND is_active = true
  );
$$;


ALTER FUNCTION "public"."is_dop"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_module_admin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM nipost_user_permissions
    WHERE user_id = uid 
      AND role = 'MODULE_ADMIN' 
      AND is_active = true
  );
$$;


ALTER FUNCTION "public"."is_module_admin"("uid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_module_admin"("uid" "uuid") IS 'Check if user has MODULE_ADMIN role in nipost_user_permissions';



CREATE OR REPLACE FUNCTION "public"."is_postmaster_general"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM nipost_officials
    WHERE user_id = uid AND position = 'PMG' AND approval_status = 'approved' AND is_active = true
  );
$$;


ALTER FUNCTION "public"."is_postmaster_general"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_regional_manager"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM nipost_officials
    WHERE user_id = uid AND position = 'regional_manager' AND approval_status = 'approved' AND is_active = true
  );
$$;


ALTER FUNCTION "public"."is_regional_manager"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_service_role_action"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only log if current role is service_role
  IF current_setting('role') = 'service_role' THEN
    INSERT INTO audit_trail (
      table_name,
      record_id,
      action,
      user_id,
      user_email,
      created_at,
      metadata
    ) VALUES (
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      TG_OP,
      NULL, -- service role has no user_id
      'service_role@system',
      NOW(),
      jsonb_build_object('service_role_action', true)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."log_service_role_action"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mask_sensitive_data"("data" "text", "mask_type" "text" DEFAULT 'card'::"text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN data;
  END IF;
  
  CASE mask_type
    WHEN 'card' THEN
      -- Show only last 4 digits: **** **** **** 1234
      RETURN '****-****-****-' || RIGHT(data, 4);
    WHEN 'account' THEN
      -- Show only last 4 digits: ******1234
      RETURN REPEAT('*', GREATEST(0, LENGTH(data) - 4)) || RIGHT(data, 4);
    WHEN 'email' THEN
      -- Show first char and domain: j***@example.com
      RETURN LEFT(data, 1) || REPEAT('*', GREATEST(0, POSITION('@' IN data) - 2)) || 
             SUBSTRING(data FROM POSITION('@' IN data));
    WHEN 'phone' THEN
      -- Show last 4 digits: ***-***-1234
      RETURN REPEAT('*', GREATEST(0, LENGTH(data) - 4)) || RIGHT(data, 4);
    ELSE
      -- Default masking
      RETURN REPEAT('*', LENGTH(data));
  END CASE;
END;
$$;


ALTER FUNCTION "public"."mask_sensitive_data"("data" "text", "mask_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_assignment_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.assignment_number IS NULL OR NEW.assignment_number = '' THEN
        NEW.assignment_number := generate_assignment_number();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_assignment_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_courier_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.courier_code IS NULL OR NEW.courier_code = '' THEN
        NEW.courier_code := generate_courier_code();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_courier_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_post_like"("p_post_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("liked" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  existing_like_id UUID;
BEGIN
  -- Check if like already exists
  SELECT id INTO existing_like_id
  FROM post_likes
  WHERE post_id = p_post_id AND user_id = p_user_id;

  IF existing_like_id IS NOT NULL THEN
    -- Unlike: delete the existing like
    DELETE FROM post_likes WHERE id = existing_like_id;
    RETURN QUERY SELECT FALSE as liked;
  ELSE
    -- Like: insert new like
    INSERT INTO post_likes (post_id, user_id, tenant_id)
    VALUES (p_post_id, p_user_id, p_tenant_id);
    RETURN QUERY SELECT TRUE as liked;
  END IF;
END;
$$;


ALTER FUNCTION "public"."toggle_post_like"("p_post_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Lock conversation row to prevent concurrent updates
  PERFORM 1 FROM conversations WHERE id = NEW.conversation_id FOR UPDATE;
  
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_text = NEW.content,
    last_message_sender = NEW.sender_id,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise for proper rollback
    RAISE WARNING 'Conversation update failed for conversation_id %: %', NEW.conversation_id, SQLERRM;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_courier_location"("courier_uuid" "uuid", "lat" double precision, "lng" double precision) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."update_courier_location"("courier_uuid" "uuid", "lat" double precision, "lng" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_edge_function_inventory_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_edge_function_inventory_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_hotel_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Lock the hotel row to prevent concurrent rating updates
  PERFORM 1 FROM hotels WHERE id = NEW.hotel_id FOR UPDATE;
  
  -- Now safely update with current data (no race condition)
  UPDATE hotels
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM hotel_reviews
      WHERE hotel_id = NEW.hotel_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM hotel_reviews
      WHERE hotel_id = NEW.hotel_id
    ),
    updated_at = NOW()
  WHERE id = NEW.hotel_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise for proper rollback
    RAISE WARNING 'Hotel rating update failed for hotel_id %: %', NEW.hotel_id, SQLERRM;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."update_hotel_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_nipost_permissions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_nipost_permissions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_post_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Lock the post row to prevent concurrent count updates
  PERFORM 1 FROM social_posts WHERE id = NEW.post_id FOR UPDATE;
  
  -- Update counts based on trigger table
  IF TG_TABLE_NAME = 'post_likes' THEN
    UPDATE social_posts
    SET 
      like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = NEW.post_id),
      updated_at = NOW()
    WHERE id = NEW.post_id;
  ELSIF TG_TABLE_NAME = 'post_comments' THEN
    UPDATE social_posts
    SET 
      comment_count = (SELECT COUNT(*) FROM post_comments WHERE post_id = NEW.post_id),
      updated_at = NOW()
    WHERE id = NEW.post_id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise for proper rollback
    RAISE WARNING 'Post count update failed for post_id % on table %: %', NEW.post_id, TG_TABLE_NAME, SQLERRM;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."update_post_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_product_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Lock the product row to prevent concurrent rating updates
  PERFORM 1 FROM ecommerce_products WHERE id = NEW.product_id FOR UPDATE;
  
  -- Now safely update with current data (no race condition)
  UPDATE ecommerce_products
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM ecommerce_product_reviews
      WHERE product_id = NEW.product_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM ecommerce_product_reviews
      WHERE product_id = NEW.product_id
    ),
    updated_at = NOW()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise for proper rollback
    RAISE WARNING 'Product rating update failed for product_id %: %', NEW.product_id, SQLERRM;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."update_product_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_type" "text" NOT NULL,
    "name" "text",
    "description" "text",
    "avatar_url" "text",
    "created_by" "uuid",
    "is_encrypted" boolean DEFAULT false,
    "last_message_at" timestamp with time zone,
    "last_message_text" "text",
    "last_message_sender" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    CONSTRAINT "conversations_conversation_type_check" CHECK (("conversation_type" = ANY (ARRAY['direct'::"text", 'group'::"text"])))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."active_conversations" AS
 SELECT "id",
    "conversation_type",
    "name",
    "description",
    "avatar_url",
    "created_by",
    "is_encrypted",
    "last_message_at",
    "last_message_text",
    "last_message_sender",
    "is_active",
    "created_at",
    "updated_at",
    "deleted_at",
    "deleted_by",
    "deletion_reason"
   FROM "public"."conversations"
  WHERE ("deleted_at" IS NULL);


ALTER VIEW "public"."active_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecommerce_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid",
    "category_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "short_description" "text",
    "base_price" numeric(10,2) NOT NULL,
    "discount_percentage" integer DEFAULT 0,
    "final_price" numeric(10,2) GENERATED ALWAYS AS ((("base_price" * ((100 - "discount_percentage"))::numeric) / 100.0)) STORED,
    "cost_price" numeric(10,2),
    "sku" "text",
    "stock_quantity" integer DEFAULT 0,
    "low_stock_threshold" integer DEFAULT 10,
    "track_inventory" boolean DEFAULT true,
    "allow_backorder" boolean DEFAULT false,
    "images" "text"[] DEFAULT '{}'::"text"[],
    "thumbnail" "text",
    "video_url" "text",
    "meta_title" "text",
    "meta_description" "text",
    "meta_keywords" "text"[],
    "specifications" "jsonb" DEFAULT '{}'::"jsonb",
    "attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "weight" numeric(8,2),
    "dimensions" "jsonb",
    "requires_shipping" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "view_count" integer DEFAULT 0,
    "order_count" integer DEFAULT 0,
    "average_rating" numeric(3,2) DEFAULT 0,
    "review_count" integer DEFAULT 0,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    "approval_status" character varying(20) DEFAULT 'approved'::character varying,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "rejection_reason" "text",
    CONSTRAINT "ecommerce_products_base_price_check" CHECK (("base_price" >= (0)::numeric)),
    CONSTRAINT "ecommerce_products_discount_percentage_check" CHECK ((("discount_percentage" >= 0) AND ("discount_percentage" <= 100))),
    CONSTRAINT "ecommerce_products_stock_quantity_check" CHECK (("stock_quantity" >= 0))
);


ALTER TABLE "public"."ecommerce_products" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."active_ecommerce_products" AS
 SELECT "id",
    "vendor_id",
    "category_id",
    "name",
    "slug",
    "description",
    "short_description",
    "base_price",
    "discount_percentage",
    "final_price",
    "cost_price",
    "sku",
    "stock_quantity",
    "low_stock_threshold",
    "track_inventory",
    "allow_backorder",
    "images",
    "thumbnail",
    "video_url",
    "meta_title",
    "meta_description",
    "meta_keywords",
    "specifications",
    "attributes",
    "weight",
    "dimensions",
    "requires_shipping",
    "is_active",
    "is_featured",
    "view_count",
    "order_count",
    "average_rating",
    "review_count",
    "published_at",
    "created_at",
    "updated_at",
    "deleted_at",
    "deleted_by",
    "deletion_reason"
   FROM "public"."ecommerce_products"
  WHERE ("deleted_at" IS NULL);


ALTER VIEW "public"."active_ecommerce_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "host_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "short_description" "text",
    "address" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text",
    "country" "text" NOT NULL,
    "postal_code" "text",
    "latitude" double precision,
    "longitude" double precision,
    "phone" "text",
    "email" "text",
    "website" "text",
    "check_in_time" time without time zone DEFAULT '14:00:00'::time without time zone NOT NULL,
    "check_out_time" time without time zone DEFAULT '12:00:00'::time without time zone NOT NULL,
    "cancellation_policy" "text",
    "house_rules" "text",
    "star_rating" integer,
    "average_rating" double precision DEFAULT 0,
    "total_reviews" integer DEFAULT 0,
    "total_bookings" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "is_verified" boolean DEFAULT false,
    "verified_at" timestamp with time zone,
    "featured_image" "text",
    "images" "text"[] DEFAULT '{}'::"text"[],
    "video_url" "text",
    "amenities" "text"[] DEFAULT '{}'::"text"[],
    "nearby_attractions" "jsonb" DEFAULT '{}'::"jsonb",
    "policies" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "location" "public"."geography"(Point,4326),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    "approval_status" character varying(20) DEFAULT 'approved'::character varying,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "rejection_reason" "text",
    CONSTRAINT "hotels_star_rating_check" CHECK ((("star_rating" >= 1) AND ("star_rating" <= 5)))
);


ALTER TABLE "public"."hotels" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."active_hotels" AS
 SELECT "id",
    "host_id",
    "name",
    "slug",
    "description",
    "short_description",
    "address",
    "city",
    "state",
    "country",
    "postal_code",
    "latitude",
    "longitude",
    "phone",
    "email",
    "website",
    "check_in_time",
    "check_out_time",
    "cancellation_policy",
    "house_rules",
    "star_rating",
    "average_rating",
    "total_reviews",
    "total_bookings",
    "is_active",
    "is_verified",
    "verified_at",
    "featured_image",
    "images",
    "video_url",
    "amenities",
    "nearby_attractions",
    "policies",
    "created_at",
    "updated_at",
    "location",
    "deleted_at",
    "deleted_by",
    "deletion_reason"
   FROM "public"."hotels"
  WHERE ("deleted_at" IS NULL);


ALTER VIEW "public"."active_hotels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "message_type" "text" NOT NULL,
    "content" "text",
    "media_url" "text",
    "thumbnail_url" "text",
    "file_name" "text",
    "file_size" bigint,
    "duration_seconds" integer,
    "location_data" "jsonb",
    "contact_data" "jsonb",
    "reply_to_id" "uuid",
    "forward_from" "uuid",
    "is_edited" boolean DEFAULT false,
    "is_deleted" boolean DEFAULT false,
    "deleted_for_everyone" boolean DEFAULT false,
    "read_by" "uuid"[] DEFAULT '{}'::"uuid"[],
    "delivered_to" "uuid"[] DEFAULT '{}'::"uuid"[],
    "reactions" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "edited_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    CONSTRAINT "messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'video'::"text", 'audio'::"text", 'file'::"text", 'location'::"text", 'contact'::"text", 'sticker'::"text", 'gif'::"text", 'system'::"text", 'call_notification'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."active_messages" AS
 SELECT "id",
    "conversation_id",
    "sender_id",
    "message_type",
    "content",
    "media_url",
    "thumbnail_url",
    "file_name",
    "file_size",
    "duration_seconds",
    "location_data",
    "contact_data",
    "reply_to_id",
    "forward_from",
    "is_edited",
    "is_deleted",
    "deleted_for_everyone",
    "read_by",
    "delivered_to",
    "reactions",
    "created_at",
    "edited_at",
    "deleted_at",
    "deleted_by",
    "deletion_reason"
   FROM "public"."messages"
  WHERE ("deleted_at" IS NULL);


ALTER VIEW "public"."active_messages" OWNER TO "postgres";


COMMENT ON VIEW "public"."active_messages" IS 'View of non-deleted messages - use this instead of direct table access';



CREATE TABLE IF NOT EXISTS "public"."social_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "media_urls" "text"[] DEFAULT '{}'::"text"[],
    "post_type" "text" DEFAULT 'post'::"text",
    "visibility" "text" DEFAULT 'public'::"text",
    "allowed_viewers" "uuid"[],
    "location" "jsonb",
    "feeling_activity" "text",
    "tagged_users" "uuid"[],
    "like_count" integer DEFAULT 0,
    "comment_count" integer DEFAULT 0,
    "share_count" integer DEFAULT 0,
    "view_count" integer DEFAULT 0,
    "shared_post_id" "uuid",
    "is_active" boolean DEFAULT true,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    "tenant_id" "uuid",
    CONSTRAINT "social_posts_post_type_check" CHECK (("post_type" = ANY (ARRAY['post'::"text", 'story'::"text", 'reel'::"text", 'status'::"text"]))),
    CONSTRAINT "social_posts_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'friends'::"text", 'private'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."social_posts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."social_posts"."tenant_id" IS 'Multi-tenant isolation - NULL for legacy data, UUID for tenant-scoped data';



CREATE OR REPLACE VIEW "public"."active_social_posts" AS
 SELECT "id",
    "user_id",
    "content",
    "media_urls",
    "post_type",
    "visibility",
    "allowed_viewers",
    "location",
    "feeling_activity",
    "tagged_users",
    "like_count",
    "comment_count",
    "share_count",
    "view_count",
    "shared_post_id",
    "is_active",
    "expires_at",
    "created_at",
    "updated_at",
    "deleted_at",
    "deleted_by",
    "deletion_reason"
   FROM "public"."social_posts"
  WHERE ("deleted_at" IS NULL);


ALTER VIEW "public"."active_social_posts" OWNER TO "postgres";


COMMENT ON VIEW "public"."active_social_posts" IS 'View of non-deleted social posts - use this instead of direct table access';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "first_name" "text" DEFAULT ''::"text",
    "last_name" "text" DEFAULT ''::"text",
    "avatar" "text",
    "date_of_birth" "date",
    "gender" "text",
    "marital_status" "text",
    "body_weight" double precision,
    "height" double precision,
    "age_group" "text",
    "areas_of_interest" "text"[],
    "is_phone_verified" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    "state" "text"
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_profiles" IS 'Primary user profile table - consolidated from duplicate profiles table';



COMMENT ON COLUMN "public"."user_profiles"."deleted_at" IS 'Soft delete timestamp - NULL means active record';



COMMENT ON COLUMN "public"."user_profiles"."deleted_by" IS 'User who performed the deletion';



COMMENT ON COLUMN "public"."user_profiles"."deletion_reason" IS 'Reason for deletion (user_request, gdpr_erasure, admin_action, etc.)';



CREATE OR REPLACE VIEW "public"."active_user_profiles" AS
 SELECT "id",
    "email",
    "phone",
    "first_name",
    "last_name",
    "avatar",
    "date_of_birth",
    "gender",
    "marital_status",
    "body_weight",
    "height",
    "age_group",
    "areas_of_interest",
    "is_phone_verified",
    "is_active",
    "last_login_at",
    "created_at",
    "updated_at",
    "avatar_url",
    "deleted_at",
    "deleted_by",
    "deletion_reason"
   FROM "public"."user_profiles"
  WHERE ("deleted_at" IS NULL);


ALTER VIEW "public"."active_user_profiles" OWNER TO "postgres";


COMMENT ON VIEW "public"."active_user_profiles" IS 'View of non-deleted user profiles - use this instead of direct table access';



CREATE TABLE IF NOT EXISTS "public"."ad_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_number" "text" NOT NULL,
    "advertiser_id" "uuid" NOT NULL,
    "campaign_name" "text" NOT NULL,
    "campaign_type" "text",
    "description" "text",
    "budget" numeric NOT NULL,
    "daily_budget" numeric,
    "spent_amount" numeric DEFAULT 0,
    "impressions" integer DEFAULT 0,
    "clicks" integer DEFAULT 0,
    "conversions" integer DEFAULT 0,
    "ctr" numeric DEFAULT 0,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "target_audience" "jsonb",
    "creative_assets" "jsonb",
    "landing_url" "text",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "status" "text" DEFAULT 'draft'::"text",
    "rejection_reason" "text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    "review_notes" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "ad_campaigns_budget_check" CHECK (("budget" > (0)::numeric)),
    CONSTRAINT "ad_campaigns_campaign_type_check" CHECK (("campaign_type" = ANY (ARRAY['banner'::"text", 'video'::"text", 'native'::"text", 'sponsored'::"text", 'search'::"text"]))),
    CONSTRAINT "ad_campaigns_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'partially_paid'::"text", 'refunded'::"text", 'failed'::"text"]))),
    CONSTRAINT "ad_campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending_approval'::"text", 'active'::"text", 'paused'::"text", 'completed'::"text", 'cancelled'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."ad_campaigns" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ad_campaigns"."deleted_at" IS 'Soft delete timestamp - NULL means active record';



COMMENT ON COLUMN "public"."ad_campaigns"."deleted_by" IS 'User who performed the deletion';



COMMENT ON COLUMN "public"."ad_campaigns"."deletion_reason" IS 'Reason for deletion';



COMMENT ON COLUMN "public"."ad_campaigns"."review_notes" IS 'Notes from the reviewer about the campaign';



COMMENT ON COLUMN "public"."ad_campaigns"."reviewed_by" IS 'Admin who reviewed the campaign';



COMMENT ON COLUMN "public"."ad_campaigns"."reviewed_at" IS 'Timestamp when the campaign was reviewed';



CREATE TABLE IF NOT EXISTS "public"."admin_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "official_id" "uuid",
    "action_type" "text" NOT NULL,
    "module_name" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "text",
    "region_id" "uuid",
    "action_details" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "status" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_actions_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'failed'::"text", 'pending'::"text"])))
);


ALTER TABLE "public"."admin_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_type" "text" NOT NULL,
    "reference_id" "uuid" NOT NULL,
    "reference_type" "text" NOT NULL,
    "requested_by" "uuid",
    "assigned_to" "uuid",
    "region_id" "uuid",
    "priority" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "request_data" "jsonb",
    "decision_notes" "text",
    "decided_by" "uuid",
    "decided_at" timestamp with time zone,
    "escalated_to" "uuid",
    "escalation_reason" "text",
    "sla_deadline" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_approvals_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "admin_approvals_request_type_check" CHECK (("request_type" = ANY (ARRAY['vendor_verification'::"text", 'refund_request'::"text", 'dispute_resolution'::"text", 'content_moderation'::"text", 'account_suspension'::"text", 'payout_approval'::"text", 'role_application'::"text", 'withdrawal_request'::"text", 'ad_campaign_approval'::"text"]))),
    CONSTRAINT "admin_approvals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_review'::"text", 'approved'::"text", 'rejected'::"text", 'escalated'::"text"])))
);


ALTER TABLE "public"."admin_approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "permission_code" "text" NOT NULL,
    "permission_name" "text" NOT NULL,
    "module_name" "text" NOT NULL,
    "description" "text",
    "min_clearance_level" integer DEFAULT 1,
    "required_department" "text"[],
    "is_global" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advertiser_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_name" "text" NOT NULL,
    "industry" "text",
    "website" "text",
    "total_spend" double precision DEFAULT 0,
    "total_campaigns" integer DEFAULT 0,
    "is_verified" boolean DEFAULT false,
    "subscription_tier" "text" DEFAULT 'BASIC'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."advertiser_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "text",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_trail" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "changed_fields" "text"[],
    "user_id" "uuid",
    "user_email" "text",
    "user_role" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "request_id" "text",
    "session_id" "text",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "audit_trail_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text", 'SOFT_DELETE'::"text"])))
);


ALTER TABLE "public"."audit_trail" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_trail" IS 'Comprehensive audit trail for all data modifications - required for legal compliance';



CREATE SEQUENCE IF NOT EXISTS "public"."booking_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."booking_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "call_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone,
    "left_at" timestamp with time zone,
    "role" "text" DEFAULT 'participant'::"text",
    CONSTRAINT "call_participants_role_check" CHECK (("role" = ANY (ARRAY['initiator'::"text", 'participant'::"text"])))
);


ALTER TABLE "public"."call_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "call_type" "text" NOT NULL,
    "conversation_id" "uuid",
    "initiated_by" "uuid" NOT NULL,
    "participants" "uuid"[] NOT NULL,
    "agora_channel" "text",
    "agora_token" "text",
    "status" "text" NOT NULL,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "call_quality_rating" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "calls_call_quality_rating_check" CHECK ((("call_quality_rating" >= 1) AND ("call_quality_rating" <= 5))),
    CONSTRAINT "calls_call_type_check" CHECK (("call_type" = ANY (ARRAY['voice'::"text", 'video'::"text"]))),
    CONSTRAINT "calls_status_check" CHECK (("status" = ANY (ARRAY['initiated'::"text", 'ringing'::"text", 'active'::"text", 'ended'::"text", 'missed'::"text", 'declined'::"text", 'busy'::"text"])))
);


ALTER TABLE "public"."calls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comment_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comment_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "left_at" timestamp with time zone,
    "last_read_at" timestamp with time zone,
    "is_muted" boolean DEFAULT false,
    "is_blocked" boolean DEFAULT false,
    "nickname" "text",
    CONSTRAINT "conversation_participants_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'moderator'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courier_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "courier_code" "text" NOT NULL,
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
    "availability_status" "public"."courier_availability_status" DEFAULT 'offline'::"public"."courier_availability_status",
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
    "approval_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "approving_state" "text",
    "approving_state_id" "text",
    "rejected_by" "uuid",
    "rejected_at" timestamp with time zone,
    "rejection_reason" "text",
    "state" "text",
    "state_id" "text",
    CONSTRAINT "courier_profiles_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'suspended'::"text"]))),
    CONSTRAINT "courier_profiles_capacity_check" CHECK (("vehicle_capacity_kg" > (0)::numeric)),
    CONSTRAINT "courier_profiles_radius_check" CHECK (("max_delivery_radius_km" > (0)::numeric)),
    CONSTRAINT "courier_profiles_rating_check" CHECK ((("rating" >= (0)::numeric) AND ("rating" <= (5)::numeric)))
);


ALTER TABLE "public"."courier_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."courier_profiles" IS 'Stores courier/driver profile information with location tracking and availability status';



COMMENT ON COLUMN "public"."courier_profiles"."current_location" IS 'PostGIS geography point for spatial queries';



CREATE TABLE IF NOT EXISTS "public"."customer_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "preferences" "jsonb",
    "loyalty_points" integer DEFAULT 0,
    "membership_tier" "text" DEFAULT 'BRONZE'::"text",
    "total_orders" integer DEFAULT 0,
    "total_spent" double precision DEFAULT 0,
    "occupation" "text",
    "company" "text",
    "emergency_contact" "jsonb",
    "medical_info" "jsonb",
    "social_media" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_classification" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "column_name" "text" NOT NULL,
    "classification" "text" NOT NULL,
    "encryption_required" boolean DEFAULT false,
    "audit_required" boolean DEFAULT false,
    "retention_days" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "data_classification_classification_check" CHECK (("classification" = ANY (ARRAY['public'::"text", 'internal'::"text", 'confidential'::"text", 'restricted'::"text"])))
);


ALTER TABLE "public"."data_classification" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assignment_number" "text" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "courier_id" "uuid" NOT NULL,
    "pickup_address_id" "uuid",
    "delivery_address_id" "uuid" NOT NULL,
    "pickup_location" "public"."geography"(Point,4326),
    "delivery_location" "public"."geography"(Point,4326),
    "pickup_latitude" double precision,
    "pickup_longitude" double precision,
    "delivery_latitude" double precision,
    "delivery_longitude" double precision,
    "status" "public"."delivery_status" DEFAULT 'pending'::"public"."delivery_status",
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
    CONSTRAINT "delivery_assignments_commission_check" CHECK (("courier_commission" >= (0)::numeric)),
    CONSTRAINT "delivery_assignments_fee_check" CHECK (("delivery_fee" >= (0)::numeric)),
    CONSTRAINT "delivery_assignments_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 5))),
    CONSTRAINT "delivery_assignments_rating_check" CHECK ((("customer_rating" >= 1) AND ("customer_rating" <= 5))),
    CONSTRAINT "delivery_assignments_weight_check" CHECK (("package_weight_kg" > (0)::numeric))
);


ALTER TABLE "public"."delivery_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."delivery_assignments" IS 'Links orders to couriers with delivery details and tracking information';



COMMENT ON COLUMN "public"."delivery_assignments"."priority" IS 'Delivery priority: 1=Urgent, 2=High, 3=Normal, 4=Low, 5=Scheduled';



CREATE TABLE IF NOT EXISTS "public"."delivery_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "delivery_assignment_id" "uuid" NOT NULL,
    "courier_id" "uuid" NOT NULL,
    "exception_type" "public"."delivery_exception_type" NOT NULL,
    "exception_code" "text",
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "severity" "text" DEFAULT 'medium'::"text",
    "location" "public"."geography"(Point,4326),
    "latitude" double precision,
    "longitude" double precision,
    "photo_urls" "text"[] DEFAULT '{}'::"text"[],
    "audio_note_url" "text",
    "resolution_status" "text" DEFAULT 'open'::"text",
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
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    CONSTRAINT "delivery_exceptions_cost_check" CHECK (("additional_cost" >= (0)::numeric)),
    CONSTRAINT "delivery_exceptions_delay_check" CHECK (("delay_minutes" >= 0)),
    CONSTRAINT "delivery_exceptions_resolution_check" CHECK (("resolution_status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'resolved'::"text", 'escalated'::"text", 'closed'::"text"]))),
    CONSTRAINT "delivery_exceptions_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."delivery_exceptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."delivery_exceptions" IS 'Records delivery issues and exceptions with resolution tracking';



COMMENT ON COLUMN "public"."delivery_exceptions"."severity" IS 'Exception severity level affecting delivery timeline';



CREATE TABLE IF NOT EXISTS "public"."delivery_packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid",
    "recipient_id" "uuid",
    "sender_name" "text" NOT NULL,
    "sender_phone" "text" NOT NULL,
    "sender_address" "text" NOT NULL,
    "sender_lat" double precision,
    "sender_lng" double precision,
    "recipient_name" "text" NOT NULL,
    "recipient_phone" "text" NOT NULL,
    "recipient_address" "text" NOT NULL,
    "recipient_lat" double precision,
    "recipient_lng" double precision,
    "package_description" "text",
    "package_weight" numeric,
    "package_dimensions" "jsonb",
    "delivery_fee" numeric DEFAULT 0,
    "status" "text" DEFAULT 'pending'::"text",
    "priority" "text" DEFAULT 'normal'::"text",
    "delivery_instructions" "text",
    "estimated_delivery" timestamp with time zone,
    "actual_delivery" timestamp with time zone,
    "proof_of_delivery" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    "tracking_number" "text",
    "package_type" "text" DEFAULT 'Parcel'::"text",
    "current_location" "text",
    "last_status_update" "text",
    "estimated_delivery_date" timestamp with time zone,
    CONSTRAINT "delivery_packages_delivery_fee_check" CHECK (("delivery_fee" >= (0)::numeric)),
    CONSTRAINT "delivery_packages_package_weight_check" CHECK (("package_weight" > (0)::numeric)),
    CONSTRAINT "delivery_packages_priority_check" CHECK (("priority" = ANY (ARRAY['urgent'::"text", 'high'::"text", 'normal'::"text", 'low'::"text", 'scheduled'::"text"]))),
    CONSTRAINT "delivery_packages_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'assigned'::"text", 'picked_up'::"text", 'left_facility'::"text", 'in_transit'::"text", 'arrived_facility'::"text", 'out_for_delivery'::"text", 'delivered'::"text", 'cancelled'::"text", 'returned'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."delivery_packages" OWNER TO "postgres";


COMMENT ON TABLE "public"."delivery_packages" IS 'Stores delivery package information for the delivery service';



COMMENT ON COLUMN "public"."delivery_packages"."tracking_number" IS 'Unique tracking ID format: 127777489-DL-NY';



COMMENT ON COLUMN "public"."delivery_packages"."package_type" IS 'Type of package: Parcel, Documents, Fragile, etc.';



COMMENT ON COLUMN "public"."delivery_packages"."current_location" IS 'Current location of the package';



COMMENT ON COLUMN "public"."delivery_packages"."last_status_update" IS 'Human-readable last status update message';



CREATE TABLE IF NOT EXISTS "public"."delivery_routes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "route_name" "text" NOT NULL,
    "courier_id" "uuid" NOT NULL,
    "route_date" "date" NOT NULL,
    "delivery_assignments" "uuid"[] DEFAULT '{}'::"uuid"[],
    "optimized_sequence" "jsonb",
    "total_distance_km" numeric(10,2),
    "estimated_total_duration_minutes" integer,
    "actual_total_duration_minutes" integer,
    "route_efficiency_score" numeric(3,2),
    "fuel_cost_estimate" numeric(8,2),
    "route_status" "text" DEFAULT 'planned'::"text",
    "optimization_algorithm" "text" DEFAULT 'basic'::"text",
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
    CONSTRAINT "delivery_routes_distance_check" CHECK (("total_distance_km" >= (0)::numeric)),
    CONSTRAINT "delivery_routes_duration_check" CHECK (("estimated_total_duration_minutes" >= 0)),
    CONSTRAINT "delivery_routes_efficiency_check" CHECK ((("route_efficiency_score" >= (0)::numeric) AND ("route_efficiency_score" <= (1)::numeric))),
    CONSTRAINT "delivery_routes_status_check" CHECK (("route_status" = ANY (ARRAY['planned'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."delivery_routes" OWNER TO "postgres";


COMMENT ON TABLE "public"."delivery_routes" IS 'Stores optimized delivery routes for couriers with efficiency metrics';



CREATE TABLE IF NOT EXISTS "public"."delivery_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "package_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "location" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."delivery_status_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."delivery_status_history" IS 'Tracks package status changes for delivery timeline';



CREATE TABLE IF NOT EXISTS "public"."delivery_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "delivery_assignment_id" "uuid" NOT NULL,
    "courier_id" "uuid" NOT NULL,
    "location" "public"."geography"(Point,4326) NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "altitude" double precision,
    "accuracy_meters" numeric(8,2),
    "speed_kmh" numeric(6,2),
    "heading_degrees" numeric(5,2),
    "battery_level" integer,
    "signal_strength" integer,
    "tracking_source" "text" DEFAULT 'mobile_app'::"text",
    "activity_type" "text",
    "distance_from_destination_km" numeric(8,2),
    "estimated_arrival_minutes" integer,
    "is_active_tracking" boolean DEFAULT true,
    "network_type" "text",
    "device_info" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "delivery_tracking_accuracy_check" CHECK (("accuracy_meters" >= (0)::numeric)),
    CONSTRAINT "delivery_tracking_battery_check" CHECK ((("battery_level" >= 0) AND ("battery_level" <= 100))),
    CONSTRAINT "delivery_tracking_heading_check" CHECK ((("heading_degrees" >= (0)::numeric) AND ("heading_degrees" < (360)::numeric))),
    CONSTRAINT "delivery_tracking_signal_check" CHECK ((("signal_strength" >= 0) AND ("signal_strength" <= 100))),
    CONSTRAINT "delivery_tracking_source_check" CHECK (("tracking_source" = ANY (ARRAY['mobile_app'::"text", 'gps_device'::"text", 'manual'::"text", 'api'::"text"]))),
    CONSTRAINT "delivery_tracking_speed_check" CHECK (("speed_kmh" >= (0)::numeric))
);


ALTER TABLE "public"."delivery_tracking" OWNER TO "postgres";


COMMENT ON TABLE "public"."delivery_tracking" IS 'Real-time GPS tracking data for active deliveries';



COMMENT ON COLUMN "public"."delivery_tracking"."accuracy_meters" IS 'GPS accuracy in meters';



CREATE TABLE IF NOT EXISTS "public"."deposit_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_name" "text" NOT NULL,
    "deposit_type" "text" DEFAULT 'percentage'::"text" NOT NULL,
    "deposit_value" numeric(10,2) NOT NULL,
    "min_deposit_amount" numeric(10,2) DEFAULT 0,
    "balance_due_days_before" integer DEFAULT 7,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "deposit_requirements_deposit_type_check" CHECK (("deposit_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text", 'none'::"text"])))
);


ALTER TABLE "public"."deposit_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."driver_earnings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "ride_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "commission" numeric(10,2) NOT NULL,
    "net_earning" numeric(10,2) NOT NULL,
    "payout_status" "text" DEFAULT 'pending'::"text",
    "payout_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."driver_earnings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."driver_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "license_number" "text" NOT NULL,
    "vehicle_info" "jsonb",
    "is_online" boolean DEFAULT false,
    "current_location" "jsonb",
    "rating" double precision,
    "total_rides" integer DEFAULT 0,
    "is_verified" boolean DEFAULT false,
    "subscription_tier" "text" DEFAULT 'BASIC'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_location" "public"."geography"(Point,4326),
    "last_location_updated_at" timestamp with time zone,
    "heading" numeric(5,2),
    "speed" numeric(5,2),
    "vehicle_type" "text" DEFAULT 'standard'::"text",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text"
);


ALTER TABLE "public"."driver_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecommerce_cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid",
    "product_id" "uuid",
    "variant_id" "uuid",
    "quantity" integer DEFAULT 1 NOT NULL,
    "price_per_unit" numeric(10,2) NOT NULL,
    "subtotal" numeric(10,2) GENERATED ALWAYS AS ((("quantity")::numeric * "price_per_unit")) STORED,
    "added_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ecommerce_cart_items_price_per_unit_check" CHECK (("price_per_unit" >= (0)::numeric)),
    CONSTRAINT "ecommerce_cart_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."ecommerce_cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecommerce_carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "text",
    "subtotal" numeric(10,2) DEFAULT 0,
    "discount_amount" numeric(10,2) DEFAULT 0,
    "tax_amount" numeric(10,2) DEFAULT 0,
    "shipping_cost" numeric(10,2) DEFAULT 0,
    "total_amount" numeric(10,2) DEFAULT 0,
    "promo_code_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval)
);


ALTER TABLE "public"."ecommerce_carts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecommerce_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "parent_id" "uuid",
    "icon_url" "text",
    "image_url" "text",
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ecommerce_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecommerce_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "product_id" "uuid",
    "variant_id" "uuid",
    "vendor_id" "uuid",
    "product_name" "text" NOT NULL,
    "product_slug" "text",
    "variant_name" "text",
    "sku" "text",
    "quantity" integer NOT NULL,
    "price_per_unit" numeric(10,2) NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "product_snapshot" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    CONSTRAINT "ecommerce_order_items_price_per_unit_check" CHECK (("price_per_unit" >= (0)::numeric)),
    CONSTRAINT "ecommerce_order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "ecommerce_order_items_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'shipped'::"text", 'delivered'::"text", 'cancelled'::"text", 'returned'::"text", 'refunded'::"text"]))),
    CONSTRAINT "ecommerce_order_items_subtotal_check" CHECK (("subtotal" >= (0)::numeric))
);


ALTER TABLE "public"."ecommerce_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecommerce_order_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "from_status" "text",
    "to_status" "text" NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ecommerce_order_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecommerce_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "user_id" "uuid",
    "guest_email" "text",
    "shipping_address_id" "uuid",
    "billing_address_id" "uuid",
    "subtotal" numeric(10,2) NOT NULL,
    "discount_amount" numeric(10,2) DEFAULT 0,
    "shipping_cost" numeric(10,2) DEFAULT 0,
    "tax_amount" numeric(10,2) DEFAULT 0,
    "total_amount" numeric(10,2) NOT NULL,
    "payment_method" "text",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "payment_provider" "text",
    "payment_id" "text",
    "paid_at" timestamp with time zone,
    "promo_code_id" "uuid",
    "promo_code" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "tracking_number" "text",
    "carrier" "text",
    "estimated_delivery_date" "date",
    "delivered_at" timestamp with time zone,
    "customer_notes" "text",
    "admin_notes" "text",
    "cancellation_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    CONSTRAINT "ecommerce_orders_discount_amount_check" CHECK (("discount_amount" >= (0)::numeric)),
    CONSTRAINT "ecommerce_orders_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text", 'refunded'::"text", 'partially_refunded'::"text"]))),
    CONSTRAINT "ecommerce_orders_shipping_cost_check" CHECK (("shipping_cost" >= (0)::numeric)),
    CONSTRAINT "ecommerce_orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'pending_payment'::"text", 'confirmed'::"text", 'processing'::"text", 'packed'::"text", 'shipped'::"text", 'out_for_delivery'::"text", 'delivered'::"text", 'cancelled'::"text", 'refunded'::"text", 'failed'::"text"]))),
    CONSTRAINT "ecommerce_orders_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "ecommerce_orders_tax_amount_check" CHECK (("tax_amount" >= (0)::numeric)),
    CONSTRAINT "ecommerce_orders_total_amount_check" CHECK (("total_amount" >= (0)::numeric))
);


ALTER TABLE "public"."ecommerce_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecommerce_product_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "user_id" "uuid",
    "order_id" "uuid",
    "rating" integer NOT NULL,
    "title" "text",
    "comment" "text",
    "images" "text"[],
    "helpful_count" integer DEFAULT 0,
    "unhelpful_count" integer DEFAULT 0,
    "is_verified" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "is_approved" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    CONSTRAINT "ecommerce_product_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."ecommerce_product_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecommerce_product_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "variant_name" "text" NOT NULL,
    "sku" "text",
    "price_adjustment" numeric(10,2) DEFAULT 0,
    "stock_quantity" integer DEFAULT 0,
    "attributes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "images" "text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ecommerce_product_variants_stock_quantity_check" CHECK (("stock_quantity" >= 0))
);


ALTER TABLE "public"."ecommerce_product_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecommerce_vendors" (
    "id" "uuid" NOT NULL,
    "business_name" "text" NOT NULL,
    "business_registration" "text",
    "tax_id" "text",
    "bank_name" "text",
    "account_number" "text",
    "account_name" "text",
    "total_sales" numeric(12,2) DEFAULT 0,
    "total_orders" integer DEFAULT 0,
    "average_rating" numeric(3,2) DEFAULT 0,
    "commission_rate" numeric(5,2) DEFAULT 15.00,
    "is_verified" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    "user_id" "uuid"
);


ALTER TABLE "public"."ecommerce_vendors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ecommerce_wishlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "product_id" "uuid",
    "added_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ecommerce_wishlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."edge_function_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "function_name" "text" NOT NULL,
    "function_slug" "text" NOT NULL,
    "supabase_id" "uuid" NOT NULL,
    "module_type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "database_intensity" integer NOT NULL,
    "compute_intensity" integer NOT NULL,
    "traffic_pattern" "text" NOT NULL,
    "usage_frequency" "text" NOT NULL,
    "verify_jwt" boolean DEFAULT true NOT NULL,
    "has_external_deps" boolean DEFAULT false NOT NULL,
    "external_services" "text"[],
    "primary_tables" "text"[],
    "secondary_tables" "text"[],
    "purpose" "text" NOT NULL,
    "input_params" "jsonb",
    "output_format" "jsonb",
    "error_handling_quality" integer,
    "code_quality_score" integer,
    "recommended_platform" "text" NOT NULL,
    "migration_priority" integer,
    "migration_complexity" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "consolidation_target" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "analyzed_by" "text" DEFAULT 'automated_inventory'::"text",
    "notes" "text",
    CONSTRAINT "edge_function_inventory_code_quality_score_check" CHECK ((("code_quality_score" >= 1) AND ("code_quality_score" <= 5))),
    CONSTRAINT "edge_function_inventory_compute_intensity_check" CHECK ((("compute_intensity" >= 1) AND ("compute_intensity" <= 10))),
    CONSTRAINT "edge_function_inventory_database_intensity_check" CHECK ((("database_intensity" >= 1) AND ("database_intensity" <= 10))),
    CONSTRAINT "edge_function_inventory_error_handling_quality_check" CHECK ((("error_handling_quality" >= 1) AND ("error_handling_quality" <= 5))),
    CONSTRAINT "edge_function_inventory_migration_complexity_check" CHECK (("migration_complexity" = ANY (ARRAY['simple'::"text", 'moderate'::"text", 'complex'::"text"]))),
    CONSTRAINT "edge_function_inventory_migration_priority_check" CHECK ((("migration_priority" >= 1) AND ("migration_priority" <= 5))),
    CONSTRAINT "edge_function_inventory_module_type_check" CHECK (("module_type" = ANY (ARRAY['core'::"text", 'social'::"text", 'admin'::"text", 'media'::"text", 'utility'::"text"]))),
    CONSTRAINT "edge_function_inventory_recommended_platform_check" CHECK (("recommended_platform" = ANY (ARRAY['supabase'::"text", 'railway'::"text"]))),
    CONSTRAINT "edge_function_inventory_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'deprecated'::"text", 'duplicate'::"text", 'incomplete'::"text", 'consolidated'::"text"]))),
    CONSTRAINT "edge_function_inventory_traffic_pattern_check" CHECK (("traffic_pattern" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'burst'::"text"]))),
    CONSTRAINT "edge_function_inventory_usage_frequency_check" CHECK (("usage_frequency" = ANY (ARRAY['rare'::"text", 'occasional'::"text", 'frequent'::"text", 'constant'::"text"])))
);


ALTER TABLE "public"."edge_function_inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."escrow_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "vendor_type" "text" NOT NULL,
    "module_name" "text" NOT NULL,
    "gross_amount" numeric(12,2) NOT NULL,
    "commission_amount" numeric(12,2) NOT NULL,
    "net_amount" numeric(12,2) NOT NULL,
    "status" "text" DEFAULT 'held'::"text" NOT NULL,
    "release_trigger" "text",
    "release_reason" "text",
    "held_at" timestamp with time zone DEFAULT "now"(),
    "released_at" timestamp with time zone,
    "released_by" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "escrow_transactions_status_check" CHECK (("status" = ANY (ARRAY['held'::"text", 'released'::"text", 'refunded'::"text", 'disputed'::"text", 'split'::"text"])))
);


ALTER TABLE "public"."escrow_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_promo_code_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promo_code_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_ticket_id" "uuid" NOT NULL,
    "discount_amount" numeric(10,2) NOT NULL,
    "used_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_promo_code_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "discount_type" "text" NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "min_tickets" integer DEFAULT 1,
    "min_order_amount" numeric(10,2),
    "max_discount_amount" numeric(10,2),
    "applicable_events" "uuid"[],
    "applicable_event_types" "text"[],
    "applicable_ticket_tiers" "text"[],
    "excluded_events" "uuid"[],
    "early_bird_only" boolean DEFAULT false,
    "first_booking_only" boolean DEFAULT false,
    "student_only" boolean DEFAULT false,
    "usage_limit" integer,
    "usage_count" integer DEFAULT 0,
    "per_user_limit" integer DEFAULT 1,
    "valid_from" timestamp with time zone,
    "valid_until" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "event_promo_codes_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed_amount'::"text", 'free_ticket'::"text"]))),
    CONSTRAINT "event_promo_codes_discount_value_check" CHECK (("discount_value" >= (0)::numeric))
);


ALTER TABLE "public"."event_promo_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."failed_payment_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "payment_provider" "text" NOT NULL,
    "payment_method" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "failure_reason" "text" NOT NULL,
    "provider_error_code" "text",
    "provider_error_message" "text",
    "card_last4" "text",
    "card_brand" "text",
    "is_suspicious" boolean DEFAULT false,
    "risk_score" integer,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."failed_payment_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorite_hotels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."favorite_hotels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."file_metadata" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "original_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "uploaded_by" "uuid",
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "status" "text" DEFAULT 'ready'::"text" NOT NULL,
    "access_level" "text" DEFAULT 'private'::"text" NOT NULL,
    "processing_results" "jsonb",
    "metadata" "jsonb",
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    CONSTRAINT "valid_access_level" CHECK (("access_level" = ANY (ARRAY['public'::"text", 'private'::"text", 'restricted'::"text"]))),
    CONSTRAINT "valid_status" CHECK (("status" = ANY (ARRAY['uploading'::"text", 'processing'::"text", 'ready'::"text", 'failed'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."file_metadata" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."function_classification" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "function_name" "text" NOT NULL,
    "function_slug" "text" NOT NULL,
    "module_type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "subcategory" "text",
    "database_intensity" integer NOT NULL,
    "compute_intensity" integer NOT NULL,
    "memory_intensity" integer DEFAULT 5 NOT NULL,
    "io_intensity" integer DEFAULT 5 NOT NULL,
    "traffic_pattern" "text" NOT NULL,
    "usage_frequency" "text" NOT NULL,
    "peak_concurrent_users" integer DEFAULT 0,
    "avg_requests_per_minute" integer DEFAULT 0,
    "avg_response_time_ms" integer DEFAULT 0,
    "p95_response_time_ms" integer DEFAULT 0,
    "p99_response_time_ms" integer DEFAULT 0,
    "error_rate_percentage" numeric(5,2) DEFAULT 0.0,
    "estimated_cpu_cores" numeric(3,2) DEFAULT 0.5,
    "estimated_memory_mb" integer DEFAULT 128,
    "estimated_storage_mb" integer DEFAULT 0,
    "database_tables" "text"[] DEFAULT '{}'::"text"[],
    "external_services" "text"[] DEFAULT '{}'::"text"[],
    "dependent_functions" "text"[] DEFAULT '{}'::"text"[],
    "recommended_platform" "text" NOT NULL,
    "platform_confidence" numeric(3,2) DEFAULT 0.0 NOT NULL,
    "migration_priority" integer DEFAULT 3 NOT NULL,
    "migration_complexity" "text" DEFAULT 'medium'::"text" NOT NULL,
    "business_criticality" "text" DEFAULT 'medium'::"text" NOT NULL,
    "user_impact_score" integer DEFAULT 5,
    "revenue_impact" "text" DEFAULT 'medium'::"text",
    "security_level" "text" DEFAULT 'standard'::"text" NOT NULL,
    "compliance_requirements" "text"[] DEFAULT '{}'::"text"[],
    "audit_logging_required" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "analyzed_by" "text" DEFAULT 'system'::"text",
    "analysis_version" "text" DEFAULT '1.0'::"text",
    "notes" "text",
    CONSTRAINT "function_classification_business_criticality_check" CHECK (("business_criticality" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "function_classification_compute_intensity_check" CHECK ((("compute_intensity" >= 1) AND ("compute_intensity" <= 10))),
    CONSTRAINT "function_classification_database_intensity_check" CHECK ((("database_intensity" >= 1) AND ("database_intensity" <= 10))),
    CONSTRAINT "function_classification_io_intensity_check" CHECK ((("io_intensity" >= 1) AND ("io_intensity" <= 10))),
    CONSTRAINT "function_classification_memory_intensity_check" CHECK ((("memory_intensity" >= 1) AND ("memory_intensity" <= 10))),
    CONSTRAINT "function_classification_migration_complexity_check" CHECK (("migration_complexity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "function_classification_migration_priority_check" CHECK ((("migration_priority" >= 1) AND ("migration_priority" <= 5))),
    CONSTRAINT "function_classification_module_type_check" CHECK (("module_type" = ANY (ARRAY['core'::"text", 'social'::"text", 'admin'::"text", 'media'::"text", 'utility'::"text"]))),
    CONSTRAINT "function_classification_platform_confidence_check" CHECK ((("platform_confidence" >= 0.0) AND ("platform_confidence" <= 1.0))),
    CONSTRAINT "function_classification_recommended_platform_check" CHECK (("recommended_platform" = ANY (ARRAY['supabase'::"text", 'railway'::"text"]))),
    CONSTRAINT "function_classification_revenue_impact_check" CHECK (("revenue_impact" = ANY (ARRAY['none'::"text", 'low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "function_classification_security_level_check" CHECK (("security_level" = ANY (ARRAY['public'::"text", 'standard'::"text", 'elevated'::"text", 'critical'::"text"]))),
    CONSTRAINT "function_classification_traffic_pattern_check" CHECK (("traffic_pattern" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'burst'::"text", 'spike'::"text"]))),
    CONSTRAINT "function_classification_usage_frequency_check" CHECK (("usage_frequency" = ANY (ARRAY['rare'::"text", 'occasional'::"text", 'regular'::"text", 'frequent'::"text", 'constant'::"text"]))),
    CONSTRAINT "function_classification_user_impact_score_check" CHECK ((("user_impact_score" >= 1) AND ("user_impact_score" <= 10)))
);


ALTER TABLE "public"."function_classification" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."function_consolidation_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action_type" "text" NOT NULL,
    "source_function_name" "text" NOT NULL,
    "source_function_slug" "text" NOT NULL,
    "source_supabase_id" "uuid" NOT NULL,
    "target_function_name" "text",
    "target_function_slug" "text",
    "target_supabase_id" "uuid",
    "reason" "text" NOT NULL,
    "consolidation_method" "text",
    "impact_assessment" "text",
    "status" "text" DEFAULT 'planned'::"text" NOT NULL,
    "completion_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "created_by" "text" DEFAULT 'task_2_2_consolidation'::"text",
    CONSTRAINT "function_consolidation_actions_action_type_check" CHECK (("action_type" = ANY (ARRAY['remove_deprecated'::"text", 'consolidate_duplicate'::"text", 'refactor_function'::"text"]))),
    CONSTRAINT "function_consolidation_actions_status_check" CHECK (("status" = ANY (ARRAY['planned'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."function_consolidation_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."function_dependencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "function_name" "text" NOT NULL,
    "depends_on_table" "text" NOT NULL,
    "dependency_type" "text" NOT NULL,
    "is_critical" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "function_dependencies_dependency_type_check" CHECK (("dependency_type" = ANY (ARRAY['read'::"text", 'write'::"text", 'trigger'::"text", 'reference'::"text"])))
);


ALTER TABLE "public"."function_dependencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."function_dependencies_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "function_name" "text" NOT NULL,
    "primary_tables" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "secondary_tables" "text"[] DEFAULT '{}'::"text"[],
    "database_functions" "text"[] DEFAULT '{}'::"text"[],
    "external_services" "text"[] DEFAULT '{}'::"text"[],
    "external_apis" "text"[] DEFAULT '{}'::"text"[],
    "calls_functions" "text"[] DEFAULT '{}'::"text"[],
    "called_by_functions" "text"[] DEFAULT '{}'::"text"[],
    "used_by_clients" "text"[] DEFAULT '{}'::"text"[],
    "dependency_complexity_score" integer,
    "migration_risk_level" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "function_dependencies_map_dependency_complexity_score_check" CHECK ((("dependency_complexity_score" >= 1) AND ("dependency_complexity_score" <= 10))),
    CONSTRAINT "function_dependencies_map_migration_risk_level_check" CHECK (("migration_risk_level" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."function_dependencies_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."function_improvement_plan" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "function_name" "text" NOT NULL,
    "improvement_category" "text" NOT NULL,
    "current_score" integer,
    "target_score" integer,
    "improvement_description" "text" NOT NULL,
    "implementation_priority" integer,
    "estimated_effort_hours" integer,
    "dependencies" "text"[],
    "status" "text" DEFAULT 'planned'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "function_improvement_plan_implementation_priority_check" CHECK ((("implementation_priority" >= 1) AND ("implementation_priority" <= 5))),
    CONSTRAINT "function_improvement_plan_status_check" CHECK (("status" = ANY (ARRAY['planned'::"text", 'in_progress'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."function_improvement_plan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."function_openapi_specs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "function_name" "text" NOT NULL,
    "function_slug" "text" NOT NULL,
    "openapi_version" "text" DEFAULT '3.0.3'::"text",
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "version" "text" DEFAULT '1.0.0'::"text",
    "http_method" "text" NOT NULL,
    "endpoint_path" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "operation_id" "text" NOT NULL,
    "requires_authentication" boolean DEFAULT true,
    "required_permissions" "text"[],
    "security_schemes" "text"[] DEFAULT ARRAY['BearerAuth'::"text"],
    "request_content_type" "text" DEFAULT 'application/json'::"text",
    "request_schema" "jsonb",
    "request_examples" "jsonb",
    "success_response_schema" "jsonb" NOT NULL,
    "error_response_schemas" "jsonb" NOT NULL,
    "response_examples" "jsonb",
    "path_parameters" "jsonb",
    "query_parameters" "jsonb",
    "header_parameters" "jsonb",
    "tags" "text"[] NOT NULL,
    "external_docs" "jsonb",
    "deprecated" boolean DEFAULT false,
    "full_openapi_spec" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "generated_by" "text" DEFAULT 'task_2_4_documentation'::"text",
    CONSTRAINT "function_openapi_specs_http_method_check" CHECK (("http_method" = ANY (ARRAY['GET'::"text", 'POST'::"text", 'PUT'::"text", 'PATCH'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."function_openapi_specs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."function_quality_standards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "standard_category" "text" NOT NULL,
    "standard_name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "compliance_criteria" "text" NOT NULL,
    "example_code" "text",
    "priority_level" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "function_quality_standards_priority_level_check" CHECK ((("priority_level" >= 1) AND ("priority_level" <= 5)))
);


ALTER TABLE "public"."function_quality_standards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."function_standardization_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "function_name" "text" NOT NULL,
    "function_slug" "text" NOT NULL,
    "cors_handling_score" integer,
    "auth_validation_score" integer,
    "input_validation_score" integer,
    "error_handling_score" integer,
    "response_format_score" integer,
    "logging_quality_score" integer,
    "has_cors_preflight" boolean DEFAULT false,
    "has_auth_validation" boolean DEFAULT false,
    "has_input_validation" boolean DEFAULT false,
    "has_structured_error_handling" boolean DEFAULT false,
    "has_consistent_response_format" boolean DEFAULT false,
    "has_comprehensive_logging" boolean DEFAULT false,
    "has_transaction_handling" boolean DEFAULT false,
    "identified_issues" "text"[],
    "improvement_recommendations" "text"[],
    "overall_compliance_score" numeric(4,2),
    "compliance_level" "text",
    "standardization_status" "text" DEFAULT 'needs_review'::"text",
    "audit_date" timestamp with time zone DEFAULT "now"(),
    "audited_by" "text" DEFAULT 'task_2_3_standardization'::"text",
    "notes" "text",
    CONSTRAINT "function_standardization_audit_auth_validation_score_check" CHECK ((("auth_validation_score" >= 1) AND ("auth_validation_score" <= 5))),
    CONSTRAINT "function_standardization_audit_compliance_level_check" CHECK (("compliance_level" = ANY (ARRAY['poor'::"text", 'basic'::"text", 'good'::"text", 'excellent'::"text"]))),
    CONSTRAINT "function_standardization_audit_cors_handling_score_check" CHECK ((("cors_handling_score" >= 1) AND ("cors_handling_score" <= 5))),
    CONSTRAINT "function_standardization_audit_error_handling_score_check" CHECK ((("error_handling_score" >= 1) AND ("error_handling_score" <= 5))),
    CONSTRAINT "function_standardization_audit_input_validation_score_check" CHECK ((("input_validation_score" >= 1) AND ("input_validation_score" <= 5))),
    CONSTRAINT "function_standardization_audit_logging_quality_score_check" CHECK ((("logging_quality_score" >= 1) AND ("logging_quality_score" <= 5))),
    CONSTRAINT "function_standardization_audit_response_format_score_check" CHECK ((("response_format_score" >= 1) AND ("response_format_score" <= 5))),
    CONSTRAINT "function_standardization_audit_standardization_status_check" CHECK (("standardization_status" = ANY (ARRAY['needs_review'::"text", 'in_progress'::"text", 'compliant'::"text", 'non_compliant'::"text"])))
);


ALTER TABLE "public"."function_standardization_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."host_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "business_name" "text",
    "host_type" "text" DEFAULT 'INDIVIDUAL'::"text",
    "description" "text",
    "rating" double precision,
    "total_bookings" integer DEFAULT 0,
    "is_verified" boolean DEFAULT false,
    "subscription_tier" "text" DEFAULT 'BASIC'::"text",
    "response_rate" double precision,
    "response_time" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text"
);


ALTER TABLE "public"."host_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotel_amenities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "icon" "text",
    "category" "text",
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hotel_amenities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotel_amenity_mappings" (
    "hotel_id" "uuid" NOT NULL,
    "amenity_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hotel_amenity_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotel_booking_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "from_status" "text",
    "to_status" "text" NOT NULL,
    "notes" "text",
    "changed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hotel_booking_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotel_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_number" "text" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "room_type_id" "uuid" NOT NULL,
    "room_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "guest_name" "text" NOT NULL,
    "guest_email" "text" NOT NULL,
    "guest_phone" "text" NOT NULL,
    "guest_count" "jsonb" NOT NULL,
    "check_in_date" "date" NOT NULL,
    "check_out_date" "date" NOT NULL,
    "number_of_nights" integer NOT NULL,
    "number_of_rooms" integer DEFAULT 1 NOT NULL,
    "room_rate" numeric NOT NULL,
    "subtotal" numeric NOT NULL,
    "tax_amount" numeric DEFAULT 0,
    "service_fee" numeric DEFAULT 0,
    "discount_amount" numeric DEFAULT 0,
    "total_amount" numeric NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text",
    "booking_status" "text" DEFAULT 'pending'::"text",
    "special_requests" "text",
    "purpose_of_visit" "text",
    "estimated_arrival_time" time without time zone,
    "cancellation_reason" "text",
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "uuid",
    "checked_in_at" timestamp with time zone,
    "checked_out_at" timestamp with time zone,
    "promo_code" "text",
    "promo_code_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    CONSTRAINT "check_dates" CHECK (("check_out_date" > "check_in_date")),
    CONSTRAINT "check_dates_valid" CHECK (("check_out_date" > "check_in_date")),
    CONSTRAINT "hotel_bookings_booking_status_check" CHECK (("booking_status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'checked_in'::"text", 'checked_out'::"text", 'cancelled'::"text", 'no_show'::"text"]))),
    CONSTRAINT "hotel_bookings_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'partially_paid'::"text", 'refunded'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."hotel_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotel_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "room_type_id" "uuid",
    "url" "text" NOT NULL,
    "caption" "text",
    "photo_type" "text",
    "display_order" integer DEFAULT 0,
    "is_featured" boolean DEFAULT false,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hotel_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotel_promo_code_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promo_code_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "discount_amount" numeric(10,2) NOT NULL,
    "used_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hotel_promo_code_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotel_promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "discount_type" "text" NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "min_nights" integer DEFAULT 1,
    "min_order_amount" numeric(10,2),
    "max_discount_amount" numeric(10,2),
    "applicable_hotels" "uuid"[],
    "applicable_room_types" "uuid"[],
    "excluded_hotels" "uuid"[],
    "applies_to_weekends_only" boolean DEFAULT false,
    "first_booking_only" boolean DEFAULT false,
    "requires_early_booking_days" integer,
    "usage_limit" integer,
    "usage_count" integer DEFAULT 0,
    "per_user_limit" integer DEFAULT 1,
    "valid_from" timestamp with time zone,
    "valid_until" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "hotel_promo_codes_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed_amount'::"text", 'free_night'::"text"]))),
    CONSTRAINT "hotel_promo_codes_discount_value_check" CHECK (("discount_value" >= (0)::numeric))
);


ALTER TABLE "public"."hotel_promo_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hotel_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "cleanliness_rating" integer,
    "comfort_rating" integer,
    "location_rating" integer,
    "service_rating" integer,
    "value_rating" integer,
    "title" "text",
    "comment" "text",
    "images" "text"[] DEFAULT '{}'::"text"[],
    "helpful_count" integer DEFAULT 0,
    "response_from_host" "text",
    "responded_at" timestamp with time zone,
    "is_verified" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "is_approved" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "hotel_reviews_cleanliness_rating_check" CHECK ((("cleanliness_rating" >= 1) AND ("cleanliness_rating" <= 5))),
    CONSTRAINT "hotel_reviews_comfort_rating_check" CHECK ((("comfort_rating" >= 1) AND ("comfort_rating" <= 5))),
    CONSTRAINT "hotel_reviews_location_rating_check" CHECK ((("location_rating" >= 1) AND ("location_rating" <= 5))),
    CONSTRAINT "hotel_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "hotel_reviews_service_rating_check" CHECK ((("service_rating" >= 1) AND ("service_rating" <= 5))),
    CONSTRAINT "hotel_reviews_value_rating_check" CHECK ((("value_rating" >= 1) AND ("value_rating" <= 5)))
);


ALTER TABLE "public"."hotel_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."in_app_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" NOT NULL,
    "category" "text",
    "action_url" "text",
    "action_text" "text",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."in_app_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketplace_promo_code_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promo_code_id" "uuid",
    "user_id" "uuid",
    "order_id" "uuid",
    "discount_amount" numeric(10,2) NOT NULL,
    "used_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."marketplace_promo_code_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketplace_promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "discount_type" "text",
    "discount_value" numeric(10,2) NOT NULL,
    "min_order_amount" numeric(10,2),
    "max_discount_amount" numeric(10,2),
    "usage_limit" integer,
    "usage_count" integer DEFAULT 0,
    "per_user_limit" integer DEFAULT 1,
    "applicable_categories" "uuid"[],
    "applicable_products" "uuid"[],
    "valid_from" timestamp with time zone,
    "valid_until" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "free_shipping" boolean DEFAULT false,
    "applicable_vendors" "uuid"[],
    "excluded_products" "uuid"[],
    CONSTRAINT "ecommerce_promo_codes_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed_amount'::"text", 'free_shipping'::"text"]))),
    CONSTRAINT "ecommerce_promo_codes_discount_value_check" CHECK (("discount_value" >= (0)::numeric))
);


ALTER TABLE "public"."marketplace_promo_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "content_type" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text",
    "file_size" integer,
    "mime_type" "text",
    "thumbnail_url" "text",
    "category" "text",
    "tags" "text"[],
    "duration_seconds" integer,
    "dimensions" "jsonb",
    "publisher_name" "text",
    "publisher_email" "text",
    "view_count" integer DEFAULT 0,
    "like_count" integer DEFAULT 0,
    "share_count" integer DEFAULT 0,
    "approval_status" "text" DEFAULT 'pending'::"text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "rejection_reason" "text",
    "moderation_notes" "text",
    "is_active" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    CONSTRAINT "media_content_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "media_content_content_type_check" CHECK (("content_type" = ANY (ARRAY['image'::"text", 'video'::"text", 'audio'::"text", 'document'::"text"])))
);


ALTER TABLE "public"."media_content" OWNER TO "postgres";


COMMENT ON TABLE "public"."media_content" IS 'Media content submissions with approval workflow for content moderation';



CREATE TABLE IF NOT EXISTS "public"."message_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "message_status_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'delivered'::"text", 'read'::"text"])))
);


ALTER TABLE "public"."message_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_commission_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_name" "text" NOT NULL,
    "commission_type" "text" DEFAULT 'percentage'::"text" NOT NULL,
    "commission_value" numeric(5,2) NOT NULL,
    "tiered_rates" "jsonb",
    "min_transaction_amount" numeric(10,2) DEFAULT 0,
    "apply_tax_before_commission" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "module_commission_rates_commission_type_check" CHECK (("commission_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text", 'tiered'::"text"])))
);


ALTER TABLE "public"."module_commission_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nipost_admin_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "admin_name" character varying(255) NOT NULL,
    "admin_role" character varying(50) NOT NULL,
    "access_level" character varying(20) NOT NULL,
    "branch_id" character varying(50),
    "state_id" character varying(50),
    "action_type" character varying(50) NOT NULL,
    "resource_type" character varying(50) NOT NULL,
    "resource_id" character varying(100),
    "action_details" "jsonb",
    "description" "text",
    "endpoint" character varying(255),
    "method" character varying(10),
    "ip_address" "inet",
    "user_agent" "text",
    "success" boolean DEFAULT true,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nipost_admin_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nipost_ecommerce" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "seller_name" character varying(255) NOT NULL,
    "branch_id" character varying(50) NOT NULL,
    "branch_name" character varying(255) NOT NULL,
    "state_id" character varying(50) NOT NULL,
    "state_name" character varying(100) NOT NULL,
    "total_orders" integer DEFAULT 0,
    "total_revenue" numeric(15,2) DEFAULT 0.00,
    "commission_earned" numeric(15,2) DEFAULT 0.00,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nipost_ecommerce" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nipost_financial_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ledger_id" "uuid",
    "action" character varying(50) NOT NULL,
    "old_status" character varying(20),
    "new_status" character varying(20),
    "changes" "jsonb",
    "reason" "text",
    "performed_by" "uuid",
    "performed_by_name" character varying(255),
    "performed_by_role" character varying(50),
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nipost_financial_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nipost_financial_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" character varying(100) NOT NULL,
    "transaction_type" character varying(50) NOT NULL,
    "module" character varying(20) NOT NULL,
    "module_transaction_id" "uuid" NOT NULL,
    "branch_id" character varying(50) NOT NULL,
    "branch_name" character varying(255) NOT NULL,
    "state_id" character varying(50) NOT NULL,
    "state_name" character varying(100) NOT NULL,
    "gross_amount" numeric(15,2) NOT NULL,
    "commission_rate" numeric(5,2) NOT NULL,
    "commission_amount" numeric(15,2) NOT NULL,
    "net_amount" numeric(15,2) NOT NULL,
    "payment_status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "payment_method" character varying(50),
    "payment_reference" character varying(100),
    "settlement_status" character varying(20) DEFAULT 'unsettled'::character varying,
    "settlement_date" timestamp with time zone,
    "settlement_batch_id" character varying(100),
    "user_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "nipost_financial_ledger_module_check" CHECK ((("module")::"text" = ANY ((ARRAY['hotel'::character varying, 'taxi'::character varying, 'ecommerce'::character varying])::"text"[]))),
    CONSTRAINT "nipost_financial_ledger_payment_status_check" CHECK ((("payment_status")::"text" = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying])::"text"[]))),
    CONSTRAINT "nipost_financial_ledger_settlement_status_check" CHECK ((("settlement_status")::"text" = ANY ((ARRAY['unsettled'::character varying, 'settled'::character varying, 'disputed'::character varying])::"text"[]))),
    CONSTRAINT "nipost_financial_ledger_transaction_type_check" CHECK ((("transaction_type")::"text" = ANY ((ARRAY['hotel_booking'::character varying, 'ecommerce_order'::character varying, 'taxi_trip'::character varying, 'refund'::character varying, 'adjustment'::character varying])::"text"[])))
);


ALTER TABLE "public"."nipost_financial_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nipost_hotels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "hotel_name" character varying(255) NOT NULL,
    "branch_id" character varying(50) NOT NULL,
    "branch_name" character varying(255) NOT NULL,
    "state_id" character varying(50) NOT NULL,
    "state_name" character varying(100) NOT NULL,
    "total_bookings" integer DEFAULT 0,
    "total_revenue" numeric(15,2) DEFAULT 0.00,
    "commission_earned" numeric(15,2) DEFAULT 0.00,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nipost_hotels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nipost_offices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "office_code" "text" NOT NULL,
    "office_name" "text" NOT NULL,
    "region_id" "uuid" NOT NULL,
    "office_type" "text" NOT NULL,
    "address" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state_province" "text",
    "country" "text" NOT NULL,
    "postal_code" "text",
    "latitude" double precision,
    "longitude" double precision,
    "phone_numbers" "text"[],
    "email_addresses" "text"[],
    "operating_hours" "jsonb",
    "services_offered" "text"[],
    "is_24_7" boolean DEFAULT false,
    "manager_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "nipost_offices_office_type_check" CHECK (("office_type" = ANY (ARRAY['headquarters'::"text", 'regional_hq'::"text", 'country_office'::"text", 'state_office'::"text", 'district_office'::"text", 'local_office'::"text", 'processing_center'::"text"])))
);


ALTER TABLE "public"."nipost_offices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nipost_officials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "employee_id" "text" NOT NULL,
    "office_id" "uuid" NOT NULL,
    "region_id" "uuid" NOT NULL,
    "position" "text" NOT NULL,
    "rank" "text" NOT NULL,
    "department" "text" NOT NULL,
    "clearance_level" integer NOT NULL,
    "jurisdiction_regions" "uuid"[],
    "reporting_to" "uuid",
    "hire_date" "date" NOT NULL,
    "termination_date" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "approval_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "rejected_by" "uuid",
    "rejected_at" timestamp with time zone,
    "rejection_reason" "text",
    "suspended_by" "uuid",
    "suspended_at" timestamp with time zone,
    "suspension_reason" "text",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    CONSTRAINT "nipost_officials_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'suspended'::"text"]))),
    CONSTRAINT "nipost_officials_clearance_level_check" CHECK ((("clearance_level" >= 1) AND ("clearance_level" <= 10))),
    CONSTRAINT "nipost_officials_department_check" CHECK (("department" = ANY (ARRAY['operations'::"text", 'finance'::"text", 'customer_service'::"text", 'logistics'::"text", 'compliance'::"text", 'security'::"text", 'technical'::"text", 'management'::"text", 'audit'::"text"]))),
    CONSTRAINT "nipost_officials_rank_check" CHECK (("rank" = ANY (ARRAY['trainee'::"text", 'officer'::"text", 'senior_officer'::"text", 'supervisor'::"text", 'manager'::"text", 'director'::"text", 'executive'::"text"])))
);


ALTER TABLE "public"."nipost_officials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nipost_regions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "region_name" "text" NOT NULL,
    "region_code" "text" NOT NULL,
    "region_type" "text" NOT NULL,
    "parent_region_id" "uuid",
    "country_code" "text",
    "timezone" "text",
    "currency" "text",
    "languages" "text"[],
    "population" bigint,
    "area_sq_km" numeric,
    "coordinates" "jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "nipost_regions_region_type_check" CHECK (("region_type" = ANY (ARRAY['continent'::"text", 'country'::"text", 'state'::"text", 'city'::"text", 'district'::"text"])))
);


ALTER TABLE "public"."nipost_regions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nipost_taxi" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "driver_name" character varying(255) NOT NULL,
    "branch_id" character varying(50) NOT NULL,
    "branch_name" character varying(255) NOT NULL,
    "state_id" character varying(50) NOT NULL,
    "state_name" character varying(100) NOT NULL,
    "total_trips" integer DEFAULT 0,
    "total_revenue" numeric(15,2) DEFAULT 0.00,
    "commission_earned" numeric(15,2) DEFAULT 0.00,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nipost_taxi" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nipost_user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "access_level" character varying(20) NOT NULL,
    "branch_id" character varying(50),
    "branch_name" character varying(255),
    "state_id" character varying(50),
    "state_name" character varying(100),
    "role" character varying(50) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "permissions" "text"[] DEFAULT ARRAY[]::"text"[],
    "module_permissions" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "nipost_user_permissions_access_level_check" CHECK ((("access_level")::"text" = ANY ((ARRAY['national'::character varying, 'state'::character varying, 'branch'::character varying])::"text"[]))),
    CONSTRAINT "valid_branch_level" CHECK ((((("access_level")::"text" = 'branch'::"text") AND ("branch_id" IS NOT NULL) AND ("state_id" IS NOT NULL)) OR ((("access_level")::"text" = 'state'::"text") AND ("branch_id" IS NULL) AND ("state_id" IS NOT NULL)) OR ((("access_level")::"text" = 'national'::"text") AND ("branch_id" IS NULL) AND ("state_id" IS NULL))))
);


ALTER TABLE "public"."nipost_user_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."nipost_user_permissions" IS 'Permissions for NIPOST officials to access regional data';



COMMENT ON COLUMN "public"."nipost_user_permissions"."permissions" IS 'Array of permission strings (e.g., users:write, ads:approve, orders:manage)';



CREATE TABLE IF NOT EXISTS "public"."notification_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "template_name" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "sent_count" integer DEFAULT 0,
    "delivered_count" integer DEFAULT 0,
    "failed_count" integer DEFAULT 0,
    "bounced_count" integer DEFAULT 0,
    "opened_count" integer DEFAULT 0,
    "clicked_count" integer DEFAULT 0,
    "delivery_rate" double precision,
    "open_rate" double precision,
    "click_rate" double precision,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "template_id" "uuid",
    "type" "text" NOT NULL,
    "target_audience" "jsonb",
    "variables" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'draft'::"text",
    "scheduled_for" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "total_recipients" integer DEFAULT 0,
    "sent_count" integer DEFAULT 0,
    "delivered_count" integer DEFAULT 0,
    "failed_count" integer DEFAULT 0,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notification_campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'sending'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "notification_campaigns_type_check" CHECK (("type" = ANY (ARRAY['email'::"text", 'sms'::"text", 'push'::"text"])))
);


ALTER TABLE "public"."notification_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "template_id" "uuid",
    "template_name" "text",
    "recipient_email" "text",
    "recipient_phone" "text",
    "recipient_device_token" "text",
    "subject" "text",
    "content" "text",
    "channels" "text"[] NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "email_status" "text",
    "sms_status" "text",
    "push_status" "text",
    "email_provider" "text",
    "email_provider_id" "text",
    "sms_provider" "text",
    "sms_provider_id" "text",
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "type" "text",
    "variables" "jsonb" DEFAULT '{}'::"jsonb",
    "provider" "text",
    "provider_id" "text",
    "scheduled_for" timestamp with time zone,
    "opened_at" timestamp with time zone,
    "clicked_at" timestamp with time zone,
    CONSTRAINT "notification_logs_type_check" CHECK (("type" = ANY (ARRAY['email'::"text", 'sms'::"text", 'push'::"text"])))
);


ALTER TABLE "public"."notification_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email_enabled" boolean DEFAULT true,
    "sms_enabled" boolean DEFAULT false,
    "push_enabled" boolean DEFAULT true,
    "in_app_enabled" boolean DEFAULT true,
    "category_preferences" "jsonb" DEFAULT '{"auth": {"sms": false, "push": true, "email": true}, "ride": {"sms": true, "push": true, "email": true}, "order": {"sms": true, "push": true, "email": true}, "system": {"sms": false, "push": true, "email": true}, "booking": {"sms": true, "push": true, "email": true}, "marketing": {"sms": false, "push": false, "email": false}}'::"jsonb",
    "quiet_hours_enabled" boolean DEFAULT false,
    "quiet_hours_start" time without time zone,
    "quiet_hours_end" time without time zone,
    "timezone" "text" DEFAULT 'UTC'::"text",
    "language" "text" DEFAULT 'en'::"text",
    "global_opt_out" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "marketing_emails" boolean DEFAULT false,
    "booking_notifications" boolean DEFAULT true,
    "payment_notifications" boolean DEFAULT true,
    "delivery_notifications" boolean DEFAULT true,
    "social_notifications" boolean DEFAULT true,
    "security_notifications" boolean DEFAULT true,
    "email_frequency" "text" DEFAULT 'immediate'::"text",
    CONSTRAINT "notification_preferences_email_frequency_check" CHECK (("email_frequency" = ANY (ARRAY['immediate'::"text", 'daily'::"text", 'weekly'::"text", 'never'::"text"])))
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "template_name" "text" NOT NULL,
    "variables" "jsonb" NOT NULL,
    "recipient_email" "text",
    "recipient_phone" "text",
    "recipient_device_token" "text",
    "priority" integer DEFAULT 5,
    "status" "text" DEFAULT 'pending'::"text",
    "attempts" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 3,
    "notification_log_id" "uuid",
    "error_message" "text",
    "scheduled_at" timestamp with time zone DEFAULT "now"(),
    "process_after" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "picked_at" timestamp with time zone,
    "processed_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."notification_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "channels" "text"[] NOT NULL,
    "subject" "text",
    "email_body" "text",
    "sms_body" "text",
    "push_title" "text",
    "push_body" "text",
    "version" integer DEFAULT 1,
    "is_active" boolean DEFAULT true,
    "required_variables" "text"[] DEFAULT '{}'::"text"[],
    "optional_variables" "text"[] DEFAULT '{}'::"text"[],
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" NOT NULL,
    "body" "text",
    "variables" "text"[] DEFAULT '{}'::"text"[],
    CONSTRAINT "notification_templates_type_check" CHECK (("type" = ANY (ARRAY['email'::"text", 'sms'::"text", 'push'::"text"])))
);


ALTER TABLE "public"."notification_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."official_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "official_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "applicable_regions" "uuid"[],
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."official_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_provider_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_name" "text" NOT NULL,
    "public_key" "text" NOT NULL,
    "secret_key" "text" NOT NULL,
    "webhook_secret" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_test_mode" boolean DEFAULT false,
    "supported_methods" "text"[] DEFAULT ARRAY['card'::"text", 'bank_transfer'::"text", 'ussd'::"text"],
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "priority" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_provider_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_type" "text" NOT NULL,
    "reference_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'NGN'::"text" NOT NULL,
    "payment_provider" "text" NOT NULL,
    "payment_method" "text" NOT NULL,
    "transaction_id" "text" NOT NULL,
    "provider_reference" "text",
    "provider_transaction_id" "text",
    "card_last4" "text",
    "card_brand" "text",
    "card_type" "text",
    "bank_name" "text",
    "account_number_last4" "text",
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "is_escrowed" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "paid_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:30:00'::interval),
    "refund_amount" numeric(12,2) DEFAULT 0,
    "refund_reason" "text",
    "refunded_at" timestamp with time zone,
    "refund_transaction_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    CONSTRAINT "payments_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "payments_check_type" CHECK (("payment_type" = ANY (ARRAY['hotel_booking'::"text", 'ecommerce_order'::"text", 'taxi_ride'::"text", 'ad_campaign'::"text"]))),
    CONSTRAINT "payments_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'expired'::"text", 'cancelled'::"text", 'refunded'::"text", 'partially_refunded'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_migration_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "component_name" "text" NOT NULL,
    "component_type" "text" NOT NULL,
    "current_platform" "text" NOT NULL,
    "target_platform" "text" NOT NULL,
    "migration_status" "text" NOT NULL,
    "migration_date" timestamp with time zone,
    "rollback_plan" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "platform_migration_status_component_type_check" CHECK (("component_type" = ANY (ARRAY['table'::"text", 'function'::"text", 'policy'::"text", 'trigger'::"text"]))),
    CONSTRAINT "platform_migration_status_current_platform_check" CHECK (("current_platform" = ANY (ARRAY['supabase'::"text", 'railway'::"text", 'both'::"text"]))),
    CONSTRAINT "platform_migration_status_migration_status_check" CHECK (("migration_status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "platform_migration_status_target_platform_check" CHECK (("target_platform" = ANY (ARRAY['supabase'::"text", 'railway'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."platform_migration_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_promo_code_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promo_code_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "service_type" "text" NOT NULL,
    "reference_id" "uuid" NOT NULL,
    "discount_amount" numeric(10,2) NOT NULL,
    "used_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."platform_promo_code_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "discount_type" "text" NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "applicable_services" "text"[] DEFAULT ARRAY['hotel'::"text", 'tour'::"text", 'event'::"text", 'marketplace'::"text"],
    "min_order_amount" numeric(10,2),
    "max_discount_amount" numeric(10,2),
    "first_purchase_only" boolean DEFAULT false,
    "new_users_only" boolean DEFAULT false,
    "usage_limit" integer,
    "usage_count" integer DEFAULT 0,
    "per_user_limit" integer DEFAULT 1,
    "valid_from" timestamp with time zone,
    "valid_until" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "campaign_name" "text",
    "campaign_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "platform_promo_codes_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed_amount'::"text"]))),
    CONSTRAINT "platform_promo_codes_discount_value_check" CHECK (("discount_value" >= (0)::numeric))
);


ALTER TABLE "public"."platform_promo_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_revenue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_name" "text" NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "escrow_id" "uuid" NOT NULL,
    "gross_amount" numeric(12,2) NOT NULL,
    "commission_amount" numeric(12,2) NOT NULL,
    "tax_collected" numeric(12,2) DEFAULT 0,
    "revenue_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."platform_revenue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "value_type" "text" DEFAULT 'string'::"text",
    "description" "text",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "parent_comment_id" "uuid",
    "content" "text" NOT NULL,
    "like_count" integer DEFAULT 0,
    "is_edited" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text"
);


ALTER TABLE "public"."post_comments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."post_comments"."tenant_id" IS 'Multi-tenant isolation - must match parent post tenant_id';



CREATE OR REPLACE VIEW "public"."post_comments_with_profiles" AS
 SELECT "pc"."id",
    "pc"."post_id",
    "pc"."user_id",
    "pc"."content",
    "pc"."parent_comment_id",
    "pc"."like_count",
    "pc"."is_edited",
    "pc"."created_at",
    "pc"."updated_at",
    "pc"."tenant_id",
    "pc"."deleted_at",
    "pc"."deleted_by",
    "pc"."deletion_reason",
    "up"."first_name",
    "up"."last_name",
    "up"."avatar_url"
   FROM ("public"."post_comments" "pc"
     LEFT JOIN "public"."user_profiles" "up" ON (("pc"."user_id" = "up"."id")));


ALTER VIEW "public"."post_comments_with_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reaction_type" "text" DEFAULT 'like'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid",
    CONSTRAINT "post_likes_reaction_type_check" CHECK (("reaction_type" = ANY (ARRAY['like'::"text", 'love'::"text", 'haha'::"text", 'wow'::"text", 'sad'::"text", 'angry'::"text"])))
);


ALTER TABLE "public"."post_likes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."post_likes"."tenant_id" IS 'Multi-tenant isolation - must match parent post tenant_id';



CREATE TABLE IF NOT EXISTS "public"."postal_staff" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_type" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "date_of_birth" "date",
    "gender" "text",
    "residential_address" "text",
    "city" "text",
    "state" "text",
    "country" "text" DEFAULT 'Nigeria'::"text",
    "postal_code" "text",
    "employee_id" "text",
    "department" "text",
    "position" "text",
    "hire_date" "date",
    "years_of_service" integer,
    "approval_status" "text" DEFAULT 'pending'::"text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "rejection_reason" "text",
    "rejected_by" "uuid",
    "rejected_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    "admission_date" "date",
    "assigned_region" "text",
    "assigned_post_office_id" "uuid",
    "user_id" "uuid",
    CONSTRAINT "postal_staff_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "postal_staff_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text"]))),
    CONSTRAINT "postal_staff_staff_type_check" CHECK (("staff_type" = ANY (ARRAY['postmaster'::"text", 'regional_manager'::"text", 'admin_staff'::"text"])))
);


ALTER TABLE "public"."postal_staff" OWNER TO "postgres";


COMMENT ON TABLE "public"."postal_staff" IS 'Postal staff records for Director of Operations dashboard - includes postmasters, regional managers, and admin staff with approval workflow';



COMMENT ON COLUMN "public"."postal_staff"."user_id" IS 'Links postal staff record to auth.users - set when staff member is approved and user account is created';



CREATE TABLE IF NOT EXISTS "public"."refund_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_name" "text" NOT NULL,
    "refund_tiers" "jsonb" NOT NULL,
    "non_refundable_exceptions" "text"[],
    "refund_processing_days" integer DEFAULT 5,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."refund_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ride_rejections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ride_id" "uuid" NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ride_rejections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ride_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ride_id" "uuid" NOT NULL,
    "location" "public"."geography"(Point,4326) NOT NULL,
    "heading" numeric(5,2),
    "speed" numeric(5,2),
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ride_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ride_number" "text" NOT NULL,
    "driver_id" "uuid",
    "passenger_id" "uuid" NOT NULL,
    "pickup_location" "jsonb" NOT NULL,
    "dropoff_location" "jsonb" NOT NULL,
    "pickup_address" "text",
    "dropoff_address" "text",
    "distance_km" numeric,
    "estimated_duration_minutes" integer,
    "base_fare" numeric NOT NULL,
    "distance_fare" numeric DEFAULT 0,
    "time_fare" numeric DEFAULT 0,
    "surge_multiplier" numeric DEFAULT 1.0,
    "total_fare" numeric NOT NULL,
    "discount_amount" numeric DEFAULT 0,
    "final_amount" numeric NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text",
    "status" "text" DEFAULT 'requested'::"text",
    "pickup_time" timestamp with time zone,
    "dropoff_time" timestamp with time zone,
    "cancellation_reason" "text",
    "cancelled_by" "uuid",
    "cancelled_at" timestamp with time zone,
    "rating" integer,
    "review_comment" "text",
    "driver_notes" "text",
    "passenger_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "driver_eta_minutes" integer,
    "accepted_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "cancellation_fee" numeric(10,2),
    "actual_distance_km" numeric(10,2),
    "actual_duration_minutes" integer,
    "final_fare" numeric(10,2),
    "scheduled_time" timestamp with time zone,
    "actual_dropoff_location" "jsonb",
    CONSTRAINT "rides_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text", 'refunded'::"text"]))),
    CONSTRAINT "rides_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "rides_status_check" CHECK (("status" = ANY (ARRAY['requested'::"text", 'accepted'::"text", 'arrived'::"text", 'picked_up'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text", 'no_show'::"text"])))
);


ALTER TABLE "public"."rides" OWNER TO "postgres";


COMMENT ON COLUMN "public"."rides"."driver_id" IS 'Driver assigned to the ride. NULL when ride is first requested (status=requested), populated when driver accepts.';



CREATE TABLE IF NOT EXISTS "public"."role_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_name" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "application_data" "jsonb",
    "document_urls" "text"[],
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "role_applications_role_name_check" CHECK (("role_name" = ANY (ARRAY['VENDOR'::"text", 'DRIVER'::"text", 'HOST'::"text", 'ADVERTISER'::"text"]))),
    CONSTRAINT "role_applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."role_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_type_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "available_rooms" integer DEFAULT 0 NOT NULL,
    "base_price" numeric,
    "dynamic_price" numeric,
    "minimum_stay" integer DEFAULT 1,
    "is_blocked" boolean DEFAULT false,
    "block_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."room_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "capacity" integer NOT NULL,
    "beds_count" integer DEFAULT 1 NOT NULL,
    "bed_type" "text",
    "room_size_sqft" integer,
    "base_price" numeric NOT NULL,
    "weekend_price" numeric,
    "seasonal_prices" "jsonb",
    "amenities" "text"[] DEFAULT '{}'::"text"[],
    "images" "text"[] DEFAULT '{}'::"text"[],
    "max_adults" integer DEFAULT 2 NOT NULL,
    "max_children" integer DEFAULT 0,
    "allows_pets" boolean DEFAULT false,
    "allows_smoking" boolean DEFAULT false,
    "breakfast_included" boolean DEFAULT false,
    "refundable" boolean DEFAULT true,
    "cancellation_hours" integer DEFAULT 24,
    "total_rooms" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "room_types_base_price_check" CHECK (("base_price" >= (0)::numeric)),
    CONSTRAINT "room_types_capacity_check" CHECK (("capacity" > 0))
);


ALTER TABLE "public"."room_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_type_id" "uuid" NOT NULL,
    "room_number" "text" NOT NULL,
    "floor" integer,
    "status" "text" DEFAULT 'available'::"text",
    "notes" "text",
    "last_cleaned_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rooms_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'occupied'::"text", 'maintenance'::"text", 'reserved'::"text", 'cleaning'::"text"])))
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "template_name" "text" NOT NULL,
    "scheduled_at" timestamp with time zone NOT NULL,
    "timezone" "text" DEFAULT 'UTC'::"text",
    "variables" "jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "notification_log_id" "uuid",
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone
);


ALTER TABLE "public"."scheduled_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_module_mapping" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "module_type" "text" NOT NULL,
    "primary_service" "text" NOT NULL,
    "access_pattern" "text" NOT NULL,
    "database_intensity" integer,
    "compute_intensity" integer,
    "traffic_pattern" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "service_module_mapping_access_pattern_check" CHECK (("access_pattern" = ANY (ARRAY['read_write'::"text", 'read_only'::"text", 'write_only'::"text", 'admin_only'::"text"]))),
    CONSTRAINT "service_module_mapping_compute_intensity_check" CHECK ((("compute_intensity" >= 1) AND ("compute_intensity" <= 10))),
    CONSTRAINT "service_module_mapping_database_intensity_check" CHECK ((("database_intensity" >= 1) AND ("database_intensity" <= 10))),
    CONSTRAINT "service_module_mapping_module_type_check" CHECK (("module_type" = ANY (ARRAY['core'::"text", 'social'::"text", 'admin'::"text", 'media'::"text", 'utility'::"text"]))),
    CONSTRAINT "service_module_mapping_primary_service_check" CHECK (("primary_service" = ANY (ARRAY['supabase'::"text", 'railway'::"text"]))),
    CONSTRAINT "service_module_mapping_traffic_pattern_check" CHECK (("traffic_pattern" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'burst'::"text"])))
);


ALTER TABLE "public"."service_module_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipping_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "label" "text",
    "name" "text",
    "building_number" "text",
    "street" "text",
    "address2" "text",
    "apartment" "text",
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "postal_code" "text",
    "country" "text",
    "phone" "text",
    "contact_name" "text",
    "is_default" boolean DEFAULT false,
    "latitude" double precision,
    "longitude" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shipping_addresses" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."social_posts_with_profiles" AS
 SELECT "sp"."id",
    "sp"."user_id",
    "sp"."content",
    "sp"."media_urls",
    "sp"."post_type",
    "sp"."visibility",
    "sp"."allowed_viewers",
    "sp"."location",
    "sp"."feeling_activity",
    "sp"."tagged_users",
    "sp"."like_count",
    "sp"."comment_count",
    "sp"."share_count",
    "sp"."view_count",
    "sp"."shared_post_id",
    "sp"."is_active",
    "sp"."expires_at",
    "sp"."created_at",
    "sp"."updated_at",
    "sp"."deleted_at",
    "sp"."deleted_by",
    "sp"."deletion_reason",
    "sp"."tenant_id",
    "up"."first_name",
    "up"."last_name",
    "up"."avatar_url"
   FROM ("public"."social_posts" "sp"
     LEFT JOIN "public"."user_profiles" "up" ON (("sp"."user_id" = "up"."id")))
  WHERE ("sp"."deleted_at" IS NULL);


ALTER VIEW "public"."social_posts_with_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "media_url" "text" NOT NULL,
    "media_type" "text",
    "caption" "text",
    "duration_seconds" integer DEFAULT 5,
    "view_count" integer DEFAULT 0,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "stories_media_type_check" CHECK (("media_type" = ANY (ARRAY['image'::"text", 'video'::"text"])))
);


ALTER TABLE "public"."stories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."story_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."story_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text" NOT NULL,
    "subcategory" "text",
    "tags" "text"[],
    "view_count" integer DEFAULT 0,
    "helpful_count" integer DEFAULT 0,
    "not_helpful_count" integer DEFAULT 0,
    "author_id" "uuid",
    "is_published" boolean DEFAULT false,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."support_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_id" "uuid",
    "shift_start" timestamp with time zone NOT NULL,
    "shift_end" timestamp with time zone NOT NULL,
    "actual_start" timestamp with time zone,
    "actual_end" timestamp with time zone,
    "status" "text",
    "tickets_handled" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."support_shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_staff" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "employee_id" "text" NOT NULL,
    "staff_type" "text",
    "tier_level" integer,
    "specializations" "text"[],
    "languages" "text"[] DEFAULT '{en}'::"text"[],
    "max_concurrent_tickets" integer DEFAULT 5,
    "is_online" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "total_tickets_resolved" integer DEFAULT 0,
    "average_resolution_time_minutes" integer,
    "customer_satisfaction_rating" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "support_staff_staff_type_check" CHECK (("staff_type" = ANY (ARRAY['customer_service'::"text", 'technical'::"text", 'billing'::"text", 'escalation'::"text"]))),
    CONSTRAINT "support_staff_tier_level_check" CHECK ((("tier_level" >= 1) AND ("tier_level" <= 3)))
);


ALTER TABLE "public"."support_staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_number" "text" NOT NULL,
    "user_id" "uuid",
    "assigned_to" "uuid",
    "category" "text",
    "priority" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'open'::"text",
    "subject" "text" NOT NULL,
    "description" "text" NOT NULL,
    "module_name" "text",
    "reference_id" "uuid",
    "attachments" "text"[],
    "tags" "text"[],
    "first_response_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "sla_deadline" timestamp with time zone,
    "escalated_to" "uuid",
    "escalation_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."surge_pricing_zones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "area" "public"."geography"(Polygon,4326) NOT NULL,
    "multiplier" numeric(3,2) DEFAULT 1.5,
    "is_active" boolean DEFAULT true,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "days_of_week" integer[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."surge_pricing_zones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."taxi_drivers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "date_of_birth" "date",
    "gender" "text",
    "residential_address" "text",
    "city" "text",
    "state" "text",
    "country" "text" DEFAULT 'Nigeria'::"text",
    "license_number" "text" NOT NULL,
    "license_expiry" "date",
    "license_class" "text",
    "vehicle_make" "text",
    "vehicle_model" "text",
    "vehicle_year" integer,
    "vehicle_color" "text",
    "plate_number" "text",
    "vehicle_type" "text",
    "rating" numeric(3,2) DEFAULT 0,
    "total_rides" integer DEFAULT 0,
    "is_online" boolean DEFAULT false,
    "is_verified" boolean DEFAULT false,
    "approval_status" "text" DEFAULT 'pending'::"text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "rejection_reason" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    CONSTRAINT "taxi_drivers_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "taxi_drivers_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text"]))),
    CONSTRAINT "taxi_drivers_vehicle_type_check" CHECK (("vehicle_type" = ANY (ARRAY['sedan'::"text", 'suv'::"text", 'minivan'::"text", 'motorcycle'::"text", 'tricycle'::"text"])))
);


ALTER TABLE "public"."taxi_drivers" OWNER TO "postgres";


COMMENT ON TABLE "public"."taxi_drivers" IS 'Taxi driver registrations with approval workflow for admin review';



CREATE TABLE IF NOT EXISTS "public"."ticket_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid",
    "sender_id" "uuid",
    "sender_type" "text",
    "message" "text" NOT NULL,
    "attachments" "text"[],
    "is_internal_note" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tour_promo_code_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promo_code_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tour_booking_id" "uuid" NOT NULL,
    "discount_amount" numeric(10,2) NOT NULL,
    "used_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tour_promo_code_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tour_promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "discount_type" "text" NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "min_participants" integer DEFAULT 1,
    "min_order_amount" numeric(10,2),
    "max_discount_amount" numeric(10,2),
    "applicable_tours" "uuid"[],
    "applicable_categories" "text"[],
    "excluded_tours" "uuid"[],
    "group_booking_only" boolean DEFAULT false,
    "first_booking_only" boolean DEFAULT false,
    "requires_early_booking_days" integer,
    "usage_limit" integer,
    "usage_count" integer DEFAULT 0,
    "per_user_limit" integer DEFAULT 1,
    "valid_from" timestamp with time zone,
    "valid_until" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tour_promo_codes_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed_amount'::"text", 'free_person'::"text"]))),
    CONSTRAINT "tour_promo_codes_discount_value_check" CHECK (("discount_value" >= (0)::numeric))
);


ALTER TABLE "public"."tour_promo_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unsubscribe_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "token" "text" NOT NULL,
    "type" "text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '1 year'::interval),
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "unsubscribe_tokens_type_check" CHECK (("type" = ANY (ARRAY['email'::"text", 'sms'::"text", 'all'::"text"])))
);


ALTER TABLE "public"."unsubscribe_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_active_roles" (
    "user_id" "uuid" NOT NULL,
    "active_role" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_active_roles_active_role_check" CHECK (("active_role" = ANY (ARRAY['CUSTOMER'::"text", 'VENDOR'::"text", 'DRIVER'::"text", 'HOST'::"text", 'ADVERTISER'::"text", 'ADMIN'::"text", 'DOP'::"text", 'PMG'::"text", 'REGIONAL_MANAGER'::"text", 'MODULE_ADMIN'::"text", 'COURIER'::"text"])))
);


ALTER TABLE "public"."user_active_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "label" "text" NOT NULL,
    "name" "text",
    "building_number" "text",
    "street" "text" NOT NULL,
    "address2" "text",
    "city" "text" NOT NULL,
    "state" "text",
    "zip_code" "text",
    "country" "text" NOT NULL,
    "phone" "text",
    "is_default" boolean DEFAULT false,
    "latitude" double precision,
    "longitude" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "address_type" "text",
    "apartment" "text",
    "postal_code" "text",
    "contact_name" "text",
    "contact_phone" "text",
    CONSTRAINT "user_addresses_address_type_check" CHECK (("address_type" = ANY (ARRAY['home'::"text", 'work'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."user_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "connected_user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "connection_type" "text" DEFAULT 'friend'::"text",
    "is_close_friend" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_connections_check" CHECK (("user_id" <> "connected_user_id")),
    CONSTRAINT "user_connections_connection_type_check" CHECK (("connection_type" = ANY (ARRAY['friend'::"text", 'follower'::"text", 'family'::"text", 'colleague'::"text"]))),
    CONSTRAINT "user_connections_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'blocked'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."user_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_name" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "granted_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "user_roles_role_name_check" CHECK (("role_name" = ANY (ARRAY['CUSTOMER'::"text", 'VENDOR'::"text", 'DRIVER'::"text", 'HOST'::"text", 'ADVERTISER'::"text", 'ADMIN'::"text", 'DOP'::"text", 'PMG'::"text", 'REGIONAL_MANAGER'::"text", 'MODULE_ADMIN'::"text", 'COURIER'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "balance" numeric(12,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'NGN'::"text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_locked" boolean DEFAULT false,
    "lock_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_wallets_balance_check" CHECK (("balance" >= (0)::numeric))
);


ALTER TABLE "public"."user_wallets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_hotels_search" AS
 SELECT "id",
    "name",
    "description",
    "city",
    "state",
    "country",
    "address",
    "latitude",
    "longitude",
    "total_reviews",
    "is_active",
    "is_verified",
    "host_id"
   FROM "public"."hotels" "h"
  WHERE (("is_active" = true) AND ("is_verified" = true));


ALTER VIEW "public"."v_hotels_search" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_room_availability_summary" AS
 SELECT "rt"."id",
    "rt"."hotel_id",
    "rt"."name",
    "rt"."base_price",
    "count"("r"."id") AS "total_rooms",
    "count"(
        CASE
            WHEN ("r"."status" = 'available'::"text") THEN 1
            ELSE NULL::integer
        END) AS "available_rooms"
   FROM ("public"."room_types" "rt"
     LEFT JOIN "public"."rooms" "r" ON (("rt"."id" = "r"."room_type_id")))
  WHERE ("rt"."is_active" = true)
  GROUP BY "rt"."id", "rt"."hotel_id", "rt"."name", "rt"."base_price";


ALTER VIEW "public"."v_room_availability_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicle_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "capacity" integer DEFAULT 4,
    "price_multiplier" numeric(3,2) DEFAULT 1.0,
    "icon" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vehicle_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "vendor_type" "text" NOT NULL,
    "module_name" "text" NOT NULL,
    "total_amount" numeric(12,2) NOT NULL,
    "escrow_transaction_ids" "uuid"[] NOT NULL,
    "transaction_count" integer NOT NULL,
    "payout_method" "text" DEFAULT 'bank_transfer'::"text" NOT NULL,
    "bank_name" "text",
    "account_number" "text",
    "account_name" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payout_provider" "text",
    "provider_reference" "text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "processed_by" "uuid",
    "failure_reason" "text",
    "retry_count" integer DEFAULT 0,
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "vendor_payouts_payout_method_check" CHECK (("payout_method" = ANY (ARRAY['bank_transfer'::"text", 'mobile_money'::"text"]))),
    CONSTRAINT "vendor_payouts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."vendor_payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "business_name" "text" NOT NULL,
    "business_type" "text",
    "description" "text",
    "logo" "text",
    "website" "text",
    "subscription_tier" "text" DEFAULT 'BASIC'::"text",
    "commission_rate" double precision DEFAULT 0.15,
    "is_verified" boolean DEFAULT false,
    "rating" double precision,
    "total_sales" double precision DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vendor_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallet_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallet_id" "uuid" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "balance_before" numeric(12,2) NOT NULL,
    "balance_after" numeric(12,2) NOT NULL,
    "reference_type" "text",
    "reference_id" "uuid",
    "description" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "type" "text",
    "currency" "text" DEFAULT 'NGN'::"text",
    "reference" "text",
    "status" "text" DEFAULT 'completed'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "wallet_transactions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "wallet_transactions_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['credit'::"text", 'debit'::"text", 'refund'::"text", 'withdrawal'::"text", 'bonus'::"text", 'reversal'::"text"]))),
    CONSTRAINT "wallet_transactions_type_check" CHECK (("type" = ANY (ARRAY['credit'::"text", 'debit'::"text"])))
);


ALTER TABLE "public"."wallet_transactions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ad_campaigns"
    ADD CONSTRAINT "ad_campaigns_campaign_number_key" UNIQUE ("campaign_number");



ALTER TABLE ONLY "public"."ad_campaigns"
    ADD CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_actions"
    ADD CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_approvals"
    ADD CONSTRAINT "admin_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_permission_code_key" UNIQUE ("permission_code");



ALTER TABLE ONLY "public"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertiser_profiles"
    ADD CONSTRAINT "advertiser_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertiser_profiles"
    ADD CONSTRAINT "advertiser_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_trail"
    ADD CONSTRAINT "audit_trail_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."call_participants"
    ADD CONSTRAINT "call_participants_call_id_user_id_key" UNIQUE ("call_id", "user_id");



ALTER TABLE ONLY "public"."call_participants"
    ADD CONSTRAINT "call_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calls"
    ADD CONSTRAINT "calls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_comment_id_user_id_key" UNIQUE ("comment_id", "user_id");



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courier_profiles"
    ADD CONSTRAINT "courier_profiles_courier_code_unique" UNIQUE ("courier_code");



ALTER TABLE ONLY "public"."courier_profiles"
    ADD CONSTRAINT "courier_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courier_profiles"
    ADD CONSTRAINT "courier_profiles_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."customer_profiles"
    ADD CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_profiles"
    ADD CONSTRAINT "customer_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."data_classification"
    ADD CONSTRAINT "data_classification_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_classification"
    ADD CONSTRAINT "data_classification_table_name_column_name_key" UNIQUE ("table_name", "column_name");



ALTER TABLE ONLY "public"."delivery_assignments"
    ADD CONSTRAINT "delivery_assignments_assignment_number_unique" UNIQUE ("assignment_number");



ALTER TABLE ONLY "public"."delivery_assignments"
    ADD CONSTRAINT "delivery_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_exceptions"
    ADD CONSTRAINT "delivery_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_packages"
    ADD CONSTRAINT "delivery_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_packages"
    ADD CONSTRAINT "delivery_packages_tracking_number_key" UNIQUE ("tracking_number");



ALTER TABLE ONLY "public"."delivery_routes"
    ADD CONSTRAINT "delivery_routes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_status_history"
    ADD CONSTRAINT "delivery_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_tracking"
    ADD CONSTRAINT "delivery_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deposit_requirements"
    ADD CONSTRAINT "deposit_requirements_module_name_key" UNIQUE ("module_name");



ALTER TABLE ONLY "public"."deposit_requirements"
    ADD CONSTRAINT "deposit_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."driver_earnings"
    ADD CONSTRAINT "driver_earnings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."driver_profiles"
    ADD CONSTRAINT "driver_profiles_license_number_key" UNIQUE ("license_number");



ALTER TABLE ONLY "public"."driver_profiles"
    ADD CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."driver_profiles"
    ADD CONSTRAINT "driver_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."ecommerce_cart_items"
    ADD CONSTRAINT "ecommerce_cart_items_cart_id_product_id_variant_id_key" UNIQUE ("cart_id", "product_id", "variant_id");



ALTER TABLE ONLY "public"."ecommerce_cart_items"
    ADD CONSTRAINT "ecommerce_cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecommerce_carts"
    ADD CONSTRAINT "ecommerce_carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecommerce_categories"
    ADD CONSTRAINT "ecommerce_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecommerce_categories"
    ADD CONSTRAINT "ecommerce_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."ecommerce_order_items"
    ADD CONSTRAINT "ecommerce_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecommerce_order_status_history"
    ADD CONSTRAINT "ecommerce_order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecommerce_orders"
    ADD CONSTRAINT "ecommerce_orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."ecommerce_orders"
    ADD CONSTRAINT "ecommerce_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecommerce_product_reviews"
    ADD CONSTRAINT "ecommerce_product_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecommerce_product_reviews"
    ADD CONSTRAINT "ecommerce_product_reviews_product_id_user_id_order_id_key" UNIQUE ("product_id", "user_id", "order_id");



ALTER TABLE ONLY "public"."ecommerce_product_variants"
    ADD CONSTRAINT "ecommerce_product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecommerce_product_variants"
    ADD CONSTRAINT "ecommerce_product_variants_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."ecommerce_products"
    ADD CONSTRAINT "ecommerce_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecommerce_products"
    ADD CONSTRAINT "ecommerce_products_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."ecommerce_products"
    ADD CONSTRAINT "ecommerce_products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."marketplace_promo_code_usage"
    ADD CONSTRAINT "ecommerce_promo_code_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketplace_promo_codes"
    ADD CONSTRAINT "ecommerce_promo_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."marketplace_promo_codes"
    ADD CONSTRAINT "ecommerce_promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecommerce_vendors"
    ADD CONSTRAINT "ecommerce_vendors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecommerce_wishlists"
    ADD CONSTRAINT "ecommerce_wishlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecommerce_wishlists"
    ADD CONSTRAINT "ecommerce_wishlists_user_id_product_id_key" UNIQUE ("user_id", "product_id");



ALTER TABLE ONLY "public"."edge_function_inventory"
    ADD CONSTRAINT "edge_function_inventory_function_name_key" UNIQUE ("function_name");



ALTER TABLE ONLY "public"."edge_function_inventory"
    ADD CONSTRAINT "edge_function_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."escrow_transactions"
    ADD CONSTRAINT "escrow_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_promo_code_usage"
    ADD CONSTRAINT "event_promo_code_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_promo_codes"
    ADD CONSTRAINT "event_promo_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."event_promo_codes"
    ADD CONSTRAINT "event_promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."failed_payment_attempts"
    ADD CONSTRAINT "failed_payment_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorite_hotels"
    ADD CONSTRAINT "favorite_hotels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorite_hotels"
    ADD CONSTRAINT "favorite_hotels_unique" UNIQUE ("user_id", "hotel_id");



ALTER TABLE ONLY "public"."file_metadata"
    ADD CONSTRAINT "file_metadata_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."file_metadata"
    ADD CONSTRAINT "file_metadata_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."function_classification"
    ADD CONSTRAINT "function_classification_function_name_key" UNIQUE ("function_name");



ALTER TABLE ONLY "public"."function_classification"
    ADD CONSTRAINT "function_classification_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."function_consolidation_actions"
    ADD CONSTRAINT "function_consolidation_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."function_dependencies"
    ADD CONSTRAINT "function_dependencies_function_name_depends_on_table_key" UNIQUE ("function_name", "depends_on_table");



ALTER TABLE ONLY "public"."function_dependencies_map"
    ADD CONSTRAINT "function_dependencies_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."function_dependencies"
    ADD CONSTRAINT "function_dependencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."function_improvement_plan"
    ADD CONSTRAINT "function_improvement_plan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."function_openapi_specs"
    ADD CONSTRAINT "function_openapi_specs_function_name_key" UNIQUE ("function_name");



ALTER TABLE ONLY "public"."function_openapi_specs"
    ADD CONSTRAINT "function_openapi_specs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."function_quality_standards"
    ADD CONSTRAINT "function_quality_standards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."function_standardization_audit"
    ADD CONSTRAINT "function_standardization_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."host_profiles"
    ADD CONSTRAINT "host_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."host_profiles"
    ADD CONSTRAINT "host_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."hotel_amenities"
    ADD CONSTRAINT "hotel_amenities_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."hotel_amenities"
    ADD CONSTRAINT "hotel_amenities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_amenities"
    ADD CONSTRAINT "hotel_amenities_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."hotel_amenity_mappings"
    ADD CONSTRAINT "hotel_amenity_mappings_pkey" PRIMARY KEY ("hotel_id", "amenity_id");



ALTER TABLE ONLY "public"."hotel_booking_status_history"
    ADD CONSTRAINT "hotel_booking_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_bookings"
    ADD CONSTRAINT "hotel_bookings_booking_number_key" UNIQUE ("booking_number");



ALTER TABLE ONLY "public"."hotel_bookings"
    ADD CONSTRAINT "hotel_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_photos"
    ADD CONSTRAINT "hotel_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_promo_code_usage"
    ADD CONSTRAINT "hotel_promo_code_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_promo_codes"
    ADD CONSTRAINT "hotel_promo_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."hotel_promo_codes"
    ADD CONSTRAINT "hotel_promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_reviews"
    ADD CONSTRAINT "hotel_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."in_app_notifications"
    ADD CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_content"
    ADD CONSTRAINT "media_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_status"
    ADD CONSTRAINT "message_status_message_id_user_id_key" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."message_status"
    ADD CONSTRAINT "message_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_commission_rates"
    ADD CONSTRAINT "module_commission_rates_module_name_key" UNIQUE ("module_name");



ALTER TABLE ONLY "public"."module_commission_rates"
    ADD CONSTRAINT "module_commission_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nipost_admin_audit"
    ADD CONSTRAINT "nipost_admin_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nipost_ecommerce"
    ADD CONSTRAINT "nipost_ecommerce_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nipost_financial_audit"
    ADD CONSTRAINT "nipost_financial_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nipost_financial_ledger"
    ADD CONSTRAINT "nipost_financial_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nipost_financial_ledger"
    ADD CONSTRAINT "nipost_financial_ledger_transaction_id_key" UNIQUE ("transaction_id");



ALTER TABLE ONLY "public"."nipost_hotels"
    ADD CONSTRAINT "nipost_hotels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nipost_offices"
    ADD CONSTRAINT "nipost_offices_office_code_key" UNIQUE ("office_code");



ALTER TABLE ONLY "public"."nipost_offices"
    ADD CONSTRAINT "nipost_offices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nipost_officials"
    ADD CONSTRAINT "nipost_officials_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."nipost_officials"
    ADD CONSTRAINT "nipost_officials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nipost_officials"
    ADD CONSTRAINT "nipost_officials_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."nipost_regions"
    ADD CONSTRAINT "nipost_regions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nipost_regions"
    ADD CONSTRAINT "nipost_regions_region_code_key" UNIQUE ("region_code");



ALTER TABLE ONLY "public"."nipost_taxi"
    ADD CONSTRAINT "nipost_taxi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nipost_user_permissions"
    ADD CONSTRAINT "nipost_user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_analytics"
    ADD CONSTRAINT "notification_analytics_date_template_name_channel_key" UNIQUE ("date", "template_name", "channel");



ALTER TABLE ONLY "public"."notification_analytics"
    ADD CONSTRAINT "notification_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_campaigns"
    ADD CONSTRAINT "notification_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."notification_queue"
    ADD CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."official_permissions"
    ADD CONSTRAINT "official_permissions_official_id_permission_id_key" UNIQUE ("official_id", "permission_id");



ALTER TABLE ONLY "public"."official_permissions"
    ADD CONSTRAINT "official_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_reviews"
    ADD CONSTRAINT "one_review_per_booking" UNIQUE ("booking_id");



ALTER TABLE ONLY "public"."payment_provider_config"
    ADD CONSTRAINT "payment_provider_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_provider_config"
    ADD CONSTRAINT "payment_provider_config_provider_name_key" UNIQUE ("provider_name");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_transaction_id_key" UNIQUE ("transaction_id");



ALTER TABLE ONLY "public"."platform_migration_status"
    ADD CONSTRAINT "platform_migration_status_component_name_component_type_key" UNIQUE ("component_name", "component_type");



ALTER TABLE ONLY "public"."platform_migration_status"
    ADD CONSTRAINT "platform_migration_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_promo_code_usage"
    ADD CONSTRAINT "platform_promo_code_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_promo_codes"
    ADD CONSTRAINT "platform_promo_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."platform_promo_codes"
    ADD CONSTRAINT "platform_promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_revenue"
    ADD CONSTRAINT "platform_revenue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_category_key_key" UNIQUE ("category", "key");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_user_id_key" UNIQUE ("post_id", "user_id");



ALTER TABLE ONLY "public"."postal_staff"
    ADD CONSTRAINT "postal_staff_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."postal_staff"
    ADD CONSTRAINT "postal_staff_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."postal_staff"
    ADD CONSTRAINT "postal_staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refund_policies"
    ADD CONSTRAINT "refund_policies_module_name_key" UNIQUE ("module_name");



ALTER TABLE ONLY "public"."refund_policies"
    ADD CONSTRAINT "refund_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ride_rejections"
    ADD CONSTRAINT "ride_rejections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ride_rejections"
    ADD CONSTRAINT "ride_rejections_ride_id_driver_id_key" UNIQUE ("ride_id", "driver_id");



ALTER TABLE ONLY "public"."ride_tracking"
    ADD CONSTRAINT "ride_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rides"
    ADD CONSTRAINT "rides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rides"
    ADD CONSTRAINT "rides_ride_number_key" UNIQUE ("ride_number");



ALTER TABLE ONLY "public"."role_applications"
    ADD CONSTRAINT "role_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_applications"
    ADD CONSTRAINT "role_applications_user_id_role_name_status_key" UNIQUE ("user_id", "role_name", "status");



ALTER TABLE ONLY "public"."room_availability"
    ADD CONSTRAINT "room_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_availability"
    ADD CONSTRAINT "room_availability_unique" UNIQUE ("room_type_id", "date");



ALTER TABLE ONLY "public"."room_types"
    ADD CONSTRAINT "room_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_types"
    ADD CONSTRAINT "room_types_unique" UNIQUE ("hotel_id", "slug");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_room_number_unique" UNIQUE ("room_type_id", "room_number");



ALTER TABLE ONLY "public"."scheduled_notifications"
    ADD CONSTRAINT "scheduled_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_module_mapping"
    ADD CONSTRAINT "service_module_mapping_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_module_mapping"
    ADD CONSTRAINT "service_module_mapping_table_name_key" UNIQUE ("table_name");



ALTER TABLE ONLY "public"."shipping_addresses"
    ADD CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."story_views"
    ADD CONSTRAINT "story_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."story_views"
    ADD CONSTRAINT "story_views_story_id_user_id_key" UNIQUE ("story_id", "user_id");



ALTER TABLE ONLY "public"."support_articles"
    ADD CONSTRAINT "support_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_articles"
    ADD CONSTRAINT "support_articles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."support_shifts"
    ADD CONSTRAINT "support_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_staff"
    ADD CONSTRAINT "support_staff_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."support_staff"
    ADD CONSTRAINT "support_staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_staff"
    ADD CONSTRAINT "support_staff_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_ticket_number_key" UNIQUE ("ticket_number");



ALTER TABLE ONLY "public"."surge_pricing_zones"
    ADD CONSTRAINT "surge_pricing_zones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."taxi_drivers"
    ADD CONSTRAINT "taxi_drivers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tour_promo_code_usage"
    ADD CONSTRAINT "tour_promo_code_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tour_promo_codes"
    ADD CONSTRAINT "tour_promo_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."tour_promo_codes"
    ADD CONSTRAINT "tour_promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nipost_user_permissions"
    ADD CONSTRAINT "unique_active_user_permission" UNIQUE ("user_id", "access_level", "branch_id", "state_id");



ALTER TABLE ONLY "public"."ecommerce_carts"
    ADD CONSTRAINT "unique_user_cart" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."unsubscribe_tokens"
    ADD CONSTRAINT "unsubscribe_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unsubscribe_tokens"
    ADD CONSTRAINT "unsubscribe_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."user_active_roles"
    ADD CONSTRAINT "user_active_roles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_connections"
    ADD CONSTRAINT "user_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_connections"
    ADD CONSTRAINT "user_connections_user_id_connected_user_id_key" UNIQUE ("user_id", "connected_user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_name_key" UNIQUE ("user_id", "role_name");



ALTER TABLE ONLY "public"."user_wallets"
    ADD CONSTRAINT "user_wallets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_wallets"
    ADD CONSTRAINT "user_wallets_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."vehicle_types"
    ADD CONSTRAINT "vehicle_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicle_types"
    ADD CONSTRAINT "vehicle_types_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."vendor_payouts"
    ADD CONSTRAINT "vendor_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_profiles"
    ADD CONSTRAINT "vendor_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_profiles"
    ADD CONSTRAINT "vendor_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_ad_campaigns_advertiser_id" ON "public"."ad_campaigns" USING "btree" ("advertiser_id");



CREATE INDEX "idx_ad_campaigns_approved_by" ON "public"."ad_campaigns" USING "btree" ("approved_by");



CREATE INDEX "idx_ad_campaigns_deleted_at" ON "public"."ad_campaigns" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_ad_campaigns_status" ON "public"."ad_campaigns" USING "btree" ("status");



CREATE INDEX "idx_admin_actions_official_date" ON "public"."admin_actions" USING "btree" ("official_id", "created_at" DESC);



CREATE INDEX "idx_admin_actions_region_id" ON "public"."admin_actions" USING "btree" ("region_id");



CREATE INDEX "idx_admin_approvals_assigned_to" ON "public"."admin_approvals" USING "btree" ("assigned_to");



CREATE INDEX "idx_admin_approvals_decided_by" ON "public"."admin_approvals" USING "btree" ("decided_by");



CREATE INDEX "idx_admin_approvals_escalated_to" ON "public"."admin_approvals" USING "btree" ("escalated_to");



CREATE INDEX "idx_admin_approvals_region_id" ON "public"."admin_approvals" USING "btree" ("region_id");



CREATE INDEX "idx_admin_approvals_requested_by" ON "public"."admin_approvals" USING "btree" ("requested_by");



CREATE INDEX "idx_admin_approvals_status_priority" ON "public"."admin_approvals" USING "btree" ("status", "priority", "created_at");



CREATE INDEX "idx_admin_audit_action_type" ON "public"."nipost_admin_audit" USING "btree" ("action_type");



CREATE INDEX "idx_admin_audit_admin_id" ON "public"."nipost_admin_audit" USING "btree" ("admin_id");



CREATE INDEX "idx_admin_audit_branch_id" ON "public"."nipost_admin_audit" USING "btree" ("branch_id") WHERE ("branch_id" IS NOT NULL);



CREATE INDEX "idx_admin_audit_created_at" ON "public"."nipost_admin_audit" USING "btree" ("created_at");



CREATE INDEX "idx_admin_audit_resource" ON "public"."nipost_admin_audit" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_admin_audit_state_id" ON "public"."nipost_admin_audit" USING "btree" ("state_id") WHERE ("state_id" IS NOT NULL);



CREATE INDEX "idx_advertiser_profiles_user_id" ON "public"."advertiser_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_logs_resource" ON "public"."audit_logs" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_audit_logs_user_date" ON "public"."audit_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_audit_trail_created_at" ON "public"."audit_trail" USING "btree" ("created_at");



CREATE INDEX "idx_audit_trail_table_record" ON "public"."audit_trail" USING "btree" ("table_name", "record_id");



CREATE INDEX "idx_audit_trail_user_id" ON "public"."audit_trail" USING "btree" ("user_id");



CREATE INDEX "idx_call_participants_user_id" ON "public"."call_participants" USING "btree" ("user_id");



CREATE INDEX "idx_calls_conversation_id" ON "public"."calls" USING "btree" ("conversation_id");



CREATE INDEX "idx_calls_initiated_by" ON "public"."calls" USING "btree" ("initiated_by");



CREATE INDEX "idx_calls_participants" ON "public"."calls" USING "gin" ("participants");



CREATE INDEX "idx_calls_status_created" ON "public"."calls" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_campaigns_advertiser_id" ON "public"."ad_campaigns" USING "btree" ("advertiser_id");



CREATE INDEX "idx_campaigns_dates" ON "public"."ad_campaigns" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_campaigns_status" ON "public"."ad_campaigns" USING "btree" ("status");



CREATE INDEX "idx_cart_items_cart" ON "public"."ecommerce_cart_items" USING "btree" ("cart_id");



CREATE INDEX "idx_cart_items_product" ON "public"."ecommerce_cart_items" USING "btree" ("product_id");



CREATE INDEX "idx_categories_active" ON "public"."ecommerce_categories" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_comment_likes_user_id" ON "public"."comment_likes" USING "btree" ("user_id");



CREATE INDEX "idx_conversation_participants_user" ON "public"."conversation_participants" USING "btree" ("user_id", "last_read_at");



CREATE INDEX "idx_conversations_created_by" ON "public"."conversations" USING "btree" ("created_by");



CREATE INDEX "idx_conversations_last_message" ON "public"."conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_conversations_last_message_sender" ON "public"."conversations" USING "btree" ("last_message_sender");



CREATE INDEX "idx_courier_profiles_active" ON "public"."courier_profiles" USING "btree" ("is_active", "is_verified") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_courier_profiles_approval_status" ON "public"."courier_profiles" USING "btree" ("approval_status");



CREATE INDEX "idx_courier_profiles_availability" ON "public"."courier_profiles" USING "btree" ("availability_status", "is_online", "is_active");



CREATE INDEX "idx_courier_profiles_location" ON "public"."courier_profiles" USING "gist" ("current_location");



CREATE INDEX "idx_courier_profiles_rating" ON "public"."courier_profiles" USING "btree" ("rating" DESC);



CREATE INDEX "idx_courier_profiles_state_id" ON "public"."courier_profiles" USING "btree" ("state_id");



CREATE INDEX "idx_courier_profiles_user_id" ON "public"."courier_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_delivery_assignments_active" ON "public"."delivery_assignments" USING "btree" ("status", "courier_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_delivery_assignments_courier_id" ON "public"."delivery_assignments" USING "btree" ("courier_id");



CREATE INDEX "idx_delivery_assignments_delivery_location" ON "public"."delivery_assignments" USING "gist" ("delivery_location");



CREATE INDEX "idx_delivery_assignments_order_id" ON "public"."delivery_assignments" USING "btree" ("order_id");



CREATE INDEX "idx_delivery_assignments_pickup_location" ON "public"."delivery_assignments" USING "gist" ("pickup_location");



CREATE INDEX "idx_delivery_assignments_priority" ON "public"."delivery_assignments" USING "btree" ("priority" DESC, "created_at");



CREATE INDEX "idx_delivery_assignments_scheduled" ON "public"."delivery_assignments" USING "btree" ("delivery_scheduled_at");



CREATE INDEX "idx_delivery_assignments_status" ON "public"."delivery_assignments" USING "btree" ("status");



CREATE INDEX "idx_delivery_exceptions_active" ON "public"."delivery_exceptions" USING "btree" ("resolution_status", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_delivery_exceptions_assignment" ON "public"."delivery_exceptions" USING "btree" ("delivery_assignment_id");



CREATE INDEX "idx_delivery_exceptions_courier" ON "public"."delivery_exceptions" USING "btree" ("courier_id");



CREATE INDEX "idx_delivery_exceptions_severity" ON "public"."delivery_exceptions" USING "btree" ("severity", "created_at" DESC);



CREATE INDEX "idx_delivery_exceptions_status" ON "public"."delivery_exceptions" USING "btree" ("resolution_status");



CREATE INDEX "idx_delivery_exceptions_type" ON "public"."delivery_exceptions" USING "btree" ("exception_type");



CREATE INDEX "idx_delivery_packages_created_at" ON "public"."delivery_packages" USING "btree" ("created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_delivery_packages_sender_id" ON "public"."delivery_packages" USING "btree" ("sender_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_delivery_packages_status" ON "public"."delivery_packages" USING "btree" ("status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_delivery_packages_tracking_number" ON "public"."delivery_packages" USING "btree" ("tracking_number") WHERE ("tracking_number" IS NOT NULL);



CREATE INDEX "idx_delivery_routes_active" ON "public"."delivery_routes" USING "btree" ("courier_id", "route_date") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_delivery_routes_courier_date" ON "public"."delivery_routes" USING "btree" ("courier_id", "route_date");



CREATE INDEX "idx_delivery_routes_efficiency" ON "public"."delivery_routes" USING "btree" ("route_efficiency_score" DESC);



CREATE INDEX "idx_delivery_routes_status" ON "public"."delivery_routes" USING "btree" ("route_status");



CREATE INDEX "idx_delivery_status_history_created_at" ON "public"."delivery_status_history" USING "btree" ("created_at");



CREATE INDEX "idx_delivery_status_history_package_id" ON "public"."delivery_status_history" USING "btree" ("package_id");



CREATE INDEX "idx_delivery_tracking_active" ON "public"."delivery_tracking" USING "btree" ("is_active_tracking", "timestamp" DESC);



CREATE INDEX "idx_delivery_tracking_assignment" ON "public"."delivery_tracking" USING "btree" ("delivery_assignment_id", "timestamp" DESC);



CREATE INDEX "idx_delivery_tracking_courier" ON "public"."delivery_tracking" USING "btree" ("courier_id", "timestamp" DESC);



CREATE INDEX "idx_delivery_tracking_location" ON "public"."delivery_tracking" USING "gist" ("location");



CREATE INDEX "idx_delivery_tracking_timestamp" ON "public"."delivery_tracking" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_driver_earnings_date" ON "public"."driver_earnings" USING "btree" ("created_at");



CREATE INDEX "idx_driver_earnings_driver" ON "public"."driver_earnings" USING "btree" ("driver_id");



CREATE INDEX "idx_driver_earnings_ride_id" ON "public"."driver_earnings" USING "btree" ("ride_id");



CREATE INDEX "idx_driver_location" ON "public"."driver_profiles" USING "gist" ("last_location");



CREATE INDEX "idx_driver_profiles_deleted_at" ON "public"."driver_profiles" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_ecommerce_cart_items_variant_id" ON "public"."ecommerce_cart_items" USING "btree" ("variant_id");



CREATE INDEX "idx_ecommerce_carts_expires" ON "public"."ecommerce_carts" USING "btree" ("expires_at");



CREATE INDEX "idx_ecommerce_carts_promo_code_id" ON "public"."ecommerce_carts" USING "btree" ("promo_code_id");



CREATE INDEX "idx_ecommerce_carts_session" ON "public"."ecommerce_carts" USING "btree" ("session_id");



CREATE INDEX "idx_ecommerce_categories_active" ON "public"."ecommerce_categories" USING "btree" ("is_active");



CREATE INDEX "idx_ecommerce_categories_parent" ON "public"."ecommerce_categories" USING "btree" ("parent_id");



CREATE INDEX "idx_ecommerce_categories_slug" ON "public"."ecommerce_categories" USING "btree" ("slug");



CREATE INDEX "idx_ecommerce_order_items_deleted_at" ON "public"."ecommerce_order_items" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_ecommerce_order_items_variant_id" ON "public"."ecommerce_order_items" USING "btree" ("variant_id");



CREATE INDEX "idx_ecommerce_order_status_history_created_by" ON "public"."ecommerce_order_status_history" USING "btree" ("created_by");



CREATE INDEX "idx_ecommerce_orders_billing_address_id" ON "public"."ecommerce_orders" USING "btree" ("billing_address_id");



CREATE INDEX "idx_ecommerce_orders_created" ON "public"."ecommerce_orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ecommerce_orders_number" ON "public"."ecommerce_orders" USING "btree" ("order_number");



CREATE INDEX "idx_ecommerce_orders_payment_status" ON "public"."ecommerce_orders" USING "btree" ("payment_status");



CREATE INDEX "idx_ecommerce_orders_promo_code_id" ON "public"."ecommerce_orders" USING "btree" ("promo_code_id");



CREATE INDEX "idx_ecommerce_orders_shipping_address_id" ON "public"."ecommerce_orders" USING "btree" ("shipping_address_id");



CREATE INDEX "idx_ecommerce_orders_status" ON "public"."ecommerce_orders" USING "btree" ("status");



CREATE INDEX "idx_ecommerce_orders_user" ON "public"."ecommerce_orders" USING "btree" ("user_id");



CREATE INDEX "idx_ecommerce_orders_user_id" ON "public"."ecommerce_orders" USING "btree" ("user_id");



CREATE INDEX "idx_ecommerce_product_reviews_deleted_at" ON "public"."ecommerce_product_reviews" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_ecommerce_product_reviews_order_id" ON "public"."ecommerce_product_reviews" USING "btree" ("order_id");



CREATE INDEX "idx_ecommerce_products_active" ON "public"."ecommerce_products" USING "btree" ("is_active");



CREATE INDEX "idx_ecommerce_products_approval" ON "public"."ecommerce_products" USING "btree" ("approval_status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_ecommerce_products_category" ON "public"."ecommerce_products" USING "btree" ("category_id");



CREATE INDEX "idx_ecommerce_products_deleted_at" ON "public"."ecommerce_products" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_ecommerce_products_featured" ON "public"."ecommerce_products" USING "btree" ("is_featured");



CREATE INDEX "idx_ecommerce_products_price" ON "public"."ecommerce_products" USING "btree" ("final_price");



CREATE INDEX "idx_ecommerce_products_slug" ON "public"."ecommerce_products" USING "btree" ("slug");



CREATE INDEX "idx_ecommerce_products_vendor" ON "public"."ecommerce_products" USING "btree" ("vendor_id");



CREATE INDEX "idx_ecommerce_vendors_active" ON "public"."ecommerce_vendors" USING "btree" ("is_active");



CREATE INDEX "idx_ecommerce_vendors_deleted_at" ON "public"."ecommerce_vendors" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_ecommerce_vendors_user_id" ON "public"."ecommerce_vendors" USING "btree" ("user_id");



CREATE INDEX "idx_ecommerce_vendors_verified" ON "public"."ecommerce_vendors" USING "btree" ("is_verified");



CREATE INDEX "idx_edge_function_inventory_category" ON "public"."edge_function_inventory" USING "btree" ("category");



CREATE INDEX "idx_edge_function_inventory_module" ON "public"."edge_function_inventory" USING "btree" ("module_type");



CREATE INDEX "idx_edge_function_inventory_platform" ON "public"."edge_function_inventory" USING "btree" ("recommended_platform");



CREATE INDEX "idx_edge_function_inventory_status" ON "public"."edge_function_inventory" USING "btree" ("status");



CREATE INDEX "idx_escrow_module" ON "public"."escrow_transactions" USING "btree" ("module_name", "status");



CREATE INDEX "idx_escrow_payment_id" ON "public"."escrow_transactions" USING "btree" ("payment_id");



CREATE INDEX "idx_escrow_status" ON "public"."escrow_transactions" USING "btree" ("status");



CREATE INDEX "idx_escrow_transactions_released_by" ON "public"."escrow_transactions" USING "btree" ("released_by");



CREATE INDEX "idx_escrow_vendor_id" ON "public"."escrow_transactions" USING "btree" ("vendor_id");



CREATE INDEX "idx_escrow_vendor_status" ON "public"."escrow_transactions" USING "btree" ("vendor_id", "status");



CREATE INDEX "idx_event_promo_code_usage_promo_code_id" ON "public"."event_promo_code_usage" USING "btree" ("promo_code_id");



CREATE INDEX "idx_event_promo_code_usage_user_id" ON "public"."event_promo_code_usage" USING "btree" ("user_id");



CREATE INDEX "idx_event_promo_codes_created_by" ON "public"."event_promo_codes" USING "btree" ("created_by");



CREATE INDEX "idx_event_promos_code" ON "public"."event_promo_codes" USING "btree" ("code") WHERE ("is_active" = true);



CREATE INDEX "idx_failed_attempts_user" ON "public"."failed_payment_attempts" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_favorite_hotels_hotel_id" ON "public"."favorite_hotels" USING "btree" ("hotel_id");



CREATE INDEX "idx_file_metadata_created_at" ON "public"."file_metadata" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_file_metadata_deleted_at" ON "public"."file_metadata" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_file_metadata_entity" ON "public"."file_metadata" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_file_metadata_uploaded_by" ON "public"."file_metadata" USING "btree" ("uploaded_by");



CREATE INDEX "idx_financial_audit_action" ON "public"."nipost_financial_audit" USING "btree" ("action");



CREATE INDEX "idx_financial_audit_created_at" ON "public"."nipost_financial_audit" USING "btree" ("created_at");



CREATE INDEX "idx_financial_audit_ledger_id" ON "public"."nipost_financial_audit" USING "btree" ("ledger_id");



CREATE INDEX "idx_financial_audit_performed_by" ON "public"."nipost_financial_audit" USING "btree" ("performed_by");



CREATE INDEX "idx_financial_ledger_branch_id" ON "public"."nipost_financial_ledger" USING "btree" ("branch_id");



CREATE INDEX "idx_financial_ledger_created_at" ON "public"."nipost_financial_ledger" USING "btree" ("created_at");



CREATE INDEX "idx_financial_ledger_module" ON "public"."nipost_financial_ledger" USING "btree" ("module");



CREATE INDEX "idx_financial_ledger_settlement_date" ON "public"."nipost_financial_ledger" USING "btree" ("settlement_date") WHERE ("settlement_date" IS NOT NULL);



CREATE INDEX "idx_financial_ledger_state_id" ON "public"."nipost_financial_ledger" USING "btree" ("state_id");



CREATE INDEX "idx_financial_ledger_status" ON "public"."nipost_financial_ledger" USING "btree" ("payment_status", "settlement_status");



CREATE INDEX "idx_financial_ledger_transaction_id" ON "public"."nipost_financial_ledger" USING "btree" ("transaction_id");



CREATE INDEX "idx_financial_ledger_user_id" ON "public"."nipost_financial_ledger" USING "btree" ("user_id");



CREATE INDEX "idx_function_classification_intensity" ON "public"."function_classification" USING "btree" ("database_intensity", "compute_intensity");



CREATE INDEX "idx_function_classification_module" ON "public"."function_classification" USING "btree" ("module_type");



CREATE INDEX "idx_function_classification_platform" ON "public"."function_classification" USING "btree" ("recommended_platform");



CREATE INDEX "idx_function_classification_priority" ON "public"."function_classification" USING "btree" ("migration_priority");



CREATE INDEX "idx_function_dependencies_map_function_name" ON "public"."function_dependencies_map" USING "btree" ("function_name");



CREATE INDEX "idx_function_openapi_specs_function_name" ON "public"."function_openapi_specs" USING "btree" ("function_name");



CREATE INDEX "idx_host_profiles_deleted_at" ON "public"."host_profiles" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_hotel_amenity_mappings_amenity_id" ON "public"."hotel_amenity_mappings" USING "btree" ("amenity_id");



CREATE INDEX "idx_hotel_booking_status_history_booking_id" ON "public"."hotel_booking_status_history" USING "btree" ("booking_id");



CREATE INDEX "idx_hotel_booking_status_history_changed_by" ON "public"."hotel_booking_status_history" USING "btree" ("changed_by");



CREATE INDEX "idx_hotel_bookings_booking_number" ON "public"."hotel_bookings" USING "btree" ("booking_number");



CREATE INDEX "idx_hotel_bookings_booking_status" ON "public"."hotel_bookings" USING "btree" ("booking_status");



CREATE INDEX "idx_hotel_bookings_cancelled_by" ON "public"."hotel_bookings" USING "btree" ("cancelled_by");



CREATE INDEX "idx_hotel_bookings_check_in_date" ON "public"."hotel_bookings" USING "btree" ("check_in_date");



CREATE INDEX "idx_hotel_bookings_check_out_date" ON "public"."hotel_bookings" USING "btree" ("check_out_date");



CREATE INDEX "idx_hotel_bookings_dates" ON "public"."hotel_bookings" USING "btree" ("check_in_date", "check_out_date");



CREATE INDEX "idx_hotel_bookings_hotel" ON "public"."hotel_bookings" USING "btree" ("hotel_id", "booking_status");



CREATE INDEX "idx_hotel_bookings_hotel_dates" ON "public"."hotel_bookings" USING "btree" ("hotel_id", "check_in_date", "check_out_date");



CREATE INDEX "idx_hotel_bookings_hotel_id" ON "public"."hotel_bookings" USING "btree" ("hotel_id");



CREATE INDEX "idx_hotel_bookings_room_id" ON "public"."hotel_bookings" USING "btree" ("room_id");



CREATE INDEX "idx_hotel_bookings_room_type_id" ON "public"."hotel_bookings" USING "btree" ("room_type_id");



CREATE INDEX "idx_hotel_bookings_user_id" ON "public"."hotel_bookings" USING "btree" ("user_id");



CREATE INDEX "idx_hotel_bookings_user_status" ON "public"."hotel_bookings" USING "btree" ("user_id", "booking_status");



CREATE INDEX "idx_hotel_photos_hotel_id" ON "public"."hotel_photos" USING "btree" ("hotel_id");



CREATE INDEX "idx_hotel_photos_room_type_id" ON "public"."hotel_photos" USING "btree" ("room_type_id");



CREATE INDEX "idx_hotel_photos_uploaded_by" ON "public"."hotel_photos" USING "btree" ("uploaded_by");



CREATE INDEX "idx_hotel_promo_code_usage_booking_id" ON "public"."hotel_promo_code_usage" USING "btree" ("booking_id");



CREATE INDEX "idx_hotel_promo_codes_created_by" ON "public"."hotel_promo_codes" USING "btree" ("created_by");



CREATE INDEX "idx_hotel_promo_usage_code" ON "public"."hotel_promo_code_usage" USING "btree" ("promo_code_id");



CREATE INDEX "idx_hotel_promo_usage_user" ON "public"."hotel_promo_code_usage" USING "btree" ("user_id");



CREATE INDEX "idx_hotel_promos_code" ON "public"."hotel_promo_codes" USING "btree" ("code") WHERE ("is_active" = true);



CREATE INDEX "idx_hotel_promos_valid" ON "public"."hotel_promo_codes" USING "btree" ("valid_from", "valid_until") WHERE ("is_active" = true);



CREATE INDEX "idx_hotel_reviews_hotel" ON "public"."hotel_reviews" USING "btree" ("hotel_id", "is_approved");



CREATE INDEX "idx_hotel_reviews_hotel_id" ON "public"."hotel_reviews" USING "btree" ("hotel_id");



CREATE INDEX "idx_hotel_reviews_rating" ON "public"."hotel_reviews" USING "btree" ("rating");



CREATE INDEX "idx_hotel_reviews_user_id" ON "public"."hotel_reviews" USING "btree" ("user_id");



CREATE INDEX "idx_hotels_active" ON "public"."hotels" USING "btree" ("is_active") WHERE (("is_active" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_hotels_active_verified" ON "public"."hotels" USING "btree" ("is_active", "is_verified");



CREATE INDEX "idx_hotels_approval" ON "public"."hotels" USING "btree" ("approval_status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_hotels_city" ON "public"."hotels" USING "btree" ("city");



CREATE INDEX "idx_hotels_city_active" ON "public"."hotels" USING "btree" ("city", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_hotels_deleted_at" ON "public"."hotels" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_hotels_host_id" ON "public"."hotels" USING "btree" ("host_id");



CREATE INDEX "idx_hotels_is_active" ON "public"."hotels" USING "btree" ("is_active");



CREATE INDEX "idx_hotels_location" ON "public"."hotels" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_hotels_slug" ON "public"."hotels" USING "btree" ("slug");



CREATE INDEX "idx_hotels_star_rating" ON "public"."hotels" USING "btree" ("star_rating") WHERE (("is_active" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_in_app_notifications_created_at" ON "public"."in_app_notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_in_app_notifications_is_read" ON "public"."in_app_notifications" USING "btree" ("is_read");



CREATE INDEX "idx_in_app_notifications_user_id" ON "public"."in_app_notifications" USING "btree" ("user_id");



CREATE INDEX "idx_marketplace_promo_codes_created_by" ON "public"."marketplace_promo_codes" USING "btree" ("created_by");



CREATE INDEX "idx_media_content_approval_status" ON "public"."media_content" USING "btree" ("approval_status");



CREATE INDEX "idx_media_content_category" ON "public"."media_content" USING "btree" ("category");



CREATE INDEX "idx_media_content_content_type" ON "public"."media_content" USING "btree" ("content_type");



CREATE INDEX "idx_media_content_is_active" ON "public"."media_content" USING "btree" ("is_active") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_message_status_user_id" ON "public"."message_status" USING "btree" ("user_id");



CREATE INDEX "idx_messages_content_trgm" ON "public"."messages" USING "gin" ("content" "public"."gin_trgm_ops");



CREATE INDEX "idx_messages_conversation_created" ON "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_messages_deleted_at" ON "public"."messages" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_messages_forward_from" ON "public"."messages" USING "btree" ("forward_from");



CREATE INDEX "idx_messages_reply_to_id" ON "public"."messages" USING "btree" ("reply_to_id");



CREATE INDEX "idx_messages_sender" ON "public"."messages" USING "btree" ("sender_id", "created_at" DESC);



CREATE INDEX "idx_module_commission_rates_created_by" ON "public"."module_commission_rates" USING "btree" ("created_by");



CREATE INDEX "idx_module_commission_rates_updated_by" ON "public"."module_commission_rates" USING "btree" ("updated_by");



CREATE INDEX "idx_nipost_ecommerce_branch_id" ON "public"."nipost_ecommerce" USING "btree" ("branch_id");



CREATE INDEX "idx_nipost_ecommerce_seller_id" ON "public"."nipost_ecommerce" USING "btree" ("seller_id");



CREATE INDEX "idx_nipost_ecommerce_state_id" ON "public"."nipost_ecommerce" USING "btree" ("state_id");



CREATE INDEX "idx_nipost_hotels_branch_id" ON "public"."nipost_hotels" USING "btree" ("branch_id");



CREATE INDEX "idx_nipost_hotels_hotel_id" ON "public"."nipost_hotels" USING "btree" ("hotel_id");



CREATE INDEX "idx_nipost_hotels_state_id" ON "public"."nipost_hotels" USING "btree" ("state_id");



CREATE INDEX "idx_nipost_offices_manager_id" ON "public"."nipost_offices" USING "btree" ("manager_id");



CREATE INDEX "idx_nipost_offices_region_id" ON "public"."nipost_offices" USING "btree" ("region_id");



CREATE INDEX "idx_nipost_officials_department_rank" ON "public"."nipost_officials" USING "btree" ("department", "rank");



CREATE INDEX "idx_nipost_officials_office_id" ON "public"."nipost_officials" USING "btree" ("office_id");



CREATE INDEX "idx_nipost_officials_region_active" ON "public"."nipost_officials" USING "btree" ("region_id", "is_active");



CREATE INDEX "idx_nipost_officials_reporting_to" ON "public"."nipost_officials" USING "btree" ("reporting_to");



CREATE INDEX "idx_nipost_officials_user_id" ON "public"."nipost_officials" USING "btree" ("user_id");



CREATE INDEX "idx_nipost_permissions_access_level" ON "public"."nipost_user_permissions" USING "btree" ("access_level");



CREATE INDEX "idx_nipost_permissions_active" ON "public"."nipost_user_permissions" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_nipost_permissions_branch_id" ON "public"."nipost_user_permissions" USING "btree" ("branch_id") WHERE ("branch_id" IS NOT NULL);



CREATE INDEX "idx_nipost_permissions_state_id" ON "public"."nipost_user_permissions" USING "btree" ("state_id") WHERE ("state_id" IS NOT NULL);



CREATE INDEX "idx_nipost_permissions_user_id" ON "public"."nipost_user_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_nipost_regions_parent_region_id" ON "public"."nipost_regions" USING "btree" ("parent_region_id");



CREATE INDEX "idx_nipost_taxi_branch_id" ON "public"."nipost_taxi" USING "btree" ("branch_id");



CREATE INDEX "idx_nipost_taxi_driver_id" ON "public"."nipost_taxi" USING "btree" ("driver_id");



CREATE INDEX "idx_nipost_taxi_state_id" ON "public"."nipost_taxi" USING "btree" ("state_id");



CREATE INDEX "idx_nipost_user_permissions_access_level" ON "public"."nipost_user_permissions" USING "btree" ("access_level");



CREATE INDEX "idx_nipost_user_permissions_is_active" ON "public"."nipost_user_permissions" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_nipost_user_permissions_permissions" ON "public"."nipost_user_permissions" USING "gin" ("permissions");



CREATE INDEX "idx_nipost_user_permissions_role" ON "public"."nipost_user_permissions" USING "btree" ("role");



CREATE INDEX "idx_nipost_user_permissions_state_id" ON "public"."nipost_user_permissions" USING "btree" ("state_id");



CREATE INDEX "idx_nipost_user_permissions_user_id" ON "public"."nipost_user_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_notification_analytics_date" ON "public"."notification_analytics" USING "btree" ("date" DESC);



CREATE INDEX "idx_notification_analytics_template" ON "public"."notification_analytics" USING "btree" ("template_name");



CREATE INDEX "idx_notification_campaigns_created_by" ON "public"."notification_campaigns" USING "btree" ("created_by");



CREATE INDEX "idx_notification_campaigns_status" ON "public"."notification_campaigns" USING "btree" ("status");



CREATE INDEX "idx_notification_campaigns_template_id" ON "public"."notification_campaigns" USING "btree" ("template_id");



CREATE INDEX "idx_notification_logs_clicked_at" ON "public"."notification_logs" USING "btree" ("clicked_at");



CREATE INDEX "idx_notification_logs_created_at" ON "public"."notification_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notification_logs_opened_at" ON "public"."notification_logs" USING "btree" ("opened_at");



CREATE INDEX "idx_notification_logs_provider_id" ON "public"."notification_logs" USING "btree" ("provider_id");



CREATE INDEX "idx_notification_logs_sent_at" ON "public"."notification_logs" USING "btree" ("sent_at");



CREATE INDEX "idx_notification_logs_status" ON "public"."notification_logs" USING "btree" ("status");



CREATE INDEX "idx_notification_logs_template_id" ON "public"."notification_logs" USING "btree" ("template_id");



CREATE INDEX "idx_notification_logs_template_name" ON "public"."notification_logs" USING "btree" ("template_name");



CREATE INDEX "idx_notification_logs_type" ON "public"."notification_logs" USING "btree" ("type");



CREATE INDEX "idx_notification_logs_user" ON "public"."notification_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notification_logs_user_id" ON "public"."notification_logs" USING "btree" ("user_id");



CREATE INDEX "idx_notification_preferences_user_id" ON "public"."notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_notification_queue_notification_log_id" ON "public"."notification_queue" USING "btree" ("notification_log_id");



CREATE INDEX "idx_notification_queue_priority" ON "public"."notification_queue" USING "btree" ("priority" DESC, "created_at");



CREATE INDEX "idx_notification_queue_scheduled" ON "public"."notification_queue" USING "btree" ("process_after") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_notification_queue_status" ON "public"."notification_queue" USING "btree" ("status");



CREATE INDEX "idx_notification_queue_user_id" ON "public"."notification_queue" USING "btree" ("user_id");



CREATE INDEX "idx_notification_templates_category" ON "public"."notification_templates" USING "btree" ("category");



CREATE INDEX "idx_notification_templates_is_active" ON "public"."notification_templates" USING "btree" ("is_active");



CREATE INDEX "idx_notification_templates_name" ON "public"."notification_templates" USING "btree" ("name");



CREATE INDEX "idx_notification_templates_type" ON "public"."notification_templates" USING "btree" ("type");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at");



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("user_id", "read") WHERE ("read" = false);



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read" ON "public"."in_app_notifications" USING "btree" ("user_id", "is_read", "created_at" DESC);



CREATE INDEX "idx_official_permissions_granted_by" ON "public"."official_permissions" USING "btree" ("granted_by");



CREATE INDEX "idx_official_permissions_permission_id" ON "public"."official_permissions" USING "btree" ("permission_id");



CREATE INDEX "idx_order_items_order" ON "public"."ecommerce_order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product" ON "public"."ecommerce_order_items" USING "btree" ("product_id");



CREATE INDEX "idx_order_items_vendor" ON "public"."ecommerce_order_items" USING "btree" ("vendor_id");



CREATE INDEX "idx_order_items_vendor_status" ON "public"."ecommerce_order_items" USING "btree" ("vendor_id", "status");



CREATE INDEX "idx_order_status_history_created" ON "public"."ecommerce_order_status_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_order_status_history_order" ON "public"."ecommerce_order_status_history" USING "btree" ("order_id");



CREATE INDEX "idx_orders_user_status" ON "public"."ecommerce_orders" USING "btree" ("user_id", "status", "created_at" DESC);



CREATE INDEX "idx_payments_created" ON "public"."payments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_payments_created_at" ON "public"."payments" USING "btree" ("created_at");



CREATE INDEX "idx_payments_provider" ON "public"."payments" USING "btree" ("payment_provider");



CREATE INDEX "idx_payments_reference" ON "public"."payments" USING "btree" ("payment_type", "reference_id");



CREATE INDEX "idx_payments_reference_id" ON "public"."payments" USING "btree" ("reference_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("payment_status");



CREATE INDEX "idx_payments_transaction_id" ON "public"."payments" USING "btree" ("transaction_id");



CREATE INDEX "idx_payments_type" ON "public"."payments" USING "btree" ("payment_type");



CREATE INDEX "idx_payments_user_id" ON "public"."payments" USING "btree" ("user_id");



CREATE INDEX "idx_payments_user_status" ON "public"."payments" USING "btree" ("user_id", "payment_status");



CREATE INDEX "idx_payouts_module" ON "public"."vendor_payouts" USING "btree" ("module_name", "status");



CREATE INDEX "idx_payouts_requested_at" ON "public"."vendor_payouts" USING "btree" ("requested_at");



CREATE INDEX "idx_payouts_status" ON "public"."vendor_payouts" USING "btree" ("status", "requested_at");



CREATE INDEX "idx_payouts_vendor" ON "public"."vendor_payouts" USING "btree" ("vendor_id", "status");



CREATE INDEX "idx_payouts_vendor_id" ON "public"."vendor_payouts" USING "btree" ("vendor_id");



CREATE INDEX "idx_platform_promo_code_usage_promo_code_id" ON "public"."platform_promo_code_usage" USING "btree" ("promo_code_id");



CREATE INDEX "idx_platform_promo_codes_created_by" ON "public"."platform_promo_codes" USING "btree" ("created_by");



CREATE INDEX "idx_platform_promo_usage_user" ON "public"."platform_promo_code_usage" USING "btree" ("user_id");



CREATE INDEX "idx_platform_promos_code" ON "public"."platform_promo_codes" USING "btree" ("code") WHERE ("is_active" = true);



CREATE INDEX "idx_platform_revenue_date" ON "public"."platform_revenue" USING "btree" ("revenue_date" DESC);



CREATE INDEX "idx_platform_revenue_escrow_id" ON "public"."platform_revenue" USING "btree" ("escrow_id");



CREATE INDEX "idx_platform_revenue_module" ON "public"."platform_revenue" USING "btree" ("module_name", "revenue_date" DESC);



CREATE INDEX "idx_platform_revenue_payment_id" ON "public"."platform_revenue" USING "btree" ("payment_id");



CREATE INDEX "idx_platform_settings_updated_by" ON "public"."platform_settings" USING "btree" ("updated_by");



CREATE INDEX "idx_post_comments_deleted_at" ON "public"."post_comments" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_post_comments_parent_comment_id" ON "public"."post_comments" USING "btree" ("parent_comment_id");



CREATE INDEX "idx_post_comments_post" ON "public"."post_comments" USING "btree" ("post_id", "created_at");



CREATE INDEX "idx_post_comments_tenant_id" ON "public"."post_comments" USING "btree" ("tenant_id");



CREATE INDEX "idx_post_comments_tenant_post" ON "public"."post_comments" USING "btree" ("tenant_id", "post_id");



CREATE INDEX "idx_post_comments_user_id" ON "public"."post_comments" USING "btree" ("user_id");



CREATE INDEX "idx_post_likes_post" ON "public"."post_likes" USING "btree" ("post_id");



CREATE INDEX "idx_post_likes_tenant_id" ON "public"."post_likes" USING "btree" ("tenant_id");



CREATE INDEX "idx_post_likes_tenant_post_user" ON "public"."post_likes" USING "btree" ("tenant_id", "post_id", "user_id");



CREATE INDEX "idx_post_likes_user_id" ON "public"."post_likes" USING "btree" ("user_id");



CREATE INDEX "idx_postal_staff_approval_status" ON "public"."postal_staff" USING "btree" ("approval_status");



CREATE INDEX "idx_postal_staff_city" ON "public"."postal_staff" USING "btree" ("city");



CREATE INDEX "idx_postal_staff_is_active" ON "public"."postal_staff" USING "btree" ("is_active") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_postal_staff_staff_type" ON "public"."postal_staff" USING "btree" ("staff_type");



CREATE INDEX "idx_postal_staff_state" ON "public"."postal_staff" USING "btree" ("state");



CREATE INDEX "idx_postal_staff_user_id" ON "public"."postal_staff" USING "btree" ("user_id");



CREATE INDEX "idx_product_reviews_approved" ON "public"."ecommerce_product_reviews" USING "btree" ("is_approved");



CREATE INDEX "idx_product_reviews_product" ON "public"."ecommerce_product_reviews" USING "btree" ("product_id");



CREATE INDEX "idx_product_reviews_rating" ON "public"."ecommerce_product_reviews" USING "btree" ("rating");



CREATE INDEX "idx_product_reviews_user" ON "public"."ecommerce_product_reviews" USING "btree" ("user_id");



CREATE INDEX "idx_product_variants_product" ON "public"."ecommerce_product_variants" USING "btree" ("product_id");



CREATE INDEX "idx_product_variants_sku" ON "public"."ecommerce_product_variants" USING "btree" ("sku");



CREATE INDEX "idx_products_active_stock" ON "public"."ecommerce_products" USING "btree" ("is_active", "stock_quantity") WHERE (("is_active" = true) AND ("deleted_at" IS NULL) AND ("stock_quantity" > 0));



CREATE INDEX "idx_products_category" ON "public"."ecommerce_products" USING "btree" ("category_id") WHERE (("is_active" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_products_category_active" ON "public"."ecommerce_products" USING "btree" ("category_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_products_created_at" ON "public"."ecommerce_products" USING "btree" ("created_at" DESC) WHERE (("is_active" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_products_featured" ON "public"."ecommerce_products" USING "btree" ("is_featured", "is_active") WHERE (("is_featured" = true) AND ("is_active" = true));



CREATE INDEX "idx_products_featured_active" ON "public"."ecommerce_products" USING "btree" ("is_featured", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_products_final_price" ON "public"."ecommerce_products" USING "btree" ("final_price") WHERE (("is_active" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_products_name_trgm" ON "public"."ecommerce_products" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_products_rating" ON "public"."ecommerce_products" USING "btree" ("average_rating" DESC NULLS LAST) WHERE (("is_active" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_products_search_text" ON "public"."ecommerce_products" USING "gin" ("to_tsvector"('"english"'::"regconfig", ((COALESCE("name", ''::"text") || ' '::"text") || COALESCE("description", ''::"text"))));



CREATE INDEX "idx_products_vendor_active" ON "public"."ecommerce_products" USING "btree" ("vendor_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_promo_codes_active" ON "public"."marketplace_promo_codes" USING "btree" ("is_active");



CREATE INDEX "idx_promo_codes_code" ON "public"."marketplace_promo_codes" USING "btree" ("code");



CREATE INDEX "idx_promo_codes_validity" ON "public"."marketplace_promo_codes" USING "btree" ("valid_from", "valid_until");



CREATE INDEX "idx_promo_usage_code" ON "public"."marketplace_promo_code_usage" USING "btree" ("promo_code_id");



CREATE INDEX "idx_promo_usage_order" ON "public"."marketplace_promo_code_usage" USING "btree" ("order_id");



CREATE INDEX "idx_promo_usage_user" ON "public"."marketplace_promo_code_usage" USING "btree" ("user_id");



CREATE INDEX "idx_ride_rejections_composite" ON "public"."ride_rejections" USING "btree" ("driver_id", "ride_id");



CREATE INDEX "idx_ride_rejections_driver" ON "public"."ride_rejections" USING "btree" ("driver_id");



CREATE INDEX "idx_ride_rejections_ride" ON "public"."ride_rejections" USING "btree" ("ride_id");



CREATE INDEX "idx_ride_tracking_ride" ON "public"."ride_tracking" USING "btree" ("ride_id");



CREATE INDEX "idx_rides_cancelled_by" ON "public"."rides" USING "btree" ("cancelled_by");



CREATE INDEX "idx_rides_created" ON "public"."rides" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_rides_created_at" ON "public"."rides" USING "btree" ("created_at");



CREATE INDEX "idx_rides_driver_id" ON "public"."rides" USING "btree" ("driver_id");



CREATE INDEX "idx_rides_driver_status" ON "public"."rides" USING "btree" ("driver_id", "status");



CREATE INDEX "idx_rides_number" ON "public"."rides" USING "btree" ("ride_number");



CREATE INDEX "idx_rides_passenger_id" ON "public"."rides" USING "btree" ("passenger_id");



CREATE INDEX "idx_rides_passenger_status" ON "public"."rides" USING "btree" ("passenger_id", "status");



CREATE INDEX "idx_rides_status" ON "public"."rides" USING "btree" ("status");



CREATE INDEX "idx_role_applications_reviewed_by" ON "public"."role_applications" USING "btree" ("reviewed_by");



CREATE INDEX "idx_role_applications_role_name" ON "public"."role_applications" USING "btree" ("role_name");



CREATE INDEX "idx_role_applications_status" ON "public"."role_applications" USING "btree" ("status");



CREATE INDEX "idx_role_applications_user_id" ON "public"."role_applications" USING "btree" ("user_id");



CREATE INDEX "idx_room_availability_date" ON "public"."room_availability" USING "btree" ("date");



CREATE INDEX "idx_room_availability_dates" ON "public"."room_availability" USING "btree" ("room_type_id", "date", "is_blocked");



CREATE INDEX "idx_room_availability_room_type_date" ON "public"."room_availability" USING "btree" ("room_type_id", "date");



CREATE INDEX "idx_room_types_hotel" ON "public"."room_types" USING "btree" ("hotel_id", "is_active");



CREATE INDEX "idx_room_types_hotel_id" ON "public"."room_types" USING "btree" ("hotel_id");



CREATE INDEX "idx_room_types_is_active" ON "public"."room_types" USING "btree" ("is_active");



CREATE INDEX "idx_rooms_room_type_id" ON "public"."rooms" USING "btree" ("room_type_id");



CREATE INDEX "idx_rooms_status" ON "public"."rooms" USING "btree" ("status");



CREATE INDEX "idx_scheduled_notifications_notification_log_id" ON "public"."scheduled_notifications" USING "btree" ("notification_log_id");



CREATE INDEX "idx_scheduled_notifications_scheduled_at" ON "public"."scheduled_notifications" USING "btree" ("scheduled_at");



CREATE INDEX "idx_scheduled_notifications_status" ON "public"."scheduled_notifications" USING "btree" ("status");



CREATE INDEX "idx_scheduled_notifications_user_id" ON "public"."scheduled_notifications" USING "btree" ("user_id");



CREATE INDEX "idx_shipping_addresses_user_id" ON "public"."shipping_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_social_posts_content_trgm" ON "public"."social_posts" USING "gin" ("content" "public"."gin_trgm_ops");



CREATE INDEX "idx_social_posts_deleted_at" ON "public"."social_posts" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_social_posts_shared_post_id" ON "public"."social_posts" USING "btree" ("shared_post_id");



CREATE INDEX "idx_social_posts_tenant_id" ON "public"."social_posts" USING "btree" ("tenant_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_social_posts_tenant_user" ON "public"."social_posts" USING "btree" ("tenant_id", "user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_social_posts_user_created" ON "public"."social_posts" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_social_posts_visibility_active" ON "public"."social_posts" USING "btree" ("visibility", "is_active", "created_at" DESC);



CREATE INDEX "idx_stories_user" ON "public"."stories" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_story_views_user_id" ON "public"."story_views" USING "btree" ("user_id");



CREATE INDEX "idx_support_articles_author_id" ON "public"."support_articles" USING "btree" ("author_id");



CREATE INDEX "idx_support_articles_content_trgm" ON "public"."support_articles" USING "gin" ("content" "public"."gin_trgm_ops");



CREATE INDEX "idx_support_shifts_staff_id" ON "public"."support_shifts" USING "btree" ("staff_id");



CREATE INDEX "idx_support_staff_online_active" ON "public"."support_staff" USING "btree" ("is_online", "is_active");



CREATE INDEX "idx_support_tickets_assigned" ON "public"."support_tickets" USING "btree" ("assigned_to", "status") WHERE ("assigned_to" IS NOT NULL);



CREATE INDEX "idx_support_tickets_assigned_status" ON "public"."support_tickets" USING "btree" ("assigned_to", "status");



CREATE INDEX "idx_support_tickets_created" ON "public"."support_tickets" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_support_tickets_escalated_to" ON "public"."support_tickets" USING "btree" ("escalated_to");



CREATE INDEX "idx_support_tickets_number" ON "public"."support_tickets" USING "btree" ("ticket_number");



CREATE INDEX "idx_support_tickets_status_priority" ON "public"."support_tickets" USING "btree" ("status", "priority", "created_at");



CREATE INDEX "idx_support_tickets_subject_trgm" ON "public"."support_tickets" USING "gin" ("subject" "public"."gin_trgm_ops");



CREATE INDEX "idx_support_tickets_user_status" ON "public"."support_tickets" USING "btree" ("user_id", "status");



CREATE INDEX "idx_surge_zones_area" ON "public"."surge_pricing_zones" USING "gist" ("area");



CREATE INDEX "idx_taxi_drivers_approval_status" ON "public"."taxi_drivers" USING "btree" ("approval_status");



CREATE INDEX "idx_taxi_drivers_city" ON "public"."taxi_drivers" USING "btree" ("city");



CREATE INDEX "idx_taxi_drivers_is_active" ON "public"."taxi_drivers" USING "btree" ("is_active") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_taxi_drivers_license" ON "public"."taxi_drivers" USING "btree" ("license_number");



CREATE INDEX "idx_ticket_messages_sender_id" ON "public"."ticket_messages" USING "btree" ("sender_id");



CREATE INDEX "idx_ticket_messages_ticket_id" ON "public"."ticket_messages" USING "btree" ("ticket_id");



CREATE INDEX "idx_tour_promo_code_usage_promo_code_id" ON "public"."tour_promo_code_usage" USING "btree" ("promo_code_id");



CREATE INDEX "idx_tour_promo_code_usage_user_id" ON "public"."tour_promo_code_usage" USING "btree" ("user_id");



CREATE INDEX "idx_tour_promo_codes_created_by" ON "public"."tour_promo_codes" USING "btree" ("created_by");



CREATE INDEX "idx_tour_promos_code" ON "public"."tour_promo_codes" USING "btree" ("code") WHERE ("is_active" = true);



CREATE INDEX "idx_unsubscribe_tokens_token" ON "public"."unsubscribe_tokens" USING "btree" ("token");



CREATE INDEX "idx_unsubscribe_tokens_user_id" ON "public"."unsubscribe_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_user_active_roles_user" ON "public"."user_active_roles" USING "btree" ("user_id");



CREATE INDEX "idx_user_addresses_default" ON "public"."user_addresses" USING "btree" ("user_id", "is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_user_addresses_user_id" ON "public"."user_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_user_connections_connected_user_id" ON "public"."user_connections" USING "btree" ("connected_user_id");



CREATE INDEX "idx_user_connections_user_status" ON "public"."user_connections" USING "btree" ("user_id", "status");



CREATE INDEX "idx_user_profiles_active" ON "public"."user_profiles" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_user_profiles_avatar_url" ON "public"."user_profiles" USING "btree" ("avatar_url");



CREATE INDEX "idx_user_profiles_deleted_at" ON "public"."user_profiles" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_user_profiles_email" ON "public"."user_profiles" USING "btree" ("email");



CREATE INDEX "idx_user_profiles_phone" ON "public"."user_profiles" USING "btree" ("phone") WHERE ("phone" IS NOT NULL);



CREATE INDEX "idx_user_profiles_state" ON "public"."user_profiles" USING "btree" ("state");



CREATE INDEX "idx_user_roles_active" ON "public"."user_roles" USING "btree" ("user_id", "role_name", "is_active");



CREATE INDEX "idx_user_roles_role_name" ON "public"."user_roles" USING "btree" ("role_name");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_user_roles_user_role" ON "public"."user_roles" USING "btree" ("user_id", "role_name");



CREATE INDEX "idx_vendor_payouts_processed_by" ON "public"."vendor_payouts" USING "btree" ("processed_by");



CREATE INDEX "idx_vendors_active" ON "public"."ecommerce_vendors" USING "btree" ("is_active") WHERE (("is_active" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_wallet_transactions_reference" ON "public"."wallet_transactions" USING "btree" ("reference");



CREATE INDEX "idx_wallet_transactions_status" ON "public"."wallet_transactions" USING "btree" ("status");



CREATE INDEX "idx_wallet_transactions_user_id" ON "public"."wallet_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_wallet_transactions_wallet" ON "public"."wallet_transactions" USING "btree" ("wallet_id", "created_at" DESC);



CREATE INDEX "idx_wishlists_product" ON "public"."ecommerce_wishlists" USING "btree" ("product_id");



CREATE INDEX "idx_wishlists_user" ON "public"."ecommerce_wishlists" USING "btree" ("user_id");



CREATE UNIQUE INDEX "postal_staff_user_id_unique" ON "public"."postal_staff" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE UNIQUE INDEX "ux_ecommerce_product_variants_product_sku" ON "public"."ecommerce_product_variants" USING "btree" ("product_id", "sku");



CREATE OR REPLACE TRIGGER "audit_payments_service_role" AFTER INSERT OR DELETE OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."log_service_role_action"();



CREATE OR REPLACE TRIGGER "audit_user_profiles_service_role" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."log_service_role_action"();



CREATE OR REPLACE TRIGGER "edge_function_inventory_updated_at" BEFORE UPDATE ON "public"."edge_function_inventory" FOR EACH ROW EXECUTE FUNCTION "public"."update_edge_function_inventory_updated_at"();



CREATE OR REPLACE TRIGGER "nipost_permissions_updated_at" BEFORE UPDATE ON "public"."nipost_user_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_nipost_permissions_updated_at"();



CREATE OR REPLACE TRIGGER "on_new_role_granted" AFTER INSERT ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_role"();



CREATE OR REPLACE TRIGGER "set_assignment_number_trigger" BEFORE INSERT ON "public"."delivery_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."set_assignment_number"();



CREATE OR REPLACE TRIGGER "set_courier_code_trigger" BEFORE INSERT ON "public"."courier_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_courier_code"();



CREATE OR REPLACE TRIGGER "trigger_courier_approval" BEFORE UPDATE OF "approval_status" ON "public"."courier_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_courier_approval"();



CREATE OR REPLACE TRIGGER "trigger_postal_staff_approval" AFTER UPDATE OF "approval_status" ON "public"."postal_staff" FOR EACH ROW EXECUTE FUNCTION "public"."handle_postal_staff_approval"();



CREATE OR REPLACE TRIGGER "update_ad_campaigns_updated_at" BEFORE UPDATE ON "public"."ad_campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_admin_approvals_updated_at" BEFORE UPDATE ON "public"."admin_approvals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_admin_permissions_updated_at" BEFORE UPDATE ON "public"."admin_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_advertiser_profiles_updated_at" BEFORE UPDATE ON "public"."advertiser_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversation_last_message_trigger" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();



CREATE OR REPLACE TRIGGER "update_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_courier_profiles_updated_at" BEFORE UPDATE ON "public"."courier_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customer_profiles_updated_at" BEFORE UPDATE ON "public"."customer_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_delivery_assignments_updated_at" BEFORE UPDATE ON "public"."delivery_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_delivery_exceptions_updated_at" BEFORE UPDATE ON "public"."delivery_exceptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_delivery_routes_updated_at" BEFORE UPDATE ON "public"."delivery_routes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_deposit_requirements_updated_at" BEFORE UPDATE ON "public"."deposit_requirements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_driver_profiles_updated_at" BEFORE UPDATE ON "public"."driver_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ecommerce_cart_items_updated_at" BEFORE UPDATE ON "public"."ecommerce_cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ecommerce_carts_updated_at" BEFORE UPDATE ON "public"."ecommerce_carts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ecommerce_categories_updated_at" BEFORE UPDATE ON "public"."ecommerce_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ecommerce_orders_updated_at" BEFORE UPDATE ON "public"."ecommerce_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ecommerce_product_reviews_updated_at" BEFORE UPDATE ON "public"."ecommerce_product_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ecommerce_product_variants_updated_at" BEFORE UPDATE ON "public"."ecommerce_product_variants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ecommerce_products_updated_at" BEFORE UPDATE ON "public"."ecommerce_products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ecommerce_vendors_updated_at" BEFORE UPDATE ON "public"."ecommerce_vendors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_promo_codes_updated_at" BEFORE UPDATE ON "public"."event_promo_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_file_metadata_updated_at" BEFORE UPDATE ON "public"."file_metadata" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_host_profiles_updated_at" BEFORE UPDATE ON "public"."host_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_hotel_bookings_updated_at" BEFORE UPDATE ON "public"."hotel_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_hotel_promo_codes_updated_at" BEFORE UPDATE ON "public"."hotel_promo_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_hotel_rating_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."hotel_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_hotel_rating"();



CREATE OR REPLACE TRIGGER "update_hotel_reviews_updated_at" BEFORE UPDATE ON "public"."hotel_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_hotels_updated_at" BEFORE UPDATE ON "public"."hotels" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_marketplace_promo_codes_updated_at" BEFORE UPDATE ON "public"."marketplace_promo_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_message_status_updated_at" BEFORE UPDATE ON "public"."message_status" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_module_commission_rates_updated_at" BEFORE UPDATE ON "public"."module_commission_rates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_nipost_offices_updated_at" BEFORE UPDATE ON "public"."nipost_offices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_nipost_officials_updated_at" BEFORE UPDATE ON "public"."nipost_officials" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_nipost_regions_updated_at" BEFORE UPDATE ON "public"."nipost_regions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_nipost_user_permissions_updated_at" BEFORE UPDATE ON "public"."nipost_user_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notification_preferences_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notification_templates_updated_at" BEFORE UPDATE ON "public"."notification_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_provider_config_updated_at" BEFORE UPDATE ON "public"."payment_provider_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_platform_promo_codes_updated_at" BEFORE UPDATE ON "public"."platform_promo_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_post_comments_updated_at" BEFORE UPDATE ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_post_counts_trigger" AFTER INSERT OR DELETE ON "public"."post_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_post_counts"();



CREATE OR REPLACE TRIGGER "update_product_rating_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."ecommerce_product_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_product_rating"();



CREATE OR REPLACE TRIGGER "update_refund_policies_updated_at" BEFORE UPDATE ON "public"."refund_policies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rides_updated_at" BEFORE UPDATE ON "public"."rides" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_role_applications_updated_at" BEFORE UPDATE ON "public"."role_applications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_room_availability_updated_at" BEFORE UPDATE ON "public"."room_availability" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_room_types_updated_at" BEFORE UPDATE ON "public"."room_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rooms_updated_at" BEFORE UPDATE ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shipping_addresses_updated_at" BEFORE UPDATE ON "public"."shipping_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_social_posts_updated_at" BEFORE UPDATE ON "public"."social_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_support_articles_updated_at" BEFORE UPDATE ON "public"."support_articles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_support_staff_updated_at" BEFORE UPDATE ON "public"."support_staff" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_support_tickets_updated_at" BEFORE UPDATE ON "public"."support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tour_promo_codes_updated_at" BEFORE UPDATE ON "public"."tour_promo_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_active_roles_updated_at" BEFORE UPDATE ON "public"."user_active_roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_addresses_updated_at" BEFORE UPDATE ON "public"."user_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_connections_updated_at" BEFORE UPDATE ON "public"."user_connections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_wallets_updated_at" BEFORE UPDATE ON "public"."user_wallets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_vendor_profiles_updated_at" BEFORE UPDATE ON "public"."vendor_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."ad_campaigns"
    ADD CONSTRAINT "ad_campaigns_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertiser_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ad_campaigns"
    ADD CONSTRAINT "ad_campaigns_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ad_campaigns"
    ADD CONSTRAINT "ad_campaigns_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ad_campaigns"
    ADD CONSTRAINT "ad_campaigns_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."admin_actions"
    ADD CONSTRAINT "admin_actions_official_id_fkey" FOREIGN KEY ("official_id") REFERENCES "public"."nipost_officials"("id");



ALTER TABLE ONLY "public"."admin_actions"
    ADD CONSTRAINT "admin_actions_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."nipost_regions"("id");



ALTER TABLE ONLY "public"."admin_approvals"
    ADD CONSTRAINT "admin_approvals_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."nipost_officials"("id");



ALTER TABLE ONLY "public"."admin_approvals"
    ADD CONSTRAINT "admin_approvals_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "public"."nipost_officials"("id");



ALTER TABLE ONLY "public"."admin_approvals"
    ADD CONSTRAINT "admin_approvals_escalated_to_fkey" FOREIGN KEY ("escalated_to") REFERENCES "public"."nipost_officials"("id");



ALTER TABLE ONLY "public"."admin_approvals"
    ADD CONSTRAINT "admin_approvals_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."nipost_regions"("id");



ALTER TABLE ONLY "public"."admin_approvals"
    ADD CONSTRAINT "admin_approvals_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."advertiser_profiles"
    ADD CONSTRAINT "advertiser_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_trail"
    ADD CONSTRAINT "audit_trail_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."call_participants"
    ADD CONSTRAINT "call_participants_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_participants"
    ADD CONSTRAINT "call_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calls"
    ADD CONSTRAINT "calls_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id");



ALTER TABLE ONLY "public"."calls"
    ADD CONSTRAINT "calls_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_last_message_sender_fkey" FOREIGN KEY ("last_message_sender") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."courier_profiles"
    ADD CONSTRAINT "courier_profiles_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."courier_profiles"
    ADD CONSTRAINT "courier_profiles_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."courier_profiles"
    ADD CONSTRAINT "courier_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_profiles"
    ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_assignments"
    ADD CONSTRAINT "delivery_assignments_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "public"."courier_profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."delivery_assignments"
    ADD CONSTRAINT "delivery_assignments_delivery_address_id_fkey" FOREIGN KEY ("delivery_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."delivery_assignments"
    ADD CONSTRAINT "delivery_assignments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."ecommerce_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_assignments"
    ADD CONSTRAINT "delivery_assignments_pickup_address_id_fkey" FOREIGN KEY ("pickup_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."delivery_exceptions"
    ADD CONSTRAINT "delivery_exceptions_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "public"."courier_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_exceptions"
    ADD CONSTRAINT "delivery_exceptions_delivery_assignment_id_fkey" FOREIGN KEY ("delivery_assignment_id") REFERENCES "public"."delivery_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_packages"
    ADD CONSTRAINT "delivery_packages_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."delivery_packages"
    ADD CONSTRAINT "delivery_packages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."delivery_packages"
    ADD CONSTRAINT "delivery_packages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."delivery_routes"
    ADD CONSTRAINT "delivery_routes_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "public"."courier_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_status_history"
    ADD CONSTRAINT "delivery_status_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."delivery_status_history"
    ADD CONSTRAINT "delivery_status_history_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."delivery_packages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_tracking"
    ADD CONSTRAINT "delivery_tracking_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "public"."courier_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_tracking"
    ADD CONSTRAINT "delivery_tracking_delivery_assignment_id_fkey" FOREIGN KEY ("delivery_assignment_id") REFERENCES "public"."delivery_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_earnings"
    ADD CONSTRAINT "driver_earnings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."driver_earnings"
    ADD CONSTRAINT "driver_earnings_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id");



ALTER TABLE ONLY "public"."driver_profiles"
    ADD CONSTRAINT "driver_profiles_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."driver_profiles"
    ADD CONSTRAINT "driver_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_profiles"
    ADD CONSTRAINT "driver_profiles_user_id_user_profiles_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."ecommerce_cart_items"
    ADD CONSTRAINT "ecommerce_cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."ecommerce_carts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecommerce_cart_items"
    ADD CONSTRAINT "ecommerce_cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecommerce_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecommerce_cart_items"
    ADD CONSTRAINT "ecommerce_cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."ecommerce_product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecommerce_carts"
    ADD CONSTRAINT "ecommerce_carts_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."marketplace_promo_codes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ecommerce_carts"
    ADD CONSTRAINT "ecommerce_carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecommerce_categories"
    ADD CONSTRAINT "ecommerce_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."ecommerce_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ecommerce_order_items"
    ADD CONSTRAINT "ecommerce_order_items_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ecommerce_order_items"
    ADD CONSTRAINT "ecommerce_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."ecommerce_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecommerce_order_items"
    ADD CONSTRAINT "ecommerce_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecommerce_products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ecommerce_order_items"
    ADD CONSTRAINT "ecommerce_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."ecommerce_product_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ecommerce_order_items"
    ADD CONSTRAINT "ecommerce_order_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."ecommerce_vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ecommerce_order_status_history"
    ADD CONSTRAINT "ecommerce_order_status_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ecommerce_order_status_history"
    ADD CONSTRAINT "ecommerce_order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."ecommerce_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecommerce_orders"
    ADD CONSTRAINT "ecommerce_orders_billing_address_id_fkey" FOREIGN KEY ("billing_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ecommerce_orders"
    ADD CONSTRAINT "ecommerce_orders_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ecommerce_orders"
    ADD CONSTRAINT "ecommerce_orders_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."marketplace_promo_codes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ecommerce_orders"
    ADD CONSTRAINT "ecommerce_orders_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ecommerce_orders"
    ADD CONSTRAINT "ecommerce_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ecommerce_product_reviews"
    ADD CONSTRAINT "ecommerce_product_reviews_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ecommerce_product_reviews"
    ADD CONSTRAINT "ecommerce_product_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."ecommerce_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ecommerce_product_reviews"
    ADD CONSTRAINT "ecommerce_product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecommerce_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecommerce_product_reviews"
    ADD CONSTRAINT "ecommerce_product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecommerce_product_variants"
    ADD CONSTRAINT "ecommerce_product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecommerce_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecommerce_products"
    ADD CONSTRAINT "ecommerce_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."ecommerce_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ecommerce_products"
    ADD CONSTRAINT "ecommerce_products_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ecommerce_products"
    ADD CONSTRAINT "ecommerce_products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."ecommerce_vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketplace_promo_code_usage"
    ADD CONSTRAINT "ecommerce_promo_code_usage_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."ecommerce_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketplace_promo_code_usage"
    ADD CONSTRAINT "ecommerce_promo_code_usage_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."marketplace_promo_codes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketplace_promo_code_usage"
    ADD CONSTRAINT "ecommerce_promo_code_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketplace_promo_codes"
    ADD CONSTRAINT "ecommerce_promo_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ecommerce_vendors"
    ADD CONSTRAINT "ecommerce_vendors_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ecommerce_vendors"
    ADD CONSTRAINT "ecommerce_vendors_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecommerce_vendors"
    ADD CONSTRAINT "ecommerce_vendors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ecommerce_wishlists"
    ADD CONSTRAINT "ecommerce_wishlists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."ecommerce_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecommerce_wishlists"
    ADD CONSTRAINT "ecommerce_wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."escrow_transactions"
    ADD CONSTRAINT "escrow_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id");



ALTER TABLE ONLY "public"."escrow_transactions"
    ADD CONSTRAINT "escrow_transactions_released_by_fkey" FOREIGN KEY ("released_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."escrow_transactions"
    ADD CONSTRAINT "escrow_transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."event_promo_code_usage"
    ADD CONSTRAINT "event_promo_code_usage_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."event_promo_codes"("id");



ALTER TABLE ONLY "public"."event_promo_code_usage"
    ADD CONSTRAINT "event_promo_code_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."event_promo_codes"
    ADD CONSTRAINT "event_promo_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."failed_payment_attempts"
    ADD CONSTRAINT "failed_payment_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."favorite_hotels"
    ADD CONSTRAINT "favorite_hotels_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorite_hotels"
    ADD CONSTRAINT "favorite_hotels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."file_metadata"
    ADD CONSTRAINT "file_metadata_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."file_metadata"
    ADD CONSTRAINT "file_metadata_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."file_metadata"
    ADD CONSTRAINT "file_metadata_uploaded_by_user_profiles_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."host_profiles"
    ADD CONSTRAINT "host_profiles_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."host_profiles"
    ADD CONSTRAINT "host_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_amenity_mappings"
    ADD CONSTRAINT "hotel_amenity_mappings_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "public"."hotel_amenities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_amenity_mappings"
    ADD CONSTRAINT "hotel_amenity_mappings_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_booking_status_history"
    ADD CONSTRAINT "hotel_booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."hotel_bookings"("id");



ALTER TABLE ONLY "public"."hotel_booking_status_history"
    ADD CONSTRAINT "hotel_booking_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."hotel_bookings"
    ADD CONSTRAINT "hotel_bookings_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."hotel_bookings"
    ADD CONSTRAINT "hotel_bookings_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."hotel_bookings"
    ADD CONSTRAINT "hotel_bookings_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id");



ALTER TABLE ONLY "public"."hotel_bookings"
    ADD CONSTRAINT "hotel_bookings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id");



ALTER TABLE ONLY "public"."hotel_bookings"
    ADD CONSTRAINT "hotel_bookings_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id");



ALTER TABLE ONLY "public"."hotel_bookings"
    ADD CONSTRAINT "hotel_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."hotel_photos"
    ADD CONSTRAINT "hotel_photos_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_photos"
    ADD CONSTRAINT "hotel_photos_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_photos"
    ADD CONSTRAINT "hotel_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."hotel_promo_code_usage"
    ADD CONSTRAINT "hotel_promo_code_usage_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."hotel_bookings"("id");



ALTER TABLE ONLY "public"."hotel_promo_code_usage"
    ADD CONSTRAINT "hotel_promo_code_usage_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."hotel_promo_codes"("id");



ALTER TABLE ONLY "public"."hotel_promo_code_usage"
    ADD CONSTRAINT "hotel_promo_code_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."hotel_promo_codes"
    ADD CONSTRAINT "hotel_promo_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."hotel_reviews"
    ADD CONSTRAINT "hotel_reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."hotel_bookings"("id");



ALTER TABLE ONLY "public"."hotel_reviews"
    ADD CONSTRAINT "hotel_reviews_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id");



ALTER TABLE ONLY "public"."hotel_reviews"
    ADD CONSTRAINT "hotel_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "public"."host_profiles"("user_id");



ALTER TABLE ONLY "public"."in_app_notifications"
    ADD CONSTRAINT "in_app_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_content"
    ADD CONSTRAINT "media_content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."message_status"
    ADD CONSTRAINT "message_status_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_status"
    ADD CONSTRAINT "message_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_forward_from_fkey" FOREIGN KEY ("forward_from") REFERENCES "public"."messages"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."messages"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_commission_rates"
    ADD CONSTRAINT "module_commission_rates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."module_commission_rates"
    ADD CONSTRAINT "module_commission_rates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nipost_admin_audit"
    ADD CONSTRAINT "nipost_admin_audit_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nipost_financial_audit"
    ADD CONSTRAINT "nipost_financial_audit_ledger_id_fkey" FOREIGN KEY ("ledger_id") REFERENCES "public"."nipost_financial_ledger"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nipost_financial_audit"
    ADD CONSTRAINT "nipost_financial_audit_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nipost_financial_ledger"
    ADD CONSTRAINT "nipost_financial_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nipost_offices"
    ADD CONSTRAINT "nipost_offices_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nipost_offices"
    ADD CONSTRAINT "nipost_offices_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."nipost_regions"("id");



ALTER TABLE ONLY "public"."nipost_officials"
    ADD CONSTRAINT "nipost_officials_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nipost_officials"
    ADD CONSTRAINT "nipost_officials_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nipost_officials"
    ADD CONSTRAINT "nipost_officials_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "public"."nipost_offices"("id");



ALTER TABLE ONLY "public"."nipost_officials"
    ADD CONSTRAINT "nipost_officials_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."nipost_regions"("id");



ALTER TABLE ONLY "public"."nipost_officials"
    ADD CONSTRAINT "nipost_officials_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nipost_officials"
    ADD CONSTRAINT "nipost_officials_reporting_to_fkey" FOREIGN KEY ("reporting_to") REFERENCES "public"."nipost_officials"("id");



ALTER TABLE ONLY "public"."nipost_officials"
    ADD CONSTRAINT "nipost_officials_suspended_by_fkey" FOREIGN KEY ("suspended_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nipost_officials"
    ADD CONSTRAINT "nipost_officials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nipost_regions"
    ADD CONSTRAINT "nipost_regions_parent_region_id_fkey" FOREIGN KEY ("parent_region_id") REFERENCES "public"."nipost_regions"("id");



ALTER TABLE ONLY "public"."nipost_user_permissions"
    ADD CONSTRAINT "nipost_user_permissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nipost_user_permissions"
    ADD CONSTRAINT "nipost_user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_campaigns"
    ADD CONSTRAINT "notification_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notification_campaigns"
    ADD CONSTRAINT "notification_campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id");



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_queue"
    ADD CONSTRAINT "notification_queue_notification_log_id_fkey" FOREIGN KEY ("notification_log_id") REFERENCES "public"."notification_logs"("id");



ALTER TABLE ONLY "public"."notification_queue"
    ADD CONSTRAINT "notification_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."official_permissions"
    ADD CONSTRAINT "official_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."official_permissions"
    ADD CONSTRAINT "official_permissions_official_id_fkey" FOREIGN KEY ("official_id") REFERENCES "public"."nipost_officials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."official_permissions"
    ADD CONSTRAINT "official_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."admin_permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."platform_promo_code_usage"
    ADD CONSTRAINT "platform_promo_code_usage_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."platform_promo_codes"("id");



ALTER TABLE ONLY "public"."platform_promo_code_usage"
    ADD CONSTRAINT "platform_promo_code_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."platform_promo_codes"
    ADD CONSTRAINT "platform_promo_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."platform_revenue"
    ADD CONSTRAINT "platform_revenue_escrow_id_fkey" FOREIGN KEY ("escrow_id") REFERENCES "public"."escrow_transactions"("id");



ALTER TABLE ONLY "public"."platform_revenue"
    ADD CONSTRAINT "platform_revenue_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."post_comments"("id");



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."postal_staff"
    ADD CONSTRAINT "postal_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ride_rejections"
    ADD CONSTRAINT "ride_rejections_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ride_rejections"
    ADD CONSTRAINT "ride_rejections_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ride_tracking"
    ADD CONSTRAINT "ride_tracking_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id");



ALTER TABLE ONLY "public"."rides"
    ADD CONSTRAINT "rides_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."rides"
    ADD CONSTRAINT "rides_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."driver_profiles"("user_id");



ALTER TABLE ONLY "public"."rides"
    ADD CONSTRAINT "rides_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."role_applications"
    ADD CONSTRAINT "role_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."role_applications"
    ADD CONSTRAINT "role_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_availability"
    ADD CONSTRAINT "room_availability_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_types"
    ADD CONSTRAINT "room_types_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_notifications"
    ADD CONSTRAINT "scheduled_notifications_notification_log_id_fkey" FOREIGN KEY ("notification_log_id") REFERENCES "public"."notification_logs"("id");



ALTER TABLE ONLY "public"."scheduled_notifications"
    ADD CONSTRAINT "scheduled_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shipping_addresses"
    ADD CONSTRAINT "shipping_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_shared_post_id_fkey" FOREIGN KEY ("shared_post_id") REFERENCES "public"."social_posts"("id");



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."story_views"
    ADD CONSTRAINT "story_views_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."story_views"
    ADD CONSTRAINT "story_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_articles"
    ADD CONSTRAINT "support_articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_shifts"
    ADD CONSTRAINT "support_shifts_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."support_staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_staff"
    ADD CONSTRAINT "support_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."support_staff"("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_escalated_to_fkey" FOREIGN KEY ("escalated_to") REFERENCES "public"."support_staff"("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."taxi_drivers"
    ADD CONSTRAINT "taxi_drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tour_promo_code_usage"
    ADD CONSTRAINT "tour_promo_code_usage_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."tour_promo_codes"("id");



ALTER TABLE ONLY "public"."tour_promo_code_usage"
    ADD CONSTRAINT "tour_promo_code_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tour_promo_codes"
    ADD CONSTRAINT "tour_promo_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."unsubscribe_tokens"
    ADD CONSTRAINT "unsubscribe_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_active_roles"
    ADD CONSTRAINT "user_active_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_connections"
    ADD CONSTRAINT "user_connections_connected_user_id_fkey" FOREIGN KEY ("connected_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_connections"
    ADD CONSTRAINT "user_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_wallets"
    ADD CONSTRAINT "user_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."vendor_payouts"
    ADD CONSTRAINT "vendor_payouts_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."vendor_payouts"
    ADD CONSTRAINT "vendor_payouts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."vendor_profiles"
    ADD CONSTRAINT "vendor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."user_wallets"("id");



CREATE POLICY "Admin can insert drivers" ON "public"."taxi_drivers" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Admin can insert media" ON "public"."media_content" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Admin can update drivers" ON "public"."taxi_drivers" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Admin can update media" ON "public"."media_content" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Admin can view all drivers" ON "public"."taxi_drivers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Admin can view all media" ON "public"."media_content" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Admins can manage all campaigns" ON "public"."ad_campaigns" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage all delivery assignments" ON "public"."delivery_assignments" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role_name" = ANY (ARRAY['ADMIN'::"text", 'DISPATCHER'::"text"]))))));



CREATE POLICY "Admins can manage all delivery exceptions" ON "public"."delivery_exceptions" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role_name" = ANY (ARRAY['ADMIN'::"text", 'DISPATCHER'::"text"]))))));



CREATE POLICY "Admins can manage all delivery routes" ON "public"."delivery_routes" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role_name" = ANY (ARRAY['ADMIN'::"text", 'DISPATCHER'::"text"]))))));



CREATE POLICY "Admins can manage all products" ON "public"."ecommerce_products" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage amenities" ON "public"."hotel_amenities" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage campaigns" ON "public"."notification_campaigns" USING (((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text") OR ("auth"."uid"() = "created_by")));



CREATE POLICY "Admins can manage categories" ON "public"."ecommerce_categories" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage commission rates" ON "public"."module_commission_rates" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage deposit requirements" ON "public"."deposit_requirements" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage event promo codes" ON "public"."event_promo_codes" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage payment providers" ON "public"."payment_provider_config" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage payouts" ON "public"."vendor_payouts" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage platform promo codes" ON "public"."platform_promo_codes" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage platform settings" ON "public"."platform_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage promo codes" ON "public"."hotel_promo_codes" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage promo codes" ON "public"."marketplace_promo_codes" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage refund policies" ON "public"."refund_policies" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage shifts" ON "public"."support_shifts" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage support staff" ON "public"."support_staff" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage surge zones" ON "public"."surge_pricing_zones" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage tour promo codes" ON "public"."tour_promo_codes" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage vehicle types" ON "public"."vehicle_types" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can update applications" ON "public"."role_applications" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can view all applications" ON "public"."role_applications" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can view all audit logs" ON "public"."audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can view all earnings" ON "public"."driver_earnings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can view all escrow transactions" ON "public"."escrow_transactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can view all failed attempts" ON "public"."failed_payment_attempts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can view all orders" ON "public"."ecommerce_orders" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can view all payments" ON "public"."payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can view all tracking data" ON "public"."delivery_tracking" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role_name" = ANY (ARRAY['ADMIN'::"text", 'DISPATCHER'::"text"]))))));



CREATE POLICY "Admins can view notification analytics" ON "public"."notification_analytics" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can view platform revenue" ON "public"."platform_revenue" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Advertisers can manage their own campaigns" ON "public"."ad_campaigns" USING (("advertiser_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Advertisers can manage their own profile" ON "public"."advertiser_profiles" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Anyone can view active amenities" ON "public"."hotel_amenities" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active campaigns" ON "public"."ad_campaigns" FOR SELECT USING (("status" = 'active'::"text"));



CREATE POLICY "Anyone can view active categories" ON "public"."ecommerce_categories" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active event promo codes" ON "public"."event_promo_codes" FOR SELECT USING ((("is_active" = true) AND ("valid_from" <= "now"()) AND (("valid_until" IS NULL) OR ("valid_until" >= "now"()))));



CREATE POLICY "Anyone can view active hotels" ON "public"."hotels" FOR SELECT USING ((("is_active" = true) AND ("is_verified" = true)));



CREATE POLICY "Anyone can view active offices" ON "public"."nipost_offices" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active platform promo codes" ON "public"."platform_promo_codes" FOR SELECT USING ((("is_active" = true) AND ("valid_from" <= "now"()) AND (("valid_until" IS NULL) OR ("valid_until" >= "now"()))));



CREATE POLICY "Anyone can view active products" ON "public"."ecommerce_products" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active promo codes" ON "public"."hotel_promo_codes" FOR SELECT USING ((("is_active" = true) AND ("valid_from" <= "now"()) AND (("valid_until" IS NULL) OR ("valid_until" >= "now"()))));



CREATE POLICY "Anyone can view active promo codes" ON "public"."marketplace_promo_codes" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active regions" ON "public"."nipost_regions" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active room types" ON "public"."room_types" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active surge zones" ON "public"."surge_pricing_zones" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active tour promo codes" ON "public"."tour_promo_codes" FOR SELECT USING ((("is_active" = true) AND ("valid_from" <= "now"()) AND (("valid_until" IS NULL) OR ("valid_until" >= "now"()))));



CREATE POLICY "Anyone can view active vehicle types" ON "public"."vehicle_types" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view amenity mappings" ON "public"."hotel_amenity_mappings" FOR SELECT USING (true);



CREATE POLICY "Anyone can view approved reviews" ON "public"."ecommerce_product_reviews" FOR SELECT USING (("is_approved" = true));



CREATE POLICY "Anyone can view approved reviews" ON "public"."hotel_reviews" FOR SELECT USING (("is_approved" = true));



CREATE POLICY "Anyone can view available rooms" ON "public"."rooms" FOR SELECT USING (("status" = 'available'::"text"));



CREATE POLICY "Anyone can view comment likes" ON "public"."comment_likes" FOR SELECT USING (true);



CREATE POLICY "Anyone can view comments on public posts" ON "public"."post_comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."social_posts"
  WHERE (("social_posts"."id" = "post_comments"."post_id") AND (("social_posts"."visibility" = 'public'::"text") OR ("social_posts"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Anyone can view commission rates" ON "public"."module_commission_rates" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view deposit requirements" ON "public"."deposit_requirements" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view hotel photos" ON "public"."hotel_photos" FOR SELECT USING (true);



CREATE POLICY "Anyone can view likes on public posts" ON "public"."post_likes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."social_posts"
  WHERE (("social_posts"."id" = "post_likes"."post_id") AND (("social_posts"."visibility" = 'public'::"text") OR ("social_posts"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Anyone can view online verified drivers" ON "public"."driver_profiles" FOR SELECT USING ((("is_verified" = true) AND ("is_online" = true)));



CREATE POLICY "Anyone can view published articles" ON "public"."support_articles" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Anyone can view refund policies" ON "public"."refund_policies" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view room availability" ON "public"."room_availability" FOR SELECT USING (true);



CREATE POLICY "Anyone can view variants of active products" ON "public"."ecommerce_product_variants" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ecommerce_products"
  WHERE (("ecommerce_products"."id" = "ecommerce_product_variants"."product_id") AND ("ecommerce_products"."is_active" = true)))));



CREATE POLICY "Anyone can view verified advertisers" ON "public"."advertiser_profiles" FOR SELECT USING (("is_verified" = true));



CREATE POLICY "Anyone can view verified hosts" ON "public"."host_profiles" FOR SELECT USING (("is_verified" = true));



CREATE POLICY "Anyone can view verified vendors" ON "public"."vendor_profiles" FOR SELECT USING (("is_verified" = true));



CREATE POLICY "Authenticated users can insert delivery status history" ON "public"."delivery_status_history" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can view delivery status history" ON "public"."delivery_status_history" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view function dependencies" ON "public"."function_dependencies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view migration status" ON "public"."platform_migration_status" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view non-sensitive settings" ON "public"."platform_settings" FOR SELECT TO "authenticated" USING ((("category" <> ALL (ARRAY['payment'::"text", 'security'::"text", 'admin'::"text", 'api_keys'::"text"])) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role_name" = 'ADMIN'::"text"))))));



CREATE POLICY "Authenticated users can view service mappings" ON "public"."service_module_mapping" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Couriers can insert their tracking data" ON "public"."delivery_tracking" FOR INSERT WITH CHECK (("courier_id" IN ( SELECT "courier_profiles"."id"
   FROM "public"."courier_profiles"
  WHERE ("courier_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Couriers can manage their exceptions" ON "public"."delivery_exceptions" USING (("courier_id" IN ( SELECT "courier_profiles"."id"
   FROM "public"."courier_profiles"
  WHERE ("courier_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Couriers can update their assignments" ON "public"."delivery_assignments" FOR UPDATE USING (("courier_id" IN ( SELECT "courier_profiles"."id"
   FROM "public"."courier_profiles"
  WHERE ("courier_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Couriers can update their own profile" ON "public"."courier_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Couriers can view their assignments" ON "public"."delivery_assignments" FOR SELECT USING (("courier_id" IN ( SELECT "courier_profiles"."id"
   FROM "public"."courier_profiles"
  WHERE ("courier_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Couriers can view their own profile" ON "public"."courier_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Couriers can view their routes" ON "public"."delivery_routes" FOR SELECT USING (("courier_id" IN ( SELECT "courier_profiles"."id"
   FROM "public"."courier_profiles"
  WHERE ("courier_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Couriers can view their tracking data" ON "public"."delivery_tracking" FOR SELECT USING (("courier_id" IN ( SELECT "courier_profiles"."id"
   FROM "public"."courier_profiles"
  WHERE ("courier_profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Customers can view exceptions for their orders" ON "public"."delivery_exceptions" FOR SELECT USING (("delivery_assignment_id" IN ( SELECT "da"."id"
   FROM ("public"."delivery_assignments" "da"
     JOIN "public"."ecommerce_orders" "eo" ON (("da"."order_id" = "eo"."id")))
  WHERE ("eo"."user_id" = "auth"."uid"()))));



CREATE POLICY "Customers can view their delivery assignments" ON "public"."delivery_assignments" FOR SELECT USING (("order_id" IN ( SELECT "ecommerce_orders"."id"
   FROM "public"."ecommerce_orders"
  WHERE ("ecommerce_orders"."user_id" = "auth"."uid"()))));



CREATE POLICY "Customers can view tracking for their orders" ON "public"."delivery_tracking" FOR SELECT USING (("delivery_assignment_id" IN ( SELECT "da"."id"
   FROM ("public"."delivery_assignments" "da"
     JOIN "public"."ecommerce_orders" "eo" ON (("da"."order_id" = "eo"."id")))
  WHERE ("eo"."user_id" = "auth"."uid"()))));



CREATE POLICY "DOP full access to officials" ON "public"."nipost_officials" USING ("public"."is_dop"("auth"."uid"())) WITH CHECK ("public"."is_dop"("auth"."uid"()));



CREATE POLICY "Drivers can insert own rejections" ON "public"."ride_rejections" FOR INSERT WITH CHECK (("auth"."uid"() = "driver_id"));



CREATE POLICY "Drivers can manage their own profile" ON "public"."driver_profiles" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Drivers can manage their ride tracking" ON "public"."ride_tracking" USING ((EXISTS ( SELECT 1
   FROM "public"."rides"
  WHERE (("rides"."id" = "ride_tracking"."ride_id") AND ("rides"."driver_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Drivers can read own rejections" ON "public"."ride_rejections" FOR SELECT USING (("auth"."uid"() = "driver_id"));



CREATE POLICY "Drivers can update their rides" ON "public"."rides" FOR UPDATE USING (("driver_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Drivers can view their earnings" ON "public"."driver_earnings" FOR SELECT USING (("driver_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Drivers can view their rides" ON "public"."rides" FOR SELECT USING (("driver_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Everyone can view active templates" ON "public"."notification_templates" FOR SELECT USING (("is_active" = true));



CREATE POLICY "High-level officials can manage permissions" ON "public"."admin_permissions" USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_officials"
  WHERE (("nipost_officials"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("nipost_officials"."clearance_level" >= 9)))));



CREATE POLICY "High-level officials can manage permissions" ON "public"."official_permissions" USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_officials"
  WHERE (("nipost_officials"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("nipost_officials"."clearance_level" >= 9)))));



CREATE POLICY "Hosts can manage their hotel amenities" ON "public"."hotel_amenity_mappings" USING ((EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "hotel_amenity_mappings"."hotel_id") AND ("hotels"."host_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Hosts can manage their hotel photos" ON "public"."hotel_photos" USING ((EXISTS ( SELECT 1
   FROM "public"."hotels"
  WHERE (("hotels"."id" = "hotel_photos"."hotel_id") AND ("hotels"."host_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Hosts can manage their own profile" ON "public"."host_profiles" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Hosts can manage their rooms" ON "public"."rooms" USING ((EXISTS ( SELECT 1
   FROM ("public"."room_types"
     JOIN "public"."hotels" ON (("hotels"."id" = "room_types"."hotel_id")))
  WHERE (("room_types"."id" = "rooms"."room_type_id") AND ("hotels"."host_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Officials can insert actions" ON "public"."admin_actions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."nipost_officials"
  WHERE ("nipost_officials"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Officials can manage offices" ON "public"."nipost_offices" USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_officials"
  WHERE (("nipost_officials"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("nipost_officials"."clearance_level" >= 7)))));



CREATE POLICY "Officials can manage regions" ON "public"."nipost_regions" USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_officials"
  WHERE (("nipost_officials"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("nipost_officials"."clearance_level" >= 8)))));



CREATE POLICY "Officials can update assigned approvals" ON "public"."admin_approvals" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_officials"
  WHERE (("nipost_officials"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("nipost_officials"."id" = "admin_approvals"."assigned_to")))));



CREATE POLICY "Officials can view actions in their region" ON "public"."admin_actions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_officials"
  WHERE (("nipost_officials"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("nipost_officials"."region_id" = "admin_actions"."region_id") OR ("nipost_officials"."clearance_level" >= 8))))));



CREATE POLICY "Officials can view assigned approvals" ON "public"."admin_approvals" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_officials"
  WHERE (("nipost_officials"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("nipost_officials"."id" = "admin_approvals"."assigned_to") OR ("nipost_officials"."clearance_level" >= 7))))));



CREATE POLICY "Officials can view their permissions" ON "public"."official_permissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_officials"
  WHERE (("nipost_officials"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("nipost_officials"."id" = "official_permissions"."official_id")))));



CREATE POLICY "Only admins can manage data classification" ON "public"."data_classification" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Only admins can modify service mappings" ON "public"."service_module_mapping" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Only admins can read audit trail" ON "public"."audit_trail" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "Only admins can view permissions" ON "public"."admin_permissions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role_name" = 'ADMIN'::"text")))));



CREATE POLICY "PMG can view officials in their state" ON "public"."nipost_officials" FOR SELECT USING (("public"."is_postmaster_general"("auth"."uid"()) AND (("region_id")::"text" = "public"."get_nipost_state_id"("auth"."uid"()))));



CREATE POLICY "Participants can update calls" ON "public"."calls" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = ANY ("participants")));



CREATE POLICY "Participants can update their participation" ON "public"."conversation_participants" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Participants can view their calls" ON "public"."calls" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = ANY ("participants")));



CREATE POLICY "Participants can view their conversations" ON "public"."conversation_participants" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Participants can view their conversations" ON "public"."conversations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants"
  WHERE (("conversation_participants"."conversation_id" = "conversations"."id") AND ("conversation_participants"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Passengers can create rides" ON "public"."rides" FOR INSERT WITH CHECK (("passenger_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Passengers can update their rides" ON "public"."rides" FOR UPDATE USING (("passenger_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Passengers can view their rides" ON "public"."rides" FOR SELECT USING (("passenger_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Passengers can view tracking for their rides" ON "public"."ride_tracking" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rides"
  WHERE (("rides"."id" = "ride_tracking"."ride_id") AND ("rides"."passenger_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Public can use unsubscribe tokens" ON "public"."unsubscribe_tokens" FOR SELECT USING (true);



CREATE POLICY "Regional managers read-only access to officials" ON "public"."nipost_officials" FOR SELECT USING ("public"."is_regional_manager"("auth"."uid"()));



CREATE POLICY "Service role bypass" ON "public"."ad_campaigns" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."admin_actions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."admin_approvals" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."admin_permissions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."advertiser_profiles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."driver_earnings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."driver_profiles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."ecommerce_cart_items" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."ecommerce_carts" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."ecommerce_categories" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."ecommerce_order_items" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."ecommerce_order_status_history" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."ecommerce_orders" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."ecommerce_product_reviews" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."ecommerce_product_variants" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."ecommerce_products" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."ecommerce_vendors" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."ecommerce_wishlists" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."file_metadata" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."hotel_amenities" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."hotel_amenity_mappings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."hotel_booking_status_history" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."hotel_bookings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."hotel_photos" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."hotel_promo_code_usage" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."hotel_promo_codes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."hotel_reviews" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."hotels" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."nipost_admin_audit" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."nipost_ecommerce" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."nipost_financial_audit" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."nipost_financial_ledger" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."nipost_hotels" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."nipost_offices" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."nipost_officials" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."nipost_regions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."nipost_taxi" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."user_active_roles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."user_profiles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass" ON "public"."user_roles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can access all comments" ON "public"."post_comments" TO "service_role" USING (true);



CREATE POLICY "Service role can access all likes" ON "public"."post_likes" TO "service_role" USING (true);



CREATE POLICY "Service role can access all posts" ON "public"."social_posts" TO "service_role" USING (true);



CREATE POLICY "Service role can create user profiles" ON "public"."user_profiles" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can manage active roles" ON "public"."user_active_roles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage in-app notifications" ON "public"."in_app_notifications" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage notification logs" ON "public"."notification_logs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage order processing" ON "public"."ecommerce_orders" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage preferences" ON "public"."notification_preferences" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage queue" ON "public"."notification_queue" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage scheduled notifications" ON "public"."scheduled_notifications" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage templates" ON "public"."notification_templates" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can update user verification status" ON "public"."user_profiles" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."delivery_packages" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."role_applications" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access cart items" ON "public"."ecommerce_cart_items" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access carts" ON "public"."ecommerce_carts" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access categories" ON "public"."ecommerce_categories" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access on ride_rejections" ON "public"."ride_rejections" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access order items" ON "public"."ecommerce_order_items" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access products" ON "public"."ecommerce_products" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access promo codes" ON "public"."marketplace_promo_codes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access reviews" ON "public"."ecommerce_product_reviews" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access variants" ON "public"."ecommerce_product_variants" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access wishlists" ON "public"."ecommerce_wishlists" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to delivery_status_history" ON "public"."delivery_status_history" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to notifications" ON "public"."notifications" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Staff can manage articles" ON "public"."support_articles" USING ((EXISTS ( SELECT 1
   FROM "public"."support_staff"
  WHERE ("support_staff"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Staff can view their own profile" ON "public"."support_staff" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Staff can view their own shifts" ON "public"."support_shifts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."support_staff"
  WHERE (("support_staff"."id" = "support_shifts"."staff_id") AND ("support_staff"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Story owners can view who viewed their stories" ON "public"."story_views" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."stories"
  WHERE (("stories"."id" = "story_views"."story_id") AND ("stories"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "System can create payments" ON "public"."payments" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "System can insert event promo usage" ON "public"."event_promo_code_usage" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "System can insert platform promo usage" ON "public"."platform_promo_code_usage" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "System can insert promo usage" ON "public"."hotel_promo_code_usage" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "System can insert promo usage" ON "public"."marketplace_promo_code_usage" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "System can insert room availability" ON "public"."room_availability" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can insert status history" ON "public"."hotel_booking_status_history" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can insert tour promo usage" ON "public"."tour_promo_code_usage" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "System can track story views" ON "public"."story_views" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "System can update room availability" ON "public"."room_availability" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Users can create applications" ON "public"."role_applications" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can create comments" ON "public"."post_comments" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can create connections" ON "public"."user_connections" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can create conversations" ON "public"."conversations" FOR INSERT WITH CHECK (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can create messages on their tickets" ON "public"."ticket_messages" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."support_tickets"
  WHERE (("support_tickets"."id" = "ticket_messages"."ticket_id") AND ("support_tickets"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."support_staff"
  WHERE ("support_staff"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can create packages" ON "public"."delivery_packages" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can create reviews for their bookings" ON "public"."hotel_reviews" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND ("booking_id" IN ( SELECT "hotel_bookings"."id"
   FROM "public"."hotel_bookings"
  WHERE (("hotel_bookings"."user_id" = "auth"."uid"()) AND ("hotel_bookings"."booking_status" = 'checked_out'::"text"))))));



CREATE POLICY "Users can create reviews for their purchases" ON "public"."ecommerce_product_reviews" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM ("public"."ecommerce_order_items" "oi"
     JOIN "public"."ecommerce_orders" "o" ON (("o"."id" = "oi"."order_id")))
  WHERE (("oi"."product_id" = "oi"."product_id") AND ("o"."user_id" = "auth"."uid"()) AND ("o"."status" = 'delivered'::"text"))))));



CREATE POLICY "Users can create their own bookings" ON "public"."hotel_bookings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own stories" ON "public"."stories" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own addresses" ON "public"."user_addresses" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own comments" ON "public"."post_comments" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own stories" ON "public"."stories" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can initiate calls" ON "public"."calls" FOR INSERT WITH CHECK (("initiated_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert their files" ON "public"."file_metadata" FOR INSERT TO "authenticated" WITH CHECK (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Users can insert their own addresses" ON "public"."user_addresses" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert their own preferences" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can join conversations" ON "public"."conversation_participants" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can manage their cart items" ON "public"."ecommerce_cart_items" USING ((EXISTS ( SELECT 1
   FROM "public"."ecommerce_carts" "c"
  WHERE (("c"."id" = "ecommerce_cart_items"."cart_id") AND ("c"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ecommerce_carts" "c"
  WHERE (("c"."id" = "ecommerce_cart_items"."cart_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own call participation" ON "public"."call_participants" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage their own cart" ON "public"."ecommerce_carts" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage their own comment likes" ON "public"."comment_likes" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can manage their own comments" ON "public"."post_comments" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own customer profile" ON "public"."customer_profiles" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can manage their own favorites" ON "public"."favorite_hotels" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can manage their own likes" ON "public"."post_likes" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own posts" ON "public"."social_posts" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their shipping addresses" ON "public"."shipping_addresses" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can manage their unsubscribe tokens" ON "public"."unsubscribe_tokens" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their wishlist" ON "public"."ecommerce_wishlists" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update status of their messages" ON "public"."message_status" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."messages"
  WHERE (("messages"."id" = "message_status"."message_id") AND ("messages"."sender_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their active role" ON "public"."user_active_roles" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their connections" ON "public"."user_connections" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("connected_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can update their own addresses" ON "public"."user_addresses" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own comments" ON "public"."post_comments" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own in-app notifications" ON "public"."in_app_notifications" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own packages" ON "public"."delivery_packages" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can update their own pending bookings" ON "public"."hotel_bookings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own preferences" ON "public"."notification_preferences" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own profile" ON "public"."user_profiles" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own reviews" ON "public"."ecommerce_product_reviews" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own reviews" ON "public"."hotel_reviews" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view appropriate posts" ON "public"."social_posts" FOR SELECT USING ((("visibility" = 'public'::"text") OR ("user_id" = "auth"."uid"()) OR (("visibility" = 'friends'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."user_connections"
  WHERE (("user_connections"."user_id" = "social_posts"."user_id") AND ("user_connections"."connected_user_id" = "auth"."uid"()) AND ("user_connections"."status" = 'accepted'::"text"))))) OR (("visibility" = 'custom'::"text") AND ("auth"."uid"() = ANY ("allowed_viewers")))));



CREATE POLICY "Users can view comments on public posts" ON "public"."post_comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."social_posts"
  WHERE (("social_posts"."id" = "post_comments"."post_id") AND ("social_posts"."visibility" = 'public'::"text") AND ("social_posts"."deleted_at" IS NULL)))));



CREATE POLICY "Users can view likes on public posts" ON "public"."post_likes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."social_posts"
  WHERE (("social_posts"."id" = "post_likes"."post_id") AND ("social_posts"."visibility" = 'public'::"text") AND ("social_posts"."deleted_at" IS NULL)))));



CREATE POLICY "Users can view message status for their messages" ON "public"."message_status" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view messages in their conversations" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants"
  WHERE (("conversation_participants"."conversation_id" = "messages"."conversation_id") AND ("conversation_participants"."user_id" = "auth"."uid"()) AND ("conversation_participants"."left_at" IS NULL)))));



CREATE POLICY "Users can view messages on their tickets" ON "public"."ticket_messages" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."support_tickets"
  WHERE (("support_tickets"."id" = "ticket_messages"."ticket_id") AND ("support_tickets"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."support_staff"
  WHERE ("support_staff"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view own active role" ON "public"."user_active_roles" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own addresses" ON "public"."user_addresses" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own bookings" ON "public"."hotel_bookings" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own notifications" ON "public"."in_app_notifications" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own orders" ON "public"."ecommerce_orders" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own tickets" ON "public"."support_tickets" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own wallet" ON "public"."user_wallets" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view public posts" ON "public"."social_posts" FOR SELECT USING ((("visibility" = 'public'::"text") AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can view public profile info" ON "public"."user_profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR (("id" <> "auth"."uid"()) AND ("deleted_at" IS NULL))));



CREATE POLICY "Users can view status history for their bookings" ON "public"."hotel_booking_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."hotel_bookings" "b"
  WHERE (("b"."id" = "hotel_booking_status_history"."booking_id") AND ("b"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view status history for their orders" ON "public"."ecommerce_order_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ecommerce_orders"
  WHERE (("ecommerce_orders"."id" = "ecommerce_order_status_history"."order_id") AND ("ecommerce_orders"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view stories from connections" ON "public"."stories" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_connections"
  WHERE ((("user_connections"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_connections"."connected_user_id" = "stories"."user_id") AND ("user_connections"."status" = 'accepted'::"text")) OR (("user_connections"."connected_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_connections"."user_id" = "stories"."user_id") AND ("user_connections"."status" = 'accepted'::"text")))))));



CREATE POLICY "Users can view their active role" ON "public"."user_active_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their call participations" ON "public"."call_participants" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their cart items" ON "public"."ecommerce_cart_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ecommerce_carts" "c"
  WHERE (("c"."id" = "ecommerce_cart_items"."cart_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their connections" ON "public"."user_connections" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("connected_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can view their event promo usage" ON "public"."event_promo_code_usage" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their failed attempts" ON "public"."failed_payment_attempts" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their order items" ON "public"."ecommerce_order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ecommerce_orders" "o"
  WHERE (("o"."id" = "ecommerce_order_items"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own addresses" ON "public"."user_addresses" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own applications" ON "public"."role_applications" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own audit logs" ON "public"."audit_logs" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own bookings" ON "public"."hotel_bookings" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own cart" ON "public"."ecommerce_carts" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own in-app notifications" ON "public"."in_app_notifications" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own notification logs" ON "public"."notification_logs" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own orders" ON "public"."ecommerce_orders" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own packages" ON "public"."delivery_packages" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "recipient_id")));



CREATE POLICY "Users can view their own payments" ON "public"."payments" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own preferences" ON "public"."notification_preferences" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own profile" ON "public"."user_profiles" FOR SELECT USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own queued notifications" ON "public"."notification_queue" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own scheduled notifications" ON "public"."scheduled_notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their platform promo usage" ON "public"."platform_promo_code_usage" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their promo usage" ON "public"."hotel_promo_code_usage" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their promo usage" ON "public"."marketplace_promo_code_usage" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their tour promo usage" ON "public"."tour_promo_code_usage" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their uploaded files" ON "public"."file_metadata" FOR SELECT TO "authenticated" USING (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Users can view their wallet transactions" ON "public"."wallet_transactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_wallets"
  WHERE (("user_wallets"."id" = "wallet_transactions"."wallet_id") AND ("user_wallets"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their wishlist" ON "public"."ecommerce_wishlists" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Vendors can manage their own products" ON "public"."ecommerce_products" TO "authenticated" USING (("vendor_id" = "auth"."uid"())) WITH CHECK (("vendor_id" = "auth"."uid"()));



CREATE POLICY "Vendors can manage their own profile" ON "public"."vendor_profiles" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Vendors can manage their product variants" ON "public"."ecommerce_product_variants" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ecommerce_products"
  WHERE (("ecommerce_products"."id" = "ecommerce_product_variants"."product_id") AND ("ecommerce_products"."vendor_id" = "auth"."uid"())))));



CREATE POLICY "Vendors can view orders containing their products" ON "public"."ecommerce_orders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ecommerce_order_items"
  WHERE (("ecommerce_order_items"."order_id" = "ecommerce_orders"."id") AND ("ecommerce_order_items"."vendor_id" = "auth"."uid"())))));



CREATE POLICY "Vendors can view status history for their orders" ON "public"."ecommerce_order_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ecommerce_order_items"
  WHERE (("ecommerce_order_items"."order_id" = "ecommerce_order_status_history"."order_id") AND ("ecommerce_order_items"."vendor_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Vendors can view their escrow transactions" ON "public"."escrow_transactions" FOR SELECT USING (("vendor_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Vendors can view their order items" ON "public"."ecommerce_order_items" FOR SELECT TO "authenticated" USING (("vendor_id" = "auth"."uid"()));



CREATE POLICY "Vendors can view their payouts" ON "public"."vendor_payouts" FOR SELECT USING (("vendor_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."ad_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_actions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_ad_campaigns_select" ON "public"."ad_campaigns" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"());



CREATE POLICY "admin_ad_campaigns_update" ON "public"."ad_campaigns" FOR UPDATE TO "authenticated" USING (("public"."has_permission"('ads:approve'::"text") OR "public"."has_role"(ARRAY['admin'::"text", 'super_admin'::"text"]))) WITH CHECK (("public"."has_permission"('ads:approve'::"text") OR "public"."has_role"(ARRAY['admin'::"text", 'super_admin'::"text"])));



ALTER TABLE "public"."admin_approvals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_audit_insert" ON "public"."nipost_admin_audit" FOR INSERT WITH CHECK (("auth"."uid"() = "admin_id"));



CREATE POLICY "admin_audit_select_branch" ON "public"."nipost_admin_audit" FOR SELECT USING ((("branch_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'branch'::"text") AND (("p"."branch_id")::"text" = ("nipost_admin_audit"."branch_id")::"text") AND ("p"."is_active" = true))))));



CREATE POLICY "admin_audit_select_national" ON "public"."nipost_admin_audit" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'national'::"text") AND ("p"."is_active" = true)))));



CREATE POLICY "admin_audit_select_state" ON "public"."nipost_admin_audit" FOR SELECT USING ((("state_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'state'::"text") AND (("p"."state_id")::"text" = ("nipost_admin_audit"."state_id")::"text") AND ("p"."is_active" = true))))));



CREATE POLICY "admin_driver_profiles_select" ON "public"."driver_profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"());



CREATE POLICY "admin_ecommerce_orders_delete" ON "public"."ecommerce_orders" FOR UPDATE TO "authenticated" USING (("public"."has_role"(ARRAY['admin'::"text", 'super_admin'::"text", 'manager'::"text"]) AND ("deleted_at" IS NULL))) WITH CHECK (("deleted_at" IS NOT NULL));



CREATE POLICY "admin_ecommerce_orders_select" ON "public"."ecommerce_orders" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"());



CREATE POLICY "admin_ecommerce_orders_update" ON "public"."ecommerce_orders" FOR UPDATE TO "authenticated" USING ("public"."has_role"(ARRAY['admin'::"text", 'super_admin'::"text", 'manager'::"text"])) WITH CHECK ("public"."has_role"(ARRAY['admin'::"text", 'super_admin'::"text", 'manager'::"text"]));



CREATE POLICY "admin_ecommerce_vendors_select" ON "public"."ecommerce_vendors" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"());



CREATE POLICY "admin_file_metadata_select" ON "public"."file_metadata" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"());



CREATE POLICY "admin_financial_ledger_select" ON "public"."nipost_financial_ledger" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions"
  WHERE (("nipost_user_permissions"."user_id" = "auth"."uid"()) AND ("nipost_user_permissions"."is_active" = true) AND ((("nipost_user_permissions"."access_level")::"text" = 'national'::"text") OR ((("nipost_user_permissions"."access_level")::"text" = 'state'::"text") AND (("nipost_user_permissions"."state_id")::"text" = ("nipost_financial_ledger"."state_id")::"text")) OR ((("nipost_user_permissions"."access_level")::"text" = 'branch'::"text") AND (("nipost_user_permissions"."branch_id")::"text" = ("nipost_financial_ledger"."branch_id")::"text")))))));



CREATE POLICY "admin_hotels_select" ON "public"."hotels" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"());



CREATE POLICY "admin_nipost_officials_select" ON "public"."nipost_officials" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"());



ALTER TABLE "public"."admin_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_user_profiles_delete" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("public"."has_role"(ARRAY['admin'::"text", 'super_admin'::"text"]) AND ("deleted_at" IS NULL))) WITH CHECK (("deleted_at" IS NOT NULL));



CREATE POLICY "admin_user_profiles_select" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (("public"."has_role"(ARRAY['admin'::"text", 'super_admin'::"text"]) OR ("auth"."uid"() = "id")));



CREATE POLICY "admin_user_profiles_update" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("public"."has_role"(ARRAY['admin'::"text", 'super_admin'::"text"]) OR ("auth"."uid"() = "id"))) WITH CHECK (("public"."has_role"(ARRAY['admin'::"text", 'super_admin'::"text"]) OR ("auth"."uid"() = "id")));



ALTER TABLE "public"."advertiser_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_trail" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."call_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calls" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cart_items_select_owned" ON "public"."ecommerce_cart_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ecommerce_carts"
  WHERE (("ecommerce_carts"."id" = "ecommerce_cart_items"."cart_id") AND ("ecommerce_carts"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "cart_select_owned" ON "public"."ecommerce_carts" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."comment_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courier_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courier_profiles_dop_read_all" ON "public"."courier_profiles" FOR SELECT TO "authenticated" USING ("public"."is_dop"("auth"."uid"()));



CREATE POLICY "courier_profiles_own_profile_access" ON "public"."courier_profiles" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "courier_profiles_pmg_state_full_access" ON "public"."courier_profiles" TO "authenticated" USING (("public"."is_postmaster_general"("auth"."uid"()) AND (("state" IN ( SELECT "nipost_user_permissions"."state_name"
   FROM "public"."nipost_user_permissions"
  WHERE (("nipost_user_permissions"."user_id" = "auth"."uid"()) AND (("nipost_user_permissions"."role")::"text" = 'PMG'::"text") AND ("nipost_user_permissions"."is_active" = true)))) OR ("state_id" IN ( SELECT "nipost_user_permissions"."state_id"
   FROM "public"."nipost_user_permissions"
  WHERE (("nipost_user_permissions"."user_id" = "auth"."uid"()) AND (("nipost_user_permissions"."role")::"text" = 'PMG'::"text") AND ("nipost_user_permissions"."is_active" = true))))))) WITH CHECK (("public"."is_postmaster_general"("auth"."uid"()) AND (("state" IN ( SELECT "nipost_user_permissions"."state_name"
   FROM "public"."nipost_user_permissions"
  WHERE (("nipost_user_permissions"."user_id" = "auth"."uid"()) AND (("nipost_user_permissions"."role")::"text" = 'PMG'::"text") AND ("nipost_user_permissions"."is_active" = true)))) OR ("state_id" IN ( SELECT "nipost_user_permissions"."state_id"
   FROM "public"."nipost_user_permissions"
  WHERE (("nipost_user_permissions"."user_id" = "auth"."uid"()) AND (("nipost_user_permissions"."role")::"text" = 'PMG'::"text") AND ("nipost_user_permissions"."is_active" = true)))))));



CREATE POLICY "courier_profiles_public_insert" ON "public"."courier_profiles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "courier_profiles_regional_manager_read" ON "public"."courier_profiles" FOR SELECT TO "authenticated" USING (("public"."is_regional_manager"("auth"."uid"()) AND (("state" IN ( SELECT "nipost_user_permissions"."state_name"
   FROM "public"."nipost_user_permissions"
  WHERE (("nipost_user_permissions"."user_id" = "auth"."uid"()) AND (("nipost_user_permissions"."role")::"text" = 'REGIONAL_MANAGER'::"text") AND ("nipost_user_permissions"."is_active" = true)))) OR ("state_id" IN ( SELECT "nipost_user_permissions"."state_id"
   FROM "public"."nipost_user_permissions"
  WHERE (("nipost_user_permissions"."user_id" = "auth"."uid"()) AND (("nipost_user_permissions"."role")::"text" = 'REGIONAL_MANAGER'::"text") AND ("nipost_user_permissions"."is_active" = true)))))));



ALTER TABLE "public"."customer_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_classification" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_exceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_packages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_routes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deposit_requirements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."driver_earnings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."driver_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ecommerce_cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ecommerce_carts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ecommerce_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ecommerce_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ecommerce_order_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ecommerce_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ecommerce_product_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ecommerce_product_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ecommerce_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ecommerce_select_branch" ON "public"."nipost_ecommerce" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'branch'::"text") AND (("p"."branch_id")::"text" = ("nipost_ecommerce"."branch_id")::"text") AND ("p"."is_active" = true)))));



CREATE POLICY "ecommerce_select_national" ON "public"."nipost_ecommerce" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'national'::"text") AND ("p"."is_active" = true)))));



CREATE POLICY "ecommerce_select_state" ON "public"."nipost_ecommerce" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'state'::"text") AND (("p"."state_id")::"text" = ("nipost_ecommerce"."state_id")::"text") AND ("p"."is_active" = true)))));



ALTER TABLE "public"."ecommerce_vendors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ecommerce_wishlists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."escrow_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_promo_code_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."failed_payment_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."favorite_hotels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."file_metadata" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "financial_audit_insert" ON "public"."nipost_financial_audit" FOR INSERT WITH CHECK (true);



CREATE POLICY "financial_audit_select_branch" ON "public"."nipost_financial_audit" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."nipost_financial_ledger" "l"
     JOIN "public"."nipost_user_permissions" "p" ON (("p"."user_id" = "auth"."uid"())))
  WHERE (("l"."id" = "nipost_financial_audit"."ledger_id") AND (("p"."access_level")::"text" = 'branch'::"text") AND (("p"."branch_id")::"text" = ("l"."branch_id")::"text") AND ("p"."is_active" = true)))));



CREATE POLICY "financial_audit_select_national" ON "public"."nipost_financial_audit" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'national'::"text") AND ("p"."is_active" = true)))));



CREATE POLICY "financial_audit_select_state" ON "public"."nipost_financial_audit" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."nipost_financial_ledger" "l"
     JOIN "public"."nipost_user_permissions" "p" ON (("p"."user_id" = "auth"."uid"())))
  WHERE (("l"."id" = "nipost_financial_audit"."ledger_id") AND (("p"."access_level")::"text" = 'state'::"text") AND (("p"."state_id")::"text" = ("l"."state_id")::"text") AND ("p"."is_active" = true)))));



CREATE POLICY "financial_ledger_insert" ON "public"."nipost_financial_ledger" FOR INSERT WITH CHECK (true);



CREATE POLICY "financial_ledger_select_branch" ON "public"."nipost_financial_ledger" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'branch'::"text") AND (("p"."branch_id")::"text" = ("nipost_financial_ledger"."branch_id")::"text") AND ("p"."is_active" = true)))));



CREATE POLICY "financial_ledger_select_national" ON "public"."nipost_financial_ledger" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'national'::"text") AND ("p"."is_active" = true)))));



CREATE POLICY "financial_ledger_select_state" ON "public"."nipost_financial_ledger" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'state'::"text") AND (("p"."state_id")::"text" = ("nipost_financial_ledger"."state_id")::"text") AND ("p"."is_active" = true)))));



ALTER TABLE "public"."function_dependencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."host_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hotel_amenities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hotel_amenity_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hotel_booking_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hotel_bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hotel_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hotel_promo_code_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hotel_promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hotel_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hotels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hotels_select_branch" ON "public"."nipost_hotels" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'branch'::"text") AND (("p"."branch_id")::"text" = ("nipost_hotels"."branch_id")::"text") AND ("p"."is_active" = true)))));



CREATE POLICY "hotels_select_national" ON "public"."nipost_hotels" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'national'::"text") AND ("p"."is_active" = true)))));



CREATE POLICY "hotels_select_state" ON "public"."nipost_hotels" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'state'::"text") AND (("p"."state_id")::"text" = ("nipost_hotels"."state_id")::"text") AND ("p"."is_active" = true)))));



ALTER TABLE "public"."in_app_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketplace_promo_code_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketplace_promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "module_admin_ecommerce_access" ON "public"."nipost_ecommerce" FOR SELECT TO "authenticated" USING (("public"."is_module_admin"("auth"."uid"()) AND (( SELECT (("nipost_user_permissions"."module_permissions" ->> 'ecommerce'::"text"))::boolean AS "bool"
   FROM "public"."nipost_user_permissions"
  WHERE (("nipost_user_permissions"."user_id" = "auth"."uid"()) AND ("nipost_user_permissions"."is_active" = true))
 LIMIT 1) = true)));



CREATE POLICY "module_admin_financial_ledger_access" ON "public"."nipost_financial_ledger" FOR SELECT TO "authenticated" USING (("public"."is_module_admin"("auth"."uid"()) AND (( SELECT (("nipost_user_permissions"."module_permissions" ->> ("nipost_financial_ledger"."module")::"text"))::boolean AS "bool"
   FROM "public"."nipost_user_permissions"
  WHERE (("nipost_user_permissions"."user_id" = "auth"."uid"()) AND ("nipost_user_permissions"."is_active" = true))
 LIMIT 1) = true)));



CREATE POLICY "module_admin_hotels_access" ON "public"."nipost_hotels" FOR SELECT TO "authenticated" USING (("public"."is_module_admin"("auth"."uid"()) AND (( SELECT (("nipost_user_permissions"."module_permissions" ->> 'hotel'::"text"))::boolean AS "bool"
   FROM "public"."nipost_user_permissions"
  WHERE (("nipost_user_permissions"."user_id" = "auth"."uid"()) AND ("nipost_user_permissions"."is_active" = true))
 LIMIT 1) = true)));



CREATE POLICY "module_admin_taxi_access" ON "public"."nipost_taxi" FOR SELECT TO "authenticated" USING (("public"."is_module_admin"("auth"."uid"()) AND (( SELECT (("nipost_user_permissions"."module_permissions" ->> 'taxi'::"text"))::boolean AS "bool"
   FROM "public"."nipost_user_permissions"
  WHERE (("nipost_user_permissions"."user_id" = "auth"."uid"()) AND ("nipost_user_permissions"."is_active" = true))
 LIMIT 1) = true)));



ALTER TABLE "public"."module_commission_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nipost_admin_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nipost_ecommerce" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nipost_financial_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nipost_financial_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nipost_hotels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nipost_offices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nipost_officials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nipost_permissions_dop_full_access" ON "public"."nipost_user_permissions" TO "authenticated" USING ("public"."is_dop"("auth"."uid"())) WITH CHECK ("public"."is_dop"("auth"."uid"()));



CREATE POLICY "nipost_permissions_own_read" ON "public"."nipost_user_permissions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."nipost_regions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nipost_taxi" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nipost_user_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."official_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_provider_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_migration_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_promo_code_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_revenue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."postal_staff" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "postal_staff_dop_full_access" ON "public"."postal_staff" TO "authenticated" USING ("public"."is_dop"("auth"."uid"())) WITH CHECK ("public"."is_dop"("auth"."uid"()));



CREATE POLICY "postal_staff_own_record_read" ON "public"."postal_staff" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "postal_staff_pmg_state_read" ON "public"."postal_staff" FOR SELECT TO "authenticated" USING (("public"."is_postmaster_general"("auth"."uid"()) AND ("state" IN ( SELECT "nipost_user_permissions"."state_name"
   FROM "public"."nipost_user_permissions"
  WHERE (("nipost_user_permissions"."user_id" = "auth"."uid"()) AND (("nipost_user_permissions"."role")::"text" = 'PMG'::"text") AND ("nipost_user_permissions"."is_active" = true))))));



CREATE POLICY "postal_staff_public_insert" ON "public"."postal_staff" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "postal_staff_regional_manager_read" ON "public"."postal_staff" FOR SELECT TO "authenticated" USING (("public"."is_regional_manager"("auth"."uid"()) AND ("state" IN ( SELECT "nipost_user_permissions"."state_name"
   FROM "public"."nipost_user_permissions"
  WHERE (("nipost_user_permissions"."user_id" = "auth"."uid"()) AND (("nipost_user_permissions"."role")::"text" = 'REGIONAL_MANAGER'::"text") AND ("nipost_user_permissions"."is_active" = true))))));



ALTER TABLE "public"."refund_policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "regional_manager_audit_read" ON "public"."nipost_admin_audit" FOR SELECT TO "authenticated" USING (("public"."is_regional_manager"("auth"."uid"()) AND (("state_id")::"text" IN ( SELECT "nipost_user_permissions"."state_id"
   FROM "public"."nipost_user_permissions"
  WHERE (("nipost_user_permissions"."user_id" = "auth"."uid"()) AND (("nipost_user_permissions"."role")::"text" = 'REGIONAL_MANAGER'::"text") AND ("nipost_user_permissions"."is_active" = true))))));



ALTER TABLE "public"."ride_rejections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ride_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_module_mapping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipping_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."story_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_staff" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."surge_pricing_zones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."taxi_drivers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "taxi_select_branch" ON "public"."nipost_taxi" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'branch'::"text") AND (("p"."branch_id")::"text" = ("nipost_taxi"."branch_id")::"text") AND ("p"."is_active" = true)))));



CREATE POLICY "taxi_select_national" ON "public"."nipost_taxi" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'national'::"text") AND ("p"."is_active" = true)))));



CREATE POLICY "taxi_select_state" ON "public"."nipost_taxi" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."nipost_user_permissions" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND (("p"."access_level")::"text" = 'state'::"text") AND (("p"."state_id")::"text" = ("nipost_taxi"."state_id")::"text") AND ("p"."is_active" = true)))));



ALTER TABLE "public"."ticket_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tour_promo_code_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tour_promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."unsubscribe_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_active_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_wallets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vehicle_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_payouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallet_transactions" ENABLE ROW LEVEL SECURITY;


GRANT ALL ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT ALL ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."analyze_function_classification"() TO "anon";
GRANT ALL ON FUNCTION "public"."analyze_function_classification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."analyze_function_classification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."assess_migration_readiness"() TO "anon";
GRANT ALL ON FUNCTION "public"."assess_migration_readiness"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assess_migration_readiness"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_platform_recommendation"("db_intensity" integer, "compute_intensity" integer, "memory_intensity" integer, "io_intensity" integer, "traffic_pattern" "text", "business_criticality" "text", "security_level" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_platform_recommendation"("db_intensity" integer, "compute_intensity" integer, "memory_intensity" integer, "io_intensity" integer, "traffic_pattern" "text", "business_criticality" "text", "security_level" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_platform_recommendation"("db_intensity" integer, "compute_intensity" integer, "memory_intensity" integer, "io_intensity" integer, "traffic_pattern" "text", "business_criticality" "text", "security_level" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_acid_compliance"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_acid_compliance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_acid_compliance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_migration_readiness"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_migration_readiness"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_migration_readiness"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_security_compliance"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_security_compliance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_security_compliance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_post_comment"("p_post_id" "uuid", "p_user_id" "uuid", "p_content" "text", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_post_comment"("p_post_id" "uuid", "p_user_id" "uuid", "p_content" "text", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_post_comment"("p_post_id" "uuid", "p_user_id" "uuid", "p_content" "text", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_role_specific_profile"("p_user_id" "uuid", "p_role_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_role_specific_profile"("p_user_id" "uuid", "p_role_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_role_specific_profile"("p_user_id" "uuid", "p_role_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_social_post"("p_user_id" "uuid", "p_content" "text", "p_media_urls" "text"[], "p_visibility" "text", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_social_post"("p_user_id" "uuid", "p_content" "text", "p_media_urls" "text"[], "p_visibility" "text", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_social_post"("p_user_id" "uuid", "p_content" "text", "p_media_urls" "text"[], "p_visibility" "text", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."credit_wallet"("p_user_id" "uuid", "p_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."credit_wallet"("p_user_id" "uuid", "p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."credit_wallet"("p_user_id" "uuid", "p_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."debit_wallet"("p_user_id" "uuid", "p_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."debit_wallet"("p_user_id" "uuid", "p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."debit_wallet"("p_user_id" "uuid", "p_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_sensitive_data"("encrypted_data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_sensitive_data"("encrypted_data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_sensitive_data"("encrypted_data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."document_table_relationships"("target_table" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."document_table_relationships"("target_table" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."document_table_relationships"("target_table" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."encrypt_sensitive_data"("data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_sensitive_data"("data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_sensitive_data"("data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_nearby_couriers"("search_lat" double precision, "search_lng" double precision, "radius_km" double precision, "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."find_nearby_couriers"("search_lat" double precision, "search_lng" double precision, "radius_km" double precision, "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_nearby_couriers"("search_lat" double precision, "search_lng" double precision, "radius_km" double precision, "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."find_nearby_drivers"("user_lat" double precision, "user_lng" double precision, "search_radius_km" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."find_nearby_drivers"("user_lat" double precision, "user_lng" double precision, "search_radius_km" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_nearby_drivers"("user_lat" double precision, "user_lng" double precision, "search_radius_km" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."find_nearby_drivers"("target_lat" double precision, "target_lng" double precision, "radius_km" double precision, "vehicle_type_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."find_nearby_drivers"("target_lat" double precision, "target_lng" double precision, "radius_km" double precision, "vehicle_type_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_nearby_drivers"("target_lat" double precision, "target_lng" double precision, "radius_km" double precision, "vehicle_type_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_assignment_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_assignment_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_assignment_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_courier_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_courier_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_courier_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_module_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_module_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_module_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_branch_summary"("p_branch_id" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_branch_summary"("p_branch_id" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_branch_summary"("p_branch_id" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_business_categories"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_business_categories"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_business_categories"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_category_breakdown"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_category_breakdown"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_category_breakdown"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_giga_dashboard_stats"("start_date" "date", "end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_giga_dashboard_stats"("start_date" "date", "end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_giga_dashboard_stats"("start_date" "date", "end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_national_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_national_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_national_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_nipost_access_level"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_nipost_access_level"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_nipost_access_level"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_nipost_role"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_nipost_role"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_nipost_role"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_nipost_state_id"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_nipost_state_id"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_nipost_state_id"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_platform_setting"("setting_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_platform_setting"("setting_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_platform_setting"("setting_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_platform_setting"("setting_category" "text", "setting_key" "text", "default_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_platform_setting"("setting_category" "text", "setting_key" "text", "default_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_platform_setting"("setting_category" "text", "setting_key" "text", "default_value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pmg_state"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pmg_state"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pmg_state"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sales_comparison"("current_period_start" "date", "current_period_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_sales_comparison"("current_period_start" "date", "current_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sales_comparison"("current_period_start" "date", "current_period_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_state_summary"("p_state_id" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_state_summary"("p_state_id" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_state_summary"("p_state_id" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_access_level"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_access_level"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_access_level"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_wallet_balance"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_wallet_balance"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_wallet_balance"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_courier_approval"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_courier_approval"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_courier_approval"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_postal_staff_approval"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_postal_staff_approval"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_postal_staff_approval"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("required_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("required_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("required_permission" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("required_roles" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("required_roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("required_roles" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_courier"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_courier"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_courier"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_dop"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_dop"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_dop"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_module_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_module_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_module_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_postmaster_general"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_postmaster_general"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_postmaster_general"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_regional_manager"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_regional_manager"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_regional_manager"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_service_role_action"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_service_role_action"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_service_role_action"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mask_sensitive_data"("data" "text", "mask_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mask_sensitive_data"("data" "text", "mask_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mask_sensitive_data"("data" "text", "mask_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_assignment_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_assignment_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_assignment_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_courier_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_courier_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_courier_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_post_like"("p_post_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_post_like"("p_post_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_post_like"("p_post_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_courier_location"("courier_uuid" "uuid", "lat" double precision, "lng" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."update_courier_location"("courier_uuid" "uuid", "lat" double precision, "lng" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_courier_location"("courier_uuid" "uuid", "lat" double precision, "lng" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_edge_function_inventory_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_edge_function_inventory_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_edge_function_inventory_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_hotel_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_hotel_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_hotel_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_nipost_permissions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_nipost_permissions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_nipost_permissions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_post_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_post_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_post_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_product_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_product_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_product_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."active_conversations" TO "anon";
GRANT ALL ON TABLE "public"."active_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."active_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."ecommerce_products" TO "anon";
GRANT ALL ON TABLE "public"."ecommerce_products" TO "authenticated";
GRANT ALL ON TABLE "public"."ecommerce_products" TO "service_role";



GRANT ALL ON TABLE "public"."active_ecommerce_products" TO "anon";
GRANT ALL ON TABLE "public"."active_ecommerce_products" TO "authenticated";
GRANT ALL ON TABLE "public"."active_ecommerce_products" TO "service_role";



GRANT ALL ON TABLE "public"."hotels" TO "anon";
GRANT ALL ON TABLE "public"."hotels" TO "authenticated";
GRANT ALL ON TABLE "public"."hotels" TO "service_role";



GRANT ALL ON TABLE "public"."active_hotels" TO "anon";
GRANT ALL ON TABLE "public"."active_hotels" TO "authenticated";
GRANT ALL ON TABLE "public"."active_hotels" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."active_messages" TO "anon";
GRANT ALL ON TABLE "public"."active_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."active_messages" TO "service_role";



GRANT ALL ON TABLE "public"."social_posts" TO "anon";
GRANT ALL ON TABLE "public"."social_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."social_posts" TO "service_role";



GRANT ALL ON TABLE "public"."active_social_posts" TO "anon";
GRANT ALL ON TABLE "public"."active_social_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."active_social_posts" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."active_user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."active_user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."active_user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ad_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."ad_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."ad_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."admin_actions" TO "anon";
GRANT ALL ON TABLE "public"."admin_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_actions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_approvals" TO "anon";
GRANT ALL ON TABLE "public"."admin_approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_approvals" TO "service_role";



GRANT ALL ON TABLE "public"."admin_permissions" TO "anon";
GRANT ALL ON TABLE "public"."admin_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."advertiser_profiles" TO "anon";
GRANT ALL ON TABLE "public"."advertiser_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."advertiser_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."audit_trail" TO "anon";
GRANT ALL ON TABLE "public"."audit_trail" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_trail" TO "service_role";



GRANT ALL ON SEQUENCE "public"."booking_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."booking_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."booking_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."call_participants" TO "anon";
GRANT ALL ON TABLE "public"."call_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."call_participants" TO "service_role";



GRANT ALL ON TABLE "public"."calls" TO "anon";
GRANT ALL ON TABLE "public"."calls" TO "authenticated";
GRANT ALL ON TABLE "public"."calls" TO "service_role";



GRANT ALL ON TABLE "public"."comment_likes" TO "anon";
GRANT ALL ON TABLE "public"."comment_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_likes" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."courier_profiles" TO "anon";
GRANT ALL ON TABLE "public"."courier_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."courier_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."customer_profiles" TO "anon";
GRANT ALL ON TABLE "public"."customer_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."data_classification" TO "anon";
GRANT ALL ON TABLE "public"."data_classification" TO "authenticated";
GRANT ALL ON TABLE "public"."data_classification" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_assignments" TO "anon";
GRANT ALL ON TABLE "public"."delivery_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."delivery_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_packages" TO "anon";
GRANT ALL ON TABLE "public"."delivery_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_packages" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_routes" TO "anon";
GRANT ALL ON TABLE "public"."delivery_routes" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_routes" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_status_history" TO "anon";
GRANT ALL ON TABLE "public"."delivery_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_tracking" TO "anon";
GRANT ALL ON TABLE "public"."delivery_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."deposit_requirements" TO "anon";
GRANT ALL ON TABLE "public"."deposit_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."deposit_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."driver_earnings" TO "anon";
GRANT ALL ON TABLE "public"."driver_earnings" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_earnings" TO "service_role";



GRANT ALL ON TABLE "public"."driver_profiles" TO "anon";
GRANT ALL ON TABLE "public"."driver_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ecommerce_cart_items" TO "anon";
GRANT ALL ON TABLE "public"."ecommerce_cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."ecommerce_cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."ecommerce_carts" TO "anon";
GRANT ALL ON TABLE "public"."ecommerce_carts" TO "authenticated";
GRANT ALL ON TABLE "public"."ecommerce_carts" TO "service_role";



GRANT ALL ON TABLE "public"."ecommerce_categories" TO "anon";
GRANT ALL ON TABLE "public"."ecommerce_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."ecommerce_categories" TO "service_role";



GRANT ALL ON TABLE "public"."ecommerce_order_items" TO "anon";
GRANT ALL ON TABLE "public"."ecommerce_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."ecommerce_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."ecommerce_order_status_history" TO "anon";
GRANT ALL ON TABLE "public"."ecommerce_order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."ecommerce_order_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."ecommerce_orders" TO "anon";
GRANT ALL ON TABLE "public"."ecommerce_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."ecommerce_orders" TO "service_role";



GRANT ALL ON TABLE "public"."ecommerce_product_reviews" TO "anon";
GRANT ALL ON TABLE "public"."ecommerce_product_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."ecommerce_product_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."ecommerce_product_variants" TO "anon";
GRANT ALL ON TABLE "public"."ecommerce_product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."ecommerce_product_variants" TO "service_role";



GRANT ALL ON TABLE "public"."ecommerce_vendors" TO "anon";
GRANT ALL ON TABLE "public"."ecommerce_vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."ecommerce_vendors" TO "service_role";



GRANT ALL ON TABLE "public"."ecommerce_wishlists" TO "anon";
GRANT ALL ON TABLE "public"."ecommerce_wishlists" TO "authenticated";
GRANT ALL ON TABLE "public"."ecommerce_wishlists" TO "service_role";



GRANT ALL ON TABLE "public"."edge_function_inventory" TO "anon";
GRANT ALL ON TABLE "public"."edge_function_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."edge_function_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."escrow_transactions" TO "anon";
GRANT ALL ON TABLE "public"."escrow_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."escrow_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."event_promo_code_usage" TO "anon";
GRANT ALL ON TABLE "public"."event_promo_code_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."event_promo_code_usage" TO "service_role";



GRANT ALL ON TABLE "public"."event_promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."event_promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."event_promo_codes" TO "service_role";



GRANT ALL ON TABLE "public"."failed_payment_attempts" TO "anon";
GRANT ALL ON TABLE "public"."failed_payment_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."failed_payment_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."favorite_hotels" TO "anon";
GRANT ALL ON TABLE "public"."favorite_hotels" TO "authenticated";
GRANT ALL ON TABLE "public"."favorite_hotels" TO "service_role";



GRANT ALL ON TABLE "public"."file_metadata" TO "anon";
GRANT ALL ON TABLE "public"."file_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."file_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."function_classification" TO "anon";
GRANT ALL ON TABLE "public"."function_classification" TO "authenticated";
GRANT ALL ON TABLE "public"."function_classification" TO "service_role";



GRANT ALL ON TABLE "public"."function_consolidation_actions" TO "anon";
GRANT ALL ON TABLE "public"."function_consolidation_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."function_consolidation_actions" TO "service_role";



GRANT ALL ON TABLE "public"."function_dependencies" TO "anon";
GRANT ALL ON TABLE "public"."function_dependencies" TO "authenticated";
GRANT ALL ON TABLE "public"."function_dependencies" TO "service_role";



GRANT ALL ON TABLE "public"."function_dependencies_map" TO "anon";
GRANT ALL ON TABLE "public"."function_dependencies_map" TO "authenticated";
GRANT ALL ON TABLE "public"."function_dependencies_map" TO "service_role";



GRANT ALL ON TABLE "public"."function_improvement_plan" TO "anon";
GRANT ALL ON TABLE "public"."function_improvement_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."function_improvement_plan" TO "service_role";



GRANT ALL ON TABLE "public"."function_openapi_specs" TO "anon";
GRANT ALL ON TABLE "public"."function_openapi_specs" TO "authenticated";
GRANT ALL ON TABLE "public"."function_openapi_specs" TO "service_role";



GRANT ALL ON TABLE "public"."function_quality_standards" TO "anon";
GRANT ALL ON TABLE "public"."function_quality_standards" TO "authenticated";
GRANT ALL ON TABLE "public"."function_quality_standards" TO "service_role";



GRANT ALL ON TABLE "public"."function_standardization_audit" TO "anon";
GRANT ALL ON TABLE "public"."function_standardization_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."function_standardization_audit" TO "service_role";



GRANT ALL ON TABLE "public"."host_profiles" TO "anon";
GRANT ALL ON TABLE "public"."host_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."host_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_amenities" TO "anon";
GRANT ALL ON TABLE "public"."hotel_amenities" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_amenities" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_amenity_mappings" TO "anon";
GRANT ALL ON TABLE "public"."hotel_amenity_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_amenity_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_booking_status_history" TO "anon";
GRANT ALL ON TABLE "public"."hotel_booking_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_booking_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_bookings" TO "anon";
GRANT ALL ON TABLE "public"."hotel_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_photos" TO "anon";
GRANT ALL ON TABLE "public"."hotel_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_photos" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_promo_code_usage" TO "anon";
GRANT ALL ON TABLE "public"."hotel_promo_code_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_promo_code_usage" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."hotel_promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_promo_codes" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_reviews" TO "anon";
GRANT ALL ON TABLE "public"."hotel_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."in_app_notifications" TO "anon";
GRANT ALL ON TABLE "public"."in_app_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."in_app_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_promo_code_usage" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_promo_code_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_promo_code_usage" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_promo_codes" TO "service_role";



GRANT ALL ON TABLE "public"."media_content" TO "anon";
GRANT ALL ON TABLE "public"."media_content" TO "authenticated";
GRANT ALL ON TABLE "public"."media_content" TO "service_role";



GRANT ALL ON TABLE "public"."message_status" TO "anon";
GRANT ALL ON TABLE "public"."message_status" TO "authenticated";
GRANT ALL ON TABLE "public"."message_status" TO "service_role";



GRANT ALL ON TABLE "public"."module_commission_rates" TO "anon";
GRANT ALL ON TABLE "public"."module_commission_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."module_commission_rates" TO "service_role";



GRANT ALL ON TABLE "public"."nipost_admin_audit" TO "anon";
GRANT ALL ON TABLE "public"."nipost_admin_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."nipost_admin_audit" TO "service_role";



GRANT ALL ON TABLE "public"."nipost_ecommerce" TO "anon";
GRANT ALL ON TABLE "public"."nipost_ecommerce" TO "authenticated";
GRANT ALL ON TABLE "public"."nipost_ecommerce" TO "service_role";



GRANT ALL ON TABLE "public"."nipost_financial_audit" TO "anon";
GRANT ALL ON TABLE "public"."nipost_financial_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."nipost_financial_audit" TO "service_role";



GRANT ALL ON TABLE "public"."nipost_financial_ledger" TO "anon";
GRANT ALL ON TABLE "public"."nipost_financial_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."nipost_financial_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."nipost_hotels" TO "anon";
GRANT ALL ON TABLE "public"."nipost_hotels" TO "authenticated";
GRANT ALL ON TABLE "public"."nipost_hotels" TO "service_role";



GRANT ALL ON TABLE "public"."nipost_offices" TO "anon";
GRANT ALL ON TABLE "public"."nipost_offices" TO "authenticated";
GRANT ALL ON TABLE "public"."nipost_offices" TO "service_role";



GRANT ALL ON TABLE "public"."nipost_officials" TO "anon";
GRANT ALL ON TABLE "public"."nipost_officials" TO "authenticated";
GRANT ALL ON TABLE "public"."nipost_officials" TO "service_role";



GRANT ALL ON TABLE "public"."nipost_regions" TO "anon";
GRANT ALL ON TABLE "public"."nipost_regions" TO "authenticated";
GRANT ALL ON TABLE "public"."nipost_regions" TO "service_role";



GRANT ALL ON TABLE "public"."nipost_taxi" TO "anon";
GRANT ALL ON TABLE "public"."nipost_taxi" TO "authenticated";
GRANT ALL ON TABLE "public"."nipost_taxi" TO "service_role";



GRANT ALL ON TABLE "public"."nipost_user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."nipost_user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."nipost_user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."notification_analytics" TO "anon";
GRANT ALL ON TABLE "public"."notification_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."notification_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."notification_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."notification_logs" TO "anon";
GRANT ALL ON TABLE "public"."notification_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_logs" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notification_queue" TO "anon";
GRANT ALL ON TABLE "public"."notification_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_queue" TO "service_role";



GRANT ALL ON TABLE "public"."notification_templates" TO "anon";
GRANT ALL ON TABLE "public"."notification_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_templates" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."official_permissions" TO "anon";
GRANT ALL ON TABLE "public"."official_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."official_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."payment_provider_config" TO "anon";
GRANT ALL ON TABLE "public"."payment_provider_config" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_provider_config" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."platform_migration_status" TO "anon";
GRANT ALL ON TABLE "public"."platform_migration_status" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_migration_status" TO "service_role";



GRANT ALL ON TABLE "public"."platform_promo_code_usage" TO "anon";
GRANT ALL ON TABLE "public"."platform_promo_code_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_promo_code_usage" TO "service_role";



GRANT ALL ON TABLE "public"."platform_promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."platform_promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_promo_codes" TO "service_role";



GRANT ALL ON TABLE "public"."platform_revenue" TO "anon";
GRANT ALL ON TABLE "public"."platform_revenue" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_revenue" TO "service_role";



GRANT ALL ON TABLE "public"."platform_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT ALL ON TABLE "public"."post_comments" TO "anon";
GRANT ALL ON TABLE "public"."post_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."post_comments" TO "service_role";



GRANT ALL ON TABLE "public"."post_comments_with_profiles" TO "anon";
GRANT ALL ON TABLE "public"."post_comments_with_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."post_comments_with_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."post_likes" TO "anon";
GRANT ALL ON TABLE "public"."post_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."post_likes" TO "service_role";



GRANT ALL ON TABLE "public"."postal_staff" TO "anon";
GRANT ALL ON TABLE "public"."postal_staff" TO "authenticated";
GRANT ALL ON TABLE "public"."postal_staff" TO "service_role";



GRANT ALL ON TABLE "public"."refund_policies" TO "anon";
GRANT ALL ON TABLE "public"."refund_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."refund_policies" TO "service_role";



GRANT ALL ON TABLE "public"."ride_rejections" TO "anon";
GRANT ALL ON TABLE "public"."ride_rejections" TO "authenticated";
GRANT ALL ON TABLE "public"."ride_rejections" TO "service_role";



GRANT ALL ON TABLE "public"."ride_tracking" TO "anon";
GRANT ALL ON TABLE "public"."ride_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."ride_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."rides" TO "anon";
GRANT ALL ON TABLE "public"."rides" TO "authenticated";
GRANT ALL ON TABLE "public"."rides" TO "service_role";



GRANT ALL ON TABLE "public"."role_applications" TO "anon";
GRANT ALL ON TABLE "public"."role_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."role_applications" TO "service_role";



GRANT ALL ON TABLE "public"."room_availability" TO "anon";
GRANT ALL ON TABLE "public"."room_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."room_availability" TO "service_role";



GRANT ALL ON TABLE "public"."room_types" TO "anon";
GRANT ALL ON TABLE "public"."room_types" TO "authenticated";
GRANT ALL ON TABLE "public"."room_types" TO "service_role";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_notifications" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."service_module_mapping" TO "anon";
GRANT ALL ON TABLE "public"."service_module_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."service_module_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."shipping_addresses" TO "anon";
GRANT ALL ON TABLE "public"."shipping_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."shipping_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."social_posts_with_profiles" TO "anon";
GRANT ALL ON TABLE "public"."social_posts_with_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."social_posts_with_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."stories" TO "anon";
GRANT ALL ON TABLE "public"."stories" TO "authenticated";
GRANT ALL ON TABLE "public"."stories" TO "service_role";



GRANT ALL ON TABLE "public"."story_views" TO "anon";
GRANT ALL ON TABLE "public"."story_views" TO "authenticated";
GRANT ALL ON TABLE "public"."story_views" TO "service_role";



GRANT ALL ON TABLE "public"."support_articles" TO "anon";
GRANT ALL ON TABLE "public"."support_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."support_articles" TO "service_role";



GRANT ALL ON TABLE "public"."support_shifts" TO "anon";
GRANT ALL ON TABLE "public"."support_shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."support_shifts" TO "service_role";



GRANT ALL ON TABLE "public"."support_staff" TO "anon";
GRANT ALL ON TABLE "public"."support_staff" TO "authenticated";
GRANT ALL ON TABLE "public"."support_staff" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."surge_pricing_zones" TO "anon";
GRANT ALL ON TABLE "public"."surge_pricing_zones" TO "authenticated";
GRANT ALL ON TABLE "public"."surge_pricing_zones" TO "service_role";



GRANT ALL ON TABLE "public"."taxi_drivers" TO "anon";
GRANT ALL ON TABLE "public"."taxi_drivers" TO "authenticated";
GRANT ALL ON TABLE "public"."taxi_drivers" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_messages" TO "anon";
GRANT ALL ON TABLE "public"."ticket_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_messages" TO "service_role";



GRANT ALL ON TABLE "public"."tour_promo_code_usage" TO "anon";
GRANT ALL ON TABLE "public"."tour_promo_code_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."tour_promo_code_usage" TO "service_role";



GRANT ALL ON TABLE "public"."tour_promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."tour_promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."tour_promo_codes" TO "service_role";



GRANT ALL ON TABLE "public"."unsubscribe_tokens" TO "anon";
GRANT ALL ON TABLE "public"."unsubscribe_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."unsubscribe_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."user_active_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_active_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_active_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_addresses" TO "anon";
GRANT ALL ON TABLE "public"."user_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."user_connections" TO "anon";
GRANT ALL ON TABLE "public"."user_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."user_connections" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_wallets" TO "anon";
GRANT ALL ON TABLE "public"."user_wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."user_wallets" TO "service_role";



GRANT ALL ON TABLE "public"."v_hotels_search" TO "anon";
GRANT ALL ON TABLE "public"."v_hotels_search" TO "authenticated";
GRANT ALL ON TABLE "public"."v_hotels_search" TO "service_role";



GRANT ALL ON TABLE "public"."v_room_availability_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_room_availability_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_room_availability_summary" TO "service_role";



GRANT ALL ON TABLE "public"."vehicle_types" TO "anon";
GRANT ALL ON TABLE "public"."vehicle_types" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicle_types" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_payouts" TO "anon";
GRANT ALL ON TABLE "public"."vendor_payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_payouts" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_profiles" TO "anon";
GRANT ALL ON TABLE "public"."vendor_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_transactions" TO "anon";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";









--
-- Triggers (supplemented from live DB; supabase db dump omits CREATE TRIGGER bindings)
--

CREATE TRIGGER update_ad_campaigns_updated_at BEFORE UPDATE ON public.ad_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_approvals_updated_at BEFORE UPDATE ON public.admin_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_permissions_updated_at BEFORE UPDATE ON public.admin_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_advertiser_profiles_updated_at BEFORE UPDATE ON public.advertiser_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_courier_code_trigger BEFORE INSERT ON public.courier_profiles FOR EACH ROW EXECUTE FUNCTION set_courier_code();
CREATE TRIGGER trigger_courier_approval BEFORE UPDATE OF approval_status ON public.courier_profiles FOR EACH ROW EXECUTE FUNCTION handle_courier_approval();
CREATE TRIGGER update_courier_profiles_updated_at BEFORE UPDATE ON public.courier_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_profiles_updated_at BEFORE UPDATE ON public.customer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_assignment_number_trigger BEFORE INSERT ON public.delivery_assignments FOR EACH ROW EXECUTE FUNCTION set_assignment_number();
CREATE TRIGGER update_delivery_assignments_updated_at BEFORE UPDATE ON public.delivery_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_exceptions_updated_at BEFORE UPDATE ON public.delivery_exceptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_routes_updated_at BEFORE UPDATE ON public.delivery_routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deposit_requirements_updated_at BEFORE UPDATE ON public.deposit_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_driver_profiles_updated_at BEFORE UPDATE ON public.driver_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ecommerce_cart_items_updated_at BEFORE UPDATE ON public.ecommerce_cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ecommerce_carts_updated_at BEFORE UPDATE ON public.ecommerce_carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ecommerce_categories_updated_at BEFORE UPDATE ON public.ecommerce_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ecommerce_orders_updated_at BEFORE UPDATE ON public.ecommerce_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ecommerce_product_reviews_updated_at BEFORE UPDATE ON public.ecommerce_product_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_rating_trigger AFTER INSERT OR DELETE OR UPDATE ON public.ecommerce_product_reviews FOR EACH ROW EXECUTE FUNCTION update_product_rating();
CREATE TRIGGER update_ecommerce_product_variants_updated_at BEFORE UPDATE ON public.ecommerce_product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ecommerce_products_updated_at BEFORE UPDATE ON public.ecommerce_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ecommerce_vendors_updated_at BEFORE UPDATE ON public.ecommerce_vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER edge_function_inventory_updated_at BEFORE UPDATE ON public.edge_function_inventory FOR EACH ROW EXECUTE FUNCTION update_edge_function_inventory_updated_at();
CREATE TRIGGER update_event_promo_codes_updated_at BEFORE UPDATE ON public.event_promo_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_file_metadata_updated_at BEFORE UPDATE ON public.file_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_host_profiles_updated_at BEFORE UPDATE ON public.host_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hotel_bookings_updated_at BEFORE UPDATE ON public.hotel_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hotel_promo_codes_updated_at BEFORE UPDATE ON public.hotel_promo_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hotel_rating_trigger AFTER INSERT OR DELETE OR UPDATE ON public.hotel_reviews FOR EACH ROW EXECUTE FUNCTION update_hotel_rating();
CREATE TRIGGER update_hotel_reviews_updated_at BEFORE UPDATE ON public.hotel_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketplace_promo_codes_updated_at BEFORE UPDATE ON public.marketplace_promo_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_status_updated_at BEFORE UPDATE ON public.message_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversation_last_message_trigger AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();
CREATE TRIGGER update_module_commission_rates_updated_at BEFORE UPDATE ON public.module_commission_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nipost_offices_updated_at BEFORE UPDATE ON public.nipost_offices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nipost_officials_updated_at BEFORE UPDATE ON public.nipost_officials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nipost_regions_updated_at BEFORE UPDATE ON public.nipost_regions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER nipost_permissions_updated_at BEFORE UPDATE ON public.nipost_user_permissions FOR EACH ROW EXECUTE FUNCTION update_nipost_permissions_updated_at();
CREATE TRIGGER update_nipost_user_permissions_updated_at BEFORE UPDATE ON public.nipost_user_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_provider_config_updated_at BEFORE UPDATE ON public.payment_provider_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER audit_payments_service_role AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION log_service_role_action();
CREATE TRIGGER update_platform_promo_codes_updated_at BEFORE UPDATE ON public.platform_promo_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_post_counts_trigger AFTER INSERT OR DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION update_post_counts();
CREATE TRIGGER trigger_postal_staff_approval AFTER UPDATE OF approval_status ON public.postal_staff FOR EACH ROW EXECUTE FUNCTION handle_postal_staff_approval();
CREATE TRIGGER update_refund_policies_updated_at BEFORE UPDATE ON public.refund_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_role_applications_updated_at BEFORE UPDATE ON public.role_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_room_availability_updated_at BEFORE UPDATE ON public.room_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON public.room_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shipping_addresses_updated_at BEFORE UPDATE ON public.shipping_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_articles_updated_at BEFORE UPDATE ON public.support_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_staff_updated_at BEFORE UPDATE ON public.support_staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tour_promo_codes_updated_at BEFORE UPDATE ON public.tour_promo_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_active_roles_updated_at BEFORE UPDATE ON public.user_active_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_connections_updated_at BEFORE UPDATE ON public.user_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER audit_user_profiles_service_role AFTER INSERT OR DELETE OR UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION log_service_role_action();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER on_new_role_granted AFTER INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION handle_new_role();
CREATE TRIGGER update_user_wallets_updated_at BEFORE UPDATE ON public.user_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_profiles_updated_at BEFORE UPDATE ON public.vendor_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
