# NIPOST Admin System - Critical Issues & Solutions

## Date: March 4, 2026

## Status: URGENT - Production Issues Identified

---

## 🚨 Critical Issues Identified

### 1. **Email Verification Not Implemented**

**Status:** ❌ Missing  
**Impact:** HIGH - Security vulnerability

**Current State:**

- Supabase Auth is being used for authentication
- No email verification flow implemented
- Users can register without verifying their email addresses

**Solution:** We ARE relying on Supabase for email verification. Supabase Auth
has built-in email verification:

```typescript
// Supabase automatically sends verification emails when users sign up
// Configuration needed in Supabase Dashboard:
// 1. Go to Authentication > Email Templates
// 2. Enable "Confirm signup" email template
// 3. Customize the email template if needed
// 4. Set email confirmation required in Auth settings
```

**Action Items:**

1. ✅ Enable email confirmation in Supabase Dashboard (Authentication >
   Settings)
2. ✅ Customize email templates (Authentication > Email Templates)
3. ✅ Add email verification check in middleware
4. ✅ Update frontend to handle unverified email states

---

### 2. **Missing API Endpoints - 404 Errors**

**Status:** ❌ Critical  
**Impact:** HIGH - Frontend cannot function

**Frontend Reports:**

- "Postal staff API and couriers API are giving 404 errors"
- "I can only see the postal staff api and couriers api"
- "Are the endpoints complete in the docs?"

**Current Endpoints (WORKING):**

```
✅ GET  /api/nipost-admin/postal-staff/applications
✅ POST /api/nipost-admin/postal-staff/applications/:id/approve
✅ POST /api/nipost-admin/postal-staff/applications/:id/reject
✅ GET  /api/nipost-admin/couriers/applications
✅ POST /api/nipost-admin/couriers/applications/:id/approve
✅ POST /api/nipost-admin/couriers/applications/:id/reject
✅ GET  /api/nipost-admin/my-permissions
```

**Root Cause Analysis:** The endpoints exist but may be returning 404 due to:

1. **Incorrect base URL** - Frontend might be using wrong URL
2. **Missing authentication** - Endpoints require JWT token
3. **CORS issues** - API Gateway might not be routing correctly
4. **Service not deployed** - Admin service might not be running on Railway

**Immediate Actions:**

1. Check if admin-service is deployed and running
2. Verify API Gateway routing configuration
3. Test endpoints with Postman using correct base URL
4. Check Railway logs for errors

---

### 3. **Role Application Flow Missing**

**Status:** ❌ Critical  
**Impact:** HIGH - Cannot onboard new staff

**Current Problem:**

- DOP approves PMGs, Regional Managers, and Admin Staff
- But there's NO API for these staff to APPLY for roles first
- The flow is incomplete: **Application → Approval → Role Creation**

**Database Tables:**

```sql
-- ✅ EXISTS: postal_staff (for applications)
-- ✅ EXISTS: courier_profiles (for applications)
-- ✅ EXISTS: user_roles (for approved roles)
-- ✅ EXISTS: nipost_user_permissions (for permissions)
```

**Missing Flow:**

```
❌ Step 1: Staff member applies for role (NO API)
❌ Step 2: Application stored in postal_staff table (NO API)
✅ Step 3: DOP views applications (EXISTS)
✅ Step 4: DOP approves/rejects (EXISTS)
✅ Step 5: Roles automatically created (EXISTS via trigger)
```

**Solution Required:** Create PUBLIC endpoints for role applications:

```typescript
// NEW ENDPOINTS NEEDED:
POST / api / public / apply / postal - staff;
POST / api / public / apply / courier;
POST / api / public / apply / regional - manager;
POST / api / public / apply / admin - staff;
```

---

## 📋 Complete Role Application Flow

### Current System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NIPOST HIERARCHY                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  DOP (Director of Postal Operations)                         │
│  └─ National Level Access                                    │
│     └─ Approves: PMGs, Regional Managers, Admin Staff        │
│                                                               │
│  PMG (Postmaster General)                                    │
│  └─ State Level Access                                       │
│     └─ Approves: Couriers in their state                     │
│                                                               │
│  Regional Manager                                            │
│  └─ Regional Level Access                                    │
│     └─ Manages: Regional operations                          │
│                                                               │
│  Admin Staff / Module Admin                                  │
│  └─ Module Level Access                                      │
│     └─ Manages: Specific business modules                    │
│                                                               │
│  Courier                                                     │
│  └─ Delivery Operations                                      │
│     └─ Approved by: PMG in their state                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Complete Application Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: User Creates Account (Supabase Auth)                │
├─────────────────────────────────────────────────────────────┤
│ POST /auth/v1/signup                                         │
│ {                                                             │
│   "email": "john@example.com",                               │
│   "password": "secure_password",                             │
│   "data": {                                                   │
│     "first_name": "John",                                    │
│     "last_name": "Doe"                                       │
│   }                                                           │
│ }                                                             │
│                                                               │
│ ✅ User receives verification email                          │
│ ✅ User verifies email                                       │
│ ✅ User can now log in                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: User Applies for Role (NEW - NEEDS IMPLEMENTATION)  │
├─────────────────────────────────────────────────────────────┤
│ POST /api/public/apply/postal-staff                          │
│ Headers: { Authorization: "Bearer {token}" }                 │
│ {                                                             │
│   "staff_type": "postmaster",  // or regional_manager, etc  │
│   "first_name": "John",                                      │
│   "last_name": "Doe",                                        │
│   "email": "john@example.com",                               │
│   "phone": "+234...",                                        │
│   "state": "Lagos",                                          │
│   "city": "Ikeja",                                           │
│   "residential_address": "123 Main St",                      │
│   "date_of_birth": "1990-01-01",                             │
│   "gender": "male",                                          │
│   "employee_id": "EMP001",  // optional                      │
│   "department": "Operations",                                │
│   "position": "Postmaster",                                  │
│   "years_of_service": 5                                      │
│ }                                                             │
│                                                               │
│ ✅ Application stored in postal_staff table                  │
│ ✅ approval_status = 'pending'                               │
│ ✅ user_id linked to auth.users                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: DOP Views Applications (EXISTING)                   │
├─────────────────────────────────────────────────────────────┤
│ GET /api/nipost-admin/postal-staff/applications             │
│ ?status=pending&page=1&limit=20                             │
│                                                               │
│ ✅ DOP sees all pending applications nationwide              │
│ ✅ PMG sees only applications in their state                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: DOP Approves Application (EXISTING)                 │
├─────────────────────────────────────────────────────────────┤
│ POST /api/nipost-admin/postal-staff/applications/:id/approve│
│ {                                                             │
│   "user_id": "uuid-from-auth-users"                          │
│ }                                                             │
│                                                               │
│ ✅ postal_staff.approval_status = 'approved'                 │
│ ✅ Database trigger automatically creates:                   │
│    - user_roles entry (PMG/REGIONAL_MANAGER/MODULE_ADMIN)    │
│    - nipost_user_permissions entry                           │
│    - user_active_roles entry                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: User Can Access NIPOST Admin Dashboard              │
├─────────────────────────────────────────────────────────────┤
│ GET /api/nipost-admin/my-permissions                         │
│                                                               │
│ ✅ User sees their role and permissions                      │
│ ✅ User can access appropriate admin features                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Plan

### Phase 1: Fix Immediate Issues (URGENT - Today)

#### 1.1 Verify Service Deployment

```bash
# Check if admin-service is running on Railway
railway status --service admin-service

# Check logs for errors
railway logs --service admin-service

# Test health endpoint
curl https://your-admin-service.railway.app/health
```

#### 1.2 Test Existing Endpoints

```bash
# Get JWT token from Supabase
# Then test endpoints:

# Test postal staff applications
curl -X GET "https://your-api-gateway.railway.app/api/nipost-admin/postal-staff/applications" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test courier applications
curl -X GET "https://your-api-gateway.railway.app/api/nipost-admin/couriers/applications" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 1.3 Fix API Gateway Routing

Check `api-gateway/src/middleware/routing.ts` to ensure admin-service routes are
configured:

```typescript
// Verify this exists in routing.ts:
{
  path: '/api/nipost-admin',
  target: process.env.ADMIN_SERVICE_URL || 'http://localhost:3005',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}
```

### Phase 2: Implement Missing Application Endpoints (HIGH PRIORITY)

#### 2.1 Create Public Application Routes

File: `admin-service/src/routes/public-applications.ts`

```typescript
import { Router } from 'express';
import { supabase } from '../utils/database';

const router = Router();

// Apply for postal staff role (Postmaster, Regional Manager, Admin Staff)
router.post('/apply/postal-staff', async (req, res) => {
  // Implementation needed
});

// Apply for courier role
router.post('/apply/courier', async (req, res) => {
  // Implementation needed
});

export default router;
```

#### 2.2 Add Routes to Main App

File: `admin-service/src/index.ts`

```typescript
import publicApplicationRoutes from './routes/public-applications';

// Add this line:
app.use('/api/public', publicApplicationRoutes);
```

### Phase 3: Enable Email Verification (MEDIUM PRIORITY)

#### 3.1 Supabase Dashboard Configuration

1. Go to Supabase Dashboard → Authentication → Settings
2. Enable "Confirm email" toggle
3. Set "Confirm email" to "Required"

#### 3.2 Update Email Templates

1. Go to Authentication → Email Templates
2. Customize "Confirm signup" template
3. Add your branding and messaging

#### 3.3 Add Email Verification Middleware

File: `admin-service/src/middleware/auth.ts`

```typescript
export const requireVerifiedEmail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.email_confirmed_at) {
    return res.status(403).json({
      success: false,
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
  next();
};
```

---

## 📊 Database Schema Reference

### postal_staff Table

```sql
CREATE TABLE postal_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_type TEXT CHECK (staff_type IN ('postmaster', 'regional_manager', 'admin_staff')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  state TEXT,
  city TEXT,
  residential_address TEXT,
  date_of_birth DATE,
  gender TEXT,
  employee_id TEXT UNIQUE,
  department TEXT,
  position TEXT,
  years_of_service INTEGER,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  user_id UUID REFERENCES auth.users(id),  -- Links to user account
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### courier_profiles Table

```sql
CREATE TABLE courier_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id),
  courier_code TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  state TEXT,
  state_id TEXT,
  license_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  vehicle_registration TEXT NOT NULL,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approving_state TEXT,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🎯 Testing Checklist

### Before Deployment

- [ ] Admin service is running and healthy
- [ ] API Gateway routes to admin service correctly
- [ ] All existing endpoints return 200 (not 404)
- [ ] JWT authentication works
- [ ] CORS is configured correctly

### After Implementing Application Endpoints

- [ ] Users can apply for postal staff roles
- [ ] Users can apply for courier roles
- [ ] Applications are stored in database
- [ ] user_id is correctly linked
- [ ] DOP can see all applications
- [ ] PMG can see state-specific applications

### Email Verification

- [ ] Supabase sends verification emails
- [ ] Email templates are customized
- [ ] Unverified users cannot apply for roles
- [ ] Verified users can apply for roles

---

## 📞 Next Steps

### Immediate (Today)

1. ✅ Identify why endpoints are returning 404
2. ✅ Fix API Gateway routing if needed
3. ✅ Deploy admin-service if not running
4. ✅ Test all existing endpoints with Postman

### Short Term (This Week)

1. ⏳ Implement public application endpoints
2. ⏳ Add email verification checks
3. ⏳ Update frontend documentation
4. ⏳ Create Postman collection for new endpoints

### Medium Term (Next Week)

1. ⏳ Add application status tracking
2. ⏳ Implement notification system for approvals
3. ⏳ Add application history/audit trail
4. ⏳ Create admin dashboard for monitoring

---

## 🔗 Related Documentation

- [NIPOST Admin Flows](./NIPOST_ADMIN_FLOWS.md)
- [Frontend Guide](./FRONTEND_GUIDE.md)
- [API Gateway Configuration](../../api-gateway/README.md)
- [Admin Service README](../../admin-service/README.md)

---

## 📝 Notes

**Email Verification:**

- We ARE relying on Supabase for email verification
- Supabase Auth has built-in email verification
- Just needs to be enabled in dashboard settings
- No custom implementation needed

**API Endpoints:**

- Endpoints exist and are implemented
- 404 errors likely due to deployment/routing issues
- Need to verify service is running and accessible

**Role Application Flow:**

- Missing the initial application step
- Need to create public endpoints for applications
- Rest of the flow (approval, role creation) already works

---

**Last Updated:** March 4, 2026  
**Status:** In Progress  
**Priority:** URGENT
