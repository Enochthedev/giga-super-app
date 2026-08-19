-- second overload of get_platform_setting(category, key, default) — same reasoning as the
-- single-arg form. Applied live 2026-08-19 via the Supabase MCP; this file mirrors it.
REVOKE EXECUTE ON FUNCTION public.get_platform_setting(text, text, text) FROM anon, authenticated, public;
GRANT  EXECUTE ON FUNCTION public.get_platform_setting(text, text, text) TO service_role;
