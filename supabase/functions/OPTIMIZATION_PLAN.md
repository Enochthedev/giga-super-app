# Giga Project: Edge Function Optimization Plan

## Problem Analysis

The project currently uses **~144 separate Edge Functions**.

- **Issue:** Supabase imposes limits on the number of deployed functions (e.g.,
  10 on the Free tier, more on Pro but still finite).
- **Error:** You are encountering
  `402 Payment Required: Max number of functions reached`.
- **Maintenance:** Managing 144 separate `index.ts` files and deployments is
  difficult.

## Optimization Strategy

We will use a three-pronged approach to reduce function usage by ~95% while
improving performance and maintainability.

### 1. The Monolithic Router Pattern (The Main Fix)

Instead of 1 endpoint per action (e.g., `create-booking`, `cancel-booking`), we
use **1 endpoint per domain** (or just 1 global API).

**Proposed Structure:** We will consolidate purely logic-heavy functions (those
needing 3rd party APIs like Stripe/Paystack or complex business logic) into a
single `api` function.

**New Directory Structure:**

```
supabase/functions/
└── api/
    ├── index.ts                <-- Main Router (Switch Statement)
    └── actions/
        ├── hotels/
        │   ├── create-booking.ts
        │   ├── check-availability.ts
        │   └── ...
        ├── payments/
        │   ├── initialize.ts
        │   └── webhook.ts
        ├── social/
        │   └── ...
        └── rides/
            └── ...
```

**URL Pattern Change:**

- Old: `POST /functions/v1/create-booking`
- New: `POST /functions/v1/api/hotels/create-booking`

### 2. Move Logic to Database (RPC & RLS)

Many current functions likely perform simple database operations. Edge Functions
are overkill for these.

**A. Simple CRUD -> RLS (Row Level Security)** _Use Case:_ `get-user-profile`,
`get-hotel-details`, `update-post` _Before:_ Client -> Edge Function -> Database
_After:_ Client -> Database (protected by RLS Policies) _Savings:_ **0 Function
Slots used.**

**B. Complex Logic -> Postgres Functions (RPC)** _Use Case:_
`calculate-booking-price`, `check-room-availability` (if only DB data needed)
_Before:_ Edge Function fetches data -> calculates in JS -> returns. _After:_
PL/pgSQL function runs in database. Called via
`supabase.rpc('calculate_price')`. _Savings:_ **0 Function Slots used.** Faster
execution (data doesn't leave the DB).

## Execution Plan

### Phase 1: Structure Setup (Completed)

- [x] Create `api` function wrapper.
- [x] Implement basic Router logic in `api/index.ts`.
- [x] Move `create-booking` and `initialize-payment` to the router.

### Phase 2: Domain Consolidation (In Progress)

We will group the remaining ~140 functions into these domains:

1.  **Hotel & Booking** (`create-hotel`, `search-hotels`, etc.)
2.  **Social & Content** (`create-post`, `get-feed`, `stories`, etc.)
3.  **Rides & Transport** (`request-ride`, `driver-matching`, etc.)
4.  **Identity & User** (`profile`, `settings`)
5.  **Admin Operations** (`admin-dashboard`, `approve-vendor`)

### Phase 3: "Delete & Replace" Workflow

For each existing function folder:

1.  **Analyze:** Does it need external APIs?
    - **No:** Can it be moved to RLS or RPC? If yes, create Migration.
    - **Yes:** Move logic to `api/actions/<domain>/`.
2.  **Update Client:** Update Postman collection and Frontend code to point to
    new path.
3.  **Delete:** Remove the old function folder.
4.  **Deploy:** Redeploy `api` (and push DB migrations if RLS/RPC used).

## Immediate Next Steps

1.  **Clean up**: Delete the local folder `supabase/functions/Create-booking`
    (it is already deleted from cloud).
2.  **Migrate "Hotel" domain**: Move `search-hotels`, `get-hotel-details`,
    `check-availability` to the `api` router.
3.  **Audit for RLS**: Identify functions like `get-user-profile` that should
    probably just be direct DB calls.
