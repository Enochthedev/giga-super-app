-- SECURITY: 10 SECURITY DEFINER views were SELECT-able by anon + authenticated and bypassed the
-- caller's RLS. Verified live that the public anon key could read active_user_profiles (86 rows
-- incl. emails), active_conversations, and active_social_posts. No application code references any
-- of these views (services query base tables directly), so both changes are safe. Applied live
-- 2026-08-19 via the Supabase MCP; this file mirrors it.
ALTER VIEW public.active_user_profiles         SET (security_invoker = true);
ALTER VIEW public.active_messages              SET (security_invoker = true);
ALTER VIEW public.active_conversations         SET (security_invoker = true);
ALTER VIEW public.active_social_posts          SET (security_invoker = true);
ALTER VIEW public.social_posts_with_profiles   SET (security_invoker = true);
ALTER VIEW public.post_comments_with_profiles  SET (security_invoker = true);
ALTER VIEW public.active_hotels                SET (security_invoker = true);
ALTER VIEW public.active_ecommerce_products    SET (security_invoker = true);
ALTER VIEW public.v_hotels_search              SET (security_invoker = true);
ALTER VIEW public.v_room_availability_summary  SET (security_invoker = true);

REVOKE SELECT ON public.active_user_profiles        FROM anon, authenticated;
REVOKE SELECT ON public.active_messages             FROM anon, authenticated;
REVOKE SELECT ON public.active_conversations        FROM anon, authenticated;
REVOKE SELECT ON public.active_social_posts         FROM anon, authenticated;
REVOKE SELECT ON public.social_posts_with_profiles  FROM anon, authenticated;
REVOKE SELECT ON public.post_comments_with_profiles FROM anon, authenticated;
