# Giga — Cross-Module Logic-Bug Audit (2026-08-19)

Handler-level read of every service's mutation/state paths — the class of bug that returns
2xx while doing the wrong thing, so an endpoint status sweep can't see it. Findings are recorded
first; fixes applied in a batch afterward.

Excluded per request: the two the user already reported (driver `.insert` swallow in
business-modules `completeRoleOnboarding`, and the pending-entries `taxi`/`drivers` module-key
mismatch). Note: both already read as fixed in HEAD (`completeRoleOnboarding` upserts; the
approve/reject map is checked below).

Legend: 🔴 correctness/data-loss · 🟠 wrong-result · 🟡 minor/edge

---

## taxi-realtime-service

### T1 🔴 Driver earnings silently dropped on ride completion
`routes/rides.ts:682` — `POST /api/rides/:id/complete` inserts the `driver_earnings` row with
`await supabase.from('driver_earnings').insert({...})` and never checks the returned error. The
ride is already marked `completed` and the response reports `driver_earning`, so if the insert
fails (duplicate `ride_id`, constraint, transient error) the driver is **never credited** and
nothing surfaces it. Should check the error and, since a completion could be retried, upsert on
`ride_id` (or at minimum fail loudly / enqueue a retry).

---

## payment-queue-service

### P1 🔴 Wallet top-up is not idempotent → double-credit on webhook retry
`services/wallet.service.ts` `verifyTopUp` (~line 276): the flow is (1) check `transaction.status
=== 'completed'` → early-return, (2) `credit_wallet` RPC, (3) update `wallet_transactions.status =
'completed'`. Two problems:
- Step 3's error is **not checked**. If the status update fails after the credit succeeds, the
  transaction stays non-completed, so the next verify call passes the step-1 guard and **credits
  again**.
- Even without that, steps 1–3 aren't atomic. Paystack fires webhooks more than once; two
  concurrent verifies both pass the step-1 guard and both credit. No `for update` lock or
  conditional update guards it.
  **Fix:** make the completion atomic — e.g. `update wallet_transactions set status='completed'
  where reference=? and status<>'completed'` and only credit when that update reports a row
  changed (or move the whole thing into a single SECURITY DEFINER RPC that locks the row).

---

## hotels-service

### H1 🔴 Bookings never decrement inventory → overbooking
`routes/bookings.ts:159` `POST /bookings/create` reads `room_availability`, checks
`min available >= rooms`, inserts the booking, but **never decrements `room_availability`**.
Confirmed via DB: the only trigger on `hotel_bookings` is `updated_at` — nothing adjusts
inventory. So (a) the same room can be booked unlimited times, and (b) two concurrent bookings
both pass the check. `available_rooms` is decorative. Needs an atomic decrement (trigger on
booking insert/confirm, or a conditional `update … set available_rooms = available_rooms - :n
where … and available_rooms >= :n` inside a transaction) — and re-increment on cancel.

### H2 🟠 Availability check is skipped when no rows exist for the dates
Same handler: `if (availability && availability.length > 0)` — when there are **no**
`room_availability` rows for the requested range, the check is bypassed and the booking proceeds
regardless. Dates with no inventory rows are treated as unlimited. Decide whether missing rows mean
"unavailable" (safer) or seed availability so the check always has data.

### H3 🟡 `parseInt` without radix / NaN guard on room + guest counts
`roomsVal = parseInt(numberOfRooms || … || '1')` — a non-numeric `guestCount`/`numberOfRooms`
yields `NaN`, which is then written to `guest_count`/`number_of_rooms` and used in pricing
(`subtotal = roomRate * nights * NaN` → NaN total). Validate as positive integers.

### H4 🟠 Cancellation promises a refund it never initiates
`routes/bookings.ts:353` `POST /bookings/:id/cancel` computes `refundAmount`, writes it to
`hotel_bookings.refund_amount`, and returns "Refund of X will be processed" — but makes **no call
to the payment/refund service**. Nothing consumes `refund_amount`, so a paid guest is told a refund
is coming and never gets one. Either enqueue a refund (payment-queue has a refund flow) or stop
promising one.

### H5 🟠 Refund computed regardless of payment status
Same handler computes the refund from `total_amount` without checking `payment_status`. A booking
that was never paid (create sets `payment_status='pending'`) still reports a refund owed. Gate the
refund on an actually-paid booking. (Also: cancel does not re-increment `room_availability`,
consistent with H1.)

---

## delivery-service

### D1 🔴 IDOR — any authenticated user can modify any package
`routes/packages.ts:387` `PUT /packages/:packageId` is guarded only by `requireAuth`, and
`services/package.ts updatePackage` writes with `.eq('id', packageId)` and **no ownership/role
check** — `req.user.id` is never used. Any logged-in user can update anyone's package: change the
recipient address/phone, alter `delivery_fee`, or set `status` to `delivered`/`cancelled`. The
route even whitelists `status` in the body, so a sender can mark their own parcel delivered and
bypass the courier flow. Scope the update to the owner (sender) or an admin/assigned courier.
`cancelPackage` / delete have the same shape — check them too.

### D2 🟠 Mass assignment — full req.body spread into the update
Same path: the route passes `req.body` to `updatePackage`, which does `.update({ ...updates })`.
express-validator validates but does not strip unknown keys, so any extra column a client includes
(e.g. `courier_id`, `sender_id`) is written. Whitelist the updatable columns explicitly.

---

## social-service

Comment/like ownership checks are correct (the model delivery-service should follow).

### S1 🟠 `comment_count` never updates (E12, still open)
`create_post_comment` RPC only inserts into `post_comments`; confirmed via DB that `post_comments`
has no count trigger (only `updated_at`), while `post_likes` has `update_post_counts_trigger`. So
`social_posts.comment_count` stays 0 for every post, and the direct soft-delete in
`routes/comments.ts:322` wouldn't decrement it either. Add an AFTER INSERT/soft-delete trigger on
`post_comments` that maintains the counter (mirror `update_post_counts`).

---

## taxi-realtime-service (continued)

### T2 🟠 Losing driver in an accept race gets a 500
`routes/rides.ts:499` `POST /rides/:id/accept` correctly guards the assignment with a conditional
update (`.eq('status','requested')`), so no double-assignment — good. But the update ends in
`.single()`, so the driver who loses the race matches 0 rows, `.single()` throws, and they get a
`500 INTERNAL_ERROR` instead of a clean `409 "Ride already taken"`. Use `.maybeSingle()` and return
409 when no row came back. (Same pattern worth checking on start/cancel.)

---

## notifications-service

### N1 🟠 Any authenticated user can send email/SMS/push to any recipient
`routes/notifications.ts:114` `POST /notifications/send` is `requireAuth`, yet it reads a
caller-supplied `userId`, `recipient` (arbitrary email/phone/device token), and free-form
`subject`/`body`. The comment says "for self-notifications" but nothing restricts it to self, so
any logged-in user can send arbitrary email/SMS/push to arbitrary recipients "from Giga" — a
spam/phishing vector that also burns SMS/email credit. Restrict `recipient`/`userId` to the caller
for non-admins, or require admin to target others.

---

## admin-service / search-service / api-gateway

- **admin approvals** (`postal/staff/:id/approve`, `pending-entries/*`) reviewed: the module-key
  map now includes `taxi`/`ecommerce`, `completeRoleOnboarding` upserts, and the approve path
  guards missing `user_id` (E16). No new correctness bug beyond the two already-reported (which
  read as fixed in HEAD).
- **search-service**: read-only query surface; no state mutation to audit.
- **api-gateway**: audited earlier this session (routing, body-forwarding, auth); no logic bug
  beyond those already fixed.

---

## Priority summary (fix order)

| ID | Sev | Module | One-liner |
|----|-----|--------|-----------|
| D1 | 🔴 | delivery | IDOR — any user can modify any package |
| T1 | 🔴 | taxi | driver earnings insert error swallowed → driver unpaid |
| P1 | 🔴 | payment | wallet top-up not idempotent → double-credit on webhook retry |
| H1 | 🔴 | hotels | bookings never decrement inventory → overbooking |
| N1 | 🟠 | notifications | any user can send email/SMS/push to any recipient |
| D2 | 🟠 | delivery | mass-assignment via unfiltered req.body |
| H4 | 🟠 | hotels | cancellation promises a refund it never initiates |
| H5 | 🟠 | hotels | refund computed even for unpaid bookings |
| H2 | 🟠 | hotels | availability check skipped when no rows exist |
| S1 | 🟠 | social | comment_count never updates (E12) |
| T2 | 🟠 | taxi | accept-race loser gets 500 instead of 409 |
| H3 | 🟡 | hotels | parseInt without NaN guard on room/guest counts |

---

## Fix log (2026-08-19)

| ID | Status | How |
|----|--------|-----|
| D1 | ✅ fixed | ownership (sender/admin) check on package update/cancel/delete |
| D2 | ✅ fixed | column whitelist; delivery_fee admin-only |
| T1 | ✅ fixed | earnings upsert(onConflict ride_id) before completion + error thrown; UNIQUE(ride_id) added |
| T2 | ✅ fixed | maybeSingle → 409 on accept-race loss |
| P1 | ✅ fixed | atomic claim (conditional status update) before credit; release on failure |
| H1 | ✅ fixed | DB trigger decrements/blocks/restores room_availability (verified 2→1, overbook blocked, →2). Dormant until availability is seeded (H2) |
| H3 | ✅ fixed | NaN/positive-int guard on room & guest counts |
| H4 | ⚠️ partial | message made honest + gated to paid; automated refund dispatch still needs a payment_reference/refund_status column + payment-queue wiring (product decision) |
| H5 | ✅ fixed | refund only for paid bookings |
| N1 | ✅ fixed | non-admins may only notify self; email recipient forced to JWT email; sms/push-to-other requires admin |
| S1 | ✅ fixed | trigger on post_comments maintains comment_count (deleted_at-aware) + backfill (verified) |
| H2 | ⛔ open | availability not seeded; needs capacity seeding to activate H1 enforcement — product decision |

Remaining open items are product/schema decisions (H2 seeding, H4 refund pipeline), not code defects.
