# NIPOST Admin Dashboard API - Frontend Guide

## 🚀 Quick Start

### API Base URL

```
Development:  http://localhost:3005
Production:   https://admin-service-production.up.railway.app
```

### Interactive API Documentation

```
Swagger UI:   http://localhost:3005/api-docs
OpenAPI JSON: http://localhost:3005/api-docs.json
```

**👉 Use Swagger UI to test all endpoints before building your UI!**

---

## 🔑 Authentication

All requests require JWT token from Supabase Auth:

```typescript
headers: {
  'Authorization': `Bearer ${supabaseToken}`,
  'Content-Type': 'application/json'
}
```

---

## 📋 API Endpoints

### 1. Check User Permissions

```http
GET /api/nipost-admin/my-permissions
```

Returns user's role, access level, state, and permissions.

### 2. Postal Staff Applications

```http
GET  /api/nipost-admin/postal-staff/applications
POST /api/nipost-admin/postal-staff/applications/:id/approve
POST /api/nipost-admin/postal-staff/applications/:id/reject
```

### 3. Courier Applications

```http
GET  /api/nipost-admin/couriers/applications
POST /api/nipost-admin/couriers/applications/:id/approve
POST /api/nipost-admin/couriers/applications/:id/reject
```

**📖 Full endpoint documentation with examples in Swagger UI**

---

## 🎭 User Roles

| Role                 | Access            | What They Can Do                            |
| -------------------- | ----------------- | ------------------------------------------- |
| **DOP**              | National          | Approve postal staff, view all applications |
| **PMG**              | State             | Approve couriers in their state             |
| **REGIONAL_MANAGER** | State (Read-Only) | View reports only                           |

---

## ⚠️ Important Validations

### Postal Staff Approval

```typescript
// ⚠️ Staff member MUST create account before approval
if (!application.user_id) {
  showWarning('Staff member must create account first');
}
```

### Courier Approval (PMG)

```typescript
// ⚠️ PMG can only approve couriers in their state
// Backend enforces this automatically
```

---

## 🚨 Error Codes

| Code                   | Message                                     |
| ---------------------- | ------------------------------------------- |
| `MISSING_USER_ACCOUNT` | Staff member must create account first      |
| `STATE_MISMATCH`       | Cannot approve courier from different state |
| `INSUFFICIENT_ROLE`    | User doesn't have permission                |
| `INVALID_TOKEN`        | Session expired, please log in again        |

**📖 Full error documentation in Swagger UI**

---

## 📚 Additional Documentation

Detailed guides available in `/docs/nipost-admin/`:

- Implementation guide with code examples
- Workflow diagrams
- Testing checklist

---

## 🧪 Testing

1. Start backend: `npm run dev`
2. Open Swagger UI: http://localhost:3005/api-docs
3. Click "Authorize" and add your JWT token
4. Test endpoints interactively

---

## 💡 Pro Tips

1. **Always check Swagger UI first** - It has live examples
2. **Test with different roles** - DOP and PMG have different access
3. **Handle all error codes** - They're comprehensive and clear
4. **Show loading states** - API calls may take a moment
5. **Refresh lists after actions** - Keep UI in sync

---

## 🆘 Need Help?

1. **Check Swagger UI** - Interactive docs with examples
2. **Review error code** - Error messages are descriptive
3. **Check `/docs/nipost-admin/`** - Detailed guides available
4. **Ask backend team** - Provide request/response details

---

**Everything you need is in Swagger UI. Start there! 🎯**
