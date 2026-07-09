# Giga Full E2E QA — Error Log (2026-07-07)

Live e2e against the production gateway (`https://giga-giga-production.up.railway.app`) with QA
users `qa.customer1@gigaqa.test` (customer) + `qa.admin@gigaqa.test` (admin). Four passes:
(1) broad sweep, (2) re-test failures against **real** route defs, (3) deep write-flow lifecycles
+ real multipart uploads + direct-vs-gateway diagnostics, (4) test-data-dependent flows (booking,
cart, payments). This log contains only **genuine defects** — wrong-path guesses were filtered out.

Legend: 🔴 blocker · 🟠 broken feature · 🟡 gap/minor · ✅ verified working

---

## 🛠️ FIX LOG (branch `fix/qa-e2e-batch-2026-07-08`, 2026-07-08/09)

**✅ VERIFIED LIVE 2026-07-09** (12/12 pass through prod gateway): E9 addresses GET→200, E6 /connections→200,
E5b /social/friends→200, E10 /hotels/recommended→200, E8 apply-vendor→400, E18 story viewers→200,
E3 booking cancel→200 (migration applied), E20 analytics routing (now reaches service; 403 = A2 role issue, not routing),
E17 ad approve bad id→404, E39 admin ecommerce→200, E16 staff approve w/o account→400.
Also: 48 dead edge fns deleted (98→50); 4 edge fixes deployed (checkout-cart/Paystack-webhook/apply-vendor/add-user-address).
A2 remains: notifications-service `requireAdmin` doesn't accept the NIPOST/DOP role → admin notif analytics/templates 403.


**Applied (code, typechecks clean):**
- **E18** story_views `viewer_id`→`user_id` (+ viewers query) — `social-service/routes/stories.ts`
- **E25** hotel review response `response_date`→`responded_at` — `hotels-service/routes/management.ts`
- **E37** admin order select `shipping_fee`→`shipping_fee:shipping_cost`, `shipping_address`→`shipping_address_id`, drop `notes` — `search-service/routes/admin.ts`
- **E38** drop non-existent `device_type` from analytics select (degrades to "Unknown") — `admin-service/routes/modules/ecommerce-analytics.ts`
- **E39** `price`→`price:base_price` alias — `admin-service/routes/business-modules.ts`
- **E27** remove `updated_at` writes to notification_logs (no such col) — `notifications-service/index.ts` + `routes/notifications.ts`
- **E16** guard `postal_staff` approve when `user_id` is null → clean 400 — `admin-service/routes/business-modules.ts`
- **E10** constrain hotels `/:id` to UUID so `/recommended` resolves — `hotels-service/routes/hotels.ts`
- **E6** add `/api/v1/connection*` to social patterns — `api-gateway/services/serviceRegistry.ts`
- **E20** add `/api/v1/analytics*` to notifications patterns — `api-gateway/services/serviceRegistry.ts`
- **E41** payment_type `'ecommerce'`→`'ecommerce_order'` — `supabase/functions/checkout-cart` *(needs deploy)*
- **E42** drop invalid `rides.status='confirmed'` write — `supabase/functions/Paystack-webhook` *(needs deploy)*

**RETRACTED — false positives (auditor caught a nested/interface key, verified NOT bugs):**
- ~~E26~~ `notifications.fare` — `fare` is nested inside the `data` jsonb; `notifications` has data/message/title/type/user_id. Valid.
- ~~E28~~ `notification_logs.recipient` — the insert correctly uses `recipient_email/phone/device_token`; flag came from a TS interface field.

**Applied (batch 2):**
- **E17** ad approve/reject `.single()`→`.maybeSingle()` (non-existent id → 404 not 500) — `admin-service/routes/advertisements.ts`
- **E29 (partial)** `advertisements`→`ad_campaigns` for the 3 schema-compatible queries — `dashboard.ts:60`, `media.ts:476`, `media.ts:595`.
  ⚠️ `media.ts:292` (list) + `:370` (detail) still reference `advertisements` — they select `title/media_url/media_type/placement`
  + join `advertiser_profiles`, which don't map cleanly to `ad_campaigns` (has `campaign_name`, `creative_assets`, `landing_url`).
  **Needs schema-mapping rework**, left as-is.
- **E5b** `/api/v1/social/friends` → `/api/v1/connections` alias — `api-gateway/middleware/routing.ts`
- **E8** apply-vendor: validate `business_name`/`bank_details` → 400 not 500 *(edge fn, needs deploy)*
- **E9** add-user-address: GET now lists addresses instead of crashing on empty body *(edge fn, needs deploy)*

**Still to do:** E19 (campaigns namespacing — decision), E15 (deactivate cascade — needs trigger/migration),
E43 (accept hang — needs taxi Railway logs), E44 (build product-create), E45 (WS proxy), E29 media.ts rework,
E32/E33/E34/E35/E36 (edge-fn fixes, need deploy), migrations (E3/E23/E24), infra/deploy (E1/E5/E30).

---

## ✅ Verified working end-to-end
- **Auth**: login, bad-password 400, refresh validation.
- **User profile**: get (`/user/profile`, `/users/profile`), update.
- **Social (full lifecycle)**: create post → get → comment → list comments → like → unlike →
  report → create story → delete post. All 200/201.
- **Uploads (multipart, real bytes)**: `POST /api/v1/users/profile/picture` ✅ 200,
  `POST /api/v1/media/upload` (file+entityType+entityId+accessLevel) ✅ 200.
- **Notifications (read)**: history, `/api/v1/preferences` GET+PUT, stats.
- **Search**: `/api/v1/search/products`, `/api/v1/search`, `/api/v1/search/hotels`, `/api/v1/users/search`.
- **Hotels (booking flow)**: search → detail (with room_types) → availability → `bookings/price`
  → `bookings/create` → get booking → **pay** (`payments/initialize` hotel_booking). All 200. *(cancel broken — E7.)*
- **Taxi (read/estimate)**: `rides/estimate`, `rides/history`, `rides/active`, `drivers/nearby`.
- **Delivery**: `couriers`, `cart` GET.
- **Payments/initialize (Node, mock)**: valid `moduleType` ∈ **{hotel_booking, ecommerce_order, taxi_ride}** → 200.

---

## 🔴 Blockers

### B1. Admin module fully inaccessible — `qa.admin` has no `nipost_user_permissions` row
- Every admin endpoint → 403 `NO_PERMISSIONS` (`/dashboard/stats`, `/pending-entries`,
  `/admin/users`, `/admin/regions`, `/managers/ecommerce/orders/latest`).
- **Confirmed via DB**: qa.admin has 0 permission rows. The 2 real `DOP` admins also **lack `ads:approve`**.
- **Blocks ALL admin E2E** (dashboard, orders list/detail, pending-entries approve/reject, roles/review, regions, users, ad approvals).
- **ACTION REQUIRED (you must run — a production RBAC grant was blocked for the agent):**
  ```sql
  insert into nipost_user_permissions (user_id, role, access_level, is_active, permissions)
  values ('61ed32f6-e219-4b74-82d7-4500a2d3c86d','DOP','national',true,
          array['ecommerce','taxi','hotel','postal_monitoring','platform_settings',
                'financial_ledger','user_management','approve_staff','ads:approve']);
  -- and fix the 2 real admins:
  update nipost_user_permissions set permissions = array_append(permissions,'ads:approve')
  where role='DOP' and not ('ads:approve' = any(permissions));
  ```
  Once run, ping me and I'll run the full admin-side E2E (currently 0% reachable).

---

## 🟠 Broken features (real bugs)

### E1. Wallet completely broken — edge functions reject valid user tokens
- `GET /api/v1/wallet/balance`, `POST /api/v1/wallet/topup`, `/wallet/pay` → 400 `Authentication required`.
- **Isolated**: calling the edge fn **directly** (bypassing the gateway) with the **same token** fails identically,
  while `get-user-profile` **direct with that same token → 200**. Token/JWT-secret are fine.
- The wallet fns (`Topup-wallet`, `Get-vendor-balance`, `Pay-with-wallet`) have auth code **byte-identical**
  to the working `get-user-profile`, same project-wide env → the **deployed bundles are stale/broken**.
- **Fix**: redeploy the three wallet functions; if still failing, debug their `auth.getUser()` at runtime.
- Note also: `/wallet/balance` is mapped to **`Get-vendor-balance`** (service-providers only) — wrong fn for a customer wallet.

### E2. Taxi ride CREATE returns 404 — core booking path dead
- `POST /api/v1/rides` → 404 `Cannot POST /api/v1/rides` — yet `rides/estimate`, `rides/history`,
  `rides/active` all work. The bare `/api/v1/rides` (GET+POST) isn't routed to the taxi service
  (mounts `/api/rides`); subpaths are, the root isn't. **Riders cannot request a ride.**
- **Fix**: add the gateway rewrite / service mount so `POST /api/v1/rides` reaches `ridesRouter` `POST /`.

### E3. Hotel booking CANCEL fails — missing DB column
- `POST /api/v1/bookings/:id/cancel` → 400 `Could not find the 'refund_amount' column of 'hotel_bookings'`.
- The cancel handler writes `refund_amount`, which doesn't exist on `hotel_bookings`.
- **Fix**: add the column (migration) or stop writing it. *(Left a test booking `f648cba5-…` un-cancelled because of this.)*

### E4. Support ticket CREATE 404 — `create-support-ticket` edge fn not deployed
- `POST /api/v1/support/tickets/create` → 404 `Requested function was not found` (GET `/support/tickets` works).
- Confirmed via Management API: `create-support-ticket` **MISSING** (undeployed).
- **Fix**: deploy it (blocked by the ~103 function cap — free a slot).

### E5. Ads module entirely down — all ad edge functions undeployed
- Every `/api/v1/ads/*` → 404 `Requested function was not found`.
- Confirmed MISSING: `get-ad-campaigns`, `fetch-ads`, `get-my-campaigns`, `create-ad-campaign`, `get-advertiser-profile`.
- **Fix**: free function slots and deploy, or migrate ads to a Railway service.

### E6. Social connections unreachable — gateway routing gap
- `GET/POST /api/v1/connections`, `GET /api/v1/connections/requests` → 404 `SERVICE_NOT_FOUND`.
- social-service serves `/api/v1/connections` (index.ts:135) but the gateway `serviceRegistry` social
  patterns lack `/api/v1/connection*`. **Add friend / list friends / accept requests all fail.**
- **Fix**: add `'/api/v1/connection*'` to Social patterns in `api-gateway/src/services/serviceRegistry.ts`.
  Also E6b: `/api/v1/social/friends` alias 404s (maps to `get-friends`/`/friends`; real route is `/connections`).

### E7. `notifications/send` 500 — record insert fails
- `POST /api/v1/notifications/send` with a **valid** `type=push` + recipient → 500 `Failed to create notification record`.
- **Fix**: check the insert against `notifications` schema. Also: `type` only accepts `email|sms|push` —
  there is **no `in_app`** type (mobile may expect it).

### E8. `apply-vendor` 500 on missing fields
- `POST /api/v1/vendors/apply` → 500 `Cannot read properties of undefined (reading 'bank_name')`.
- Crashes instead of validating when bank details are absent. **Fix**: validate → 400.

### E9. `add-user-address` GET crashes
- `GET /api/v1/user/addresses` → 500 `Unexpected end of JSON input` / connection reset.
- Edge fn parses JSON body on a GET. **Fix**: guard empty-body/GET.

### E10. Hotels `/recommended` route-ordering bug
- `GET /api/v1/hotels/recommended` → 400 `invalid input syntax for type uuid: "recommended"`.
- `GET /:id` (hotels.ts ~163) is registered before `GET /recommended` (~507). **Fix**: move literal routes above `/:id`.

### E11. `drivers/availability` PUT 500 for non-driver
- `PUT /api/v1/drivers/availability` → 500 `Cannot coerce the result to a single JSON object` (`.single()` on no row).
- Should be 404/400. Also blocks a driver toggling online if no `driver_profiles` row exists yet. **Fix**: handle no-row.

---

## 🔀 Cross-module data-reflection flows (two users: C1 + C2)

Tested that data created in one place actually shows up elsewhere. **14/17 assertions passed.**

**✅ Propagates correctly:**
- C1 creates a public post → shows in C1's own posts list, C1's feed, **C2's feed**, and C2 can open it.
- C2's comment shows in C1's comment list; **like_count** increments (0→1) as C1 sees it.
- Avatar upload → reflects in `GET /user/profile` **and** in the post author metadata (social reads `avatar_url` live).
- Hotel booking → reflects in `GET /api/v1/bookings`.

**❌ Does NOT reflect (real bugs):**

### E12. `comment_count` never increments
- A comment is created (201) and appears in the comment list, but the post's `comment_count` stays **0**
  (fields present: `like_count`, `comment_count`, `share_count`, `view_count`; only comment_count is broken —
  like_count works). The `create_post_comment` path doesn't bump the denormalized counter. **Every post shows 0 comments in the UI.**
- **Fix**: increment `comment_count` (trigger or in the RPC), like likes do.

### E13. Social interactions generate NO notifications
- C2 comments on and likes C1's post → C1's `notifications/history` stays **empty (0)** before and after.
  Authors are **never notified** of likes/comments/etc. Social→notifications is not wired (or not firing).
- **Fix**: emit a notification on comment/like/connection events. (Confirm intended behavior first.)

### E14. Avatar does not reflect in user search results
- After avatar upload, `GET /api/v1/users/search` for C1 does **not** contain the new `avatar_url`
  (it does reflect in profile + post author). The `search-users` edge fn returns no/stale avatar.
  This is the long-standing avatar-propagation concern — still present on the **search** surface specifically.
- **Fix**: have `search-users` select/return `avatar_url` (and refresh any index).

## 🟠 Admin (found via code + live-DB audit; endpoint e2e still blocked on B1)

### E15. Deactivating a staff member does not revoke their access — "failure to deactivate staff"
- `DELETE /api/postal/staff/:id` (business-modules.ts:2662) sets `postal_staff.is_active=false` + `deleted_at`.
  Columns exist, so the write succeeds — but **only trigger on `postal_staff` is `trigger_postal_staff_approval`,
  which fires `AFTER UPDATE OF approval_status`**. Deactivation changes `is_active`/`deleted_at`, NOT
  `approval_status` → the trigger never runs → the staff's `user_roles` / `nipost_user_permissions` are
  **never revoked**. The person stays functionally active (can still log in / act). This matches the "deactivate fails" report.
- Also the PUT `/postal/staff/:id` update handler strips `approval_status` (line 2490), so you can't flip status that way either.
- **Fix**: on deactivate/soft-delete, also revoke `user_roles`/`user_active_roles`/`nipost_user_permissions`
  for `postal_staff.user_id` (add a trigger on `is_active`/`deleted_at`, or do it in the handler).

### ✅ Admin LIVE e2e (2026-07-08, qa.admin granted DOP national) — B1 unblocked
Reads all green: `dashboard/stats` + `sales`, `managers/{dashboard-stats,chart-data,performance-metrics,latest-orders}`,
`managers/ecommerce/orders` (**20 orders returned — prior "orders not showing" complaint RESOLVED**),
`managers/ecommerce/orders/latest`, `managers/ecommerce/vendors`, `pending-entries` (+ all 7 modules, real data),
`postal/staff` + `staff-stats`, `nipost-admin/{postal-staff,couriers}/applications`, `admin/users`, `admin/regions`,
`postal-monitoring/dashboard`, `managers/taxi/dashboard-stats`, `managers/hotel/dashboard-stats`, `ads/incoming`.
Mutations: staff **create** ✅ + appears in list ✅; **deactivate** (DELETE) flips `is_active→false`+`deleted_at` and
drops from the list ✅. Permission gate now passes for `ads/:id/approve|reject` and `roles/review` (reach handlers, not 403).
*(404s on bare `/api/managers`, `/api/postal-monitoring`, `/api/ads` are just missing index routes — real subpaths work.)*

### E16. Staff APPROVE 500s when the member has no linked account — likely the "approvals fail" complaint
- `POST /api/postal/staff/:id/approve` (business-modules.ts:2539) → **500** for a freshly-created staff.
- Root cause: trigger `handle_postal_staff_approval` does `IF NEW.user_id IS NULL THEN RAISE EXCEPTION 'user_id must
  be set before approval'`. Staff are created **without** a `user_id` (they sign up later), and this endpoint —
  unlike the `nipost-admin` approve path — has **no guard**, so the trigger's exception surfaces as a raw 500.
- **Fix**: guard `user_id IS NULL` → clean 400 (mirror the nipost-admin path: "staff member hasn't created their account yet").

### E17. Ad approve 500s on a non-existent id (should be 404)
- `POST /api/ads/:id/approve` with an unknown id → 500 `Failed to approve advertisement` (`.single()` coercion on no row).
  Same error-handling pattern as E11. Reject correctly validates (400). **Fix**: handle no-row → 404.

### ⚠️ Real DOP admins still lack `ads:approve` (prod)
The qa.admin grant included it, but the **two real production DOP admins do not** — their ad approve/reject will still
403 in production. Run the `array_append` update in B1 for them.

### A1. Approvals audit (pending-entries approve/reject) — writes are schema-correct
- `POST /api/pending-entries/:module/:id/approve|reject` payloads verified against live schema: products/hotels/media
  use `approval_status/approved_by/approved_at/rejection_reason`; drivers/sellers/hosts/advertisers →
  `role_applications` use `status/reviewed_by/reviewed_at`. **All columns exist** → the update itself won't 500.
- So "approvals don't reflect" is NOT a column bug. Most likely: the **permission gate** (DOP admins lack
  `ads:approve`; panel role not in `requireAdmin`) or a **listing-reflection** gap (approved entity still filtered out
  of the customer listing by a different flag). ⚠️ Needs live admin e2e (blocked on B1 / admin token) to pin down.

## 🟠 Wave 1 (secondary/no-account endpoints, 2026-07-08)

Verified working: social post edit, comment edit/delete, like/users, feed trending/following, story create/get/delete,
favorites add/check/remove, hotel reviews GET + my-reviews, drivers/earnings, preferences check/quiet-hours,
search/drivers, auth/me, change-password (rejects wrong pw), reset-password (rejects bad OTP). New bugs:

### E18. `GET /api/v1/stories/:id/viewers` → 500
- Reached handler, `Failed to fetch story viewers`. **Fix**: check the viewers query/table.

### E19. `/api/v1/campaigns` shadowed — notification campaigns unreachable
- `GET /api/v1/campaigns` → 404 `Requested function was not found`. Registry routes `/api/v1/campaigns*` to the
  **Ads (supabase)** service, shadowing notifications-service's `/api/v1/campaigns` router. **Fix**: disambiguate
  (e.g. move notif campaigns under `/api/v1/notifications/campaigns`, or remove the dead ads-supabase pattern).

### E20. `/api/v1/analytics/*` → 404 SERVICE_NOT_FOUND — notification analytics unreachable
- No gateway registry pattern for `/api/v1/analytics*` → notifications-service analytics (`delivery-rates`,
  `engagement`, `volume`, `templates`, `users`) can't be reached. **Fix**: add the pattern or namespace under notifications.

### E21. Payment-queue extra routes are unmounted — `queue/stats`, `refund`, `request`, `:id/status` all 404
- `GET /api/v1/payments/queue/stats`, `POST /api/v1/payments/refund` → 404 `Route not found` (Node).
  Only `payments/initialize` (+ verify on edge) is wired; `routes/payments.ts` is not mounted. **Fix**: mount them or drop from the contract.

### E22. Search pagination param rejected — `page` fails number validation
- `GET /api/v1/search/products?q=hotel&page=1` and `/search/hotels?...&page=1` → 400 VALIDATION_ERROR
  (`invalid_type, expected number`). `page` isn't coerced from the query string → **any paginated search 400s**.
  **Fix**: `z.coerce.number()` for page/limit.

### A2. Notifications admin endpoints 403 for NIPOST admin (verify)
- `GET /api/v1/templates` → 403 `Admin privileges required` even as qa.admin (DOP). notifications-service's
  `requireAdmin` may not recognize the NIPOST/gateway-forwarded role. Needs confirming what role claim it checks.

## 🔬 Static schema audit (full DB schema vs every service's writes, 2026-07-08)

Dumped the whole live schema (142 tables / 2368 cols) and checked every `.from().update()/.insert()`
against it. Verified column/table mismatches below (these fail or silently error at runtime):

### Missing columns (confirmed against live schema)
- **E18 root cause** — `story_views` has `user_id`, but `social-service/routes/stories.ts:291` inserts **`viewer_id`**
  (and reads `view_count`, also absent) → this is why `GET /stories/:id/viewers` 500s. Fix: use `user_id`.
- **E23** — `hotels-service/routes/reviews.ts:143` sets `hotel_bookings.has_review` — **column doesn't exist** → posting a review errors.
- **E24** — `hotels-service/routes/management.ts:736` sets `hotel_bookings.host_notes` — **missing** → host notes on booking fail.
- **E25** — `hotels-service/routes/management.ts:943` sets `hotel_reviews.response_date` — real col is **`responded_at`** → host review-response fails.
- **E26** — `taxi-realtime/routes/rides.ts:695` inserts `fare` into `notifications` — **not a column** (has title/type/user_id) → ride-event notification insert fails.
- **E27** — `notification_logs` has **no `updated_at`**; `notifications-service/index.ts:402` + `routes/notifications.ts:717` update it → those updates fail.
- **E28** — `notifications-service/index.ts:897` inserts `notification_logs.recipient` — **missing** (likely `recipient_id`).
- (E3 refund_amount reconfirmed — `hotel_bookings` has only `cancellation_reason`, not `refund_amount`.)

### Missing / renamed tables (referenced by live code)
- **E29** — admin queries `advertisements` (real table is **`ad_campaigns`**): `admin-service/routes/dashboard.ts:60`
  + `routes/modules/media.ts:{292,370,476,595}` → admin ad dashboard stat + media ad management broken.
- **E30** — `payment-queue-service` references tables that **don't exist**: `transactions`, `payment_requests`,
  `settlements`, `webhook_logs`, `refunds` (real: `refund_policies`), `commission_rules` (real: `module_commission_rates`),
  `user_notification_preferences`. Across `controllers/{admin,payment}.controller.ts` + `queues/workers/{payment,refund,settlement,webhook}.worker.ts`.
  → the refund/settlement/webhook/commission machinery is non-functional (ties to E21 — these paths are unmounted/dead). **Paystack webhook processing would crash.**
- **E31 (minor)** — `delivery-service` refs missing `route_optimizations` (routeOptimization.ts) + `deliveries` (simple-index.ts, likely dead entrypoint);
  `social-service/utils/tenant-database.ts:263` refs missing `usage_events` (multi-tenant usage metering).

### Edge functions (Deno) — same class, verified against live schema
- **E32** — `ecommerce_promo_codes` **doesn't exist** (real: `marketplace_promo_codes`/`platform_promo_codes`);
  referenced by `add-to-cart` + `Calculate-booking-price` → **promo-code application in cart & booking price is broken**.
- **E33** — `hotel_review_votes` **doesn't exist** → `mark-review-helpful` edge fn broken.
- **E34** — `admin_profiles` **doesn't exist** → `update-platform-setting` edge fn broken.
- **E35** — `create-hotel-promo-code` inserts `min_spend`/`max_discount`; real cols are **`min_order_amount`/`max_discount_amount`** → creating a hotel promo code fails.
- **E36** — `notification_queue` has **no `backoff`** column → `process-notification-queue` retry/backoff update fails (breaks notification delivery retries).
- (E26 reconfirmed — `complete-ride` edge fn also inserts `notifications.fare`.)

### SELECT/filter column mismatches (queries that 400)
- **E37** — `search-service/routes/admin.ts:{637,1308}` selects `ecommerce_orders.shipping_address` + `shipping_fee`;
  real cols are **`shipping_address_id`** + **`shipping_cost`** → admin order list/export queries 400.
- **E38** — `admin-service/routes/modules/ecommerce-analytics.ts:361` selects `ecommerce_orders.device_type` — **missing** → that analytics query 400s.
- **E39** — `admin-service/routes/business-modules.ts:794` selects `ecommerce_products.price`; real cols are **`base_price`/`final_price`** → ecommerce module dashboard recent-products 400s.
- **E40** — `notifications-service/routes/campaigns.ts:734` selects `user_profiles.notification_preferences` + `push_token` — **neither exists** → notification-campaign targeting/send broken (push tokens live in a separate table).
- (E18 triple-confirmed — `stories.ts:287` also filters `story_views.eq(viewer_id)`.)

### Enum / CHECK-constraint violations (insert/update rejected by DB → 500)
- **E41** — `checkout-cart` (edge fn) inserts `payments.payment_type = 'ecommerce'`, but the CHECK allows only
  `ad_campaign|ecommerce_order|hotel_booking|taxi_ride` → **cart checkout payment insert 500s** (breaks paid checkout).
- **E42** — `Paystack-webhook` sets `rides.status = 'confirmed'`, but rides.status CHECK allows only
  `accepted|arrived|cancelled|completed|in_progress|no_show` → **paying for a ride never confirms it** (webhook update rejected).

> Note: some of the above are in fire-and-forget/try-catch paths, so the parent request may still 200 while the
> side-effect (log/notification/flag) silently fails. All are real and worth fixing; severity depends on whether the
> feature is user-visible (E18/E23/E25/E29 are) vs background (E27/E28/E30).

## 🟠 Provider-side live e2e (2026-07-08, throwaway driver/vendor/courier state for qa.customer2)

Driver reads all work with a profile present: `drivers/profile`, `stats`, `earnings`, `availability` (PUT),
`location` (PUT), `nearby` — all 200. (Confirms E11 was only the no-profile 500 edge case.) Courier profile read
(`couriers/user/:id`) 200; package create reachable (validates). But the core write flows are broken:

### E43. Ride ACCEPT hangs → 502 (ride never progresses) — core taxi flow dead
- `POST /api/v1/rides/:id/accept` **hangs and returns 502 "Application failed to respond" after 60s**. Verified in DB:
  the ride stays `status=requested`, `driver_id=null` — the update never commits. `start` also hangs; `complete`/`rate`
  then fail (`Only the assigned driver can complete`, `Can only rate completed rides`). **Riders can never be picked up.**
- Not a DB trigger (`rides` only has a benign `updated_at` trigger). Hang is in the handler before its UPDATE commits —
  prime suspects: `getDistanceAndDuration` (Google Maps, no key/timeout) or the passenger-notification call blocking.
  **Fix**: add timeouts / make the maps + notification calls non-blocking; check taxi-realtime Railway logs to pin it.
  **Update (2026-07-09):** `getDistanceAndDuration` is **ruled out** — it has a 5s timeout + a no-key fallback, and
  logs show it correctly falling back on a Maps 403. Logs during the hang show `BadRequestError: request aborted`
  (client disconnect). The ride never leaves `requested`, so the hang is before the UPDATE commits but after the two
  cheap lookups. Estimate (same service, POST+body) works, so not general body-forwarding. Prime remaining suspects:
  a **row-lock/contention** cascade (a prior hung accept holding the row) or a service-level stall. **Needs a fresh
  log capture taken during a single clean accept attempt** to pin — best done interactively.

### E44. No product-create endpoint — vendors can't add products
- `POST /api/v1/products` → 404 `Requested function was not found` (no create-product edge fn / route). With no way to
  create products via the API, the catalog stays empty (explains G4). **Fix**: build/deploy a vendor product-create endpoint.

### E45. Real-time WebSocket not exposed through the gateway
- Taxi-realtime runs socket.io (live driver location, ride push; redis-adapter) but the **gateway has no WS/upgrade
  proxying**, and `/socket.io/` is gated behind a Bearer header the handshake can't send (→ AUTHENTICATION_REQUIRED).
  So live tracking / real-time ride & delivery updates are **unreachable for any client hitting the public gateway**.
  **Fix**: add WebSocket upgrade proxying in the gateway (or a dedicated WS route) + a handshake-compatible auth scheme.

### E1 reconfirmed (vendor): `wallet/balance` + `vendors/balance` still 400 "Authentication required" even for a real vendor → it's the edge-fn JWT rejection, not a role issue.

## 🟡 Gaps / minor

- **G1**: No customer order-listing endpoint — `GET /api/v1/orders` 404 (no `get-orders`/`get-user-orders` fn).
- **G2**: No product-catalog listing endpoint — `GET /api/v1/products` 404. Browsing only via search.
- **G3**: `/api/v1/products/search|categories|trending` dead — shadowed by the supabase `/api/v1/product*` registry pattern (registered before search-service). Canonical `/api/v1/search/products` works.
- **G4**: Product search returned **0 results** for "phone" — catalog/Algolia index coverage unverified (couldn't add to cart → checkout because no product ids came back; `cart/checkout` correctly 400s "Cart is empty").
- **G5**: `bookings/price` accepts **camelCase only** (`hotelId/roomTypeId/checkInDate`), while `bookings/create` accepts both camel + snake. Inconsistent contract.
- **G6**: `payments/initialize` rejects `moduleType` `wallet_topup`/`order`/`ride` (only hotel_booking/ecommerce_order/taxi_ride). Confirm the intended enum + wallet top-up path (currently the broken E1 fn).
- **G7**: Password-reset E2E not runnable for QA users — GoTrue rejects `.test` emails (`email_address_invalid`). Prod: SMTP unconfigured + `site_url=localhost:3000` (from prior session).
- **G8 (perf)**: `GET /api/v1/posts/:id` timed out once at 40s (subsequent social calls fast). Possible cold-start or a slow single-post query — watch.

---

## Not yet exercised (blocked on B1 or external setup)
- **Entire admin surface** (blocked on B1 grant): dashboard, orders list/latest/detail, pending-entries
  approve/reject, roles/review (hotel/taxi/host/advertiser onboarding), regions scoping, create-user, ad approve/reject.
- Real Paystack/Stripe charge + `verify` (service in `USE_MOCK_PAYMENT=true`).
- Driver-side ride lifecycle (accept→start→complete→rate) — needs a driver account + a created ride (blocked by E2).
- Cart→checkout→order (blocked by empty catalog, G4).
- Calls (`/calls/initiate` needs a `conversationId` + `participantIds` — needs an existing conversation).

---

## Suggested fix order (one at a time)
1. **B1** — grant admin perms (you run it) → unblocks the whole admin surface for QA.
2. **E1** — redeploy wallet functions (whole wallet is dead).
3. **E5 + E4** — free function slots, deploy ads + create-support-ticket.
4. **E2** — taxi ride create routing (core flow).
5. **E6** — social connections routing (one-line registry add + alias).
6. **E3** — hotel booking cancel column.
7. **E7** — notifications/send insert.
8. **E10 / E9 / E8 / E11** — route ordering + edge-fn crash-guards.
9. **G1–G8** — listing endpoints, contract cleanup, SMTP/site_url, perf.
