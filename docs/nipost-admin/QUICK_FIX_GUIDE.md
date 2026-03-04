# NIPOST Admin - Quick Fix Guide

## 🚨 Immediate Actions Required

### 1. Fix 404 Errors (URGENT)

#### Check Service Status

```bash
# SSH into Railway or check dashboard
railway status --service admin-service

# Check if service is running
curl https://your-admin-service.railway.app/health

# Expected response:
# {"status":"healthy","service":"admin-service","timestamp":"..."}
```

#### Test Endpoints Directly

```bash
# Get your JWT token from Supabase first
# Then test:

# Test 1: Postal Staff Applications
curl -X GET "https://your-api-gateway.railway.app/api/nipost-admin/postal-staff/applications" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test 2: Courier Applications
curl -X GET "https://your-api-gateway.railway.app/api/nipost-admin/couriers/applications" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test 3: My Permissions
curl -X GET "https://your-api-gateway.railway.app/api/nipost-admin/my-permissions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Common 404 Causes & Fixes

**Cause 1: Wrong Base URL**

```
❌ Wrong: https://admin-service.railway.app/api/nipost-admin/...
✅ Correct: https://api-gateway.railway.app/api/nipost-admin/...
```

**Cause 2: Missing /api prefix**

```
❌ Wrong: /nipost-admin/postal-staff/applications
✅ Correct: /api/nipost-admin/postal-staff/applications
```

**Cause 3: Service Not Deployed**

```bash
# Deploy admin-service
cd admin-service
railway up

# Or via Railway dashboard
# Click "Deploy" on admin-service
```

**Cause 4: API Gateway Not Routing** Check
`api-gateway/src/middleware/routing.ts`:

```typescript
// Should have this route:
{
  path: '/api/nipost-admin',
  target: process.env.ADMIN_SERVICE_URL || 'http://localhost:3005',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}
```

---

### 2. Enable Email Verification

#### Supabase Dashboard Steps

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Authentication** → **Settings**
4. Find "Email Confirmation" section
5. Toggle **ON**: "Enable email confirmations"
6. Set "Confirm email" to **Required**
7. Click **Save**

#### Customize Email Template

1. Go to: **Authentication** → **Email Templates**
2. Select "Confirm signup" template
3. Customize the email content:

```html
<h2>Confirm your email</h2>
<p>Follow this link to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
```

4. Click **Save**

---

### 3. Deploy New Application Endpoints

#### Build and Deploy

```bash
# Navigate to admin-service
cd admin-service

# Install dependencies (if needed)
npm install

# Build TypeScript
npm run build

# Deploy to Railway
railway up

# Or commit and push (if auto-deploy is enabled)
git add .
git commit -m "feat: add public application endpoints"
git push origin main
```

#### Verify Deployment

```bash
# Test new endpoints
curl -X POST "https://your-api-gateway.railway.app/api/public/apply/postal-staff" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "staff_type": "postmaster",
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "phone": "+2348012345678",
    "state": "Lagos",
    "city": "Ikeja",
    "residential_address": "123 Test St"
  }'
```

---

## 📋 Complete Endpoint List

### Public Endpoints (No Admin Auth Required)

```
POST /api/public/apply/postal-staff
POST /api/public/apply/courier
GET  /api/public/my-applications
```

### Admin Endpoints (Require NIPOST Admin Role)

```
GET  /api/nipost-admin/my-permissions
GET  /api/nipost-admin/postal-staff/applications
POST /api/nipost-admin/postal-staff/applications/:id/approve
POST /api/nipost-admin/postal-staff/applications/:id/reject
GET  /api/nipost-admin/couriers/applications
POST /api/nipost-admin/couriers/applications/:id/approve
POST /api/nipost-admin/couriers/applications/:id/reject
```

---

## 🧪 Testing Workflow

### Step 1: Create Test User

```bash
# Use Supabase Auth API or Dashboard
# Create user: test-dop@example.com
# Verify email
```

### Step 2: Grant DOP Role

```sql
-- Run in Supabase SQL Editor
INSERT INTO user_roles (user_id, role_name)
VALUES ('USER_ID_HERE', 'DOP');

INSERT INTO nipost_user_permissions (
  user_id,
  role,
  access_level,
  permissions
)
VALUES (
  'USER_ID_HERE',
  'DOP',
  'national',
  ARRAY['users:read', 'users:write', 'postal_staff:approve', 'couriers:approve']
);

INSERT INTO user_active_roles (user_id, active_role)
VALUES ('USER_ID_HERE', 'DOP');
```

### Step 3: Test Application Flow

```bash
# 1. Create regular user account
# 2. Apply for postal staff role
curl -X POST "https://your-api-gateway.railway.app/api/public/apply/postal-staff" \
  -H "Authorization: Bearer REGULAR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "staff_type": "postmaster",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+2348012345678",
    "state": "Lagos",
    "city": "Ikeja",
    "residential_address": "123 Main St"
  }'

# 3. Login as DOP and view applications
curl -X GET "https://your-api-gateway.railway.app/api/nipost-admin/postal-staff/applications?status=pending" \
  -H "Authorization: Bearer DOP_TOKEN"

# 4. Approve application
curl -X POST "https://your-api-gateway.railway.app/api/nipost-admin/postal-staff/applications/APPLICATION_ID/approve" \
  -H "Authorization: Bearer DOP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "REGULAR_USER_ID"}'

# 5. Verify roles were created
curl -X GET "https://your-api-gateway.railway.app/api/nipost-admin/my-permissions" \
  -H "Authorization: Bearer REGULAR_USER_TOKEN"
```

---

## 🔍 Troubleshooting

### Issue: "Invalid token" error

**Solution:** Get fresh JWT token from Supabase

```javascript
const {
  data: { session },
} = await supabase.auth.getSession();
const token = session?.access_token;
```

### Issue: "No permissions found"

**Solution:** Check if user has NIPOST admin role

```sql
SELECT * FROM user_roles WHERE user_id = 'USER_ID';
SELECT * FROM nipost_user_permissions WHERE user_id = 'USER_ID';
```

### Issue: "State access denied"

**Solution:** PMG can only access their assigned state

```sql
-- Check user's assigned state
SELECT state_name FROM nipost_user_permissions WHERE user_id = 'USER_ID';
```

### Issue: "Application not found"

**Solution:** Check if application exists and is not deleted

```sql
SELECT * FROM postal_staff WHERE id = 'APPLICATION_ID' AND deleted_at IS NULL;
```

---

## 📞 Support Contacts

- **Backend Issues:** Check Railway logs
- **Database Issues:** Check Supabase logs
- **Auth Issues:** Check Supabase Auth logs
- **API Gateway Issues:** Check api-gateway service logs

---

## ✅ Success Checklist

- [ ] Admin service is deployed and healthy
- [ ] API Gateway routes to admin service
- [ ] All endpoints return 200 (not 404)
- [ ] Email verification is enabled in Supabase
- [ ] Public application endpoints work
- [ ] DOP can view applications
- [ ] DOP can approve applications
- [ ] PMG can view state-specific applications
- [ ] Roles are automatically created on approval
- [ ] Frontend can access all endpoints

---

**Last Updated:** March 4, 2026  
**Status:** Ready for Implementation
