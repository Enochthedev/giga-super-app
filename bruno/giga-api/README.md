# Giga API — Bruno Collection

A [Bruno](https://www.usebruno.com/) collection covering **the full Giga API surface** — ~326 requests
across 17 modules — with documentation, examples, token automation, and test assertions.

## Architecture (important)

There is **one** public base endpoint: the **Railway API gateway**
(`https://giga-giga-production.up.railway.app`). It routes every request to the right backend —
either a **Railway microservice** (social, hotels, taxi, delivery, notifications, search, admin,
payment-queue) or a **Supabase edge function** (cart, wallet, media, support, calls, ads, user
profile, payments/verify). **All requests in this collection go through that single gateway URL**
(`{{baseUrl}}`) — never call a service or edge function directly.

## Quick start

1. Install Bruno (app or `npm i -g @usebruno/cli`).
2. **Open Collection** → select this folder (`bruno/giga-api`).
3. Pick the **Production** environment (top-right).
4. Run **Auth → Login (Customer)** → stores `{{token}}`. For Admin folder, run **Auth → Login (Admin)** → `{{adminToken}}`.
5. Run anything. Chained requests capture ids into env vars (`{{postId}}`, `{{hotelId}}`, `{{roomTypeId}}`, `{{bookingId}}`).

## CLI / CI

```bash
cd bruno/giga-api
bru run --env Production                # whole collection
bru run Hotels Taxi --env Production     # specific folders
bru run --env Production --reporter-json out.json
```

## Folders

| Folder | Backend | Notes |
|--------|---------|-------|
| Auth | gateway/GoTrue | Login (captures tokens), me, forgot/change password |
| User | edge fns | profile, addresses, avatar upload, user search, switch-role |
| Social | social-service | posts, comments, likes, feed, stories, connections |
| Ecommerce | edge fns | cart, checkout, vendor apply/balance |
| Wallet | edge fns | balance, topup, pay (see E1/E1b notes) |
| Payments | payment-queue + edge | initialize (Node), verify, intent |
| Hotels | hotels-service | search, details, availability, bookings, favorites, reviews, management (host) |
| Taxi | taxi-realtime-service | estimate, rides lifecycle, drivers |
| Delivery | delivery-service | couriers, packages, assignments, tracking |
| Notifications | notifications-service | history, preferences, templates, campaigns, analytics |
| Search | search-service | products, hotels, drivers, admin search |
| Media | edge fns | upload file, process image (multipart) |
| Support | edge fns | tickets |
| Calls | edge fns | initiate/answer/decline/end/leave |
| Ads | edge fns | campaigns, fetch, analytics, advertiser profile |
| Roles | edge fns | apply / switch role |
| Admin | admin-service | dashboard, ecommerce/taxi/hotel modules, pending-entries, postal staff, users, regions, ads review |

## Conventions

- **Auth**: customer requests use `{{token}}`; Admin folder uses `{{adminToken}}`.
- **Path params**: chained ones are env vars (`{{postId}}`); others appear as `:id` or `REPLACE_xxx` in the
  URL/body — fill them in before sending.
- **Multipart** (Media/User uploads): replace `@file(/absolute/path/...)` with a real local file.
- **Docs block** on each request states the exact `METHOD /path`, the backing service/edge fn, and any known
  issue (see `docs/QA_E2E_ERRORS_2026-07-07.md`, e.g. E1 wallet, E22 pagination, E12 comment_count).
- Tests assert `status < 500` (a request reached its backend). Tighten per-endpoint as needed.

## Regenerating

The bulk of the collection is generated from the service route definitions + gateway mappings
(`scripts` in the QA scratchpad). Hand-curated requests (Auth, key examples) have richer docs and
response samples. To add one, copy a `.bru`, adjust `meta`, the method block, `body:json`, and `docs`.
