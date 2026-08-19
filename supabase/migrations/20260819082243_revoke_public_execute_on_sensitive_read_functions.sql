-- SECURITY: SECURITY DEFINER read/tooling functions were EXECUTE-granted to anon + authenticated.
-- get_wallet_balance let anyone read any user's balance (0 app callers); the *_summary / dashboard
-- / sales functions leaked business financials and are called only by admin-service with the
-- service_role key; check_* / document_* / generate_module_summary are internal tooling. Applied
-- live 2026-08-19 via the Supabase MCP (this file mirrors it so migration history matches).
REVOKE EXECUTE ON FUNCTION public.get_wallet_balance(uuid)              FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_giga_dashboard_stats(date, date)  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_national_summary()                FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_state_summary(character varying)  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_branch_summary(character varying) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_sales_comparison(date, date)      FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_category_breakdown()              FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_module_summary()             FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_migration_readiness()           FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_security_compliance()           FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.document_table_relationships(text)    FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.get_wallet_balance(uuid)               TO service_role;
GRANT EXECUTE ON FUNCTION public.get_giga_dashboard_stats(date, date)  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_national_summary()                 TO service_role;
GRANT EXECUTE ON FUNCTION public.get_state_summary(character varying)   TO service_role;
GRANT EXECUTE ON FUNCTION public.get_branch_summary(character varying)  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_sales_comparison(date, date)       TO service_role;
GRANT EXECUTE ON FUNCTION public.get_category_breakdown()               TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_module_summary()              TO service_role;
GRANT EXECUTE ON FUNCTION public.check_migration_readiness()            TO service_role;
GRANT EXECUTE ON FUNCTION public.check_security_compliance()            TO service_role;
GRANT EXECUTE ON FUNCTION public.document_table_relationships(text)     TO service_role;
