# NIPOST Admin System - Endpoint Changes and Data Requirements

## Overview

This document details all endpoint changes, data requirements, and validation
rules for the NIPOST Admin Hierarchy System.

## New Endpoints Added

All new endpoints are under the `/api/nipost-admin` prefix.

### 1. GET /api/nipost-admin/postal-staff/applications

**Purpose**: View postal staff applications (PMG, REGIONAL_MANAGER,
MODULE_ADMIN)

**Access Control**:

- DOP: Can view all applications nationwide
- PMG: Can view applications in their assigned state only

**Query Parameters**:

- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page
- `status` (optional): Filter by approval_status (pending/approved/rejected)
- `staff_type` (optional): Filter by staff_type
  (postmaster/regional_manager/admin_staff)
- `state` (optional, DOP only): Filter by specific state

**Response Data**:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "staff_type": "postmaster",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@nipost.gov.ng",
      "phone": "+2348012345678",
      "state": "Lagos",
      "approval_status": "pending",
      "user_id": null, // NULL until staff member creates account
      "created_at": "2026-03-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

**Data Changes**: None (read-only)

---

### 2. POST /api/nipost-admin/postal-staff/applications/:id/approve

**Purpose**: DOP approves postal staff application

**Access Control**: DOP only

**Request Body**:

```json
{
  "user_id": "uuid-of-staff-member-account"
}
```

**Validation Rules**:

1. ✅ `user_id` is required (400 MISSING_USER_ID)
2. ✅ Application must exist (404 APPLICATION_NOT_FOUND)
3. ✅ User account must exist in auth.users (400 MISSING_USER_ACCOUNT)
4. ✅ If `postal_staff.user_id` already set, must match provided `user_id` (400
   USER_ACCOUNT_MISMATCH)

**Error Responses**:

```json
// Missing user_id
{
  "success": false,
  "error": "user_id is required",
  "code": "MISSING_USER_ID",
  "details": {
    "message": "You must provide the user_id of the staff member to approve"
  }
}

// User account not created yet
{
  "success": false,
  "error": "This staff member has not created their account yet",
  "code": "MISSING_USER_ACCOUNT",
  "details": {
    "user_id": "uuid",
    "message": "The staff member must create their user account before approval. Ask them to sign up first."
  }
}

// User account mismatch
{
  "success": false,
  "error": "This staff member has already linked a different user account",
  "code": "USER_ACCOUNT_MISMATCH",
  "details": {
    "existing_user_id": "uuid-1",
    "provided_user_id": "uuid-2",
    "message": "Cannot change user_id after it has been set"
  }
}
```

**Data Changes**:

**Table: `postal_staff`**

- `approval_status`: 'pending' → 'approved'
- `approved_by`: Set to DOP's user_id
- `approved_at`: Set to current timestamp
- `user_id`: Set to provided user_id (if not already set)

**Table: `user_roles` (via trigger)**

- New row created:
  - `user_id`: From request body
  - `role_name`: 'PMG' | 'REGIONAL_MANAGER' | 'MODULE_ADMIN' (based on
    staff_type)
  - `assigned_by`: DOP's user_id
  - `assigned_at`: Current timestamp

**Table: `nipost_user_permissions` (via trigger)**

- New row created or updated:
  - `user_id`: From request body
  - `role`: 'PMG' | 'REGIONAL_MANAGER' | 'MODULE_ADMIN'
  - `access_level`: 'state'
  - `state_id`: From postal_staff.state
  - `state_name`: From postal_staff.state
  - `permissions`: Array based on role (see below)
  - `is_active`: true
  - `created_by`: DOP's user_id

**Permissions by Role**:

- **PMG**:
  `['postal:read', 'postal:write', 'postal:monitor', 'courier:read', 'courier:approve', 'courier:manage', 'financial:read', 'financial:ledger', 'reports:read', 'reports:generate']`
- **REGIONAL_MANAGER**:
  `['postal:read', 'postal:monitor', 'courier:read', 'reports:read']`
- **MODULE_ADMIN**:
  `['module:read', 'module:write', 'module:manage', 'reports:read']`

**Table: `user_active_roles` (via trigger)**

- New row created or updated:
  - `user_id`: From request body
  - `active_role`: 'PMG' | 'REGIONAL_MANAGER' | 'MODULE_ADMIN'
  - `updated_at`: Current timestamp

---

### 3. POST /api/nipost-admin/postal-staff/applications/:id/reject

**Purpose**: DOP rejects postal staff application

**Access Control**: DOP only

**Request Body**:

```json
{
  "reason": "Incomplete documentation"
}
```

**Validation Rules**:

1. ✅ `reason` is required (400 MISSING_REASON)
2. ✅ Application must exist (404 APPLICATION_NOT_FOUND)

**Data Changes**:

**Table: `postal_staff`**

- `approval_status`: 'pending' → 'rejected'
- `rejected_by`: Set to DOP's user_id
- `rejected_at`: Set to current timestamp
- `rejection_reason`: Set to provided reason

---

### 4. GET /api/nipost-admin/couriers/applications

**Purpose**: View courier applications

**Access Control**:

- DOP: Can view all courier applications nationwide
- PMG: Can view applications in their assigned state only

**Query Parameters**:

- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page
- `status` (optional): Filter by approval_status (pending/approved/rejected)
- `state` (optional, DOP only): Filter by specific state

**Response Data**:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "courier_code": "COU-001234",
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane@example.com",
      "phone_number": "+2348012345678",
      "state": "Lagos",
      "state_id": "lagos",
      "vehicle_type": "motorcycle",
      "approval_status": "pending",
      "created_at": "2026-03-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

**Data Changes**: None (read-only)

---

### 5. POST /api/nipost-admin/couriers/applications/:id/approve

**Purpose**: PMG or DOP approves courier application

**Access Control**: PMG (state-scoped) or DOP (national)

**Request Body**: None required (user_id already in courier_profiles)

**Validation Rules**:

1. ✅ Application must exist (404 APPLICATION_NOT_FOUND)
2. ✅ PMG can only approve couriers in their assigned state (403 STATE_MISMATCH)
3. ✅ DOP can approve any courier

**State Validation for PMG**:

```json
// PMG tries to approve courier from different state
{
  "success": false,
  "error": "Cannot approve courier from different state",
  "code": "STATE_MISMATCH",
  "details": {
    "courierState": "Abuja",
    "pmgState": "Lagos"
  }
}
```

**Data Changes**:

**Table: `courier_profiles`**

- `approval_status`: 'pending' → 'approved'
- `approved_by`: Set to PMG/DOP user_id
- `approved_at`: Set to current timestamp
- `approving_state`: Set to PMG's state (from nipost_user_permissions)
- `approving_state_id`: Set to PMG's state_id (from nipost_user_permissions)
- `is_verified`: Set to true

**Table: `user_roles` (via trigger)**

- New row created:
  - `user_id`: From courier_profiles.user_id
  - `role_name`: 'COURIER'
  - `assigned_by`: PMG/DOP user_id
  - `assigned_at`: Current timestamp

**Table: `user_active_roles` (via trigger)**

- New row created or updated:
  - `user_id`: From courier_profiles.user_id
  - `active_role`: 'COURIER'
  - `updated_at`: Current timestamp

---

### 6. POST /api/nipost-admin/couriers/applications/:id/reject

**Purpose**: PMG or DOP rejects courier application

**Access Control**: PMG (state-scoped) or DOP (national)

**Request Body**:

```json
{
  "reason": "Invalid license"
}
```

**Validation Rules**:

1. ✅ `reason` is required (400 MISSING_REASON)
2. ✅ Application must exist (404 APPLICATION_NOT_FOUND)
3. ✅ PMG can only reject couriers in their assigned state (403 STATE_MISMATCH)

**Data Changes**:

**Table: `courier_profiles`**

- `approval_status`: 'pending' → 'rejected'
- `rejected_by`: Set to PMG/DOP user_id
- `rejected_at`: Set to current timestamp
- `rejection_reason`: Set to provided reason

---

### 7. GET /api/nipost-admin/my-permissions

**Purpose**: Get current user's NIPOST admin permissions

**Access Control**: Any authenticated user

**Response Data**:

```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "email": "user@nipost.gov.ng",
    "role": "PMG",
    "access_level": "state",
    "state_id": "lagos",
    "state_name": "Lagos",
    "branch_id": null,
    "permissions": ["postal:read", "postal:write", "courier:approve"],
    "module_permissions": {},
    "is_nipost_admin": true
  }
}
```

**Data Changes**: None (read-only)

---

## Modified Endpoints

### Authentication Middleware Changes

**Endpoint**: All `/api/nipost-admin/*` endpoints

**Changes**:

- Authentication middleware now checks `nipost_user_permissions` table
- Loads NIPOST admin role and permissions
- Sets `req.user.isNipostAdmin = true` for NIPOST admin users
- Adds `req.user.stateName` and `req.user.modulePermissions` fields

**Impact on Existing Endpoints**: None - existing endpoints continue to work as
before

---

## Database Schema Changes

### New Columns

**Table: `postal_staff`**

- `user_id` (uuid, nullable, unique): Links postal staff to auth.users account
  - Must be set before DOP approval
  - Validated to ensure user account exists

**Table: `courier_profiles`**

- `approving_state` (text, nullable): State name of approving PMG
- `approving_state_id` (text, nullable): State ID of approving PMG
- Both set automatically by trigger when PMG approves

### New Constraints

**Table: `user_roles`**

- Check constraint updated to include: 'DOP', 'PMG', 'REGIONAL_MANAGER',
  'MODULE_ADMIN', 'COURIER'

**Table: `user_active_roles`**

- Check constraint updated to include: 'DOP', 'PMG', 'REGIONAL_MANAGER',
  'MODULE_ADMIN', 'COURIER'

---

## Workflow Requirements

### Postal Staff Approval Workflow

**Step 1: Staff Member Applies**

```sql
INSERT INTO postal_staff (
  staff_type, first_name, last_name, email, state
) VALUES (
  'postmaster', 'John', 'Doe', 'john@nipost.gov.ng', 'Lagos'
);
-- user_id is NULL at this point
```

**Step 2: Staff Member Creates Account**

- Staff member signs up via auth system
- Gets user_id from auth.users

**Step 3: Staff Member Links Account**

```sql
UPDATE postal_staff
SET user_id = 'their-user-id'
WHERE email = 'john@nipost.gov.ng';
```

**Step 4: DOP Approves**

```http
POST /api/nipost-admin/postal-staff/applications/{id}/approve
{
  "user_id": "their-user-id"
}
```

**Step 5: Automatic Role Creation**

- Trigger creates entries in user_roles, nipost_user_permissions,
  user_active_roles
- Staff member can now log in to NIPOST admin dashboard

### Courier Approval Workflow

**Step 1: User Creates Account**

- User signs up via auth system
- Gets user_id from auth.users

**Step 2: User Applies as Courier**

```sql
INSERT INTO courier_profiles (
  user_id, first_name, last_name, state, vehicle_type
) VALUES (
  'user-id', 'Jane', 'Smith', 'Lagos', 'motorcycle'
);
```

**Step 3: PMG Approves**

```http
POST /api/nipost-admin/couriers/applications/{id}/approve
```

**Step 4: Automatic Role Creation**

- Trigger creates entries in user_roles, user_active_roles
- Courier can now log in to delivery dashboard

---

## Error Codes Reference

| Code                    | HTTP Status | Description                                        |
| ----------------------- | ----------- | -------------------------------------------------- |
| MISSING_USER_ID         | 400         | user_id not provided in approval request           |
| MISSING_USER_ACCOUNT    | 400         | Staff member hasn't created their account yet      |
| USER_ACCOUNT_MISMATCH   | 400         | Trying to change user_id after it's been set       |
| MISSING_REASON          | 400         | Rejection reason not provided                      |
| APPLICATION_NOT_FOUND   | 404         | Application doesn't exist                          |
| STATE_MISMATCH          | 403         | PMG trying to approve courier from different state |
| AUTHENTICATION_REQUIRED | 401         | No JWT token provided                              |
| INVALID_TOKEN           | 401         | JWT token is invalid or expired                    |
| NO_PERMISSIONS          | 403         | User has no NIPOST admin permissions               |
| NIPOST_ADMIN_REQUIRED   | 403         | Endpoint requires NIPOST admin access              |
| STATE_ACCESS_DENIED     | 403         | PMG trying to access different state               |

---

## Testing Checklist

### Postal Staff Approval

- [ ] Test approval without user_id (should fail with MISSING_USER_ID)
- [ ] Test approval with non-existent user_id (should fail with
      MISSING_USER_ACCOUNT)
- [ ] Test approval with valid user_id (should succeed and create roles)
- [ ] Test approval with mismatched user_id (should fail with
      USER_ACCOUNT_MISMATCH)
- [ ] Verify trigger creates entries in user_roles, nipost_user_permissions,
      user_active_roles
- [ ] Verify staff member can log in after approval

### Courier Approval

- [ ] Test PMG approving courier in their state (should succeed)
- [ ] Test PMG approving courier in different state (should fail with
      STATE_MISMATCH)
- [ ] Test DOP approving any courier (should succeed)
- [ ] Verify trigger creates entries in user_roles, user_active_roles
- [ ] Verify courier can log in after approval

### State-Scoped Access

- [ ] Test PMG viewing applications in their state (should succeed)
- [ ] Test PMG viewing applications in different state (should fail)
- [ ] Test DOP viewing all applications (should succeed)

---

## Migration Impact

### Breaking Changes

None - all changes are additive

### New Features

- NIPOST admin hierarchy system
- Automatic role creation via triggers
- State-scoped access control for PMG

### Backward Compatibility

- Existing app roles (CUSTOMER, VENDOR, HOST, DRIVER, ADVERTISER) unchanged
- Existing endpoints continue to work as before
- New endpoints are isolated under `/api/nipost-admin` prefix
