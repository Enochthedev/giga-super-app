# NIPOST Admin - Quick Start

## 🚀 Get Started in 3 Steps

### 1. Open Swagger UI

```
http://localhost:3005/api-docs
```

Click "Authorize" and enter your JWT token.

### 2. Test an Endpoint

Try: `GET /api/nipost-admin/my-permissions`

- Click "Try it out"
- Click "Execute"
- See your permissions

### 3. Read the Guide

Open: `docs/nipost-admin/FRONTEND_GUIDE.md`

- Complete code examples
- React components
- Error handling

## 📋 Cheat Sheet

### Check Permissions

```typescript
GET / api / nipost - admin / my - permissions;
```

### List Postal Staff (DOP)

```typescript
GET /api/nipost-admin/postal-staff/applications?status=pending
```

### Approve Postal Staff (DOP)

```typescript
POST /api/nipost-admin/postal-staff/applications/:id/approve
Body: { "user_id": "uuid" }
```

### List Couriers (PMG)

```typescript
GET /api/nipost-admin/couriers/applications?status=pending
```

### Approve Courier (PMG)

```typescript
POST /api/nipost-admin/couriers/applications/:id/approve
```

## 🔑 Authentication

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

## ⚠️ Common Errors

| Code                   | Message                      | Solution                         |
| ---------------------- | ---------------------------- | -------------------------------- |
| `MISSING_USER_ACCOUNT` | Staff hasn't created account | Ask them to sign up first        |
| `STATE_MISMATCH`       | Wrong state                  | PMG can only approve their state |
| `INSUFFICIENT_ROLE`    | Wrong role                   | Check user permissions           |
| `INVALID_TOKEN`        | Token expired                | Refresh authentication           |

## 🎯 Role Access

| Role                 | Can Do                          |
| -------------------- | ------------------------------- |
| **DOP**              | Approve postal staff, view all  |
| **PMG**              | Approve couriers in their state |
| **REGIONAL_MANAGER** | View only                       |
| **MODULE_ADMIN**     | Module access                   |
| **COURIER**          | Delivery operations             |

## 📚 Full Documentation

- **Swagger UI**: http://localhost:3005/api-docs (PRIMARY)
- **Implementation Guide**: `FRONTEND_GUIDE.md`
- **Architecture**: `ARCHITECTURE.md`
- **Workflows**: `WORKFLOWS.md`

## ✨ Key Features

- ✅ Automatic role creation on approval
- ✅ State-scoped access for PMG
- ✅ User account validation
- ✅ Clear error messages
- ✅ Audit logging

## 🧪 Testing Flow

1. Start admin service: `npm run dev:admin`
2. Open Swagger UI: http://localhost:3005/api-docs
3. Authorize with JWT token
4. Try each endpoint
5. Check responses
6. Implement in your app

## 💡 Pro Tips

1. Always check Swagger UI first
2. Test with different roles (DOP vs PMG)
3. Handle all error codes
4. Show loading states
5. Refresh lists after actions

## 🆘 Need Help?

1. Check Swagger UI
2. Read error code in response
3. Review `FRONTEND_GUIDE.md`
4. Check `WORKFLOWS.md` for business logic

**Start with Swagger UI - it has everything!**
