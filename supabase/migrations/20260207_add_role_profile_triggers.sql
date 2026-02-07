-- Migration: Add role-specific profile creation trigger
-- Description: Automatically creates driver_profiles, host_profiles, vendor_profiles, or advertiser_profiles
--              when a corresponding role is granted to a user.
-- Date: 2026-02-07

-- ============================================
-- Function: Create role-specific profiles
-- ============================================
CREATE OR REPLACE FUNCTION public.create_role_specific_profile(
  p_user_id UUID,
  p_role_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      -- Note: Check if vendor_profiles table exists, otherwise use ecommerce_vendors
      INSERT INTO public.ecommerce_vendors (user_id, created_at, updated_at)
      VALUES (p_user_id, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING;
      
    WHEN 'ADVERTISER' THEN
      INSERT INTO public.advertiser_profiles (user_id, created_at, updated_at)
      VALUES (p_user_id, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING;
      
    ELSE
      NULL; -- Ignore other roles (CUSTOMER, ADMIN)
  END CASE;
EXCEPTION
  WHEN undefined_table THEN
    RAISE WARNING 'Table for % profile does not exist', p_role_name;
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating % profile for user %: %', p_role_name, p_user_id, SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.create_role_specific_profile IS 
  'Creates role-specific profile entries (driver_profiles, host_profiles, etc.) when a role is granted';

-- ============================================
-- Trigger function: Handle new role grants
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create profiles for specialized roles
  IF NEW.role_name IN ('DRIVER', 'HOST', 'VENDOR', 'ADVERTISER') THEN
    PERFORM public.create_role_specific_profile(NEW.user_id, NEW.role_name);
    RAISE NOTICE 'Created % profile for user %', NEW.role_name, NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_role IS 
  'Trigger function that creates role-specific profiles when new roles are granted';

-- ============================================
-- Trigger: Fire on new role insertion
-- ============================================
DROP TRIGGER IF EXISTS on_new_role_granted ON public.user_roles;

CREATE TRIGGER on_new_role_granted
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_role();

COMMENT ON TRIGGER on_new_role_granted ON public.user_roles IS 
  'Automatically creates role-specific profiles when a new role is granted to a user';

-- ============================================
-- Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION public.create_role_specific_profile(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_role() TO service_role;
