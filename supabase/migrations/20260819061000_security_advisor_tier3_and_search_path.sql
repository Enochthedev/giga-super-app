-- Security advisor remediation — TIER 3 + search_path — 2026-08-19
-- Follows 20260819060000 (TIER 1+2, already applied). All changes here are safe: the
-- application reads taxi_drivers/media_content only via the service_role key (which bypasses
-- RLS), and setting search_path on a function does not change its behaviour.

-- =====================================================================================
-- S3 — "Admin can ..." policies that actually applied to EVERY authenticated user
-- =====================================================================================
-- On taxi_drivers and media_content these policies were granted to {authenticated} with
-- USING (true), exposing all driver PII (license, live location) and all media to any logged-in
-- user, and allowing writes. The live driver table used by the taxi/search services is
-- driver_profiles, not taxi_drivers (which only survives in admin audit-log labels), and
-- media_content is read only by admin-service — both via the service_role key. Re-scoped to
-- real admins via public.is_admin_user(); service-role traffic is unaffected.

DROP POLICY IF EXISTS "Admin can view all drivers" ON public.taxi_drivers;
DROP POLICY IF EXISTS "Admin can insert drivers"   ON public.taxi_drivers;
DROP POLICY IF EXISTS "Admin can update drivers"   ON public.taxi_drivers;
CREATE POLICY "Admins manage drivers" ON public.taxi_drivers
  FOR ALL TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admin can view all media" ON public.media_content;
DROP POLICY IF EXISTS "Admin can insert media"   ON public.media_content;
DROP POLICY IF EXISTS "Admin can update media"   ON public.media_content;
CREATE POLICY "Admins manage media" ON public.media_content
  FOR ALL TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- =====================================================================================
-- Function search_path hardening (advisor: function_search_path_mutable, 51 functions)
-- =====================================================================================
-- A mutable search_path lets a caller who can create objects in an earlier schema hijack
-- unqualified references inside SECURITY DEFINER functions. Pinning it closes that. Behaviour
-- is unchanged because every function already references public objects.
ALTER FUNCTION public.analyze_function_classification() SET search_path = public, pg_temp;
ALTER FUNCTION public.assess_migration_readiness() SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_platform_recommendation(db_intensity integer, compute_intensity integer, memory_intensity integer, io_intensity integer, traffic_pattern text, business_criticality text, security_level text) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_acid_compliance() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_migration_readiness() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_security_compliance() SET search_path = public, pg_temp;
ALTER FUNCTION public.credit_wallet(p_user_id uuid, p_amount numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.debit_wallet(p_user_id uuid, p_amount numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.decrypt_sensitive_data(encrypted_data text) SET search_path = public, pg_temp;
ALTER FUNCTION public.document_table_relationships(target_table text) SET search_path = public, pg_temp;
ALTER FUNCTION public.encrypt_sensitive_data(data text) SET search_path = public, pg_temp;
ALTER FUNCTION public.find_nearby_couriers(search_lat double precision, search_lng double precision, radius_km double precision, limit_count integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.find_nearby_drivers(target_lat double precision, target_lng double precision, radius_km double precision, vehicle_type_filter text) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_assignment_number() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_courier_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_module_summary() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_branch_summary(p_branch_id character varying) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_national_summary() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_nipost_access_level(uid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_nipost_role(uid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_nipost_state_id(uid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_platform_setting(setting_category text, setting_key text, default_value text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_pmg_state(uid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_region_descendants(p_region_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_state_summary(p_state_id character varying) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_access_level(uid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_wallet_balance(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_courier_approval() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_auth_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_postal_staff_approval() SET search_path = public, pg_temp;
ALTER FUNCTION public.has_permission(required_permission text) SET search_path = public, pg_temp;
ALTER FUNCTION public.has_role(required_roles text[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_courier(uid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_dop(uid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_module_admin(uid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_postmaster_general(uid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_region_in_scope(p_target uuid, p_scope uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_regional_manager(uid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.log_service_role_action() SET search_path = public, pg_temp;
ALTER FUNCTION public.mask_sensitive_data(data text, mask_type text) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_assignment_number() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_courier_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_conversation_last_message() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_courier_location(courier_uuid uuid, lat double precision, lng double precision) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_edge_function_inventory_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_hotel_rating() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_nipost_permissions_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_post_counts() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_product_rating() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
