-- ============================================================================
-- Location-based registration in the signup trigger (Phase 1)
--
-- The LIVE signup trigger on auth.users is on_auth_user_created ->
-- handle_new_auth_user(). (handle_new_user() is legacy/unwired but kept in
-- sync below.) This extends the profile creation to:
--   * capture the user's phone (it previously didn't)
--   * resolve and stamp a region_id from (priority order):
--       1. explicit raw_user_meta_data->>'region_id'
--       2. explicit raw_user_meta_data->>'region_code'
--       3. the phone's E.164 dialing code (longest phone_code prefix match)
--
-- Region resolution is wrapped in its own guarded block so malformed input can
-- never abort the rest of user setup.
--
-- Note: the async edge webhook (on-user-signup -> http_request) also upserts
-- the profile afterwards. It does not send a region_id key, so it will not
-- clobber the region set here.
-- ============================================================================

-- Reusable region resolver (kept as a function so both triggers share it).
CREATE OR REPLACE FUNCTION "public"."resolve_signup_region"(
  "p_region_id" "text",
  "p_region_code" "text",
  "p_phone" "text"
) RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_region_id UUID;
BEGIN
  -- 1. Explicit region_id
  IF NULLIF(p_region_id, '') IS NOT NULL THEN
    SELECT id INTO v_region_id FROM public.nipost_regions WHERE id = p_region_id::uuid;
    IF v_region_id IS NOT NULL THEN RETURN v_region_id; END IF;
  END IF;

  -- 2. Explicit region_code
  IF NULLIF(p_region_code, '') IS NOT NULL THEN
    SELECT id INTO v_region_id FROM public.nipost_regions WHERE region_code = p_region_code;
    IF v_region_id IS NOT NULL THEN RETURN v_region_id; END IF;
  END IF;

  -- 3. Derive from phone dialing code (longest prefix wins)
  IF p_phone LIKE '+%' THEN
    SELECT id INTO v_region_id
    FROM public.nipost_regions
    WHERE phone_code IS NOT NULL AND p_phone LIKE phone_code || '%'
    ORDER BY length(phone_code) DESC
    LIMIT 1;
    IF v_region_id IS NOT NULL THEN RETURN v_region_id; END IF;
  END IF;

  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'resolve_signup_region failed: %', SQLERRM;
    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION "public"."resolve_signup_region"("text", "text", "text")
  TO "anon", "authenticated", "service_role";

-- ----------------------------------------------------------------------------
-- LIVE signup trigger function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_phone TEXT;
  v_region_id UUID;
BEGIN
  v_is_admin := (NEW.raw_app_meta_data->>'role' = 'ADMIN');
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone);
  v_region_id := public.resolve_signup_region(
    NEW.raw_user_meta_data->>'region_id',
    NEW.raw_user_meta_data->>'region_code',
    v_phone
  );

  -- 1. Create user profile (for all users)
  INSERT INTO public.user_profiles (
    id, email, phone, first_name, last_name, region_id, is_active, created_at, updated_at
  )
  VALUES (
    NEW.id, NEW.email, v_phone,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    v_region_id, true, NOW(), NOW()
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
    INSERT INTO public.user_roles (user_id, role_name, granted_at)
    VALUES (NEW.id, 'ADMIN', NOW())
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_active_roles (user_id, active_role, updated_at)
    VALUES (NEW.id, 'ADMIN', NOW())
    ON CONFLICT (user_id) DO UPDATE SET active_role = 'ADMIN', updated_at = NOW();
  ELSE
    INSERT INTO public.user_roles (user_id, role_name, granted_at)
    VALUES (NEW.id, 'CUSTOMER', NOW())
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_active_roles (user_id, active_role, updated_at)
    VALUES (NEW.id, 'CUSTOMER', NOW())
    ON CONFLICT (user_id) DO UPDATE SET active_role = 'CUSTOMER', updated_at = NOW();
  END IF;

  -- 4. Create wallet ONLY for regular customers (not admins)
  IF NOT v_is_admin THEN
    INSERT INTO public.user_wallets (
      user_id, balance, currency, is_active, is_locked, created_at, updated_at
    )
    VALUES (NEW.id, 0.00, 'NGN', true, false, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_auth_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "public"."handle_new_auth_user"() IS 'Signup trigger: creates user_profile (with phone + location-based region tag), customer_profile, role, and wallet.';

-- ----------------------------------------------------------------------------
-- Legacy function kept in sync (not currently wired to a trigger)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_phone TEXT;
  v_region_id UUID;
BEGIN
  v_is_admin := (NEW.raw_app_meta_data->>'role' = 'ADMIN');
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone);
  v_region_id := public.resolve_signup_region(
    NEW.raw_user_meta_data->>'region_id',
    NEW.raw_user_meta_data->>'region_code',
    v_phone
  );

  INSERT INTO public.user_profiles (
    id, email, phone, first_name, last_name, region_id, is_active, created_at, updated_at
  )
  VALUES (
    NEW.id, NEW.email, v_phone,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    v_region_id, true, NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  IF NOT v_is_admin THEN
    INSERT INTO public.customer_profiles (user_id)
    VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  END IF;

  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role_name, granted_at)
    VALUES (NEW.id, 'ADMIN', NOW()) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_active_roles (user_id, active_role, updated_at)
    VALUES (NEW.id, 'ADMIN', NOW())
    ON CONFLICT (user_id) DO UPDATE SET active_role = 'ADMIN', updated_at = NOW();
  ELSE
    INSERT INTO public.user_roles (user_id, role_name, granted_at)
    VALUES (NEW.id, 'CUSTOMER', NOW()) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_active_roles (user_id, active_role, updated_at)
    VALUES (NEW.id, 'CUSTOMER', NOW())
    ON CONFLICT (user_id) DO UPDATE SET active_role = 'CUSTOMER', updated_at = NOW();
  END IF;

  IF NOT v_is_admin THEN
    INSERT INTO public.user_wallets (user_id, balance, currency, created_at, updated_at)
    VALUES (NEW.id, 0.00, 'NGN', NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
