# NIPOST Admin Frontend Implementation Guide

Complete guide for implementing the NIPOST admin dashboard frontend.

## Prerequisites

- Admin service running on port 3005
- Supabase Auth configured
- JWT token from authenticated user

## Quick Reference

### Base URL

```
http://localhost:3005/api/nipost-admin
```

### Authentication

All requests require JWT Bearer token:

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

## Implementation Steps

### 1. Check User Permissions

First, verify the user has NIPOST admin permissions:

```typescript
async function checkNipostPermissions(token: string) {
  const response = await fetch(
    'http://localhost:3005/api/nipost-admin/my-permissions',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!data.success) {
    // User is not a NIPOST admin
    return null;
  }

  return {
    role: data.data.role, // DOP, PMG, REGIONAL_MANAGER, MODULE_ADMIN
    stateName: data.data.state_name,
    permissions: data.data.permissions,
  };
}
```

### 2. List Postal Staff Applications (DOP Dashboard)

```typescript
async function getPostalStaffApplications(
  token: string,
  page: number = 1,
  status?: 'pending' | 'approved' | 'rejected'
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
  });

  if (status) {
    params.append('status', status);
  }

  const response = await fetch(
    `http://localhost:3005/api/nipost-admin/postal-staff/applications?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return await response.json();
}
```

### 3. Approve Postal Staff (DOP Only)

**IMPORTANT**: Staff member must create their account first!

```typescript
async function approvePostalStaff(
  token: string,
  applicationId: string,
  userId: string // User ID from auth.users
) {
  const response = await fetch(
    `http://localhost:3005/api/nipost-admin/postal-staff/applications/${applicationId}/approve`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId }),
    }
  );

  const data = await response.json();

  if (!data.success) {
    // Handle errors
    if (data.code === 'MISSING_USER_ACCOUNT') {
      alert(
        'This staff member has not created their account yet. Ask them to sign up first.'
      );
    } else if (data.code === 'USER_ACCOUNT_MISMATCH') {
      alert('This staff member has already linked a different account.');
    }
  }

  return data;
}
```

### 4. List Courier Applications (PMG Dashboard)

PMG automatically sees only their state:

```typescript
async function getCourierApplications(
  token: string,
  page: number = 1,
  status?: 'pending' | 'approved' | 'rejected'
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
  });

  if (status) {
    params.append('status', status);
  }

  const response = await fetch(
    `http://localhost:3005/api/nipost-admin/couriers/applications?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return await response.json();
}
```

### 5. Approve Courier (PMG or DOP)

```typescript
async function approveCourier(token: string, courierId: string) {
  const response = await fetch(
    `http://localhost:3005/api/nipost-admin/couriers/applications/${courierId}/approve`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!data.success && data.code === 'STATE_MISMATCH') {
    alert('You can only approve couriers in your assigned state.');
  }

  return data;
}
```

## Error Handling

All endpoints return consistent error format:

```typescript
interface ErrorResponse {
  success: false;
  error: string; // Human-readable message
  code: string; // Machine-readable code
  details?: any; // Additional context
}
```

### Common Error Codes

- `INVALID_TOKEN` - JWT token is invalid or expired
- `NO_PERMISSIONS` - User is not a NIPOST admin
- `INSUFFICIENT_ROLE` - User doesn't have required role (e.g., not DOP)
- `STATE_ACCESS_DENIED` - Trying to access different state (PMG only)
- `MISSING_USER_ACCOUNT` - Staff member hasn't created account yet
- `USER_ACCOUNT_MISMATCH` - Staff member already linked different account
- `APPLICATION_NOT_FOUND` - Application doesn't exist
- `MISSING_REASON` - Rejection reason not provided

## UI Components

### DOP Dashboard

```typescript
function DOPDashboard() {
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadApplications();
  }, [filter]);

  async function loadApplications() {
    const data = await getPostalStaffApplications(token, 1, filter);
    setApplications(data.data);
  }

  async function handleApprove(appId: string, userId: string) {
    const result = await approvePostalStaff(token, appId, userId);
    if (result.success) {
      alert('Application approved! Roles created automatically.');
      loadApplications();
    }
  }

  return (
    <div>
      <h1>Postal Staff Applications</h1>
      <select value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>

      {applications.map(app => (
        <div key={app.id}>
          <h3>{app.first_name} {app.last_name}</h3>
          <p>Type: {app.staff_type}</p>
          <p>State: {app.state}</p>
          <p>Email: {app.email}</p>
          <p>User ID: {app.user_id || 'Not linked yet'}</p>

          {app.approval_status === 'pending' && (
            <>
              <button onClick={() => handleApprove(app.id, app.user_id)}>
                Approve
              </button>
              <button onClick={() => handleReject(app.id)}>
                Reject
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
```

### PMG Dashboard

```typescript
function PMGDashboard() {
  const [couriers, setCouriers] = useState([]);
  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    loadPermissions();
    loadCouriers();
  }, []);

  async function loadPermissions() {
    const data = await checkNipostPermissions(token);
    setPermissions(data);
  }

  async function loadCouriers() {
    const data = await getCourierApplications(token, 1, 'pending');
    setCouriers(data.data);
  }

  return (
    <div>
      <h1>Courier Applications - {permissions?.stateName}</h1>
      <p>You can only approve couriers in your state</p>

      {couriers.map(courier => (
        <div key={courier.id}>
          <h3>{courier.first_name} {courier.last_name}</h3>
          <p>State: {courier.state}</p>
          <button onClick={() => approveCourier(token, courier.id)}>
            Approve
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Testing

Use the Swagger UI for testing:

1. Visit http://localhost:3005/api-docs
2. Click "Authorize" and enter your JWT token
3. Try each endpoint with test data
4. Review response schemas and error codes

## Pagination

All list endpoints support pagination:

```typescript
interface PaginationResponse {
  success: true;
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

## Next Steps

1. Implement authentication flow
2. Build DOP dashboard for postal staff approval
3. Build PMG dashboard for courier approval
4. Add error handling and user feedback
5. Test with real data

## Support

- Swagger UI: http://localhost:3005/api-docs
- All endpoints fully documented with examples
- Error codes documented with solutions
