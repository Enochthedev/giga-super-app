-- Security advisor remediation — 2026-08-19
--
-- Derived from Supabase security advisors (165 findings) after verifying each against the
-- live schema and the application's actual call paths. Only the TIER 1 and TIER 2 changes
-- below are applied here; they are safe because every legitimate caller uses the service_role
-- key (which bypasses these grants/policies). Riskier tightening is left commented in TIER 3
-- for a human decision, so this migration cannot break a working flow.

-- =====================================================================================
-- TIER 1 — CRITICAL: wallet mint/drain exploit
-- =====================================================================================
-- credit_wallet(user_id, amount) and debit_wallet(user_id, amount) are SECURITY DEFINER,
-- were EXECUTE-granted to anon + authenticated, take an arbitrary user_id/amount, and perform
-- NO caller authorization. Any holder of the public anon key could credit or drain any wallet.
-- encrypt/decrypt_sensitive_data expose the app's crypto helpers to the same audience.
-- All four are invoked ONLY by payment-queue-service with the service_role key
-- (payment-queue-service/src/services/wallet.service.ts) — unaffected by these revokes.
REVOKE EXECUTE ON FUNCTION public.credit_wallet(uuid, numeric)      FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.debit_wallet(uuid, numeric)       FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.encrypt_sensitive_data(text)      FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.decrypt_sensitive_data(text)      FROM anon, authenticated, public;
GRANT  EXECUTE ON FUNCTION public.credit_wallet(uuid, numeric)      TO service_role;
GRANT  EXECUTE ON FUNCTION public.debit_wallet(uuid, numeric)       TO service_role;
GRANT  EXECUTE ON FUNCTION public.encrypt_sensitive_data(text)      TO service_role;
GRANT  EXECUTE ON FUNCTION public.decrypt_sensitive_data(text)      TO service_role;

-- =====================================================================================
-- TIER 2 — CRITICAL: forged financial ledger / audit entries
-- =====================================================================================
-- nipost_financial_ledger and nipost_financial_audit each carry an INSERT policy granted to
-- PUBLIC with WITH CHECK (true), letting any anon/authenticated user write arbitrary financial
-- rows. Both tables are written ONLY by payment-queue-service (paymentProcessor / refundService
-- / settlementService) and read by admin-service, both with the service_role key, which has a
-- dedicated "Service role bypass" policy and does not need this grant.
DROP POLICY IF EXISTS financial_ledger_insert ON public.nipost_financial_ledger;
DROP POLICY IF EXISTS financial_audit_insert  ON public.nipost_financial_audit;

-- =====================================================================================
-- TIER 3 — REVIEW BEFORE APPLYING (left commented; may affect app behaviour)
-- =====================================================================================
-- (a) "Admin can ..." policies on media_content and taxi_drivers are granted to {authenticated}
--     with USING (true) / WITH CHECK (true) — despite the name they apply to EVERY logged-in
--     user, exposing all media + all driver PII (license, live location) and allowing writes.
--     Correct fix is to scope them to an admin check, e.g. public.is_admin_user(). Confirm no
--     customer-facing read path depends on the permissive SELECT first.
--
--   DROP POLICY IF EXISTS "Admin can view all media"    ON public.media_content;
--   DROP POLICY IF EXISTS "Admin can insert media"      ON public.media_content;
--   DROP POLICY IF EXISTS "Admin can update media"      ON public.media_content;
--   CREATE POLICY "Admin manage media" ON public.media_content
--     FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
--
--   DROP POLICY IF EXISTS "Admin can view all drivers"  ON public.taxi_drivers;
--   DROP POLICY IF EXISTS "Admin can insert drivers"    ON public.taxi_drivers;
--   DROP POLICY IF EXISTS "Admin can update drivers"    ON public.taxi_drivers;
--   -- plus a driver-owns-own-row policy for the taxi service's own reads.
--
-- (b) postal_staff_public_insert / courier_profiles_public_insert allow any authenticated user
--     to INSERT rows. This MAY be intentional (self-application via /api/public/apply/*). If the
--     apply flow runs through the service role instead, drop these; if it runs as the user,
--     tighten WITH CHECK to (user_id = auth.uid()).
--
-- (c) RLS is disabled on 9 public tables: the function_* tooling-inventory tables and PostGIS's
--     spatial_ref_sys. No PII, but they are world-readable via the anon key. Enable RLS and add
--     an admin-only (or service-role-only) policy on the function_* tables; spatial_ref_sys is a
--     PostGIS-owned reference table and is expected to be flagged — leave it.
--
-- (d) 51 functions have a mutable search_path, 10 SECURITY DEFINER views, and Auth leaked-
--     password protection is off. Lower severity — see docs/SECURITY_REVIEW_2026-08-19.md.
