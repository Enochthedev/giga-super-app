# Giga API — Live Verification Report (2026-08-18)

Every route was extracted from the **service routers themselves** (not from any existing doc), then
called against the production gateway `https://giga-giga-production.up.railway.app` with the QA
customer (`qa.customer1@gigaqa.test`) and QA admin (`qa.admin@gigaqa.test`) logins.

- **357** routes extracted from source across 9 Railway services
- **335** exercised through the gateway (22 are per-service `/health`, `/metrics` — not gateway-exposed)
- **33** edge-function endpoints exercised separately
- Destructive operations were probed with a non-existent "ghost" UUID
  (`00000000-0000-0000-0000-000000000000`) so routing, auth and error handling were verified
  **without mutating production data**.

> ## ✅ FIX LOG — deployed and verified live, 2026-08-18 21:00 UTC
>
> The findings below were written **before** any fix. Most are now fixed, deployed to Railway and
> re-verified against production. **15 of 16 post-deploy checks pass.** Each fixed item is marked
> inline. Commits: `77bdaa4`, `23819f1`.
>
> | # | Status | Verified by |
> |---|---|---|
> | **V1** payment service down | ✅ **FIXED** | `railway-payment healthy=true`; `/payments/:id/status` → clean 404 instead of 503. Root cause was a bad import crashing `/health` (below) |
> | **V1b** notifications rate-limit outage | ✅ **FIXED** | `trust proxy` + health exempted; service reachable |
> | **V3** empty `{}` body hangs forever | ✅ **FIXED** | `POST /api/admin/users` with `{}` → 400 in **1.1s** (was: never returned). Auth proxy → 401 in 0.8s |
> | **V4** reject/approve 500 on missing id | ✅ **FIXED** | all 4 endpoints → clean `404` with a real message |
> | **V5** 19 unroutable endpoints | ✅ **FIXED** | `/api/public/*`, `/api/v1/tenant/*`, `/scheduler/*`, `/websocket/*`, `/webhooks/*` all reach their service |
> | **V6** pattern collisions | ✅ **FIXED** | `/tracking/health` → notifications (200), `/campaigns` → notifications (200), `/admin/payments/*` → payment service (403 = correct gating) |
> | **V7** notification admin 403s | ✅ **FIXED** | `/api/v1/templates` and `/api/v1/campaigns` → **200** with real data for the DOP admin |
> | **V9** `/docs/{service}/` redirect loop | ✅ **FIXED** | `/docs/admin/` → **200** |
> | **V10** empty notifications spec | ✅ **FIXED** | `/docs/notifications/json` → **32 paths / 38 operations** (was 0) |
> | **V2** legacy anon key | ❌ **NOT FIXED** — env change on Railway, see below |
> | **V8** assorted 500s | ❌ not addressed (data-layer/schema work) |
> | **V11** hotels has no spec | ❌ not addressed (needs new deps + gateway change) |
>
> ### Measured effect — full 335-route re-sweep after deploy
>
> | Verdict | Before | After | Δ |
> |---|---:|---:|---:|
> | **HANG** (no response, ever) | **74** | **0** | **−74** |
> | `ROUTING_GAP` (unreachable) | 19 | 1 | −18 |
> | `SERVICE_DOWN` (503) | 13 | 2 | −11 |
> | `NOT_ROUTED_IN_SERVICE` | 8 | 3 | −5 |
> | `SERVER_ERROR` (500) | 23 | 19 | −4 |
> | `OK` / `OK_VALIDATION` / `OK_NOTFOUND` | 245 | **278** | **+33** |
>
> **Healthy endpoints: 245/335 (73%) → 278/335 (82%).**
> *(The 74 "hangs" in the before column are the V3 empty-body bug; the first sweep had to kill each
> one after 45s.)*
>
> **One behaviour change worth knowing:** `POST /api/v1/templates` moved from 400 to 500. It was
> previously rejected before reaching the handler; now that authorization passes (V7), the handler
> runs and fails on a junk payload. Newly-reachable code, not a regression in the old path — but it
> should return 400 for an invalid body, so it joins the V8 list.
>
> ### Still broken after this pass
>
> ```
> GET  /api/v1/wallet/balance, transactions, topup/verify/:ref   401/503  — V2, needs the key rotation
> POST /api/v1/wallet/topup                                      401      — V2
> GET  /api/v1/analytics/*  (5 routes)                           500      — reachable now, handler fails
> POST /api/v1/payments/initialize                               500      — likely unset PAYSTACK_SECRET_KEY
> GET/PATCH /api/admin/users/:userId                             500      — E29-class schema drift
> GET  /api/admin/regions/:id/admins                             500
> GET  /api/delivery/incoming-orders                             500
> PUT  /api/delivery/orders/:orderId/toggle-status               500
> GET  /api/managers/hotel/bookings                              500
> GET  /api/managers/media/advertisements                        500      — `advertisements` vs `ad_campaigns`
> PUT/DELETE /api/managers/orders/:orderId                       500
> PUT  /api/v1/couriers/:courierId                               500
> PUT  /api/v1/preferences                                       500
> POST /api/v1/search/analytics                                  500
> POST /api/v1/templates                                         500
> ```
>
> **Root cause found for V1:** `payment-queue-service/src/routes/health.ts` and `metrics.ts`
> imported `getQueueMetrics` from `queues/payment.queue`, which only exports
> `getPaymentQueueMetrics`. The Dockerfile runs `npx tsx src/index.ts` — **no typecheck** — so the
> import silently resolved to `undefined` and `/health` threw on every probe. The gateway marked
> the service unhealthy and 503'd every payment route. A `tsc` run catches it immediately.
>
> `/api/v1/admin/payments/{national,state,branch}` also needed the generic
> `/api/v1/admin` → `/api` rewrite guarded (it rewrote them to `/api/payments/...`). They now reach
> payment-queue-service and return a correct `403 "Admin level national required"` — proper
> authorization, not a routing failure.
>
> **Still open after the fixes:**
> - **V2** requires rotating `SUPABASE_ANON_KEY` to the new publishable key in Railway — an env
>   change nobody should make from a code commit. Until then the 13 edge functions in V2 stay 401.
> - **`POST /api/v1/payments/initialize` returns 500.** The service is healthy now and other payment
>   routes behave correctly, so this is a real endpoint defect — most likely the unset
>   `PAYSTACK_SECRET_KEY` (`config.paystackSecretKey` defaults to `''`). Needs Railway logs to confirm.

**Everything below this line describes the state at discovery time, before the fixes above.**

## Result summary

| Verdict | Count | Meaning |
|---|---:|---|
| `OK` | 141 | 2xx with real data |
| `OK_VALIDATION` | 53 | Handler reached, correctly rejected the probe payload (400/422) |
| `OK_NOTFOUND` | 51 | Handler reached, correctly 404s the ghost id |
| `FORBIDDEN` | 24 | 403 — all correct role-gating (host-only, driver-only) |
| `SERVER_ERROR` | 23 | **Defect** — 500 |
| `ROUTING_GAP` | 19 | **Defect** — gateway has no route; endpoint unreachable |
| `SERVICE_DOWN` | 13 | **Defect** — 503, backend unhealthy |
| `NOT_ROUTED_IN_SERVICE` | 8 | **Defect** — gateway routes it to the wrong service |
| `AUTH_REJECTED` | 2 | **Defect** — valid token rejected |
| `OTHER` | 1 | 301 redirect (`/docs/:service`, see V9) |

**245 of 335 endpoints (73%) behave correctly** (`OK` + `OK_VALIDATION` + `OK_NOTFOUND`),
plus 24 correct role-gated 403s. **65 are defective.**

Findings are numbered **V1–V13** below (with V1b and V8b), most severe first.

> **Timing note.** The sweep ran 19:10–19:30 UTC; a targeted re-check of notifications-service ran
> at 20:00. In that window 16 notification endpoints changed behaviour on their own — the
> "Admin privileges required" 403s cleared without any change from us (see V7). Everything in this
> report reflects the **later** observation where the two differ.
>
> **This instability is now explained: see V1b.** notifications-service rate-limits the gateway's
> health probe, so it drops in and out of the gateway's circuit breaker. Any endpoint served by it
> can return 200, 403 or 503 depending on where you land in the 15-minute window — which is exactly
> the "we keep making changes and correcting errors" pattern the team is seeing.

---

## 🔴 P0 — breaks core flows

### V1. Payment Queue Service is DOWN — all payments 503
`GET /health/detailed` reports `railway-payment: healthy=false` (no status code at all — the
health probe does not even connect). Every payment endpoint returns
503 `SERVICE_UNAVAILABLE: Payment Queue Service is currently unavailable`:

```
POST /api/v1/payments/initialize          POST /api/v1/payments/request
GET  /api/v1/payments/:paymentId/status   POST /api/v1/payments/:paymentId/refund
```

Checkout, hotel booking payment and taxi fare capture are all dead. This worked on 2026-07-09
(per `QA_E2E_ERRORS_2026-07-07.md`), so it regressed since. **Check the Railway deploy/logs for
payment-queue-service first — this is the highest-impact item in this report.**

### V1b. notifications-service rate-limits itself into a total outage — **observed live during this session**
Midway through testing, **every** notifications endpoint started returning
`503 SERVICE_UNAVAILABLE`. `/health/detailed` showed `railway-notifications: status=429`. The
service had rate-limited the gateway's own health probe, and the gateway then cut off all traffic
to it. Three facts combine into this:

1. [notifications-service/src/index.ts:759](../notifications-service/src/index.ts#L759) sets
   `windowMs: 15*60*1000, max: 100` — 100 requests per 15 minutes **per IP**.
2. It never calls `app.set('trust proxy', …)`. Every request arrives from the gateway, so
   `req.ip` is **the gateway's IP for all traffic**. The per-IP bucket collapses into a single
   global bucket: **the whole platform gets 100 notification requests per 15 minutes.**
3. `app.use(limiter)` on line 764 is registered **before** `app.get('/health')` on line 776, so the
   health endpoint is rate-limited too. Once the budget is gone the gateway's probe gets `429`,
   `serviceRegistry` computes `healthy = response.status < 400`
   ([serviceRegistry.ts:377](../api-gateway/src/services/serviceRegistry.ts#L377)) → `false`, and
   **every** route 503s — not just the ones over budget.

It is self-amplifying: normal traffic exhausts the shared bucket, the health probe then fails, and
the service is marked down until the window rolls over.

**`payment-queue-service` has the same missing `trust proxy`** with a config-driven limiter on
`/api` — a strong candidate for why V1 shows it hard-down.

`admin-service` **does** set `trust proxy` ([index.ts:52](../admin-service/src/index.ts#L52)), so
its limiter keys on the real client IP and it degrades per-office rather than platform-wide (V8b).

This one mechanism plausibly explains a lot of the intermittent "it worked yesterday" behaviour the
team has been chasing, including the 403→200→503 flapping recorded in V7.

### V2. A large set of edge functions reject valid logins — `UNAUTHORIZED_LEGACY_JWT`
A token minted seconds earlier by `POST /auth/login` is rejected with
`401 {"code":"UNAUTHORIZED_LEGACY_JWT","message":"Invalid JWT"}` by:

```
GET  /api/v1/users/search      GET  /api/v1/user/profile     GET/POST /api/v1/user/addresses
GET  /api/v1/users/profile     POST /api/v1/user/switch-role POST /api/v1/cart/checkout
POST /api/v1/payments/verify   POST /api/v1/payments/intent  GET  /api/v1/wallet/balance
POST /api/v1/wallet/topup      POST /api/v1/wallet/pay       POST /api/v1/calls/initiate
POST /api/v1/roles/apply
```

**Root cause (isolated):** the project has migrated to Supabase **JWT signing keys** — user tokens
now carry a `kid` header (`{"alg":"HS256","kid":"oI9nbAhJNgSdnWvM"}`). But `SUPABASE_ANON_KEY`,
which the gateway sends as the `apikey` header on every edge-function call
([supabaseProxy.ts:185](../api-gateway/src/middleware/supabaseProxy.ts#L185)), is still the
**legacy** key (`{"alg":"HS256"}`, no `kid`, `iss: supabase`). Functions with platform JWT
verification enabled reject the legacy key.

Reproduced outside the gateway — calling `get-user-profile` directly with
`Authorization: <fresh user token>` + `apikey: <legacy anon key>` returns the identical
`401 UNAUTHORIZED_LEGACY_JWT`.

Corroboration: `/health/detailed` shows **every** `supabase-*` service as `healthy=false, status=401`.

**This is one config change, not 13 bugs** — rotate `SUPABASE_ANON_KEY` to the new publishable key
on the gateway (and anywhere else it is set). Functions that don't enforce platform JWT
verification (`get-user-cart`, `get-my-tickets`, `get-notification-history`) still work, which is
why the breakage looks random. This is also the real cause of **E1 "wallet broken"** in the July log.

### V3. An empty JSON body hangs the request forever
Any `POST`/`PUT`/`PATCH` sent with `Content-Type: application/json` and a body that parses to an
**empty object or array** never returns. The connection is held open indefinitely — no response,
no timeout, no error.

```
POST /api/admin/users   -d '{}'          → hangs (>45s, killed by client)
POST /api/admin/users   -d '{ }'         → hangs
POST /api/admin/users   -d '[]'          → hangs
POST /api/admin/users   -d '{"a":1}'     → 400 in 1.1s   ✅
POST /api/admin/users   (no body at all) → 400 in 1.0s   ✅
POST /api/admin/users   -d '{}' without Content-Type → 400 in 1.3s ✅
```

Not service-specific — reproduced on `/api/v1/posts`, `/api/v1/favorites/add`,
`/api/v1/search/products` and `/api/admin/users`, i.e. **at the gateway proxy layer**. 74 of the
335 probes hung on the first pass for exactly this reason; all 74 returned normally when the body
was changed to `{"_probe":true}`.

**Frontend impact:** submitting an empty form, or any PUT where the diff came out empty, gives the
user a spinner that never resolves. Worth a client-side guard until it is fixed.

### V4. Reject/approve on a missing row returns 500, not 404
The endpoints the frontend team asked about return `500 {"error":"Failed to reject application"}`
when the id doesn't exist, so a stale list item is indistinguishable from a server fault:

| Endpoint | Ghost-id response |
|---|---|
| `POST /api/nipost-admin/postal-staff/applications/:id/reject` | 500 `Failed to reject application` |
| `POST /api/postal/staff/:id/reject` | 500 `Failed to reject postal staff` |
| `POST /api/pending-entries/:module/:id/reject` | 500 `Failed to reject entry` |
| `POST /api/pending-entries/:module/:id/approve` | 500 `Failed to approve entry` |
| `PUT  /api/postal/staff/:id` | 500 `Failed to update postal staff` |

Cause: these use Supabase `.single()`, which throws when no row matches. `POST /api/ads/:adId/reject`
was already fixed this way (E17, `.maybeSingle()` → correct 404) — the same fix has not been applied
to the others. Note `/api/nipost-admin/couriers/applications/:id/reject` correctly returns 404.

---

## 🟠 P1 — features unreachable through the gateway

### V5. 19 endpoints have no gateway route at all (`SERVICE_NOT_FOUND`)
The service implements them; the gateway `serviceRegistry` has no matching pattern, so they 404
before reaching any backend.

| Endpoints | Service | Missing pattern |
|---|---|---|
| `POST /api/public/apply/postal-staff`, `POST /api/public/apply/courier`, `GET /api/public/my-applications` | admin | `/api/public*` |
| `GET/POST /api/v1/tenant/posts` + 5 more tenant routes | social | `/api/v1/tenant*` |
| `GET /api/v1/scheduler/stats`, `POST /api/v1/scheduler/cleanup` | delivery | `/api/v1/scheduler*` |
| `GET /api/v1/websocket/stats`, `POST /api/v1/websocket/broadcast`, `POST /api/v1/websocket/cleanup` | delivery | `/api/v1/websocket*` |
| `POST /api/v1/track-delivery` | delivery | `/api/v1/track-delivery` |
| `POST /api/v1/webhooks/paystack`, `POST /api/v1/webhooks/stripe` | payment | `/api/v1/webhooks*` |

**The `/api/public/*` group is the notable one** — those are the citizen-facing "apply to become
postal staff / courier" endpoints. Applications cannot be submitted through the gateway at all,
which means the reject/approve admin flow currently has no way to receive new applications.

⚠️ The two `webhooks` routes are payment-provider callbacks. If Paystack/Stripe are configured to
call the gateway they are silently failing; confirm whether they point at the service directly.

### V6. Pattern collisions route 10 endpoints to the wrong service
`serviceRegistry` matches on first-registered prefix, and three prefixes are claimed by an earlier
service than the one that implements them:

| Public path | Implemented by | Actually routed to | Result |
|---|---|---|---|
| `/api/v1/tracking/*` (5 routes) | notifications | delivery (`/api/v1/tracking*`) | 404 `Route not found` |
| `/api/v1/admin/payments/{national,state,branch}` | payment-queue | admin (`/api/v1/admin*`) | 404 `Endpoint not found` |
| `/api/v1/campaigns/*` (7 routes) | notifications | supabase-ads (`/api/v1/campaigns*`) | 503 `Ads Service unavailable` |
| `/api/v1/wallet/*` | payment-queue | supabase-payments (`/api/v1/wallet*`) | 401 legacy-JWT (V2) |

Notification tracking pixels, click-through, and the SendGrid/Twilio/Firebase delivery webhooks are
all dead — so **delivery/open analytics never record**. The Railway wallet implementation is
completely shadowed by the broken edge functions.

### V7. Notification analytics is 500 across the board; the old A2 403s have cleared
At 19:15 all 14 notification admin endpoints returned `403 "Admin privileges required"` for the
QA DOP admin — the long-standing **A2** symptom. On re-check at 20:00, **with the same token and no
change from us**, the 403s were gone:

| Endpoint group | 19:15 | 20:00 |
|---|---|---|
| `GET /api/v1/templates` | 403 | **200** — real templates returned |
| `POST /api/v1/templates`, `/templates/validate` | 403 | 400 (validation — reachable) |
| `GET/PUT/DELETE /api/v1/templates/:id`, `/preview` | 403 | 404 on ghost id (correct) |
| `POST /api/v1/notifications/bulk` | 403 | 400 (validation — reachable) |
| `POST /api/v1/notifications/retry/:id` | 403 | 404 on ghost id (correct) |
| **`GET /api/v1/analytics/*` (5 routes)** | 403 | **500** |

So A2 is no longer the blocker — but **all 5 analytics endpoints now fail with 500**:

```
GET /api/v1/analytics/delivery-rates   → 500 Failed to fetch delivery rates
GET /api/v1/analytics/engagement       → 500 Failed to fetch engagement metrics
GET /api/v1/analytics/volume           → 500 Failed to fetch volume statistics
GET /api/v1/analytics/templates        → 500 Failed to fetch template analytics
GET /api/v1/analytics/users            → 500 Failed to fetch user analytics
```

Two further notification writes also 500: `PUT /api/v1/preferences` and
`POST /api/v1/preferences/resubscribe`.

**Why it flaps — root cause found.** `notifications-service` does not read the role from the JWT.
It takes it from an inbound **request header**:

```ts
// notifications-service/src/index.ts:842
role: (req.headers['x-user-role'] as string) || 'user',
```

and `requireAdmin` ([templates.ts:39](../notifications-service/src/routes/templates.ts#L39)) only
accepts `['admin', 'super_admin']`. So authorization depends entirely on the gateway populating
`x-user-role`, and defaults to `user` → 403 whenever it is absent. A DOP/NIPOST role is not in the
allow-list either. Observed sequence on one unchanged token:

| Time | `GET /api/v1/templates` |
|---|---|
| 19:15 | 403 Admin privileges required |
| 20:00 | **200** with real templates |
| 20:14 (after the V1b recovery) | 403 again |

✅ **Checked: the header is not spoofable through the gateway.** A customer token plus
`x-user-role: admin` still returns 403 — the gateway overrides the client-supplied header. The
residual risk is only if the Railway service URL is reachable directly, bypassing the gateway;
worth confirming that it is not publicly exposed.

The fix direction is to derive the role from the verified JWT / a role lookup inside the service
rather than a forwarded header, and to accept NIPOST panel roles — the same change `admin-service`
already made for `/api/roles/review`.

### V8. 18 endpoints return 500 on ordinary reads
Beyond the `.single()` group in V4:

```
GET    /api/admin/users/:userId                    Failed to fetch user
PATCH  /api/admin/users/:userId                    Failed to update user
GET    /api/admin/regions/:id/admins               Failed to list region admins
GET    /api/delivery/incoming-orders               Failed to fetch incoming orders
PUT    /api/delivery/orders/:orderId/toggle-status Failed to toggle order status
GET    /api/managers/hotel/bookings                Failed to fetch bookings
GET    /api/managers/media/advertisements          Failed to fetch advertisements
PUT    /api/managers/orders/:orderId               Failed to update order
DELETE /api/managers/orders/:orderId               Failed to delete order
PUT    /api/v1/couriers/:courierId                 Failed to update courier
POST   /api/v1/search/analytics                    Failed to track search analytics
GET    /api/v1/analytics/delivery-rates            Failed to fetch delivery rates      (V7)
GET    /api/v1/analytics/engagement                Failed to fetch engagement metrics  (V7)
GET    /api/v1/analytics/volume                    Failed to fetch volume statistics   (V7)
GET    /api/v1/analytics/templates                 Failed to fetch template analytics  (V7)
GET    /api/v1/analytics/users                     Failed to fetch user analytics      (V7)
PUT    /api/v1/preferences                         Failed to update preferences
POST   /api/v1/preferences/resubscribe             Failed to resubscribe
```

`GET /api/admin/users/:userId` failing while `GET /api/admin/users` (list) works, and
`GET /api/managers/media/advertisements` failing, both match the known `advertisements` vs
`ad_campaigns` schema drift left unresolved as **E29** in the July log.

### V8b. admin-service rate limit is 100 requests / 15 min **per IP** — shared by every admin
[admin-service/src/index.ts:62](../admin-service/src/index.ts#L62) applies
`windowMs: 15*60*1000, max: 100` to all `/api` routes, keyed by IP. Verified live: a burst of 8
identical requests already returned `429 "Too many requests, please try again later."`

Two consequences:

1. **It is keyed by IP, not by user.** Every admin behind one office NAT shares a single budget of
   100 requests per 15 minutes. An admin dashboard that fires 8-10 calls per page view exhausts it
   in roughly a dozen page loads across the whole team.
2. The 429 body is **plain text**, not the JSON envelope every other error uses, so a frontend
   parsing `response.json()` will throw on it rather than showing a "slow down" message.

This is why a full run of the 115-request Admin collection cannot complete in one pass — the
collections now skip assertions on 429 and `run-all.sh` paces requests, but the underlying limit is
worth a deliberate decision (raise it, or key it by user id).

---

## 🟡 P2 — documentation defects

### V9. `/docs/{service}/` is an infinite redirect loop
`GET /docs/admin/` → `301 → /docs/admin/` → forever. In
[docs.ts:332](../api-gateway/src/routes/docs.ts#L332), `router.get('/:service')` also matches the
trailing-slash form (Express is non-strict by default), so it redirects to itself and the real
handler at [docs.ts:344](../api-gateway/src/routes/docs.ts#L344) is never reached.

**The per-service Swagger UI has therefore never been reachable.** What works:
- **`/api-docs/`** — the aggregated Swagger UI (trailing slash required; `/api-docs` 301s to it)
- **`/docs/{service}/json`** — the raw OpenAPI JSON (registered above the redirect, so it survives)

### V10. `notifications-service` publishes an empty spec
`/docs/notifications/json` returns `200` with **`paths: {}`**. The service has **zero** `@swagger`
JSDoc blocks in any of its 6 route files — the spec config is fine, the annotations were never
written. All 36 notification endpoints are undocumented.

### V11. `hotels-service` has no published spec at all
`/docs/hotels/json` → 404. The service is absent from the docs registry in
[docs.ts:21](../api-gateway/src/routes/docs.ts#L21) and from the Swagger UI list in
[index.ts:80](../api-gateway/src/index.ts#L80). All 39 hotel/booking/review endpoints — including
the entire booking flow — are missing from published docs.

### V12. Coverage gaps measured against the live route list

Measured against the 335 gateway-reachable routes, **before** this pass:

| Source | Documented | Missing | Biggest holes |
|---|---:|---:|---|
| Swagger (all live specs) | 230/335 | **105** | notifications 36, hotels 28, admin 19, social 11, payment 9 |
| Bruno collection | 284/335 | **51** | gateway 11, payment 10, social 10, admin 8, notifications 6 |
| Postman (in repo) | unknown | — | last regenerated 2026-02; predates ~6 months of route changes |

**After this pass:**

- **Postman** — fully regenerated: 370 requests across 11 module collections in
  `postman/collections/`, every one carrying its verified live status.
- **Bruno** — 51 requests added; the collection now covers all 335 routes.
- **Swagger** — `notifications-service` went from **0 to 38 documented operations**
  (32 paths). Remaining gap: **69** operations, of which 28 are hotels (see below), 19 admin,
  11 social, 9 payment, 2 gateway.

⚠️ **hotels-service Swagger was not added.** V11 above understates it: the service has no swagger
setup at all — no config, no dependency, no `/api-docs` route, and zero annotations in any of its
6 route files. Publishing it means adding `swagger-jsdoc`/`swagger-ui-express` to the service,
creating a config, mounting an endpoint, and registering it in the gateway docs router — a code and
deployment change, not a documentation edit, so it is left for you to approve. In the meantime all
39 hotel routes **are** fully covered by the Postman and Bruno collections.

### V13. Route-shape traps that keep biting the frontend
Not bugs, but repeatedly mis-called because no doc states them:

- **There is no `GET /api/v1/hotels`.** The list route is `GET /api/v1/hotels/search`. A bare
  `/api/v1/hotels` returns 404 `Endpoint not found`.
- **There is no `GET /api/v1/packages`.** Only `/packages/:id`, `/packages/sender/:senderId`,
  `/packages/status/:status`.
- `GET /api/v1/hotels/:id` is constrained to a 36-char UUID
  (`/:id([0-9a-fA-F-]{36})`); a non-UUID falls through to the literal routes.
- `POST /api/v1/search/products` requires `page`/`limit` as **numbers**; strings return
  `VALIDATION_ERROR`. The `GET` form accepts `?query=&page=&limit=`.
- Both `/api/v1/posts` and `/api/v1/social/posts` work, but they are **different backends** —
  the first is social-service, the second is the `get-user-posts` edge function.

---

## Verified working — safe to build against

Full lifecycle confirmed live today:

- **Auth** — `POST /auth/login` (customer + admin), token used successfully across 9 services.
- **Social** — list/create/read posts, comments, likes, feed, stories, connections. `POST /api/v1/posts` → 201.
- **Hotels** — `hotels/search`, `hotels/:id`, `availability`, `bookings` list/detail, `favorites`, `reviews`.
- **Search** — products (GET+POST), hotels, drivers, suggestions, filters, universal, trending, categories, brands.
- **Delivery** — couriers list/detail/stats, packages by sender/status, assignments.
- **Taxi** — `rides/estimate`, `rides/history`, `rides/active`, `drivers/nearby`.
- **Admin (DOP)** — dashboard stats/sales/categories, `pending-entries`, `admin/users` list,
  `admin/regions`, `postal/staff`, `nipost-admin/*` applications, `ads/incoming`,
  `managers/ecommerce/*` (orders, vendors, analytics), `ecommerce/traders`, `roles/review`.
- **Ads (admin side)** — `GET /api/ads/incoming` returns real campaigns; approve/reject reachable.
  *(The customer-facing `/api/v1/ads/*` edge functions are still undeployed — E5, unchanged.)*

## Reproducing

```bash
BASE=https://giga-giga-production.up.railway.app
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"qa.admin@gigaqa.test","password":"QaGiga!2026"}' | jq -r .access_token)
curl -s $BASE/api/pending-entries -H "Authorization: Bearer $TOKEN" | jq

# V3 — the hang (will not return):
curl -m 10 -X POST $BASE/api/admin/users -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{}'
```

The Postman collections in `postman/collections/` and the Bruno collection in `bruno/giga-api/`
were regenerated from this run — every request in them carries its verified status.
