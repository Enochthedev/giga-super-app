# NIPOST Admin Hierarchy System

Complete documentation for the NIPOST (Nigerian Postal Service) admin hierarchy
system.

## 🚀 Quick Start for Frontend/Mobile

**Production API Base URL**:

```
https://your-api-gateway.railway.app/api/admin/nipost-admin
```

**Start Here**: `../flows/NIPOST_ADMIN_FLOWS.md`

This file contains everything you need:

- ✅ Complete API flows with diagrams
- ✅ Frontend and mobile code examples
- ✅ Production API Gateway URLs
- ✅ Error handling patterns
- ✅ Request/response examples

## 📚 Documentation Files

### For Implementation

1. **QUICK_START.md** - Cheat sheet and quick reference
2. **FRONTEND_GUIDE.md** - Detailed implementation guide
3. **../flows/NIPOST_ADMIN_FLOWS.md** - Complete API flows

### For Understanding

4. **ARCHITECTURE.md** - System design and role hierarchy
5. **WORKFLOWS.md** - Approval workflows and business logic
6. **API_REFERENCE.md** - Endpoint summary (points to Postman)

### For Reference

7. **IMPLEMENTATION_SUMMARY.md** - Complete implementation status

## 🎯 System Overview

### Two Separate Worlds

**World 1 - The App** (unchanged):

- CUSTOMER, VENDOR, HOST, DRIVER, ADVERTISER roles
- User-facing application functionality

**World 2 - NIPOST Admin Dashboard** (new):

- **DOP** (Director of Postal Operations) - National level, full admin access
- **PMG** (Postmaster General) - State-level postal monitoring + courier
  approval
- **REGIONAL_MANAGER** - Read-only regional oversight
- **MODULE_ADMIN** - Module-specific dashboard access
- **COURIER** - Delivery operations

## 🔑 Key Features

✅ **Automatic Role Creation**: Approval triggers automatically create roles and
permissions ✅ **State-Scoped Access**: PMG can only manage their assigned state
✅ **User Account Validation**: Staff must create account before DOP approval ✅
**Production URLs**: All examples use API Gateway (not localhost) ✅ **Complete
Documentation**: Flows, guides, and examples

## 📋 API Endpoints

All endpoints are prefixed with `/api/admin/nipost-admin`:

### Postal Staff Management (DOP only)

- `GET /postal-staff/applications` - List applications
- `POST /postal-staff/applications/:id/approve` - Approve staff
- `POST /postal-staff/applications/:id/reject` - Reject staff

### Courier Management (PMG or DOP)

- `GET /couriers/applications` - List courier applications
- `POST /couriers/applications/:id/approve` - Approve courier
- `POST /couriers/applications/:id/reject` - Reject courier

### User Permissions

- `GET /my-permissions` - Get current user's permissions

## 🔐 Authentication

All endpoints require JWT Bearer token:

```
Authorization: Bearer <jwt_token>
```

Get token from Supabase Auth:

```javascript
const {
  data: { session },
} = await supabase.auth.getSession();
const token = session?.access_token;
```

## 🧪 Testing

### Postman Collection

Import from: `../../postman/Admin-Service-Collection.json`

### Production Testing

1. Get JWT token from Supabase Auth
2. Import Postman collection
3. Set Authorization header
4. Test endpoints

**Note**: Swagger UI is only available in development (localhost:3005/api-docs)

## 📱 Mobile Considerations

### Token Storage

```javascript
import * as SecureStore from 'expo-secure-store';

// Store token
await SecureStore.setItemAsync('jwt_token', token);

// Retrieve token
const token = await SecureStore.getItemAsync('jwt_token');
```

### Error Handling

```javascript
if (error.code === 'MISSING_USER_ACCOUNT') {
  Toast.show({
    type: 'warning',
    text1: 'Account Required',
    text2: 'Staff member must create account first',
  });
}
```

## ⚠️ Common Errors

| Code                   | Message                      | Solution                         |
| ---------------------- | ---------------------------- | -------------------------------- |
| `MISSING_USER_ACCOUNT` | Staff hasn't created account | Ask them to sign up first        |
| `STATE_MISMATCH`       | Wrong state                  | PMG can only approve their state |
| `INSUFFICIENT_ROLE`    | Wrong role                   | Check user permissions           |
| `INVALID_TOKEN`        | Token expired                | Refresh authentication           |

## 🎭 Role Access

| Role                 | Can Do                                                 |
| -------------------- | ------------------------------------------------------ |
| **DOP**              | Approve postal staff, view all applications nationwide |
| **PMG**              | Approve couriers in their state only                   |
| **REGIONAL_MANAGER** | View reports only (read-only)                          |
| **MODULE_ADMIN**     | Module-specific dashboard access                       |
| **COURIER**          | Delivery operations                                    |

## 🔄 Approval Workflows

### Postal Staff Approval (DOP)

1. Staff member creates account
2. DOP reviews application
3. DOP approves with user_id
4. System automatically creates roles
5. Staff member can log in immediately

### Courier Approval (PMG)

1. Courier applies (already has account)
2. PMG reviews (only their state)
3. PMG approves
4. System automatically creates COURIER role
5. Courier can start deliveries

## 📞 Support

### For Implementation Questions

1. Check `../flows/NIPOST_ADMIN_FLOWS.md` first
2. Review error codes in `QUICK_START.md`
3. Test with Postman collection
4. Check `FRONTEND_GUIDE.md` for examples

### For Architecture Questions

1. Read `ARCHITECTURE.md`
2. Review `WORKFLOWS.md`
3. Check `IMPLEMENTATION_SUMMARY.md`

## ✨ What Makes This Great

1. **Automatic Everything**: Approval triggers automatically create all
   necessary roles
2. **Clear Errors**: Every error has a code and actionable message
3. **Production Ready**: All examples use correct API Gateway URLs
4. **State Isolation**: PMG cannot accidentally access other states
5. **Complete Docs**: Everything you need in one place

## 🎉 Success Metrics

- ✅ 7 endpoints implemented and documented
- ✅ 100% production-ready with API Gateway URLs
- ✅ Complete flow documentation
- ✅ Frontend and mobile examples
- ✅ Automatic role creation working
- ✅ State-scoped access enforced
- ✅ User validation implemented

## 🚀 Next Steps

1. **Read**: `../flows/NIPOST_ADMIN_FLOWS.md`
2. **Import**: Postman collection from `../../postman/`
3. **Test**: APIs with your JWT token
4. **Implement**: Dashboard using the flows and examples

**Everything you need is documented. Start with the flows!**
