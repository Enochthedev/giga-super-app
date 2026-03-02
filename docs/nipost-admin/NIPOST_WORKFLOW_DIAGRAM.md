# NIPOST Admin System - Workflow Diagrams

## Postal Staff Approval Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    POSTAL STAFF APPROVAL FLOW                    │
└─────────────────────────────────────────────────────────────────┘

Step 1: Staff Member Applies
┌──────────────────────┐
│  Staff Member        │
│  Fills Application   │
│  (No account yet)    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  postal_staff        │
│  - staff_type        │
│  - first_name        │
│  - last_name         │
│  - email             │
│  - state             │
│  - user_id: NULL ❌  │
│  - status: pending   │
└──────────────────────┘

Step 2: Staff Member Creates Account
┌──────────────────────┐
│  Staff Member        │
│  Signs Up            │
│  (Gets user_id)      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  auth.users          │
│  - id (user_id)      │
│  - email             │
└──────────────────────┘

Step 3: Staff Member Links Account
┌──────────────────────┐
│  Staff Member        │
│  Updates Application │
│  with user_id        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  postal_staff        │
│  - user_id: SET ✅   │
└──────────────────────┘

Step 4: DOP Reviews Application
┌──────────────────────┐
│  DOP                 │
│  Views Applications  │
│  GET /applications   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  Validation Checks                       │
│  ✅ user_id provided?                    │
│  ✅ Application exists?                  │
│  ✅ User account exists in auth.users?   │
│  ✅ user_id matches existing?            │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────┐
│  DOP Approves        │
│  POST /approve       │
│  { user_id }         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  Database Updates                        │
│  1. postal_staff                         │
│     - approval_status: approved          │
│     - approved_by: DOP user_id           │
│     - approved_at: timestamp             │
│                                          │
│  2. Trigger: handle_postal_staff_approval│
│     Creates:                             │
│     - user_roles (PMG/REGIONAL/MODULE)   │
│     - nipost_user_permissions            │
│     - user_active_roles                  │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────┐
│  Staff Member        │
│  Can Now Login       │
│  to Admin Dashboard  │
└──────────────────────┘
```

## Courier Approval Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     COURIER APPROVAL FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Step 1: User Creates Account
┌──────────────────────┐
│  User                │
│  Signs Up            │
│  (Gets user_id)      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  auth.users          │
│  - id (user_id)      │
│  - email             │
└──────────────────────┘

Step 2: User Applies as Courier
┌──────────────────────┐
│  User                │
│  Fills Courier Form  │
│  (Has user_id)       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  courier_profiles    │
│  - user_id ✅        │
│  - first_name        │
│  - last_name         │
│  - state             │
│  - vehicle_type      │
│  - status: pending   │
└──────────────────────┘

Step 3: PMG Reviews Applications
┌──────────────────────┐
│  PMG                 │
│  Views Applications  │
│  (State-filtered)    │
│  GET /applications   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  State Validation                        │
│  ✅ Courier state matches PMG state?     │
│  ❌ Different state → 403 STATE_MISMATCH │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────┐
│  PMG Approves        │
│  POST /approve       │
│  (No body needed)    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  Database Updates                        │
│  1. courier_profiles                     │
│     - approval_status: approved          │
│     - approved_by: PMG user_id           │
│     - approved_at: timestamp             │
│     - approving_state: PMG state         │
│     - approving_state_id: PMG state_id   │
│     - is_verified: true                  │
│                                          │
│  2. Trigger: handle_courier_approval     │
│     Creates:                             │
│     - user_roles (COURIER)               │
│     - user_active_roles (COURIER)        │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────┐
│  Courier             │
│  Can Now Login       │
│  to Delivery Dashboard│
└──────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPROVAL ERROR HANDLING                       │
└─────────────────────────────────────────────────────────────────┘

POST /postal-staff/applications/:id/approve
           │
           ▼
┌──────────────────────────────────────────┐
│  Validation Step 1: user_id provided?    │
└──────────┬───────────────────────────────┘
           │
    ❌ NO  │  ✅ YES
           │
           ▼
┌──────────────────────┐
│  400 MISSING_USER_ID │
│  "user_id required"  │
└──────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  Validation Step 2: Application exists?  │
└──────────┬───────────────────────────────┘
           │
    ❌ NO  │  ✅ YES
           │
           ▼
┌──────────────────────────────┐
│  404 APPLICATION_NOT_FOUND   │
│  "Application not found"     │
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  Validation Step 3: user_id consistent?  │
│  (If already set, must match)            │
└──────────┬───────────────────────────────┘
           │
    ❌ NO  │  ✅ YES
           │
           ▼
┌──────────────────────────────────┐
│  400 USER_ACCOUNT_MISMATCH       │
│  "Cannot change user_id"         │
│  existing_user_id vs provided    │
└──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  Validation Step 4: User account exists? │
│  Check auth.users via admin API          │
└──────────┬───────────────────────────────┘
           │
    ❌ NO  │  ✅ YES
           │
           ▼
┌──────────────────────────────────────┐
│  400 MISSING_USER_ACCOUNT            │
│  "Staff member has not created       │
│   their account yet"                 │
│  "Ask them to sign up first"         │
└──────────────────────────────────────┘
           │
           ▼
┌──────────────────────┐
│  ✅ All Checks Pass  │
│  Proceed with        │
│  Approval            │
└──────────────────────┘
```

## State-Scoped Access Control

```
┌─────────────────────────────────────────────────────────────────┐
│                   STATE-SCOPED ACCESS CONTROL                    │
└─────────────────────────────────────────────────────────────────┘

PMG Request: GET /couriers/applications
           │
           ▼
┌──────────────────────────────────────────┐
│  Load PMG Permissions                    │
│  - role: PMG                             │
│  - access_level: state                   │
│  - state_name: Lagos                     │
│  - state_id: lagos                       │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  Apply State Filter                      │
│  WHERE state = 'Lagos'                   │
│     OR state_id = 'lagos'                │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  Return Only Lagos Couriers              │
│  ✅ Courier 1 (Lagos)                    │
│  ✅ Courier 2 (Lagos)                    │
│  ❌ Courier 3 (Abuja) - FILTERED OUT     │
└──────────────────────────────────────────┘

PMG Request: POST /couriers/applications/:id/approve
           │
           ▼
┌──────────────────────────────────────────┐
│  Get Courier Application                 │
│  - courier.state: Abuja                  │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  Check State Match                       │
│  PMG state: Lagos                        │
│  Courier state: Abuja                    │
│  Match? NO ❌                            │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  403 STATE_MISMATCH                      │
│  "Cannot approve courier from            │
│   different state"                       │
│  courierState: Abuja                     │
│  pmgState: Lagos                         │
└──────────────────────────────────────────┘

DOP Request: Same endpoints
           │
           ▼
┌──────────────────────────────────────────┐
│  Load DOP Permissions                    │
│  - role: DOP                             │
│  - access_level: national                │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  No State Filter Applied                 │
│  ✅ Access to ALL states                 │
└──────────────────────────────────────────┘
```

## Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                        ROLE HIERARCHY                            │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │     DOP     │
                    │  (National) │
                    │  Full Access│
                    └──────┬──────┘
                           │
                           │ Approves
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│      PMG      │  │   REGIONAL    │  │    MODULE     │
│    (State)    │  │    MANAGER    │  │     ADMIN     │
│               │  │  (Read-Only)  │  │   (Module)    │
└───────┬───────┘  └───────────────┘  └───────────────┘
        │
        │ Approves
        │
        ▼
┌───────────────┐
│    COURIER    │
│  (Individual) │
└───────────────┘

Access Levels:
- DOP: National (all states)
- PMG: State (assigned state only)
- REGIONAL_MANAGER: State (read-only)
- MODULE_ADMIN: Module-specific
- COURIER: Individual deliveries
```

## Data Flow Summary

```
Application → Validation → Approval → Trigger → Role Creation → Login

postal_staff          →  Validation  →  DOP Approves  →  Trigger  →  PMG Role  →  Dashboard
(user_id set)            (4 checks)      (updates DB)     (auto)      (created)     (access)

courier_profiles      →  Validation  →  PMG Approves  →  Trigger  →  COURIER   →  Delivery
(user_id exists)         (2 checks)      (state check)    (auto)      (created)     (access)
```
