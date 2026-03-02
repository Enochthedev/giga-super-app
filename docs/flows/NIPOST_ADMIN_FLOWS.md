# NIPOST Admin API Flows

## Production API Base URL

```
https://your-api-gateway.railway.app/api/admin
```

All requests go through the API Gateway, which routes to the admin service.

---

## Flow 1: DOP Dashboard - Postal Staff Approval

### Frontend Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Login (Supabase Auth)                              │
│    → Get JWT token                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Check User Permissions                                   │
│    GET /api/admin/nipost-admin/my-permissions               │
│    Headers: { Authorization: "Bearer {token}" }             │
│                                                              │
│    Response:                                                 │
│    {                                                         │
│      "success": true,                                        │
│      "data": {                                               │
│        "role": "DOP",                                        │
│        "access_level": "national",                           │
│        "permissions": [...]                                  │
│      }                                                       │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Load Pending Applications                                │
│    GET /api/admin/nipost-admin/postal-staff/applications    │
│        ?status=pending&page=1&limit=20                      │
│                                                              │
│    Response:                                                 │
│    {                                                         │
│      "success": true,                                        │
│      "data": [                                               │
│        {                                                     │
│          "id": "uuid",                                       │
│          "first_name": "John",                               │
│          "last_name": "Doe",                                 │
│          "email": "john@example.com",                        │
│          "staff_type": "postmaster",                         │
│          "state": "Lagos",                                   │
│          "user_id": "uuid-or-null",                          │
│          "approval_status": "pending"                        │
│        }                                                     │
│      ],                                                      │
│      "pagination": { "page": 1, "total": 50 }               │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. DOP Reviews Application                                  │
│    → Check if user_id is set                                │
│    → If NULL: Show warning "Staff must create account"      │
│    → If SET: Enable approve button                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. DOP Approves Application                                 │
│    POST /api/admin/nipost-admin/postal-staff/applications/  │
│         {id}/approve                                         │
│    Body: { "user_id": "uuid" }                              │
│                                                              │
│    Success Response:                                         │
│    {                                                         │
│      "success": true,                                        │
│      "data": { "approval_status": "approved" },              │
│      "message": "Roles created automatically"                │
│    }                                                         │
│                                                              │
│    Error Response (if no account):                           │
│    {                                                         │
│      "success": false,                                       │
│      "error": "Staff member must create account first",      │
│      "code": "MISSING_USER_ACCOUNT"                          │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Show Success & Refresh List                              │
│    → Display: "Approved! Roles created automatically"       │
│    → Reload applications list                                │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Flow (Same endpoints, different UI)

```
1. Login → Get JWT token
2. Check permissions → Show DOP dashboard if authorized
3. Load applications → Display in mobile list view
4. Tap application → Show details screen
5. Tap "Approve" → Confirm dialog → API call
6. Show success toast → Refresh list
```

---

## Flow 2: PMG Dashboard - Courier Approval

### Frontend Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Login & Check Permissions                          │
│    GET /api/admin/nipost-admin/my-permissions               │
│                                                              │
│    Response:                                                 │
│    {                                                         │
│      "role": "PMG",                                          │
│      "state_name": "Lagos",                                  │
│      "access_level": "state"                                 │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Load Courier Applications (Auto-filtered by state)       │
│    GET /api/admin/nipost-admin/couriers/applications        │
│        ?status=pending&page=1                               │
│                                                              │
│    Note: Backend automatically filters to PMG's state       │
│                                                              │
│    Response:                                                 │
│    {                                                         │
│      "success": true,                                        │
│      "data": [                                               │
│        {                                                     │
│          "id": "uuid",                                       │
│          "first_name": "Jane",                               │
│          "state": "Lagos",  ← Only Lagos couriers shown     │
│          "approval_status": "pending"                        │
│        }                                                     │
│      ]                                                       │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. PMG Reviews Courier Application                          │
│    → View courier details                                    │
│    → Check documents                                         │
│    → Verify state matches (Lagos)                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. PMG Approves Courier                                     │
│    POST /api/admin/nipost-admin/couriers/applications/      │
│         {id}/approve                                         │
│                                                              │
│    Success Response:                                         │
│    {                                                         │
│      "success": true,                                        │
│      "message": "Courier approved, roles created"            │
│    }                                                         │
│                                                              │
│    Error (if wrong state):                                   │
│    {                                                         │
│      "success": false,                                       │
│      "code": "STATE_MISMATCH",                               │
│      "error": "Cannot approve courier from different state"  │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Show Success & Refresh                                   │
│    → Display: "Courier approved!"                           │
│    → Reload courier list                                     │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Flow

```
1. Login → Check permissions → Show PMG dashboard
2. Load couriers → Display state name in header: "Lagos Couriers"
3. Tap courier → Show details with documents
4. Tap "Approve" → Confirm → API call
5. Show success → Refresh list
```

---

## Flow 3: Rejection Flow (DOP/PMG)

### Frontend Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Clicks "Reject" on Application                     │
│    → Show rejection reason dialog/modal                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. User Enters Rejection Reason                            │
│    → Validate: Reason is required                           │
│    → Minimum 10 characters                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Submit Rejection                                         │
│    POST /api/admin/nipost-admin/postal-staff/applications/  │
│         {id}/reject                                          │
│    OR                                                        │
│    POST /api/admin/nipost-admin/couriers/applications/      │
│         {id}/reject                                          │
│                                                              │
│    Body: { "reason": "Incomplete documentation" }            │
│                                                              │
│    Response:                                                 │
│    {                                                         │
│      "success": true,                                        │
│      "message": "Application rejected"                       │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Show Success & Refresh                                   │
│    → Close dialog                                            │
│    → Show success message                                    │
│    → Refresh applications list                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Flow 4: Error Handling

### Common Error Scenarios

```
┌─────────────────────────────────────────────────────────────┐
│ Error: INVALID_TOKEN (401)                                  │
│ → User session expired                                       │
│ → Action: Redirect to login                                 │
│ → Message: "Session expired, please log in again"           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Error: NO_PERMISSIONS (403)                                 │
│ → User is not a NIPOST admin                                │
│ → Action: Redirect to main app                              │
│ → Message: "You don't have admin access"                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Error: INSUFFICIENT_ROLE (403)                              │
│ → User doesn't have required role (e.g., PMG trying DOP)    │
│ → Action: Show error, stay on page                          │
│ → Message: "You don't have permission for this action"      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Error: MISSING_USER_ACCOUNT (400)                           │
│ → Staff member hasn't created account yet                   │
│ → Action: Show warning dialog                               │
│ → Message: "Staff member must create account first"         │
│ → Suggestion: "Ask them to sign up at [signup URL]"         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Error: STATE_MISMATCH (403)                                 │
│ → PMG trying to approve courier from different state        │
│ → Action: Show error, disable button                        │
│ → Message: "You can only approve couriers in Lagos"         │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints Summary

### Base URL

```
Production: https://your-api-gateway.railway.app/api/admin/nipost-admin
```

### All Endpoints

| Method | Endpoint                                 | Role | Description                    |
| ------ | ---------------------------------------- | ---- | ------------------------------ |
| GET    | `/my-permissions`                        | Any  | Get user's NIPOST permissions  |
| GET    | `/postal-staff/applications`             | PMG+ | List postal staff applications |
| POST   | `/postal-staff/applications/:id/approve` | DOP  | Approve postal staff           |
| POST   | `/postal-staff/applications/:id/reject`  | DOP  | Reject postal staff            |
| GET    | `/couriers/applications`                 | PMG+ | List courier applications      |
| POST   | `/couriers/applications/:id/approve`     | PMG+ | Approve courier                |
| POST   | `/couriers/applications/:id/reject`      | PMG+ | Reject courier                 |

### Query Parameters

**Pagination** (all list endpoints):

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Filtering**:

- `status` - Filter by: `pending`, `approved`, `rejected`
- `staff_type` - Filter by: `postmaster`, `regional_manager`, `admin_staff`
- `state` - Filter by state (DOP only, PMG auto-filtered)

---

## Authentication

### All requests require JWT token:

```javascript
headers: {
  'Authorization': `Bearer ${jwtToken}`,
  'Content-Type': 'application/json'
}
```

### Get JWT token from Supabase Auth:

```javascript
const {
  data: { session },
} = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## Testing

### Postman Collection

Import from: `postman/Admin-Service-Collection.json`

### Swagger UI

**Note**: Swagger UI is only available in development

- Development: http://localhost:3005/api-docs
- Production: Use Postman collection

---

## Mobile-Specific Considerations

### 1. Token Storage

```javascript
// Store token securely
await SecureStore.setItemAsync('jwt_token', token);

// Retrieve for API calls
const token = await SecureStore.getItemAsync('jwt_token');
```

### 2. Offline Handling

```javascript
// Check network before API call
if (!isConnected) {
  showError('No internet connection');
  return;
}
```

### 3. Pull-to-Refresh

```javascript
// Implement pull-to-refresh on lists
<FlatList
  data={applications}
  onRefresh={loadApplications}
  refreshing={loading}
/>
```

### 4. Error Toasts

```javascript
// Show user-friendly error messages
if (error.code === 'MISSING_USER_ACCOUNT') {
  Toast.show({
    type: 'warning',
    text1: 'Account Required',
    text2: 'Staff member must create account first',
  });
}
```

---

## Complete Example: Approve Postal Staff

### Frontend (React)

```typescript
async function approvePostalStaff(applicationId: string, userId: string) {
  try {
    const response = await fetch(
      `https://your-api-gateway.railway.app/api/admin/nipost-admin/postal-staff/applications/${applicationId}/approve`,
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
      if (data.code === 'MISSING_USER_ACCOUNT') {
        alert('Staff member must create account first');
      } else {
        alert(data.error);
      }
      return;
    }

    alert('Approved! Roles created automatically.');
    loadApplications(); // Refresh list
  } catch (error) {
    alert('Network error. Please try again.');
  }
}
```

### Mobile (React Native)

```typescript
async function approvePostalStaff(applicationId: string, userId: string) {
  try {
    const token = await SecureStore.getItemAsync('jwt_token');

    const response = await fetch(
      `https://your-api-gateway.railway.app/api/admin/nipost-admin/postal-staff/applications/${applicationId}/approve`,
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
      Toast.show({
        type: 'error',
        text1: 'Approval Failed',
        text2: data.error,
      });
      return;
    }

    Toast.show({
      type: 'success',
      text1: 'Approved!',
      text2: 'Roles created automatically',
    });

    loadApplications();
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: 'Please check your connection',
    });
  }
}
```

---

## Next Steps

1. **Get Production API URL** from your Railway deployment
2. **Replace** `https://your-api-gateway.railway.app` with actual URL
3. **Import** Postman collection for testing
4. **Implement** flows in your frontend/mobile app
5. **Test** each flow with real data
