# Supabase Dashboard Configuration Guide

This guide covers all the configuration you need to update in your Supabase dashboard for the Giga platform, including the new social media and calls features.

## Table of Contents
1. [Environment Variables](#environment-variables)
2. [Authentication Settings](#authentication-settings)
3. [Database Configuration](#database-configuration)
4. [Realtime Configuration](#realtime-configuration)
5. [Storage Buckets](#storage-buckets)
6. [Edge Functions Secrets](#edge-functions-secrets)
7. [API Settings](#api-settings)

---

## 1. Environment Variables

### Required for All Edge Functions
Navigate to: **Project Settings → Edge Functions → Secrets**

Add the following secrets:

```bash
# Supabase (Auto-configured, verify these exist)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Payment Providers
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# SMS & Notifications
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Google Maps (for Taxi service)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Agora (for Voice/Video Calls) - NEW
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Algolia (for Search)
ALGOLIA_APP_ID=your_algolia_app_id
ALGOLIA_API_KEY=your_algolia_admin_api_key
ALGOLIA_SEARCH_KEY=your_algolia_search_only_key

# Email Service (Optional)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# AWS S3 (if using for media storage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

### How to Add Secrets:
1. Go to **Project Settings** → **Edge Functions**
2. Scroll to **Secrets** section
3. Click **Add Secret**
4. Enter name and value
5. Click **Save**

---

## 2. Authentication Settings

Navigate to: **Authentication → Settings**

### Email Auth
- ✅ Enable Email provider
- Set **Confirm email** to your preference (recommended: enabled for production)
- Configure **Email templates** for:
  - Confirmation email
  - Password reset
  - Magic link

### OAuth Providers (Optional)
Enable social login providers:
- Google
- Facebook
- Apple
- Twitter/X

### JWT Settings
- **JWT expiry**: 3600 seconds (1 hour) - default is fine
- **Refresh token expiry**: 2592000 seconds (30 days)

### Site URL
Set your production URL:
```
https://yourdomain.com
```

### Redirect URLs
Add allowed redirect URLs:
```
http://localhost:3000/**
https://yourdomain.com/**
https://app.yourdomain.com/**
```

---

## 3. Database Configuration

### Row Level Security (RLS)
Ensure RLS is enabled on all tables. Check these critical tables:

Navigate to: **Database → Tables**

#### Tables that MUST have RLS enabled:
- ✅ `profiles`
- ✅ `hotels`
- ✅ `bookings`
- ✅ `payments`
- ✅ `wallet_transactions`
- ✅ `rides`
- ✅ `social_posts`
- ✅ `social_comments`
- ✅ `messages`
- ✅ `conversations`
- ✅ `calls`
- ✅ `call_participants`
- ✅ `stories`
- ✅ `friendships`

### Database Extensions
Navigate to: **Database → Extensions**

Enable these extensions:
- ✅ `uuid-ossp` - UUID generation
- ✅ `postgis` - Geospatial data (for taxi/location features)
- ✅ `pg_trgm` - Text search
- ✅ `pgcrypto` - Encryption functions

---

## 4. Realtime Configuration

Navigate to: **Database → Replication**

### Enable Realtime for These Tables:
Critical for social media and calls functionality:

1. **calls** - For incoming call notifications
   - Enable INSERT, UPDATE, DELETE events
   
2. **messages** - For real-time messaging
   - Enable INSERT events
   
3. **social_posts** - For live feed updates
   - Enable INSERT events
   
4. **social_comments** - For live comment updates
   - Enable INSERT events
   
5. **stories** - For story updates
   - Enable INSERT events
   
6. **rides** - For taxi ride updates
   - Enable INSERT, UPDATE events
   
7. **driver_locations** - For real-time driver tracking
   - Enable INSERT, UPDATE events

### How to Enable Realtime:
1. Go to **Database** → **Replication**
2. Find the table in the list
3. Toggle **Realtime** to ON
4. Select which events to broadcast (INSERT, UPDATE, DELETE)
5. Click **Save**

### Realtime Settings
Navigate to: **Project Settings → API**

- **Max connections**: 200 (increase if needed)
- **Max payload size**: 1MB

---

## 5. Storage Buckets

Navigate to: **Storage → Buckets**

### Create These Buckets:

#### 1. `profile-pictures`
- **Public**: Yes
- **File size limit**: 5MB
- **Allowed MIME types**: `image/jpeg, image/png, image/webp`

#### 2. `post-media`
- **Public**: Yes
- **File size limit**: 10MB
- **Allowed MIME types**: `image/jpeg, image/png, image/webp, video/mp4`

#### 3. `story-media`
- **Public**: Yes
- **File size limit**: 10MB
- **Allowed MIME types**: `image/jpeg, image/png, image/webp, video/mp4`
- **Auto-delete**: Enable (24 hours) - stories expire

#### 4. `hotel-images`
- **Public**: Yes
- **File size limit**: 10MB
- **Allowed MIME types**: `image/jpeg, image/png, image/webp`

#### 5. `documents`
- **Public**: No (private)
- **File size limit**: 20MB
- **Allowed MIME types**: `application/pdf, image/jpeg, image/png`

### Storage Policies
For each bucket, set up RLS policies:

**Example for `profile-pictures`:**
```sql
-- Allow users to upload their own profile picture
CREATE POLICY "Users can upload own profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own profile picture
CREATE POLICY "Users can update own profile picture"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access
CREATE POLICY "Public can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');
```

---

## 6. Edge Functions Secrets

### Agora Configuration (NEW - Required for Calls)

To enable proper Agora token generation for voice/video calls:

1. **Get Agora Credentials:**
   - Sign up at [Agora.io](https://www.agora.io/)
   - Create a new project
   - Get your **App ID** and **App Certificate**

2. **Add to Supabase:**
   ```bash
   AGORA_APP_ID=your_agora_app_id
   AGORA_APP_CERTIFICATE=your_agora_certificate
   ```

3. **Update `initiate-call` Function:**
   The current implementation uses a placeholder token generator. You'll need to:
   - Install Agora token generation library in the edge function
   - Replace the `generateAgoraToken()` function with proper implementation
   - See: [Agora Token Generation Guide](https://docs.agora.io/en/video-calling/develop/authentication-workflow)

### Payment Provider Setup

#### Paystack (Primary for Nigeria)
1. Sign up at [Paystack](https://paystack.com/)
2. Get API keys from Dashboard → Settings → API Keys
3. Add webhook URL: `https://your-project.supabase.co/functions/v1/Paystack-webhook`
4. Add secrets to Supabase

#### Stripe (International)
1. Sign up at [Stripe](https://stripe.com/)
2. Get API keys from Dashboard → Developers → API keys
3. Add webhook endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. Add secrets to Supabase

---

## 7. API Settings

Navigate to: **Project Settings → API**

### Rate Limiting
Adjust based on your needs:
- **Anonymous requests**: 100 per hour (default)
- **Authenticated requests**: 1000 per hour

### CORS Settings
Add your frontend domains:
```
http://localhost:3000
https://yourdomain.com
https://app.yourdomain.com
```

### API Keys
You'll need these for your frontend:
- **anon (public) key**: Safe to use in frontend
- **service_role key**: NEVER expose to frontend, only use in backend

---

## 8. Verification Checklist

After configuration, verify everything works:

### ✅ Authentication
- [ ] Users can sign up
- [ ] Users can sign in
- [ ] Email confirmation works
- [ ] Password reset works

### ✅ Edge Functions
- [ ] All functions are deployed and ACTIVE
- [ ] Test each endpoint with Postman
- [ ] Check function logs for errors

### ✅ Realtime
- [ ] Subscribe to `calls` table changes
- [ ] Subscribe to `messages` table changes
- [ ] Test real-time updates

### ✅ Storage
- [ ] Upload profile picture
- [ ] Upload post media
- [ ] View uploaded files
- [ ] Delete files

### ✅ Calls (Agora)
- [ ] Initiate call returns Agora credentials
- [ ] Can join Agora channel with returned token
- [ ] Call status updates in real-time
- [ ] Call duration tracked correctly

### ✅ Payments
- [ ] Paystack webhook receives events
- [ ] Stripe webhook receives events
- [ ] Payments recorded in database
- [ ] Wallet transactions work

---

## 9. Monitoring & Logs

### Edge Function Logs
Navigate to: **Edge Functions → [Function Name] → Logs**

Monitor for:
- Errors and exceptions
- Performance issues
- Failed requests

### Database Logs
Navigate to: **Database → Logs**

Monitor for:
- Slow queries
- Connection issues
- RLS policy violations

### Realtime Logs
Navigate to: **Realtime → Logs**

Monitor for:
- Connection issues
- Broadcast failures
- High connection count

---

## 10. Production Checklist

Before going live:

### Security
- [ ] All tables have RLS policies
- [ ] Service role key is secure
- [ ] Webhook secrets are configured
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled

### Performance
- [ ] Database indexes are optimized
- [ ] Connection pooling is configured
- [ ] CDN is set up for storage

### Monitoring
- [ ] Error tracking is set up
- [ ] Performance monitoring is enabled
- [ ] Alerts are configured

### Backup
- [ ] Daily backups are enabled
- [ ] Point-in-time recovery is enabled

---

## Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Agora Docs**: https://docs.agora.io/
- **Paystack Docs**: https://paystack.com/docs
- **Stripe Docs**: https://stripe.com/docs

## Related Documentation
- [CALLS_MODULE_DEPLOYMENT.md](./CALLS_MODULE_DEPLOYMENT.md) - Calls implementation details
- [postman/README.md](./postman/README.md) - API testing guide
- [DATABASE_ALGORITHM_AND_REALTIME.md](./DATABASE_ALGORITHM_AND_REALTIME.md) - Database and realtime setup
