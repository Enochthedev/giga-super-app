# Giga API — Bruno Collection

A [Bruno](https://www.usebruno.com/) collection for the Giga platform API (via the Railway gateway),
with runnable examples, sample responses, token automation, and test assertions.

## Quick start

1. Install Bruno (desktop app or `npm i -g @usebruno/cli`).
2. **Open Collection** → select this folder (`bruno/giga-api`).
3. Top-right, pick the **Production** environment.
4. Run **Auth → Login (Customer)** first. It stores `access_token` into `{{token}}`, which every
   other request uses automatically. For the Admin folder, also run **Auth → Login (Admin)** (stores `{{adminToken}}`).
5. Run any request. Many requests chain via env vars they capture (postId, hotelId, roomTypeId, bookingId).

## CLI (automation / CI)

```bash
cd bruno/giga-api
bru run --env Production                 # run the whole collection
bru run Auth Hotels --env Production      # run specific folders
bru run --env Production --reporter-json out.json
```

## Environment vars (`environments/Production.bru`)

| var | purpose |
|-----|---------|
| `baseUrl` | gateway URL (`https://giga-giga-production.up.railway.app`) |
| `customerEmail` / `customer2Email` / `adminEmail` | QA test users |
| `password` | shared QA password (`QaGiga!2026`) |
| `token` / `adminToken` | auto-filled by the Login requests |
| `postId` / `hotelId` / `roomTypeId` / `bookingId` | auto-captured by earlier requests for chaining |

## Suggested run order (a full customer journey)

Login (Customer) → User/Get Profile → Social/Create Post → Comment → Like →
Hotels/Search → Hotel Details → Booking Price → Create Booking → Payments/Initialize → Hotels/Cancel Booking.

## Notes / known issues surfaced inline

Requests carry `docs` blocks noting live quirks & bug IDs (see `docs/QA_E2E_ERRORS_2026-07-07.md`), e.g.
E1 wallet auth, E22 search pagination, E12 comment_count. Endpoints fixed in the latest batch
(E6 connections, E9 addresses, E10 recommended, E3 booking cancel) are marked accordingly.

## Coverage

Auth, User, Social, Notifications, Search, Hotels, Taxi, Payments, Delivery, Admin — the core of every
module. Extend by copying a `.bru` file and adjusting `meta`, method block, `body:json`, and `docs`.
