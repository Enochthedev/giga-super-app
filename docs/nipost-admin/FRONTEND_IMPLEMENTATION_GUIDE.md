# NIPOST Admin Dashboard - Frontend Implementation Guide

## Overview

This guide provides everything the frontend developer needs to implement the
NIPOST Admin Dashboard with the new admin hierarchy system.

## Quick Start

### 1. API Base URL

```typescript
// Development
const API_BASE_URL = 'http://localhost:3005';

// Production
const API_BASE_URL = 'https://admin-service-production.up.railway.app';
```

### 2. Authentication

All API requests require JWT token from Supabase Auth:

```typescript
// Get token from Supabase Auth
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Add to all requests
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### 3. Check User Role

After login, check if user has NIPOST admin access:

```typescript
// GET /api/nipost-admin/my-permissions
const response = await fetch(`${API_BASE_URL}/api/nipost-admin/my-permissions`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();

// data contains:
{
  user_id: "uuid",
  email: "user@nipost.gov.ng",
  role: "DOP" | "PMG" | "REGIONAL_MANAGER" | "MODULE_ADMIN" | "COURIER",
  access_level: "national" | "state" | "branch",
  state_id: "lagos",
  state_name: "Lagos",
  permissions: ["postal:read", "postal:write", "courier:approve", ...],
  is_nipost_admin: true
}
```

**Route user to appropriate dashboard based on role:**

- `DOP` → Full admin dashboard
- `PMG` → State-level postal monitoring + courier approval
- `REGIONAL_MANAGER` → Read-only regional dashboard
- `MODULE_ADMIN` → Module-specific dashboard
- `COURIER` → Delivery dashboard (different app)

---

## User Flows to Implement

### Flow 1: DOP Approves Postal Staff (PMG/Regional Manager/Module Admin)

#### Step 1: View Applications

```typescript
// GET /api/nipost-admin/postal-staff/applications
const getPostalStaffApplications = async (filters: {
  page?: number;
  limit?: number;
  status?: 'pending' | 'approved' | 'rejected';
  staff_type?: 'postmaster' | 'regional_manager' | 'admin_staff';
  state?: string;
}) => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.status) params.append('status', filters.status);
  if (filters.staff_type) params.append('staff_type', filters.staff_type);
  if (filters.state) params.append('state', filters.state);

  const response = await fetch(
    `${API_BASE_URL}/api/nipost-admin/postal-staff/applications?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
};

// Response:
{
  success: true,
  data: [
    {
      id: "uuid",
      staff_type: "postmaster",
      first_name: "John",
      last_name: "Doe",
      email: "john@nipost.gov.ng",
      phone: "+2348012345678",
      state: "Lagos",
      approval_status: "pending",
      user_id: null,  // ⚠️ NULL means staff hasn't created account yet
      created_at: "2026-03-01T10:00:00Z"
    }
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 50,
    pages: 3
  }
}
```

#### Step 2: Display Application Details

**UI Components Needed:**

- Application list table with filters
- Application detail modal/page
- Status badges (pending/approved/rejected)
- Staff type badges (PMG/Regional Manager/Module Admin)

**Important Fields to Display:**

- ✅ `user_id` status - Show warning if NULL
- ✅ Staff type (determines role they'll get)
- ✅ State (determines their access scope)
- ✅ Contact information
- ✅ Application date

**User ID Status Indicator:**

```typescript
// Show this warning if user_id is NULL
if (!application.user_id) {
  return (
    <Alert type="warning">
      ⚠️ This staff member has not created their account yet.
      They must sign up before you can approve them.
    </Alert>
  );
}
```

#### Step 3: Approve Application

```typescript
// POST /api/nipost-admin/postal-staff/applications/:id/approve
const approvePostalStaff = async (applicationId: string, userId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/api/nipost-admin/postal-staff/applications/${applicationId}/approve`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: userId })
    }
  );

  const result = await response.json();

  if (!result.success) {
    // Handle errors
    switch (result.code) {
      case 'MISSING_USER_ACCOUNT':
        throw new Error('Staff member must create their account first. Ask them to sign up.');
      case 'USER_ACCOUNT_MISMATCH':
        throw new Error('This staff member has already linked a different account.');
      case 'MISSING_USER_ID':
        throw new Error('Please provide the user ID.');
      default:
        throw new Error(result.error);
    }
  }

  return result;
};

// Success response:
{
  success: true,
  data: {
    id: "uuid",
    approval_status: "approved",
    approved_by: "dop-user-id",
    approved_at: "2026-03-02T10:00:00Z"
  },
  message: "Postal staff application approved successfully"
}
```

**What Happens Automatically (show in UI):**

```typescript
// After approval, system automatically creates:
// 1. Entry in user_roles with role (PMG/REGIONAL_MANAGER/MODULE_ADMIN)
// 2. Entry in nipost_user_permissions with permissions
// 3. Entry in user_active_roles
// 4. Staff member can now log in to admin dashboard

// Show success message:
'✅ Application approved! John Doe can now log in as Postmaster General (PMG) for Lagos state.';
```

#### Step 4: Reject Application

```typescript
// POST /api/nipost-admin/postal-staff/applications/:id/reject
const rejectPostalStaff = async (applicationId: string, reason: string) => {
  const response = await fetch(
    `${API_BASE_URL}/api/nipost-admin/postal-staff/applications/${applicationId}/reject`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    }
  );

  return await response.json();
};
```

---

### Flow 2: PMG Approves Couriers

#### Step 1: View Courier Applications

```typescript
// GET /api/nipost-admin/couriers/applications
const getCourierApplications = async (filters: {
  page?: number;
  limit?: number;
  status?: 'pending' | 'approved' | 'rejected';
  state?: string;  // Only works for DOP
}) => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.status) params.append('status', filters.status);
  if (filters.state) params.append('state', filters.state);

  const response = await fetch(
    `${API_BASE_URL}/api/nipost-admin/couriers/applications?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
};

// Response:
{
  success: true,
  data: [
    {
      id: "uuid",
      user_id: "uuid",  // ✅ Always present (courier creates account first)
      courier_code: "COU-001234",
      first_name: "Jane",
      last_name: "Smith",
      email: "jane@example.com",
      phone_number: "+2348012345678",
      state: "Lagos",
      state_id: "lagos",
      vehicle_type: "motorcycle",
      vehicle_registration: "LAG-123-XY",
      license_number: "ABC123456",
      license_expiry_date: "2027-12-31",
      approval_status: "pending",
      created_at: "2026-03-01T10:00:00Z"
    }
  ],
  pagination: { ... }
}
```

**Important: PMG State Filtering**

- PMG automatically sees only couriers in their state
- DOP sees all couriers nationwide
- No need to manually filter by state for PMG

#### Step 2: Display Courier Details

**UI Components Needed:**

- Courier list table with filters
- Courier detail modal/page with:
  - Personal information
  - Vehicle details
  - License information
  - State information
- Status badges
- Vehicle type badges

#### Step 3: Approve Courier

```typescript
// POST /api/nipost-admin/couriers/applications/:id/approve
const approveCourier = async (applicationId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/api/nipost-admin/couriers/applications/${applicationId}/approve`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      // No body required - user_id already in courier_profiles
    }
  );

  const result = await response.json();

  if (!result.success) {
    // Handle errors
    switch (result.code) {
      case 'STATE_MISMATCH':
        throw new Error(`Cannot approve courier from ${result.details.courierState}. You can only approve couriers in ${result.details.pmgState}.`);
      default:
        throw new Error(result.error);
    }
  }

  return result;
};

// Success response:
{
  success: true,
  data: {
    id: "uuid",
    approval_status: "approved",
    approved_by: "pmg-user-id",
    approved_at: "2026-03-02T10:00:00Z",
    approving_state: "Lagos",
    approving_state_id: "lagos",
    is_verified: true
  },
  message: "Courier application approved successfully"
}
```

**What Happens Automatically:**

```typescript
// After approval, system automatically creates:
// 1. Entry in user_roles with role='COURIER'
// 2. Entry in user_active_roles with active_role='COURIER'
// 3. Courier can now log in to delivery app

// Show success message:
'✅ Courier approved! Jane Smith can now log in to the delivery app and start accepting deliveries.';
```

#### Step 4: Reject Courier

```typescript
// POST /api/nipost-admin/couriers/applications/:id/reject
const rejectCourier = async (applicationId: string, reason: string) => {
  const response = await fetch(
    `${API_BASE_URL}/api/nipost-admin/couriers/applications/${applicationId}/reject`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    }
  );

  return await response.json();
};
```

---

## UI Components to Build

### 1. Dashboard Layout

```typescript
// Based on user role, show different navigation
const DashboardLayout = ({ userRole, permissions }) => {
  return (
    <Layout>
      <Sidebar>
        {/* DOP sees everything */}
        {userRole === 'DOP' && (
          <>
            <NavItem to="/postal-staff">Postal Staff Applications</NavItem>
            <NavItem to="/couriers">Courier Applications</NavItem>
            <NavItem to="/postal-monitoring">Postal Monitoring</NavItem>
            <NavItem to="/analytics">Analytics</NavItem>
          </>
        )}

        {/* PMG sees state-level operations */}
        {userRole === 'PMG' && (
          <>
            <NavItem to="/couriers">Courier Applications</NavItem>
            <NavItem to="/postal-monitoring">Postal Monitoring</NavItem>
            <NavItem to="/financial-ledger">Financial Ledger</NavItem>
          </>
        )}

        {/* REGIONAL_MANAGER sees read-only */}
        {userRole === 'REGIONAL_MANAGER' && (
          <>
            <NavItem to="/postal-monitoring">Postal Monitoring (Read-Only)</NavItem>
            <NavItem to="/reports">Reports</NavItem>
          </>
        )}
      </Sidebar>

      <MainContent>
        {children}
      </MainContent>
    </Layout>
  );
};
```

### 2. Postal Staff Applications Page

```typescript
const PostalStaffApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [filters, setFilters] = useState({
    status: 'pending',
    staff_type: '',
    state: '',
    page: 1,
    limit: 20
  });

  useEffect(() => {
    loadApplications();
  }, [filters]);

  const loadApplications = async () => {
    const result = await getPostalStaffApplications(filters);
    setApplications(result.data);
  };

  return (
    <div>
      <h1>Postal Staff Applications</h1>

      {/* Filters */}
      <Filters>
        <Select
          value={filters.status}
          onChange={(v) => setFilters({...filters, status: v})}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>

        <Select
          value={filters.staff_type}
          onChange={(v) => setFilters({...filters, staff_type: v})}
        >
          <option value="">All Types</option>
          <option value="postmaster">Postmaster (PMG)</option>
          <option value="regional_manager">Regional Manager</option>
          <option value="admin_staff">Module Admin</option>
        </Select>

        {/* Only show state filter for DOP */}
        {userRole === 'DOP' && (
          <Select
            value={filters.state}
            onChange={(v) => setFilters({...filters, state: v})}
          >
            <option value="">All States</option>
            <option value="Lagos">Lagos</option>
            <option value="Abuja">Abuja</option>
            {/* ... other states */}
          </Select>
        )}
      </Filters>

      {/* Applications Table */}
      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Staff Type</th>
            <th>State</th>
            <th>Account Status</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map(app => (
            <tr key={app.id}>
              <td>{app.first_name} {app.last_name}</td>
              <td>{app.email}</td>
              <td>
                <Badge color="blue">
                  {app.staff_type === 'postmaster' && 'PMG'}
                  {app.staff_type === 'regional_manager' && 'Regional Manager'}
                  {app.staff_type === 'admin_staff' && 'Module Admin'}
                </Badge>
              </td>
              <td>{app.state}</td>
              <td>
                {app.user_id ? (
                  <Badge color="green">✓ Account Created</Badge>
                ) : (
                  <Badge color="yellow">⚠️ No Account</Badge>
                )}
              </td>
              <td>
                <Badge color={
                  app.approval_status === 'approved' ? 'green' :
                  app.approval_status === 'rejected' ? 'red' : 'gray'
                }>
                  {app.approval_status}
                </Badge>
              </td>
              <td>
                {app.approval_status === 'pending' && (
                  <>
                    <Button onClick={() => openApprovalModal(app)}>
                      Approve
                    </Button>
                    <Button onClick={() => openRejectionModal(app)}>
                      Reject
                    </Button>
                  </>
                )}
                <Button onClick={() => openDetailsModal(app)}>
                  View Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Pagination */}
      <Pagination
        currentPage={filters.page}
        totalPages={pagination.pages}
        onPageChange={(page) => setFilters({...filters, page})}
      />
    </div>
  );
};
```

### 3. Approval Modal

```typescript
const ApprovalModal = ({ application, onClose, onSuccess }) => {
  const [userId, setUserId] = useState(application.user_id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    setLoading(true);
    setError('');

    try {
      await approvePostalStaff(application.id, userId);
      toast.success('Application approved successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2>Approve Application</h2>

      <div>
        <p><strong>Name:</strong> {application.first_name} {application.last_name}</p>
        <p><strong>Email:</strong> {application.email}</p>
        <p><strong>Staff Type:</strong> {application.staff_type}</p>
        <p><strong>State:</strong> {application.state}</p>
      </div>

      {!application.user_id && (
        <Alert type="warning">
          ⚠️ This staff member has not created their account yet.
          They must sign up at the application before you can approve them.
        </Alert>
      )}

      <FormField>
        <label>User ID *</label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Enter user ID from auth.users"
          disabled={!!application.user_id}
        />
        <small>
          {application.user_id
            ? 'User ID already linked to this application'
            : 'Ask the staff member for their user ID after they sign up'
          }
        </small>
      </FormField>

      {error && <Alert type="error">{error}</Alert>}

      <div>
        <h3>What will happen:</h3>
        <ul>
          <li>✓ Application status will be set to "approved"</li>
          <li>✓ System will create {
            application.staff_type === 'postmaster' ? 'PMG' :
            application.staff_type === 'regional_manager' ? 'REGIONAL_MANAGER' :
            'MODULE_ADMIN'
          } role</li>
          <li>✓ Permissions will be created for {application.state} state</li>
          <li>✓ Staff member can immediately log in to admin dashboard</li>
        </ul>
      </div>

      <ButtonGroup>
        <Button onClick={onClose} variant="secondary">Cancel</Button>
        <Button
          onClick={handleApprove}
          variant="primary"
          disabled={!userId || loading}
          loading={loading}
        >
          Approve Application
        </Button>
      </ButtonGroup>
    </Modal>
  );
};
```

### 4. Courier Applications Page

```typescript
const CourierApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [filters, setFilters] = useState({
    status: 'pending',
    page: 1,
    limit: 20
  });

  // Similar structure to postal staff page
  // But simpler - no user_id validation needed
  // PMG automatically sees only their state

  return (
    <div>
      <h1>Courier Applications</h1>

      {userRole === 'PMG' && (
        <Alert type="info">
          You are viewing courier applications for {userState} state only.
        </Alert>
      )}

      {/* Filters and table similar to postal staff */}
      {/* But approval is simpler - no user_id input needed */}
    </div>
  );
};
```

---

## Error Handling

### Handle All Error Codes

```typescript
const handleApiError = (error: any) => {
  switch (error.code) {
    case 'MISSING_USER_ID':
      return 'Please provide the user ID of the staff member.';

    case 'MISSING_USER_ACCOUNT':
      return 'This staff member has not created their account yet. Ask them to sign up first.';

    case 'USER_ACCOUNT_MISMATCH':
      return 'This staff member has already linked a different user account. Cannot change user ID.';

    case 'MISSING_REASON':
      return 'Please provide a reason for rejection.';

    case 'APPLICATION_NOT_FOUND':
      return 'Application not found. It may have been deleted.';

    case 'STATE_MISMATCH':
      return `Cannot approve courier from ${error.details.courierState}. You can only approve couriers in ${error.details.pmgState}.`;

    case 'INVALID_TOKEN':
      return 'Your session has expired. Please log in again.';

    case 'NO_PERMISSIONS':
      return 'You do not have NIPOST admin permissions. Contact your administrator.';

    case 'STATE_ACCESS_DENIED':
      return `Access denied. You can only access data for ${error.details.userState} state.`;

    case 'INSUFFICIENT_ROLE':
      return `This action requires ${error.details.required.join(' or ')} role. You have ${error.details.current} role.`;

    default:
      return error.error || 'An unexpected error occurred. Please try again.';
  }
};
```

---

## Testing Checklist

### For Frontend Developer

- [ ] Test login flow and role detection
- [ ] Test DOP viewing all applications
- [ ] Test PMG viewing only their state
- [ ] Test approval with valid user_id
- [ ] Test approval without user_id (should show error)
- [ ] Test approval with non-existent user_id (should show error)
- [ ] Test rejection with reason
- [ ] Test rejection without reason (should show error)
- [ ] Test PMG approving courier in their state (should work)
- [ ] Test PMG approving courier in different state (should show error)
- [ ] Test pagination
- [ ] Test filters
- [ ] Test error messages display correctly
- [ ] Test success messages display correctly
- [ ] Test loading states
- [ ] Test responsive design

---

## API Documentation

Full Swagger documentation available at:

- **Local**: http://localhost:3005/api-docs
- **Production**: https://admin-service-production.up.railway.app/api-docs

Use Swagger UI to:

- Test all endpoints interactively
- See all request/response examples
- View all error codes
- Generate API client code

---

## Support

If you encounter issues:

1. Check Swagger documentation for endpoint details
2. Check error code in response
3. Verify JWT token is valid
4. Check user has correct NIPOST admin role
5. Review `NIPOST_ADMIN_QUICK_START.md` for workflow examples
6. Review `NIPOST_ADMIN_ENDPOINT_CHANGES.md` for detailed API specs

---

## Summary for Frontend Developer

**What You Need to Build:**

1. **Dashboard Layout** - Different navigation based on role
   (DOP/PMG/REGIONAL_MANAGER)
2. **Postal Staff Applications Page** - List, filter, approve/reject postal
   staff
3. **Courier Applications Page** - List, filter, approve/reject couriers
4. **Approval Modals** - Handle approval workflow with validation
5. **Rejection Modals** - Handle rejection with reason
6. **Error Handling** - Display all error codes appropriately
7. **Success Messages** - Show what happened after approval
8. **Loading States** - Show loading during API calls
9. **Pagination** - Handle paginated results

**Key Points:**

- ✅ All endpoints are ready and documented
- ✅ Swagger UI available for testing
- ✅ Error codes are comprehensive and clear
- ✅ Automatic role creation happens on approval
- ✅ State-scoped filtering handled by backend
- ✅ No complex business logic needed in frontend
 