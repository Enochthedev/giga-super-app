# Giga — Database Security Review (2026-08-19)

Triaged from the Supabase security advisors (165 findings) plus direct queries against the live
schema and the application's real call paths. Ranked by exploitability, not by the advisor's own
labels — several "WARN" items are more dangerous than some "ERROR"s here.

## 🔴 CRITICAL — exploitable now, fix immediately

### S1. Wallet mint/drain — any anon key holder can credit any wallet
`credit_wallet(p_user_id uuid, p_amount numeric)` and `debit_wallet(...)` are `SECURITY DEFINER`,
`EXECUTE`-granted to **anon and authenticated** (`proacl` shows `anon=X`, `authenticated=X`), take
an arbitrary `user_id` + `amount`, and do **no caller authorization** — the body just runs
`UPDATE user_wallets SET balance = balance + p_amount`. The anon key is public by design, so:

```
POST /rest/v1/rpc/credit_wallet
{ "p_user_id": "<any uuid>", "p_amount": 999999999 }
```

mints unlimited balance into any account. Verified by reading the function definition and grants;
**not executed** against production. Legitimate callers use the service_role key
(`payment-queue-service/src/services/wallet.service.ts`), so revoking anon/authenticated is safe.
Same exposure on `encrypt_sensitive_data` / `decrypt_sensitive_data` (no app caller at all).
→ **Fixed in TIER 1** of `migrations/20260819060000_security_advisor_critical_fixes.sql`.

### S2. Forged financial ledger — public can INSERT arbitrary ledger/audit rows
`nipost_financial_ledger` and `nipost_financial_audit` each have an INSERT policy granted to
**PUBLIC** with `WITH CHECK (true)`. RLS is on, but that policy lets any anon/authenticated user
write financial records. Both tables are written only by payment-queue-service and read by
admin-service, both with the service_role key (which has its own "Service role bypass" policy), so
the public policy has no legitimate use.
→ **Fixed in TIER 2** of the migration.

## 🟠 HIGH — misconfigured, needs a scoped fix (left commented in TIER 3)

### S3. "Admin can …" policies that apply to every logged-in user
On `media_content` and `taxi_drivers`, policies named `Admin can view/insert/update …` are granted
to `{authenticated}` with `USING (true)`. The name implies admin-only; the predicate is just
`true`. So **any** logged-in user can read all media and **all driver PII** (license, live
location), and insert/update rows. Fix is to scope them to `public.is_admin_user()` — but confirm
no customer read path relies on the permissive SELECT first. SQL is staged (commented) in TIER 3.

### S4. Self-registration inserts (`postal_staff`, `courier_profiles`)
`*_public_insert` policies let any authenticated user INSERT. This may be intentional (the
`/api/public/apply/*` flow), so not auto-changed. If those routes use the service role, drop the
policies; if they run as the user, tighten `WITH CHECK` to `user_id = auth.uid()`.

## 🟡 MEDIUM — hardening

- **RLS disabled on 9 public tables** (advisor ERROR): all are `function_*` tooling-inventory
  tables plus PostGIS `spatial_ref_sys`. No PII, but world-readable via the anon key. Enable RLS +
  an admin/service-role policy on the `function_*` tables; `spatial_ref_sys` is PostGIS-owned and
  is expected to be flagged — leave it.
- **10 SECURITY DEFINER views** (`active_*`, `v_hotels_search`, `*_with_profiles`): run with the
  view owner's rights, bypassing the querying user's RLS. Recheck each is intended, or recreate
  with `security_invoker = true` (PG15+).
- **51 functions with mutable `search_path`**: add `SET search_path = public, pg_temp` to each
  `SECURITY DEFINER` function to prevent search-path hijacking. Mechanical; batch it.

## 🟢 LOW

- `postgis` and `pg_trgm` installed in `public` (advisor prefers a dedicated `extensions` schema —
  cosmetic, moving PostGIS is disruptive; leave it).
- Auth **leaked-password protection disabled** — enable in Auth settings (one toggle).
- Two public storage buckets (`avatars`, `public-files`) allow listing — expected for public
  buckets; confirm nothing private was uploaded there.

## How to apply

TIER 1 + TIER 2 are safe and ready:

```bash
supabase db push        # applies migrations/20260819060000_security_advisor_critical_fixes.sql
```

or paste the TIER 1/2 SQL into the Supabase SQL editor. TIER 3 needs the confirmations noted above
before uncommenting. Re-run the security advisor afterwards to confirm S1/S2 clear.
