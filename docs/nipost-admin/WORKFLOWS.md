# NIPOST Admin Workflows

## Postal Staff Approval Workflow

### Step 1: Staff Member Application

1. Staff member fills out application form
2. Application stored in `postal_staff` table
3. Status: `pending`
4. `user_id`: NULL (not linked yet)

### Step 2: Staff Member Creates Account

**CRITICAL**: This must happen before DOP approval!

1. Staff member signs up via Supabase Auth
2. Account created in `auth.users`
3. Staff member receives `user_id`
4. Staff member provides `user_id` to DOP

### Step 3: DOP Reviews Application

1. DOP logs into NIPOST admin dashboard
2. DOP views pending applications
3. DOP sees application details:
   - Name, email, phone
   - Staff type (PMG, REGIONAL_MANAGER, MODULE_ADMIN)
   - State assignment
   - **user_id status** (linked or not)

### Step 4: DOP Approves Application

1. DOP clicks "Approve"
2. DOP provides staff member's `user_id`
3. System validates:
   - ✅ user_id provided
   - ✅ Application exists
   - ✅ User account exists in auth.users
   - ✅ user_id consistency (if already set)
4. If validation passes:
   - Update `postal_staff.approval_status = 'approved'`
   - Set `approved_by`, `approved_at`
   - Set `user_id`
5. Database trigger fires automatically:
   - Creates role in `user_roles`
   - Creates permissions in `nipost_user_permissions`
   - Creates active role in `user_active_roles`

### Step 5: Staff Member Logs In

1. Staff member logs in with their account
2. JWT token includes NIPOST admin role
3. Staff member accesses NIPOST admin dashboard
4. Dashboard shows appropriate features based on role

### Error Scenarios

#### Missing User Account

```
Error: MISSING_USER_ACCOUNT
Message: "This staff member has not created their account yet"
Action: Ask staff member to sign up first
```

#### User Account Mismatch

```
Error: USER_ACCOUNT_MISMATCH
Message: "This staff member has already linked a different account"
Action: Cannot change user_id after it's set
```

## Courier Approval Workflow

### Step 1: Courier Application

1. Courier fills out application form
2. Application stored in `courier_profiles` table
3. Status: `pending`
4. `user_id`: Set from authenticated user

### Step 2: PMG Reviews Application

1. PMG logs into NIPOST admin dashboard
2. PMG views pending courier applications **in their state only**
3. PMG sees courier details:
   - Name, email, phone
   - State assignment
   - Vehicle information
   - Documents

### Step 3: PMG Approves Courier

1. PMG clicks "Approve"
2. System validates:
   - ✅ Courier application exists
   - ✅ Courier state matches PMG state
3. If validation passes:
   - Update `courier_profiles.approval_status = 'approved'`
   - Set `is_verified = true`
   - Set `approved_by`, `approved_at`
4. Database trigger fires automatically:
   - Creates COURIER role in `user_roles`
   - Creates permissions in `nipost_user_permissions`
   - Creates active role in `user_active_roles`

### Step 4: Courier Starts Operations

1. Courier logs in with their account
2. Courier accesses delivery operations
3. Courier can accept delivery requests
4. Courier can track packages

### Error Scenarios

#### State Mismatch

```
Error: STATE_MISMATCH
Message: "Cannot approve courier from different state"
Details: { courierState: "Lagos", pmgState: "Abuja" }
Action: Only DOP can approve couriers in other states
```

## Permission Check Workflow

### Frontend Permission Check

```typescript
// 1. Get user permissions
const permissions = await checkNipostPermissions(token);

// 2. Check if user is NIPOST admin
if (!permissions) {
  // Redirect to main app
  return;
}

// 3. Show appropriate dashboard based on role
switch (permissions.role) {
  case 'DOP':
    return <DOPDashboard />;
  case 'PMG':
    return <PMGDashboard state={permissions.stateName} />;
  case 'REGIONAL_MANAGER':
    return <RegionalDashboard />;
  case 'MODULE_ADMIN':
    return <ModuleDashboard />;
  case 'COURIER':
    return <CourierDashboard />;
}
```

## State-Scoped Access Workflow

### PMG State Filtering

```typescript
// 1. PMG makes request to list applications
GET / api / nipost - admin / couriers / applications;

// 2. Middleware extracts user info from JWT
const user = {
  role: 'PMG',
  stateName: 'Lagos',
};

// 3. Middleware automatically filters by state
query = query.eq('state', 'Lagos');

// 4. PMG only sees Lagos couriers
// Cannot see or approve couriers from other states
```

### DOP National Access

```typescript
// 1. DOP makes request to list applications
GET /api/nipost-admin/couriers/applications

// 2. Middleware extracts user info from JWT
const user = {
  role: 'DOP',
  stateName: null // National level
};

// 3. No state filtering applied
// DOP sees all couriers nationwide

// 4. DOP can optionally filter by state
GET /api/nipost-admin/couriers/applications?state=Lagos
```

## Rejection Workflow

### Postal Staff Rejection

1. DOP reviews application
2. DOP clicks "Reject"
3. DOP provides rejection reason
4. System updates:
   - `approval_status = 'rejected'`
   - `rejected_by`, `rejected_at`
   - `rejection_reason`
5. No roles created
6. Staff member notified (if notification system exists)

### Courier Rejection

1. PMG reviews application
2. PMG validates courier is in their state
3. PMG clicks "Reject"
4. PMG provides rejection reason
5. System updates:
   - `approval_status = 'rejected'`
   - `rejected_by`, `rejected_at`
   - `rejection_reason`
6. No roles created
7. Courier notified (if notification system exists)

## Audit Trail Workflow

All actions automatically logged:

```typescript
// Approval action
{
  action: 'approve_postal_staff',
  table_name: 'postal_staff',
  record_id: 'staff-uuid',
  user_id: 'dop-uuid',
  metadata: {
    staff_type: 'postmaster',
    user_id: 'staff-user-uuid'
  },
  timestamp: '2024-01-15T10:30:00Z'
}

// Rejection action
{
  action: 'reject_courier',
  table_name: 'courier_profiles',
  record_id: 'courier-uuid',
  user_id: 'pmg-uuid',
  metadata: {
    reason: 'Incomplete documentation'
  },
  timestamp: '2024-01-15T10:35:00Z'
}
```

## Integration Workflows

### With Delivery Service

1. Courier approved via NIPOST admin
2. Courier role created automatically
3. Courier logs into delivery app
4. Delivery service validates courier role
5. Courier can accept delivery requests

### With Main App

1. User has both app role and NIPOST role
2. JWT token includes both roles
3. Frontend checks which dashboard to show
4. User can switch between dashboards
5. Roles remain completely separate

## Best Practices

### For DOP

1. Always verify staff member has created account before approval
2. Check user_id is provided and valid
3. Review staff type and state assignment
4. Provide clear rejection reasons
5. Monitor approval patterns for anomalies

### For PMG

1. Only approve couriers in your assigned state
2. Verify courier documentation is complete
3. Check vehicle information is valid
4. Provide clear rejection reasons
5. Monitor courier performance after approval

### For Frontend Developers

1. Always check permissions before showing dashboard
2. Handle all error codes gracefully
3. Show clear messages to users
4. Validate user_id before approval requests
5. Use Swagger UI for testing
