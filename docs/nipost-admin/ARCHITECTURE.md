# NIPOST Admin System Architecture

## Overview

The NIPOST admin hierarchy system provides a separate administrative layer for
Nigerian Postal Service operations, completely isolated from the main app's user
roles.

## Two Separate Worlds

### World 1: The App (Unchanged)

User-facing roles for the main application:

- **CUSTOMER** - Regular users
- **VENDOR** - E-commerce vendors
- **HOST** - Hotel owners
- **DRIVER** - Taxi drivers
- **ADVERTISER** - Ad campaign creators

### World 2: NIPOST Admin Dashboard (New)

Administrative roles for postal operations:

- **DOP** (Director of Postal Operations) - National level
- **PMG** (Postmaster General) - State level
- **REGIONAL_MANAGER** - Regional oversight
- **MODULE_ADMIN** - Module-specific access
- **COURIER** - Delivery operations

## Role Hierarchy

```
DOP (National Level)
├── Full admin access nationwide
├── Approves postal staff (PMG, REGIONAL_MANAGER, MODULE_ADMIN)
└── Can approve any courier

PMG (State Level)
├── Manages postal operations in assigned state
├── Approves couriers in their state only
└── Monitors postal staff in their state

REGIONAL_MANAGER (Regional Level)
├── Read-only access to regional data
└── Oversight and reporting

MODULE_ADMIN (Module Level)
├── Access to specific business modules
└── Module-specific dashboard access

COURIER (Operational Level)
├── Delivery operations
└── Package tracking and management
```

## Database Schema

### Core Tables

#### postal_staff

Stores postal staff applications and approvals:

```sql
- id: UUID
- staff_type: postmaster | regional_manager | admin_staff
- first_name, last_name, email, phone
- state: State assignment
- approval_status: pending | approved | rejected
- user_id: Links to auth.users (NULL until account created)
- approved_by, approved_at
- rejected_by, rejected_at, rejection_reason
```

#### courier_profiles

Stores courier applications and approvals:

```sql
- id: UUID
- user_id: Links to auth.users
- first_name, last_name, email, phone
- state, state_id: State assignment
- approval_status: pending | approved | rejected
- is_verified: Boolean
- approved_by, approved_at
- rejected_by, rejected_at, rejection_reason
```

#### nipost_user_permissions

Stores NIPOST admin permissions:

```sql
- id: UUID
- user_id: Links to auth.users
- role: DOP | PMG | REGIONAL_MANAGER | MODULE_ADMIN | COURIER
- access_level: national | state | regional | branch
- state_id, state_name: State assignment (for PMG)
- branch_id: Branch assignment (for MODULE_ADMIN)
- permissions: Array of permission strings
- module_permissions: JSONB of module-specific permissions
```

## Automatic Role Creation

### Postal Staff Approval Trigger

When DOP approves postal staff:

```sql
CREATE TRIGGER handle_postal_staff_approval
AFTER UPDATE ON postal_staff
FOR EACH ROW
WHEN (NEW.approval_status = 'approved' AND OLD.approval_status != 'approved')
EXECUTE FUNCTION create_postal_staff_roles();
```

**Automatic Actions**:

1. Creates entry in `user_roles` with appropriate role
2. Creates entry in `nipost_user_permissions` with permissions
3. Creates entry in `user_active_roles`
4. Staff member can immediately log in

### Courier Approval Trigger

When PMG approves courier:

```sql
CREATE TRIGGER handle_courier_approval
AFTER UPDATE ON courier_profiles
FOR EACH ROW
WHEN (NEW.approval_status = 'approved' AND OLD.approval_status != 'approved')
EXECUTE FUNCTION create_courier_role();
```

**Automatic Actions**:

1. Creates COURIER role in `user_roles`
2. Creates courier permissions in `nipost_user_permissions`
3. Creates entry in `user_active_roles`
4. Courier can access delivery operations

## Access Control

### State-Scoped Access (PMG)

PMG can only access data in their assigned state:

```typescript
// Middleware enforces state scope
if (user.role === 'PMG') {
  query = query.eq('state', user.stateName);
}
```

### Role-Based Access

Different endpoints require different roles:

- **DOP only**: Postal staff approval
- **PMG or higher**: Courier approval, postal monitoring
- **Any NIPOST admin**: View own permissions

## Authentication Flow

```
1. User logs in via Supabase Auth
   ↓
2. JWT token issued
   ↓
3. Request to NIPOST admin endpoint
   ↓
4. Middleware validates JWT
   ↓
5. Middleware checks nipost_user_permissions
   ↓
6. Middleware enforces role requirements
   ↓
7. Middleware enforces state scope (if PMG)
   ↓
8. Request processed
```

## Security Features

### User Account Validation

Before DOP can approve postal staff:

1. Staff member must create account in auth.users
2. DOP provides user_id in approval request
3. System validates user account exists
4. System validates user_id consistency

### State Isolation

PMG cannot access data outside their state:

- Automatic filtering on all queries
- Explicit validation on approval actions
- Error returned if state mismatch detected

### Audit Logging

All actions logged to `admin_actions`:

- Who performed the action
- What action was performed
- When it was performed
- What data was affected

## Integration Points

### With Main App

- Separate role systems (no overlap)
- Shared authentication (Supabase Auth)
- Shared database (different tables)
- Separate API endpoints

### With Delivery Service

- Couriers approved via NIPOST admin
- Delivery operations via delivery service
- Real-time tracking integration
- Route optimization integration

## Scalability Considerations

### Database

- Indexed on state for PMG queries
- Indexed on approval_status for filtering
- Soft deletes for compliance
- Audit trail for all changes

### API

- Pagination on all list endpoints
- Rate limiting per user
- Connection pooling
- Caching where appropriate

## Future Enhancements

### Planned Features

- Bulk approval operations
- Advanced filtering and search
- Performance analytics dashboard
- Mobile app for couriers
- Real-time notifications
- Automated reporting

### Potential Improvements

- Multi-state PMG support
- Hierarchical regional structure
- Custom permission templates
- Role delegation
- Temporary access grants
