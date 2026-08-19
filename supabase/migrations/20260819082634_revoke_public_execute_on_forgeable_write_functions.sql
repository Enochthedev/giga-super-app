-- SECURITY: SECURITY DEFINER functions that take a caller-supplied p_user_id / courier_uuid were
-- EXECUTE-granted to anon + authenticated, so any public-key holder could act AS ANY USER (post,
-- comment, like as someone else, move any courier, create role profiles). Social write RPCs are
-- called by social-service with the service_role key; the rest have no application RPC caller.
-- Applied live 2026-08-19 via the Supabase MCP; this file mirrors it.
REVOKE EXECUTE ON FUNCTION public.create_social_post(uuid, text, text[], text, uuid)  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_post_comment(uuid, uuid, text, uuid)          FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.toggle_post_like(uuid, uuid, uuid)                   FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_role_specific_profile(uuid, text)             FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_courier_location(uuid, double precision, double precision) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_platform_setting(text)                           FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.create_social_post(uuid, text, text[], text, uuid)   TO service_role;
GRANT EXECUTE ON FUNCTION public.create_post_comment(uuid, uuid, text, uuid)           TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_post_like(uuid, uuid, uuid)                    TO service_role;
GRANT EXECUTE ON FUNCTION public.create_role_specific_profile(uuid, text)              TO service_role;
GRANT EXECUTE ON FUNCTION public.update_courier_location(uuid, double precision, double precision)  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_setting(text)                            TO service_role;
