# Giga API — Postman Collections (verified)

Regenerated **2026-08-18** by calling **every** endpoint against the production gateway
(`https://giga-giga-production.up.railway.app`) with the QA customer and QA admin logins.
Each request's description records the HTTP status it actually returned, the backing service, and
the source file the route is defined in.

These replace the collections in `postman/*.json`, which were last generated 2026-02 and predate
roughly six months of route changes.

## Files

| Collection | Requests | Covers |
|---|---:|---|
| `Giga-Admin` | 115 | dashboard, managers/*, pending-entries, postal staff, nipost-admin, regions, users, ads review |
| `Giga-Notifications` | 38 | send/bulk/history, preferences, templates, campaigns, analytics, tracking |
| `Giga-Hotels` | 36 | search, detail, availability, bookings, favorites, reviews, host management |
| `Giga-Search` | 36 | products, hotels, drivers, suggestions, filters, admin search |
| `Giga-Social` | 36 | posts, comments, likes, feed, stories, connections, tenant |
| `Giga-Edge-Functions` | 33 | cart, wallet, user profile, support, ads, calls, roles (Supabase) |
| `Giga-Delivery` | 28 | couriers, packages, assignments, tracking, scheduler, websocket |
| `Giga-Taxi` | 20 | rides lifecycle, estimates, drivers |
| `Giga-Payments-Wallet` | 13 | initialize, verify, refund, status, wallet |
| `Giga-Gateway-Health` | 10 | health probes, docs endpoints |
| `Giga-Auth-User` | 5 | login (customer + admin), profile |
| `Giga-Production.postman_environment.json` | — | base URL, QA creds, and real resource ids |

## Running

Import a collection **and** `Giga-Production.postman_environment.json`, then just run — every
collection has a pre-request script that logs in automatically and populates `{{token}}` /
`{{adminToken}}` if they're empty. No manual login step.

```bash
# one module
npx newman run Giga-Hotels.postman_collection.json -e Giga-Production.postman_environment.json

# everything, with a per-module summary
./run-all.sh
```

## How to read the results

Each request carries one of these markers in its description:

| Marker | Meaning |
|---|---|
| ✅ VERIFIED 2xx | returned real data |
| ✅ REACHABLE | handler was reached; the probe payload or ghost id was correctly rejected (400/404) |
| 🔒 403 | role-gated — expected for host-only / driver-only / admin-only routes |
| 🔴 BROKEN | a known defect, cross-referenced to `docs/API_VERIFICATION_2026-08-18.md` (V1–V13) |

**Requests marked 🔴 assert their current broken status**, so a full run is green today. When
someone fixes the underlying defect that test will fail — that's the signal to flip the assertion
to a 2xx check. This is deliberate: it makes the suite a regression tracker rather than a wall of
red.

## ⚠️ Running these collections can take a service down

`notifications-service` allows **100 requests per 15 minutes and counts them against the gateway's
IP, not yours** — so the whole platform shares one bucket — and its rate limiter also covers
`/health`. Running the 38-request Notifications collection two or three times in a row exhausts it,
the gateway's health probe then gets a 429, and the gateway 503s **every** notification endpoint
until the window rolls over. This happened during the verification run; it is written up as
**V1b** in `docs/API_VERIFICATION_2026-08-18.md`.

`admin-service` has the same 100/15-min limit but keys it on the real client IP, so a full run of
the 115-request Admin collection will 429 partway through. The collections skip assertions on 429
rather than failing, and `run-all.sh` paces requests with `--delay-request 400`, but you still
cannot run Admin end-to-end more than once per window.

**Practical advice:** run one module at a time, and leave 15 minutes between full runs of Admin or
Notifications.

## Two things that will bite you

1. **Never send a literal `{}` JSON body.** An empty JSON object hangs the gateway forever — no
   response, no timeout (defect V3). Requests here use a `_replace` placeholder body instead of
   `{}` for exactly this reason.
2. **Destructive operations use `{{ghostId}}`** (`00000000-0000-0000-0000-000000000000`) so a full
   run verifies routing, auth and error handling without mutating production data. Swap in a real
   id only when you intend the write to land.
