# NIPOST Admin Dashboard - Frontend Quick Reference

## 🚀 Quick Start

```bash
# API Base URL
Development: http://localhost:3005
Production: https://admin-service-production.up.railway.app

# Swagger Docs
http://localhost:3005/api-docs
```

## 🔑 Authentication

```typescript
// All requests need JWT token
headers: {
  'Authorization': `Bearer ${supabaseToken}`,
  'Content-Type': 'application/json'
}
```

## 📋 API Endpoints Summary

### Check User Role

```typescript
GET / api / nipost - admin / my - permissions;
// Returns: role, access_level, state, permissions
```

### Postal Staff Applications

```typescript
// List applications
GET /api/nipost-admin/postal-staff/applications?status=pending&page=1&limit=20

// Approve (DOP only)
POST /api/nipost-admin/postal-staff/applications/:id/approve
Body: { user_id: "uuid" }

// Reject (DOP only)
POST /api/nipost-admin/postal-staff/applications/:id/reject
Body: { reason: "string" }
```

### Courier Applications

```typescript
// List applications (PMG sees only their state)
GET /api/nipost-admin/couriers/applications?status=pending&page=1&limit=20

// Approve (PMG/DOP)
POST /api/nipost-admin/couriers/applications/:id/approve
Body: {} // No body needed

// Reject (PMG/DOP)
POST /api/nipost-admin/couriers/applications/:id/reject
Body: { reason: "string" }
```

## 🎭 User Roles

| Role                 | Access Level      | Can Do                                             |
| -------------------- | ----------------- | -------------------------------------------------- |
| **DOP**              | National          | Approve postal staff, view all applications        |
| **PMG**              | State             | Approve couriers in their state, postal monitoring |
| **REGIONAL_MANAGER** | State (Read-Only) | View reports only                                  |
| **MODULE_ADMIN**     | Module            | Manage specific module                             |
| **COURIER**          | Individual        | Delivery operations (different app)                |

## ⚠️ Important Validations

### Postal Staff Approval

```typescript
// ⚠️ MUST check user_id before approval
if (!application.user_id) {
  showWarning('Staff member must create account first');
  disableApproveButton();
}
```

### Courier Approval (PMG)

```typescript
// ⚠️ PMG can only approve couriers in their state
// Backend enforces this, but show warning in UI
if (courier.state !== pmgState) {
  showError('Cannot approve courier from different state');
}
```

## 🎨 UI Components Needed

### 1. Applications Table

- Columns: Name, Email, Type/Vehicle, State, Account Status, Status, Actions
- Filters: Status, Type, State (DOP only)
- Pagination
- Status badges (pending/approved/rejected)

### 2. Approval Modal

**Postal Staff:**

- Show application details
- Input for user_id (if not set)
- Warning if no account
- List of what will happen
- Approve/Cancel buttons

**Courier:**

- Show application details
- Show vehicle/license info
- List of what will happen
- Approve/Cancel buttons (no user_id input needed)

### 3. Rejection Modal

- Textarea for reason (required)
- Reject/Cancel buttons

### 4. Dashboard Navigation

```typescript
// Show different menu based on role
DOP: [Postal Staff, Couriers, Monitoring, Analytics]
PMG: [Couriers, Monitoring, Financial Ledger]
REGIONAL_MANAGER: [Monitoring (Read-Only), Reports]
```

## 🚨 Error Codes to Handle

| Code                    | Status | Message to Show                                                |
| ----------------------- | ------ | -------------------------------------------------------------- |
| `MISSING_USER_ACCOUNT`  | 400    | "Staff member must create account first. Ask them to sign up." |
| `USER_ACCOUNT_MISMATCH` | 400    | "Cannot change user ID after it's been set."                   |
| `STATE_MISMATCH`        | 403    | "Cannot approve courier from different state."                 |
| `INSUFFICIENT_ROLE`     | 403    | "You don't have permission for this action."                   |
| `APPLICATION_NOT_FOUND` | 404    | "Application not found."                                       |
| `INVALID_TOKEN`         | 401    | "Session expired. Please log in again."                        |

## ✅ Success Messages

### Postal Staff Approved

```typescript
"✅ Application approved! {name} can now log in as {role} for {state} state."

// Roles:
postmaster → "Postmaster General (PMG)"
regional_manager → "Regional Manager"
admin_staff → "Module Admin"
```

### Courier Approved

```typescript
'✅ Courier approved! {name} can now log in to the delivery app and start accepting deliveries.';
```

## 📊 Response Formats

### Success Response

```typescript
{
  success: true,
  data: { ... },
  pagination: {
    page: 1,
    limit: 20,
    total: 50,
    pages: 3
  }
}
```

### Error Response

```typescript
{
  success: false,
  error: "Human-readable message",
  code: "MACHINE_READABLE_CODE",
  details: {
    // Additional context
  }
}
```

## 🔄 Automatic Actions

### When DOP Approves Postal Staff:

1. ✅ Application status → approved
2. ✅ Role created (PMG/REGIONAL_MANAGER/MODULE_ADMIN)
3. ✅ Permissions created for their state
4. ✅ Staff can immediately log in

### When PMG Approves Courier:

1. ✅ Application status → approved
2. ✅ COURIER role created
3. ✅ Courier can immediately log in to delivery app

## 🧪 Testing Scenarios

### Test These Flows:

- [ ] DOP logs in → sees all applications
- [ ] PMG logs in → sees only their state
- [ ] Approve postal staff with account → success
- [ ] Approve postal staff without account → error
- [ ] Approve courier in same state (PMG) → success
- [ ] Approve courier in different state (PMG) → error
- [ ] Reject with reason → success
- [ ] Reject without reason → error
- [ ] Pagination works
- [ ] Filters work
- [ ] Error messages display correctly

## 📱 Responsive Design

### Desktop (1024px+)

- Full table with all columns
- Side-by-side filters
- Modal dialogs

### Tablet (768px - 1023px)

- Scrollable table
- Stacked filters
- Modal dialogs

### Mobile (< 768px)

- Card-based layout instead of table
- Stacked filters
- Full-screen modals

## 🎯 Priority Order

1. **High Priority** (MVP)
   - Login and role detection
   - View applications (list + filters)
   - Approve/reject postal staff (DOP)
   - Approve/reject couriers (PMG)
   - Error handling

2. **Medium Priority**
   - Pagination
   - Advanced filters
   - Application details view
   - Success animations

3. **Low Priority**
   - Analytics dashboard
   - Export to CSV
   - Bulk operations
   - Email notifications

## 📚 Documentation Links

- **Full Implementation Guide**: `FRONTEND_IMPLEMENTATION_GUIDE.md`
- **API Quick Start**: `NIPOST_ADMIN_QUICK_START.md`
- **Endpoint Changes**: `NIPOST_ADMIN_ENDPOINT_CHANGES.md`
- **Workflow Diagrams**: `NIPOST_WORKFLOW_DIAGRAM.md`
- **Swagger Docs**: `http://localhost:3005/api-docs`

## 💡 Pro Tips

1. **Use Swagger UI** for testing before building UI
2. **Check user_id** before enabling approve button
3. **Show state name** prominently for PMG users
4. **Cache user permissions** after login
5. **Refresh list** after approve/reject
6. **Show loading states** during API calls
7. **Use toast notifications** for success/error
8. **Validate inputs** before API call
9. **Handle token expiry** gracefully
10. **Test with different roles** (DOP, PMG)

## 🆘 Need Help?

1. Check Swagger docs: `http://localhost:3005/api-docs`
2. Review error code in API response
3. Check `FRONTEND_IMPLEMENTATION_GUIDE.md`
4. Verify JWT token is valid
5. Confirm user has correct role

---

**Ready to build? Start with:**

1. Set up authentication
2. Check user role on login
3. Build applications list page
4. Add approve/reject modals
5. Test all error cases
