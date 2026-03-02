# NIPOST Admin System - Quick Start Guide

## Overview

The NIPOST Admin Hierarchy System provides a complete administrative framework
for managing postal operations, staff, and couriers across Nigeria.

## Admin Roles

### 1. DOP (Director of Postal Operations)

- **Access Level**: National
- **Can Do**:
  - View all postal staff and courier applications nationwide
  - Approve/reject PMG, REGIONAL_MANAGER, and MODULE_ADMIN applications
  - Full access to all NIPOST operations
  - Override state-level restrictions

### 2. PMG (Postmaster General)

- **Access Level**: State
- **Can Do**:
  - View postal staff applications in their state
  - View and approve/reject courier applications in their state
  - Monitor postal operations in their state
  - Access financial ledger for their state

### 3. REGIONAL_MANAGER

- **Access Level**: State (Read-Only)
- **Can Do**:
  - View postal operations in their region
  - Read-only access to reports and analytics

### 4. MODULE_ADMIN

- **Access Level**: Module-Specific
- **Can Do**:
  - Manage specific business module (ecommerce/taxi/hotel)
  - Access module-specific dashboard

### 5. COURIER

- **Access Level**: Individual
- **Can Do**:
  - Access delivery dashboard
  - Update delivery status
  - View assigned deliveries

## API Endpoints

### Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>`
header.

### Postal Staff Management

#### Get Postal Staff Applications

```http
GET /api/nipost-admin/postal-staff/applications
```

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (pending/approved/rejected)
- `staff_type` (optional): Filter by type
  (postmaster/regional_manager/admin_staff)
- `state` (optional): Filter by state (DOP only)

**Response**:

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
      "state": "Lagos",
      "approval_status": "pending",
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

#### Approve Postal Staff Application (DOP Only)

```http
POST /api/nipost-admin/postal-staff/applications/:id/approve
```

**Request Body**:

```json
{
  "user_id": "user-uuid-here"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "approval_status": "approved",
    "approved_by": "dop-user-id",
    "approved_at": "2026-03-02T10:00:00Z"
  },
  "message": "Postal staff application approved successfully"
}
```

**What Happens Automatically**:

1. Entry created in `user_roles` with role (PMG/REGIONAL_MANAGER/MODULE_ADMIN)
2. Entry created in `nipost_user_permissions` with permissions array
3. Entry created in `user_active_roles` with active role
4. User can now log in to NIPOST admin dashboard

#### Reject Postal Staff Application (DOP Only)

```http
POST /api/nipost-admin/postal-staff/applications/:id/reject
```

**Request Body**:

```json
{
  "reason": "Incomplete documentation"
}
```

### Courier Management

#### Get Courier Applications

```http
GET /api/nipost-admin/couriers/applications
```

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (pending/approved/rejected)
- `state` (optional): Filter by state (DOP only)

**Access Control**:

- DOP: Can view all courier applications nationwide
- PMG: Can only view applications in their assigned state

#### Approve Courier Application (PMG/DOP)

```http
POST /api/nipost-admin/couriers/applications/:id/approve
```

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "approval_status": "approved",
    "approved_by": "pmg-user-id",
    "approved_at": "2026-03-02T10:00:00Z",
    "approving_state": "Lagos",
    "approving_state_id": "lagos"
  },
  "message": "Courier application approved successfully"
}
```

**What Happens Automatically**:

1. Entry created in `user_roles` with role_name='COURIER'
2. Entry created in `user_active_roles` with active_role='COURIER'
3. Courier can now log in to delivery dashboard

**State Validation**:

- PMG can only approve couriers in their assigned state
- Attempting to approve courier from different state returns 403 Forbidden

#### Reject Courier Application (PMG/DOP)

```http
POST /api/nipost-admin/couriers/applications/:id/reject
```

**Request Body**:

```json
{
  "reason": "Invalid license"
}
```

### User Permissions

#### Get My Permissions

```http
GET /api/nipost-admin/my-permissions
```

**Response**:

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
    "permissions": [
      "postal:read",
      "postal:write",
      "courier:approve",
      "financial:read"
    ],
    "is_nipost_admin": true
  }
}
```

## Workflow Examples

### Example 1: DOP Approves New PMG

1. **User applies to be PMG**:

   ```sql
   INSERT INTO postal_staff (
     staff_type, first_name, last_name, email, state, user_id
   ) VALUES (
     'postmaster', 'John', 'Doe', 'john@nipost.gov.ng', 'Lagos', 'user-uuid'
   );
   ```

2. **DOP views pending applications**:

   ```http
   GET /api/nipost-admin/postal-staff/applications?status=pending
   ```

3. **DOP approves application**:

   ```http
   POST /api/nipost-admin/postal-staff/applications/{id}/approve
   {
     "user_id": "user-uuid"
   }
   ```

4. **System automatically creates**:
   - Role: PMG in `user_roles`
   - Permissions: State-level access in `nipost_user_permissions`
   - Active role: PMG in `user_active_roles`

5. **User logs in**:
   - Backend checks `nipost_user_permissions`
   - Loads PMG role with state-level permissions
   - Routes to PMG dashboard

### Example 2: PMG Approves Courier

1. **User applies to be courier**:

   ```sql
   INSERT INTO courier_profiles (
     user_id, first_name, last_name, state, vehicle_type
   ) VALUES (
     'user-uuid', 'Jane', 'Smith', 'Lagos', 'motorcycle'
   );
   ```

2. **PMG views courier applications in their state**:

   ```http
   GET /api/nipost-admin/couriers/applications?status=pending
   ```

3. **PMG approves courier**:

   ```http
   POST /api/nipost-admin/couriers/applications/{id}/approve
   ```

4. **System automatically creates**:
   - Role: COURIER in `user_roles`
   - Active role: COURIER in `user_active_roles`
   - Sets `approving_state` to PMG's state

5. **Courier logs in**:
   - Backend checks `user_roles` for COURIER role
   - Routes to delivery dashboard

## Error Handling

### Common Error Codes

- `AUTHENTICATION_REQUIRED` (401): No JWT token provided
- `INVALID_TOKEN` (401): JWT token is invalid or expired
- `NO_PERMISSIONS` (403): User has no NIPOST admin permissions
- `NIPOST_ADMIN_REQUIRED` (403): Endpoint requires NIPOST admin access
- `STATE_ACCESS_DENIED` (403): PMG trying to access different state
- `STATE_MISMATCH` (403): PMG trying to approve courier from different state
- `MISSING_USER_ID` (400): user_id not provided in approval request
- `MISSING_REASON` (400): Rejection reason not provided

### Example Error Response

```json
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

## Database Tables

### Key Tables

1. **`postal_staff`**: Applications for PMG, REGIONAL_MANAGER, MODULE_ADMIN
2. **`courier_profiles`**: Courier applications
3. **`nipost_user_permissions`**: NIPOST admin permissions and roles
4. **`user_roles`**: Multi-role assignments (includes COURIER)
5. **`user_active_roles`**: Current active role per user

### Helper Functions

- `is_dop(user_id)`: Check if user is DOP
- `is_postmaster_general(user_id)`: Check if user is PMG
- `is_regional_manager(user_id)`: Check if user is REGIONAL_MANAGER
- `is_module_admin(user_id)`: Check if user is MODULE_ADMIN
- `is_courier(user_id)`: Check if user is COURIER

### Trigger Functions

- `handle_postal_staff_approval()`: Auto-creates roles when DOP approves postal
  staff
- `handle_courier_approval()`: Auto-creates COURIER role when PMG approves
  courier

## Security Notes

1. **State-Scoped Access**: PMG can only access data in their assigned state
2. **RLS Policies**: Database-level security enforces access control
3. **Automatic Role Creation**: Triggers handle all role creation securely
4. **Audit Trail**: All approvals/rejections logged with user attribution
5. **Role Isolation**: NIPOST admin roles separate from app roles

## Testing

### Test DOP Approval

```bash
# As DOP
curl -X POST http://localhost:3005/api/nipost-admin/postal-staff/applications/{id}/approve \
  -H "Authorization: Bearer $DOP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-uuid"}'
```

### Test PMG Courier Approval

```bash
# As PMG
curl -X POST http://localhost:3005/api/nipost-admin/couriers/applications/{id}/approve \
  -H "Authorization: Bearer $PMG_TOKEN" \
  -H "Content-Type: application/json"
```

### Test State Access Control

```bash
# PMG tries to access different state (should fail)
curl -X GET "http://localhost:3005/api/nipost-admin/postal-staff/applications?state=Abuja" \
  -H "Authorization: Bearer $PMG_TOKEN"
# Expected: 403 Forbidden
```

## Support

For issues or questions:

1. Check error codes in response
2. Verify user has correct NIPOST admin role
3. Confirm state access for PMG operations
4. Review audit logs in database
5. Check RLS policies are enabled

## Next Steps
